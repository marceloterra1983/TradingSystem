import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { asyncHandler } from "../middleware/errorHandler.js";
import docsHealthMetrics from "../services/docsHealthMetrics.js";
import { logger } from "../config/logger.js";
import { config } from "../config/appConfig.js";
import {
  computeCoverageMetrics,
  computeFreshnessMetrics,
  computeIssueBreakdown,
} from "../../../../shared/docs/metrics.js";

const router = express.Router();

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for audit data (5 minutes)
let cachedAuditData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load latest audit JSON reports
 */
async function loadAuditData() {
  // Check cache
  if (
    cachedAuditData &&
    cacheTimestamp &&
    Date.now() - cacheTimestamp < CACHE_DURATION
  ) {
    return cachedAuditData;
  }

  try {
    // Find latest audit directory in /tmp
    const tmpDir = "/tmp";
    const files = await fs.readdir(tmpDir);
    const auditDirs = files.filter((f) => f.startsWith("docs-audit-"));

    if (auditDirs.length === 0) {
      throw new Error("No audit data found. Run audit script first.");
    }

    // Get most recent audit directory
    const latestAuditDir = auditDirs.sort().reverse()[0];
    const auditPath = path.join(tmpDir, latestAuditDir);

    // Load JSON reports
    const frontmatterPath = path.join(auditPath, "frontmatter.json");
    const linksPath = path.join(auditPath, "links.json");
    const duplicatesPath = path.join(auditPath, "duplicates.json");

    const [frontmatterData, linksData, duplicatesData] = await Promise.all([
      fs
        .readFile(frontmatterPath, "utf-8")
        .then(JSON.parse)
        .catch(() => ({})),
      fs
        .readFile(linksPath, "utf-8")
        .then(JSON.parse)
        .catch(() => ({})),
      fs
        .readFile(duplicatesPath, "utf-8")
        .then(JSON.parse)
        .catch(() => ({})),
    ]);

    // Combine data
    const auditData = {
      frontmatter: frontmatterData,
      links: linksData,
      duplicates: duplicatesData,
      audit_date: latestAuditDir.replace("docs-audit-", ""),
      audit_path: auditPath,
    };

    // Update cache
    cachedAuditData = auditData;
    cacheTimestamp = Date.now();

    return auditData;
  } catch (error) {
    logger.error("[DocsHealth] Failed to load audit data:", error);
    throw error;
  }
}

/**
 * Find latest audit report markdown file
 */
async function findLatestReport() {
  try {
    const projectRoot = path.resolve(__dirname, "../../../../../"); // Up to project root
    const reportsDir = path.join(projectRoot, "docs/reports");

    const files = await fs.readdir(reportsDir);
    const auditReports = files.filter((f) =>
      f.match(/^\d{4}-\d{2}-\d{2}-documentation-audit\.md$/),
    );

    if (auditReports.length === 0) {
      return null;
    }

    // Get most recent report
    const latestReport = auditReports.sort().reverse()[0];
    const reportPath = path.join(reportsDir, latestReport);

    // Read report metadata (first 50 lines for frontmatter + summary)
    const reportContent = await fs.readFile(reportPath, "utf-8");
    const lines = reportContent.split("\n").slice(0, 50);

    return {
      report_date: latestReport.replace("-documentation-audit.md", ""),
      report_path: reportPath,
      report_file: latestReport,
      preview: lines.join("\n"),
    };
  } catch (error) {
    logger.error("[DocsHealth] Failed to find latest report:", error);
    return null;
  }
}

/**
 * GET /api/v1/docs/health/summary
 * High-level health summary
 */
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    try {
      const auditData = await loadAuditData();
      const metrics = await docsHealthMetrics.getHealthMetrics();

      // Calculate issues summary
      const issuesSummary = {
        frontmatter: auditData.frontmatter.missing || 0,
        links: auditData.links.broken_links || 0,
        duplicates: auditData.duplicates.exact_duplicates || 0,
        outdated: auditData.frontmatter.outdated_count || 0,
      };

      res.json({
        success: true,
        data: {
          healthScore: metrics.health_score,
          grade: metrics.grade,
          status: metrics.status,
          lastAuditDate: auditData.audit_date,
          totalFiles: metrics.total_files,
          issuesSummary,
          hasData: true,
        },
      });
    } catch (error) {
      // Graceful degradation when no audit data exists
      logger.warn(
        "[DocsHealth] No audit data available, returning defaults",
        error.message,
      );

      res.json({
        success: true,
        data: {
          healthScore: 0,
          grade: "N/A",
          status: "No Data",
          lastAuditDate: null,
          totalFiles: 0,
          issuesSummary: {
            frontmatter: 0,
            links: 0,
            duplicates: 0,
            outdated: 0,
          },
          hasData: false,
          message:
            "No audit data available. Run the documentation audit script to generate health metrics.",
        },
      });
    }
  }),
);

