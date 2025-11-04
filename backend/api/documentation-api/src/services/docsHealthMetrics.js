import promClient from 'prom-client';

// Use the default registry for all metrics
const _register = promClient.register;

// Gauges - Current state metrics
const healthScore = new promClient.Gauge({
  name: 'docs_health_score',
  help: 'Overall documentation health score (0-100)',
});

const totalFiles = new promClient.Gauge({
  name: 'docs_total_files',
  help: 'Total number of markdown documentation files',
  labelNames: ['domain'],
});

const frontmatterComplete = new promClient.Gauge({
  name: 'docs_frontmatter_complete',
  help: 'Number of files with complete frontmatter',
});

const frontmatterMissing = new promClient.Gauge({
  name: 'docs_frontmatter_missing',
  help: 'Number of files missing frontmatter',
});

const frontmatterIncomplete = new promClient.Gauge({
  name: 'docs_frontmatter_incomplete',
  help: 'Number of files with incomplete frontmatter',
});

const linksTotal = new promClient.Gauge({
  name: 'docs_links_total',
  help: 'Total number of links found in documentation',
  labelNames: ['type'], // internal, external
});

const linksBroken = new promClient.Gauge({
  name: 'docs_links_broken',
  help: 'Number of broken links',
  labelNames: ['priority'], // critical, warning, info
});

const linksSuccessRate = new promClient.Gauge({
  name: 'docs_links_success_rate',
  help: 'Link success rate percentage',
});

const outdatedCount = new promClient.Gauge({
  name: 'docs_outdated_count',
  help: 'Number of documents older than threshold days',
});

const duplicateGroups = new promClient.Gauge({
  name: 'docs_duplicate_groups',
  help: 'Number of exact duplicate groups',
});

const duplicateSimilarTitles = new promClient.Gauge({
  name: 'docs_duplicate_similar_titles',
  help: 'Number of similar title pairs',
});

const duplicateSimilarSummaries = new promClient.Gauge({
  name: 'docs_duplicate_similar_summaries',
  help: 'Number of similar summary pairs',
});

const diagramsTotal = new promClient.Gauge({
  name: 'docs_diagrams_total',
  help: 'Total number of PlantUML diagrams',
});

const diagramsMissing = new promClient.Gauge({
  name: 'docs_diagrams_missing',
  help: 'Estimated number of guides without diagrams',
});

// Counters - Cumulative metrics
const auditRunsTotal = new promClient.Counter({
  name: 'docs_audit_runs_total',
  help: 'Total number of documentation audits executed',
});

const issuesFixedTotal = new promClient.Counter({
  name: 'docs_issues_fixed_total',
  help: 'Total number of documentation issues resolved',
  labelNames: ['issue_type'], // frontmatter, links, duplicates
});

// Histograms - Distribution metrics
const fileAgeDays = new promClient.Histogram({
  name: 'docs_file_age_days',
  help: 'Distribution of document ages in days',
  buckets: [0, 7, 30, 60, 90, 180, 365],
});

const fileSizeLines = new promClient.Histogram({
  name: 'docs_file_size_lines',
  help: 'Distribution of file sizes in lines',
  buckets: [0, 50, 100, 200, 500, 1000, 2000],
});

const auditDuration = new promClient.Histogram({
  name: 'docs_audit_duration_seconds',
  help: 'Duration of documentation audit execution',
  buckets: [1, 5, 10, 30, 60, 120],
});

class DocsHealthMetrics {
  constructor() {
    // Gauges
    this.healthScore = healthScore;
    this.totalFiles = totalFiles;
    this.frontmatterComplete = frontmatterComplete;
    this.frontmatterMissing = frontmatterMissing;
    this.frontmatterIncomplete = frontmatterIncomplete;
    this.linksTotal = linksTotal;
    this.linksBroken = linksBroken;
    this.linksSuccessRate = linksSuccessRate;
    this.outdatedCount = outdatedCount;
    this.duplicateGroups = duplicateGroups;
    this.duplicateSimilarTitles = duplicateSimilarTitles;
    this.duplicateSimilarSummaries = duplicateSimilarSummaries;
    this.diagramsTotal = diagramsTotal;
    this.diagramsMissing = diagramsMissing;

    // Counters
    this.auditRunsTotal = auditRunsTotal;
    this.issuesFixedTotal = issuesFixedTotal;

    // Histograms
    this.fileAgeDays = fileAgeDays;
    this.fileSizeLines = fileSizeLines;
    this.auditDuration = auditDuration;
  }

