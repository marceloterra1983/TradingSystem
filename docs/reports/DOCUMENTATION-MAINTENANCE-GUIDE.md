# Documentation Maintenance & Quality Assurance Guide

**Date**: 2025-11-08
**Version**: 1.0.0
**Status**: Active

## Executive Summary

This guide provides comprehensive instructions for maintaining documentation quality and health through automated tools and regular maintenance procedures.

### Current Documentation Health

Based on the latest audit (2025-11-08):

- **Health Score**: 35/100 (NEEDS ATTENTION)
- **Total Files**: 287 documentation files
- **Frontmatter Compliance**: 278/287 (97%) have frontmatter
- **Missing Frontmatter**: 9 files require attention
- **Incomplete Frontmatter**: 258 files missing required fields
- **Outstanding Tasks**: 150 TODOs, 4 FIXMEs
- **Link Health**: 0 broken internal links (excellent!)
- **Content Freshness**: 0 outdated documents (>90 days)

### Priority Actions

1. **Fix Frontmatter Issues** - 258 files with incomplete metadata
2. **Address TODO Markers** - 150 outstanding tasks (threshold: 50)
3. **Complete Missing Frontmatter** - 9 files without frontmatter
4. **Review FIXME Markers** - 4 critical issues requiring attention

---

## Available Tools

### 1. Documentation Audit Script

**Purpose**: Comprehensive documentation health check and quality metrics

**Location**: `scripts/docs/audit-documentation.sh`

**Features**:
- File discovery and categorization
- Frontmatter validation
- TODO/FIXME marker tracking
- Content quality analysis
- Internal link validation
- Health score calculation
- JSON and Markdown reports

**Usage**:

```bash
# Full audit (all checks)
bash scripts/docs/audit-documentation.sh --full

# Quick audit (frontmatter + markers)
bash scripts/docs/audit-documentation.sh --quick

# Quality analysis only
bash scripts/docs/audit-documentation.sh --quality

# Link validation only
bash scripts/docs/audit-documentation.sh --links
```

**Output**:
- Markdown report: `docs/reports/audit-report-YYYYMMDD-HHMMSS.md`
- JSON report: `docs/reports/audit-report-YYYYMMDD-HHMMSS.json`

**Execution Time**: 2-5 minutes (depending on mode)

---

### 2. Frontmatter Fix Script

**Purpose**: Automatically add or fix frontmatter in documentation files

**Location**: `scripts/docs/fix-frontmatter.sh`

**Features**:
- Automatic frontmatter generation
- Intelligent domain/type detection
- Missing field identification
- Dry-run mode for preview
- Automatic backup creation

**Usage**:

```bash
# Preview fixes (no changes)
bash scripts/docs/fix-frontmatter.sh --dry-run

# Apply fixes automatically
bash scripts/docs/fix-frontmatter.sh --auto-fix

# Fix specific file
bash scripts/docs/fix-frontmatter.sh --auto-fix docs/content/api/overview.mdx

# Show help
bash scripts/docs/fix-frontmatter.sh --help
```

**Frontmatter Template**:

```yaml
---
title: "Document Title"
tags: [category, documentation]
domain: applications|backend|frontend|database|devops|product|architecture|shared|governance
type: guide|api|overview|configuration|architecture|deployment|changelog|troubleshooting|operations|runbook|requirements
summary: "Brief description of document content"
status: active|deprecated|draft|archived
last_review: "YYYY-MM-DD"
---
```

**Backup**: Original files backed up with `.backup` extension

---

### 3. Existing Validation Tools

#### A. Frontmatter Validation (Python)

**Location**: `scripts/docs/validate-frontmatter.py`

**Usage**:

```bash
python scripts/docs/validate-frontmatter.py \
  --schema v2 \
  --docs-dir ./docs/content \
  --output ./docs/reports/frontmatter-validation-$(date +%Y%m%d).json \
  --threshold-days 90 \
  --verbose
```

