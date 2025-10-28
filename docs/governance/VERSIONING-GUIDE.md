# Documentation Versioning Guide

**Purpose**: Comprehensive guide for creating, managing, and deprecating documentation versions.

**Audience**: DocsOps, Release Managers, Contributors

**Last Updated**: 2025-10-28

---

## Overview

The TradingSystem documentation uses **Docusaurus native versioning** to maintain immutable snapshots aligned with system releases. This ensures users can access documentation for their specific version while the latest development docs remain accessible.

### Key Concepts

- **current** (Next): Unreleased development version (`/next/` path)
- **Latest Stable**: Most recent release version (`/` root path)
- **Versioned Snapshots**: Immutable copies of docs at release time
- **Retention Policy**: Keep current + 2 latest stable versions

---

## Version Strategy

### When to Create Versions

✅ **DO create versions for**:
- Major system releases (1.0.0, 2.0.0)
- Breaking API changes
- Significant feature additions
- Phase completions (e.g., Phase 6 launch)

❌ **DON'T create versions for**:
- Minor bug fixes
- Documentation typos/formatting
- Internal content updates
- Patch releases (unless API breaking)

### Version Naming

**Use semantic versioning (semver)**:
- Format: `MAJOR.MINOR.PATCH` (e.g., `1.0.0`, `2.1.0`)
- Major: Breaking changes
- Minor: New features (backwards compatible)
- Patch: Bug fixes (typically not versioned)

**Examples**:
```bash
# Major release (Phase 6 launch)
npx docusaurus docs:version 1.0.0

# Major release with breaking API changes
npx docusaurus docs:version 2.0.0

# Minor release with new features
npx docusaurus docs:version 2.1.0
```

---

## Creating a New Version

### Pre-Version Checklist

Before creating a version, ensure:

- [ ] All planned features for release are complete
- [ ] All critical issues (P0/P1) resolved
- [ ] Content review complete (see `REVIEW-CHECKLIST.md`)
- [ ] Full validation suite passed (`npm run docs:check`)
- [ ] Link validation passed (`npm run docs:links`)
- [ ] Stakeholder sign-offs received
- [ ] Release notes prepared

### Version Creation Procedure

#### Step 1: Pre-Version Validation

```bash
cd /home/marce/Projetos/TradingSystem/docs

# Run full validation suite
npm run docs:check

# Expected: All steps pass (auto, validate-generated, lint, typecheck, test, build)
```

#### Step 2: Verify Current Content

```bash
# Count current files
find content/ -name "*.mdx" | wc -l

# Expected: ~135-200 files

# Check for uncommitted changes
git status

# Expected: Working directory clean
```

#### Step 3: Create Version Snapshot

```bash
# Create version (replace X.X.X with actual version)
npx docusaurus docs:version 1.0.0

# Expected output: [SUCCESS] [docs]: version 1.0.0 created!
```

#### Step 4: Verify Version Created

```bash
# Check versions.json
cat versions.json

# Expected: ["1.0.0"]

# Count versioned files
find versioned_docs/version-1.0.0/ -name "*.mdx" | wc -l

# Expected: Same count as content/ (~135-200)

# Verify sidebar snapshot
ls -lh versioned_sidebars/version-1.0.0-sidebars.json

# Expected: File exists and is non-empty (> 1KB)
```

#### Step 5: Update Version Configuration (First Version Only)

If this is the **first version** (1.0.0), update `docusaurus.config.js`:

```javascript
versions: {
  current: {
    label: 'Next (Unreleased) 🚧',
    path: 'next',
    banner: 'unreleased',
  },
  '1.0.0': {
    label: '1.0.0 (Stable) ✅',
    path: '',  // Root path
    banner: 'none',
  },
},
```

For subsequent versions, Docusaurus updates automatically.

#### Step 6: Test Build

```bash
# Test production build
npm run docs:build

# Expected: Build completes in < 120s
# Expected: Both versions present (build/1.0.0/ and build/next/)
```

#### Step 7: Run Post-Version Validation

```bash
# Run full validation
npm run docs:check

# Expected: All validations pass

# Run link validation
npm run docs:links

# Expected: < 5 broken links per version (internal links valid)
```

#### Step 8: Test Version Navigation

```bash
# Start dev server
npm run docs:dev

# Manual verification:
# 1. Version dropdown visible in navbar (top right)
# 2. Dropdown shows "1.0.0 (Stable)" and "Next (Unreleased)"
# 3. Click "1.0.0" → Navigate to / (root)
# 4. Click "Next" → Navigate to /next/
# 5. Banner shows on "Next" version (yellow unreleased warning)
# 6. No banner on "1.0.0" (stable)

# Stop server: Ctrl+C
```

