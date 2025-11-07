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
const reportsDir = path.join(repoRoot, 'reports/governance');
const dashboardDataDir = path.join(
  repoRoot,
  'frontend/dashboard/public/data/governance',
);
const docsReportPath = path.join(
  repoRoot,
  'docs/content/reports/governance-status.mdx',
);
const snapshotPath = path.join(reportsDir, 'latest.json');
const dashboardSnapshotPath = path.join(
  dashboardDataDir,
  'latest.json',
);

function toPreviewPath(artifactPath) {
  if (!artifactPath) return null;
  return `/governance/docs/${artifactPath.replace(/\\/g, '/')}`;
}

const MS_IN_DAY = 24 * 60 * 60 * 1000;

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readRegistry() {
  const raw = await fs.readFile(registryPath, 'utf-8');
  return JSON.parse(raw);
}

async function readCsvRecords() {
  try {
    const raw = await fs.readFile(reviewTrackingPath, 'utf-8');
    const [headerLine, ...rows] = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!headerLine) return [];
    const headers = headerLine.split(',');
    return rows.map((line) => {
      const cells = line.split(',');
      return headers.reduce((acc, key, idx) => {
        acc[key] = cells[idx] ?? '';
        return acc;
      }, {});
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[governance:metrics] Unable to read review-tracking.csv:', error.message);
    return [];
  }
}

function computeStatus(artifact) {
  const lastReviewed = new Date(artifact.lastReviewed);
  const today = new Date();
  const reviewCycleDays = Number(artifact.reviewCycleDays || 90);
  const dueDate = new Date(lastReviewed.getTime() + reviewCycleDays * MS_IN_DAY);
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / MS_IN_DAY);
  if (Number.isNaN(daysUntilDue)) {
    return { code: 'overdue', daysUntilDue: -Infinity, dueDate: artifact.lastReviewed };
  }
  return {
    code: daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 15 ? 'warning' : 'healthy',
    daysUntilDue,
    dueDate: dueDate.toISOString().slice(0, 10),
  };
}

function summarizeArtifacts(artifacts) {
  const distribution = { healthy: 0, warning: 0, overdue: 0 };
  const overdue = [];
  const upcoming = [];
  const byCategory = new Map();

  for (const artifact of artifacts) {
    const status = computeStatus(artifact);
    distribution[status.code] += 1;
    byCategory.set(
      artifact.category,
      (byCategory.get(artifact.category) || 0) + 1,
    );
    if (status.code === 'overdue') {
      overdue.push({
        id: artifact.id,
        title: artifact.title,
        owner: artifact.owner,
        daysOverdue: Math.abs(status.daysUntilDue),
      });
    } else {
      upcoming.push({
        id: artifact.id,
        title: artifact.title,
        owner: artifact.owner,
        dueDate: status.dueDate,
        daysUntilDue: status.daysUntilDue,
      });
    }
  }

  upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    distribution,
    overdue,
    upcoming: upcoming.slice(0, 8),
    categoryBreakdown: Array.from(byCategory.entries()).map(
      ([category, count]) => ({ category, count }),
    ),
  };
}

function mapToSortedArray(map) {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function deriveCoverageStats(artifacts) {
  if (!artifacts.length) {
    return {
      healthyPercentage: 100,
      meetsHealthyTarget: true,
      owners: [],
      policiesByOwner: [],
    };
  }

  const ownerMap = new Map();
  const policiesOwnerMap = new Map();
  let onTrackCount = 0;

  for (const artifact of artifacts) {
    const status = computeStatus(artifact);
    if (status.code === 'healthy') {
      onTrackCount += 1;
    }
    if (artifact.owner) {
      ownerMap.set(artifact.owner, (ownerMap.get(artifact.owner) || 0) + 1);
    }
    if (artifact.category === 'policies' && artifact.owner) {
      policiesOwnerMap.set(
        artifact.owner,
        (policiesOwnerMap.get(artifact.owner) || 0) + 1,
      );
    }
  }

  const healthyPercentage = Number(
    ((onTrackCount / artifacts.length) * 100).toFixed(2),
  );

  return {
    healthyPercentage,
    meetsHealthyTarget: healthyPercentage >= 95,
    owners: mapToSortedArray(ownerMap),
    policiesByOwner: mapToSortedArray(policiesOwnerMap),
  };
}

function summarizeReviews(records) {
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

  return {
    records,
    statusCounts: Object.fromEntries(statusCounts),
    governanceStatusCounts: Object.fromEntries(governanceStatusCounts),
  };
}

function formatDistribution(distribution) {
  return `| Status | Count |\n|--------|-------|\n| Healthy | ${distribution.healthy} |\n| Warning | ${distribution.warning} |\n| Overdue | ${distribution.overdue} |`;
}

function formatUpcoming(upcoming) {
  if (!upcoming.length) {
    return '_No upcoming reviews in the next window._';
  }

  const rows = upcoming
    .map(
      (item) =>
        `| ${item.title} | ${item.owner} | ${item.dueDate} | ${item.daysUntilDue}d |`,
    )
    .join('\n');

  return [
    '| Artifact | Owner | Due Date | Days Until Due |',
    '|----------|-------|----------|----------------|',
    rows,
  ].join('\n');
}

/**
 * Sanitizes text content for safe JSON embedding.
 * Removes control characters and limits length to prevent JSON parsing errors.
 *
 * @param {string} content - Raw file content
 * @returns {string} - Sanitized content safe for JSON
 */
function sanitizeForJson(content) {
  if (!content) return null;

  // Remove or replace control characters that break JSON parsing
  // Keep only: newlines (\n), tabs (\t), carriage returns (\r)
  let sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length to prevent massive JSON files (keep first 10,000 chars)
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000) + '\n\n[... content truncated ...]';
  }

  return sanitized;
}