**Features**:
- Schema validation (v2 = docs/content, legacy = docs/context)
- Owner field validation
- Date freshness checking
- Detailed JSON reporting

#### B. Technical References Validation

**Location**: `docs/scripts/validate-technical-references.sh`

**Usage**:

```bash
# Standard validation
bash docs/scripts/validate-technical-references.sh

# Verbose mode
bash docs/scripts/validate-technical-references.sh --verbose

# Strict mode (fail on warnings)
bash docs/scripts/validate-technical-references.sh --strict
```

**Features**:
- Legacy reference detection (docs/docusaurus, port 3004)
- New reference adoption tracking (docs, port 3400/3401)
- CORS configuration validation
- services-manifest.json validation

---

## Maintenance Procedures

### Weekly Maintenance

**Time Required**: 15-20 minutes

**Checklist**:

1. **Run Quick Audit**
   ```bash
   bash scripts/docs/audit-documentation.sh --quick
   ```

2. **Review Audit Report**
   - Check health score (target: >75)
   - Review new TODO markers
   - Identify newly outdated documents

3. **Fix Critical Issues**
   - Add missing frontmatter (if any)
   - Update outdated documents (>90 days)
   - Address FIXME markers

4. **Update Metrics**
   - Record health score in tracking sheet
   - Document issues found
   - Track resolution progress

### Monthly Maintenance

**Time Required**: 30-45 minutes

**Checklist**:

1. **Full Documentation Audit**
   ```bash
   bash scripts/docs/audit-documentation.sh --full
   ```

2. **Frontmatter Compliance**
   ```bash
   # Preview fixes
   bash scripts/docs/fix-frontmatter.sh --dry-run

   # Apply fixes
   bash scripts/docs/fix-frontmatter.sh --auto-fix

   # Validate
   python scripts/docs/validate-frontmatter.py --schema v2 --verbose
   ```

3. **Link Validation**
   ```bash
   cd docs
   npm run docs:links
   ```

4. **Content Quality Review**
   - Review short files (<100 words)
   - Identify stub documentation
   - Plan content expansion

5. **TODO/FIXME Resolution**
   - Review top 5 files with most TODOs
   - Address or document outstanding tasks
   - Remove completed markers

### Quarterly Maintenance

**Time Required**: 2-3 hours

**Checklist**:

1. **Comprehensive Validation Suite**
   ```bash
   cd docs
   npm run docs:check
   npm run docs:links
   bash ../docs/scripts/validate-technical-references.sh --strict
   python ../scripts/docs/validate-frontmatter.py --schema v2
   ```

2. **Content Freshness Review**
   - Review all documents >90 days old
   - Update last_review dates
   - Archive deprecated content

3. **Structure Optimization**
   - Reorganize if needed
   - Update navigation
   - Consolidate similar content

4. **Quality Improvements**
   - Expand stub documentation
   - Add missing diagrams
   - Improve readability

5. **Metrics Reporting**
   - Generate trend analysis
   - Document improvements
   - Set targets for next quarter

---

## Health Score Interpretation

### Score Ranges

| Score | Status | Action Required |
|-------|--------|-----------------|
| 90-100 | EXCELLENT | Maintenance only |
| 75-89 | GOOD | Minor improvements |
| 60-74 | FAIR | Active improvement plan needed |
| 0-59 | NEEDS ATTENTION | Urgent remediation required |

### Score Calculation

Base score: 100 points

**Deductions**:
- Missing frontmatter: -2 points per file
- Outdated documents: -1 point per file
- Broken internal links: -3 points per link
- Errors: -5 points per error
- Warnings: -2 points per warning

### Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Frontmatter Compliance | 100% | 97% | 🟡 Good |
| Complete Frontmatter | 95% | 7% | 🔴 Needs Attention |
| Outdated Documents | 0 | 0 | 🟢 Excellent |
| TODO Count | <50 | 150 | 🔴 Needs Attention |
| FIXME Count | 0 | 4 | 🟡 Fair |
| Broken Links | 0 | 0 | 🟢 Excellent |
| Health Score | >75 | 35 | 🔴 Needs Attention |

