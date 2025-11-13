# Outputs Directory Cleanup Report

**Date:** 2025-11-13
**Scope:** `/workspace/outputs/` directory
**Result:** 52.5% size reduction (373MB → 177MB)

> ⚠️ **Atualização 2025-11-13:** a stack `crawler-course-meta` foi descontinuada após esta limpeza. As referências a seguir permanecem apenas para manter o registro histórico do estado antes da remoção.

---

## 📊 Executive Summary

**Space Recovered:** 196MB
**Files Cleaned:**
- ✅ 45 old GitHub Actions workflow runs
- ✅ 11 obsolete documentation files
- ✅ 1 empty directory

**Directories Preserved:**
- ✅ env-backups/ (intentional backups)
- ✅ governance/ (referenced by docs)
- ✅ Recent course-crawler sessions (< 7 days)
- ✅ Last 10 GitHub Actions runs

---

## 📁 Before & After Comparison

### Before Cleanup (373MB total)

| Directory | Size | Files/Dirs | Notes |
|-----------|------|------------|-------|
| github-actions | 234MB | 55 runs | 45 old runs to delete |
| course-crawler | 137MB | 60 sessions | All recent (< 7 days) |
| logs | 1.6MB | Multiple | Keep |
| governance | 436KB | Multiple | Keep |
| reports | 360KB | Multiple | Keep |
| waha | 184KB | Multiple | Keep |
| env-backups | 76KB | 3 files | **Preserve!** |
| crawler-course-meta | 24KB | Multiple | Removido em 2025-11-13 |
| Obsolete docs | 140KB | 11 files | Move to archive |
| cursor | 12KB | Multiple | Keep |
| compose | 8KB | Multiple | Keep |
| cleanup | 0 | Empty dir | Remove |

### After Cleanup (177MB total)

| Directory | Size | Files/Dirs | Change |
|-----------|------|------------|--------|
| course-crawler | 137MB | 60 sessions | No change |
| github-actions | 37MB | 10 runs | **-197MB** ✅ |
| logs | 1.6MB | Multiple | No change |
| governance | 436KB | Multiple | No change |
| reports | 360KB | Multiple | No change |
| waha | 184KB | Multiple | No change |
| env-backups | 76KB | 3 files | No change |
| crawler-course-meta | — | — | Removido em 2025-11-13 |
| cursor | 12KB | Multiple | No change |
| compose | 8KB | Multiple | No change |

**Obsolete docs:** Moved to `/docs/archive/build-optimization/`
**Empty directories:** Removed

---

## 🗑️ What Was Cleaned

### 1. GitHub Actions Logs (45 runs - 197MB)

**Retention Policy:** Keep last 10 runs only

**Deleted Runs:**
- 45 workflow runs older than the 10 most recent
- Dates: Various runs from early November
- Content: Full logs, test results, build artifacts

**Preserved:**
- 10 most recent workflow runs
- Most recent logs for debugging

**Size Reduction:** 234MB → 37MB (84% reduction)

### 2. Obsolete Documentation (11 files - 140KB)

**Files Moved to `/docs/archive/build-optimization/`:**

1. BUILD-OPTIMIZATION-ANALYSIS-2025-11-08.md (11KB)
2. BUILD-OPTIMIZATION-EXECUTIVE-SUMMARY-2025-11-08.md (11KB)
3. BUILD-OPTIMIZATION-FINAL-SUMMARY-2025-11-08.md (11KB)
4. BUILD-OPTIMIZATION-IMPLEMENTATION-2025-11-08.md (11KB)
5. BUILD-OPTIMIZATION-PHASE2-RESULTS-2025-11-08.md (14KB)
6. BUILD-OPTIMIZATION-PHASE3-RESULTS-2025-11-08.md (14KB)
7. BUILD-OPTIMIZATION-QUICK-REFERENCE-2025-11-08.md (4KB)
8. BUILD-OPTIMIZATION-SUMMARY-2025-11-08.md (8KB)
9. config-migration-timeline.txt (16KB)
10. PORT-MAP-VISUALIZATION.txt (12KB)
11. README-CRAWLER-COURSE-META.md (15KB)

**Reason:** These are session-specific reports from Nov 8 that are no longer actively referenced. Moved to archive for historical reference.

### 3. Empty Directories (1 dir)

**Removed:**
- `cleanup/` - Empty directory with no content

---

## 📦 What Was Preserved

### Critical Backups

**env-backups/ (76KB) - PRESERVED**
- `.env.backup-20251107-201508`
- `.env.backup-vite-fix-20251107-201603`
- `.env.backup-backup`

⚠️ **NEVER DELETE** - These are intentional environment variable backups!

### Active Data

**course-crawler/ (137MB) - ALL PRESERVED**
- 60 download sessions
- All sessions from last 7 days
- No old sessions found

**logs/ (1.6MB) - PRESERVED**
- Active service logs
- Within 30-day retention window

**governance/ (436KB) - PRESERVED**
- Referenced by documentation
- Governance metrics and snapshots

**reports/ (360KB) - PRESERVED**
- Performance reports
- System diagnostics
- Analysis results

