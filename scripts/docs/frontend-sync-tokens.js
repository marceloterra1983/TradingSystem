import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createHash} from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const docsRoot = path.join(repoRoot, 'docs', 'context');
const tokensSourceRoot = path.join(repoRoot, 'frontend', 'tokens');
const tokensDocPath = path.join(docsRoot, 'frontend', 'design-system', 'tokens.mdx');

const START_MARKER = '<!-- FRONTEND_TOKENS:START -->';
const END_MARKER = '<!-- FRONTEND_TOKENS:END -->';

function replaceBetweenMarkers(content, startMarker, endMarker, replacement) {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error(`Start marker ${startMarker} not found`);
  }
  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex === -1) {
    throw new Error(`End marker ${endMarker} not found`);
  }
  const before = content.slice(0, startIndex + startMarker.length);
  const after = content.slice(endIndex);
  return `${before}\n${replacement.trimEnd()}\n${after}`;
}

function flattenTokens(node, parts, accumulator) {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const valueKeys = Object.keys(node);
    if (valueKeys.includes('value')) {
      const tokenName = parts.join('.');
      accumulator.push({
        name: tokenName,
        value: node.value,
        description: node.description ?? '',
      });
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      flattenTokens(value, [...parts, key], accumulator);
    }
  }
}

async function loadTokens() {
  const rows = [];
  const hash = createHash('sha256');
  let files;
  try {
    files = await fs.readdir(tokensSourceRoot);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('⚠️  No frontend/tokens directory found; generating placeholder table');
      return {rows: [], digest: null};
    }
    throw error;
  }

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const filePath = path.join(tokensSourceRoot, file);
    const raw = await fs.readFile(filePath, 'utf8');
    hash.update(raw);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${file}: ${error.message}`);
      continue;
    }
    const category = path.basename(file, '.json');
    const tokens = [];
    flattenTokens(parsed, [], tokens);
    for (const token of tokens) {
      rows.push({
        category,
        name: token.name,
        value: token.value,
        description: token.description || '',
      });
    }
  }

  rows.sort((a, b) => {
    if (a.category === b.category) {
      return a.name.localeCompare(b.name);
    }
    return a.category.localeCompare(b.category);
  });

  return {
    rows,
    digest: rows.length ? hash.digest('hex').slice(0, 16) : null,
  };
}

function renderTable(rows, digest) {
  const header = '## Token Catalogue';
  const tableHeader = '| Category | Name | Value | Description |';
  const separator = '| -------- | ---- | ----- | ----------- |';
  const body = rows.length
    ? rows
        .map((row) => `| ${row.category} | ${row.name} | ${row.value} | ${row.description || '_'} |`)
        .join('\n')
    : '| – | – | – | No tokens detected |';
  const digestLine = digest ? `\n\n_Source digest: ${digest}_` : '';
  return `${header}\n\n${tableHeader}\n${separator}\n${body}${digestLine}`;
}

async function main() {
  try {
    const {rows, digest} = await loadTokens();
    const rendered = renderTable(rows, digest);
    const docContent = await fs.readFile(tokensDocPath, 'utf8');
    const updated = replaceBetweenMarkers(docContent, START_MARKER, END_MARKER, rendered);
    await fs.writeFile(tokensDocPath, `${updated.trimEnd()}\n`, 'utf8');
    console.log('✅ Frontend tokens synchronized');
  } catch (error) {
    console.error(`❌ Failed to sync frontend tokens: ${error.message}`);
    process.exit(1);
  }
}

await main();
