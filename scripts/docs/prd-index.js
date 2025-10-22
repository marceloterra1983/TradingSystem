import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const docsRoot = path.join(repoRoot, 'docs', 'context');
const prdRoot = path.join(docsRoot, 'prd');
const productsRoot = path.join(prdRoot, 'products');
const overviewPath = path.join(prdRoot, 'overview.mdx');

const START_MARKER = '<!-- PRD_INDEX:START -->';
const END_MARKER = '<!-- PRD_INDEX:END -->';

function titleCase(input) {
  return input
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return {};
  }
  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    return {};
  }
  const block = content.slice(3, end).trim();
  const lines = block.split('\n');
  const data = {};
  let currentKey = null;
  for (const rawLine of lines) {
    if (!rawLine.trim()) {
      continue;
    }
    if (/^\s/.test(rawLine)) {
      // Nested key
      const [nestedKey, ...rest] = rawLine.trim().split(':');
      const value = rest.join(':').trim();
      if (currentKey) {
        if (typeof data[currentKey] !== 'object' || data[currentKey] === null) {
          data[currentKey] = {};
        }
        data[currentKey][nestedKey.trim()] = value.replace(/^['"]|['"]$/g, '');
      }
    } else {
      const [key, ...rest] = rawLine.split(':');
      currentKey = key.trim();
      const value = rest.join(':').trim();
      if (value === '') {
        data[currentKey] = {};
      } else {
        data[currentKey] = value.replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return data;
}

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
  const trimmedReplacement = replacement.trimEnd();
  return `${before}\n${trimmedReplacement}\n${after}`;
}

async function collectFeatures(productDir, relativeBase) {
  const entries = await fs.readdir(productDir);
  const features = [];
  for (const entry of entries) {
    if (!entry.endsWith('.mdx') || entry === 'prd-overview.mdx') {
      continue;
    }
    const featurePath = path.join(productDir, entry);
    const content = await fs.readFile(featurePath, 'utf8');
    const fm = parseFrontmatter(content);
    const title = fm.title || titleCase(entry.replace(/\.mdx$/, ''));
    const relative = `${relativeBase}/${entry.replace(/\.mdx$/, '')}.mdx`;
    features.push({title, relative});
  }
  return features;
}

async function buildRows() {
  const rows = [];
  try {
    const productEntries = await fs.readdir(productsRoot, {withFileTypes: true});
    for (const entry of productEntries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const slug = entry.name;
      const productDir = path.join(productsRoot, slug);
      const overviewFile = path.join(productDir, 'prd-overview.mdx');
      let overviewContent;
      try {
        overviewContent = await fs.readFile(overviewFile, 'utf8');
      } catch (error) {
        console.warn(`⚠️ Missing overview for product ${slug}: ${error.message}`);
        continue;
      }
      const fm = parseFrontmatter(overviewContent);
      const productTitle = fm.sidebar_label || fm.title || titleCase(slug);
      const lastUpdated = (fm.last_update && fm.last_update.date) || '—';
      const featureLinks = await collectFeatures(productDir, `./products/${slug}`);
      const featuresCell = featureLinks.length
        ? featureLinks.map((item) => `[${item.title}](${item.relative})`).join('<br />')
        : '_None_';
      const overviewLink = `./products/${slug}/prd-overview.mdx`;
      rows.push({
        productTitle,
        overviewLink,
        featuresCell,
        lastUpdated,
      });
    }
  } catch (error) {
    console.error(`❌ Failed to read product directories: ${error.message}`);
    throw error;
  }

  if (rows.length === 0) {
    rows.push({
      productTitle: '_No products defined_',
      overviewLink: '#',
      featuresCell: '_N/A_',
      lastUpdated: '—',
    });
  }

  return rows;
}

function renderTable(rows) {
  const header = '| Product | Overview | Active Features | Last Updated |';
  const separator = '| ------- | -------- | --------------- | ------------ |';
  const body = rows
    .map((row) => `| ${row.productTitle} | [PRD Overview](${row.overviewLink}) | ${row.featuresCell} | ${row.lastUpdated} |`)
    .join('\n');
  return `${header}\n${separator}\n${body}`;
}

async function main() {
  try {
    const rows = await buildRows();
    const replacement = renderTable(rows);
    const overviewContent = await fs.readFile(overviewPath, 'utf8');
    const updated = replaceBetweenMarkers(overviewContent, START_MARKER, END_MARKER, replacement);
    await fs.writeFile(overviewPath, `${updated.trimEnd()}\n`, 'utf8');
    console.log('✅ PRD index updated');
  } catch (error) {
    console.error(`❌ Failed to update PRD index: ${error.message}`);
    process.exit(1);
  }
}

await main();
