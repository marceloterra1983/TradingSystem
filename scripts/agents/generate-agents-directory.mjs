#!/usr/bin/env node

/**
 * Gera e valida o diretório de agentes usado no dashboard.
 *
 * Recursos principais:
 * - Parser robusto de tabelas Markdown (markdown-it + multimd-table)
 * - Validações estritas de schema, tags, links e linguagem
 * - Geração das visões filtradas e do dataset do dashboard
 * - Persistência de log estruturado em reports/agents/last-run.json
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { promises as fs } from 'fs';
import { parseDocument } from 'yaml';
import MarkdownIt from 'markdown-it';
import markdownItMultimdTable from 'markdown-it-multimd-table';

const { dirname, join, resolve, relative, sep } = path;
const pathPosix = path.posix;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

const SUMMARY_PATH = join(repoRoot, '.claude/agents/agents-raiox.md');
const AGENTS_DIR = join(repoRoot, '.claude/agents');
const OUTPUT_PATH = join(
  repoRoot,
  'frontend/dashboard/src/data/aiAgentsDirectory.ts',
);
const REPORTS_DIR = join(repoRoot, 'reports/agents');
const REPORTS_LOG = join(REPORTS_DIR, 'last-run.json');

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
  '| Agente | Exemplo de comando | Capacidades principais | Momento típico de uso | Exemplo prático | Tipo de saída | Tags | Prompt |\n' +
  '| --- | --- | --- | --- | --- | --- | --- | --- |';

const AUTO_SENTINEL_START = '<!-- AUTO-AGENTS:START -->';
const AUTO_SENTINEL_END = '<!-- AUTO-AGENTS:END -->';

const relativeAgentsDir = '/.claude/agents';
const AGENT_CATALOG_SCHEMA_VERSION = '1.1.0';

const CLI_FLAGS = new Set(process.argv.slice(2));
const INCLUDE_AUTO_SECTION = CLI_FLAGS.has('--include-auto');
const RUN_MODE = CLI_FLAGS.has('--ci') ? 'ci' : 'local';

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
}).use(markdownItMultimdTable);

class IssueTracker {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  warn(message, meta = {}) {
    this.warnings.push({ message, ...meta });
  }

  error(message, meta = {}) {
    this.errors.push({ message, ...meta });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  summary() {
    return {
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  print() {
    for (const warning of this.warnings) {
      console.warn(formatIssue('⚠️', warning));
    }
    for (const error of this.errors) {
      console.error(formatIssue('❌', error));
    }
  }
}

function formatIssue(prefix, issue) {
  const parts = [prefix];
  if (issue.file) {
    const location =
      issue.line != null ? `${issue.file}:${issue.line}` : issue.file;
    parts.push(location);
  }
  parts.push(issue.message);
  return parts.filter(Boolean).join(' ');
}

function ensureTrailingNewline(text = '') {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function normalizeWhitespace(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeTableCell(value = '') {
  return value.replace(/\|/g, '\\|');
}

function buildFilePathForDataset(normalized = '') {
  return pathPosix.join(relativeAgentsDir, normalized);
}

function renderInlineText(token) {
  if (!token?.children || token.children.length === 0) {
    return token?.content ?? '';
  }
  let buffer = '';
  for (const child of token.children) {
    if (child.type === 'text') {
      buffer += child.content;
    } else if (child.type === 'code_inline') {
      buffer += `\`${child.content}\``;
    } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
      buffer += ' ';
    } else if (child.type === 'html_inline') {
      buffer += child.content ?? '';
    } else if (child.type === 'emoji') {
      buffer += child.markup ?? child.content ?? '';
    } else if (child.type === 'link_open' || child.type === 'link_close') {
      // ignore, texto é capturado pelos nós subsequentes
    } else {
      buffer += child.content ?? '';
    }
  }
  return buffer;
}

function sanitizeAgentName(raw = '') {
  return raw.replace(/`/g, '').trim();
}

function toId(agentName = '') {
  return agentName.replace(/^@/, '').trim();
}

function detectLikelyEnglish(text = '') {
  if (!text) return false;
  const sample = text.toLowerCase();
  const signals = [
    'use this agent',
    'when you need',
    'specialist',
    'analysis',
    'monitor',
    'design',
    'improve',
    'enhancement',
    'quality',
    'write idiomatic',
    'user-centered',
    'show notes',
  ];
  let hits = 0;
  for (const keyword of signals) {
    if (sample.includes(keyword)) {
      hits += 1;
    }
  }
  return hits >= 2;
}

function normalizeTag(raw = '', context = {}) {
  if (!raw.trim()) return null;
  const ascii = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const normalized = ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!normalized) {
    throw new Error(
      `Tag inválida "${raw}" na linha ${context.line ?? '?'} — normalize para kebab-case ASCII.`,
    );
  }
  return normalized;
}

function extractSchemaVersion(raw, issues) {
  const match = raw.match(/<!--\s*schemaVersion:\s*([0-9.]+)\s*-->/i);
  if (!match) {
    issues.error(
      'O arquivo `.claude/agents/agents-raiox.md` precisa declarar `<!-- schemaVersion: x.y.z -->` no topo.',
      { file: '.claude/agents/agents-raiox.md' },
    );
    return null;
  }
  const version = match[1].trim();
  if (version !== AGENT_CATALOG_SCHEMA_VERSION) {
    issues.error(
      `Schema version incompatível. Esperado "${AGENT_CATALOG_SCHEMA_VERSION}", encontrado "${version}".`,
      { file: '.claude/agents/agents-raiox.md' },
    );
  }
  return version;
}

function extractFilteredViewLinks(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const links = new Map();
  let collecting = false;
  for (const line of lines) {
    if (line.startsWith('### Visões filtradas')) {
      collecting = true;
      continue;
    }
    if (collecting && line.trim() === '') {
      break;
    }
    if (!collecting) continue;
    const match = line.match(/- \[([^\]]+)\]\(\.\/([^)]+)\)/);
    if (match) {
      links.set(match[1].trim(), match[2].trim());
    }
  }
  return links;
}

function parseTable(tokens, startIndex) {
  const header = [];
  const rows = [];
  let index = startIndex;
  let section = null;
  let currentRow = null;
  let currentCell = null;

  for (; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === 'table_close') {
      break;
    }
    if (token.type === 'thead_open') {
      section = 'thead';
      continue;
    }
    if (token.type === 'tbody_open') {
      section = 'tbody';
      continue;
    }
    if (token.type === 'tr_open') {
      currentRow = { cells: [], line: token.map ? token.map[0] + 1 : undefined };
      continue;
    }
    if (token.type === 'tr_close') {
      if (currentRow) {
        if (section === 'thead') {
          header.push(currentRow.cells);
        } else if (section === 'tbody') {
          rows.push(currentRow);
        }
        currentRow = null;
      }
      continue;
    }
    if (token.type === 'th_open' || token.type === 'td_open') {
      currentCell = {
        textParts: [],
        links: [],
        line: token.map ? token.map[0] + 1 : currentRow?.line,
      };
      continue;
    }
    if (token.type === 'th_close' || token.type === 'td_close') {
      if (currentRow && currentCell) {
        currentRow.cells.push({
          text: normalizeWhitespace(currentCell.textParts.join(' ').trim()),
          links: currentCell.links,
          line: currentCell.line,
        });
      } else if (currentRow) {
        currentRow.cells.push({ text: '', links: [], line: currentRow.line });
      }
      currentCell = null;
      continue;
    }
    if (token.type === 'inline' && currentCell) {
      const rendered = renderInlineText(token);
      if (rendered) {
        currentCell.textParts.push(rendered);
      }
      if (Array.isArray(token.children)) {
        for (const child of token.children) {
          if (child.type === 'link_open') {
            const href = child.attrGet('href');
            if (href) currentCell.links.push(href.trim());
          }
        }
      }
    }
  }

  return { header, rows, endIndex: index };
}

function parseTagsCell(value, { line, issues }) {
  if (!value) return [];
  if (value.includes(';')) {
    issues.error(
      `Use apenas vírgulas para separar tags (linha ${line}).`,
      { file: '.claude/agents/agents-raiox.md', line },
    );
  }
  const parts = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const normalized = [];
  for (const part of parts) {
    try {
      normalized.push(normalizeTag(part, { line }));
    } catch (error) {
      issues.error(error.message, {
        file: '.claude/agents/agents-raiox.md',
        line,
      });
    }
  }
  return Array.from(new Set(normalized));
}

const MULTILINE_KEYS = ['description'];

function indentBlock(value) {
  return value
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function preprocessFrontMatter(source) {
  let output = source;
  for (const key of MULTILINE_KEYS) {
    const regex = new RegExp(`^${key}:\\s*(.+)$`, 'mi');
    output = output.replace(regex, (_match, value) => {
      if (!value) return `${key}:`;
      const trimmed = value.trim();
      if (/^['"|>]/.test(trimmed)) {
        return `${key}: ${value.trim()}`;
      }
      const withRealBreaks = trimmed.replace(/\\n/g, '\n');
      return `${key}: |\n${indentBlock(withRealBreaks)}`;
    });
  }
  return output;
}

export function extractFrontMatter(content = '', context = {}, issues) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { attributes: {}, body: content };
  }
  const frontMatter = preprocessFrontMatter(match[1]);
  try {
    const document = parseDocument(frontMatter, { keepSourceTokens: true });
    if (document.errors?.length) {
      throw document.errors[0];
    }
    const attributes = document.toJS({ json: true }) ?? {};
    const body = content.slice(match[0].length);
    return { attributes, body };
  } catch (error) {
    if (issues) {
      issues.error(
        `Não foi possível parsear o frontmatter: ${error.message}`,
        { file: context.file },
      );
    }
    const body = content.slice(match[0].length);
    return { attributes: {}, body };
  }
}

function normalizeAgentPath(reference = '', issues, line) {
  if (!reference) {
    issues.error('Campo "Prompt" precisa apontar para um arquivo Markdown válido.', {
      file: '.claude/agents/agents-raiox.md',
      line,
    });
    return null;
  }
  const trimmed = reference.trim();
  if (!trimmed.endsWith('.md')) {
    issues.error(
      `Links de agente devem apontar para arquivos .md (recebido "${reference}").`,
      { file: '.claude/agents/agents-raiox.md', line },
    );
    return null;
  }
  const withoutPrefix = trimmed.replace(/^\.\//, '').replace(/\\/g, '/');
  const resolved = resolve(AGENTS_DIR, withoutPrefix);
  if (
    resolved !== AGENTS_DIR &&
    !resolved.startsWith(`${AGENTS_DIR}${sep}`) &&
    resolve(resolved) !== AGENTS_DIR
  ) {
    issues.error(
      `O caminho "${reference}" tenta sair de .claude/agents. Ajuste para um arquivo válido.`,
      { file: '.claude/agents/agents-raiox.md', line },
    );
    return null;
  }
  const relativePath = relative(AGENTS_DIR, resolved).replace(/\\/g, '/');
  return relativePath;
}

function parseSummary(raw, issues) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const schemaVersion = extractSchemaVersion(normalized, issues);
  const filteredViewLinks = extractFilteredViewLinks(normalized);
  for (const category of BASE_CATEGORY_ORDER) {
    if (!filteredViewLinks.has(category)) {
      issues.error(
        `A seção "Visões filtradas por domínio" precisa listar a categoria "${category}".`,
        { file: '.claude/agents/agents-raiox.md' },
      );
    }
  }

  const tokens = markdown.parse(normalized, {});
  const agents = [];
  const categoriesWithTables = new Set();

  let currentCategory = null;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === 'heading_open' && token.tag === 'h2') {
      const inlineToken = tokens[index + 1];
      const name = inlineToken?.content?.trim() ?? '';
      currentCategory = ALL_CATEGORY_ORDER.includes(name) ? name : null;
      continue;
    }

    if (token.type === 'table_open' && currentCategory) {
      const { rows, endIndex } = parseTable(tokens, index);
      if (rows.length === 0) {
        issues.error(
          `Categoria "${currentCategory}" não possui linhas na tabela.`,
          { file: '.claude/agents/agents-raiox.md', line: token.map?.[0] },
        );
      } else {
        categoriesWithTables.add(currentCategory);
      }

      for (const row of rows) {
        if (row.cells.length !== 8) {
          issues.error(
            `Linha com ${row.cells.length} colunas encontrada; esperado 8 colunas. Conteúdo: ${row.cells
              .map((cell) => cell.text)
              .join(' | ')}`,
            { file: '.claude/agents/agents-raiox.md', line: row.line },
          );
          continue;
        }

        const [
          nameCell,
          shortExampleCell,
          capabilitiesCell,
          usageCell,
          exampleCell,
          outputCell,
          tagsCell,
          promptCell,
        ] = row.cells;

        const name = sanitizeAgentName(nameCell.text);
        if (!name.startsWith('@')) {
          issues.error(
            `Nome de agente deve começar com "@": "${name}".`,
            { file: '.claude/agents/agents-raiox.md', line: row.line },
          );
        }

        const tags = parseTagsCell(tagsCell.text, { line: tagsCell.line, issues });
        const promptLink = promptCell.links[0] ?? null;
        const normalizedTarget = normalizeAgentPath(promptLink, issues, row.line);

        const englishContent =
          detectLikelyEnglish(capabilitiesCell.text) ||
          detectLikelyEnglish(usageCell.text) ||
          detectLikelyEnglish(exampleCell.text);
        if (englishContent && !tags.includes('lang-en')) {
          issues.error(
            `O agente "${name}" apresenta descrição em inglês sem a tag "lang-en".`,
            { file: '.claude/agents/agents-raiox.md', line: row.line },
          );
        }

        agents.push({
          name,
          id: toId(name),
          category: currentCategory,
          shortExample: shortExampleCell.text,
          capabilities: capabilitiesCell.text,
          usage: usageCell.text,
          example: exampleCell.text,
          outputType: outputCell.text,
          tags,
          normalizedTarget,
          sourceLine: row.line,
        });
      }

      index = endIndex;
    }
  }

  for (const category of ALL_CATEGORY_ORDER) {
    if (category === AUTO_CATEGORY_NAME) continue;
    const hasHeading = agents.some((agent) => agent.category === category);
    if (hasHeading && !categoriesWithTables.has(category)) {
      issues.error(
        `Categoria "${category}" foi detectada mas nenhuma tabela válida foi encontrada.`,
        { file: '.claude/agents/agents-raiox.md' },
      );
    }
  }

  return {
    raw: normalized,
    agents,
    schemaVersion,
    filteredViewLinks,
  };
}

async function readAgentFiles(issues) {
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
        const filePath = join(AGENTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const { attributes } = extractFrontMatter(
          content,
          { file: `.claude/agents/${file}` },
          issues,
        );

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

        const curated = Boolean(attributes?.curated);

        const entry = {
          file,
          path: filePath,
          content,
          canonicalName,
          normalizedName: canonicalName.toLowerCase(),
          slug,
          description,
          tools,
          model,
          curated,
        };

        byName.set(entry.normalizedName, entry);
      }),
  );

  return { byName };
}

function deriveActionSentence(sentence = '') {
  let current = sentence.trim();
  if (!current) return '';

  const patterns = [
    [/^use (?:este|essa|this) agente (?:quando|para)\s*/i, ''],
    [/^you are an?\s*/i, ''],
    [/^you are the\s*/i, ''],
    [/^specializes in\s*/i, ''],
    [/^specialist in\s*/i, ''],
    [/^focus(?:es)? on\s*/i, ''],
  ];

  for (const [pattern, replacement] of patterns) {
    const replaced = current.replace(pattern, replacement).trim();
    if (replaced !== current) {
      current = replaced;
      break;
    }
  }

  return current.replace(/\.$/, '').trim();
}

