#!/usr/bin/env node

/**
 * Sincroniza o catálogo de agentes do dashboard (AI Agents Directory).
 *
 * - Garante que `.claude/agents/agents-raiox.md` contenha todos os agentes
 *   conhecidos (criando a seção “Novos Agentes Automatizados” quando necessário)
 * - Constrói `frontend/dashboard/src/data/aiAgentsDirectory.ts` com o conteúdo
 *   completo de cada arquivo Markdown.
 *
 * Este fluxo replica a automação utilizada no catálogo de comandos.
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { promises as fs } from 'fs';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

const SUMMARY_PATH = join(repoRoot, '.claude/agents/agents-raiox.md');
const AGENTS_DIR = join(repoRoot, '.claude/agents');
const OUTPUT_PATH = join(
  repoRoot,
  'frontend/dashboard/src/data/aiAgentsDirectory.ts',
);

const BASE_CATEGORY_ORDER = [
  'Arquitetura & Plataforma',
  'Backend & Serviços',
  'Frontend & UX',
  'Dados & Analytics',
  'IA, ML & RAG',
  'Documentação & Conteúdo',
  'Pesquisa & Estratégia',
  'QA & Observabilidade',
  'MCP & Automação',
];

const AUTO_CATEGORY_NAME = 'Novos Agentes Automatizados';
const ALL_CATEGORY_ORDER = [...BASE_CATEGORY_ORDER, AUTO_CATEGORY_NAME];

const AUTO_CATEGORY_HEADING = `## ${AUTO_CATEGORY_NAME}`;
const AUTO_HEADING_NOTICE =
  '> ⚠️ Entradas geradas automaticamente a partir dos arquivos Markdown. Revise, categorize e mova para a seção definitiva.';
const AUTO_TABLE_HEADER =
  '| Agente | Capacidades principais | Momento típico de uso | Exemplo prático | Tipo de saída | Tags | Prompt |\n' +
  '| --- | --- | --- | --- | --- | --- | --- |';

const relativeAgentsDir = '/.claude/agents';

function ensureTrailingNewline(text = '') {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function normalizeWhitespace(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeTableCell(value = '') {
  return normalizeWhitespace(value).replace(/\|/g, '\\|');
}

function lowerFirst(text = '') {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function ensurePeriod(text = '') {
  if (!text) return text;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function normalizeFrontMatter(raw = '') {
  return raw
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*[A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) return line;
      const [, key, value] = match;
      if (!value) return line;
      const trimmedValue = value.trim();
      const alreadyQuoted = /^['"].*['"]$/.test(trimmedValue);
      const startsWithCollection = /^[\[{]/.test(trimmedValue);
      const needsQuoting =
        (!alreadyQuoted && !startsWithCollection && /[:\\]/.test(trimmedValue)) ||
        trimmedValue.includes(' | ') ||
        /^[^[{].*\|.*$/.test(trimmedValue);
      if (needsQuoting && !alreadyQuoted) {
        const escaped = trimmedValue.replace(/"/g, '\\"');
        return `${key}: "${escaped}"`;
      }
      return line;
    })
    .join('\n');
}

function extractFrontMatter(content = '') {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { attributes: {}, body: content };
  }
  const normalized = normalizeFrontMatter(match[1]);
  try {
    const attributes = parseYaml(normalized) ?? {};
    const body = content.slice(match[0].length);
    return { attributes, body };
  } catch (error) {
    console.warn('⚠️  Não foi possível parsear front matter:', error.message);
    const body = content.slice(match[0].length);
    return { attributes: {}, body };
  }
}

function sanitizeAgentName(raw = '') {
  return raw.replace(/`/g, '').trim();
}

function toId(agentName = '') {
  return agentName.replace(/^@/, '').trim();
}

function parseTags(raw = '') {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractLinkTarget(cell = '') {
  const match = cell.match(/\((.+?)\)/);
  return match ? match[1]?.trim() ?? null : null;
}

function normalizeAgentPath(reference = '') {
  if (!reference) return null;
  const withoutPrefix = reference.replace(/^\.\//, '');
  return withoutPrefix.replace(/\\/g, '/');
}

function buildFilePathForDataset(normalized = '') {
  return `${relativeAgentsDir}/${normalized}`.replace(/\/{2,}/g, '/');
}

function getFirstSentence(text = '') {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const sentenceMatch = normalized.match(/(.+?[.!?])(\s|$)/);
  return sentenceMatch ? sentenceMatch[1].trim() : normalized;
}

function deriveActionSentence(sentence = '') {
  let current = sentence.trim();
  if (!current) return '';

  const patterns = [
    [/^Use (?:este|esse|this) agente (?:quando|para)\s*/i, ''],
    [/^Use (?:este|esse) agent (?:when you need to|when you need|to)\s*/i, ''],
    [/^Use this agent when you need to\s*/i, ''],
    [/^Use this agent when you need\s*/i, ''],
    [/^Use this agent to\s*/i, ''],
    [/^You are an?\s*/i, ''],
    [/^You are the\s*/i, ''],
    [/^Specializes in\s*/i, ''],
    [/^Specialized in\s*/i, ''],
    [/^Specialist in\s*/i, ''],
    [/^Focus(es)? on\s*/i, ''],
  ];

  for (const [pattern, replacement] of patterns) {
    const replaced = current.replace(pattern, replacement).trim();
    if (replaced) {
      current = replaced;
      break;
    }
  }

  return current.replace(/\.$/, '').trim();
}

