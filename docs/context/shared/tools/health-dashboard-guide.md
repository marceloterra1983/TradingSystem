---
title: Documentation Health Dashboard Guide
sidebar_position: 46
tags: [shared, tools, dashboard, health, metrics, monitoring]
domain: shared
type: guide
summary: Complete guide for using documentation health dashboards (Docusaurus and Grafana) to monitor and improve documentation quality
status: active
last_review: 2025-10-18
---

# Documentation Health Dashboard Guide

## Overview

The Documentation Health Dashboard provides comprehensive monitoring of documentation quality through two complementary interfaces:

1. **Docusaurus Dashboard** (Developer-focused) - Rich issue details and actionable insights
2. **Grafana Dashboard** (Ops-focused) - Real-time metrics and historical trends

Both dashboards work together to provide 360° visibility into documentation health, updated automatically through daily audits.

## Quick Start

### Access the Dashboards

**Docusaurus Dashboard**: `http://localhost:3004/health`
**Grafana Dashboard**: `http://localhost:3000/d/docs-health`

### Understanding Health Score

The overall health score (0-100) is a weighted average of three key factors:

- **Frontmatter Compliance (40%)**: Completeness of YAML frontmatter
- **Link Success Rate (30%)**: Percentage of working links
- **Content Quality (30%)**: Duplicate detection and freshness

**Grades**:
- A (90-100): Excellent
- B (80-89): Good
- C (70-79): Fair
- D (60-69): Poor
- F (`<60`): Critical

### Key Metrics at a Glance

- **Total Files**: 195 markdown documents
- **Health Score**: 92/100 (Grade: A-)
- **Link Success Rate**: 94.9%
- **Frontmatter Compliance**: 100%
- **Outdated Docs**: 0 (>90 days old)

## Docusaurus Dashboard

### Features

**Overview Cards** (4 main metrics):
- Overall Health Score with grade and status
- Link Health with broken link count
- Frontmatter Compliance percentage
- Content Freshness (outdated count)

**Metrics Grid** (quick stats):
- Total Documents count
- Duplicate Groups found
- Last Audit Date

**Issues Breakdown** (tabbed tables):
- Broken Links: File, line, link text, error, priority
- Outdated Docs: File, last review, days old, domain
- Missing Frontmatter: File, missing fields, severity
- Duplicates: Analysis and intentional pairs

**Quick Actions**:
- View Documentation Guide
- View CI/CD Workflows
- Dashboard User Guide
- Export Report (print-friendly)

### Using the Dashboard

#### 1. Check Overall Health

Open `http://localhost:3004/health` and review the overview cards:

- **Health Score >90**: Documentation is in excellent shape
- **Health Score 80-90**: Good, but monitor for degradation
- **Health Score `<80`**: Action needed, review issues immediately

#### 2. Identify Critical Issues

Click on the **Broken Links** tab to see the highest priority issues:

- **Critical** (red badge): Documentation cross-references (must fix)
- **Warning** (yellow badge): Repository links (should fix)
- **Info** (blue badge): External links (monitor)

Filter by priority and fix critical issues first.

#### 3. Fix Issues

For each broken link:

1. Note the **file path** and **line number**
2. Open the file in your editor
3. Fix or remove the broken link
4. Verify using local validation: `python scripts/docs/check-links.py --skip-external`
5. Commit the fix with descriptive message

#### 4. Track Progress

The dashboard auto-refreshes every 5 minutes. After fixing issues:

- Click the **Refresh** button for immediate update
- Watch the health score improve
- Check trend charts for long-term progress

#### 5. Export Reports

Click **Export Report** (print icon) to generate a print-friendly version:

- Perfect for team meetings
- Stakeholder presentations
- Monthly progress reports

## Grafana Dashboard

### Features

**Row 1: Overview Panels**
- Overall Health Score gauge (0-100 with color thresholds)
- Total Documents stat
- Link Success Rate stat with mini graph
- Frontmatter Compliance stat with mini graph

**Row 2: Issue Breakdown**
- Issues by Type bar gauge (frontmatter, links, outdated, duplicates)
- Domain Distribution pie chart

**Row 3: Trend Graphs**
- Health Score Over Time (30-day line graph)
- Broken Links Trend (30-day reduction trend)
- Outdated Documents Trend (30-day tracking)

**Row 4: Audit Metrics**
- Recent Audit Runs (24h count)
- Issues Fixed (Last 7 Days) table by type

### Using the Dashboard

#### 1. Monitor Real-time Metrics

Open `http://localhost:3000/d/docs-health`:

- Gauges show current state (green/yellow/red)
- Graphs display 30-day trends
- Tables show recent activity

#### 2. Set Up Alerts

Configure Grafana alerts for proactive monitoring:

**Recommended Alerts**:
- Health score drops below 80 → Email notification
- Broken links exceed 50 → Slack message
- Frontmatter compliance below 95% → GitHub issue