function buildAutoTags(slug, model, tools) {
  const tags = new Set(['auto', 'needs-curation', 'hidden', 'lang-en']);
  if (slug) {
    tags.add(normalizeTag(slug));
  }
  if (model) {
    tags.add(normalizeTag(`model ${model}`));
  }
  tools.forEach((tool) => {
    if (tool) {
      tags.add(normalizeTag(`tool ${tool}`));
    }
  });
  return Array.from(tags).sort();
}

function buildAutoSummaryRow(agentFile) {
  const { canonicalName, slug, description, model, tools } = agentFile;
  const firstSentence = description || `Descrição automática pendente de curadoria para ${canonicalName}.`;
  const capabilities = ensurePeriod(firstSentence);

  const actionPhrase = deriveActionSentence(firstSentence);
  const actionLower =
    actionPhrase && actionPhrase.length
      ? actionPhrase.charAt(0).toLowerCase() + actionPhrase.slice(1)
      : 'das competências descritas no arquivo Markdown';

  const usage = `Ative quando precisar ${actionLower}.`;
  const example = `Ex.: Utilize ${canonicalName} para ${actionLower}.`;
  const outputType =
    'Entregáveis definidos no prompt do agente (relatórios, planos ou recomendações).';
  const tags = buildAutoTags(slug, model, tools).join(', ');
  const promptLink = `./${agentFile.file}`;
  const commandExample = `\`${canonicalName} ${actionLower}\``;

  return (
    '| `' +
    canonicalName +
    '` | ' +
    sanitizeTableCell(commandExample) +
    ' | ' +
    sanitizeTableCell(capabilities) +
    ' | ' +
    sanitizeTableCell(usage) +
    ' | ' +
    sanitizeTableCell(example) +
    ' | ' +
    sanitizeTableCell(outputType) +
    ' | ' +
    sanitizeTableCell(tags) +
    ' | [Abrir](' +
    promptLink +
    ') |'
  );
}