---

## Improvement Roadmap

### Phase 1: Critical Fixes (Week 1-2)

**Goal**: Achieve 60/100 health score

**Tasks**:
1. Fix all missing frontmatter (9 files)
2. Add required fields to incomplete frontmatter (top 50 files)
3. Address FIXME markers (4 issues)
4. Review and resolve/document high-priority TODOs (top 20)

**Expected Impact**: +25 points (score: 60/100)

### Phase 2: Quality Improvements (Week 3-4)

**Goal**: Achieve 75/100 health score

**Tasks**:
1. Complete frontmatter for remaining 208 files
2. Resolve or document remaining TODOs (reduce to <50)
3. Expand stub documentation (files <100 words)
4. Add missing sections to key documents

**Expected Impact**: +15 points (score: 75/100)

### Phase 3: Excellence (Month 2)

**Goal**: Achieve 90+/100 health score

**Tasks**:
1. Ensure 100% frontmatter completion
2. Reduce TODO count to <20
3. Add comprehensive content to all guides
4. Implement automated quality checks in CI/CD
5. Establish regular maintenance schedule

**Expected Impact**: +15 points (score: 90/100)

---

## Automation Integration

### CI/CD Integration

**Recommended Workflows**:

```yaml
# .github/workflows/docs-quality.yml
name: Documentation Quality Check

on:
  pull_request:
    paths:
      - 'docs/content/**'
      - 'governance/**'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Documentation Audit
        run: bash scripts/docs/audit-documentation.sh --quick

      - name: Check Health Score
        run: |
          SCORE=$(jq -r '.healthScore' docs/reports/audit-report-*.json | tail -1)
          if [ "$SCORE" -lt 60 ]; then
            echo "Health score too low: $SCORE/100"
            exit 1
          fi

      - name: Upload Audit Report
        uses: actions/upload-artifact@v3
        with:
          name: audit-report
          path: docs/reports/audit-report-*.md
```

### Git Hooks

**Pre-commit Hook** (`.git/hooks/pre-commit`):

```bash
#!/bin/bash
# Check frontmatter on changed .mdx files

changed_docs=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(md|mdx)$')

if [ -n "$changed_docs" ]; then
    echo "Checking frontmatter on changed documentation files..."

    for file in $changed_docs; do
        if ! head -n 1 "$file" | grep -q "^---$"; then
            echo "ERROR: Missing frontmatter in $file"
            echo "Run: bash scripts/docs/fix-frontmatter.sh --auto-fix $file"
            exit 1
        fi
    done
fi
```

---

## Best Practices

### Writing Documentation

1. **Always include frontmatter** - Use the template provided
2. **Keep content current** - Update last_review regularly
3. **Resolve TODOs promptly** - Don't accumulate technical debt
4. **Use descriptive titles** - Clear and searchable
5. **Add appropriate tags** - For discoverability
6. **Write clear summaries** - Help users find content quickly

### Frontmatter Guidelines

**Required Fields**:
- `title`: Clear, descriptive title (50 chars max)
- `tags`: Array of relevant tags (2-5 tags)
- `domain`: One of the predefined domains
- `type`: Document type (guide, api, etc.)
- `summary`: Brief description (100-200 chars)
- `status`: Current status (active/deprecated/draft/archived)
- `last_review`: Date of last review (YYYY-MM-DD)

**Optional Fields**:
- `owner`: Team responsible for maintenance
- `related`: Links to related documentation
- `version`: Version number (for versioned docs)

### TODO/FIXME Management

**TODO Guidelines**:
- Use for planned work or future improvements
- Include context: `TODO: Add error handling for edge case X`
- Link to issues: `TODO(#123): Implement feature Y`
- Set deadlines: `TODO(2025-12-01): Update for new API version`