**To Configure**:
1. Click panel menu → Edit
2. Go to Alert tab
3. Set condition: `docs_health_score < 80`
4. Add notification channel
5. Save

#### 3. Analyze Trends

Use time range selector (top-right) to view:

- **Last 7 days**: Weekly progress
- **Last 30 days**: Monthly trends (default)
- **Last 90 days**: Quarterly overview

Look for:
- ✅ **Upward health score trend**: Continuous improvement
- ⚠️ **Downward trend**: Investigation needed
- ➡️ **Flat trend**: Stable state

#### 4. Compare Domains

Use the **Domain Distribution** pie chart to identify:

- Which domain has most documentation (backend, frontend, ops, shared)
- Where to focus improvement efforts
- Team workload distribution

#### 5. Track Team Performance

The **Issues Fixed** table shows:

- How many issues resolved per type
- Team productivity over last 7 days
- Focus areas (frontmatter, links, duplicates)

## Understanding Metrics

### Health Score Calculation

```
Health Score = (
  Frontmatter Compliance × 40% +
  Link Success Rate × 30% +
  (100 - Duplicate Penalty) × 30%
)
```

**Example**:
- Frontmatter: 195/195 = 100% × 0.4 = 40 points
- Links: 500/527 = 94.9% × 0.3 = 28.5 points
- Duplicates: 0 groups, no penalty × 0.3 = 30 points
- **Total**: 98.5/100 (Grade: A)

### Link Success Rate

```
Success Rate = (Total Links - Broken Links) / Total Links × 100
```

**Thresholds**:
- `>95%`: Excellent (green)
- `90-95%`: Good (yellow)
- `<90%`: Needs attention (red)

### Frontmatter Compliance

```
Compliance = Files with Complete Frontmatter / Total Files × 100
```

**Complete Frontmatter** includes:
- title, tags, domain, type, summary, status, last_review

### Content Freshness

Documents are considered outdated if `last_review` is >90 days old.

```
Freshness Rate = (Total Files - Outdated Files) / Total Files × 100
```

### Priority Levels

**Critical** (must fix immediately):
- Broken documentation cross-references
- Missing required frontmatter fields
- 404 errors on internal links

**Warning** (should fix soon):
- Broken repository links (code references)
- Outdated documents (>90 days)
- Incomplete frontmatter

**Info** (monitor):
- External link timeouts (may be temporary)
- Anchor links to optional sections
- Duplicate similar titles (often intentional)

## Automation & Updates

### Daily Audit Workflow

**Schedule**: Runs automatically at 2 AM UTC daily

**Steps**:
1. Execute full documentation audit
2. Generate JSON reports (frontmatter, links, duplicates)
3. Update Prometheus metrics via API
4. Commit audit report to repository
5. Create GitHub issue if health degrades >5 points

**Workflow Location**: `.github/workflows/docs-audit-scheduled.yml`

### Manual Audit

Run audit locally anytime:

```bash
# Full audit with report generation
bash scripts/docs/audit-documentation.sh \
  --output ./docs/reports/manual-audit.md \
  --verbose

# Update Prometheus metrics
curl -X POST http://localhost:3400/api/v1/docs/health/update-metrics \
  -H "Content-Type: application/json" \
  -d @/tmp/docs-audit-*/combined-metrics.json
```

### Trigger via GitHub Actions

1. Go to repository on GitHub
2. Click **Actions** tab
3. Select **Documentation Health Audit**
4. Click **Run workflow** button
5. Optionally adjust parameters (threshold days, skip external)
6. Click **Run workflow** to start

## Troubleshooting

### Dashboard Shows No Data

**Symptom**: Empty cards or "Loading..." message

**Solutions**:
1. Check Documentation API is running:
   ```bash
   curl http://localhost:3400/health
   ```

2. Run audit to generate data:
   ```bash
   bash scripts/docs/audit-documentation.sh
   ```

3. Verify API routes are accessible:
   ```bash
   curl http://localhost:3400/api/v1/docs/health/summary
   ```

4. Check browser console for errors (F12)

### Metrics Are Outdated

**Symptom**: Dashboard shows old data

**Solutions**:
1. Trigger manual audit (see above)
2. Call update endpoint manually
3. Wait for next scheduled audit (2 AM UTC)
4. Check last audit date in dashboard

### Grafana Dashboard Not Loading

**Symptom**: Grafana shows "No data" or connection errors

**Solutions**:
1. Verify Prometheus is scraping Documentation API:
   - Open `http://localhost:9090/targets`
   - Check `documentation-api` status (should be UP)

2. Verify metrics are exported:
   ```bash
   curl http://localhost:3400/metrics | grep docs_
   ```

3. Check Prometheus query in panel:
   - Edit panel → Metrics → Query: `docs_health_score`
   - Should return numeric value

4. Restart Prometheus if needed:
   ```bash
   docker compose -f infrastructure/monitoring/docker-compose.yml restart prometheus
   ```

