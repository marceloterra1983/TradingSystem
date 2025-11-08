# Documentation Maintenance - Quick Start Guide

**Current Health Score**: 98/100 (EXCELLENT) ✅

---

## 🚀 Quick Commands

### Daily/Weekly Checks (2 minutes)

```bash
# Run quick audit
bash scripts/docs/audit-documentation.sh --quick

# Check health score
jq -r '.healthScore' docs/reports/audit-report-*.json | tail -1
```

### Monthly Maintenance (15 minutes)

```bash
# 1. Full audit
bash scripts/docs/audit-documentation.sh --full

# 2. Fix any issues
bash scripts/docs/fix-frontmatter.sh --auto-fix

# 3. Validate
python scripts/docs/validate-frontmatter.py --schema v2
```

### Emergency Fix (1 minute)

```bash
# Fix all frontmatter issues immediately
bash scripts/docs/fix-frontmatter.sh --auto-fix

# Verify improvement
bash scripts/docs/audit-documentation.sh --quick
```

---

## 📊 Health Score Quick Reference

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | EXCELLENT ✅ | Maintenance only |
| 75-89 | GOOD 🟢 | Minor improvements |
| 60-74 | FAIR 🟡 | Active improvement plan |
| 0-59 | NEEDS ATTENTION 🔴 | Urgent fixes required |

**Current**: 98/100 (EXCELLENT) - Keep up the good work! 🎉

---

## 🛠️ Available Tools

### 1. Audit Script
```bash
scripts/docs/audit-documentation.sh [--full|--quick|--quality|--links]
```
- Checks frontmatter, TODOs, links, content quality
- Generates health score and reports
- Execution time: 2-5 minutes

### 2. Frontmatter Fix Script
```bash
scripts/docs/fix-frontmatter.sh [--dry-run|--auto-fix] [file]
```
- Adds/fixes frontmatter automatically
- Creates backups (.backup files)
- Works on single files or bulk

### 3. Python Validator
```bash
python scripts/docs/validate-frontmatter.py --schema v2 --verbose
```
- Detailed schema validation
- Owner field checking
- Date freshness verification

---

## ⚡ Common Tasks

### Add Frontmatter to New File

**Automatic**:
```bash
bash scripts/docs/fix-frontmatter.sh --auto-fix docs/content/path/to/file.mdx
```

**Manual Template**:
```yaml
---
title: "Your Document Title"
tags: [category, documentation]
domain: applications|backend|frontend|database|devops|product|architecture|shared|governance
type: guide|api|overview|configuration|architecture|deployment|changelog
summary: "Brief description"
status: active
last_review: "2025-11-08"
---
```

### Fix Missing Fields

```bash
# Preview what will be fixed
bash scripts/docs/fix-frontmatter.sh --dry-run

# Apply fixes
bash scripts/docs/fix-frontmatter.sh --auto-fix
```

### Check Link Health

```bash
cd docs
npm run docs:links
```

### Update Review Date

Find/replace in file frontmatter:
```yaml
last_review: "2025-11-08"
```

---

## 📋 Maintenance Schedule

### ✅ Weekly (15 min) - Fridays
- [ ] Run quick audit
- [ ] Review health score
- [ ] Fix any critical issues

### ✅ Monthly (30 min) - 1st of month
- [ ] Full documentation audit
- [ ] Fix frontmatter issues
- [ ] Validate links
- [ ] Review TODO count

### ✅ Quarterly (2 hours) - End of quarter
- [ ] Complete validation suite
- [ ] Content freshness review
- [ ] Update documentation
- [ ] Generate metrics report

---

## 🎯 Current Status

**Last Audit**: 2025-11-08 09:47
**Health Score**: 98/100 (EXCELLENT)

**Metrics**:
- ✅ Files: 287
- ✅ Frontmatter: 100% (287/287)
- ✅ Broken Links: 0
- ✅ Outdated Docs: 0
- ⚠️ TODOs: 150 (threshold: 50)
- ⚠️ FIXMEs: 4

**Priority Actions**:
1. Review and resolve FIXME markers (4)
2. Reduce TODO count to <50 (currently 150)
3. Continue weekly maintenance

---

## 🆘 Troubleshooting

**Issue**: Script permission denied
**Fix**: `chmod +x scripts/docs/*.sh`

**Issue**: Health score dropped
**Fix**: Run `bash scripts/docs/fix-frontmatter.sh --auto-fix`

**Issue**: Can't find reports
**Fix**: Check `docs/reports/audit-report-*.md`

**Issue**: Backup files cluttering
**Fix**: Review and remove after verifying: `rm docs/content/**/*.backup`

---

## 📚 Full Documentation

For complete details, see:
- [Maintenance Guide](./DOCUMENTATION-MAINTENANCE-GUIDE.md) - Complete procedures
- [Implementation Summary](./MAINTENANCE-SYSTEM-IMPLEMENTATION-SUMMARY.md) - Full details
- Latest audit report: `docs/reports/audit-report-*.md`

---

*Last Updated: 2025-11-08*
*Next Review: 2025-11-15*
