#!/usr/bin/env node

import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, resolve, join} from 'node:path';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_LOGGER = {
  start: (message) => console.log(message),
  step: (message) => process.stdout.write(message),
  endStep: (message) => process.stdout.write(message),
  complete: (message) => console.log(message),
  error: (message, error) => console.error(message, error),
};

const WHITESPACE_TRIM = /^\s+|\s+$/g;

function escapeForRegex(value) {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function deriveEndpointDetails(endpoint = '') {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return {port: '', url: ''};
  }
  const portMatch = trimmed.match(/\b(\d{2,5})\b/);
  const port = portMatch ? portMatch[1] : '';
  const hasProtocol = trimmed.includes('://');
  const looksLikeUrl = hasProtocol || trimmed.startsWith('localhost') || trimmed.startsWith('127.') || trimmed.startsWith('0.0.0.0');
  const url = looksLikeUrl ? trimmed : '';
  return {port, url};
}

function buildTableRow(values) {
  return `| ${values.map((value) => `${value}`.replace(WHITESPACE_TRIM, '').replace(/\|/g, '\\|')).join(' | ')} |`;
}

export async function parseServicePortMap(sourceFilePath, rawContent) {
  try {
    const raw = rawContent ?? await readFile(sourceFilePath, 'utf8');
    const applicationMatch = raw.match(/## Serviços de Aplicação([\s\S]*?)(?=##|$)/);
    const dataMatch = raw.match(/## Dados e Monitoramento([\s\S]*?)(?=##|$)/);

    const parseSection = (section) => {
      if (!section) {
        return [];
      }
      const rows = [];
      const regex = /\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g;
      let match;
      while ((match = regex.exec(section)) !== null) {
        const [service, container, endpoint, description] = match.slice(1).map((cell) => cell.trim());
        const normalizedCells = [service, container, endpoint, description].map((cell) =>
          cell.replace(/\s+/g, ' ').trim().toLowerCase(),
        );
        const isHeaderFirstCell = /(servi[cç]o|service)/i.test(service);
        const headerColumnMatches = [
          normalizedCells[1] === 'container',
          normalizedCells[2] === 'url/porta' || normalizedCells[2] === 'porta/url' || normalizedCells[2] === 'port' || normalizedCells[2] === 'url',
          normalizedCells[3] === 'descrição' || normalizedCells[3] === 'descricao' || normalizedCells[3] === 'description',
        ].some(Boolean);
        const isSeparator = /^-+$/.test(service.replace(/\s+/g, ''));
        if (!service || isHeaderFirstCell || headerColumnMatches || isSeparator) {
          continue;
        }
        rows.push({service, container, endpoint, description});
      }
      return rows;
    };

    return {
      applicationServices: parseSection(applicationMatch && applicationMatch[1]),
      dataServices: parseSection(dataMatch && dataMatch[1]),
    };
  } catch (error) {
    return {
      applicationServices: [],
      dataServices: [],
    };
  }
}

export async function extractTailwindTokens(configFilePath) {
  let colors = {};
  let usedFallback = false;

  try {
    const url = pathToFileURL(configFilePath).href;
    const module = await import(url);
    const config = module.default || module;
    colors = config?.theme?.extend?.colors ?? {};
  } catch (error) {
    usedFallback = true;
    const reason = error && error.message ? error.message : String(error);
    console.warn(`[docs:auto] Failed to import Tailwind config at ${configFilePath}: ${reason}. Falling back to static parse.`);
    colors = await parseTailwindColorsFallback(configFilePath);
  }

  if (!colors || typeof colors !== 'object' || !Object.keys(colors).length) {
    if (usedFallback) {
      console.warn(`[docs:auto] Fallback parser did not yield any Tailwind colors from ${configFilePath}.`);
    }
    return [];
  }

  const tokens = [];

  const walkColors = (prefix, value) => {
    if (typeof value === 'string') {
      tokens.push({
        category: 'color',
        name: prefix,
        value,
        description: describeColorToken(prefix),
      });
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) {
        walkColors(`${prefix}.${key}`, nested);
      }
    }
  };

  for (const [name, value] of Object.entries(colors)) {
    walkColors(name, value);
  }

  return tokens.sort((a, b) => a.name.localeCompare(b.name));
}

async function parseTailwindColorsFallback(configFilePath) {
  try {
    const raw = await readFile(configFilePath, 'utf8');
    const extendBlock = extractObjectLiteral(raw, /extend\s*:/);
    if (!extendBlock) {
      return {};
    }
    const colorsBlock = extractObjectLiteral(extendBlock, /colors\s*:/);
    if (!colorsBlock) {
      return {};
    }
    const parsed = parseJsonLikeObject(colorsBlock);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    console.warn(`[docs:auto] Fallback parser could not extract Tailwind colors from ${configFilePath}.`);
    return {};
  } catch (error) {
    const reason = error && error.message ? error.message : String(error);
    console.warn(`[docs:auto] Tailwind fallback parser failed for ${configFilePath}: ${reason}`);
    return {};
  }
}

function extractObjectLiteral(source, pattern) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  const match = regex.exec(source);
  if (!match) {
    return null;
  }
  const braceStart = source.indexOf('{', match.index + match[0].length);
  if (braceStart === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    const prev = index > 0 ? source[index - 1] : '';

    if (inString) {
      if (char === stringChar && prev !== '\\') {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(braceStart, index + 1);
      }
    }
  }

  return null;
}

