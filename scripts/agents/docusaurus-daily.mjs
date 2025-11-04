#!/usr/bin/env node
// TradingSystem – Docusaurus Daily Agent (local, no external APIs)
// - Analyzes repo changes since local midnight
// - Optionally summarizes diffs using a local Ollama model
// - Generates a daily MDX report under docs/content/reports/daily
// - Validates docs frontmatter

import {execSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync, rmSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';

const ROOT = process.cwd();
const MAPPING_PATH = join(ROOT, 'docs', 'governance', 'CODE-DOCS-MAPPING.json');
const SEVERITY_WEIGHTS = {critical: 4, high: 3, medium: 2, low: 1};
const SEVERITY_HEADERS = {
  critical: 'Critical Updates',
  high: 'High Priority Updates',
  medium: 'Medium Priority Updates',
  low: 'Low Priority Updates'
};
const DEFAULT_OWNER = 'DocsOps';
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no', 'n', '']);

const GPU_FORCE = readBool('LLAMAINDEX_FORCE_GPU', true);
const GPU_NUM = Number(process.env.LLAMAINDEX_GPU_NUM || process.env.OLLAMA_NUM_GPU || '1');
const GPU_MAX_CONCURRENCY = Number(process.env.LLAMAINDEX_GPU_MAX_CONCURRENCY || process.env.OLLAMA_GPU_MAX_CONCURRENCY || '1');
const GPU_LOCK_PATH = process.env.LLAMAINDEX_GPU_LOCK_PATH || '/tmp/llamaindex-gpu.lock';
const GPU_LOCK_ENABLED = readBool('LLAMAINDEX_GPU_USE_FILE_LOCK', true) && GPU_MAX_CONCURRENCY === 1;
const GPU_LOCK_POLL_MS = Number(process.env.LLAMAINDEX_GPU_LOCK_POLL_SECONDS || '0.25') * 1000;

function parseArgs(argv) {
  const args = {
    since: null,
    baseRef: null,
    dry: false,
    model: null,
    maxContext: null,
    noValidate: false,
    outDir: null,
    checkSync: false,
    createPr: false,
    severityThreshold: 'low'
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = i + 1 < argv.length ? argv[i+1] : undefined;
    if (a === '--since' && next) { args.since = next; i++; continue; }
    if (a === '--base-ref' && next) { args.baseRef = next; i++; continue; }
    if (a === '--dry') { args.dry = true; continue; }
    if (a === '--model' && next) { args.model = next; i++; continue; }
    if (a === '--maxContext' && next) { args.maxContext = Number(next); i++; continue; }
    if (a === '--noValidate') { args.noValidate = true; continue; }
    if (a === '--outDir' && next) { args.outDir = next; i++; continue; }
    if (a === '--check-sync') { args.checkSync = true; continue; }
    if (a === '--create-pr') { args.createPr = true; continue; }
    if (a === '--severity-threshold' && next) {
      args.severityThreshold = next.toLowerCase();
      i++;
      continue;
    }
  }
  return args;
}

function sh(cmd) {
  return execSync(cmd, {stdio: ['ignore', 'pipe', 'pipe']}).toString().trim();
}

function getLocalMidnightISO() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} 00:00`;
}

function getBaseRefSince(midnight) {
  try {
    const ref = sh(`git rev-list -1 --before="${midnight}" HEAD`);
    if (ref) return ref;
  } catch {}
  try {
    return sh('git rev-parse HEAD~1');
  } catch {
    return '';
  }
}

function listChanges(baseRef) {
  if (!baseRef) return {files: [], diff: '', log: ''};
  const files = sh(`git diff --name-status ${baseRef}..HEAD || true`);
  const diff = sh(`git diff --unified=0 ${baseRef}..HEAD || true`);
  const midnight = getLocalMidnightISO();
  const log = sh(`git log --since="${midnight}" --pretty=format:"%h %ad %s" --date=short || true`);
  return {files, diff, log};
}

function readBool(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return !FALSE_VALUES.has(String(raw).trim().toLowerCase());
}

function readOptionalBool(name, fallback) {
  const raw = process.env[name] ?? (fallback ? process.env[fallback] : undefined);
  if (raw === undefined) return undefined;
  return !FALSE_VALUES.has(String(raw).trim().toLowerCase());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withGpuLock(operation, fn) {
  if (!GPU_LOCK_ENABLED) {
    return fn();
  }
  const ownerId = `${process.pid}-${Date.now()}-${operation}`;
  const ownerFile = join(GPU_LOCK_PATH, 'owner');
  while (true) {
    try {
      mkdirSync(GPU_LOCK_PATH);
      writeFileSync(ownerFile, ownerId, 'utf8');
      break;
    } catch (err) {
      if (err && err.code === 'EEXIST') {
        await sleep(GPU_LOCK_POLL_MS);
        continue;
      }
      throw err;
    }
  }
  try {
    return await fn();
  } finally {
    try { rmSync(ownerFile, {force: true}); } catch {}
    try { rmSync(GPU_LOCK_PATH, {recursive: true, force: true}); } catch {}
  }
}

function buildOllamaOptions() {
  if (!GPU_FORCE) return {};
  const options = { num_gpu: GPU_NUM };
  const gpuLayers = process.env.LLAMAINDEX_GPU_LAYERS || process.env.OLLAMA_GPU_LAYERS;
  if (gpuLayers) {
    const parsed = Number(gpuLayers);
    options.gpu_layers = Number.isNaN(parsed) ? gpuLayers : parsed;
  }
  const gpuSplit = process.env.LLAMAINDEX_GPU_SPLIT || process.env.OLLAMA_GPU_SPLIT;
  if (gpuSplit) options.gpu_split = gpuSplit;
  const mainGpu = process.env.LLAMAINDEX_GPU_MAIN || process.env.OLLAMA_MAIN_GPU;
  if (mainGpu) {
    const parsed = Number(mainGpu);
    options.main_gpu = Number.isNaN(parsed) ? mainGpu : parsed;
  }
  const lowVram = readOptionalBool('LLAMAINDEX_GPU_LOW_VRAM', 'OLLAMA_LOW_VRAM');
  if (lowVram !== undefined) options.low_vram = lowVram;
  return options;
}

function normalizeSeverity(raw) {
  const value = String(raw || '').toLowerCase();
  return SEVERITY_WEIGHTS[value] ? value : 'medium';
}

function normalizeOwner(owner) {
  if (!owner) return DEFAULT_OWNER;
  return owner.startsWith('@') ? owner.slice(1) : owner;
}

function normalizeThreshold(raw) {
  const value = String(raw || '').toLowerCase();
  return SEVERITY_WEIGHTS[value] ? value : 'low';
}

function loadMapping() {
  try {
    if (!existsSync(MAPPING_PATH)) {
      console.warn(`[docusaurus-daily] Mapping file not found at ${MAPPING_PATH}.`);
      return null;
    }
    const content = readFileSync(MAPPING_PATH, 'utf8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed?.mappings)) {
      console.warn('[docusaurus-daily] Mapping file missing "mappings" array.');
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('[docusaurus-daily] Failed to load mapping configuration:', err.message);
    return null;
  }
}

function parseNameStatus(text) {
  if (!text) return [];
  return text.split('\n').filter(Boolean).map((line) => {
    const parts = line.trim().split(/\s+/);
    const status = parts.shift() || '';
    const previousPath = parts.length > 1 ? parts[0] : null;
    const path = parts[parts.length - 1] || '';
    return {status, path, previousPath};
  });
}

function parseDiffByFile(diffText) {
  const map = new Map();
  if (!diffText) return map;
  const lines = diffText.split('\n');
  let currentFile = null;
  let buffer = [];
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (currentFile && buffer.length) {
        map.set(currentFile, buffer.join('\n'));
      }
      buffer = [line];
      const parts = line.split(' ');
      const aPath = parts[2]?.replace(/^a\//, '');
      const bPath = parts[3]?.replace(/^b\//, '');
      currentFile = bPath && bPath !== '/dev/null' ? bPath : (aPath && aPath !== '/dev/null' ? aPath : null);
      continue;
    }
    if (buffer.length) buffer.push(line);
  }
  if (currentFile && buffer.length) {
    map.set(currentFile, buffer.join('\n'));
  }
  return map;
}

function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAnyPattern(filePath, patterns, cache) {
  if (!patterns?.length) return false;
  const compiled = cache.get(patterns) || patterns.map(globToRegExp);
  if (!cache.has(patterns)) cache.set(patterns, compiled);
  return compiled.some((regex) => regex.test(filePath));
}

function findTriggersInDiff(triggers, diffText) {
  if (!triggers?.length || !diffText) return [];
  const lowerDiff = diffText.toLowerCase();
  return triggers.filter((trigger) => lowerDiff.includes(String(trigger).toLowerCase()));
}

function detectApiChanges(filePath, diffText) {
  if (!diffText) return null;
  const regex = /^\+\s*(?:router|app)\.(get|post|put|delete|patch|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gmi;
  const endpoints = [];
  let match;
  while ((match = regex.exec(diffText))) {
    endpoints.push({method: match[1].toUpperCase(), path: match[2]});
  }
  if (!endpoints.length) return null;
  return {type: 'api-route', endpoints};
}

function detectSchemaChanges(filePath, diffText) {
  if (!diffText) return null;
  const tables = [];
  const lines = diffText.split('\n');
  let currentTable = null;
  let inHunk = false;

  const normalizeName = (value) => (value || '').replace(/["`]/g, '');

  for (const rawLine of lines) {
    if (rawLine.startsWith('@@')) {
      currentTable = null;
      inHunk = true;
      continue;
    }
    if (!inHunk) continue;
    if (!rawLine || rawLine.startsWith('diff ') || rawLine.startsWith('index ') || rawLine.startsWith('---') || rawLine.startsWith('+++')) {
      continue;
    }

    const prefix = rawLine[0];
    const line = rawLine.replace(/^[ +-]/, '').trim();
    if (!line) continue;

    const createMatch = line.match(/^(CREATE TABLE)\s+["`]?([\w."]+)["`]?/i);
    if (createMatch) {
      currentTable = normalizeName(createMatch[2]);
      if (prefix === '+') {
        tables.push({operation: 'CREATE TABLE', name: currentTable});
      }
      continue;
    }

    const alterMatch = line.match(/^(ALTER TABLE)\s+["`]?([\w."]+)["`]?/i);
    if (alterMatch) {
      currentTable = normalizeName(alterMatch[2]);
      if (prefix === '+') {
        tables.push({operation: 'ALTER TABLE', name: currentTable});
      }
      continue;
    }

    if (prefix !== '+') continue;

    const addColMatch = line.match(/^(ADD\s+COLUMN)(?:\s+IF\s+NOT\s+EXISTS)?\s+["`]?([\w"]+)["`]?/i);
    if (addColMatch) {
      const column = normalizeName(addColMatch[2]);
      const scope = currentTable ? `${currentTable}.${column}` : column;
      tables.push({operation: 'ADD COLUMN', name: scope});
      continue;
    }

    const dropColMatch = line.match(/^(DROP\s+COLUMN)(?:\s+IF\s+EXISTS)?\s+["`]?([\w"]+)["`]?/i);
    if (dropColMatch) {
      const column = normalizeName(dropColMatch[2]);
      const scope = currentTable ? `${currentTable}.${column}` : column;
      tables.push({operation: 'DROP COLUMN', name: scope});
      continue;
    }
  }

  if (!tables.length) return null;
  return {type: 'database-schema', tables};
}

function detectVersionChanges(filePath, diffText) {
  if (!diffText) return null;
  const removed = diffText.match(/^-.*"version"\s*:\s*"([^"]+)"/m);
  const added = diffText.match(/^\+.*"version"\s*:\s*"([^"]+)"/m);
  if (!removed && !added) return null;
  return {
    type: 'version-bump',
    oldVersion: removed?.[1] || null,
    newVersion: added?.[1] || null
  };
}

function detectEnvChanges(filePath, diffText) {
  if (!diffText) return null;
  const envVars = new Set();
  const regexProcess = /^\+.*process\.env\.([A-Z0-9_]+)/gm;
  const regexEnvFile = /^\+([A-Z0-9_]+)=/gm;
  let match;
  while ((match = regexProcess.exec(diffText))) {
    envVars.add(match[1]);
  }
  while ((match = regexEnvFile.exec(diffText))) {
    envVars.add(match[1]);
  }
  if (!envVars.size) return null;
  return {
    type: 'env-config',
    variables: Array.from(envVars)
  };
}

function detectOpenApiChanges(filePath, diffText) {
  if (!diffText) return null;
  const newPaths = [];
  const pathRegex = /^\+\s+\/[A-Za-z0-9_\-{}\/]+:/gm;
  let match;
  while ((match = pathRegex.exec(diffText))) {
    const normalized = match[0].replace(/^\+\s+/, '').replace(/:$/, '');
    if (normalized) newPaths.push(normalized);
  }
  const schemaRegex = /^\+\s+[A-Za-z0-9_.-]+\s*:\s*$/gm;
  const schemas = [];
  while ((match = schemaRegex.exec(diffText))) {
    const name = match[0].replace(/^\+\s+/, '').replace(/:\s*$/, '');
    if (name && name !== 'paths' && name !== 'components' && !name.startsWith('/')) {
      schemas.push(name);
    }
  }
  const version = detectVersionChanges(filePath, diffText);
  if (!newPaths.length && !schemas.length && !version) return null;
  return {
    type: 'openapi-spec',
    paths: newPaths,
    schemas,
    version: version ? {oldVersion: version.oldVersion, newVersion: version.newVersion} : null
  };
}

function detectChangeDetails(mappingType, filePath, diffText) {
  switch (mappingType) {
    case 'backend-api':
      return detectApiChanges(filePath, diffText);
    case 'database-schema':
      return detectSchemaChanges(filePath, diffText);
    case 'package-version':
      return detectVersionChanges(filePath, diffText);
    case 'env-config':
      return detectEnvChanges(filePath, diffText);
    case 'openapi-spec':
      return detectOpenApiChanges(filePath, diffText);
    default:
      return null;
  }
}

function analyzeCodeChanges(changedFiles, diffByFile, mappingConfig) {
  if (!mappingConfig?.mappings?.length) return [];
  const results = [];
  const matcherCache = new Map();

  for (const mapping of mappingConfig.mappings) {
    const sourceType = mapping?.source?.type;
    const patterns = mapping?.source?.paths || [];
    const triggers = mapping?.source?.triggers || [];
    const severity = normalizeSeverity(mapping?.severity);
    const owner = normalizeOwner(mapping?.owner);
    const autoUpdate = Boolean(mapping?.autoUpdate);
    const targets = Array.isArray(mapping?.targets) ? mapping.targets : [];
    if (!patterns.length || !targets.length) continue;

    for (const file of changedFiles) {
      if (!file.path) continue;
      if (!matchesAnyPattern(file.path, patterns, matcherCache)) continue;
      const diffText =
        diffByFile.get(file.path) ||
        (file.previousPath ? diffByFile.get(file.previousPath) : undefined) ||
        diffByFile.get(file.path.replace(/^.\//, ''));
      const triggersDetected = findTriggersInDiff(triggers, diffText);
      const details = detectChangeDetails(sourceType, file.path, diffText);

      if (!triggers.length && !details && !diffText) {
        continue;
      }
      if (triggers.length && !triggersDetected.length && !details) {
        continue;
      }

      results.push({
        mappingId: mapping.id || `${sourceType || 'unknown'}:${file.path}`,
        sourceFile: file.path,
        previousPath: file.previousPath,
        severity,
        owner,
        targets,
        sourceType,
        triggersDetected,
        details,
        autoUpdate
      });
    }
  }

  return results;
}

function filterChangesBySeverity(changes, threshold) {
  const normalizedThreshold = normalizeThreshold(threshold);
  const minWeight = SEVERITY_WEIGHTS[normalizedThreshold];
  return changes.filter((change) => {
    const weight = SEVERITY_WEIGHTS[normalizeSeverity(change.severity)];
    return weight >= minWeight;
  });
}

function formatSuggestionDescription(change) {
  const details = change.details;
  if (details?.type === 'api-route' && Array.isArray(details.endpoints) && details.endpoints.length) {
    const endpoints = details.endpoints.map((ep) => `${ep.method} ${ep.path}`).join(', ');
    return `Document new endpoint(s): ${endpoints} (source: \`${change.sourceFile}\`)`;
  }
  if (details?.type === 'database-schema' && Array.isArray(details.tables) && details.tables.length) {
    const tables = details.tables.map((tb) => `${tb.operation} ${tb.name}`).join(', ');
    return `Describe database change(s): ${tables} (source: \`${change.sourceFile}\`)`;
  }
  if (details?.type === 'version-bump') {
    const {oldVersion, newVersion} = details;
    if (oldVersion && newVersion) {
      return `Update version reference from ${oldVersion} to ${newVersion} (source: \`${change.sourceFile}\`)`;
    }
    if (newVersion) {
      return `Document new version ${newVersion} (source: \`${change.sourceFile}\`)`;
    }
  }
  if (details?.type === 'env-config' && Array.isArray(details.variables) && details.variables.length) {
    const list = details.variables.join(', ');
    return `Add environment variable documentation for ${list} (source: \`${change.sourceFile}\`)`;
  }
  if (Array.isArray(change.triggersDetected) && change.triggersDetected.length) {
    return `Review updates triggered by ${change.triggersDetected.join(', ')} (source: \`${change.sourceFile}\`)`;
  }
  return `Review recent updates in \`${change.sourceFile}\` for documentation impact`;
}

function generateDocUpdateSuggestions(changes) {
  const severityBuckets = {critical: [], high: [], medium: [], low: []};
  const counts = {critical: 0, high: 0, medium: 0, low: 0};
  const flatItems = [];

  for (const change of changes) {
    const severity = normalizeSeverity(change.severity);
    const description = formatSuggestionDescription(change);
    let added = false;
    for (const target of change.targets) {
      if (!target?.path) continue;
      const sections = Array.isArray(target.sections) ? target.sections : [];
      const item = {
        severity,
        targetFile: target.path,
        sections,
        owner: change.owner,
        description,
        mappingId: change.mappingId,
        sourceFile: change.sourceFile,
        changeType: change.details?.type || change.sourceType || 'unknown',
        autoUpdate: change.autoUpdate
      };
      severityBuckets[severity].push(item);
      flatItems.push(item);
      added = true;
    }
    if (added) counts[severity] += 1;
  }

  for (const key of Object.keys(severityBuckets)) {
    severityBuckets[key].sort((a, b) => {
      const targetCmp = (a.targetFile || '').localeCompare(b.targetFile || '');
      if (targetCmp !== 0) return targetCmp;
      return (a.description || '').localeCompare(b.description || '');
    });
  }

  const totalItems = flatItems.length;
  return {severityBuckets, counts, totalItems, items: flatItems};
}

function createEmptySuggestions() {
  return {
    severityBuckets: {critical: [], high: [], medium: [], low: []},
    counts: {critical: 0, high: 0, medium: 0, low: 0},
    totalItems: 0,
    items: []
  };
}

function renderDocUpdateSection(suggestions, {mappingAvailable} = {}) {
  let section = '## 📝 Documentation Updates Required\n\n';
  if (!mappingAvailable) {
    section += '_Mapping configuration not found. Sync analysis skipped._';
    return section;
  }
  if (!suggestions || !suggestions.totalItems) {
    section += '✅ No documentation updates required today.';
    return section;
  }
  for (const severity of ['critical', 'high', 'medium', 'low']) {
    const items = suggestions.severityBuckets[severity];
    if (!items?.length) continue;
    section += `### ${SEVERITY_HEADERS[severity]}\n`;
    for (const item of items) {
      const sectionsLabel = item.sections?.length ? ` (sections: ${item.sections.join(', ')})` : '';
      const ownerLabel = item.owner ? ` — Owner: @${item.owner}` : '';
      section += `- [ ] Update \`${item.targetFile}\`${sectionsLabel} — ${item.description}${ownerLabel}\n`;
    }
    section += '\n';
  }
  return section.trimEnd();
}

function buildSyncReport({changes, suggestions, threshold, metadata}) {
  return {
    generatedAt: new Date().toISOString(),
    severityThreshold: normalizeThreshold(threshold),
    totalViolations: suggestions?.totalItems || 0,
    counts: suggestions?.counts || {critical: 0, high: 0, medium: 0, low: 0},
    items: suggestions?.items || [],
    changes,
    metadata
  };
}

function printSyncSummary(suggestions) {
  if (!suggestions || !suggestions.totalItems) {
    console.log('✅ No documentation updates required.');
    return;
  }
  console.log('⚠️ Documentation updates required:');
  for (const severity of ['critical', 'high', 'medium', 'low']) {
    const items = suggestions.severityBuckets[severity];
    if (!items?.length) continue;
    console.log(`\n${SEVERITY_HEADERS[severity]} (${items.length})`);
    for (const item of items) {
      const sections = item.sections?.length ? ` [sections: ${item.sections.join(', ')}]` : '';
      const owner = item.owner ? ` (Owner: @${item.owner})` : '';
      console.log(`- ${item.targetFile}${sections} → ${item.description}${owner}`);
    }
  }
}

async function summarizeWithOllama({diff, files, log, modelOverride, maxContextOverride}) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = modelOverride || process.env.DOCS_AGENT_MODEL || 'llama3.1:8b';
  const maxChars = Number(maxContextOverride || process.env.DOCS_AGENT_MAX_CONTEXT || '20000');

  const context = [
    'Changed files (name-status):\n', files, '\n\nCommits (since midnight):\n', log,
    '\n\nUnified diff (truncated):\n', diff.slice(0, maxChars)
  ].join('');

  const prompt = `You are a technical writer agent. Summarize today's code changes into a concise developer-facing changelog in Markdown.\n\nGuidelines:\n- Organize by domain: Frontend, Backend, Docs, Tools/Infra\n- For each domain, list 3-7 key changes with short bullets\n- Highlight breaking changes, new env vars, new scripts, and docs-impact\n- Keep it factual. Use file paths for precision.\n- Output ONLY Markdown content (no extra commentary).\n\nContext:\n${context}`;

  try {
    const payload = {model, prompt, stream: false};
    const ollamaOptions = buildOllamaOptions();
    if (Object.keys(ollamaOptions).length) payload.options = ollamaOptions;

    const text = await withGpuLock('docusaurus-daily', async () => {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`ollama http ${res.status}`);
      const data = await res.json();
      const content = data.response || data.text || '';
      if (!content) throw new Error('empty ollama response');
      return content;
    });

    return text;
  } catch (err) {
    // Fallback summary
    const fallback = [
      '### Summary (No local LLM available)\n',
      '- Local Ollama not reachable. Falling back to raw change list.\n',
      '#### Changed files\n',
      '```\n', files, '\n```\n',
      '#### Commits\n',
      '```\n', log, '\n```\n'
    ].join('');
    return fallback;
  }
}

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, {recursive: true});
}

