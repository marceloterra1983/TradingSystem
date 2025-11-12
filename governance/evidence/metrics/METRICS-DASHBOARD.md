# Metrics Dashboard

## 1. Overview

- **Purpose**: Visualize documentation health, quality, and operational metrics.
- **Components**: Static HTML dashboard, React dashboard page, Documentation API endpoint, Grafana monitoring.
- **Data Sources**: `frontmatter-validation-latest.json`, `maintenance-audit-*.md`, Prometheus metrics.
- **Update Frequency**: Documentation API (real time), dashboards (on demand), Grafana (5-minute refresh).

## 2. Dashboards

### 2.1 Standalone HTML Dashboard

- **Location**: `docs/static/dashboard/index.html`
- **URL**: `http://localhost:3400/dashboard/` (local), `https://docs.tradingsystem.com/dashboard/` (production)
- **Technology**: HTML + Tailwind CSS + Chart.js
- **Data Source**: `/dashboard/metrics.json` (mirrored at `/metrics/`)
- **Features**:
  - Health score card with grade badge and color coding
  - Freshness distribution bar chart
  - Issue breakdown doughnut chart
  - Coverage by owner horizontal bar chart
  - Coverage by category horizontal bar chart
  - 30-day trend line chart
  - Auto refresh every 5 minutes, responsive layout
- **Use Cases**: Quick health glance, shareable inside docs site, public visibility.

### 2.2 React Dashboard Page

- **Location**: `frontend/dashboard/src/components/pages/DocumentationMetricsPage.tsx`
- **URL**: `http://localhost:9080/documentation/metrics`
- **Technology**: React + TypeScript + Recharts + Tailwind CSS
- **Data Source**: `/api/docs/api/v1/docs/health/dashboard-metrics`
- **Features**:
  - Interactive charts (hover, tooltips, thresholds)
  - Coverage breakdown by owner and by category
  - Real-time data via Documentation API
  - Dark mode support and layout consistency
  - Drill-down links to issue lists (planned)
- **Use Cases**: Internal monitoring, deep analysis, operational review.

### 2.3 Grafana Dashboard

- **Location**: `tools/monitoring/grafana/dashboards/documentation-health.json`
- **URL**: `http://localhost:3000/d/docs-health/documentation-health-dashboard`
- **Technology**: Grafana + Prometheus
- **Data Source**: Prometheus (`docs_health_score`, `docs_links_broken`, etc.)
- **Features**:
  - 9 panels: gauges, time-series, tables
  - Domain filters and adjustable thresholds
  - Alerting for health score drops and issue spikes
  - Long-term trend analysis
- **Use Cases**: Ops monitoring, alerting, executive reporting.

## 3. Metrics Explained

### 3.1 Health Score

- **Definition**: Weighted documentation quality score (0-100).
- **Formula**: `100 - (issues_found * 100 / max_issues)` where `max_issues = total_files * 3`.
- **Components**: Frontmatter (40%), links (30%), content quality (30%).
- **Grades**: A (90-100), B (80-89), C (70-79), D (60-69), F (<60).
- **Status**: Excellent (90+), Good (80-89), Fair (70-79), Poor (60-69), Critical (<60).
- **Trend**: Improving (>5 point increase in 7 days), declining (>5 point drop), stable (±5).

### 3.2 Freshness Distribution

- **Definition**: Last review age buckets per file.
- **Ranges**: `<30`, `30-60`, `60-90`, `>90` days.
- **Target**: 80%+ of files under 90 days.
- **Source**: `frontmatter-validation-latest.json` freshness analysis.

### 3.3 Issue Breakdown

- **Types**:
  - Frontmatter (missing, incomplete, invalid values)
  - Links (broken internal/external links)
  - Content (stale files, short content)
- **Severity**:
  - Critical: missing frontmatter, broken links
  - High: invalid frontmatter values
  - Medium: stale files
  - Low: short files
- **Source**: `maintenance-audit-*.md`, frontmatter validation report.

### 3.4 Coverage by Section

- **By Owner**: Files per owner (DocsOps, BackendGuild, etc.).
- **By Category**: API, Apps, Frontend, Tools, Reference.
- **Purpose**: Identify ownership balance and maintenance responsibilities.
- **Source**: Owner distribution plus file path inference.

### 3.5 Historical Trends

- **Metrics**: Health score, total issues, stale file counts.
- **Source**: Prometheus (`docs_health_score`), `metrics-history.json`.
- **Usage**: Track regressions, show improvement, feed quarterly reviews.

## 4. Data Sources

### 4.1 Frontmatter Validation Report

- **File**: `docs/reports/frontmatter-validation-latest.json`
- **Generator**: `scripts/docs/validate-frontmatter.py`
- **Frequency**: Daily CI + manual runs
- **Contains**: Summary stats, freshness analysis, owner distribution, issue lists.

### 4.2 Maintenance Audit Report

- **File**: `docs/reports/maintenance-audit-YYYY-MM-DD_HH-MM-SS.md`
- **Generator**: `scripts/docs/maintenance-audit.sh`
- **Frequency**: Daily CI + manual runs
- **Contains**: Health score, issue counts, recommendations, status summary.

