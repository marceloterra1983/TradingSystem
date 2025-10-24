---
title: Automated Code Quality Setup
sidebar_position: 20
tags: [ops, automation, code-quality, ci-cd, linting, documentation, link-validation]
domain: ops
type: guide
summary: Setup guide for automated code quality and documentation validation including linters, formatters, link validation, and CI/CD integration
status: active
last_review: 2025-10-18
---

# Automated Code Quality Checks

This document explains how to set up and manage automated code quality checks for the TradingSystem.

## Overview

We have multiple layers of automated checks:

1. **GitHub Actions** - Runs on every push/PR and daily
2. **Pre-commit Hooks** - Runs locally before every commit
3. **Manual CLI** - Run anytime via npm scripts
4. **Documentation Link Validation (NEW)** - Automated CI/CD workflow validating internal and external documentation links

## 1. Code Quality - GitHub Actions (CI/CD Pipeline)

### What it does:

-   ✅ Runs ESLint on all TypeScript/React files
-   ✅ Runs TypeScript type checking
-   ✅ Generates detailed reports
-   ✅ Runs automatically on push, PR, and daily schedule (9 AM UTC)

### How to access:

1. Go to your repository on GitHub
2. Click on "Actions" tab
3. View "Code Quality Check" workflow
4. Download artifacts (ESLint reports) from completed runs

### Configuration:

File: `.github/workflows/code-quality.yml`

To change the schedule, edit the cron expression:

```yaml
schedule:
    - cron: "0 9 * * *" # Daily at 9 AM UTC
```

Common cron patterns:

-   `0 9 * * *` - Daily at 9 AM
-   `0 9 * * 1` - Every Monday at 9 AM
-   `0 */6 * * *` - Every 6 hours
-   `0 9,17 * * *` - Twice daily (9 AM and 5 PM)

### Notifications:

Enable GitHub notifications:

1. Repository → Settings → Notifications
2. Enable email/Slack notifications for workflow failures

## 2. Pre-commit Hooks (Local Validation)

> **Updated (2025-10-18)**: Now includes documentation frontmatter validation in addition to code quality checks.

### What it does:

-   ✅ Blocks commits if ESLint errors exist
-   ✅ Runs TypeScript type check
-   ✅ Validates documentation frontmatter (NEW)
-   ✅ Ensures code quality before pushing

### Setup (one-time):

```bash
# At repository root
npm install
# This runs the prepare script which installs Husky hooks
```

### Verification:

```bash
# Check that hooks are installed
ls -la .husky/pre-commit
# Should show executable file
```

### To bypass (emergency only):

```bash
git commit --no-verify -m "Emergency fix"
```

### 2.2 Documentation Frontmatter Validation

**What it validates**:

-   ✅ YAML frontmatter in staged markdown files
-   ✅ All 8 required fields present (title, sidebar_position, tags, domain, type, summary, status, last_review)
-   ✅ Field types correct (string, int, list)
-   ✅ Domain/type/status values from allowed lists
-   ✅ Date format (YYYY-MM-DD)

**When it runs**: Before every `git commit` (if markdown files staged)

**Performance**: ~1-2 seconds (validates only staged files)

**Configuration**:

-   **Hook file**: `.husky/pre-commit`
-   **Validation script**: `scripts/docs/validate-frontmatter.py`
-   **Wrapper script**: `scripts/docs/validate-frontmatter-staged.sh`
-   **Package.json script**: `validate-docs-staged`

**How it works**:

1. Git stages markdown files: `git add docs/context/frontend/guides/my-guide.md`
2. Developer commits: `git commit -m "docs: add guide"`
3. Pre-commit hook runs automatically
4. Hook gets list of staged markdown files
5. Hook validates frontmatter in staged versions (not working directory)
6. If validation passes: Commit proceeds
7. If validation fails: Commit blocked with error details

**Example output (success)**:

```
🔍 Validating documentation frontmatter...
📝 Found 2 staged markdown file(s)
✅ All staged documentation files passed frontmatter validation

🔍 Running frontend code quality checks...
✅ Frontend code quality checks passed

[main abc1234] docs: add implementation guide
 2 files changed, 150 insertions(+)
```

**Example output (failure)**:

