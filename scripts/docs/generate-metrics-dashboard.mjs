import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  computeCoverageMetrics,
  computeFreshnessMetrics,
  computeIssueBreakdown,
} from '../../backend/shared/docs/metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    output: path.join(ROOT_DIR, 'docs', 'static', 'dashboard', 'metrics.json'),
    history: path.join(ROOT_DIR, 'docs', 'reports', 'metrics-history.json'),
    verbose: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--output' && args[i + 1]) {
      options.output = path.resolve(args[i + 1]);
      i += 1;
    } else if (arg === '--history' && args[i + 1]) {
      options.history = path.resolve(args[i + 1]);
      i += 1;
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

function logger(verbose) {
  return {
    info: (...messages) => {
      if (verbose) {
        console.log('[metrics]', ...messages);
      }
    },
    warn: (...messages) => {
      console.warn('[metrics][warn]', ...messages);
    },
    error: (...messages) => {
      console.error('[metrics][error]', ...messages);
    },
  };
}

function coalesceCount(...sources) {
  for (const source of sources) {
    if (Array.isArray(source)) {
      return source.length;
    }

    const numeric = Number(source);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return 0;
}

async function loadFrontmatterValidation() {
  const reportsDir = path.join(ROOT_DIR, 'docs', 'reports');
  const latestAliasPath = path.join(reportsDir, 'frontmatter-validation-latest.json');

  let validationPath = latestAliasPath;
  let raw;

  try {
    raw = await fs.readFile(validationPath, 'utf-8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to load frontmatter validation report: ${error.message}`);
    }

    let entries;
    try {
      entries = await fs.readdir(reportsDir);
    } catch (dirError) {
      if (dirError.code === 'ENOENT') {
        throw new Error(
          'frontmatter-validation-latest.json not found and docs/reports directory is missing. Run the frontmatter validation script first.',
        );
      }
      throw new Error(`Failed to scan docs/reports for validation reports: ${dirError.message}`);
    }

    const candidates = entries
      .filter(
        (name) =>
          name.startsWith('frontmatter-validation-') &&
          name.endsWith('.json') &&
          name !== 'frontmatter-validation-latest.json',
      )
      .map((name) => path.join(reportsDir, name));

    if (candidates.length === 0) {
      throw new Error(
        'frontmatter-validation-latest.json not found and no frontmatter-validation-*.json reports are available. Run the frontmatter validation script first.',
      );
    }

    const withTimes = await Promise.all(
      candidates.map(async (candidatePath) => {
        try {
          const stat = await fs.stat(candidatePath);
          return { candidatePath, mtime: stat.mtimeMs };
        } catch {
          return { candidatePath, mtime: 0 };
        }
      }),
    );

    withTimes.sort((a, b) => b.mtime - a.mtime);
    validationPath = withTimes[0]?.candidatePath ?? candidates.sort().reverse()[0];

    raw = await fs.readFile(validationPath, 'utf-8');
  }

  try {
    const data = JSON.parse(raw);

    const summary = data.summary || {};
    return {
      raw: data,
      totalFiles: summary.total_files ?? summary.total ?? data.results?.length ?? 0,
      filesWithIssues: summary.files_with_issues ?? 0,
      issueCounts: summary.issue_counts ?? {},
      ownerDistribution: summary.owner_distribution ?? data.owner_distribution ?? {},
      freshnessAnalysis: data.freshness_analysis ?? {},
      results: Array.isArray(data.results) ? data.results : [],
      missingFrontmatter: data.missing_frontmatter ?? [],
      incompleteFrontmatter: data.incomplete_frontmatter ?? [],
      invalidValues: data.invalid_values ?? [],
    };
  } catch (parseError) {
    throw new Error(`Failed to parse frontmatter validation report: ${parseError.message}`);
  }
}

async function loadMaintenanceAudit() {
  const reportsDir = path.join(ROOT_DIR, 'docs', 'reports');

  let entries;
  try {
    entries = await fs.readdir(reportsDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('docs/reports directory not found. Run documentation audit first.');
    }
    throw new Error(`Failed to read docs/reports directory: ${error.message}`);
  }

  const auditPaths = entries
    .filter((name) => {
      if (!name.endsWith('.md')) {
        return false;
      }
      return (
        (name.startsWith('maintenance-audit-') && name.endsWith('.md')) ||
        name.endsWith('-documentation-audit.md')
      );
    })
    .map((name) => path.join(reportsDir, name));

  if (auditPaths.length === 0) {
    throw new Error(
      'No maintenance-audit-*.md or *-documentation-audit.md report found in docs/reports.',
    );
  }

  let latestAuditPath;
  try {
    const withTimes = await Promise.all(
      auditPaths.map(async (reportPath) => {
        try {
          const stat = await fs.stat(reportPath);
          return { reportPath, mtime: stat.mtimeMs };
        } catch {
          return { reportPath, mtime: 0 };
        }
      }),
    );

    withTimes.sort((a, b) => b.mtime - a.mtime);
    latestAuditPath = withTimes[0]?.reportPath ?? auditPaths.sort().reverse()[0];
  } catch (error) {
    latestAuditPath = auditPaths.sort().reverse()[0];
  }

  let content;
  try {
    content = await fs.readFile(latestAuditPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read maintenance audit report: ${error.message}`);
  }

  const metrics = {
    healthScore: 0,
    grade: 'N/A',
    status: 'unknown',
    totalFiles: 0,
    staleFiles: 0,
    shortFiles: 0,
    missingFrontmatter: 0,
    brokenLinks: 0,
    issuesFound: 0,
  };

  // Parse summary table values
  const tableRegex =
    /\|\s*(Health Score|Grade|Status|Total Files|Stale Files|Short Files|Missing Frontmatter|Broken Links|Issues Found)\s*\|\s*([^\|\n]+)\|?/gi;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const key = match[1].trim();
    const rawValue = match[2].trim();
    const numericValue = Number.parseFloat(rawValue.replace(/[^\d.-]/g, '')) || 0;

    switch (key) {
      case 'Health Score':
        metrics.healthScore = numericValue;
        break;
      case 'Grade':
        metrics.grade = rawValue;
        break;
      case 'Status':
        metrics.status = rawValue;
        break;
      case 'Total Files':
        metrics.totalFiles = numericValue;
        break;
      case 'Stale Files':
        metrics.staleFiles = numericValue;
        break;
      case 'Short Files':
        metrics.shortFiles = numericValue;
        break;
      case 'Missing Frontmatter':
        metrics.missingFrontmatter = numericValue;
        break;
      case 'Broken Links':
        metrics.brokenLinks = numericValue;
        break;
      case 'Issues Found':
        metrics.issuesFound = numericValue;
        break;
      default:
        break;
    }
  }

  // Attempt parsing status line if still missing
  if (metrics.grade === 'N/A') {
    const gradeMatch = content.match(/Grade:\s*([A-F][+-]?)/i);
    if (gradeMatch) {
      metrics.grade = gradeMatch[1];
    }
  }
  if (metrics.status === 'unknown') {
    const statusMatch = content.match(/Status:\s*([A-Za-z ]+)/i);
    if (statusMatch) {
      metrics.status = statusMatch[1].trim();
    }
  }

  return metrics;
}


async function loadHistoricalMetrics(historyPath) {
  try {
    const raw = await fs.readFile(historyPath, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw new Error(`Failed to read historical metrics: ${error.message}`);
  }
}

function appendHistoricalMetrics(currentMetrics, historicalData) {
  const freshPercentage =
    currentMetrics.freshness?.distribution?.reduce((acc, range) => {
      if (range.label === '<30 days' || range.label === '30-60 days' || range.label === '60-90 days') {
        return acc + (range.percentage ?? 0);
      }
      return acc;
    }, 0) ?? 0;

  const snapshot = {
    date: new Date().toISOString(),
    healthScore: currentMetrics.healthScore.current ?? 0,
    issueCount: currentMetrics.issues.total ?? 0,
    freshnessRate: Math.min(100, Math.max(0, freshPercentage)),
    totalFiles: currentMetrics.coverage.totalFiles ?? 0,
  };

  const updatedHistory = [...historicalData, snapshot];

  // Keep only last 90 days (approx)
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const prunedHistory = updatedHistory.filter((entry) => {
    const timestamp = Date.parse(entry.date);
    return Number.isFinite(timestamp) ? timestamp >= ninetyDaysAgo : true;
  });

  return prunedHistory;
}

function determineHealthStatus(score) {
  if (score >= 90) return { grade: 'A', status: 'excellent' };
  if (score >= 80) return { grade: 'B', status: 'good' };
  if (score >= 70) return { grade: 'C', status: 'fair' };
  if (score >= 60) return { grade: 'D', status: 'poor' };
  return { grade: 'F', status: 'critical' };
}

function calculateTrend(historical) {
  if (!Array.isArray(historical) || historical.length < 2) {
    return 'stable';
  }

  const recent = historical.slice(-7);
  const first = recent[0].healthScore ?? 0;
  const last = recent[recent.length - 1].healthScore ?? 0;
  const delta = last - first;

  if (delta > 5) return 'improving';
  if (delta < -5) return 'declining';
  return 'stable';
}

async function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function generateMetricsJSON(options, log) {
  const validationData = await loadFrontmatterValidation();
  log.info('Loaded frontmatter validation report');

  const auditData = await loadMaintenanceAudit();
  log.info('Loaded maintenance audit report');

  const freshness = computeFreshnessMetrics({
    records: validationData.results || [],
    freshnessAnalysis: validationData.freshnessAnalysis ?? {},
  });
  log.info('Calculated freshness distribution');

  const issues = computeIssueBreakdown({
    missingFrontmatter: coalesceCount(
      validationData.missingFrontmatter,
      validationData.issueCounts?.missing_frontmatter,
    ),
    incompleteFrontmatter: coalesceCount(
      validationData.incompleteFrontmatter,
      validationData.issueCounts?.incomplete_frontmatter,
    ),
    invalidFrontmatter: coalesceCount(
      validationData.invalidValues,
      validationData.issueCounts?.invalid_values,
    ),
    brokenLinks: coalesceCount(auditData.brokenLinks),
    staleFiles: coalesceCount(auditData.staleFiles),
    shortFiles: coalesceCount(auditData.shortFiles),
  });
  log.info('Calculated issue breakdown');

  const coverage = computeCoverageMetrics({
    totalFiles: validationData.totalFiles,
    ownerDistribution: validationData.ownerDistribution,
    records: validationData.results || [],
  });
  log.info('Calculated coverage metrics');

  const healthScore = Number(auditData.healthScore ?? 0);
  const currentHealth = Number.isFinite(healthScore) ? Math.round(healthScore * 10) / 10 : 0;
  const healthStatus = determineHealthStatus(currentHealth);

  const currentMetrics = {
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      source: 'generate-metrics-dashboard.mjs',
    },
    healthScore: {
      current: currentHealth,
      grade: auditData.grade && auditData.grade !== 'N/A' ? auditData.grade : healthStatus.grade,
      status:
        auditData.status && auditData.status !== 'unknown'
          ? auditData.status
          : healthStatus.status,
      trend: 'stable',
    },
    freshness,
    issues,
    coverage,
    historical: [],
  };

  const historicalData = await loadHistoricalMetrics(options.history);
  log.info(`Loaded ${historicalData.length} historical snapshots`);

  const updatedHistory = appendHistoricalMetrics(currentMetrics, historicalData);
  currentMetrics.historical = updatedHistory;
  currentMetrics.healthScore.trend = calculateTrend(updatedHistory);

  await ensureDirectory(options.output);
  await ensureDirectory(options.history);

  await fs.writeFile(options.output, JSON.stringify(currentMetrics, null, 2));
  log.info(`Wrote metrics JSON to ${options.output}`);

  const secondaryOutput = path.join(
    ROOT_DIR,
    'docs',
    'static',
    'metrics',
    'index.json',
  );
  await ensureDirectory(secondaryOutput);
  await fs.writeFile(secondaryOutput, JSON.stringify(currentMetrics, null, 2));
  log.info(`Wrote metrics JSON to ${secondaryOutput}`);

  await fs.writeFile(options.history, JSON.stringify(updatedHistory, null, 2));
  log.info(`Wrote metrics history to ${options.history}`);

  return currentMetrics;
}

async function main() {
  const options = parseArgs();
  const log = logger(options.verbose);

  try {
    await generateMetricsJSON(options, log);
  } catch (error) {
    log.error(error.message);
    process.exitCode = 1;
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  // Script executed directly
  main();
}

export {
  generateMetricsJSON,
  loadFrontmatterValidation,
  loadMaintenanceAudit,
  computeFreshnessMetrics as calculateFreshnessDistribution,
  computeIssueBreakdown as calculateIssueBreakdown,
  computeCoverageMetrics as calculateCoverageBySection,
  loadHistoricalMetrics,
  appendHistoricalMetrics,
};
