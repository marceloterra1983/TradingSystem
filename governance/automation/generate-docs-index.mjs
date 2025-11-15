#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');
const governanceDir = path.join(repoRoot, 'governance');
const registryPath = path.join(governanceDir, 'registry/registry.json');
const reviewTrackingPath = path.join(
  governanceDir,
  'evidence/review-tracking.csv',
);
const localIndexPath = path.join(governanceDir, 'index.md');
const docsIndexPath = path.join(
  repoRoot,
  'docs/content/governance/index.mdx',
);

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const STATUS_META = {
  healthy: { label: 'Healthy', emoji: '🟢' },
  warning: { label: 'Upcoming', emoji: '🟡' },
  overdue: { label: 'Overdue', emoji: '🔴' },
};

async function ensureDir(targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

function computeStatus(artifact) {
  const today = new Date();
  const lastReviewed = new Date(artifact.lastReviewed);
  if (Number.isNaN(lastReviewed.getTime())) {
    return { code: 'overdue', daysUntilDue: -Infinity };
  }

  const reviewCycleDays = Number(artifact.reviewCycleDays || 90);
  const dueDate = new Date(lastReviewed.getTime() + reviewCycleDays * MS_IN_DAY);
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / MS_IN_DAY);

  if (daysUntilDue < 0) return { code: 'overdue', daysUntilDue };
  if (daysUntilDue <= 15) return { code: 'warning', daysUntilDue };
  return { code: 'healthy', daysUntilDue };
}

function formatTableRow(artifact, status) {
  const meta = STATUS_META[status.code];
  const statusLabel = meta ? `${meta.emoji} ${meta.label}` : status.code;
  const reviewCycle = `${artifact.reviewCycleDays}d`;
  return `| ${artifact.title} | ${artifact.owner} | ${reviewCycle} | ${artifact.lastReviewed} | ${statusLabel} |`;
}

function buildTables(artifacts) {
  const byCategory = artifacts.reduce((acc, artifact) => {
    const key = artifact.category || 'uncategorized';
    acc[key] = acc[key] || [];
    acc[key].push(artifact);
    return acc;
  }, {});

  const sections = Object.entries(byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, list]) => {
      const rows = list
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((artifact) => {
          const status = computeStatus(artifact);
          return formatTableRow(artifact, status);
        })
        .join('\n');

      return [
        `## ${category[0].toUpperCase()}${category.slice(1)}`,
        '| Artifact | Owner | Review Cycle | Last Reviewed | Status |',
        '|----------|-------|--------------|---------------|--------|',
        rows || '| _No entries_ | - | - | - | - |',
      ].join('\n');
    });

  return sections.join('\n\n');
}

function parseCsv(content) {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    return header.reduce((acc, key, idx) => {
      acc[key] = cells[idx] ?? '';
      return acc;
    }, {});
  });
}

function summarizeReviewTracking(records) {
  const statusCounts = new Map();
  const governanceStatusCounts = new Map();

  for (const record of records) {
    if (record.Status) {
      statusCounts.set(
        record.Status,
        (statusCounts.get(record.Status) || 0) + 1,
      );
    }
    if (record.GovernanceStatus) {
      governanceStatusCounts.set(
        record.GovernanceStatus,
        (governanceStatusCounts.get(record.GovernanceStatus) || 0) + 1,
      );
    }
  }

  const formatCounts = (map) =>
    Array.from(map.entries())
      .map(([key, value]) => `- **${key}**: ${value}`)
      .join('\n') || '_No entries recorded_';

  return {
    statusSummary: formatCounts(statusCounts),
    governanceSummary: formatCounts(governanceStatusCounts),
  };
}

function buildMaintenanceSection(reviewSummary) {
  return [
    '## Maintenance Log Snapshot',
    '**Review Status**',
    reviewSummary.statusSummary,
    '',
    '**Governance Status**',
    reviewSummary.governanceSummary,
  ].join('\n');
}

async function main() {
  const registry = await readJson(registryPath);
  const artifacts = registry.artifacts || [];
  const tables = buildTables(artifacts);

  let reviewSummary = {
    statusSummary: '_No entries recorded_',
    governanceSummary: '_No entries recorded_',
  };

  try {
    const csvRaw = await fs.readFile(reviewTrackingPath, 'utf-8');
    const records = parseCsv(csvRaw);
    reviewSummary = summarizeReviewTracking(records);
  } catch (error) {
     
    console.warn('[governance:index] Review tracking CSV unavailable:', error.message);
  }

  const generatedAt = new Date().toISOString();
  const header = `# Governance Hub Index\n\n_Last generated: ${generatedAt}_\n`;
  const body = [header, tables, buildMaintenanceSection(reviewSummary)].join(
    '\n\n',
  );

  await ensureDir(localIndexPath);
  await fs.writeFile(localIndexPath, `${body}\n`, 'utf-8');

  const docsFrontmatter = [
    '---',
    'title: Governance Hub',
    'description: Live index of TradingSystem governance artifacts.',
    'slug: /governance',
    'tags:',
    '  - governance',
    '  - operations',
    `generatedAt: ${generatedAt}`,
    '---',
    '',
  ].join('\n');

  await ensureDir(docsIndexPath);
  await fs.writeFile(docsIndexPath, `${docsFrontmatter}${body}\n`, 'utf-8');

   
  console.log('[governance:index] Generated index successfully.');
}

main().catch((error) => {
   
  console.error('[governance:index] Failed to generate index:', error);
  process.exitCode = 1;
});
