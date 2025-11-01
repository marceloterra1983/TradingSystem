#!/usr/bin/env node
import 'dotenv/config';
/**
 * Query TradingSystem documentation via Qdrant and summarize with an external LLM.
 *
 * Usage:
 *   npm run rag:ask -- "Como iniciar o docs-api?"
 *
 * Requirements:
 *   - Qdrant acessível em QDRANT_HOST / QDRANT_PORT (default: localhost:6333)
 *   - Embeddings servidos pelo Ollama em OLLAMA_BASE_URL (default: http://localhost:11434)
 *   - OPENAI_API_KEY (ou ajuste o trecho de chamada do LLM para o provedor desejado)
 */

import process from 'node:process';
import { spawnSync } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const questionTokens = [];
let collection = process.env.QDRANT_COLLECTION ?? 'documentation';

for (let i = 0; i < rawArgs.length; i += 1) {
  const token = rawArgs[i];

  if (token === '--collection' || token === '-c') {
    const value = rawArgs[i + 1];
    if (value) {
      collection = value.trim();
      i += 1;
      continue;
    }
  } else if (token?.startsWith('--collection=')) {
    const [, value] = token.split('=');
    if (value) {
      collection = value.trim();
      continue;
    }
  }

  questionTokens.push(token);
}

const argvText = questionTokens.join(' ').trim();
if (!argvText) {
  console.error('Uso: npm run rag:ask -- [--collection nome] "sua pergunta aqui"');
  process.exit(1);
}

const env = process.env;
const qdrantHost = env.QDRANT_HOST ?? 'localhost';
const qdrantPort = env.QDRANT_PORT ?? '6333';
const topK = Number.parseInt(env.RAG_TOP_K ?? '5', 10);
const ollamaBaseUrl = (env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
const embeddingModel = env.OLLAMA_EMBED_MODEL ?? env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text';
const temperature = Number.parseFloat(env.RAG_LLM_TEMPERATURE ?? '0.2');
const maxContextChars = Number.parseInt(env.RAG_CONTEXT_CHARS ?? '1600', 10);

const codexBin = env.CODEX_BIN ?? env.CODEX_PATH ?? 'codex';
const requestedProvider = (env.RAG_PROVIDER ?? env.RAG_LLM_PROVIDER ?? '').toLowerCase();

const detectCodex = () => {
  const res = spawnSync(codexBin, ['--version'], { stdio: 'ignore' });
  return res.status === 0;
};

const openaiKeyRaw = env.OPENAI_API_KEY?.trim();
const isOpenAIPlaceholder =
  !openaiKeyRaw ||
  openaiKeyRaw.toLowerCase() === 'change_me' ||
  openaiKeyRaw.startsWith('sk-sk-proj-') ||
  openaiKeyRaw === 'sk-xxxx';

const hasOpenAI = Boolean(openaiKeyRaw) && !isOpenAIPlaceholder;
const hasCodex = detectCodex();

let provider = requestedProvider;
if (!provider) {
  provider = hasOpenAI ? 'openai' : hasCodex ? 'codex' : '';
}

if (!provider) {
  console.error('Nenhum provedor configurado. Defina OPENAI_API_KEY ou instale/configure o Codex CLI.');
  process.exit(1);
}

if (provider === 'openai' && !hasOpenAI) {
  console.error('Provedor "openai" selecionado, mas OPENAI_API_KEY não está definido ou contém um placeholder.');
  process.exit(1);
}

if (provider === 'codex' && !hasCodex) {
  console.error('Provedor "codex" selecionado, mas o binário do Codex CLI não foi encontrado. Ajuste CODEX_BIN ou instale o CLI.');
  process.exit(1);
}

const openaiKey = hasOpenAI ? openaiKeyRaw : undefined;
const openaiModel = env.RAG_EXTERNAL_MODEL ?? env.OPENAI_MODEL ?? 'gpt-4o-mini';
const codexModel = env.CODEX_MODEL ?? env.RAG_EXTERNAL_MODEL ?? 'gpt-5';

const sanitize = (text) => text.replace(/\s+/g, ' ').trim();

const toJSON = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Falha ao analisar JSON. Conteúdo bruto: ${text}`);
  }
};

const fetchEmbedding = async (prompt) => {
  const response = await fetch(`${ollamaBaseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: embeddingModel, prompt }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao gerar embedding (${response.status}): ${body}`);
  }
  const data = await response.json();
  const vector = data?.embedding ?? data?.data?.[0]?.embedding;
  if (!Array.isArray(vector)) {
    throw new Error('Resposta do Ollama não contém o vetor de embedding esperado.');
  }
  return vector;
};

const searchQdrant = async (vector) => {
  const url = `http://${qdrantHost}:${qdrantPort}/collections/${collection}/points/search`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector,
      limit: topK,
      with_payload: true,
      with_vector: false,
      score_threshold: env.RAG_SCORE_THRESHOLD ? Number.parseFloat(env.RAG_SCORE_THRESHOLD) : undefined,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Busca no Qdrant falhou (${response.status}): ${body}`);
  }
  const data = await response.json();
  return Array.isArray(data?.result) ? data.result : [];
};

const extractContext = (payload) => {
  if (!payload) return { text: '', source: 'desconhecido' };

  let nodeText = '';
  if (typeof payload._node_content === 'string') {
    try {
      const node = JSON.parse(payload._node_content);
      nodeText = node?.text ?? '';
    } catch {
      nodeText = '';
    }
  }

  const candidate =
    nodeText ||
    payload.text ||
    payload.content ||
    payload.body ||
    payload.summary ||
    '';

  const source =
    payload.file_path ||
    payload.source ||
    payload.metadata?.source ||
    'desconhecido';

  const trimmed = sanitize(candidate);
  const limited =
    trimmed.length > maxContextChars
      ? `${trimmed.slice(0, maxContextChars)}…`
      : trimmed;

  return { text: limited, source };
};

const buildPrompt = (question, contexts) => {
  const contextBlock = contexts
    .map(
      (ctx, idx) =>
        `[${idx + 1}] Fonte: ${ctx.source}\n${ctx.text}`,
    )
    .join('\n\n');

  return {
    system: [
      'Você é um assistente técnico do projeto TradingSystem.',
      'Responda em português, usando apenas os contextos fornecidos.',
      'Cite as fontes com o formato [n] correspondente ao trecho.',
      'Se o contexto não for suficiente, diga que não encontrou a resposta e sugira próximos passos.',
    ].join(' '),
    user: [
      'Contextos relevantes:',
      contextBlock || '(nenhum contexto encontrado)',
      '',
      `Pergunta: ${question}`,
    ].join('\n'),
  };
};

const askOpenAI = async (prompt) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      temperature,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao consultar LLM externo (${response.status}): ${body}`);
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer) {
    throw new Error('Resposta do LLM não contém conteúdo utilizável.');
  }
  return answer.trim();
};

