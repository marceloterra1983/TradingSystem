# Docusaurus Backup Verification Checklist

**Purpose**: Verify backup integrity before proceeding with restoration  
**Backup Location**: To be filled after backup creation  
**Verification Date**: To be filled during verification

---

## Section 1: Backup Metadata Verification

### Metadata Files Checklist

Verify all backup metadata files exist in `{BACKUP_DIR}/metadata/`:

- [ ] **MANIFEST.md** - Backup manifest with summary and metadata
- [ ] **manifest.json** - JSON format manifest for automation
- [ ] **FILE-LIST.txt** - Complete file list with relative paths
- [ ] **CHECKSUMS.md5** - MD5 checksums for all TypeScript/JavaScript files
- [ ] **RESTORATION-GUIDE.md** - Step-by-step restoration instructions
- [ ] **BACKUP-LOG.txt** - rsync output log
- [ ] **BACKUP-ERRORS.log** - Error log (should be empty or not exist)

**Verification Commands**:
```bash
BACKUP_DIR="/home/marce/projetos/TradingSystem/.backup-docusaurus-TIMESTAMP"
ls -la ${BACKUP_DIR}/metadata/
```

**Expected Result**: All files present except BACKUP-ERRORS.log (optional)

---

## Section 2: Critical Files Verification

### Configuration Files

Verify all critical configuration files were backed up to `{BACKUP_DIR}/docusaurus/`:

- [ ] **package.json** - Dependencies manifest
- [ ] **docusaurus.config.ts** - Main Docusaurus configuration
- [ ] **sidebars.ts** - Sidebar configuration
- [ ] **tsconfig.json** - TypeScript configuration
- [ ] **.gitignore** - Git ignore rules
- [ ] **.prettierrc** - Prettier configuration (optional)
- [ ] **.eslintrc.js** - ESLint configuration (optional)

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus
ls -la package.json docusaurus.config.ts sidebars.ts tsconfig.json .gitignore
```

**Expected Result**: All critical files present and readable

### Documentation Files

Verify documentation files:

- [ ] **README.md** - Main documentation (700+ lines)
- [ ] **TROUBLESHOOTING.md** - Troubleshooting guide
- [ ] **QUICK-START.md** - Quick start guide
- [ ] **THEME-GEMINI-CLI.md** - Theme documentation
- [ ] **THEME-CHANGES-SUMMARY.md** - Theme changes log (optional)
- [ ] **THEME-MIGRATION.md** - Migration guide (optional)
- [ ] **STATUS-FINAL.md** - Status report (optional)
- [ ] **GEMINI-CLI-EXACT-MATCH.md** - Theme matching docs (optional)

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus
ls -la *.md
wc -l README.md  # Should be 700+ lines
```

---

## Section 3: Source Code Verification

### Component Directories

Verify all custom component directories in `src/components/`:

