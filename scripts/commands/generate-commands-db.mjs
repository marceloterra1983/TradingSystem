#!/usr/bin/env node

/**
 * Gera um banco de dados JSON para o catálogo de comandos Claude.
 *
 * - Lê o arquivo `.claude/commands/commands-raiox.md`
 * - Extrai informações estruturadas de cada comando
 * - Associa o conteúdo completo dos arquivos `.md` individuais
 * - Remove metadados front matter quando presentes
 * - Escreve `frontend/dashboard/src/data/commands-db.json`
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { promises as fs } from 'fs';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

const SUMMARY_PATH = join(repoRoot, '.claude/commands/commands-raiox.md');
const COMMANDS_DIR = join(repoRoot, '.claude/commands');
const OUTPUT_PATH = join(
  repoRoot,
  'frontend/dashboard/src/data/commands-db.json',
);

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

const AUTO_CATEGORY_NAME = 'Novos Comandos Automatizados';
const AUTO_CATEGORY_HEADING = `## ${AUTO_CATEGORY_NAME}`;
const AUTO_HEADING_NOTICE =
  '> ⚠️ Entradas geradas automaticamente a partir dos arquivos Markdown. Revise, ajuste a categoria e complete as descrições conforme necessário.';
const AUTO_ENTRY_NOTICE =
  '> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.';

const FILE_BASE_TO_COMMAND = Object.entries(FILE_NAME_ALIASES).reduce(
  (acc, [commandSlug, fileSlug]) => {
    acc[fileSlug] = `/${commandSlug}`;
    return acc;
  },
  {},
);

function upcaseFirst(text = '') {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeSpacing(text = '') {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeCommandName(raw) {
  return raw.replace(/[`'"]/g, '').trim();
}

function stripFrontMatter(content = '') {
  const frontMatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n?/;
  if (frontMatterRegex.test(content)) {
    return content.replace(frontMatterRegex, '');
  }
  return content;
}

function slugifyCommandName(raw) {
  const cleaned = normalizeCommandName(raw).replace(/^\//, '');
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

function normalizeFrontMatter(raw = '') {
  return raw
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*[A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) return line;
      const [, key, value] = match;
      if (!value) return line;
      const trimmedValue = value.trim();
      const needsQuoting =
        trimmedValue.includes(' | ') || /^[^[{].*\|.*$/.test(trimmedValue);
      if (needsQuoting && !/^['"].*['"]$/.test(trimmedValue)) {
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
    return { attributes: {}, body: content };
  }
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
    if (token.startsWith('--')) {
      examples.add(`${command} ${token}`);
      return;
    }
    examples.add(`${command} ${token}`);
  });

  return Array.from(examples).slice(0, 5);
}

function buildAutoSummaryEntry(command, metadata = {}) {
  const { description, argumentHint, title } = metadata;
  const cleanDescription = description
    ? description.replace(/\s+/g, ' ').trim()
    : null;
  const capacidades = cleanDescription
    ? upcaseFirst(cleanDescription.replace(/\.$/, '')) + '.'
    : 'Descrição automática pendente de revisão.';
  const normalizedDescription = cleanDescription
    ? cleanDescription.replace(/\.$/, '')
    : 'definir o melhor uso do comando';
  const descriptionSentence = normalizedDescription
    ? normalizedDescription.charAt(0).toLowerCase() +
      normalizedDescription.slice(1)
    : normalizedDescription;
  const titleFragment = title
    ? title.replace(/\.$/, '')
    : `o comando ${command}`;
  const examples = buildExamples(command, argumentHint);
  const secondaryExample = examples.find((example) => example !== command);

  const momentoIdeal = cleanDescription
    ? `Quando for necessário ${descriptionSentence}.`
    : 'Definir o melhor momento de uso do comando.';
  const momentoIdealNormalized = normalizeSpacing(momentoIdeal);
  const exemploMomento = secondaryExample
    ? normalizeSpacing(
        `Ex.: Utilize ${command} ${secondaryExample.replace(
          `${command} `,
          '',
        )} durante ${titleFragment}.`,
      )
    : normalizeSpacing(`Ex.: Execute ${command} durante ${titleFragment}.`);
  const tipoSaida = `Blueprint em Markdown com instruções detalhadas para ${titleFragment}.`;

  return [
    `### \`${command}\``,
    AUTO_ENTRY_NOTICE,
    `- **Capacidades**: ${capacidades}`,
    `- **Momento ideal**: ${momentoIdealNormalized}`,
    `- **Exemplo de momento**: ${exemploMomento}`,
    `- **Tipo de saida**: ${normalizeSpacing(tipoSaida)}`,
    `- **Exemplos**: ${examples.join(', ')}`,
  ].join('\n');
}

function parseCommandsSummary(raw = '') {
  const lines = raw.split('\n');

  const commandsMap = new Map();
  const notes = [];

  let currentCategory = '';
  let current = null;

  const pushCurrent = () => {
    if (current) {
      commandsMap.set(current.command, current);
      current = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('## ')) {
      pushCurrent();
      currentCategory = trimmed.replace(/^##\s+/, '').trim();
      continue;
    }

    if (trimmed.startsWith('### ')) {
      pushCurrent();
      const label = trimmed.replace(/^###\s+/, '').trim();
      const commandToken = label.split(' ')[0];
      const command = normalizeCommandName(commandToken);
      current = {
        command,
        label,
        category: currentCategory,
        exemplos: [],
      };
      continue;
    }

    if (currentCategory === 'Observacoes Finais' && trimmed.startsWith('- ')) {
      notes.push(trimmed.replace(/^-+\s*/, ''));
      continue;
    }

    if (!current || !trimmed.startsWith('- **')) {
      continue;
    }

    const match = trimmed.match(/^- \*\*(.+?)\*\*:\s*(.*)$/);
    if (!match) continue;

    const label = match[1].toLowerCase();
    const value = match[2].replace(/`/g, '').trim();

    switch (label) {
      case 'capacidades':
        current.capacidades = value;
        break;
      case 'momento ideal':
        current.momentoIdeal = value;
        break;
      case 'exemplo de momento':
        current.exemploMomento = value;
        break;
      case 'tipo de saida':
        current.tipoSaida = value;
        break;
      case 'exemplos':
        current.exemplos = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        break;
      default:
        break;
    }
  }

  pushCurrent();

  return {
    commands: Array.from(commandsMap.values()),
    notes,
  };
}

async function loadCommandsSummary() {
  const raw = await fs.readFile(SUMMARY_PATH, 'utf-8');
  const parsed = parseCommandsSummary(raw);
  return { raw, ...parsed };
}

async function readCommandFiles() {
  const files = await fs.readdir(COMMANDS_DIR);
  const entries = await Promise.all(
    files
      .filter(
        (file) =>
          file.endsWith('.md') &&
          file.toLowerCase() !== 'commands-raiox.md' &&
          file.toLowerCase() !== 'readme.md',
      )
      .map(async (file) => {
        const path = join(COMMANDS_DIR, file);
        const content = await fs.readFile(path, 'utf-8');
        return [file.toLowerCase(), { path, content }];
      }),
  );

  return new Map(entries);
}

function replaceAutoSection(raw, sectionContent) {
  const trimmedRaw = raw.trimEnd();
  const headingIndex = trimmedRaw.indexOf(AUTO_CATEGORY_HEADING);

  if (headingIndex === -1) {
    const separator = trimmedRaw ? '\n\n' : '';
    return `${trimmedRaw}${separator}${sectionContent}`.trimEnd() + '\n';
  }

  const afterHeading = trimmedRaw.slice(
    headingIndex + AUTO_CATEGORY_HEADING.length,
  );
  const nextHeadingMatch = afterHeading.match(/\n##\s+/);

  if (nextHeadingMatch) {
    const nextHeadingIndex =
      headingIndex + AUTO_CATEGORY_HEADING.length + nextHeadingMatch.index;
    const before = trimmedRaw.slice(0, headingIndex).trimEnd();
    const after = trimmedRaw.slice(nextHeadingIndex).trimStart();
    const separatorBefore = before ? '\n\n' : '';
    const separatorAfter = after ? '\n\n' : '';
    return `${before}${separatorBefore}${sectionContent.trimEnd()}${
      separatorAfter ? `${separatorAfter}${after}` : ''
    }\n`;
  }

  const before = trimmedRaw.slice(0, headingIndex).trimEnd();
  const separator = before ? '\n\n' : '';
  return `${before}${separator}${sectionContent.trimEnd()}\n`;
}

async function ensureSummaryCoverage(summary, fileMap) {
  const allSummaryCommands = new Set(
    summary.commands.map((item) => item.command),
  );
  const autoCategoryCommands = new Set(
    summary.commands
      .filter((item) => item.category === AUTO_CATEGORY_NAME)
      .map((item) => item.command),
  );

  const commandsNeedingAuto = new Set(autoCategoryCommands);

  for (const [fileName] of fileMap) {
    const baseName = fileName.replace(/\.md$/i, '');
    const command = deriveCommandFromFile(baseName);
    if (!command) continue;
    if (!allSummaryCommands.has(command) || autoCategoryCommands.has(command)) {
      commandsNeedingAuto.add(command);
    }
  }

  if (commandsNeedingAuto.size === 0) {
    return { updated: false };
  }

  const autoEntries = Array.from(commandsNeedingAuto)
    .sort()
    .map((command) => {
      const slug = slugifyCommandName(command);
      const fileName = slug ? `${slug}.md` : null;
      const fileEntry = fileName
        ? fileMap.get(fileName.toLowerCase())
        : undefined;
      if (!fileEntry) {
        return null;
      }
      const { attributes, body } = extractFrontMatter(fileEntry.content);
      const metadata = {
        description: attributes?.description,
        argumentHint: attributes?.['argument-hint'],
        title: extractPrimaryHeading(body),
      };
      return buildAutoSummaryEntry(command, metadata);
    })
    .filter(Boolean);

  if (autoEntries.length === 0) {
    return { updated: false };
  }

  const autoSectionContent = `${AUTO_CATEGORY_HEADING}\n\n${AUTO_HEADING_NOTICE}\n\n${autoEntries.join(
    '\n\n',
  )}`;

  const newSummaryContent = replaceAutoSection(
    summary.raw,
    `${autoSectionContent}\n`,
  );

  if (newSummaryContent === summary.raw) {
    return { updated: false };
  }

  await fs.writeFile(SUMMARY_PATH, newSummaryContent, 'utf-8');

  console.log(
    `ℹ️  Seção automática sincronizada: ${Array.from(commandsNeedingAuto).join(
      ', ',
    )}`,
  );

  return { updated: true };
}

function enrichCommands(summary, fileMap) {
  return summary.commands.map((record) => {
    const slug = slugifyCommandName(record.command);
    const fileName = slug ? `${slug}.md` : undefined;
    const fileEntry = fileName ? fileMap.get(fileName.toLowerCase()) : null;

    const cleanedContent = stripFrontMatter(fileEntry?.content);

    return {
      ...record,
      fileName,
      filePath: fileName ? `.claude/commands/${fileName}` : undefined,
      fileContent: cleanedContent,
      tags: COMMAND_TAGS[record.command] ?? [slug],
    };
  });
}

async function buildDatabase(summary, fileMap) {
  const enrichedCommands = enrichCommands(summary, fileMap);

  return {
    updatedAt: new Date().toISOString(),
    commands: enrichedCommands.sort((a, b) =>
      a.command.localeCompare(b.command),
    ),
    notes: summary.notes,
  };
}

async function main() {
  const fileMap = await readCommandFiles();
  let summary = await loadCommandsSummary();

  const { updated } = await ensureSummaryCoverage(summary, fileMap);
  if (updated) {
    summary = await loadCommandsSummary();
  }

  const database = await buildDatabase(summary, fileMap);

  await fs.mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(database, null, 2),
    'utf-8',
  );

  console.log(`✅ Banco de dados gerado em ${OUTPUT_PATH}`);
  console.log(`   Total de comandos: ${database.commands.length}`);
}

main().catch((error) => {
  console.error('❌ Erro ao gerar banco de dados de comandos:', error);
  process.exit(1);
});