function buildAutoTags(slug, model, tools) {
  const tags = new Set(['auto', 'needs-curation']);
  if (slug) {
    tags.add(slug);
  }
  if (model) {
    tags.add(`model:${String(model).trim()}`);
  }
  tools.forEach((tool) => {
    if (tool) {
      tags.add(`tool:${tool.toLowerCase().replace(/\s+/g, '-')}`);
    }
  });
  return Array.from(tags).sort();
}

function replaceAutoSection(rawContent, sectionContent) {
  const normalized = rawContent.replace(/\r\n/g, '\n');
  const headingIndex = normalized.indexOf(AUTO_CATEGORY_HEADING);

  if (!sectionContent) {
    if (headingIndex === -1) {
      return normalized;
    }
    const afterHeading = normalized.slice(
      headingIndex + AUTO_CATEGORY_HEADING.length,
    );
    const nextHeadingMatch = afterHeading.match(/\n##\s+/);
    if (nextHeadingMatch) {
      const nextHeadingIndex =
        headingIndex + AUTO_CATEGORY_HEADING.length + nextHeadingMatch.index;
      const before = normalized.slice(0, headingIndex).trimEnd();
      const after = normalized.slice(nextHeadingIndex).trimStart();
      if (before && after) {
        return `${before}\n\n${after}`;
      }
      if (before) return `${before}\n`;
      if (after) return `${after}`;
      return '';
    }
    const before = normalized.slice(0, headingIndex).trimEnd();
    return before ? `${before}\n` : '';
  }

  if (headingIndex === -1) {
    const trimmed = normalized.trimEnd();
    const separator = trimmed ? '\n\n' : '';
    return `${trimmed}${separator}${sectionContent}`.trimEnd() + '\n';
  }

  const afterHeading = normalized.slice(
    headingIndex + AUTO_CATEGORY_HEADING.length,
  );
  const nextHeadingMatch = afterHeading.match(/\n##\s+/);

  if (nextHeadingMatch) {
    const nextHeadingIndex =
      headingIndex + AUTO_CATEGORY_HEADING.length + nextHeadingMatch.index;
    const before = normalized.slice(0, headingIndex).trimEnd();
    const after = normalized.slice(nextHeadingIndex).trimStart();
    const separatorBefore = before ? '\n\n' : '';
    const separatorAfter = after ? '\n\n' : '';
    return `${before}${separatorBefore}${sectionContent.trimEnd()}${
      separatorAfter ? `${separatorAfter}${after}` : ''
    }\n`;
  }

  const before = normalized.slice(0, headingIndex).trimEnd();
  const separator = before ? '\n\n' : '';
  return `${before}${separator}${sectionContent.trimEnd()}\n`;
}

async function readAgentFiles() {
  const files = await fs.readdir(AGENTS_DIR);
  const byName = new Map();

  await Promise.all(
    files
      .filter(
        (file) =>
          file.endsWith('.md') &&
          file.toLowerCase() !== 'agents-raiox.md' &&
          !file.toLowerCase().startsWith('agents-raiox-') &&
          file.toLowerCase() !== 'readme.md',
      )
      .map(async (file) => {
        const path = join(AGENTS_DIR, file);
        const content = await fs.readFile(path, 'utf8');
        const { attributes } = extractFrontMatter(content);

        const slug = file.replace(/\.md$/i, '');
        const rawName =
          typeof attributes?.name === 'string' && attributes.name.trim()
            ? attributes.name.trim()
            : slug;
        const canonicalName = `@${rawName.replace(/^@/, '').trim()}`;

        const descriptionRaw =
          typeof attributes?.description === 'string'
            ? attributes.description.split(/Examples?:/i)[0]
            : '';
        const description = normalizeWhitespace(descriptionRaw);

        let tools = [];
        if (Array.isArray(attributes?.tools)) {
          tools = attributes.tools.map((tool) => String(tool).trim()).filter(Boolean);
        } else if (typeof attributes?.tools === 'string') {
          tools = attributes.tools
            .split(/[,|]/)
            .map((tool) => tool.trim())
            .filter(Boolean);
        }

        const model =
          typeof attributes?.model === 'string'
            ? attributes.model.trim()
            : undefined;

        const entry = {
          file,
          path,
          content,
          canonicalName,
          normalizedName: canonicalName.toLowerCase(),
          slug,
          description,
          tools,
          model,
        };

        byName.set(entry.normalizedName, entry);
      }),
  );

  return { byName };
}

function parseSummary(raw) {
  const sectionRegex = /^##\s+(.+?)\s*\n([\s\S]*?)(?=^##\s+|\Z)/gm;
  const agents = [];
  const warnings = [];

  let match;
  while ((match = sectionRegex.exec(raw)) !== null) {
    const [, rawCategory, body] = match;
    const category = rawCategory.trim();
    if (!ALL_CATEGORY_ORDER.includes(category)) {
      continue;
    }

    const tableLines = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('|'));

    if (tableLines.length < 3) {
      warnings.push(
        `⚠️  Categoria "${category}" não possui tabela de agentes no resumo.`,
      );
      continue;
    }

    const dataRows = tableLines
      .slice(2)
      .filter((line) => line && !line.startsWith('| ---'));

    for (const row of dataRows) {
      const cells = row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());

      if (cells.length < 7) {
        warnings.push(
          `⚠️  Linha ignorada na categoria "${category}" por não conter 7 colunas: ${row}`,
        );
        continue;
      }

      const [
        rawName,
        capabilities,
        usage,
        example,
        outputType,
        tagsCell,
        promptCell,
      ] = cells;

      const name = sanitizeAgentName(rawName);
      if (!name.startsWith('@')) {
        warnings.push(
          `⚠️  Nome de agente sem prefixo "@": "${name}" (categoria "${category}")`,
        );
      }

      const id = toId(name);
      const tags = parseTags(tagsCell);
      const linkTarget = extractLinkTarget(promptCell);
      const normalizedTarget = normalizeAgentPath(linkTarget ?? '');

      if (!normalizedTarget) {
        warnings.push(
          `⚠️  Agente "${name}" não possui link válido para o arquivo Markdown. Campo "Prompt": ${promptCell}`,
        );
        continue;
      }

      agents.push({
        name,
        id,
        category,
        capabilities,
        usage,
        example,
        outputType,
        tags,
        normalizedTarget,
      });
    }
  }

  return { raw, agents, warnings };
}