/**
 * GET /api/v1/docs/health/metrics
 * Detailed metrics from Prometheus gauges
 */
router.get(
  "/metrics",
  asyncHandler(async (req, res) => {
    const metrics = await docsHealthMetrics.getHealthMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  }),
);

/**
 * GET /api/v1/docs/health/issues
 * Detailed issue breakdown with pagination
 * Query params: type (frontmatter|links|duplicates|outdated), limit (default 50)
 */
router.get(
  "/issues",
  asyncHandler(async (req, res) => {
    const { type, limit = 50 } = req.query;

    let auditData;
    try {
      auditData = await loadAuditData();
    } catch (error) {
      // Graceful degradation when no audit data exists
      logger.warn(
        "[DocsHealth] No audit data for issues endpoint",
        error.message,
      );
      return res.json({
        success: true,
        data: {
          type,
          total: 0,
          showing: 0,
          issues: [],
          hasData: false,
          message:
            "No audit data available. Run the documentation audit script first.",
        },
      });
    }

    let issues = [];

    switch (type) {
      case "frontmatter":
        issues = (auditData.frontmatter.missing_files || []).map((file) => ({
          file: file.path,
          issue: "Missing frontmatter",
          severity: "critical",
          details: file.missing_fields || [],
        }));
        break;

      case "links":
        issues = (auditData.links.broken_links_list || []).map((link) => ({
          file: link.file,
          line: link.line,
          link_text: link.text,
          url: link.url,
          error: link.error,
          priority: link.priority || "warning",
        }));
        break;

      case "duplicates":
        issues = (auditData.duplicates.exact_duplicate_groups || []).map(
          (group) => ({
            files: group.files,
            hash: group.hash,
            count: group.count,
            category: "exact_duplicate",
          }),
        );
        break;

      case "outdated":
        issues = (auditData.frontmatter.outdated_files || []).map((file) => ({
          file: file.path,
          last_review: file.last_review,
          days_old: file.days_old,
          domain: file.domain,
          type: file.type,
        }));
        break;

      default:
        return res.status(400).json({
          success: false,
          error:
            "Invalid issue type. Must be: frontmatter, links, duplicates, or outdated",
        });
    }

    // Apply limit
    const limitNum = parseInt(limit);
    const paginatedIssues = issues.slice(0, limitNum);

    res.json({
      success: true,
      data: {
        type,
        total: issues.length,
        showing: paginatedIssues.length,
        issues: paginatedIssues,
      },
    });
  }),
);

/**
 * Query Prometheus range vector
 * @param {string} query - PromQL query
 * @param {number} start - Start timestamp (seconds)
 * @param {number} end - End timestamp (seconds)
 * @param {string} step - Step interval (e.g., '1d', '1h')
 * @returns {Promise<Array>} Time series data points
 */
async function queryPrometheus(query, start, end, step = "1d") {
  const prometheusUrl = config.prometheus?.url;
  if (!prometheusUrl) {
    logger.debug("[DocsHealth] Prometheus URL not configured; skipping query", {
      query,
    });
    return [];
  }

  try {
    const url = new URL("/api/v1/query_range", prometheusUrl);
    url.searchParams.append("query", query);
    url.searchParams.append("start", start.toString());
    url.searchParams.append("end", end.toString());
    url.searchParams.append("step", step);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Prometheus query failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status !== "success" || !data.data?.result?.[0]?.values) {
      return [];
    }

    // Transform Prometheus data to our format
    return data.data.result[0].values.map(([timestamp, value]) => ({
      timestamp: new Date(timestamp * 1000).toISOString().split("T")[0],
      value: parseFloat(value),
    }));
  } catch (error) {
    logger.error("[DocsHealth] Prometheus query failed:", error);
    return [];
  }
}

