import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { asyncHandler } from '../middleware/errorHandler.js';
import docsHealthMetrics from '../services/docsHealthMetrics.js';
import { logger } from '../config/logger.js';
import { config } from '../config/appConfig.js';

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
  if (cachedAuditData && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedAuditData;
  }

  try {
    // Find latest audit directory in /tmp
    const tmpDir = '/tmp';
    const files = await fs.readdir(tmpDir);
    const auditDirs = files.filter((f) => f.startsWith('docs-audit-'));

    if (auditDirs.length === 0) {
      throw new Error('No audit data found. Run audit script first.');
    }

    // Get most recent audit directory
    const latestAuditDir = auditDirs.sort().reverse()[0];
    const auditPath = path.join(tmpDir, latestAuditDir);

    // Load JSON reports
    const frontmatterPath = path.join(auditPath, 'frontmatter.json');
    const linksPath = path.join(auditPath, 'links.json');
    const duplicatesPath = path.join(auditPath, 'duplicates.json');

    const [frontmatterData, linksData, duplicatesData] = await Promise.all([
      fs.readFile(frontmatterPath, 'utf-8').then(JSON.parse).catch(() => ({})),
      fs.readFile(linksPath, 'utf-8').then(JSON.parse).catch(() => ({})),
      fs.readFile(duplicatesPath, 'utf-8').then(JSON.parse).catch(() => ({})),
    ]);

    // Combine data
    const auditData = {
      frontmatter: frontmatterData,
      links: linksData,
      duplicates: duplicatesData,
      audit_date: latestAuditDir.replace('docs-audit-', ''),
      audit_path: auditPath,
    };

    // Update cache
    cachedAuditData = auditData;
    cacheTimestamp = Date.now();

    return auditData;
  } catch (error) {
    logger.error('[DocsHealth] Failed to load audit data:', error);
    throw error;
  }
}

/**
 * Find latest audit report markdown file
 */
async function findLatestReport() {
  try {
    const projectRoot = path.resolve(__dirname, '../../../../../'); // Up to project root
    const reportsDir = path.join(projectRoot, 'docs/reports');

    const files = await fs.readdir(reportsDir);
    const auditReports = files.filter(
      (f) => f.match(/^\d{4}-\d{2}-\d{2}-documentation-audit\.md$/)
    );

    if (auditReports.length === 0) {
      return null;
    }

    // Get most recent report
    const latestReport = auditReports.sort().reverse()[0];
    const reportPath = path.join(reportsDir, latestReport);

    // Read report metadata (first 50 lines for frontmatter + summary)
    const reportContent = await fs.readFile(reportPath, 'utf-8');
    const lines = reportContent.split('\n').slice(0, 50);

    return {
      report_date: latestReport.replace('-documentation-audit.md', ''),
      report_path: reportPath,
      report_file: latestReport,
      preview: lines.join('\n'),
    };
  } catch (error) {
    logger.error('[DocsHealth] Failed to find latest report:', error);
    return null;
  }
}

/**
 * GET /api/v1/docs/health/summary
 * High-level health summary
 */
router.get(
  '/summary',
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
      logger.warn('[DocsHealth] No audit data available, returning defaults', error.message);
      
      res.json({
        success: true,
        data: {
          healthScore: 0,
          grade: 'N/A',
          status: 'No Data',
          lastAuditDate: null,
          totalFiles: 0,
          issuesSummary: {
            frontmatter: 0,
            links: 0,
            duplicates: 0,
            outdated: 0,
          },
          hasData: false,
          message: 'No audit data available. Run the documentation audit script to generate health metrics.',
        },
      });
    }
  })
);

/**
 * GET /api/v1/docs/health/metrics
 * Detailed metrics from Prometheus gauges
 */
router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const metrics = await docsHealthMetrics.getHealthMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  })
);

/**
 * GET /api/v1/docs/health/issues
 * Detailed issue breakdown with pagination
 * Query params: type (frontmatter|links|duplicates|outdated), limit (default 50)
 */