async function readArtifactSource(relPath) {
  if (!relPath) return null;
  const absolutePath = path.join(governanceDir, relPath);
  try {
    const content = await fs.readFile(absolutePath, 'utf-8');
    return sanitizeForJson(content);
  } catch (error) {
    console.warn(
      `[governance:metrics] Preview unavailable for ${relPath}: ${error.message}`,
    );
    return null;
  }
}

async function mapArtifactsForSnapshot(artifacts) {
  return Promise.all(
    artifacts.map(async (artifact) => {
      const previewContent = await readArtifactSource(artifact.path);
      return {
        id: artifact.id,
        title: artifact.title,
        description: artifact.description,
        owner: artifact.owner,
        category: artifact.category,
        type: artifact.type,
        tags: artifact.tags || [],
        lastReviewed: artifact.lastReviewed,
        reviewCycleDays: artifact.reviewCycleDays,
        publishSlug: artifact.publish?.slug || null,
        previewPath: toPreviewPath(artifact.path),
        previewContent,
      };
    }),
  );
}

async function writeDocsReport(payload) {
  const { distribution, upcoming } = payload.freshness;
  const { healthyPercentage, meetsHealthyTarget, policiesByOwner } =
    payload.coverage;
  const frontmatter = [
    '---',
    'title: Governance Status Dashboard',
    'description: Auto-generated snapshot of governance freshness and review health.',
    'slug: /reports/governance-status',
    'tags:',
    '  - governance',
    '  - report',
    `lastUpdated: ${payload.metadata.generatedAt}`,
    '---',
    '',
  ].join('\n');

  const content = [
    '# Governance Status',
    '',
    `Generated at: **${payload.metadata.generatedAt}**`,
    '',
    '## Freshness Distribution',
    formatDistribution(distribution),
    '',
    '## Upcoming Reviews',
    formatUpcoming(upcoming),
    '',
    '## Freshness SLA',
    `Overall cadence on-track: **${healthyPercentage}%** (${meetsHealthyTarget ? '✅ meets' : '⚠️ misses'} 95% target)`,
    '',
    '## Policy Coverage by Owner',
    policiesByOwner.length
      ? [
          '| Owner | Policies |',
          '|-------|----------|',
          policiesByOwner
            .map((item) => `| ${item.key} | ${item.count} |`)
            .join('\n'),
        ].join('\n')
      : '_No policies registered in the hub._',
  ].join('\n');

  await ensureDir(path.dirname(docsReportPath));
  await fs.writeFile(docsReportPath, `${frontmatter}${content}\n`, 'utf-8');
}

async function main() {
  const registry = await readRegistry();
  const artifacts = registry.artifacts || [];
  const reviewRecords = await readCsvRecords();
  const freshness = summarizeArtifacts(artifacts);
  const coverage = deriveCoverageStats(artifacts);
  const reviewTracking = summarizeReviews(reviewRecords);
  const artifactSummaries = await mapArtifactsForSnapshot(artifacts);

  const payload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      source: 'governance:metrics',
    },
    totals: {
      artifacts: artifacts.length,
      published: artifacts.filter((item) => item.publish).length,
      evidence: artifacts.filter((item) => item.category === 'evidence').length,
    },
    coverage,
    freshness,
    reviewTracking,
    artifacts: artifactSummaries,
  };

  await ensureDir(reportsDir);
  await ensureDir(path.dirname(dashboardSnapshotPath));

  await fs.writeFile(snapshotPath, JSON.stringify(payload, null, 2), 'utf-8');
  await fs.writeFile(
    dashboardSnapshotPath,
    JSON.stringify(payload, null, 2),
    'utf-8',
  );

  await writeDocsReport(payload);

  // eslint-disable-next-line no-console
  console.log('[governance:metrics] Snapshot and report updated.');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[governance:metrics] Failed to compute metrics:', error);
  process.exitCode = 1;
});
