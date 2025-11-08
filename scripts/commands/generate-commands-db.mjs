#!/usr/bin/env node

/**
 * Gera e valida o catálogo de comandos Claude usados pelo dashboard.
 *
 * Principais recursos:
 * - Parser robusto de Markdown (markdown-it) para extrair comandos e categorias
 * - Validações de schema, idioma e exemplos obrigatórios
 * - Opcionalmente injeta a seção automática apenas quando `--include-auto` é usado
 * - Exporta `frontend/dashboard/src/data/commands-db.json` com `schemaVersion`
 * - Persistência de log estruturado em `reports/commands/last-run.json`
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { promises as fs, existsSync } from 'fs';
import { createRequire } from 'module';

const { dirname, join, relative, resolve } = path;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

const moduleResolvers = [
  createRequire(import.meta.url),
  ...[
    join(repoRoot, 'package.json'),
    join(repoRoot, 'frontend', 'dashboard', 'package.json'),
  ]
    .filter(packageJsonPath => existsSync(packageJsonPath))
    .map(packageJsonPath => createRequire(packageJsonPath)),
];

function loadModule(specifier) {
  let lastError;
  for (const resolver of moduleResolvers) {
    try {
      return resolver(specifier);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Unable to load dependency "${specifier}"`);
}

const { parseDocument } = loadModule('yaml');
const MarkdownItModule = loadModule('markdown-it');
const MarkdownIt =
  MarkdownItModule?.default ?? MarkdownItModule;
const markdownItMultimdTableModule = loadModule('markdown-it-multimd-table');
const markdownItMultimdTable =
  markdownItMultimdTableModule?.default ?? markdownItMultimdTableModule;

const SUMMARY_PATH = join(repoRoot, '.claude/commands/commands-raiox.md');
const COMMANDS_DIR = join(repoRoot, '.claude/commands');
const OUTPUT_PATH = join(
  repoRoot,
  'frontend/dashboard/src/data/commands-db.json',
);
const REPORTS_DIR = join(repoRoot, 'reports/commands');
const REPORTS_LOG = join(REPORTS_DIR, 'last-run.json');

const COMMAND_CATALOG_SCHEMA_VERSION = '1.1.0';
const AUTO_CATEGORY_NAME = 'Novos Comandos Automatizados';
const AUTO_HEADING_NOTICE =
  '> ⚠️ Entradas geradas automaticamente a partir dos arquivos Markdown. Revise, ajuste a categoria e complete as descrições conforme necessário.';
const AUTO_ENTRY_NOTICE =
  '> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.';
const AUTO_SENTINEL_START = '<!-- AUTO-COMMANDS:START -->';
const AUTO_SENTINEL_END = '<!-- AUTO-COMMANDS:END -->';

const CLI_FLAGS = new Set(process.argv.slice(2));
const INCLUDE_AUTO_SECTION = CLI_FLAGS.has('--include-auto');
const RUN_MODE = CLI_FLAGS.has('--ci') ? 'ci' : 'local';

const markdown = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
}).use(markdownItMultimdTable);

const FILE_NAME_ALIASES = {
  'task-find': 'find',
};

const COMMAND_TAGS = {
  '/all-tools': ['overview', 'cli'],
  '/docs-maintenance': ['documentation', 'quality', 'governance'],
  '/update-docs': ['documentation', 'sync'],
  '/create-onboarding-guide': ['documentation', 'onboarding'],
  '/troubleshooting-guide': ['support', 'incident-response'],
  '/todo': ['productivity', 'tracking'],
  '/start': ['workflow', 'planning'],
  '/workflow-orchestrator': ['workflow', 'automation'],
  '/task-find': ['workflow', 'search'],
  '/create-feature': ['planning', 'delivery'],
  '/system-behavior-simulator': ['analysis', 'performance'],
  '/ultra-think': ['strategy', 'analysis'],
  '/architecture-review': ['architecture', 'audit'],
  '/create-architecture-documentation': ['architecture', 'documentation'],
  '/design-rest-api': ['api', 'design'],
  '/design-database-schema': ['database', 'design'],
  '/create-database-migrations': ['database', 'migration'],
  '/quality-check': ['quality', 'ci'],
  '/code-review': ['quality', 'review'],
  '/lint': ['quality', 'lint'],
  '/format': ['quality', 'formatting'],
  '/type-check': ['quality', 'typescript'],
  '/test': ['quality', 'testing'],
  '/generate-tests': ['testing', 'coverage'],
  '/performance-audit': ['performance', 'analysis'],
  '/audit': ['security', 'dependencies'],
  '/debug-error': ['troubleshooting', 'bugfix'],
  '/explain-code': ['documentation', 'knowledge'],
  '/refactor-code': ['quality', 'refactoring'],
  '/init-project': ['setup', 'scaffolding'],
  '/setup-development-environment': ['setup', 'devx'],
  '/setup-formatting': ['setup', 'formatting'],
  '/setup-linting': ['setup', 'lint'],
  '/update-dependencies': ['maintenance', 'dependencies'],
  '/build': ['ci', 'build'],
  '/commit': ['git', 'workflow'],
  '/create-pr': ['git', 'workflow'],
  '/setup-ci-cd-pipeline': ['ci', 'pipeline'],
  '/ci-pipeline': ['ci', 'pipeline'],
  '/optimize-build': ['performance', 'build'],
  '/containerize-application': ['devops', 'docker'],
  '/setup-docker-containers': ['devops', 'docker'],
  '/setup-cdn-optimization': ['performance', 'cdn'],
  '/add-performance-monitoring': ['observability', 'monitoring'],
  '/setup-monitoring-observability': ['observability', 'monitoring'],
  '/implement-caching-strategy': ['performance', 'caching'],
  '/optimize-api-performance': ['performance', 'api'],
  '/optimize-bundle-size': ['performance', 'frontend'],
  '/optimize-database-performance': ['performance', 'database'],
  '/optimize-memory-usage': ['performance', 'memory'],
  '/doc-api': ['documentation', 'api'],
  '/generate-api-documentation': ['documentation', 'api'],
};

const FILE_BASE_TO_COMMAND = Object.entries(FILE_NAME_ALIASES).reduce(
  (acc, [commandSlug, fileSlug]) => {
    acc[fileSlug] = `/${commandSlug}`;
    return acc;
  },
  {},
);

class IssueTracker {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  error(message, meta = {}) {
    this.errors.push({ message, ...meta });
  }

  warn(message, meta = {}) {
    this.warnings.push({ message, ...meta });
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

function sanitizeCommandName(raw = '') {
  return raw.replace(/[`'"]/g, '').trim();
}

function slugifyCommandName(raw = '') {
  const cleaned = sanitizeCommandName(raw).replace(/^\//, '');
  const slug = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return FILE_NAME_ALIASES[slug] ?? slug;
}

function deriveCommandFromFile(baseName = '') {
  if (!baseName) return null;
  if (FILE_BASE_TO_COMMAND[baseName]) {
    return FILE_BASE_TO_COMMAND[baseName];
  }
  return `/${baseName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
}

function detectLikelyEnglish(text = '') {
  if (!text) return false;
  const sample = text.toLowerCase();
  const signals = [
    'use this command',
    'when you need',
    'implement',
    'ensure',
    'specialist',
    'analysis',
    'monitor',
    'design',
    'optimize',
    'execute',
  ];
  return signals.filter((token) => sample.includes(token)).length >= 2;
}

function extractSchemaVersion(raw, issues) {
  const match = raw.match(/<!--\s*schemaVersion:\s*([0-9.]+)\s*-->/i);
  if (!match) {
    issues.error(
      'O arquivo `.claude/commands/commands-raiox.md` precisa declarar `<!-- schemaVersion: x.y.z -->` no topo.',
      { file: '.claude/commands/commands-raiox.md' },
    );
    return null;
  }
  const version = match[1].trim();
  if (version !== COMMAND_CATALOG_SCHEMA_VERSION) {
    issues.error(
      `Schema version incompatível. Esperado "${COMMAND_CATALOG_SCHEMA_VERSION}", encontrado "${version}".`,
      { file: '.claude/commands/commands-raiox.md' },
    );
  }
  return version;
}

function extractCommandHeading(inlineToken) {
  if (!inlineToken) return { command: null, label: null };
  const codeChild = inlineToken.children?.find(
    (child) => child.type === 'code_inline',
  );
  const raw = codeChild?.content ?? inlineToken.content ?? '';
  const command = sanitizeCommandName(raw).startsWith('/')
    ? sanitizeCommandName(raw)
    : `/${sanitizeCommandName(raw) || inlineToken.content?.trim() || ''}`
        .replace(/\/{2,}/g, '/')
        .trim();
  return {
    command,
    label: inlineToken.content?.trim() ?? command,
  };
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
  return quoteAmbiguousScalars(output);
}

function quoteAmbiguousScalars(source) {
  return source
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*[A-Za-z0-9_-]+):\s*(.+)$/);
      if (!match) return line;
      const [, key, value] = match;
      const trimmed = value.trim();
      if (!trimmed || trimmed === '|' || trimmed === '>') {
        return line;
      }
      const alreadyQuoted = /^['"].*['"]$/.test(trimmed);
      const resemblesCollection =
        trimmed.startsWith('[') ||
        trimmed.startsWith('{') ||
        trimmed.includes(' | ') ||
        trimmed.includes(': ') ||
        /[[\]\\]/.test(trimmed);
      if (!alreadyQuoted && resemblesCollection) {
        const escaped = trimmed.replace(/"/g, '\\"');
        return `${key}: "${escaped}"`;
      }
      return line;
    })
    .join('\n');
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

function stripFrontMatter(content = '') {
  const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  if (!match) return content;
  return content.slice(match[0].length);
}

function parseExamplesCell(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSummary(raw, issues) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const schemaVersion = extractSchemaVersion(normalized, issues);
  const tokens = markdown.parse(normalized, {});

  const commands = [];
  const notes = [];
  const seenCommands = new Set();

  let currentCategory = null;
  let currentCommand = null;
  let insideAutoBlock = false;
  let skipAutoTokens = false;
  let listDepth = 0;
  let pendingListItem = null;

  const pushCurrent = () => {
    if (!currentCommand) return;
    commands.push(currentCommand);
    currentCommand = null;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === 'html_block') {
      if (token.content.includes(AUTO_SENTINEL_START)) {
        insideAutoBlock = true;
        skipAutoTokens = !INCLUDE_AUTO_SECTION;
        continue;
      }
      if (token.content.includes(AUTO_SENTINEL_END)) {
        insideAutoBlock = false;
        skipAutoTokens = false;
        continue;
      }
    }

    if (skipAutoTokens) {
      continue;
    }

    if (token.type === 'heading_open' && token.tag === 'h2') {
      pushCurrent();
      const inlineToken = tokens[index + 1];
      currentCategory = inlineToken?.content?.trim() ?? null;
      continue;
    }

    if (token.type === 'heading_open' && token.tag === 'h3') {
      pushCurrent();
      const inlineToken = tokens[index + 1];
      const { command, label } = extractCommandHeading(inlineToken);
      if (!command || !command.startsWith('/')) {
        issues.error('Título de comando inválido.', {
          file: '.claude/commands/commands-raiox.md',
          line: token.map ? token.map[0] + 1 : undefined,
        });
        continue;
      }
      if (seenCommands.has(command) && currentCategory !== AUTO_CATEGORY_NAME) {
        issues.error(
          `Comando duplicado "${command}" encontrado em múltiplas categorias.`,
          { file: '.claude/commands/commands-raiox.md' },
        );
      }
      seenCommands.add(command);
      currentCommand = {
        command,
        label,
        category: currentCategory,
        exemplos: [],
        sourceLine: token.map ? token.map[0] + 1 : undefined,
      };
      continue;
    }

    if (token.type === 'bullet_list_open') {
      listDepth += 1;
      continue;
    }

    if (token.type === 'bullet_list_close') {
      listDepth = Math.max(0, listDepth - 1);
      continue;
    }

    if (listDepth > 0 && token.type === 'list_item_open') {
      pendingListItem = {
        line: token.map ? token.map[0] + 1 : undefined,
      };
      continue;
    }

    if (token.type === 'list_item_close') {
      pendingListItem = null;
      continue;
    }

    if (pendingListItem && token.type === 'inline') {
      const text = token.content.trim();
      if (!text) continue;

      if (
        currentCategory === 'Observacoes Finais' &&
        (!currentCommand || text.startsWith('- '))
      ) {
        notes.push(text.replace(/^-+\s*/, ''));
        continue;
      }

      if (!currentCommand) {
        continue;
      }

      const match = text.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
      if (!match) {
        issues.error(
          `Item inválido na lista do comando "${currentCommand.command}". Use "- **Campo**: valor".`,
          {
            file: '.claude/commands/commands-raiox.md',
            line: pendingListItem.line,
          },
        );
        continue;
      }

      const label = match[1].trim().toLowerCase();
      const value = match[2].trim();

      switch (label) {
        case 'capacidades':
          currentCommand.capacidades = value;
          break;
        case 'momento ideal':
          currentCommand.momentoIdeal = value;
          break;
        case 'exemplo de momento':
          currentCommand.exemploMomento = value;
          break;
        case 'tipo de saida':
          currentCommand.tipoSaida = value;
          break;
        case 'exemplos':
          currentCommand.exemplos = parseExamplesCell(value);
          break;
        default:
          break;
      }
    }
  }

  pushCurrent();

  for (const entry of commands) {
    if (!entry.category) {
      issues.error(`O comando "${entry.command}" não está associado a nenhuma categoria.`, {
        file: '.claude/commands/commands-raiox.md',
        line: entry.sourceLine,
      });
    }
    if (!entry.capacidades) {
      issues.error(`Campo "Capacidades" ausente no comando "${entry.command}".`, {
        file: '.claude/commands/commands-raiox.md',
        line: entry.sourceLine,
      });
    }
    if (!entry.momentoIdeal) {
      issues.error(
        `Campo "Momento ideal" ausente no comando "${entry.command}".`,
        { file: '.claude/commands/commands-raiox.md', line: entry.sourceLine },
      );
    }
    if (!entry.exemploMomento) {
      issues.error(
        `Campo "Exemplo de momento" ausente no comando "${entry.command}".`,
        { file: '.claude/commands/commands-raiox.md', line: entry.sourceLine },
      );
    }
    if (!entry.tipoSaida) {
      issues.error(
        `Campo "Tipo de saida" ausente no comando "${entry.command}".`,
        { file: '.claude/commands/commands-raiox.md', line: entry.sourceLine },
      );
    }
    if (!entry.exemplos?.length) {
      issues.error(
        `Campo "Exemplos" precisa listar pelo menos um exemplo (comando "${entry.command}").`,
        { file: '.claude/commands/commands-raiox.md', line: entry.sourceLine },
      );
    }

    const englishContent =
      detectLikelyEnglish(entry.capacidades) ||
      detectLikelyEnglish(entry.momentoIdeal) ||
      detectLikelyEnglish(entry.exemploMomento) ||
      detectLikelyEnglish(entry.tipoSaida);
    if (englishContent && entry.category !== AUTO_CATEGORY_NAME) {
      issues.error(
        `O comando "${entry.command}" possui descrição em inglês. Traduzir para PT-BR ou mover para auto-curadoria.`,
        { file: '.claude/commands/commands-raiox.md', line: entry.sourceLine },
      );
    }
  }

  return {
    raw: normalized,
    commands,
    notes,
    schemaVersion,
  };
}