function sanitizeObjectLiteral(literal) {
  return literal
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/(^|\n)\s*\.\.\.[^\n]*\n?/g, '\n')
    .replace(/([,{]\s*)([A-Za-z0-9_$-]+)\s*:/g, '$1"$2":')
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
    .replace(/`([^`\\]*(?:\\.[^`\\]*)*)`/g, '"$1"')
    .replace(/,\s*([}\]])/g, '$1');
}

function parseJsonLikeObject(literal) {
  try {
    const sanitized = sanitizeObjectLiteral(literal);
    return JSON.parse(sanitized);
  } catch (error) {
    return null;
  }
}

function describeColorToken(name) {
  if (name.endsWith('.DEFAULT') || !name.includes('.')) {
    return 'Primary brand color';
  }
  if (name.endsWith('.dark')) {
    return 'Dark variant';
  }
  if (name.endsWith('.light')) {
    return 'Light variant';
  }
  const shadeMatch = name.match(/\.([0-9]{2,3})$/);
  if (shadeMatch) {
    return `Shade ${shadeMatch[1]}`;
  }
  return 'Color token';
}

export function generatePortsTable(services) {
  const header = [
    '| Service | Container | Port | URL | Description |',
    '|---------|-----------|------|-----|-------------|',
  ];

  const rows = services.map((service) => {
    const {port, url} = deriveEndpointDetails(service.endpoint);
    return buildTableRow([
      service.service,
      service.container,
      port || 'N/A',
      url || 'N/A',
      service.description,
    ]);
  });

  return [...header, ...rows].join('\n');
}

export function generateTokensTable(tokens) {
  const header = [
    '| Category | Name | Value | Description |',
    '|----------|------|-------|-------------|',
  ];
  const rows = tokens.map((token) => {
    const rawValue = String(token.value);
    const sanitized = rawValue.replace(/^#/, '');
    const isHex = /^[0-9a-fA-F]{3,8}$/.test(sanitized);
    const value = rawValue.startsWith('#') || !isHex ? rawValue : `#${sanitized}`;
    return buildTableRow([
      token.category,
      token.name,
      value,
      token.description,
    ]);
  });
  return [...header, ...rows].join('\n');
}

function replaceBetweenMarkers(content, marker, replacement) {
  const begin = `<!-- BEGIN AUTO-GENERATED: ${marker} -->`;
  const end = `<!-- END AUTO-GENERATED: ${marker} -->`;
  const pattern = new RegExp(`${escapeForRegex(begin)}[\\s\\S]*?${escapeForRegex(end)}`);
  if (!pattern.test(content)) {
    return content;
  }
  return content.replace(pattern, `${begin}\n\n${replacement}\n\n${end}`);
}

function extractCommentValue(content, label) {
  const pattern = new RegExp(`<!-- ${escapeForRegex(label)}(?:\\s*:\\s*(.*?))?-->`);
  const match = pattern.exec(content);
  if (!match) {
    return null;
  }
  return match[1] ? match[1].trim() : '';
}

function removeComment(content, label) {
  const marker = `<!-- ${label}`;
  let result = content;
  let start = result.indexOf(marker);
  while (start !== -1) {
    const end = result.indexOf('-->', start);
    if (end === -1) {
      break;
    }
    let nextIndex = end + 3;
    while (nextIndex < result.length && /\s/.test(result[nextIndex])) {
      nextIndex += 1;
    }
    result = result.slice(0, start) + result.slice(nextIndex);
    start = result.indexOf(marker);
  }
  return result;
}

function upsertComment(content, label, value) {
  const pattern = new RegExp(`<!-- ${escapeForRegex(label)}(?:\\s*:\\s*.*)?-->\\s*`, 'g');
  const suffix = value ? `: ${value}` : '';
  const comment = `<!-- ${label}${suffix} -->`;
  if (pattern.test(content)) {
    const cleaned = content.replace(pattern, '').replace(/^\s*/, '');
    return `${comment}\n${cleaned}`;
  }
  return comment.concat('\n', content);
}

function ensureFrontmatter(content) {
  const regex = /---[\s\S]*?---/;
  const match = regex.exec(content);
  if (match) {
    const restStart = match.index + match[0].length;
    return {
      frontmatter: match[0],
      rest: content.slice(restStart).replace(/^\s*/, ''),
    };
  }
  return {
    frontmatter: '',
    rest: content.trimStart(),
  };
}

async function readFileIfExists(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    return null;
  }
}