function buildAutoSummaryRow(agentFile) {
  const { canonicalName, slug, description, model, tools } = agentFile;
  const firstSentence = getFirstSentence(description);
  const capabilities = firstSentence
    ? ensurePeriod(firstSentence)
    : 'Descrição automática pendente de curadoria.';

  const actionPhrase = deriveActionSentence(firstSentence);
  const actionLower =
    actionPhrase && actionPhrase.length
      ? lowerFirst(actionPhrase)
      : 'das competências descritas no arquivo Markdown';

  const usage = `Ative quando precisar ${actionLower}.`;
  const example = `Ex.: Utilize ${canonicalName} para ${actionLower}.`;
  const outputType =
    'Entregáveis definidos no prompt do agente (relatórios, planos ou recomendações).';
  const tags = buildAutoTags(slug, model, tools).join(', ');
  const promptLink = `./${agentFile.file}`;

  return (
    '| `' +
    canonicalName +
    '` | ' +
    sanitizeTableCell(ensurePeriod(capabilities)) +
    ' | ' +
    sanitizeTableCell(ensurePeriod(usage)) +
    ' | ' +
    sanitizeTableCell(ensurePeriod(example)) +
    ' | ' +
    sanitizeTableCell(ensurePeriod(outputType)) +
    ' | ' +
    sanitizeTableCell(tags) +
    ' | [Abrir](' +
    promptLink +
    ') |'
  );
}