### 4.3 Prometheus Metrics

- **Endpoint**: `http://localhost:3402/metrics`
- **Metrics**: `docs_health_score`, `docs_total_files`, `docs_links_broken`, `docs_frontmatter_missing`, `docs_outdated_count`.
- **Generator**: Documentation API (`docsHealthMetrics.js`).

### 4.4 Documentation API

- **Base**: `http://localhost:3402/api/v1/docs/health`
- **Endpoints**:
  - `/summary`
  - `/metrics`
  - `/trends?days=30`
  - `/issues?type=frontmatter`
  - `/dashboard-metrics`
- **Format**: `{ success, data }`

## 5. Metrics Aggregation

### 5.1 Aggregation Script

- **Script**: `scripts/docs/generate-metrics-dashboard.mjs`
- **Purpose**: Parse reports, compute aggregates, update history.
- **Outputs**:
  - `docs/static/dashboard/metrics.json`
  - `docs/static/metrics/index.json`
  - `docs/reports/metrics-history.json`
- **Usage**:
  ```bash
  node scripts/docs/generate-metrics-dashboard.mjs
  node scripts/docs/generate-metrics-dashboard.mjs --verbose
  ```

### 5.2 Historical Tracking

- **File**: `docs/reports/metrics-history.json`
- **Contents**: Array of `{date, healthScore, issueCount, freshnessRate, totalFiles}`
- **Retention**: 90 days (rolling window)
- **Purpose**: Chart trends when Prometheus unavailable.

## 6. Grafana Integration

### 6.1 Setup (Prometheus Data Source)

1. Start Prometheus and Grafana via Docker Compose.
2. Import dashboard: `tools/monitoring/grafana/dashboards/documentation-health.json`.
3. Select Prometheus data source.

### 6.2 Alternative: JSON API Data Source

If Prometheus is offline, use Grafana JSON API plugin.

```bash
grafana-cli plugins install simpod-json-datasource
```

Configure data source with URL `http://localhost:3402/api/v1/docs/health/dashboard-metrics` or dedicated `/grafana` endpoint (extension required).

### 6.3 Alerting

- Health score < 70 for 10 minutes
- Broken links > 10
- Outdated docs > 20% of total
- Frontmatter compliance < 95%

Configure alerts per panel using Grafana alert rules.

## 7. Usage Guide

### 7.1 Viewing Dashboards

```bash
# Standalone HTML dashboard
cd docs
npm run docs:dev
# Open http://localhost:3400/dashboard/

# React dashboard
cd frontend/dashboard
npm run dev
# Navigate to http://localhost:9080/documentation/metrics

# Grafana
docker compose -f tools/compose/docker-compose.apps.yml up -d grafana
# Open http://localhost:3000/d/docs-health/documentation-health-dashboard
```

### 7.2 Updating Metrics

```bash
bash scripts/docs/maintenance-audit.sh
node scripts/docs/generate-metrics-dashboard.mjs
```

### 7.3 Interpreting Metrics

- **Health Score**: 90+ excellent, 80-89 good, 70-79 fair, 60-69 poor, <60 critical.
- **Freshness**: <90 days coverage above 80% = healthy.
- **Issues**: <10 ideal, 10-50 manageable, 50-100 elevated, >100 critical.

## 8. Maintenance

- **Daily**: Review health score, fix critical issues.
- **Weekly**: Check trends, update stale docs, prioritize broken links.
- **Monthly**: Audit ownership distribution, ensure freshness targets, update metrics history.
- **Quarterly**: Full documentation review, adjust scoring weights if needed.

## 9. Troubleshooting

### 9.1 Dashboard Not Loading

- Verify docs dev server: `curl http://localhost:3400/dashboard/`
- Confirm `metrics.json` exists.
- Regenerate metrics script.

### 9.2 Metrics Not Updating

- Run audit script.
- Check Documentation API: `curl http://localhost:3402/api/v1/docs/health/summary`
- Inspect API logs for parsing errors.

### 9.3 Incorrect Metrics

- Compare values with latest audit report.
- Verify health score formula in `maintenance-audit.sh` and `docsHealthMetrics.js`.
- Ensure metrics history trimmed to 90 days.

## 10. Related Documentation

- [Maintenance Checklist](./MAINTENANCE-CHECKLIST.md)
- [Automated Maintenance Guide](./AUTOMATED-MAINTENANCE-GUIDE.md)
- [CI/CD Integration](./CI-CD-INTEGRATION.md)
- [Validation Guide](./VALIDATION-GUIDE.md)
- `scripts/docs/maintenance-audit.sh`
- `scripts/docs/validate-frontmatter.py`
- `backend/api/documentation-api/src/routes/docs-health.js`
- `tools/monitoring/grafana/dashboards/documentation-health.json`

---

- **Version**: 1.0.0
- **Last Updated**: 2025-11-03
- **Maintained By**: DocsOps Team
- **Status**: Active