async function readCommandFiles(issues) {
  const files = await fs.readdir(COMMANDS_DIR);
  const entries = new Map();

  await Promise.all(
    files
      .filter(
        (file) =>
          file.endsWith('.md') &&
          file.toLowerCase() !== 'commands-raiox.md' &&
          file.toLowerCase() !== 'readme.md',
      )
      .map(async (file) => {
        const fullPath = join(COMMANDS_DIR, file);
        const content = await fs.readFile(fullPath, 'utf8');
        const { attributes, body } = extractFrontMatter(
          content,
          { file: `.claude/commands/${file}` },
          issues,
        );

        const baseName = file.replace(/\.md$/i, '');
        const command = deriveCommandFromFile(baseName);

        entries.set(baseName.toLowerCase(), {
          file,
          path: fullPath,
          content,
          command,
          metadata: attributes,
          title: extractPrimaryHeading(body),
        });
      }),
  );

  return entries;
}

function extractPrimaryHeading(body = '') {
  const headingMatch = body.match(/^#\s+(.+?)\s*$/m);
  return headingMatch ? headingMatch[1].trim() : null;
}

function buildExamples(command, argumentHint = '') {
  const examples = new Set([command]);
  const tokens = [];

  if (Array.isArray(argumentHint)) {
    tokens.push(
      ...argumentHint
        .map((item) => (typeof item === 'string' ? item.trim() : `${item}`))
        .filter(Boolean),
    );
  } else if (typeof argumentHint === 'string') {
    tokens.push(
      ...argumentHint
        .split('|')
        .map((token) => token.trim())
        .filter(Boolean),
    );
  } else if (argumentHint) {
    tokens.push(`${argumentHint}`.trim());
  }

  if (tokens.length === 0) {
    return Array.from(examples);
  }

  tokens.forEach((token) => {
    if (!token) return;
    if (/^\[.+\]$/.test(token)) {
      const placeholder = token.slice(1, -1).trim();
      const safePlaceholder = placeholder
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-');
      examples.add(`${command} <${safePlaceholder || 'valor'}>`);
      return;
    }
    examples.add(`${command} ${token}`);
  });

  return Array.from(examples).slice(0, 5);
}

function buildAutoSummaryEntry(command, metadata = {}) {
  const { description, argumentHint, title } = metadata;
  const cleanDescription = description
    ? normalizeWhitespace(description)
    : null;
  const capacidades = cleanDescription
    ? `[hidden] ${cleanDescription.replace(/\.$/, '')}.`
    : '[hidden] Descrição automática pendente de revisão.';
  const actionPhrase = cleanDescription
    ? cleanDescription.replace(/\.$/, '')
    : 'definir o melhor uso do comando';
  const actionLower =
    actionPhrase.charAt(0).toLowerCase() + actionPhrase.slice(1);
  const momentoIdeal = `Quando for necessário ${actionLower}.`;
  const titleFragment = title
    ? title.replace(/\.$/, '')
    : `o comando ${command}`;
  const examples = buildExamples(command, argumentHint);
  const secondaryExample = examples.find((example) => example !== command);
  const exemploMomento = secondaryExample
    ? `Ex.: Utilize ${secondaryExample} durante ${titleFragment}.`
    : `Ex.: Execute ${command} durante ${titleFragment}.`;
  const tipoSaida = `Blueprint em Markdown com instruções detalhadas para ${titleFragment}.`;

  return [
    `### \`${command}\``,
    AUTO_ENTRY_NOTICE,
    `- **Capacidades**: ${capacidades}`,
    `- **Momento ideal**: ${momentoIdeal}`,
    `- **Exemplo de momento**: ${exemploMomento}`,
    `- **Tipo de saida**: ${tipoSaida}`,
    `- **Exemplos**: ${examples.join(', ')}`,
  ].join('\n');
}

function replaceAutoSection(rawContent, sectionContent) {
  const normalized = rawContent.replace(/\r\n/g, '\n');
  const startIndex = normalized.indexOf(AUTO_SENTINEL_START);
  const endIndex = normalized.indexOf(AUTO_SENTINEL_END);

  const block =
    sectionContent && sectionContent.trim().length
      ? `${AUTO_SENTINEL_START}\n${sectionContent.trimEnd()}\n${AUTO_SENTINEL_END}`
      : `${AUTO_SENTINEL_START}\n${AUTO_SENTINEL_END}`;

  if (startIndex === -1 || endIndex === -1) {
    const trimmed = normalized.trimEnd();
    const separator = trimmed ? '\n\n' : '';
    return `${trimmed}${separator}${block}\n`;
  }

  const before = normalized.slice(0, startIndex).trimEnd();
  const after = normalized.slice(endIndex + AUTO_SENTINEL_END.length).trimStart();
  return ensureTrailingNewline(
    [before, block, after].filter((chunk) => chunk && chunk.length).join('\n\n'),
  );
}

async function ensureAutoCoverage(summary, fileIndex, issues) {
  const curatedCommands = new Set(
    summary.commands
      .filter((entry) => entry.category !== AUTO_CATEGORY_NAME)
      .map((entry) => entry.command.toLowerCase()),
  );

  const pendingFiles = [];
  for (const entry of fileIndex.values()) {
    if (!entry.command) continue;
    if (!curatedCommands.has(entry.command.toLowerCase())) {
      pendingFiles.push(entry);
    }
  }

  if (!INCLUDE_AUTO_SECTION) {
    if (pendingFiles.length > 0) {
      issues.warn(
        `Encontrados ${pendingFiles.length} comandos sem categoria definida. Rode o gerador com "--include-auto" para visualizar sugestões.`,
        { file: '.claude/commands/commands-raiox.md' },
      );
    }
    const withoutAuto = replaceAutoSection(summary.raw, '');
    if (withoutAuto !== summary.raw) {
      await fs.writeFile(SUMMARY_PATH, ensureTrailingNewline(withoutAuto), 'utf8');
      return { updated: true };
    }
    return { updated: false };
  }

  if (pendingFiles.length === 0) {
    const withoutAuto = replaceAutoSection(summary.raw, '');
    if (withoutAuto !== summary.raw) {
      await fs.writeFile(SUMMARY_PATH, ensureTrailingNewline(withoutAuto), 'utf8');
      return { updated: true };
    }
    return { updated: false };
  }

  const autoEntries = pendingFiles
    .map((entry) => {
      const metadata = {
        description: entry.metadata?.description,
        argumentHint: entry.metadata?.['argument-hint'],
        title: entry.title,
      };
      return buildAutoSummaryEntry(entry.command, metadata);
    })
    .filter(Boolean);

  const sectionPieces = [
    `## ${AUTO_CATEGORY_NAME}`,
    '',
    AUTO_HEADING_NOTICE,
    '',
    autoEntries.join('\n\n'),
  ].filter(Boolean);

  const block = sectionPieces.join('\n');
  const newSummary = replaceAutoSection(summary.raw, block);
  if (newSummary !== summary.raw) {
    await fs.writeFile(SUMMARY_PATH, ensureTrailingNewline(newSummary), 'utf8');
    return { updated: true };
  }
  return { updated: false };
}

function normalizeTag(raw) {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildDatabase(summary, fileIndex, issues) {
  const commands = [];

  for (const record of summary.commands) {
    const slug = slugifyCommandName(record.command);
    const fileName = slug ? `${slug}.md` : undefined;
    const fileEntry = fileName
      ? fileIndex.get(fileName.replace(/\.md$/i, '').toLowerCase())
      : null;

    if (!fileEntry) {
      issues.error(
        `Arquivo Markdown não encontrado para o comando "${record.command}". Esperado "${slug}.md".`,
        { file: '.claude/commands/commands-raiox.md', line: record.sourceLine },
      );
      continue;
    }

    const cleanedContent = stripFrontMatter(fileEntry.content);
    const tagList =
      COMMAND_TAGS[record.command] ?? COMMAND_TAGS[`/${slug}`] ?? [slug];
    const normalizedTags = Array.from(
      new Set(
        tagList
          .map((tag) => normalizeTag(tag))
          .filter(Boolean),
      ),
    );

    if (record.category === AUTO_CATEGORY_NAME && !normalizedTags.includes('hidden')) {
      normalizedTags.push('hidden');
    }

    commands.push({
      command: record.command,
      label: record.label,
      category: record.category,
      exemplos: record.exemplos,
      capacidades: record.capacidades,
      momentoIdeal: record.momentoIdeal,
      exemploMomento: record.exemploMomento,
      tipoSaida: record.tipoSaida,
      fileName,
      filePath: relative(repoRoot, fileEntry.path).replace(/\\/g, '/'),
      fileContent: cleanedContent,
      tags: normalizedTags,
    });
  }

  commands.sort((a, b) => a.command.localeCompare(b.command));

  return {
    schemaVersion: COMMAND_CATALOG_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    commands,
    notes: summary.notes,
  };
}

async function writeRunLog({ status, issues, commandCount, includeAuto }) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const payload = {
    timestamp: new Date().toISOString(),
    schemaVersion: COMMAND_CATALOG_SCHEMA_VERSION,
    mode: RUN_MODE,
    includeAuto,
    commandsGenerated: commandCount,
    status,
    warnings: issues.warnings,
    errors: issues.errors,
  };
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
  const fileIndex = await readCommandFiles(issues);

  let summary = parseSummary(await fs.readFile(SUMMARY_PATH, 'utf8'), issues);
  const coverageResult = await ensureAutoCoverage(summary, fileIndex, issues);
  if (coverageResult.updated) {
    summary = parseSummary(await fs.readFile(SUMMARY_PATH, 'utf8'), issues);
  }

  const database = buildDatabase(summary, fileIndex, issues);
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(database, null, 2),
    'utf8',
  );

  const status = issues.hasErrors() ? 'failed' : 'success';
  await writeRunLog({
    status,
    issues: issues.summary(),
    commandCount: database.commands.length,
    includeAuto: INCLUDE_AUTO_SECTION,
  });

  issues.print();

  if (issues.hasErrors()) {
    process.exit(1);
  }

  console.log(
    `✅ Banco de dados de comandos atualizado com ${database.commands.length} entradas em ${OUTPUT_PATH}`,
  );
}

const executedDirectly =
  process.argv[1] && resolve(process.argv[1]) === __filename;

if (executedDirectly) {
  main().catch((error) => {
    console.error('❌ Erro ao gerar banco de dados de comandos:', error);
    process.exit(1);
  });
}