```
🔍 Validating documentation frontmatter...
📝 Found 1 staged markdown file(s)

❌ Frontmatter validation failed for staged files

📋 Common issues:
  - Missing required fields (title, tags, domain, type, summary, status, last_review)
  - Invalid domain (must be: frontend, backend, ops, shared)
  - Invalid type (must be: guide, reference, adr, prd, rfc, runbook, overview, index, glossary, template, feature)
  - Invalid status (must be: draft, active, deprecated)
  - Invalid date format (must be: YYYY-MM-DD)

📖 See: docs/DOCUMENTATION-STANDARD.md for complete requirements

🔧 To fix:
  1. Review the errors above
  2. Update frontmatter in the affected files
  3. Stage the fixes: git add <file>
  4. Try committing again
```

**Bypassing validation** (emergency only):

```bash
# Skip pre-commit hook
git commit --no-verify -m "docs: emergency fix"

# ⚠️ WARNING: CI/CD validation will still run on PR
# You must fix issues before merge
```

**Manual validation** (before committing):

```bash
# Validate only staged files
bash scripts/docs/validate-frontmatter-staged.sh

# Validate all documentation
python3 scripts/docs/validate-frontmatter.py \
  --docs-dir ./docs/context ./docs \
  --verbose

# Validate specific directory
python3 scripts/docs/validate-frontmatter.py \
  --docs-dir ./docs/context/frontend \
  --verbose
```

**Troubleshooting**:

**Issue**: Hook doesn't run

-   **Check**: `ls -la .husky/pre-commit` (should be executable)
-   **Fix**: `chmod +x .husky/pre-commit`
-   **Verify**: `cat .husky/pre-commit` (should contain validation code)

**Issue**: "No such file or directory: scripts/docs/validate-frontmatter-staged.sh"

-   **Check**: Script exists and is executable
-   **Fix**: `chmod +x scripts/docs/validate-frontmatter-staged.sh`

**Issue**: Validation passes locally but fails in CI

-   **Cause**: Working directory version differs from staged version
-   **Fix**: Ensure you've staged all changes: `git add -u`
-   **Verify**: `git diff --cached` (shows staged changes)

**Issue**: Hook runs on non-documentation commits

-   **Expected behavior**: Hook checks for staged markdown files first
-   **Performance**: If no .md files staged, validation is skipped (instant)
-   **No action needed**: This is correct behavior

### Integration with Documentation Standard

The validation enforces all requirements from the **Core Requirements** section:

-   **Section 1: YAML Frontmatter** - All 8 fields validated
-   **Field types** - String, int, list types enforced
-   **Allowed values** - Domain, type, status validated against allowed lists
-   **Date format** - ISO 8601 (YYYY-MM-DD) enforced