router.get(
  '/issues',
  asyncHandler(async (req, res) => {
    const { type, limit = 50 } = req.query;
    
    let auditData;
    try {
      auditData = await loadAuditData();
    } catch (error) {
      // Graceful degradation when no audit data exists
      logger.warn('[DocsHealth] No audit data for issues endpoint', error.message);
      return res.json({
        success: true,
        data: {
          type,
          total: 0,
          showing: 0,
          issues: [],
          hasData: false,
          message: 'No audit data available. Run the documentation audit script first.',
        },
      });
    }

    let issues = [];

    switch (type) {
      case 'frontmatter':
        issues = (auditData.frontmatter.missing_files || []).map((file) => ({
          file: file.path,
          issue: 'Missing frontmatter',
          severity: 'critical',
          details: file.missing_fields || [],
        }));
        break;

      case 'links':
        issues = (auditData.links.broken_links_list || []).map((link) => ({
          file: link.file,
          line: link.line,
          link_text: link.text,
          url: link.url,
          error: link.error,
          priority: link.priority || 'warning',
        }));
        break;

      case 'duplicates':
        issues = (auditData.duplicates.exact_duplicate_groups || []).map((group) => ({
          files: group.files,
          hash: group.hash,
          count: group.count,
          category: 'exact_duplicate',
        }));
        break;

      case 'outdated':
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
          error: 'Invalid issue type. Must be: frontmatter, links, duplicates, or outdated',
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
  })
);

/**
 * Query Prometheus range vector
 * @param {string} query - PromQL query
 * @param {number} start - Start timestamp (seconds)
 * @param {number} end - End timestamp (seconds)
 * @param {string} step - Step interval (e.g., '1d', '1h')
 * @returns {Promise<Array>} Time series data points
 */
async function queryPrometheus(query, start, end, step = '1d') {
  try {
    const prometheusUrl = config.prometheus.url;
    const url = new URL('/api/v1/query_range', prometheusUrl);
    url.searchParams.append('query', query);
    url.searchParams.append('start', start.toString());
    url.searchParams.append('end', end.toString());
    url.searchParams.append('step', step);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Prometheus query failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status !== 'success' || !data.data?.result?.[0]?.values) {
      return [];
    }

    // Transform Prometheus data to our format
    return data.data.result[0].values.map(([timestamp, value]) => ({
      timestamp: new Date(timestamp * 1000).toISOString().split('T')[0],
      value: parseFloat(value),
    }));
  } catch (error) {
    logger.error('[DocsHealth] Prometheus query failed:', error);
    return [];
  }
}

/**
 * GET /api/v1/docs/health/trends
 * Historical trends data from Prometheus
 * Query params: days (default 30)
 */
router.get(
  '/trends',
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days);

    const now = Math.floor(Date.now() / 1000); // Prometheus uses seconds
    const start = now - daysNum * 24 * 60 * 60;

    // Query Prometheus for historical metrics
    const [healthScoreTrend, brokenLinksTrend, outdatedDocsTrend] = await Promise.all([
      queryPrometheus('docs_health_score', start, now),
      queryPrometheus('sum(docs_links_broken)', start, now),
      queryPrometheus('docs_outdated_count', start, now),
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
        has_data: healthScoreTrend.length > 0 || brokenLinksTrend.length > 0 || outdatedDocsTrend.length > 0,
      },
    });
  })
);

/**
 * GET /api/v1/docs/health/latest-report
 * Latest audit report metadata
 */
router.get(
  '/latest-report',
  asyncHandler(async (req, res) => {
    const report = await findLatestReport();

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'No audit reports found',
      });
    }

    // Parse summary statistics from preview
    const lines = report.preview.split('\n');
    let healthScore = null;
    let issueCount = null;

    for (const line of lines) {
      if (line.includes('Health Score:')) {
        const match = line.match(/(\d+\.?\d*)/);
        if (match) healthScore = parseFloat(match[1]);
      }
      if (line.includes('Total Issues:') || line.includes('issues found')) {
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
  })
);

/**
 * POST /api/v1/docs/health/update-metrics
 * Update Prometheus metrics from audit data
 * Called by CI/CD workflow after audit run
 */
router.post(
  '/update-metrics',
  asyncHandler(async (req, res) => {
    const auditData = req.body;

    if (!auditData || !auditData.frontmatter) {
      return res.status(400).json({
        success: false,
        error: 'Invalid audit data. Must include frontmatter, links, and duplicates',
      });
    }

    // Update all Prometheus metrics
    docsHealthMetrics.updateHealthMetrics(auditData);
    docsHealthMetrics.recordAuditRun();

    // Clear cache to force reload
    cachedAuditData = null;
    cacheTimestamp = null;

    logger.info('[DocsHealth] Updated Prometheus metrics from audit data', {
      health_score: auditData.health_score,
      total_files: auditData.frontmatter.total_files,
      broken_links: auditData.links.broken_links,
    });

    res.json({
      success: true,
      message: 'Metrics updated successfully',
    });
  })
);

/**
 * POST /api/v1/docs/health/record-fix
 * Record issue fix (increments counter)
 * Body: { issue_type: 'frontmatter' | 'links' | 'duplicates' }
 */
router.post(
  '/record-fix',
  asyncHandler(async (req, res) => {
    const { issue_type } = req.body;

    if (!['frontmatter', 'links', 'duplicates'].includes(issue_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid issue_type. Must be: frontmatter, links, or duplicates',
      });
    }

    docsHealthMetrics.recordIssueFixed(issue_type);

    logger.info('[DocsHealth] Recorded issue fix', { issue_type });

    res.json({
      success: true,
      message: 'Issue fix recorded',
    });
  })
);

export default router;