**Other Directories:**
- waha/ (184KB) - Active WhatsApp API data
- ~~crawler-course-meta/ (24KB) - Metadata cache~~ (serviço removido)
- cursor/ (12KB) - IDE outputs
- compose/ (8KB) - Docker Compose artifacts

---

## 📊 Size Breakdown After Cleanup

### Directory Distribution

```
Total: 177MB

course-crawler  ████████████████████████████████████████ 137MB (77.4%)
github-actions  ███████                                  37MB  (20.9%)
logs            █                                        1.6MB (0.9%)
governance      █                                        436KB (0.2%)
reports         █                                        360KB (0.2%)
waha            █                                        184KB (0.1%)
env-backups     █                                        76KB  (<0.1%)
other           █                                        68KB  (<0.1%)
```

### Growth Projections

**Expected Daily Growth:**
- Course Crawler: ~20-30MB per session (varies)
- GitHub Actions: ~4-5MB per workflow run
- Logs: ~100KB per day

**Cleanup Thresholds:**
- Total > 500MB → Run full cleanup
- course-crawler > 200MB → Clean old sessions
- github-actions > 100MB → Reduce run retention

---

## 🛠️ Cleanup Scripts Created

### 1. cleanup-outputs.sh

**Location:** `/workspace/scripts/maintenance/cleanup-outputs.sh`

**Features:**
- Dry-run mode for safety
- Configurable retention policies
- Automatic size calculation
- Interactive confirmation
- Detailed reporting

**Usage:**
```bash
# Preview what will be deleted
bash scripts/maintenance/cleanup-outputs.sh --dry-run

# Execute cleanup
bash scripts/maintenance/cleanup-outputs.sh
```

**Policies:**
- GitHub Actions: Keep last 10 runs
- Course Crawler: Keep last 7 days
- Logs: Keep last 30 days
- Preserve: env-backups, governance

### 2. Quick Manual Commands

**GitHub Actions cleanup:**
```bash
cd outputs/github-actions
ls -t | tail -n +11 | xargs rm -rf
```

**Course Crawler cleanup (>7 days):**
```bash
find outputs/course-crawler -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

**Old logs cleanup (>30 days):**
```bash
find outputs/logs -type f -mtime +30 -delete
```

---

## 📋 Outputs README Created

**Location:** `/workspace/outputs/README.md`

**Contents:**
- Directory structure documentation
- Retention policies for each directory
- Cleanup commands and scripts
- Size management guidelines
- Protected directories list
- Best practices

**Purpose:** Ensures future users/agents understand the outputs directory organization and cleanup policies.

---

## 🔄 Maintenance Schedule

### Weekly (Automated)

```bash
# Clean old Course Crawler sessions
find outputs/course-crawler -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;

# Maintain GitHub Actions runs (keep last 10)
cd outputs/github-actions && ls -t | tail -n +11 | xargs rm -rf
```

### Monthly (Manual Review)

```bash
# Run cleanup script with dry-run
bash scripts/maintenance/cleanup-outputs.sh --dry-run

# Review and execute if needed
bash scripts/maintenance/cleanup-outputs.sh
```

### Quarterly (Deep Clean)

- Review all preserved directories
- Archive important reports to docs/
- Evaluate retention policies
- Update documentation

---

## ✅ Verification Checklist

After cleanup, verify:

- [x] GitHub Actions: Only 10 most recent runs present
- [x] Course Crawler: All sessions < 7 days old preserved
- [x] env-backups: All backup files intact
- [x] governance: All files preserved
- [x] No empty directories remain
- [x] Total size reduced by expected amount
- [x] Scripts created and tested
- [x] README documentation created

---

## 📚 Related Documentation

**Archive Locations:**
- Build optimization docs: `/docs/archive/build-optimization/`
- Other archived docs: `/docs/archive/`

**Cleanup Scripts:**
- Main cleanup script: `/scripts/maintenance/cleanup-outputs.sh`
- Outputs README: `/outputs/README.md`

**Reports:**
- This report: `/docs/OUTPUTS-CLEANUP-REPORT-2025-11-13.md`
- Full cleanup report: `/docs/COMPLETE-CLEANUP-REPORT-2025-11-13.md`

---

## 🎯 Results Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Size | 373MB | 177MB | **-196MB** |
| GitHub Actions Runs | 55 | 10 | -45 runs |
| Obsolete Docs | 11 | 0 | Archived |
| Empty Dirs | 1 | 0 | Removed |
| **Reduction** | - | - | **52.5%** |

---

## 💡 Lessons Learned

### What Worked Well
1. ✅ Keeping last N runs strategy (GitHub Actions)
2. ✅ Time-based retention (7 days for course-crawler)
3. ✅ Preserving intentional backups (env-backups/)
4. ✅ Moving obsolete docs to archive (not deleting)
5. ✅ Creating comprehensive documentation (README)

### Recommendations
1. ✅ Implement automated weekly cleanup (cron job)
2. ✅ Monitor outputs/ size in health checks
3. ✅ Consider log rotation for large log files
4. ✅ Archive important reports before cleanup

---

**Cleanup Completed:** ✅ SUCCESS
**Space Saved:** 196MB (52.5% reduction)
**Next Cleanup:** 2025-11-20 (weekly) or 2025-12-13 (monthly review)