### API Errors (CORS, 404, 500)

**CORS Error**:
- Add `http://localhost:3004` to CORS_ORIGIN in `.env`
- Restart Documentation API

**404 Not Found**:
- Verify API route is registered in `server.js`
- Check `docsHealthRoutes` import and mount point

**500 Internal Error**:
- Check API logs: `docker logs docs-documentation-api`
- Verify audit JSON files exist: `/tmp/docs-audit-*/`
- Ensure JSON structure matches expected format

### Audit Workflow Fails

**Symptom**: GitHub Actions workflow shows red X

**Solutions**:
1. Review workflow logs in Actions tab
2. Check Python dependencies are installed
3. Verify audit scripts have execute permissions:
   ```bash
   chmod +x scripts/docs/audit-documentation.sh
   ```
4. Ensure docs directories exist and are accessible

## Best Practices

### For Developers

✅ **DO**:
- Check dashboard weekly before planning work
- Fix critical issues (broken links, missing frontmatter) immediately
- Update `last_review` date when reviewing documents
- Use issue tables to identify files needing attention
- Export metrics for sprint retrospectives

❌ **DON'T**:
- Ignore health score drops (investigate root cause)
- Skip frontmatter fields (all are required for compliance)
- Create broken links (validate before committing)
- Leave documents outdated (update or archive)

### For Ops Team

✅ **DO**:
- Set up Grafana alerts for health degradation
- Monitor 30-day trends for patterns
- Review audit workflow logs monthly
- Document alert response procedures
- Share dashboard URL with team in onboarding

❌ **DON'T**:
- Disable automated audits (continuous monitoring is critical)
- Ignore alert notifications (they indicate real issues)
- Forget to update dashboard after infrastructure changes
- Skip reviewing historical trends

### For Management

✅ **DO**:
- Review health score in monthly team meetings
- Track improvement trends over quarters
- Celebrate team achievements (A grades, zero broken links)
- Allocate time for documentation maintenance
- Use metrics for planning and resource allocation

❌ **DON'T**:
- Focus only on feature development (docs need maintenance)
- Penalize temporary score drops (improvements take time)
- Compare teams unfairly (different domain complexities)

## Integration with Development Workflow

### Pre-commit Hooks (Phase 9)

The health dashboard integrates with pre-commit hooks:

- Hooks validate frontmatter before commit
- Prevents invalid YAML from reaching repository
- Dashboard shows 100% compliance as result

### Link Validation (Phase 8)

Daily link validation workflow feeds data to dashboard:

- Runs at 3 AM UTC (after health audit at 2 AM)
- Prevents new broken links from being merged
- Dashboard displays link success rate improvements

### Search Analytics (Phase 12)

Dashboard shows search metrics alongside health:

- Identify popular documentation topics
- Find content gaps (zero-result queries)
- Improve documentation based on user needs

## Related Documentation

- [Implementation Report](../../reports/2025-10-18-phase13-health-dashboard.md)
- [Automated Code Quality](../ops/automated-code-quality.md)
- [Documentation Standard](../DOCUMENTATION-STANDARD.md)
- [Audit Scripts](../../../scripts/docs/README.md)

## Appendix

### API Endpoints Reference

**Health Summary**: `GET /api/v1/docs/health/summary`
**Detailed Metrics**: `GET /api/v1/docs/health/metrics`
**Issue Breakdown**: `GET /api/v1/docs/health/issues?type={type}&limit={limit}`
**Historical Trends**: `GET /api/v1/docs/health/trends?days={days}`
**Latest Report**: `GET /api/v1/docs/health/latest-report`
**Update Metrics**: `POST /api/v1/docs/health/update-metrics`
**Record Fix**: `POST /api/v1/docs/health/record-fix`

### Prometheus Metrics List

All metrics prefixed with `docs_`:

- `health_score` (gauge)
- `total_files` (gauge, labeled by domain)
- `frontmatter_complete` (gauge)
- `frontmatter_missing` (gauge)
- `links_total` (gauge, labeled by type)
- `links_broken` (gauge, labeled by priority)
- `links_success_rate` (gauge)
- `outdated_count` (gauge)
- `duplicate_groups` (gauge)
- `audit_runs_total` (counter)
- `issues_fixed_total` (counter, labeled by type)
- `file_age_days` (histogram)
- `file_size_lines` (histogram)
- `audit_duration_seconds` (histogram)

### Keyboard Shortcuts (Docusaurus)

- `Ctrl/Cmd + R`: Refresh dashboard
- `Ctrl/Cmd + P`: Print/Export report
- `Tab`: Navigate between tabs
- `Enter/Space`: Activate focused action button

### Support & Feedback

For issues or feature requests:

1. Check this guide first
2. Review [troubleshooting section](#troubleshooting)
3. Create GitHub issue with `documentation` label
4. Tag `@docs-team` for urgent matters

---

**Last Updated**: 2025-10-18
**Version**: 1.0.0
**Status**: Active