function ensurePeriod(text = '') {
  if (!text) return text;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function replaceAutoSection(rawContent, sectionContent) {
  const normalized = rawContent.replace(/\r\n/g, '\n');
  const startIndex = normalized.indexOf(AUTO_SENTINEL_START);
  const endIndex = normalized.indexOf(AUTO_SENTINEL_END);

  if (!sectionContent) {
    if (startIndex === -1 || endIndex === -1) {
      return normalized;
    }
    const before = normalized.slice(0, startIndex).trimEnd();
    const after = normalized.slice(endIndex + AUTO_SENTINEL_END.length).trimStart();
    const separator =
      before && after ? '\n\n' : before ? '\n' : after ? '\n' : '';
    return [before, after].filter(Boolean).join(separator);
  }

  const block = [
    AUTO_SENTINEL_START,
    sectionContent.trimEnd(),
    AUTO_SENTINEL_END,
  ].join('\n');

  if (startIndex === -1 || endIndex === -1) {
    const trimmed = normalized.trimEnd();
    const separator = trimmed ? '\n\n' : '';
    return `${trimmed}${separator}${block}\n`;
  }

  const before = normalized.slice(0, startIndex).trimEnd();
  const after = normalized.slice(endIndex + AUTO_SENTINEL_END.length).trimStart();
  const separatorBefore = before ? '\n\n' : '';
  const separatorAfter = after ? '\n\n' : '';
  return `${before}${separatorBefore}${block}${separatorAfter}${after}`.trimEnd() + '\n';
}

async function ensureSummaryCoverage(summary, fileIndex) {
  const curatedNames = new Set(
    summary.agents
      .filter((agent) => agent.category !== AUTO_CATEGORY_NAME)
      .map((agent) => agent.name.toLowerCase()),
  );
  const summaryNames = new Set(summary.agents.map((agent) => agent.name.toLowerCase()));

  const autoEntries = new Map();

  if (!INCLUDE_AUTO_SECTION) {
    const newSummaryRaw = replaceAutoSection(summary.raw, null);
    if (newSummaryRaw !== summary.raw) {
      await fs.writeFile(SUMMARY_PATH, ensureTrailingNewline(newSummaryRaw), 'utf8');
      return { updated: true };
    }
    return { updated: false };
  }

  for (const [nameLower, entry] of fileIndex.byName.entries()) {
    if (entry.curated) {
      continue;
    }
    if (curatedNames.has(nameLower)) {
      continue;
    }
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
    return { updated };
  }

  const autoRows = Array.from(autoEntries.values())
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
    .map((entry) => buildAutoSummaryRow(entry));

  const section = [
    AUTO_CATEGORY_HEADING,
    '',
    AUTO_HEADING_NOTICE,
    '',
    AUTO_TABLE_HEADER,
    ...autoRows,
    '',
  ].join('\n');

  const newSummaryRaw = replaceAutoSection(summary.raw, section);
  if (newSummaryRaw !== summary.raw) {
    await fs.writeFile(SUMMARY_PATH, ensureTrailingNewline(newSummaryRaw), 'utf8');
    updated = true;
  }

  return { updated };
}

function buildDirectory(summary, fileIndex, issues) {
  const agents = [];

  for (const agent of summary.agents) {
    if (agent.category === AUTO_CATEGORY_NAME && !INCLUDE_AUTO_SECTION) {
      continue;
    }

    const entry = fileIndex.byName.get(agent.name.toLowerCase());
    if (!entry) {
      issues.error(
        `Agente "${agent.name}" presente no resumo, mas arquivo .md não encontrado.`,
        { file: '.claude/agents/agents-raiox.md', line: agent.sourceLine },
      );
      continue;
    }

    if (!agent.normalizedTarget) {
      continue;
    }

    const filePath = buildFilePathForDataset(agent.normalizedTarget);

    const shortExample = normalizeWhitespace(agent.shortExample ?? '');

    agents.push({
      id: agent.id,
      name: agent.name,
      category: agent.category,
      capabilities: normalizeWhitespace(agent.capabilities),
      usage: normalizeWhitespace(agent.usage),
      example: normalizeWhitespace(agent.example),
      shortExample: shortExample || undefined,
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

  return { agents };
}

function buildOutput(agents, categoriesForExport) {
  const categoryUnion = categoriesForExport
    .map((category) => `  | ${JSON.stringify(category)}`)
    .join('\n');

  const categoryArrayLiteral = `[\n${categoriesForExport
    .map((category) => `  ${JSON.stringify(category)}`)
    .join(',\n')}\n]`;

  const agentsLiteral = agents
    .map((agent) => {
      const shortExampleLine = agent.shortExample
        ? `    shortExample: ${JSON.stringify(agent.shortExample)},`
        : null;
      return [
        '  {',
        `    id: ${JSON.stringify(agent.id)},`,
        `    name: ${JSON.stringify(agent.name)},`,
        `    category: ${JSON.stringify(agent.category)},`,
        `    capabilities: ${JSON.stringify(agent.capabilities)},`,
        `    usage: ${JSON.stringify(agent.usage)},`,
        `    example: ${JSON.stringify(agent.example)},`,
        shortExampleLine,
        `    outputType: ${JSON.stringify(agent.outputType)},`,
        `    tags: [${agent.tags.map((tag) => JSON.stringify(tag)).join(', ')}],`,
        `    filePath: ${JSON.stringify(agent.filePath)},`,
        `    fileContent: ${JSON.stringify(agent.fileContent)},`,
        '  }',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join(',\n');

  return [
    '// Generated from .claude/agents/agents-raiox.md — do not edit manually',
    `export const AGENT_CATALOG_SCHEMA_VERSION = ${JSON.stringify(
      AGENT_CATALOG_SCHEMA_VERSION,
    )};`,
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
    '  shortExample?: string;',
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

async function writeFileIfChanged(targetPath, content) {
  const normalizedContent = ensureTrailingNewline(content);
  const existing = await fs
    .readFile(targetPath, 'utf8')
    .then((value) => value)
    .catch(() => null);

  if (existing === normalizedContent) {
    return false;
  }

  await fs.writeFile(targetPath, normalizedContent, 'utf8');
  return true;
}

async function generateFilteredViews(summary, issues) {
  const filteredViews = summary.filteredViewLinks;
  for (const [category, relativePath] of filteredViews.entries()) {
    if (!BASE_CATEGORY_ORDER.includes(category)) {
      issues.error(
        `Visão filtrada "${category}" não corresponde a nenhuma categoria conhecida.`,
        { file: '.claude/agents/agents-raiox.md' },
      );
      continue;
    }
    const normalizedPath = normalizeAgentPath(`./${relativePath}`, issues);
    if (!normalizedPath) continue;

    const agents = summary.agents.filter(
      (agent) => agent.category === category && agent.normalizedTarget,
    );
    const content = buildFilteredViewContent(category, agents);
    const targetPath = join(AGENTS_DIR, normalizedPath);
    await writeFileIfChanged(targetPath, content);

    const exists = await fs
      .access(targetPath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      issues.error(
        `A visão filtrada "${category}" não pôde ser criada em ${targetPath}.`,
        { file: targetPath },
      );
    }
  }
}

function buildFilteredViewContent(category, agents) {
  const header = [
    `<!-- schemaVersion: ${AGENT_CATALOG_SCHEMA_VERSION} -->`,
    `# ${category}`,
    '',
    'Este diretório filtrado lista apenas os agentes da categoria correspondente. Consulte também [a visão completa](./agents-raiox.md).',
    '',
    '> Interface visual: [Dashboard → Claude Agents](/#/ai-agents-directory)',
    '',
    '| Agente | Capacidades principais | Momento típico de uso | Exemplo prático | Tipo de saída | Tags | Prompt |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  const rows = agents.map((agent) => {
    const tags = agent.tags.join(', ');
    const displayName = agent.name.startsWith('`')
      ? agent.name
      : `\`${agent.name}\``;
    return (
      '| ' +
      sanitizeTableCell(displayName) +
      ' | ' +
      sanitizeTableCell(agent.capabilities) +
      ' | ' +
      sanitizeTableCell(agent.usage) +
      ' | ' +
      sanitizeTableCell(agent.example) +
      ' | ' +
      sanitizeTableCell(agent.outputType) +
      ' | ' +
      sanitizeTableCell(tags) +
      ' | [Abrir](./' +
      agent.normalizedTarget +
      ') |'
    );
  });

  return [...header, ...rows, ''].join('\n');
}

async function writeRunLog({
  status,
  issues,
  agentsGenerated,
  categories,
  includeAuto,
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    schemaVersion: AGENT_CATALOG_SCHEMA_VERSION,
    mode: RUN_MODE,
    includeAuto,
    agentsGenerated,
    categories,
    status,
    warnings: issues.warnings,
    errors: issues.errors,
  };

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(REPORTS_LOG, JSON.stringify(payload, null, 2), 'utf8');
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

  const issues = new IssueTracker();

  const fileIndex = await readAgentFiles(issues);

  let summary = await parseSummary(
    await fs.readFile(SUMMARY_PATH, 'utf8'),
    issues,
  );
  const coverageResult = await ensureSummaryCoverage(summary, fileIndex);
  if (coverageResult.updated) {
    summary = await parseSummary(
      await fs.readFile(SUMMARY_PATH, 'utf8'),
      issues,
    );
  }

  const directory = buildDirectory(summary, fileIndex, issues);

  const categoriesInSummary = ALL_CATEGORY_ORDER.filter((category) =>
    summary.agents.some(
      (agent) =>
        agent.category === category &&
        (category !== AUTO_CATEGORY_NAME || INCLUDE_AUTO_SECTION),
    ),
  );

  const output = buildOutput(directory.agents, categoriesInSummary);
  await fs.writeFile(OUTPUT_PATH, ensureTrailingNewline(output), 'utf8');

  await generateFilteredViews(summary, issues);

  const status = issues.hasErrors() ? 'failed' : 'success';
  await writeRunLog({
    status,
    issues: issues.summary(),
    agentsGenerated: directory.agents.length,
    categories: categoriesInSummary,
    includeAuto: INCLUDE_AUTO_SECTION,
  });

  issues.print();

  if (issues.hasErrors()) {
    process.exit(1);
  }

  console.log(
    `✅ Catálogo de agentes atualizado com ${directory.agents.length} registros em ${OUTPUT_PATH}`,
  );
}

const executedDirectly =
  process.argv[1] && resolve(process.argv[1]) === __filename;

if (executedDirectly) {
  main().catch((error) => {
    console.error('❌ Falha ao gerar catálogo de agentes:', error);
    process.exit(1);
  });
}
