# Quick Start Guide - Comprehensive Maintenance System

**Version**: 2.0
**Last Updated**: 2025-11-08

---

## ⚡ Quick Commands

### 1. Daily Health Check (5 minutes)

```bash
# Run quick maintenance
bash scripts/docs/comprehensive-maintenance.sh quick

# Check health score (should be >=75)
grep "Overall Documentation Health" docs/reports/comprehensive-maintenance-*.md | tail -1
```

### 2. Weekly Full Maintenance (20 minutes)

```bash
# Run comprehensive maintenance
bash scripts/docs/comprehensive-maintenance.sh full

# Generate dashboard
python3 scripts/docs/generate-dashboard.py docs/reports

# View dashboard
xdg-open docs/reports/dashboard.html  # Linux
# or
open docs/reports/dashboard.html      # macOS
```

### 3. Monthly External Link Validation (15 minutes)

```bash
# Validate external links
python3 scripts/docs/validate-external-links.py docs/content

# View results
cat docs/reports/external-links-validation.md
```

### 4. Check for Uncommitted Changes

```bash
# Check Git status
bash scripts/docs/auto-sync-documentation.sh check

# If changes exist, synchronize
bash scripts/docs/auto-sync-documentation.sh sync

# Create PR
bash scripts/docs/auto-sync-documentation.sh pr
```

---

## 📊 Understanding the Output

### Health Score Interpretation

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | EXCELLENT ✅ | Maintain |
| 75-89 | GOOD 🟢 | Minor improvements |
| 60-74 | FAIR 🟡 | Active plan needed |
| 0-59 | NEEDS ATTENTION 🔴 | Urgent action |

### Common Issues and Fixes

#### Issue: Missing Frontmatter

**Fix**:
```bash
bash scripts/docs/fix-frontmatter.sh --auto-fix
```

#### Issue: Broken Links

**Fix**:
```bash
# Find broken links
bash scripts/docs/audit-documentation.sh --full | grep "Broken link"

# Fix manually or run link fixer
bash scripts/docs/fix-broken-links.sh
```

#### Issue: Outdated Content

**Fix**:
```bash
# Find files >90 days old
find docs/content -type f -name "*.md*" -mtime +90

# Update last_review dates
bash scripts/docs/update-last-reviewed.sh
```

---

## 🔄 Maintenance Schedule

### Daily (5 min) - Automated

```bash
# Add to crontab for automation
0 9 * * 1-5 cd /home/marce/Projetos/TradingSystem && bash scripts/docs/comprehensive-maintenance.sh quick
```

### Weekly (20 min) - Friday 3 PM

```bash
# Run comprehensive maintenance
bash scripts/docs/comprehensive-maintenance.sh full
python3 scripts/docs/generate-dashboard.py docs/reports
```

### Monthly (45 min) - 1st of Month

```bash
# Complete maintenance cycle
bash scripts/docs/comprehensive-maintenance.sh full
python3 scripts/docs/validate-external-links.py docs/content
python3 scripts/docs/generate-dashboard.py docs/reports
bash scripts/docs/auto-sync-documentation.sh check
```

---

## 📁 Report Locations

All reports in `docs/reports/`:

- **Main Report**: `comprehensive-maintenance-YYYYMMDD-HHMMSS.md`
- **Dashboard**: `dashboard.html`
- **External Links**: `external-links-validation.md`
- **Frontmatter**: `frontmatter-validation.json`
- **Optimization**: `optimization-report-YYYYMMDD-HHMMSS.md`
- **Readability**: `readability-report-YYYYMMDD-HHMMSS.md`

---

## 🆘 Quick Troubleshooting

### Script Permission Denied

```bash
chmod +x scripts/docs/*.sh scripts/docs/*.py
```

### Python Module Missing

```bash
pip install requests
```

### Git Not in Repository

```bash
cd /home/marce/Projetos/TradingSystem
git status
```

---

## 📚 Full Documentation

- **Complete Guide**: `docs/reports/COMPREHENSIVE-MAINTENANCE-SYSTEM.md`
- **Implementation**: `docs/reports/COMPREHENSIVE-SYSTEM-IMPLEMENTATION-2025-11-08.md`
- **Original System**: `docs/reports/COMPLETE-DOCUMENTATION-MAINTENANCE-SYSTEM.md`

---

*For detailed information, see COMPREHENSIVE-MAINTENANCE-SYSTEM.md*
