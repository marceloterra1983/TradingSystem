# Outputs Directory

This directory contains runtime outputs, logs, and generated artifacts from various services and tools.

**Last Cleanup:** 2025-11-13
**Total Size:** ~177MB

---

## 📁 Directory Structure

### Active Outputs

#### course-crawler/ (137MB)
**Purpose:** Course Crawler application downloads and metadata
**Retention:** 7 days (automatically cleaned)
**Content:**
- Downloaded course materials
- Session metadata
- Extraction results

**Management:**
```bash
# Clean sessions older than 7 days
find outputs/course-crawler -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

#### github-actions/ (37MB)
**Purpose:** GitHub Actions workflow logs and artifacts
**Retention:** Last 10 runs only
**Content:**
- Workflow execution logs
- Test results
- Build artifacts

**Management:**
```bash
# Keep only last 10 runs
cd outputs/github-actions
ls -t | tail -n +11 | xargs rm -rf
```

**Current Runs:** 10 (cleaned from 55 on 2025-11-13)

#### logs/ (1.6MB)
**Purpose:** Application and service logs
**Retention:** 30 days
**Content:**
- Service logs
- Error logs
- Access logs

#### governance/ (436KB)
**Purpose:** Documentation governance metrics and reports
**Retention:** Keep all (referenced by docs)
**Content:**
- Governance snapshots
- Quality metrics
- Validation reports

#### reports/ (360KB)
**Purpose:** Generated reports and analysis
**Retention:** Keep significant reports
**Content:**
- Performance reports
- Analysis results
- System diagnostics

#### waha/ (184KB)
**Purpose:** WAHA (WhatsApp HTTP API) outputs
**Retention:** 7 days
**Content:**
- Session data
- Message logs

#### env-backups/ (76KB)
**Purpose:** Environment variable backups (INTENTIONAL)
**Retention:** Keep all - critical backups
**Content:**
- `.env.backup-*` files
- Configuration snapshots

⚠️ **DO NOT DELETE** - These are intentional backup files!

#### crawler-course-meta/ (24KB)
**Purpose:** Course Crawler metadata cache
**Retention:** Keep active sessions
**Content:**
- Course metadata
- Session information

#### cursor/ (12KB)
**Purpose:** Cursor IDE outputs and artifacts
**Retention:** Keep recent
**Content:**
- IDE-generated files
- Temporary outputs

#### compose/ (8KB)
**Purpose:** Docker Compose related outputs
**Retention:** Keep current
**Content:**
- Compose artifacts
- Stack information

---

## 🧹 Cleanup Policy

### Automatic Cleanup (Recommended Schedule)

**Weekly:**
```bash
# Clean old Course Crawler sessions (>7 days)
bash scripts/maintenance/cleanup-outputs.sh --course-crawler

# Clean old GitHub Actions logs (keep last 10)
bash scripts/maintenance/cleanup-outputs.sh --github-actions
```

**Monthly:**
```bash
# Full cleanup with review
bash scripts/maintenance/cleanup-outputs.sh --dry-run
```

### Manual Cleanup

**Course Crawler:**
```bash
find outputs/course-crawler -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

**GitHub Actions:**
```bash
cd outputs/github-actions
ls -t | tail -n +11 | xargs rm -rf
```

**Logs:**
```bash
find outputs/logs -type f -mtime +30 -delete
```

---

## 📊 Size Management

### Current Breakdown

| Directory | Size | % of Total | Status |
|-----------|------|------------|--------|
| course-crawler | 137MB | 77.4% | Active |
| github-actions | 37MB | 20.9% | Cleaned |
| logs | 1.6MB | 0.9% | Active |
| governance | 436KB | 0.2% | Keep |
| reports | 360KB | 0.2% | Keep |
| waha | 184KB | 0.1% | Active |
| env-backups | 76KB | <0.1% | **Keep!** |
| Other | 68KB | <0.1% | Active |

### Growth Monitoring

**Expected Growth:**
- Course Crawler: ~20-30MB per session
- GitHub Actions: ~4-5MB per workflow run
- Logs: ~100KB per day

**Warning Thresholds:**
- Total outputs > 500MB → Run cleanup
- course-crawler > 200MB → Clean old sessions
- github-actions > 100MB → Keep fewer runs

---

## 🔒 Protected Directories

**NEVER DELETE:**
- `env-backups/` - Critical environment backups
- `governance/` - Referenced by documentation

**Review Before Delete:**
- `reports/` - May contain important analysis
- `logs/` - May be needed for debugging

---

## 📝 Cleanup History

### 2025-11-13 - Major Cleanup
- Deleted 45 old GitHub Actions runs
- Freed 197MB from github-actions/
- Moved obsolete BUILD-OPTIMIZATION docs to archive
- Removed empty directories
- Created this README

**Before:** 373MB total
**After:** 177MB total
**Saved:** 196MB (52.5% reduction)

---

## 🛠️ Maintenance Scripts

### Available Scripts

1. **cleanup-outputs.sh**
   - Location: `scripts/maintenance/cleanup-outputs.sh`
   - Dry-run mode available
   - Configurable retention policies

2. **Quick Commands**
   ```bash
   # Check total size
   du -sh outputs/

   # Check size breakdown
   du -sh outputs/*/ | sort -hr

   # Find large files
   find outputs/ -type f -size +10M

   # Find old files
   find outputs/ -type f -mtime +30
   ```

---

## 💡 Best Practices

1. ✅ **Regular Cleanup** - Run cleanup script weekly
2. ✅ **Monitor Growth** - Check sizes monthly
3. ✅ **Preserve Backups** - Never delete env-backups/
4. ✅ **Keep Recent** - Maintain last 7-14 days of data
5. ✅ **Archive Important** - Move significant reports to docs/

---

**Maintained By:** Automated cleanup scripts + manual review
**Next Review:** 2025-12-13
