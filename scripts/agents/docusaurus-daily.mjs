#!/usr/bin/env node
// TradingSystem – Docusaurus Daily Agent (local, no external APIs)
// - Analyzes repo changes since local midnight
// - Optionally summarizes diffs using a local Ollama model
// - Generates a daily MDX report under docs/content/reports/daily
// - Validates docs frontmatter

import {execSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {dirname, join} from 'node:path';

const ROOT = process.cwd();
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no', 'n', '']);

const GPU_FORCE = readBool('LLAMAINDEX_FORCE_GPU', true);
const GPU_NUM = Number(process.env.LLAMAINDEX_GPU_NUM || process.env.OLLAMA_NUM_GPU || '1');
const GPU_MAX_CONCURRENCY = Number(process.env.LLAMAINDEX_GPU_MAX_CONCURRENCY || process.env.OLLAMA_GPU_MAX_CONCURRENCY || '1');
const GPU_LOCK_PATH = process.env.LLAMAINDEX_GPU_LOCK_PATH || '/tmp/llamaindex-gpu.lock';
const GPU_LOCK_ENABLED = readBool('LLAMAINDEX_GPU_USE_FILE_LOCK', true) && GPU_MAX_CONCURRENCY === 1;
const GPU_LOCK_POLL_MS = Number(process.env.LLAMAINDEX_GPU_LOCK_POLL_SECONDS || '0.25') * 1000;

function parseArgs(argv) {
  const args = { since: null, dry: false, model: null, maxContext: null, noValidate: false, outDir: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = i + 1 < argv.length ? argv[i+1] : undefined;
    if (a === '--since' && next) { args.since = next; i++; continue; }
    if (a === '--dry') { args.dry = true; continue; }
    if (a === '--model' && next) { args.model = next; i++; continue; }
    if (a === '--maxContext' && next) { args.maxContext = Number(next); i++; continue; }
    if (a === '--noValidate') { args.noValidate = true; continue; }
    if (a === '--outDir' && next) { args.outDir = next; i++; continue; }
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
  const since = cli.since || getLocalMidnightISO();
  const baseRef = getBaseRefSince(since);
  const {files, diff, log} = listChanges(baseRef);

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

  const body = [
    frontmatter,
    `\n> Generated by Docusaurus Daily Agent (local).\n\n`,
    summary,
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
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