#### Step 9: Commit Version Snapshot

```bash
# Stage version files
git add versions.json versioned_docs/ versioned_sidebars/

# If first version, also stage config
git add docusaurus.config.js

# Commit with descriptive message
git commit -m "docs: version 1.0.0

🚀 First stable documentation snapshot after Phase 6 launch.

Snapshot Details:
- Files versioned: 199
- Categories: 12 (Apps, API, Frontend, Database, Tools, etc.)
- Build time: ~75s (baseline 60s + 15s for version)
- Validation: All tests passed

Users can now:
- View current (Next) docs at /next/
- View stable (1.0.0) docs at /
- Switch versions via navbar dropdown

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to repository
git push origin main
```

#### Step 10: Announce New Version

- [ ] Post to #docs-migration Slack channel
- [ ] Update internal wiki/confluence
- [ ] Send email to stakeholders (use `COMMUNICATION-PLAN.md` template)
- [ ] Add release notes to GitHub Releases

---

## Managing Versions

### Listing Versions

```bash
# List all versions
npm run docs:version:list

# Expected output: ["1.0.0"] or ["2.0.0", "1.0.0"]
```

### Building Specific Versions

```bash
# Build only current version (fast dev builds)
npm run docs:build:fast

# Build all versions (production)
npm run docs:build
```

### Updating Content in Versions

**IMPORTANT**: Versioned docs are **immutable snapshots**. Changes should only be made in exceptional cases.

#### Updating Current (Unreleased) Version

Edit files in `content/` as usual. Changes appear in `/next/` path.

#### Updating Stable Versions (Rare)

**Only update stable versions for**:
- Critical security issues
- Factual errors causing user harm
- Broken links to internal resources

**Procedure**:
1. Edit files in `versioned_docs/version-X.X.X/`
2. Test build: `npm run docs:build`
3. Commit with reason: `fix(docs): correct critical security info in v1.0.0`

**DO NOT update stable versions for**:
- Minor typos
- Style/formatting changes
- Outdated content (users should migrate to newer version)

---

## Version Deprecation

### Retention Policy

**Keep active**:
- current (Next) - Always
- Latest stable (e.g., 2.0.0)
- Previous stable (e.g., 1.5.0)

**Archive or remove**:
- Versions > 2 releases old (e.g., 1.0.0 when 2.0.0 is stable)

### Deprecation Process

#### Phase 1: Deprecation Notice (12 months)

1. **Add deprecation banner** to version config:

```javascript
// docusaurus.config.js
versions: {
  '1.0.0': {
    label: '1.0.0 (Deprecated)',
    path: 'v1.0.0',
    banner: 'unmaintained',
  },
}
```

2. **Announce deprecation**:
   - Slack notification
   - Email to users
   - Banner message: "⚠️ This version will be removed on [DATE]. Migrate to v2.0.0 →"

3. **Document migration path**:
   - Create `migration/v1-to-v2.md` guide
   - Highlight breaking changes
   - Provide code examples

#### Phase 2: Removal (After 12 months)

1. **Remove version from versions.json**:

```bash
# Edit versions.json
# Remove "1.0.0" from array
```

2. **Delete version directories**:

```bash
# Archive before deletion (optional)
mkdir -p ../docs-archive/
cp -r versioned_docs/version-1.0.0 ../docs-archive/version-1.0.0-$(date +%Y%m%d)

# Delete version files
rm -rf versioned_docs/version-1.0.0
rm versioned_sidebars/version-1.0.0-sidebars.json
```

3. **Update navbar config** (if needed):

Remove version-specific entries from `docusaurus.config.js`.

4. **Commit removal**:

```bash
git add versions.json versioned_docs/ versioned_sidebars/ docusaurus.config.js
git commit -m "docs: remove deprecated version 1.0.0

Version 1.0.0 deprecated on [DATE-12-MONTHS-AGO].
All users have been notified and given 12 months to migrate.

Migration guide: docs/migration/v1-to-v2.md
Archived at: ../docs-archive/version-1.0.0-YYYYMMDD

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

5. **Announce removal**:
   - Final Slack notification
   - Update migration guide with archive location

---

## Troubleshooting

### Issue: Version Creation Failed

**Symptoms**: `npx docusaurus docs:version X.X.X` fails or produces errors

**Diagnosis**:
```bash
# Check for uncommitted changes
git status

# Check current content validity
npm run docs:check
```

**Solution**:
1. Commit or stash uncommitted changes
2. Fix validation errors in current content
3. Retry version creation

---

### Issue: Build Time Exceeds 120s

**Symptoms**: `npm run docs:build` takes > 120s with 3 versions

**Diagnosis**:
```bash
# Time the build
time npm run docs:build