export async function runDocsAuto({repoRoot = resolve(__dirname, '..', '..'), logger = DEFAULT_LOGGER} = {}) {
  const docsDir = join(repoRoot, 'docs');
  const referenceDir = join(docsDir, 'content', 'reference');
  const portsPlaceholderFile = join(referenceDir, 'ports.mdx');

  const tasks = [
    {
      name: 'Ensure reference directory exists',
      run: async () => {
        await mkdir(referenceDir, {recursive: true});
      },
    },
    {
      name: 'Seed ports placeholder',
      run: async () => {
        const contents = [
          '---',
          'title: Ports Matrix',
          'description: Service port assignments across TradingSystem.',
          'tags:',
          '  - reference',
          '  - networking',
          'owner: OpsGuild',
          'lastReviewed: TBD',
          '---',
          '',
          '> This file is generated via `npm run docs:auto`. Do not edit manually.',
          '',
        ].join('\n');
        await writeFile(portsPlaceholderFile, contents, 'utf8');
      },
    },
    {
      name: 'Generate ports table from service-port-map.md',
      run: async () => {
        const sourcePath = join(repoRoot, 'docs', 'context', 'ops', 'service-port-map.md');
        const targetPath = join(docsDir, 'content', 'tools', 'ports-services.mdx');
        const timestamp = new Date().toISOString();
        const sourceContent = await readFileIfExists(sourcePath);
        if (!sourceContent) {
          console.warn(`[docs:auto] Skipping ports generation - missing source at ${sourcePath}`);
          return;
        }
        const services = await parseServicePortMap(sourcePath, sourceContent);
        if (!services.applicationServices.length && !services.dataServices.length) {
          console.warn('[docs:auto] Skipping ports generation - no service data parsed.');
          return;
        }
        const existing = await readFileIfExists(targetPath);
        if (!existing) {
          console.warn(`[docs:auto] Skipping ports generation - missing target at ${targetPath}`);
          return;
        }
        const {frontmatter, rest} = ensureFrontmatter(existing);
        const timestampLabel = 'Last generated';
        const sourceLabel = 'Source';
        const automationLabel = 'AUTO-GENERATED SECTIONS by docs:auto - DO NOT EDIT MANUALLY';
        let updated = rest;
        const applicationTable = generatePortsTable(services.applicationServices);
        const dataTable = generatePortsTable(services.dataServices);
        updated = replaceBetweenMarkers(updated, 'Application Services', applicationTable);
        updated = replaceBetweenMarkers(updated, 'Data & Monitoring Services', dataTable);
        let updatedBase = removeComment(removeComment(removeComment(updated, timestampLabel), sourceLabel), automationLabel);
        const timestampToUse = timestamp;
        updated = updatedBase;
        updated = upsertComment(updated, timestampLabel, timestampToUse);
        updated = upsertComment(updated, sourceLabel, 'docs/context/ops/service-port-map.md');
        updated = upsertComment(updated, automationLabel, '');
        updated = updated.replace(
          /> Última geração:\s*[^\n]*/,
          `> Última geração: ${timestampToUse}`,
        );
        const content = [frontmatter, updated].filter(Boolean).join('\n\n').trimEnd().concat('\n');
        await writeFile(targetPath, content, 'utf8');
      },
    },
    {
      name: 'Generate design tokens from tailwind.config.js',
      run: async () => {
        const sourcePath = join(repoRoot, 'frontend', 'dashboard', 'tailwind.config.js');
        const targetPath = join(docsDir, 'content', 'frontend', 'design-system', 'tokens.mdx');
        const timestamp = new Date().toISOString();
        const sourceExists = await readFileIfExists(sourcePath);
        if (!sourceExists) {
          console.warn(`[docs:auto] Skipping token generation - missing source at ${sourcePath}`);
          return;
        }
        const tokens = await extractTailwindTokens(sourcePath);
        if (!tokens.length) {
          console.warn('[docs:auto] Skipping token generation - no tokens parsed from Tailwind config.');
          return;
        }
        const existing = await readFileIfExists(targetPath);
        if (!existing) {
          console.warn(`[docs:auto] Skipping token generation - missing target at ${targetPath}`);
          return;
        }
        const {frontmatter, rest} = ensureFrontmatter(existing);
        const timestampLabel = 'Last generated';
        const sourceLabel = 'Source';
        const automationLabel = 'AUTO-GENERATED by docs:auto - DO NOT EDIT MANUALLY';
        let updated = rest;
        const table = generateTokensTable(tokens);
        updated = replaceBetweenMarkers(updated, 'Token Catalogue', table);
        let updatedBase = removeComment(removeComment(removeComment(updated, timestampLabel), sourceLabel), automationLabel);
        const timestampToUse = timestamp;
        updated = updatedBase;
        updated = upsertComment(updated, timestampLabel, timestampToUse);
        updated = upsertComment(updated, sourceLabel, 'frontend/dashboard/tailwind.config.js');
        updated = upsertComment(updated, automationLabel, '');
        const content = [frontmatter, updated].filter(Boolean).join('\n\n').trimEnd().concat('\n');
        await writeFile(targetPath, content, 'utf8');
      },
    },
    {
      name: 'Update MCP registry with automation status',
      run: async () => {
        const targetPath = join(docsDir, 'content', 'mcp', 'registry.mdx');
        const existing = await readFileIfExists(targetPath);
        if (!existing) {
          return;
        }
        const marker = 'MCP Registry Automation Status';
        const markerBegin = `<!-- BEGIN AUTO-GENERATED: ${marker} -->`;
        const markerEnd = `<!-- END AUTO-GENERATED: ${marker} -->`;
        const automationBlock = [
          '**Automation Hooks**:',
          '- `scripts/docs/mcp-registry-sync.ts` - Generate MCP registry from configuration files **(TODO - blocked)**',
          '- `npm run docs:auto` - Regenerate MCP registry documentation',
          '- Source: `~/.claude.json`, `.claude/mcp-servers.json`',
          '- Target: `docs/content/mcp/registry.mdx` (generated section)',
          '',
          '**Current State**: ⚠️ **TODO** - Automation blocked (MCP config files external to repository)',
          '',
          'MCP server configurations are stored in `~/.claude.json` and `.claude/mcp-servers.json` which are external to the repository (user home directory). Automation cannot access these files without additional setup. Options: (1) Commit sanitized MCP configs to repo under `.claude/` directory, (2) Create MCP config API endpoint, or (3) Keep manual documentation.',
          '',
          '**Future Enhancements**:',
          '- Resolve external config access (commit to repo or create API endpoint)',
          '- Implement `scripts/docs/mcp-registry-sync.ts` once configs accessible',
          '',
          '*Note: This table is manually maintained. Automation pending resolution of external config access.*',
        ].join('\n');

        let updated = existing;
        if (!updated.includes(markerBegin) || !updated.includes(markerEnd)) {
          const insertion = `${markerBegin}\n\n${automationBlock}\n\n${markerEnd}`;
          const headingPattern = /## MCP Server Registry\s*\n?/;
          if (headingPattern.test(updated)) {
            updated = updated.replace(headingPattern, (match) => `${match}\n${insertion}\n\n`);
          } else {
            updated = `${updated.trimEnd()}\n\n${insertion}\n`;
          }
        }

        updated = replaceBetweenMarkers(updated, marker, automationBlock);
        await writeFile(targetPath, updated, 'utf8');
      },
    },
  ];

  logger.start('[docs:auto] Starting automation tasks...');
  for (const task of tasks) {
    logger.step(`- ${task.name}... `);
    try {
      await task.run();
      logger.endStep('done\n');
    } catch (error) {
      logger.endStep('skipped\n');
      logger.error(`[docs:auto] Task "${task.name}" failed`, error);
    }
  }
  logger.complete('[docs:auto] Completed generation. Generated: ports table, design tokens. TODO: MCP registry (configs external).');
}

function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }
  const executedPath = resolve(process.argv[1]);
  return import.meta.url === pathToFileURL(executedPath).href;
}

if (isMainModule()) {
  runDocsAuto().catch((error) => {
    DEFAULT_LOGGER.error('[docs:auto] failed with error:', error);
    process.exit(1);
  });
}