async function main() {
  const cli = parseArgs(process.argv);
  cli.severityThreshold = normalizeThreshold(cli.severityThreshold);

  const since = cli.since || getLocalMidnightISO();
  const baseRef = cli.baseRef || getBaseRefSince(since);
  const {files, diff, log} = listChanges(baseRef);
  const changedFiles = parseNameStatus(files);
  const diffByFile = parseDiffByFile(diff);
  const mapping = loadMapping();
  const analyzedChanges = mapping ? analyzeCodeChanges(changedFiles, diffByFile, mapping) : [];
  const filteredChanges = filterChangesBySeverity(analyzedChanges, cli.severityThreshold);
  const suggestions = mapping ? generateDocUpdateSuggestions(filteredChanges) : createEmptySuggestions();
  const metadata = {baseRef, since, changedFiles: changedFiles.length};

  if (cli.checkSync) {
    printSyncSummary(suggestions);
    const outDir = cli.outDir ? join(ROOT, cli.outDir) : null;
    if (outDir) {
      ensureDir(outDir);
      const reportPath = join(outDir, 'sync-report.json');
      const summaryPath = join(outDir, 'sync-summary.md');
      const report = buildSyncReport({changes: filteredChanges, suggestions, threshold: cli.severityThreshold, metadata: {...metadata, mappingAvailable: Boolean(mapping)}});
      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      const summaryMarkdown = renderDocUpdateSection(suggestions, {mappingAvailable: Boolean(mapping)});
      writeFileSync(summaryPath, `${summaryMarkdown}\n`, 'utf8');
      console.log(`[docusaurus-daily] Sync report written to ${reportPath}`);
      console.log(`[docusaurus-daily] Summary written to ${summaryPath}`);
    }
    return;
  }

  const dateObj = new Date();
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Prepare MDX content
  const summary = await summarizeWithOllama({diff, files, log, modelOverride: cli.model, maxContextOverride: cli.maxContext});
  const title = `Daily Updates – ${dateStr}`;
  const frontmatter = `---\n` +
    `title: ${title}\n` +
    `description: Daily summary of code changes and docs impact for ${dateStr}.\n` +
    `tags: [automation, daily, changelog]\n` +
    `owner: DocsOps\n` +
    `lastReviewed: '${dateStr}'\n` +
    `---\n`;

  const docSection = renderDocUpdateSection(suggestions, {mappingAvailable: Boolean(mapping)});

  const body = [
    frontmatter,
    `\n> Generated by Docusaurus Daily Agent (local).\n\n`,
    summary,
    '\n\n',
    docSection,
    '\n\n',
    '#### Raw changes (name-status)\n',
    '```\n', files || 'No changes detected.', '\n```\n'
  ].join('');

  const outDir = cli.outDir ? join(ROOT, cli.outDir) : join(ROOT, 'docs', 'content', 'reports', 'daily');
  ensureDir(outDir);
  const outFile = join(outDir, `${dateStr}.mdx`);
  if (!cli.dry) writeFileSync(outFile, body, 'utf8');

  // Ensure categories for sidebar
  const catReports = join(ROOT, 'docs', 'content', 'reports', '_category_.json');
  const catDaily = join(outDir, '_category_.json');
  if (!existsSync(catReports)) {
    writeFileSync(catReports, JSON.stringify({
      label: 'Reports', position: 50, collapsed: false, link: {
        type: 'generated-index', title: 'Automation Reports', slug: '/reports'
      }
    }, null, 2));
  }
  if (!existsSync(catDaily)) {
    writeFileSync(catDaily, JSON.stringify({
      label: 'Daily Updates', position: 1, collapsed: true
    }, null, 2));
  }

  // Validate docs frontmatter (v2 schema)
  if (!cli.noValidate) {
    try {
      sh('python3 -c "import yaml" 2>/dev/null')
      sh('python3 scripts/docs/validate-frontmatter.py --docs-dir ./docs/content --schema v2');
      console.log(`Daily report generated at: ${outFile}`);
    } catch (e) {
      console.warn('Frontmatter validation skipped or reported issues (PyYAML missing or errors).');
      console.warn('Tip: install PyYAML or run npm run validate-docs later.');
      console.log(`Daily report generated at: ${outFile}`);
    }
  } else {
    console.log(`Daily report generated at: ${outFile}`);
  }

  if (cli.createPr) {
    if (cli.dry) {
      console.warn('[docusaurus-daily] --create-pr ignored during --dry run.');
    } else if (!suggestions.totalItems) {
      console.log('[docusaurus-daily] No documentation updates detected. Skipping PR creation.');
    } else {
      const scriptPath = join(ROOT, 'scripts', 'docs', 'create-sync-pr.sh');
      if (!existsSync(scriptPath)) {
        console.warn(`[docusaurus-daily] PR script not found at ${scriptPath}.`);
      } else {
        try {
          const cmd = `bash ${JSON.stringify(scriptPath)} --report-file ${JSON.stringify(outFile)}`;
          sh(cmd);
        } catch (err) {
          console.error('[docusaurus-daily] Failed to create documentation sync PR:', err.message);
        }
      }
    }
  }

  if (suggestions.totalItems) {
    printSyncSummary(suggestions);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