/**
 * GET /api/v1/docs/health/trends
 * Historical trends data from Prometheus
 * Query params: days (default 30)
 */
router.get(
  "/trends",
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days);

    const now = Math.floor(Date.now() / 1000); // Prometheus uses seconds
    const start = now - daysNum * 24 * 60 * 60;

    // Query Prometheus for historical metrics
    const [healthScoreTrend, brokenLinksTrend, outdatedDocsTrend] =
      await Promise.all([
        queryPrometheus("docs_health_score", start, now),
        queryPrometheus("sum(docs_links_broken)", start, now),
        queryPrometheus("docs_outdated_count", start, now),
      ]);

    // If Prometheus is unavailable or no data, return empty arrays instead of mock data
    res.json({
      success: true,
      data: {
        days: daysNum,
        health_score: healthScoreTrend,
        broken_links: brokenLinksTrend,
        outdated_docs: outdatedDocsTrend,
        prometheus_url: config.prometheus.url,
        has_data:
          healthScoreTrend.length > 0 ||
          brokenLinksTrend.length > 0 ||
          outdatedDocsTrend.length > 0,
      },
    });
  }),
);

/**
 * GET /api/v1/docs/health/latest-report
 * Latest audit report metadata
 */
router.get(
  "/latest-report",
  asyncHandler(async (req, res) => {
    const report = await findLatestReport();

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "No audit reports found",
      });
    }

    // Parse summary statistics from preview
    const lines = report.preview.split("\n");
    let healthScore = null;
    let issueCount = null;

    for (const line of lines) {
      if (line.includes("Health Score:")) {
        const match = line.match(/(\d+\.?\d*)/);
        if (match) healthScore = parseFloat(match[1]);
      }
      if (line.includes("Total Issues:") || line.includes("issues found")) {
        const match = line.match(/(\d+)/);
        if (match) issueCount = parseInt(match[1]);
      }
    }

    res.json({
      success: true,
      data: {
        reportDate: report.report_date,
        reportPath: report.report_path,
        reportFile: report.report_file,
        healthScore,
        issueCount,
      },
    });
  }),
);

/**
 * GET /api/v1/docs/health/dashboard-metrics
 * Aggregated metrics for dashboard visualisations
 */
router.get(
  "/dashboard-metrics",
  asyncHandler(async (req, res) => {
    try {
      const auditData = await loadAuditData();
      const metrics = await docsHealthMetrics.getHealthMetrics();

      const frontmatter = normalizeFrontmatterData(auditData.frontmatter || {});
      const links = auditData.links || {};
      const frontmatterEntries = extractFileEntries(frontmatter);

      const freshness = computeFreshnessMetrics({
        records: frontmatterEntries,
        freshnessAnalysis: frontmatter.freshness_analysis ?? {},
        outdatedCount: frontmatter.outdated_count,
        staleCount: frontmatter.stale_count,
      });

      const issues = computeIssueBreakdown({
        missingFrontmatter: getCount(
          frontmatter.missing,
          frontmatter.missing_count,
          frontmatter.missing_files,
          frontmatter.missing_frontmatter,
          frontmatter.summary?.files_missing_frontmatter,
        ),
        incompleteFrontmatter: getCount(
          frontmatter.incomplete,
          frontmatter.incomplete_count,
          frontmatter.incomplete_files,
          frontmatter.incomplete_frontmatter,
          frontmatter.summary?.files_incomplete_frontmatter,
        ),
        invalidFrontmatter: getCount(
          frontmatter.invalid,
          frontmatter.invalid_count,
          frontmatter.invalid_values,
          frontmatter.invalid_frontmatter,
          frontmatter.summary?.issue_counts?.invalid_value,
        ),
        brokenLinks: getCount(
          links.broken_links,
          links.total_broken,
          links.broken_links_list,
        ),
        staleFiles: getCount(
          frontmatter.outdated_count,
          frontmatter.stale_count,
          frontmatter.outdated_files,
          frontmatter.freshness_analysis?.outdated_documents,
        ),
        shortFiles: getCount(
          frontmatter.short_files,
          frontmatter.short_count,
          frontmatter.short_files_list,
        ),
      });

      const coverage = computeCoverageMetrics({
        totalFiles:
          frontmatter.total_files ??
          frontmatter.total ??
          frontmatter.summary?.total_files,
        ownerDistribution:
          frontmatter.owner_distribution ??
          frontmatter.summary?.owner_distribution ??
          {},
        records: frontmatterEntries,
      });

      const historical = await getHistoricalMetrics(30);

      res.json({
        success: true,
        data: {
          metadata: {
            generatedAt: new Date().toISOString(),
            version: "1.0.0",
            source: "documentation-api",
          },
          healthScore: {
            current: metrics.health_score ?? 0,
            grade: metrics.grade ?? "N/A",
            status: metrics.status ?? "No Data",
            trend: calculateTrend(historical),
          },
          freshness,
          issues,
          coverage,
          historical,
        },
      });
    } catch (error) {
      logger.error("[DocsHealth] Failed to generate dashboard metrics:", error);
      res.json({
        success: true,
        data: {
          metadata: {
            generatedAt: new Date().toISOString(),
            version: "1.0.0",
            source: "documentation-api",
          },
          healthScore: {
            current: 0,
            grade: "N/A",
            status: "No Data",
            trend: "stable",
          },
          freshness: {
            distribution: [],
            outdatedCount: 0,
            averageAge: 0,
          },
          issues: {
            breakdown: {},
            bySeverity: {},
            total: 0,
          },
          coverage: {
            byOwner: [],
            byCategory: [],
            totalFiles: 0,
          },
          historical: [],
          hasData: false,
          message:
            "No audit data available. Run documentation audit script to populate dashboard metrics.",
        },
      });
    }
  }),
);