async function ensureSummaryCoverage(summary, fileIndex) {
  const summaryNames = new Set(
    summary.agents.map((agent) => agent.name.toLowerCase()),
  );
  const autoNames = new Set(
    summary.agents
      .filter((agent) => agent.category === AUTO_CATEGORY_NAME)
      .map((agent) => agent.name.toLowerCase()),
  );

  const autoEntries = new Map();
  const warnings = [];

  for (const nameLower of autoNames) {
    const entry = fileIndex.byName.get(nameLower);
    if (entry) {
      autoEntries.set(nameLower, entry);
    } else {
      warnings.push(
        `⚠️  Entrada automática "${nameLower}" não possui arquivo correspondente. Ela será removida.`,
      );
    }
  }

  for (const [nameLower, entry] of fileIndex.byName.entries()) {
    if (!summaryNames.has(nameLower)) {
      autoEntries.set(nameLower, entry);
    }
  }

  let updated = false;

  if (autoEntries.size === 0) {
    const newSummaryRaw = replaceAutoSection(summary.raw, null);
    if (newSummaryRaw !== summary.raw) {
      await fs.writeFile(SUMMARY_PATH, ensureTrailingNewline(newSummaryRaw), 'utf8');
      updated = true;
    }
    return { updated, warnings };
  }

  const autoRows = Array.from(autoEntries.values())
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
    .map((entry) => buildAutoSummaryRow(entry));

  const autoSectionContent = [
    AUTO_CATEGORY_HEADING,
    '',
    AUTO_HEADING_NOTICE,
    '',
    AUTO_TABLE_HEADER,
    ...autoRows,
    '',
  ].join('\n');

  const newSummaryRaw = replaceAutoSection(summary.raw, autoSectionContent);
  if (newSummaryRaw !== summary.raw) {
    await fs.writeFile(SUMMARY_PATH, ensureTrailingNewline(newSummaryRaw), 'utf8');
    updated = true;
  }

  return { updated, warnings };
}

async function loadSummary() {
  const raw = await fs.readFile(SUMMARY_PATH, 'utf8');
  const normalized = raw.replace(/\r\n/g, '\n');
  return parseSummary(normalized);
}