# Check version count
npm run docs:version:list
```

**Solution**:
1. **Short-term**: Archive oldest version (see Deprecation Process)
2. **Medium-term**: Use `onlyIncludeVersions` in dev mode (already configured)
3. **Long-term**: Consider deprecating versions > 2 years old

---

### Issue: Version Dropdown Not Visible

**Symptoms**: Navbar doesn't show version selector

**Diagnosis**:
```bash
# Check versions.json exists
cat versions.json

# Check docusaurus.config.js
grep -A5 "docsVersionDropdown" docusaurus.config.js
```

**Solution**:
1. Verify at least one version exists in `versions.json`
2. Verify `docsVersionDropdown` in navbar items (should be present)
3. Clear cache: `rm -rf .docusaurus` and rebuild

---

### Issue: Broken Links in Versioned Docs

**Symptoms**: `npm run docs:links` reports broken links in version-X.X.X

**Diagnosis**:
```bash
# Run link check
npm run docs:links 2>&1 | grep "version-X.X.X"
```

**Solution**:
1. **Internal links**: Fix in current (`content/`) then create new version
2. **External links**: Document in `governance/KNOWN-ISSUES.md` (acceptable for archived versions)
3. **Critical links**: Update versioned docs directly (rare exception)

---

## Best Practices

### DO ✅

- Create versions on major releases
- Test build performance before and after versioning
- Run full validation suite before creating versions
- Announce new versions to users
- Document migration paths between versions
- Keep retention policy (current + 2 stable)

### DON'T ❌

- Create versions for every minor change
- Edit versioned docs frequently (immutable snapshots)
- Skip validation before version creation
- Create versions without stakeholder approval
- Keep more than 3 active versions (performance impact)

---

## Version Labels Reference

### Label Format

```javascript
{
  label: 'X.X.X (Status) Emoji',
  path: 'path-segment',
  banner: 'banner-type',
}
```

### Status Labels

| Status | Label | Emoji | Banner | Use Case |
|--------|-------|-------|--------|----------|
| Unreleased | Next (Unreleased) | 🚧 | unreleased | Development version |
| Stable | X.X.X (Stable) | ✅ | none | Latest release |
| Previous | X.X.X | - | none | Previous stable |
| Deprecated | X.X.X (Deprecated) | - | unmaintained | End-of-life notice |

### Path Conventions

- `current` → `/next/` (unreleased)
- Latest stable → `/` (root)
- Older versions → `/vX.X.X/`

---

## Monitoring & Metrics

### Track These Metrics

1. **Build Performance**
   - Target: < 120s with 3 versions
   - Measure: `time npm run docs:build`
   - Alert: > 120s

2. **Storage Usage**
   - Target: < 10MB per version
   - Measure: `du -sh versioned_docs/`
   - Alert: Rapid growth (> 15MB per version)

3. **Version Count**
   - Target: current + 2 stable (3 total)
   - Measure: `npm run docs:version:list`
   - Alert: > 4 active versions

4. **Link Health**
   - Target: < 5 broken links per version
   - Measure: `npm run docs:links`
   - Frequency: Weekly

### Quarterly Review

Run this checklist every quarter:

- [ ] Review active versions (deprecate old versions)
- [ ] Check build performance (< 120s target)
- [ ] Review storage usage (< 30MB total)
- [ ] Run link validation on all versions
- [ ] Update this guide if procedures changed

---

## Related Documentation

- [README.md](../README.md) - Quick versioning commands
- [VALIDATION-GUIDE.md](./VALIDATION-GUIDE.md) - Validation procedures (includes version validation)
- [MAINTENANCE-CHECKLIST.md](./MAINTENANCE-CHECKLIST.md) - Quarterly maintenance tasks
- [COMMUNICATION-PLAN.md](./COMMUNICATION-PLAN.md) - Announcement templates

---

## Appendix: Command Reference

### Version Management

```bash
# Create version
npx docusaurus docs:version <VERSION>

# List versions
npm run docs:version:list

# Build fast (current only)
npm run docs:build:fast

# Build all versions
npm run docs:build
```

### Validation

```bash
# Full validation suite
npm run docs:check

# Link validation
npm run docs:links

# Manual checks
find versioned_docs/version-X.X.X/ -name "*.mdx" | wc -l
cat versions.json
```

### Cleanup

```bash
# Remove version
rm -rf versioned_docs/version-X.X.X
rm versioned_sidebars/version-X.X.X-sidebars.json
# Edit versions.json to remove entry

# Clear build cache
rm -rf .docusaurus build/
```

---

**Version**: 1.0.0
**Last Updated**: 2025-10-28
**Next Review**: 2026-01-28 (Quarterly)