function extractFileEntries(frontmatterData = {}) {
  if (!frontmatterData) return [];
  if (Array.isArray(frontmatterData.files)) {
    return frontmatterData.files;
  }
  if (Array.isArray(frontmatterData.results)) {
    return frontmatterData.results;
  }
  if (Array.isArray(frontmatterData.records)) {
    return frontmatterData.records;
  }
  return [];
}

function getCount(...sources) {
  let fallback = 0;

  for (const source of sources) {
    if (Array.isArray(source)) {
      const length = source.length;
      if (length > 0) {
        return length;
      }
      fallback = Math.max(fallback, 0);
      continue;
    }

    const numeric = Number(source);
    if (Number.isFinite(numeric)) {
      if (numeric > 0) {
        return numeric;
      }
      fallback = Math.max(fallback, numeric);
    }
  }

  return fallback;
}

function normalizeFrontmatterData(data = {}) {
  if (!data || typeof data !== "object") {
    return {};
  }

  const summary =
    data.summary && typeof data.summary === "object" ? data.summary : {};
  const normalized = { ...data };

  if (normalized.total_files == null && summary.total_files != null) {
    normalized.total_files = summary.total_files;
  }

  if (!normalized.owner_distribution && summary.owner_distribution) {
    normalized.owner_distribution = summary.owner_distribution;
  }

  if (!normalized.missing && Array.isArray(data.missing_frontmatter)) {
    normalized.missing = data.missing_frontmatter;
  }
  if (!normalized.missing_files && Array.isArray(data.missing_frontmatter)) {
    normalized.missing_files = data.missing_frontmatter;
  }
  if (normalized.missing_count == null) {
    const missingCount =
      summary.files_missing_frontmatter ??
      (Array.isArray(normalized.missing_files)
        ? normalized.missing_files.length
        : undefined);
    if (missingCount != null) {
      normalized.missing_count = missingCount;
    }
  }

  if (!normalized.incomplete && Array.isArray(data.incomplete_frontmatter)) {
    normalized.incomplete = data.incomplete_frontmatter;
  }
  if (
    !normalized.incomplete_files &&
    Array.isArray(data.incomplete_frontmatter)
  ) {
    normalized.incomplete_files = data.incomplete_frontmatter;
  }
  if (normalized.incomplete_count == null) {
    const incompleteCount =
      summary.files_incomplete_frontmatter ??
      (Array.isArray(normalized.incomplete_files)
        ? normalized.incomplete_files.length
        : undefined);
    if (incompleteCount != null) {
      normalized.incomplete_count = incompleteCount;
    }
  }

  if (!normalized.invalid && Array.isArray(data.invalid_values)) {
    normalized.invalid = data.invalid_values;
  }
  if (!normalized.invalid_values && Array.isArray(data.invalid)) {
    normalized.invalid_values = data.invalid;
  }
  if (normalized.invalid_count == null) {
    const issueCounts = summary.issue_counts || {};
    const invalidCountFromSummary =
      (issueCounts.invalid_value ?? 0) + (issueCounts.invalid_date ?? 0);
    const invalidCount =
      invalidCountFromSummary > 0
        ? invalidCountFromSummary
        : Array.isArray(normalized.invalid_values)
          ? normalized.invalid_values.length
          : undefined;
    if (invalidCount != null) {
      normalized.invalid_count = invalidCount;
    }
  }

  if (
    !normalized.outdated_files &&
    Array.isArray(data.freshness_analysis?.outdated_documents)
  ) {
    normalized.outdated_files = data.freshness_analysis.outdated_documents;
  }
  if (normalized.outdated_count == null) {
    const outdatedCount =
      summary.outdated_documents ??
      (Array.isArray(normalized.outdated_files)
        ? normalized.outdated_files.length
        : undefined);
    if (outdatedCount != null) {
      normalized.outdated_count = outdatedCount;
    }
  }
  if (normalized.stale_count == null && normalized.outdated_count != null) {
    normalized.stale_count = normalized.outdated_count;
  }

  return normalized;
}