  /**
   * Update all health metrics from audit data
   * @param {Object} auditData - Combined data from frontmatter.json, links.json, duplicates.json
   */
  updateHealthMetrics(auditData) {
    try {
      // Extract data from audit reports
      const frontmatter = auditData.frontmatter || {};
      const links = auditData.links || {};
      const duplicates = auditData.duplicates || {};

      // Calculate health score (same logic as generate-audit-report.py lines 101-168)
      const healthScoreValue = this.calculateHealthScore(
        frontmatter,
        links,
        duplicates
      );
      this.healthScore.set(healthScoreValue);

      // Frontmatter metrics
      const totalFilesCount = frontmatter.total_files || 0;
      const completeCount = frontmatter.complete || 0;
      const missingCount = frontmatter.missing || 0;
      const incompleteCount = frontmatter.incomplete || 0;

      this.frontmatterComplete.set(completeCount);
      this.frontmatterMissing.set(missingCount);
      this.frontmatterIncomplete.set(incompleteCount);

      // Total files by domain
      if (frontmatter.by_domain) {
        Object.entries(frontmatter.by_domain).forEach(([domain, count]) => {
          this.totalFiles.set({ domain }, count);
        });
      } else {
        this.totalFiles.set({ domain: 'all' }, totalFilesCount);
      }

      // Link metrics
      const totalLinksCount = links.total_links || 0;
      const internalLinksCount = links.internal_links || 0;
      const externalLinksCount = links.external_links || 0;
      const brokenLinksCount = links.broken_links || 0;

      this.linksTotal.set({ type: 'internal' }, internalLinksCount);
      this.linksTotal.set({ type: 'external' }, externalLinksCount);

      // Broken links by priority
      if (links.broken_by_priority) {
        Object.entries(links.broken_by_priority).forEach(([priority, count]) => {
          this.linksBroken.set({ priority }, count);
        });
      } else {
        this.linksBroken.set({ priority: 'all' }, brokenLinksCount);
      }

      // Link success rate
      const successRate =
        totalLinksCount > 0
          ? ((totalLinksCount - brokenLinksCount) / totalLinksCount) * 100
          : 100;
      this.linksSuccessRate.set(successRate);

      // Outdated documents
      const outdatedDocsCount = frontmatter.outdated_count || 0;
      this.outdatedCount.set(outdatedDocsCount);

      // Duplicate metrics
      const exactDuplicates = duplicates.exact_duplicates || 0;
      const similarTitles = duplicates.similar_titles || 0;
      const similarSummaries = duplicates.similar_summaries || 0;

      this.duplicateGroups.set(exactDuplicates);
      this.duplicateSimilarTitles.set(similarTitles);
      this.duplicateSimilarSummaries.set(similarSummaries);

      // Diagram metrics
      const totalDiagrams = frontmatter.diagrams_count || 0;
      const _guidesWithDiagrams = frontmatter.guides_with_diagrams || 0;
      const guidesWithoutDiagrams = frontmatter.guides_without_diagrams || 0;

      this.diagramsTotal.set(totalDiagrams);
      this.diagramsMissing.set(guidesWithoutDiagrams);

      // File age distribution
      if (frontmatter.file_ages) {
        frontmatter.file_ages.forEach((age) => {
          this.fileAgeDays.observe(age);
        });
      }

      // File size distribution
      if (frontmatter.file_sizes) {
        frontmatter.file_sizes.forEach((size) => {
          this.fileSizeLines.observe(size);
        });
      }

      console.log('[DocsHealthMetrics] Updated all health metrics', {
        healthScore: healthScoreValue,
        totalFiles: totalFilesCount,
        brokenLinks: brokenLinksCount,
        successRate: successRate.toFixed(2),
      });
    } catch (error) {
      console.error('[DocsHealthMetrics] Failed to update health metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate overall health score (weighted average)
   * Based on generate-audit-report.py logic (lines 101-168)
   */
  calculateHealthScore(frontmatter, links, duplicates) {
    const weights = {
      frontmatter: 0.4, // 40% - Most critical
      links: 0.3, // 30% - Important for navigation
      duplicates: 0.3, // 30% - Content quality
    };

    // Frontmatter score (0-100)
    const totalFiles = frontmatter.total_files || 1;
    const completeFiles = frontmatter.complete || 0;
    const frontmatterScore = (completeFiles / totalFiles) * 100;

    // Links score (0-100)
    const totalLinks = links.total_links || 1;
    const brokenLinks = links.broken_links || 0;
    const linksScore = ((totalLinks - brokenLinks) / totalLinks) * 100;

    // Duplicates score (0-100)
    // Penalize duplicates: subtract 2 points per duplicate group (max penalty 50)
    const exactDuplicates = duplicates.exact_duplicates || 0;
    const duplicatePenalty = Math.min(exactDuplicates * 2, 50);
    const duplicatesScore = 100 - duplicatePenalty;

    // Calculate weighted average
    const overallScore =
      frontmatterScore * weights.frontmatter +
      linksScore * weights.links +
      duplicatesScore * weights.duplicates;

    return Math.round(overallScore * 10) / 10; // Round to 1 decimal
  }

  /**
   * Record audit execution
   */
  recordAuditRun() {
    this.auditRunsTotal.inc();
  }

  /**
   * Record issue fixed
   * @param {string} issueType - Type of issue (frontmatter, links, duplicates)
   */
  recordIssueFixed(issueType) {
    this.issuesFixedTotal.inc({ issue_type: issueType });
  }

  /**
   * Start audit timer
   * @returns {Function} End timer function
   */
  startAuditTimer() {
    return this.auditDuration.startTimer();
  }

  /**
   * Get current metric values as JSON
   * @returns {Object} Current metric values
   */
  async getHealthMetrics() {
    try {
      // Get gauge values
      const healthScoreValue = await this.getGaugeValue('docs_health_score');
      const totalFilesValue = await this.getGaugeSum('docs_total_files');
      const frontmatterCompleteValue = await this.getGaugeValue(
        'docs_frontmatter_complete'
      );
      const frontmatterMissingValue = await this.getGaugeValue(
        'docs_frontmatter_missing'
      );
      const linksBrokenValue = await this.getGaugeSum('docs_links_broken');
      const linksSuccessRateValue = await this.getGaugeValue(
        'docs_links_success_rate'
      );
      const outdatedCountValue = await this.getGaugeValue('docs_outdated_count');
      const duplicateGroupsValue = await this.getGaugeValue(
        'docs_duplicate_groups'
      );

      // Get counter values
      const auditRunsTotalValue = await this.getCounterValue(
        'docs_audit_runs_total'
      );
      const issuesFixedTotalValue = await this.getCounterValue(
        'docs_issues_fixed_total'
      );

      return {
        health_score: healthScoreValue,
        total_files: totalFilesValue,
        frontmatter_complete: frontmatterCompleteValue,
        frontmatter_missing: frontmatterMissingValue,
        links_broken: linksBrokenValue,
        links_success_rate: linksSuccessRateValue,
        outdated_count: outdatedCountValue,
        duplicate_groups: duplicateGroupsValue,
        audit_runs_total: auditRunsTotalValue,
        issues_fixed_total: issuesFixedTotalValue,
        grade: this.calculateGrade(healthScoreValue),
        status: this.calculateStatus(healthScoreValue),
      };
    } catch (error) {
      console.error('[DocsHealthMetrics] Failed to get health metrics:', error);
      throw error;
    }
  }

  /**
   * Get gauge metric value
   */
  async getGaugeValue(metricName) {
    const result = await promClient.register.getSingleMetric(metricName);
    if (!result) return 0;

    const metric = result.get();
    if (!metric || !metric.values || !Array.isArray(metric.values)) return 0;
    
    return metric.values.length > 0 ? metric.values[0].value : 0;
  }

  /**
   * Get sum of gauge values (for metrics with labels)
   */
  async getGaugeSum(metricName) {
    const result = await promClient.register.getSingleMetric(metricName);
    if (!result) return 0;

    const metric = result.get();
    if (!metric || !metric.values || !Array.isArray(metric.values)) return 0;
    
    return metric.values.reduce((sum, value) => sum + value.value, 0);
  }

  /**
   * Get counter metric value
   */
  async getCounterValue(metricName) {
    const result = await promClient.register.getSingleMetric(metricName);
    if (!result) return 0;

    const metric = result.get();
    if (!metric || !metric.values || !Array.isArray(metric.values)) return 0;
    
    return metric.values.reduce((sum, value) => sum + value.value, 0);
  }

  /**
   * Calculate grade from health score
   */
  calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Calculate status from health score
   */
  calculateStatus(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }
}

export default new DocsHealthMetrics();