- [ ] **ApiEndpoint/** - API endpoint documentation component
  - [ ] index.tsx
  - [ ] styles.module.css
- [ ] **CodeBlock/** - Code block component
  - [ ] index.tsx
- [ ] **FacetFilters/** - Faceted search filters
  - [ ] index.tsx
  - [ ] styles.module.css
- [ ] **HealthMetricsCard/** - Health metrics display
  - [ ] index.tsx
  - [ ] styles.module.css
- [ ] **HomepageFeatures/** - Homepage feature cards
  - [ ] index.tsx
  - [ ] styles.module.css
- [ ] **SearchBar/** - Custom search bar
  - [ ] index.tsx
  - [ ] styles.module.css
- [ ] **Tabs/** - Custom tabs component
  - [ ] index.tsx

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus/src/components
ls -la
find . -name "index.tsx" | wc -l  # Should be 7+
```

**Expected Result**: 7 component directories with index.tsx files

### Component Files

Verify standalone component files:

- [ ] **CookiesBanner.tsx** - Cookie consent banner
- [ ] **CopyButton.tsx** - Copy to clipboard button

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus/src/components
ls -la CookiesBanner.tsx CopyButton.tsx
```

### Theme Overrides

Verify theme overrides in `src/theme/`:

- [ ] **Layout/index.tsx** - Custom layout wrapper
- [ ] **SearchBar/index.tsx** - Search bar override
- [ ] **SearchBar/styles.module.css** - Search bar styles

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus/src/theme
ls -la Layout/index.tsx SearchBar/index.tsx SearchBar/styles.module.css
```

**Expected Result**: All theme override files present

### Custom Pages

Verify custom pages in `src/pages/`:

- [ ] **index.tsx** - Homepage
- [ ] **index.module.css** - Homepage styles
- [ ] **health/index.tsx** - Health dashboard
- [ ] **health/styles.module.css** - Health dashboard styles
- [ ] **search/index.tsx** - Advanced search
- [ ] **search/styles.module.css** - Search styles
- [ ] **spec/index.tsx** - OpenSpec viewer
- [ ] **markdown-page.md** - Example markdown page (optional)

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus/src/pages
ls -la index.tsx health/ search/ spec/
find . -name "*.tsx" | wc -l  # Should be 4+
```

**Expected Result**: 4 custom page directories/files

### Custom CSS

Verify custom styles in `src/css/`:

- [ ] **custom.css** - Gemini CLI dark theme

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus/src/css
ls -la custom.css
wc -l custom.css  # Should have substantial content
```

---

## Section 4: Static Assets Verification

### Image Assets

Verify critical images in `static/img/`:

- [ ] **logo.svg** - Main logo (light mode)
- [ ] **logo-dark.svg** - Dark mode logo
- [ ] **favicon.svg** - Favicon SVG
- [ ] **favicon.ico** - Favicon ICO fallback
- [ ] **docusaurus-social-card.jpg** - Social media card
- [ ] **undraw_*.svg** - Illustration assets (multiple files)

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus/static/img
ls -la logo.svg logo-dark.svg favicon.svg favicon.ico
find . -name "undraw_*.svg" | wc -l  # Should have several
```

**Expected Total Images**: 6+ files (including undraw illustrations)

### Configuration Files

Verify static configuration files:

- [ ] **static/.htaccess** - Apache server configuration
- [ ] **static/.nojekyll** - GitHub Pages configuration
- [ ] **static/clear-cache.html** - Cache clearing utility (optional)

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus/static
ls -la .htaccess .nojekyll
```

---

## Section 5: Scripts Verification

### Custom Scripts

Verify scripts in `scripts/` directory:

- [ ] **sync-spec.js** - OpenSpec sync script
  - [ ] File exists
  - [ ] Readable
  - [ ] Valid Node.js syntax
- [ ] **preview-theme.sh** - Theme preview script (optional)
  - [ ] File exists
  - [ ] Executable permission

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus/scripts
ls -la sync-spec.js preview-theme.sh
node --check sync-spec.js  # Validate syntax
```

---

## Section 6: Build Artifacts Exclusion Verification

### Verify Exclusions

**CRITICAL**: Verify build artifacts were NOT backed up:

- [ ] **node_modules/** - Should NOT exist in backup ✅
- [ ] **.docusaurus/** - Should NOT exist in backup ✅
- [ ] **build/** - Should NOT exist in backup ✅
- [ ] **package-lock.json** - Should NOT exist in backup ✅
- [ ] **\*.log** files - Should NOT exist in backup ✅

**Verification Commands**:
```bash
cd ${BACKUP_DIR}/docusaurus

# These commands should return "does not exist"
ls -ld node_modules 2>&1
ls -ld .docusaurus 2>&1
ls -ld build 2>&1
ls -l package-lock.json 2>&1
find . -name "*.log" 2>&1
```

**Expected Result**: All commands should fail (files/directories should not exist)

**If any exist**: ❌ Backup is incorrect - these should have been excluded

---

## Section 7: File Count Verification

### Compare File Counts

Compare source and backup file counts (excluding build artifacts):

**Source File Count**:
```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus
find . -type f | grep -v node_modules | grep -v .docusaurus | grep -v build | grep -v package-lock.json | wc -l
```

**Backup File Count**:
```bash
cd ${BACKUP_DIR}/docusaurus
find . -type f | wc -l
```

**Expected**: Counts should match (or backup slightly lower if optional files excluded)

**Typical Range**: 1,200-1,500 files (excluding node_modules)

### File Count by Type

Verify file counts by type:

```bash
cd ${BACKUP_DIR}/docusaurus

# TypeScript/JavaScript files
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | wc -l

# CSS files
find . -type f \( -name "*.css" -o -name "*.scss" \) | wc -l

# Markdown files
find . -type f -name "*.md" | wc -l

# Image files
find . -type f \( -name "*.svg" -o -name "*.png" -o -name "*.jpg" -o -name "*.ico" \) | wc -l
```

**Record Results**:
- TypeScript/JavaScript: _____ files
- CSS: _____ files
- Markdown: _____ files
- Images: _____ files

---

## Section 8: Checksum Verification

### Verify Checksums

Verify MD5 checksums for all backed up files:

```bash
cd ${BACKUP_DIR}/docusaurus
md5sum -c ../metadata/CHECKSUMS.md5
```

**Expected Result**: All checksums should match

**If checksums fail**:
1. Review which files failed
2. Check BACKUP-LOG.txt for errors
3. Re-run backup if critical files failed

### Manual Checksum Verification (Critical Files)

Manually verify critical files:

```bash
cd ${BACKUP_DIR}/docusaurus
md5sum package.json docusaurus.config.ts sidebars.ts

# Compare with source
cd /home/marce/projetos/TradingSystem/docs/docusaurus
md5sum package.json docusaurus.config.ts sidebars.ts
```

Checksums should match exactly.

---

## Section 9: Size Verification

### Backup Size Analysis

Verify backup size is reasonable:

```bash
# Total backup size (including metadata)
du -sh ${BACKUP_DIR}

# Docusaurus files only
du -sh ${BACKUP_DIR}/docusaurus

# Metadata size
du -sh ${BACKUP_DIR}/metadata
```

**Expected Sizes**:
- Docusaurus files: 5-10 MB (without node_modules)
- Metadata: < 1 MB
- Total: 6-11 MB

**Size Breakdown**:
```bash
cd ${BACKUP_DIR}/docusaurus

# Source code
du -sh src/

# Static assets
du -sh static/

# Documentation
du -sh *.md | sort -h
```

**Record Results**:
- src/: _____ MB
- static/: _____ MB
- Documentation: _____ MB
- Other: _____ MB

---

## Section 10: Restoration Test (Optional)

### Test Restoration

Perform a test restoration to temporary directory:

```bash
# Create test directory
mkdir /tmp/docusaurus-restore-test

# Restore backup
rsync -av ${BACKUP_DIR}/docusaurus/ /tmp/docusaurus-restore-test/

# Compare with source (excluding build artifacts)
diff -r /home/marce/projetos/TradingSystem/docs/docusaurus /tmp/docusaurus-restore-test \
  --exclude=node_modules \
  --exclude=.docusaurus \
  --exclude=build \
  --exclude=package-lock.json

# Clean up
rm -rf /tmp/docusaurus-restore-test
```

**Expected Result**: No differences (diff output should be empty)

**If differences found**: Review and investigate discrepancies

---

## Section 11: Backup Metadata Review

### Review Manifest

Review the backup manifest:

```bash
cat ${BACKUP_DIR}/metadata/MANIFEST.md
```

**Verify Manifest Contains**:
- [ ] Backup timestamp
- [ ] Source directory path
- [ ] Backup directory path
- [ ] Backup size
- [ ] Files backed up count
- [ ] Excluded patterns list
- [ ] Restoration command
- [ ] Checksum verification instructions

### Review JSON Manifest

Verify JSON manifest structure:

```bash
cat ${BACKUP_DIR}/metadata/manifest.json | jq .
```

**Required Fields**:
- [ ] timestamp
- [ ] backupTimestamp
- [ ] sourceDirectory
- [ ] backupDirectory
- [ ] sourceSizeEstimated
- [ ] backupSizeActual
- [ ] filesCopied
- [ ] backupDurationSeconds
- [ ] excludedPatterns
- [ ] status: "completed"

### Review File List

Check file list completeness:

```bash
wc -l ${BACKUP_DIR}/metadata/FILE-LIST.txt
head -20 ${BACKUP_DIR}/metadata/FILE-LIST.txt
tail -20 ${BACKUP_DIR}/metadata/FILE-LIST.txt
```

**Expected**: 1,200-1,500 lines (matching file count)

### Review Backup Log

Check for errors in backup log:

```bash
cat ${BACKUP_DIR}/metadata/BACKUP-LOG.txt | grep -i error
cat ${BACKUP_DIR}/metadata/BACKUP-LOG.txt | grep -i warning
```

**Expected**: No critical errors

---

## Section 12: Verification Summary

### Summary Statistics

**Complete the following after verification**:

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Metadata files | 6-7 | ___ | ⏳ |
| Critical config files | 7 | ___ | ⏳ |
| Documentation files | 8 | ___ | ⏳ |
| Component directories | 7 | ___ | ⏳ |
| Component files | 2 | ___ | ⏳ |
| Theme overrides | 3 | ___ | ⏳ |
| Custom pages | 4+ | ___ | ⏳ |
| Static images | 6+ | ___ | ⏳ |
| Scripts | 1-2 | ___ | ⏳ |
| Build artifacts | 0 | ___ | ⏳ |
| Total files | 1200-1500 | ___ | ⏳ |
| Backup size | 5-10 MB | ___ | ⏳ |
| Checksums | All pass | ___ | ⏳ |

### Verification Status

**Critical Verifications** (must pass):
- [ ] All critical configuration files present
- [ ] All source code directories present
- [ ] All static assets present
- [ ] No build artifacts included
- [ ] Checksums verified
- [ ] File count matches source

**Optional Verifications**:
- [ ] Documentation files complete
- [ ] All scripts present
- [ ] Restoration test passed

---

## Section 13: Sign-off

### Verification Decision

**If ALL critical verifications pass**:
- [x] Backup is complete and valid
- [x] All critical files are present
- [x] No build artifacts included
- [x] Checksums verified
- [x] **Ready to proceed with Phase 2 (cleanup)**

**If ANY critical verification fails**:
- [ ] Backup is incomplete or corrupted
- [ ] DO NOT proceed with Phase 2
- [ ] Review failure details below
- [ ] Re-run backup after fixing issues

### Verification Details

**Verified By**: ___________________  
**Verification Date**: ___________________  
**Backup Directory**: ___________________  
**Backup Size**: ___________________  
**Files Count**: ___________________  
**Status**: ✅ Valid / ❌ Invalid / ⚠️ Warnings

**Notes**:
```
[Add any observations, issues, or concerns here]
```

---

## Section 14: Troubleshooting Failed Verification

### Common Issues and Solutions

**Issue 1: Missing Critical Files**

**Symptoms**:
- package.json, docusaurus.config.ts, or other critical files missing

**Solution**:
```bash
# Check source files exist
ls -la /home/marce/projetos/TradingSystem/docs/docusaurus/package.json

# Re-run backup
bash scripts/docs/backup-docusaurus.sh

# Verify backup completed
ls -la ${BACKUP_DIR}/docusaurus/package.json
```

**Issue 2: Build Artifacts Included**

**Symptoms**:
- node_modules/, .docusaurus/, or build/ directories found in backup

**Solution**:
```bash
# This indicates backup script failed to exclude properly
# Remove incorrect backup
rm -rf ${BACKUP_DIR}

# Re-run backup (script should exclude these automatically)
bash scripts/docs/backup-docusaurus.sh
```

**Issue 3: Checksum Failures**

**Symptoms**:
- md5sum verification fails for multiple files

**Solution**:
```bash
# Check for disk errors
dmesg | grep -i error

# Verify source files are intact
cd /home/marce/projetos/TradingSystem/docs/docusaurus
git status  # Should show no modifications

# Re-run backup
bash scripts/docs/backup-docusaurus.sh
```

**Issue 4: File Count Mismatch**

**Symptoms**:
- Backup has significantly fewer files than source

**Solution**:
```bash
# Review backup log for errors
cat ${BACKUP_DIR}/metadata/BACKUP-LOG.txt | grep -i error

# Check disk space
df -h

# Re-run backup with verbose output
bash scripts/docs/backup-docusaurus.sh --verbose
```

**Issue 5: Backup Size Too Small**

**Symptoms**:
- Backup is < 5 MB (expected 5-10 MB)

**Solution**:
```bash
# Check what's missing
diff -r /home/marce/projetos/TradingSystem/docs/docusaurus ${BACKUP_DIR}/docusaurus \
  --brief \
  --exclude=node_modules \
  --exclude=.docusaurus \
  --exclude=build

# Investigate missing directories/files
# Re-run backup after fixing
```

---

## Section 15: Next Steps After Verification

### If Verification Passes

**Proceed with Phase 2 (Cleanup)**:

1. Document backup location in project documentation
2. Update RESTORATION-REPORT.md with backup details:
   ```bash
   echo "Backup Location: ${BACKUP_DIR}" >> docs/docusaurus/RESTORATION-REPORT.md
   echo "Backup Verified: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> docs/docusaurus/RESTORATION-REPORT.md
   ```
3. Proceed to Phase 2: Clean cache and build artifacts
4. **Keep backup until restoration is complete and verified**

**Phase 2 Commands**:
```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus
npm run clear
rm -rf node_modules .docusaurus build package-lock.json
```

### If Verification Fails

**Troubleshooting Steps**:

1. Review this checklist section-by-section
2. Identify specific failures
3. Review BACKUP-LOG.txt for errors
4. Fix identified issues
5. Re-run backup: `bash scripts/docs/backup-docusaurus.sh`
6. Re-run verification
7. Repeat until all verifications pass

**Do NOT proceed to Phase 2 until backup is verified!**

---

## Section 16: Backup Retention

### Backup Storage Guidelines

**Short-term Retention** (During Restoration):
- Keep backup for at least 7 days after successful restoration
- Verify Phase 4 (Validation) completes successfully
- Test all functionality before removing backup

**Long-term Retention** (Optional):
- Consider keeping backup for 30-90 days
- Store in safe location (external drive, cloud backup)
- Compress to save space: `tar -czf backup.tar.gz ${BACKUP_DIR}`

**Backup Location Documentation**:
```bash
# Document backup location
echo "Backup: ${BACKUP_DIR}" >> /home/marce/projetos/TradingSystem/docs/BACKUP-LOCATIONS.md
echo "Date: $(date)" >> /home/marce/projetos/TradingSystem/docs/BACKUP-LOCATIONS.md
```

---

## Important Notes

⚠️  **DO NOT delete the backup until**:
- Phase 2 (Cleanup) completes successfully
- Phase 3 (Reinstall) completes successfully
- Phase 4 (Validation) confirms all functionality works
- At least 7 days have passed since restoration

✅ **Keep backup secure**:
- Protect backup directory permissions
- Consider encryption for sensitive data
- Store in multiple locations if critical

📝 **Document everything**:
- Record backup location
- Note verification date
- Document any issues encountered
- Keep restoration guide accessible

---

**Checklist Version**: 1.0  
**Last Updated**: 2025-10-19  
**Next Review**: After Phase 2 (Cleanup)