async function getHistoricalMetrics(days = 30) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - days * 24 * 60 * 60;

  const [healthSeries, issueSeries] = await Promise.all([
    queryPrometheus("docs_health_score", start, now),
    queryPrometheus(
      "docs_links_broken + docs_frontmatter_missing + docs_outdated_count",
      start,
      now,
    ),
  ]);

  const timeline = new Map();

  healthSeries.forEach(({ timestamp, value }) => {
    timeline.set(timestamp, {
      date: timestamp,
      healthScore: value ?? 0,
      issueCount: 0,
    });
  });

  issueSeries.forEach(({ timestamp, value }) => {
    const existing = timeline.get(timestamp) || {
      date: timestamp,
      healthScore: 0,
      issueCount: 0,
    };
    existing.issueCount = value ?? 0;
    timeline.set(timestamp, existing);
  });

  return Array.from(timeline.values()).sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
}

function calculateTrend(historical = []) {
  if (!Array.isArray(historical) || historical.length < 2) {
    return "stable";
  }

  const recent = historical.slice(-7);
  const first = recent[0]?.healthScore ?? 0;
  const last = recent[recent.length - 1]?.healthScore ?? 0;
  const delta = last - first;

  if (delta > 5) return "improving";
  if (delta < -5) return "declining";
  return "stable";
}

/**
 * POST /api/v1/docs/health/update-metrics
 * Update Prometheus metrics from audit data
 * Called by CI/CD workflow after audit run
 */
router.post(
  "/update-metrics",
  asyncHandler(async (req, res) => {
    const auditData = req.body;

    if (!auditData || !auditData.frontmatter) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid audit data. Must include frontmatter, links, and duplicates",
      });
    }

    // Update all Prometheus metrics
    docsHealthMetrics.updateHealthMetrics(auditData);
    docsHealthMetrics.recordAuditRun();

    // Update cache with new data (so dashboard can read it)
    cachedAuditData = auditData;
    cacheTimestamp = Date.now();

    logger.info("[DocsHealth] Updated Prometheus metrics from audit data", {
      health_score: auditData.health_score,
      total_files: auditData.frontmatter.total_files,
      broken_links: auditData.links.broken_links,
    });

    res.json({
      success: true,
      message: "Metrics updated successfully",
    });
  }),
);

/**
 * POST /api/v1/docs/health/record-fix
 * Record issue fix (increments counter)
 * Body: { issue_type: 'frontmatter' | 'links' | 'duplicates' }
 */
router.post(
  "/record-fix",
  asyncHandler(async (req, res) => {
    const { issue_type } = req.body;

    if (!["frontmatter", "links", "duplicates"].includes(issue_type)) {
      return res.status(400).json({
        success: false,
        error: "Invalid issue_type. Must be: frontmatter, links, or duplicates",
      });
    }

    docsHealthMetrics.recordIssueFixed(issue_type);

    logger.info("[DocsHealth] Recorded issue fix", { issue_type });

    res.json({
      success: true,
      message: "Issue fix recorded",
    });
  }),
);

export default router;