See: [Documentation Standard - Core Requirements](../../DOCUMENTATION-STANDARD.md#core-requirements)

## 3. Manual CLI Commands

Run anytime from `frontend/dashboard/`:

```bash
# Check for errors
npm run lint

# Auto-fix issues
npm run lint:fix

# Generate JSON report
npm run lint:report

# Type check
npm run type-check
```

## Visual Management Platforms

### Option A: GitHub Actions (Free, Built-in)

**Pros:**

-   ✅ Free for public/private repos
-   ✅ Built into GitHub
-   ✅ Visual workflow interface
-   ✅ Email notifications
-   ✅ Artifact downloads

**Access:** https://github.com/YOUR_USERNAME/TradingSystem/actions

### Option B: SonarCloud (Free for Open Source)

**Pros:**

-   ✅ Beautiful dashboard
-   ✅ Technical debt tracking
-   ✅ Security vulnerability scanning
-   ✅ Code coverage visualization
-   ✅ Historical trends

**Setup:**

1. Go to https://sonarcloud.io/
2. Sign in with GitHub
3. Import TradingSystem repository
4. Add SonarCloud GitHub Action

**Cost:** Free for open source, paid for private repos

### Option C: Codecov (Code Coverage)

**Pros:**

-   ✅ Visual code coverage reports
-   ✅ PR comments with coverage diff
-   ✅ Sunburst charts

**Setup:**

1. Go to https://codecov.io/
2. Sign in with GitHub
3. Enable TradingSystem repository

### Option D: Jenkins (Self-hosted)

**Pros:**

-   ✅ Complete control
-   ✅ Visual pipeline builder
-   ✅ Blue Ocean UI
-   ✅ Plugin ecosystem

**Cons:**

-   ❌ Requires server setup
-   ❌ More maintenance

## Multi-Agent Platforms

If you want a platform to manage multiple AI agents (not just code quality):

### 1. **n8n** (Self-hosted, Free)

-   Visual workflow builder
-   Connect multiple agents/APIs
-   Trigger agents on schedule
-   Web UI for management

**Setup:**

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Access:** http://localhost:5678

### 2. **Windmill** (Self-hosted, Open Source)

-   Visual workflow builder
-   TypeScript/Python/SQL scripts
-   Schedule runs
-   Audit logs

### 3. **Temporal** (Self-hosted/Cloud)

-   Workflow orchestration
-   Reliable execution
-   Visual workflow monitoring
-   Built for complex workflows

### 4. **Prefect** (Cloud/Self-hosted)

-   Python-based workflow orchestration
-   Beautiful UI
-   Observability
-   Scheduling

### 5. **LangFlow** (AI Agent Management)

-   Visual agent builder
-   LangChain integration
-   Real-time monitoring
-   Drag-and-drop interface

## Recommended Setup for TradingSystem

### Immediate (Free):

1. ✅ **GitHub Actions** - Already configured above
2. ✅ **Pre-commit hooks** - Run `npm install husky`
3. ✅ **Manual CLI** - Already working

### Next Level (Free):

1. **SonarCloud** - Add comprehensive quality dashboard
2. **Codecov** - Add code coverage tracking
3. **GitHub Issues Integration** - Auto-create issues for critical errors

### Advanced (Optional):

1. **n8n** - Orchestrate multiple agents (code quality, security scans, backups)
2. **Grafana + Prometheus** - Already in your stack - add code quality metrics

## Daily Report via Email

Add this to GitHub Actions to email daily reports:

```yaml
- name: Send email report
  uses: dawidd6/action-send-mail@v3
  if: always()
  with:
      server_address: smtp.gmail.com
      server_port: 465
      username: ${{ secrets.EMAIL_USERNAME }}
      password: ${{ secrets.EMAIL_PASSWORD }}
      subject: Daily Code Quality Report - TradingSystem
      to: your-email@example.com
      from: GitHub Actions
      body: |
```

## 4. Documentation Link Validation (CI/CD)

### What it does:

-   ✅ Validates all internal documentation links (cross-references)
-   ✅ Validates anchor links (headers within documents)
-   ✅ Validates external URLs (on scheduled runs only)
-   ✅ Categorizes broken links by priority (critical vs warning)
-   ✅ Fails build on critical broken links (docs internal, anchors)
-   ✅ Warns on low-priority broken links (repo internal, external)
-   ✅ Generates detailed JSON reports with file:line information
-   ✅ Creates PR comments with actionable feedback

### When it runs:

-   **On Pull Requests**: Validates internal links only (fast, ~30 seconds)
-   **On Push to main/develop**: Validates internal links only
-   **Daily at 3 AM UTC**: Full validation including external URLs (~5 minutes)
-   **Manual trigger**: Via GitHub Actions UI with custom options

### Configuration:

File: `.github/workflows/docs-link-validation.yml`

**Trigger paths**:

```yaml
paths:
    - "docs/**"
    - "*.md"
    - "scripts/docs/check-links.py"
```

**Schedule**:

```yaml
schedule:
    - cron: "0 3 * * *" # Daily at 3 AM UTC (midnight BRT)
```

### Priority Levels:

**🔴 CRITICAL (Fails Build)**:

-   Internal documentation links (`docs/context/` → `docs/context/`)
-   Anchor links within documentation (`#section-name`)
-   Missing files in documentation cross-references

**🟡 WARNING (Don't Fail Build)**:

-   Links to repository files (`docs/` → `backend/`, `frontend/`, etc.)
-   Links to configuration files
-   Links to source code (should be avoided but not critical)

**ℹ️ INFO (Don't Fail Build)**:

-   External URLs (may be temporarily down)
-   Localhost URLs (skipped automatically)
-   Example URLs (example.com, test.com)

### How to access:

**Via GitHub Actions UI**:

1. Go to repository on GitHub
2. Click "Actions" tab
3. Select "Documentation Link Validation" workflow
4. View results and download JSON report artifacts

**Via PR Comments**:

-   Workflow automatically comments on PRs with validation results
-   Shows critical broken links, warnings, and success rate
-   Includes direct links to files and line numbers

**Via Status Badge**:

-   README.md displays current link validation status
-   Badge updates automatically after each run
-   Click badge to view latest workflow run

### Manual Validation:

Run locally before pushing:

```bash
# Validate all documentation (skip external for speed)
python scripts/docs/check-links.py \
  --docs-dir ./docs/context ./docs \
  --output ./docs/reports/link-validation-local.json \
  --skip-external \
  --verbose

# Full validation including external URLs
python scripts/docs/check-links.py \
  --docs-dir ./docs/context ./docs \
  --output ./docs/reports/link-validation-full.json \
  --timeout 10 \
  --verbose

# Validate specific directory
python scripts/docs/check-links.py \
  --docs-dir ./docs/context/frontend \
  --skip-external
```

### Understanding the Report:

**JSON Structure**:

```json
{
    "metadata": {
        "scan_date": "2025-10-18T10:30:00",
        "docs_directory": ["./docs/context", "./docs"],
        "skip_external": true,
        "script_version": "1.0.0"
    },
    "summary": {
        "total_files": 195,
        "total_links": 527,
        "internal_links": 374,
        "external_links": 153,
        "broken_links": 27,
        "success_rate": 94.9
    },
    "broken_links": [
        {
            "file": "backend/api/README.md",
            "line": 42,
            "link_text": "Implementation Guide",
            "link_url": "./guides/missing-file.md",
            "error": "File not found",
            "error_type": "file_not_found",
            "link_category": "internal",
            "link_scope": "docs_internal"
        }
    ]
}
```

**Key Fields**:

-   `link_category`: internal, external, anchor
-   `link_scope`: docs_internal (critical), repo_internal (warning)
-   `error_type`: file_not_found, anchor_not_found, http_error, timeout

### Fixing Broken Links:

**Step 1: Review the report**

```bash
# Download artifact from GitHub Actions
# Or run locally and check JSON
cat docs/reports/link-validation-pr.json | jq '.broken_links[] | select(.link_scope=="docs_internal")'
```

**Step 2: Fix critical links first**

-   Focus on `link_scope: "docs_internal"` (documentation cross-references)
-   Fix `link_category: "anchor"` (broken section links)
-   These will fail the build

**Step 3: Address warnings**

-   Review `link_scope: "repo_internal"` (links to code/config)
-   Consider replacing with documentation links
-   These won't fail build but should be fixed

**Step 4: Verify fixes**

```bash
# Run validation locally
python scripts/docs/check-links.py --docs-dir ./docs/context --skip-external

# Should show 0 critical broken links
```

### Integration with Other Tools:

**Pre-commit Hook** (Phase 9):

-   Will validate links in staged files before commit
-   Prevents broken links from being committed
-   Uses same check-links.py script

**Monthly Audit** (Phase 10):

-   Comprehensive audit includes link validation
-   Generates detailed reports with trends
-   Creates GitHub issues for broken links

## 5. Documentation Health Dashboard

### What it shows:

- 📊 Overall health score (0-100 with grade A-F)
- 🔗 Link success rate and broken link count
- 📝 Frontmatter compliance (complete/missing/incomplete)
- 📅 Content freshness (outdated documents count)
- 📈 Trends over time (30-day charts)
- 🔍 Detailed issue breakdowns (filterable tables)
- 📉 Duplicate detection results
- 📊 Domain distribution and metrics

### Where to access:

**Docusaurus Dashboard** (Developer-focused):

- URL: `http://localhost:3004/health`
- Features: Rich issue details, filterable tables, export options, links to files
- Updates: Every 5 minutes (auto-refresh)
- Best for: Developers fixing issues, detailed analysis, actionable items

**Grafana Dashboard** (Ops-focused):

- URL: `http://localhost:3000/d/docs-health`
- Features: Real-time metrics, trends, alerts, historical data
- Updates: Every 30 seconds (Prometheus scrape interval)
- Best for: Monitoring health trends, setting up alerts, ops visibility

### Data Sources:

**Docusaurus Dashboard:**

- Source: Documentation API endpoints (`/api/v1/docs/health/*`)
- Data: Latest audit JSON reports (frontmatter.json, links.json, duplicates.json)
- Refresh: API responses cached 5 minutes

**Grafana Dashboard:**

- Source: Prometheus metrics from Documentation API
- Metrics: `docs_health_score`, `docs_links_broken`, `docs_frontmatter_complete`, etc.
- Refresh: Real-time (30-second scrape interval)

### Metrics Tracked:

**Health Metrics:**

- Overall health score (weighted: 40% frontmatter, 30% links, 30% duplicates)
- Grade (A/B/C/D/F based on score)
- Status (Excellent/Good/Fair/Poor/Critical)

**Frontmatter Metrics:**

- Total files scanned
- Files with complete frontmatter
- Files missing frontmatter
- Files with incomplete frontmatter
- Compliance rate percentage

**Link Metrics:**

- Total links found
- Internal links count
- External links count
- Broken links count
- Success rate percentage
- Broken links by priority (critical/warning/info)

**Freshness Metrics:**

- Outdated documents count (>90 days)
- Average document age
- Oldest document age
- Freshness rate percentage

**Duplicate Metrics:**

- Exact duplicate groups
- Similar title pairs
- Similar summary pairs
- Cross-domain duplicates

**Diagram Metrics:**

- Total PlantUML diagrams
- Guides with diagrams
- Guides without diagrams (estimated)

### How it updates:

**Automatic Updates (Daily)**:

1. GitHub Actions workflow runs at 2 AM UTC: `.github/workflows/docs-audit-scheduled.yml`
2. Executes `bash scripts/docs/audit-documentation.sh`
3. Generates JSON reports (frontmatter.json, links.json, duplicates.json)
4. Generates markdown report (YYYY-MM-DD-documentation-audit.md)
5. Calls Documentation API: `POST /api/v1/docs/health/update-metrics` with audit data
6. Documentation API updates Prometheus gauges
7. Commits audit report to repository
8. Grafana displays updated metrics (via Prometheus)
9. Docusaurus dashboard fetches latest data (via API)

**Manual Updates**:

```bash
# Run audit locally
bash scripts/docs/audit-documentation.sh \
  --output ./docs/reports/manual-audit.md \
  --verbose

# Trigger via GitHub Actions UI
# Go to Actions → Documentation Health Audit → Run workflow

# Update Prometheus metrics via API
curl -X POST http://localhost:3400/api/v1/docs/health/update-metrics \
  -H "Content-Type: application/json" \
  -d @/tmp/docs-audit-*/combined-metrics.json
```

### Using the Dashboards:

**Docusaurus Dashboard:**

1. **Overview**: Check health score and key metrics at a glance
2. **Drill Down**: Click cards to see detailed breakdowns
3. **Fix Issues**: Use issue tables to identify files needing fixes
4. **Track Progress**: View trends to see improvements over time
5. **Export Data**: Download metrics as JSON or CSV
6. **Quick Actions**: Run audit, download report, open Grafana

**Grafana Dashboard:**

1. **Monitor Trends**: View 30-day health score trend
2. **Set Alerts**: Configure alerts for health degradation
3. **Compare Domains**: See which domain has most issues
4. **Track Fixes**: Monitor issues_fixed_total counter
5. **Performance**: Check audit execution time

### Troubleshooting:

**Issue: Dashboard shows stale data**

- Check Documentation API is running: `curl http://localhost:3400/health`
- Trigger manual audit: `bash scripts/docs/audit-documentation.sh`
- Call update endpoint: `POST /api/v1/docs/health/update-metrics`
- Check Prometheus targets: `http://localhost:9090/targets`

**Issue: Metrics not appearing in Grafana**

- Verify Prometheus scraping Documentation API: Check targets page
- Verify metrics exported: `curl http://localhost:3400/metrics | grep docs_`
- Check Grafana data source configuration
- Restart Prometheus if needed

**Issue: Docusaurus dashboard not loading**

- Check browser console for CORS errors
- Verify CORS_ORIGIN in .env includes `http://localhost:3004`
- Check Documentation API health endpoint
- Verify API routes are registered in server.js

**Issue: Audit workflow fails**

- Check workflow logs in GitHub Actions
- Verify Python dependencies installed
- Check audit scripts are executable
- Verify docs directories exist

### Best Practices:

✅ **DO:**

- Check dashboard weekly to track progress
- Use Docusaurus dashboard for detailed issue analysis
- Use Grafana dashboard for trend monitoring
- Set up Grafana alerts for health degradation
- Review zero-result search queries for content gaps
- Export metrics for monthly reports

❌ **DON'T:**

- Ignore health score drops (investigate immediately)
- Disable automated audits (continuous monitoring is key)
- Skip fixing critical issues (broken links, missing frontmatter)
- Forget to update dashboards after major documentation changes

### Integration with Other Tools:

**Pre-commit Hooks** (Phase 9):

- Prevents invalid frontmatter from being committed
- Dashboard shows 100% frontmatter compliance as a result

**Link Validation Workflow** (Phase 8):

- Prevents new broken links from being merged
- Dashboard shows link success rate improvements

**Monthly Audit** (Phase 13):

- Comprehensive audit with trend analysis
- Generates detailed reports for management
- Dashboard provides visual representation

**Search Analytics** (Phase 12):

- Dashboard shows search metrics alongside health metrics
- Identify popular topics and content gaps
- Improve documentation based on search patterns

**Documentation Health Dashboard** (Phase 14):

-   Displays link validation metrics
-   Shows trends over time
-   Highlights files with most broken links

### Troubleshooting:

**Issue: Workflow fails on valid links**

-   Check if file paths are correct (case-sensitive on Linux)
-   Verify relative paths resolve correctly
-   Check if target file has proper frontmatter

**Issue: External link validation too slow**

-   Use `--skip-external` flag for faster validation
-   Increase `--timeout` value (default: 5 seconds)
-   Run external validation only on scheduled runs

**Issue: False positives on anchors**

-   Script uses Docusaurus-compatible slugify (function `slugify_docusaurus` at line 303)
-   Verify header text matches expected anchor format
-   Check for special characters in headers

**Issue: Too many warnings**

-   Review links to source code files (should reference documentation instead)
-   Update documentation to use docs-to-docs links
-   See Phase 5 resolution for examples

### Best Practices:

✅ **DO:**

-   Run validation locally before pushing
-   Fix critical broken links immediately
-   Use `--skip-external` for fast local checks
-   Review PR comments and fix issues before merge
-   Keep documentation links pointing to documentation (not source code)

❌ **DON'T:**

-   Ignore workflow failures (critical links must be fixed)
-   Disable validation to "make build pass"
-   Link to source code files from documentation
-   Use absolute URLs for internal documentation
-   Commit without running local validation

### Metrics & Monitoring:

**Key Metrics**:

-   Total links validated
-   Broken links by category (critical, warning, info)
-   Success rate percentage
-   Validation duration

**Alerts**:

-   Build fails on critical broken links (blocks PR merge)
-   PR comment notifies reviewers of warnings
-   Daily scheduled run emails on failures (configure in GitHub settings)

**Trends** (via monthly audits):

-   Track link health over time
-   Identify files with frequent broken links
-   Monitor success rate improvements

## Monitoring Dashboard Integration

Since you already have Grafana/Prometheus, you can push metrics:

```javascript
// In your GitHub Action or local script
const metrics = {
    eslint_errors: 0,
    eslint_warnings: 41,
    typescript_errors: 0,
    timestamp: Date.now(),
};

// Push to Prometheus Pushgateway
await fetch("http://localhost:9091/metrics/job/code-quality", {
    method: "POST",
    body: `eslint_errors ${metrics.eslint_errors}\neslint_warnings ${metrics.eslint_warnings}`,
});
```

## Questions?

-   GitHub Actions docs: https://docs.github.com/en/actions
-   ESLint docs: https://eslint.org/docs/latest/
-   Husky docs: https://typicode.github.io/husky/