const askCodex = (prompt) => {
  const args = [
    'exec',
    '--skip-git-repo-check',
    '--sandbox',
    env.CODEX_SANDBOX ?? 'read-only',
    '--color',
    'never',
    '-c',
    'features.mcp_servers=false',
  ];

  if (env.CODEX_EXTRA_ARGS) {
    args.push(
      ...env.CODEX_EXTRA_ARGS
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean),
    );
  }

  if (codexModel) {
    args.push('--model', codexModel);
  }
  args.push('-');

  const mergedPrompt = `${prompt.system}\n---\n${prompt.user}\n`;

  const result = spawnSync(codexBin, args, {
    input: mergedPrompt,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || 'sem detalhes';
    throw new Error(`codex exec retornou código ${result.status}: ${stderr}`);
  }

  const output = result.stdout?.trim() ?? '';
  return output || 'Sem resposta do Codex.';
};

(async () => {
  try {
    console.log(`🔍 Pergunta: ${argvText}`);
    console.log(`📂 Coleção: ${collection}`);

    const embedding = await fetchEmbedding(argvText);
    const hits = await searchQdrant(embedding);

    if (hits.length === 0) {
      console.log('\nNenhum contexto relevante encontrado no Qdrant.');
      process.exit(0);
    }

    const contexts = hits.map((hit) => extractContext(hit.payload));
    const prompt = buildPrompt(argvText, contexts);
    const answer = provider === 'codex'
      ? askCodex(prompt)
      : await askOpenAI(prompt);

    console.log('\n💡 Resposta:\n');
    console.log(answer);

    console.log('\n📚 Fontes:');
    contexts.forEach((ctx, idx) => {
      console.log(`  [${idx + 1}] ${ctx.source}`);
    });
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}`);
    process.exit(1);
  }
})();