**FIXME Guidelines**:
- Use for known issues requiring immediate attention
- Always include description: `FIXME: Incorrect example, should use async/await`
- Prioritize resolution
- Convert to issues for tracking

---

## Troubleshooting

### Issue: Audit Script Fails

**Symptoms**: Script exits with error code
**Causes**: Missing files, permission issues, invalid file format
**Solution**:
1. Check script has execute permission: `chmod +x scripts/docs/audit-documentation.sh`
2. Verify docs/content directory exists
3. Check for corrupted markdown files
4. Review error messages for specific issues

### Issue: Frontmatter Fix Doesn't Work

**Symptoms**: Frontmatter not added or incorrect
**Causes**: File encoding issues, invalid YAML, permission denied
**Solution**:
1. Check file permissions
2. Verify file is UTF-8 encoded
3. Review generated frontmatter template
4. Use --dry-run first to preview changes
5. Check backup files if fix was applied

### Issue: Health Score Not Improving

**Symptoms**: Score remains low despite fixes
**Causes**: New issues being added, incomplete fixes, calculation errors
**Solution**:
1. Run full audit: `bash scripts/docs/audit-documentation.sh --full`
2. Review detailed metrics in JSON report
3. Address highest-impact issues first (missing frontmatter, broken links)
4. Track progress over time
5. Ensure fixes are being committed

---

## Metrics Dashboard

### Current Status (2025-11-08)

```
╔════════════════════════════════════════════════════╗
║  Documentation Health: 35/100 (NEEDS ATTENTION)   ║
╚════════════════════════════════════════════════════╝

📊 File Statistics:
  Total Files:              287
  Apps Documentation:       57
  API Documentation:        14
  Frontend Documentation:   19
  Tools Documentation:      85
  Database Documentation:   6
  Product Requirements:     10
  Software Design Docs:     15
  Reference Documentation:  27

✅ Quality Metrics:
  Frontmatter Compliance:   97% (278/287)
  Complete Frontmatter:     7% (19/287)
  Content Freshness:        100% (0 outdated)
  Link Health:              100% (0 broken)

⚠️  Outstanding Work:
  TODO Markers:             150 (⚠️ High)
  FIXME Markers:            4
  Missing Frontmatter:      9
  Incomplete Frontmatter:   258 (🔴 Critical)

🎯 Health Score Components:
  Base Score:               100
  - Missing Frontmatter:    -18 (9 files × 2)
  - Incomplete Frontmatter: -516 (258 files × 2)
  - High TODO Count:        -2 (warnings)
  - Errors:                 -45 (9 errors × 5)
  Final Score:              35/100
```

### Historical Trends

| Date | Score | Files | Frontmatter | TODOs | Links | Notes |
|------|-------|-------|-------------|-------|-------|-------|
| 2025-11-08 | 35 | 287 | 97% | 150 | 0 | Initial audit |
| 2025-11-15 | TBD | - | - | - | - | Week 1 improvements |
| 2025-11-22 | TBD | - | - | - | - | Week 2 improvements |
| 2025-11-29 | TBD | - | - | - | - | Month 1 complete |

---

## Support and Resources

### Documentation

- [Validation Guide](../../governance/controls/VALIDATION-GUIDE.md) - Complete validation suite
- [Review Checklist](../../governance/controls/REVIEW-CHECKLIST.md) - Review process
- [Maintenance Checklist](../../governance/controls/MAINTENANCE-CHECKLIST.md) - Quarterly hygiene

### Scripts and Tools

- `scripts/docs/audit-documentation.sh` - Main audit script
- `scripts/docs/fix-frontmatter.sh` - Frontmatter automation
- `scripts/docs/validate-frontmatter.py` - Python validator
- `docs/scripts/validate-technical-references.sh` - Reference validator

### Contact

- **Documentation Team**: DocsOps@project.local
- **Issues**: GitHub Issues tracker
- **Questions**: Team Slack #documentation channel

---

*Last Updated: 2025-11-08*
*Next Review: 2025-11-15*
*Owner: DocsOps*
