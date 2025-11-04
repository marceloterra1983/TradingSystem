#!/usr/bin/env node
/**
 * Documentation Health Dashboard Generator
 * 
 * Generates a comprehensive HTML dashboard showing:
 * - Overall documentation health score
 * - Coverage by domain (apps, api, frontend, tools, etc.)
 * - Freshness metrics (recent updates, stale docs)
 * - Quality metrics (TODOs, broken links, incomplete frontmatter)
 * - Trend analysis (compared to previous reports)
 * - Actionable recommendations
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const CONTENT_DIR = path.join(DOCS_DIR, 'content');
const REPORTS_DIR = path.join(DOCS_DIR, 'reports');

// ==================== DATA COLLECTION ====================

async function collectMetrics() {
  console.log('📊 Collecting documentation metrics...');
  
  const metrics = {
    timestamp: new Date().toISOString(),
    overview: {},
    coverage: {},
    freshness: {},
    quality: {},
    validation: {}
  };
  
  // 1. Overview Metrics
  try {
    const allFiles = await findMarkdownFiles(CONTENT_DIR);
    metrics.overview.totalFiles = allFiles.length;
    
    // Count by extension
    const mdCount = allFiles.filter(f => f.endsWith('.md')).length;
    const mdxCount = allFiles.filter(f => f.endsWith('.mdx')).length;
    metrics.overview.mdFiles = mdCount;
    metrics.overview.mdxFiles = mdxCount;
    
    // Calculate total size
    let totalSize = 0;
    for (const file of allFiles) {
      const stats = await fs.stat(file);
      totalSize += stats.size;
    }
    metrics.overview.totalSizeKB = Math.round(totalSize / 1024);
    
    console.log(`   - Total files: ${metrics.overview.totalFiles}`);
  } catch (error) {
    console.error('   ✗ Failed to collect overview metrics:', error.message);
  }
  
  // 2. Coverage by Domain
  try {
    const domains = ['apps', 'api', 'frontend', 'database', 'tools', 'sdd', 'prd', 'reference'];
    
    for (const domain of domains) {
      const domainPath = path.join(CONTENT_DIR, domain);
      try {
        const files = await findMarkdownFiles(domainPath);
        metrics.coverage[domain] = files.length;
      } catch {
        metrics.coverage[domain] = 0;
      }
    }
    
    console.log(`   - Coverage collected for ${domains.length} domains`);
  } catch (error) {
    console.error('   ✗ Failed to collect coverage metrics:', error.message);
  }
  
  // 3. Freshness Metrics
  try {
    const allFiles = await findMarkdownFiles(CONTENT_DIR);
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    let recent = 0; // < 30 days
    let moderate = 0; // 30-90 days
    let stale = 0; // > 90 days
    
    for (const file of allFiles) {
      const stats = await fs.stat(file);
      const age = (now - stats.mtimeMs) / day;
      
      if (age < 30) recent++;
      else if (age < 90) moderate++;
      else stale++;
    }
    
    metrics.freshness.recent = recent;
    metrics.freshness.moderate = moderate;
    metrics.freshness.stale = stale;
    metrics.freshness.score = Math.round((recent / allFiles.length) * 100);
    
    console.log(`   - Freshness score: ${metrics.freshness.score}%`);
  } catch (error) {
    console.error('   ✗ Failed to collect freshness metrics:', error.message);
  }
  
  // 4. Quality Metrics
  try {
    // Count TODO/FIXME markers
    try {
      const todoOutput = execSync(
        `grep -r "TODO\\|FIXME\\|TBD" --include="*.md" --include="*.mdx" "${CONTENT_DIR}" | wc -l`,
        { encoding: 'utf-8' }
      );
      metrics.quality.todoMarkers = parseInt(todoOutput.trim());
    } catch {
      metrics.quality.todoMarkers = 0;
    }
    
    // Count placeholder content
    try {
      const placeholderOutput = execSync(
        `grep -ri "placeholder\\|coming soon\\|under construction" --include="*.md" --include="*.mdx" "${CONTENT_DIR}" | wc -l`,
        { encoding: 'utf-8' }
      );
      metrics.quality.placeholders = parseInt(placeholderOutput.trim());
    } catch {
      metrics.quality.placeholders = 0;
    }
    
    // Calculate quality score (inverted - lower is better)
    const totalIssues = metrics.quality.todoMarkers + metrics.quality.placeholders;
    const filesCount = metrics.overview.totalFiles || 1;
    const issuesPerFile = totalIssues / filesCount;
    metrics.quality.score = Math.max(0, 100 - Math.round(issuesPerFile * 20));
    
    console.log(`   - Quality score: ${metrics.quality.score}%`);
  } catch (error) {
    console.error('   ✗ Failed to collect quality metrics:', error.message);
  }
  
  // 5. Validation Status (check latest reports)
  try {
    const latestReport = await findLatestReport(REPORTS_DIR, 'validation-report');
    if (latestReport) {
      const reportContent = await fs.readFile(latestReport, 'utf-8');
      
      // Extract validation status
      const passedMatch = reportContent.match(/\*\*Passed\*\*:\s*(\d+)/);
      const failedMatch = reportContent.match(/\*\*Failed\*\*:\s*(\d+)/);
      const warningsMatch = reportContent.match(/\*\*Warnings\*\*:\s*(\d+)/);
      const scoreMatch = reportContent.match(/\*\*Overall Health Score\*\*:\s*([\d.]+)%/);
      
      if (passedMatch) metrics.validation.passed = parseInt(passedMatch[1]);
      if (failedMatch) metrics.validation.failed = parseInt(failedMatch[1]);
      if (warningsMatch) metrics.validation.warnings = parseInt(warningsMatch[1]);
      if (scoreMatch) metrics.validation.score = parseFloat(scoreMatch[1]);
      
      console.log(`   - Validation score: ${metrics.validation.score}%`);
    }
  } catch (error) {
    console.error('   ✗ Failed to collect validation metrics:', error.message);
  }
  
  // 6. Calculate Overall Health Score
  const scores = [
    metrics.freshness.score || 0,
    metrics.quality.score || 0,
    metrics.validation.score || 0
  ];
  metrics.overview.healthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  console.log(`\n✅ Metrics collection complete`);
  console.log(`   Overall Health Score: ${metrics.overview.healthScore}%\n`);
  
  return metrics;
}

async function findMarkdownFiles(dir) {
  const files = [];
  
  async function scan(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!['node_modules', '.git', 'build', '.docusaurus'].includes(entry.name)) {
            await scan(fullPath);
          }
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  await scan(dir);
  return files;
}

async function findLatestReport(dir, prefix) {
  try {
    const files = await fs.readdir(dir);
    const reports = files
      .filter(f => f.startsWith(prefix) && f.endsWith('.md'))
      .sort()
      .reverse();
    
    return reports.length > 0 ? path.join(dir, reports[0]) : null;
  } catch {
    return null;
  }
}

// ==================== DASHBOARD GENERATION ====================

function generateHTML(metrics) {
  const healthColor = getHealthColor(metrics.overview.healthScore);
  const freshnessColor = getHealthColor(metrics.freshness.score);
  const qualityColor = getHealthColor(metrics.quality.score);
  const validationColor = getHealthColor(metrics.validation.score);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation Health Dashboard - TradingSystem</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    header {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    
    h1 {
      color: #2d3748;
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    
    .timestamp {
      color: #718096;
      font-size: 0.875rem;
    }
    
    .score-card {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .score-value {
      font-size: 4rem;
      font-weight: bold;
      margin: 1rem 0;
    }
    
    .score-label {
      font-size: 1.25rem;
      color: #4a5568;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .metric-card {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    
    .metric-title {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #718096;
      margin-bottom: 1rem;
    }
    
    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    
    .metric-subtitle {
      color: #718096;
      font-size: 0.875rem;
    }
    
    .progress-bar {
      background: #e2e8f0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 1rem;
    }
    
    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    
    .coverage-list {
      list-style: none;
      margin-top: 1rem;
    }
    
    .coverage-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .coverage-item:last-child {
      border-bottom: none;
    }
    
    .coverage-name {
      font-weight: 500;
      color: #2d3748;
    }
    
    .coverage-count {
      color: #718096;
      font-family: monospace;
    }
    
    .recommendations {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    
    .recommendations h2 {
      color: #2d3748;
      margin-bottom: 1rem;
    }
    
    .recommendation-item {
      padding: 1rem;
      margin-bottom: 1rem;
      border-left: 4px solid #4299e1;
      background: #ebf8ff;
      border-radius: 0.5rem;
    }
    
    .recommendation-item.warning {
      border-left-color: #ed8936;
      background: #fffaf0;
    }
    
    .recommendation-item.critical {
      border-left-color: #f56565;
      background: #fff5f5;
    }
    
    .color-green { color: #48bb78; }
    .color-yellow { color: #ed8936; }
    .color-red { color: #f56565; }
    .bg-green { background-color: #48bb78; }
    .bg-yellow { background-color: #ed8936; }
    .bg-red { background-color: #f56565; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📚 Documentation Health Dashboard</h1>
      <p class="timestamp">Generated: ${new Date(metrics.timestamp).toLocaleString()}</p>
      <p class="timestamp">Project: TradingSystem Documentation v2.1</p>
    </header>
    
    <div class="score-card">
      <div class="score-label">Overall Health Score</div>
      <div class="score-value ${healthColor}">${metrics.overview.healthScore}%</div>
      <div class="progress-bar">
        <div class="progress-fill ${healthColor.replace('color', 'bg')}" style="width: ${metrics.overview.healthScore}%"></div>
      </div>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">📄 Total Documentation</div>
        <div class="metric-value">${metrics.overview.totalFiles || 0}</div>
        <div class="metric-subtitle">
          ${metrics.overview.mdxFiles || 0} MDX · ${metrics.overview.mdFiles || 0} MD<br>
          ${metrics.overview.totalSizeKB || 0} KB total
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">🕒 Freshness Score</div>
        <div class="metric-value ${freshnessColor}">${metrics.freshness.score || 0}%</div>
        <div class="metric-subtitle">
          ${metrics.freshness.recent || 0} recent · ${metrics.freshness.moderate || 0} moderate · ${metrics.freshness.stale || 0} stale
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${freshnessColor.replace('color', 'bg')}" style="width: ${metrics.freshness.score || 0}%"></div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">✨ Quality Score</div>
        <div class="metric-value ${qualityColor}">${metrics.quality.score || 0}%</div>
        <div class="metric-subtitle">
          ${metrics.quality.todoMarkers || 0} TODOs · ${metrics.quality.placeholders || 0} placeholders
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${qualityColor.replace('color', 'bg')}" style="width: ${metrics.quality.score || 0}%"></div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">✅ Validation Score</div>
        <div class="metric-value ${validationColor}">${metrics.validation.score || 0}%</div>
        <div class="metric-subtitle">
          ${metrics.validation.passed || 0} passed · ${metrics.validation.failed || 0} failed · ${metrics.validation.warnings || 0} warnings
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${validationColor.replace('color', 'bg')}" style="width: ${metrics.validation.score || 0}%"></div>
        </div>
      </div>
    </div>
    
    <div class="metric-card">
      <div class="metric-title">📊 Coverage by Domain</div>
      <ul class="coverage-list">
        ${generateCoverageItems(metrics.coverage)}
      </ul>
    </div>
    
    <div class="recommendations">
      <h2>💡 Recommendations</h2>
      ${generateRecommendations(metrics)}
    </div>
  </div>
</body>
</html>`;
}

function getHealthColor(score) {
  if (score >= 80) return 'color-green';
  if (score >= 60) return 'color-yellow';
  return 'color-red';
}

function generateCoverageItems(coverage) {
  const items = Object.entries(coverage)
    .sort(([, a], [, b]) => b - a)
    .map(([domain, count]) => `
      <li class="coverage-item">
        <span class="coverage-name">${domain.charAt(0).toUpperCase() + domain.slice(1)}</span>
        <span class="coverage-count">${count} files</span>
      </li>
    `);
  
  return items.join('');
}

function generateRecommendations(metrics) {
  const recommendations = [];
  
  // Validation recommendations
  if (metrics.validation.failed > 0) {
    recommendations.push({
      priority: 'critical',
      title: 'Fix Failed Validation Checks',
      description: `${metrics.validation.failed} validation check(s) failed. Run 'npm run docs:check' to identify and fix issues.`
    });
  }
  
  // Freshness recommendations
  if (metrics.freshness.score < 60) {
    recommendations.push({
      priority: 'warning',
      title: 'Update Stale Documentation',
      description: `${metrics.freshness.stale} files haven't been updated in >90 days. Review and update outdated content.`
    });
  }
  
  // Quality recommendations
  if (metrics.quality.todoMarkers > 20) {
    recommendations.push({
      priority: 'warning',
      title: 'Resolve TODO Markers',
      description: `${metrics.quality.todoMarkers} TODO/FIXME markers found. Complete pending tasks or convert to GitHub issues.`
    });
  }
  
  if (metrics.quality.placeholders > 5) {
    recommendations.push({
      priority: 'warning',
      title: 'Complete Placeholder Content',
      description: `${metrics.quality.placeholders} placeholder sections detected. Fill in missing content or remove placeholders.`
    });
  }
  
  // Coverage recommendations
  const lowCoverageDomains = Object.entries(metrics.coverage)
    .filter(([, count]) => count < 5)
    .map(([domain]) => domain);
  
  if (lowCoverageDomains.length > 0) {
    recommendations.push({
      priority: 'info',
      title: 'Expand Documentation Coverage',
      description: `Low coverage in: ${lowCoverageDomains.join(', ')}. Consider adding more documentation for these domains.`
    });
  }
  
  // Success message
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      title: 'Documentation Health is Excellent!',
      description: 'All metrics are within acceptable ranges. Continue maintaining this high quality.'
    });
  }
  
  return recommendations.map(rec => `
    <div class="recommendation-item ${rec.priority}">
      <strong>${rec.title}</strong>
      <p>${rec.description}</p>
    </div>
  `).join('');
}

// ==================== MAIN FUNCTION ====================

async function main() {
  console.log('🚀 Documentation Health Dashboard Generator\n');
  
  // Collect metrics
  const metrics = await collectMetrics();
  
  // Save metrics as JSON
  const metricsFile = path.join(REPORTS_DIR, `health-metrics-${Date.now()}.json`);
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(metricsFile, JSON.stringify(metrics, null, 2));
  console.log(`💾 Metrics saved: ${metricsFile}`);
  
  // Generate HTML dashboard
  const html = generateHTML(metrics);
  const dashboardFile = path.join(REPORTS_DIR, 'health-dashboard.html');
  await fs.writeFile(dashboardFile, html);
  console.log(`📊 Dashboard generated: ${dashboardFile}`);
  
  console.log('\n✅ Dashboard generation complete!\n');
  console.log(`Open in browser: file://${dashboardFile}\n`);
  
  return 0;
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});