function buildDirectory(summary, fileIndex) {
  const agents = [];
  const warnings = [];

  for (const agent of summary.agents) {
    const entry = fileIndex.byName.get(agent.name.toLowerCase());
    if (!entry) {
      warnings.push(
        `⚠️  Agente "${agent.name}" presente no resumo, mas arquivo .md não encontrado.`,
      );
      continue;
    }

    const filePath = buildFilePathForDataset(agent.normalizedTarget);

    agents.push({
      id: agent.id,
      name: agent.name,
      category: agent.category,
      capabilities: normalizeWhitespace(agent.capabilities),
      usage: normalizeWhitespace(agent.usage),
      example: normalizeWhitespace(agent.example),
      outputType: normalizeWhitespace(agent.outputType),
      tags: agent.tags,
      filePath,
      fileContent: entry.content,
    });
  }

  agents.sort((a, b) => {
    const categoryDiff =
      ALL_CATEGORY_ORDER.indexOf(a.category) -
      ALL_CATEGORY_ORDER.indexOf(b.category);
    if (categoryDiff !== 0) {
      return categoryDiff;
    }
    return a.name.localeCompare(b.name);
  });

  return { agents, warnings };
}

function buildOutput(agents, categoriesForExport) {
  const tagsToLiteral = (tags) =>
    `[${tags.map((tag) => JSON.stringify(tag)).join(', ')}]`;

  const categoryUnion = categoriesForExport
    .map((category) => `  | ${JSON.stringify(category)}`)
    .join('\n');

  const categoryArrayLiteral = `[\n${categoriesForExport
    .map((category) => `  ${JSON.stringify(category)}`)
    .join(',\n')}\n]`;

  const agentsLiteral = agents
    .map((agent) => {
      return [
        '  {',
        `    id: ${JSON.stringify(agent.id)},`,
        `    name: ${JSON.stringify(agent.name)},`,
        `    category: ${JSON.stringify(agent.category)},`,
        `    capabilities: ${JSON.stringify(agent.capabilities)},`,
        `    usage: ${JSON.stringify(agent.usage)},`,
        `    example: ${JSON.stringify(agent.example)},`,
        `    outputType: ${JSON.stringify(agent.outputType)},`,
        `    tags: ${tagsToLiteral(agent.tags)},`,
        `    filePath: ${JSON.stringify(agent.filePath)},`,
        `    fileContent: ${JSON.stringify(agent.fileContent)},`,
        '  }',
      ].join('\n');
    })
    .join(',\n');

  return [
    '// Generated from .claude/agents/agents-raiox.md — do not edit manually',
    '',
    'export type AgentCategory =',
    categoryUnion,
    '  ;',
    '',
    'export interface AgentDirectoryEntry {',
    '  id: string;',
    '  name: string;',
    '  category: AgentCategory;',
    '  capabilities: string;',
    '  usage: string;',
    '  example: string;',
    '  outputType: string;',
    '  tags: string[];',
    '  filePath: string;',
    '  fileContent: string;',
    '}',
    '',
    `export const AGENT_CATEGORY_ORDER: AgentCategory[] = ${categoryArrayLiteral};`,
    '',
    'export const AI_AGENTS_DIRECTORY: AgentDirectoryEntry[] = [',
    agentsLiteral,
    '];',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function main() {
  const summaryExists = await fs
    .access(SUMMARY_PATH)
    .then(() => true)
    .catch(() => false);

  if (!summaryExists) {
    console.error(
      `❌ Arquivo de resumo não encontrado em ${SUMMARY_PATH}. Abortando.`,
    );
    process.exit(1);
  }

  const fileIndex = await readAgentFiles();

  let summary = await loadSummary();
  const coverageResult = await ensureSummaryCoverage(summary, fileIndex);
  if (coverageResult.updated) {
    summary = await loadSummary();
  }

  const directory = buildDirectory(summary, fileIndex);

  const categoriesInSummary = ALL_CATEGORY_ORDER.filter((category) =>
    summary.agents.some((agent) => agent.category === category),
  );

  const output = buildOutput(directory.agents, categoriesInSummary);
  await fs.writeFile(OUTPUT_PATH, output, 'utf8');

  console.log(
    `✅ Catálogo de agentes atualizado com ${directory.agents.length} registros em ${OUTPUT_PATH}`,
  );

  [...summary.warnings, ...coverageResult.warnings, ...directory.warnings].forEach(
    (warning) => console.warn(warning),
  );
}

main().catch((error) => {
  console.error('❌ Falha ao gerar catálogo de agentes:', error);
  process.exit(1);
});
