# Documentation Validation Guide

**Purpose**: Execute the complete validation suite to ensure docs is launch-ready.

**Audience**: DocsOps, Release Engineers, QA Team

**Timeline**: Run during Week 3 of review (Nov 7-14) and before every release

## Metrics & Evidence

- **KPI**: Tempo total da suíte (`totalValidationMinutes`) — meta ≤ 20 minutos por execução.
- **Registro**: Após cada rodada, registrar duração e status no `review-tracking.csv` (`GovernanceStatus`, `LastAuditDate`) e anexar log da execução (arquivo `.log` ou captura) em `EvidenceLink`.
- **Checkpoint**: Se alguma etapa falhar, abrir issue vinculada e registrar o link no mesmo campo.

## Validation Suite Overview

**The complete validation suite consists of 10 validation layers:**

1. **Content Generation** (`docs:auto`) - Generate reference content from source files
2. **Generated Content Validation** (`docs:validate-generated`) - Verify generation succeeded
3. **Markdown Linting** (`docs:lint`) - Check markdown syntax and style
4. **TypeScript Type Checking** (`docs:typecheck`) - Validate TypeScript in MDX files
5. **Unit Tests** (`docs:test`) - Run automation script tests
6. **Build Validation** (`docs:build`) - Ensure Docusaurus builds successfully
7. **Link Validation** (`docs:links`) - Check all internal and external links
8. **Technical References Validation** (`docs/scripts/validate-technical-references.sh`) - Ensure legacy references removed and docs adoption verified
9. **Frontmatter Validation** (`validate-frontmatter.py`) - Validate YAML frontmatter
10. **Version Validation** (manual/script) - Validate versioned documentation snapshots

**Total Execution Time**: ~10-20 minutes (depending on version count)

---

## Pre-Validation Checklist

**Before running validation:**

- [ ] All content migration complete (no placeholder files)
- [ ] All review feedback addressed
- [ ] All stakeholder sign-offs received
- [ ] Git working directory clean (no uncommitted changes)
- [ ] Latest code pulled from main branch
- [ ] Dependencies installed (`npm install` in docs/)
- [ ] Python dependencies installed (`pip install pyyaml` for validate-frontmatter.py)

---

## Validation Procedure

### Step 1: Content Generation

**Purpose**: Generate reference content from source files (ports table, design tokens).

**Command**:
```bash
cd docs
npm run docs:auto
```

**Expected Output**:
```
🔄 docs:auto - Generating documentation content...

✅ Task: Generate ports table from service-port-map.md
   Generated: content/tools/ports-services/overview.mdx
   Services: 23 (12 application, 11 data/monitoring)

✅ Task: Generate design tokens from tailwind.config.js
   Generated: content/frontend/design-system/tokens.mdx
   Tokens: 13 (color.primary variants)

⚠️  Task: Update MCP registry automation status
   Updated: content/mcp/registry.mdx
   Status: TODO (configs external to repo)

✅ Content generation complete
   Generated: 2 files
   Updated: 1 file
   Duration: 2.3s
```

**Validation**:
- [ ] All tasks complete successfully (no errors)
- [ ] Generated files have current timestamps
- [ ] Generated content looks correct (spot check tables)
- [ ] No manual edits overwritten (check git diff)

**If Fails**:
- Check source files exist (service-port-map.md, tailwind.config.js)
- Verify source file format is valid (markdown tables, JS config)
- Review error messages for specific issues
- Fix source files and re-run

---

### Step 2: Generated Content Validation

**Purpose**: Verify generated sections have proper structure and markers.

**Command**:
```bash
cd docs
npm run docs:validate-generated
```

**Expected Output**:
```
✅ ports-services/overview.mdx has valid generated content
✅ frontend/design-system/tokens.mdx has valid generated content
✅ mcp/registry.mdx has automation status marker
✅ generated files have recent timestamps
✅ generated sections contain only auto-generated content
✅ generated files preserve frontmatter

6 tests passed
```

**Validation**:
- [ ] All tests pass (6/6)
- [ ] No warnings or errors
- [ ] Timestamps are within last 24 hours

**If Fails**:
- Re-run docs:auto
- Check for manual edits in generated sections (revert if found)
- Verify generation markers present (BEGIN/END AUTO-GENERATED)
- Review test output for specific failures

---

### Step 3: Markdown Linting

**Purpose**: Check markdown syntax, style, and frontmatter schema.

**Command**:
```bash
cd docs
npm run docs:lint
```

**Expected Output**:
```
markdownlint "content/**/*.{md,mdx}"
✅ No issues found

remark content --ext mdx
✅ No issues found
```

**Validation**:
- [ ] markdownlint passes (0 issues)
- [ ] remark passes (0 issues)
- [ ] No warnings about frontmatter schema

**If Fails**:
- Review error messages (file path, line number, rule)
- Fix markdown syntax issues (unclosed tags, broken tables)
- Fix frontmatter issues (missing fields, invalid YAML)
- Re-run lint after fixes

**Common Issues**:
- Unclosed code blocks (missing closing ```)
- Broken tables (misaligned pipes)
- Invalid frontmatter YAML (indentation, quotes)
- Long lines (>120 characters, if rule enabled)

---

### Step 4: TypeScript Type Checking

**Purpose**: Validate TypeScript code in MDX files and React components.

**Command**:
```bash
cd docs
npm run docs:typecheck
```

**Expected Output**:
```
tsc --noEmit
✅ No type errors found
```

**Validation**:
- [ ] TypeScript compilation succeeds
- [ ] No type errors in MDX files
- [ ] No type errors in custom components

**If Fails**:
- Review error messages (file, line, type error)
- Fix type issues (add types, fix imports)
- Ensure all dependencies have type definitions
- Re-run typecheck after fixes

---

### Step 5: Unit Tests

**Purpose**: Run automation script tests and validation tests.

**Command**:
```bash
cd docs
npm run docs:test
```

**Expected Output**:
```
✅ docs-auto scaffolds placeholder content idempotently
✅ parseServicePortMap extracts service data correctly
✅ generatePortsTable creates valid markdown
✅ extractTailwindTokens parses config correctly
✅ generateTokensTable creates valid markdown
✅ docs-auto generates all content successfully
✅ docs-auto handles missing source files gracefully
✅ ports-services/overview.mdx has valid generated content
✅ frontend/design-system/tokens.mdx has valid generated content
✅ mcp/registry.mdx has automation status marker

10 tests passed
```

**Validation**:
- [ ] All tests pass (10/10 or more)
- [ ] No test failures or errors
- [ ] Test execution time acceptable (<10 seconds)

**If Fails**:
- Review test output for specific failures
- Fix failing tests (update code or test expectations)
- Ensure test data is valid
- Re-run tests after fixes

---

### Step 6: Build Validation

**Purpose**: Ensure Docusaurus builds successfully without errors.

**Command**:
```bash
cd docs
npm run docs:build
```

**Expected Output**:
```
[INFO] Building documentation...
[INFO] Compiling React components...
[INFO] Generating static pages...
[SUCCESS] Build completed in 45.2s

Output directory: build/
Static files: 250+
Pages generated: 135+
```

**Validation**:
- [ ] Build completes successfully (exit code 0)
- [ ] No errors in build output
- [ ] Warnings reviewed and acceptable (if any)
- [ ] Build time acceptable (<5 minutes)
- [ ] Output directory created (build/)
- [ ] All pages generated (135+)

**If Fails**:
- Review error messages (component errors, plugin errors)
- Fix broken MDX syntax (unclosed tags, invalid JSX)
- Fix plugin configuration issues
- Ensure all dependencies installed
- Re-run build after fixes

**Common Issues**:
- Invalid JSX in MDX files
- Missing React component imports
- Plugin configuration errors
- Out of memory (increase Node.js heap: `NODE_OPTIONS="--max-old-space-size=4096"`)

---

### Step 7: Link Validation

**Purpose**: Check all internal and external links are valid.

**Command**:
```bash
cd docs
npm run docs:links
```

**Expected Output**:
```
[INFO] Building site for link validation...
[INFO] Running linkinator on build/...

✅ Scanned 135 pages
✅ Checked 500+ links
✅ 0 broken links found

Internal links: 450 (100% valid)
External links: 50 (100% valid)
```

**Validation**:
- [ ] Linkinator completes successfully
- [ ] 0 broken links (or all broken links documented as acceptable)
- [ ] Internal links 100% valid
- [ ] External links >95% valid (some may be temporarily down)

**If Fails**:
- Review broken links report (file, link, status code)
- Fix broken internal links (update paths)
- Fix broken external links (find replacement or remove)
- Document acceptable broken links (external sites down temporarily)
- Re-run link validation after fixes

**Acceptable Broken Links**:
- External sites temporarily down (verify manually)
- Placeholder links to future content (document in backlog)
- Links to local services not running (document requirement)

---

### Step 8: Technical References Validation

**Purpose**: Ensure all technical references to the legacy documentation system have been updated to `docs`. The validator automatically skips `docs/governance/**` and `docs/migration/**` because those directories carry the migration playbooks and appendices managed separately.

**Command**:
```bash
bash docs/scripts/validate-technical-references.sh
```

**Optional**:
- Run with `--verbose` for detailed logging (includes which search backend is selected)
- Run with `--strict` to fail on warnings
- Override adoption thresholds when needed (e.g. staging hardening):
  ```bash
  EXPECTED_DOCS_V2_MIN=75 EXPECTED_DOCS_PORT_MIN=30 EXPECTED_DOCS_API_PORT_MIN=20 bash docs/scripts/validate-technical-references.sh --strict
  ```

**Expected Output**:
```
[SUCCESS] No legacy docs/docusaurus references detected (outside excluded paths)
[SUCCESS] No legacy port 3004 references detected (outside excluded paths)
[SUCCESS] Found 82 docs references (threshold 50)
[SUCCESS] Found 58 references to port 3400 (threshold 20)
[SUCCESS] Found 41 references to port 3401 (threshold 20)
[SUCCESS] CORS_ORIGIN definitions reference ports 3400 and 3401
[SUCCESS] services-manifest.json references docs on port 3400
[SUCCESS] package.json validate-docs script references docs/content
[WARNING] .env.example still references legacy documentation or port

Errors: 0
Warnings: 1
Result: PASSED with warnings
```

**Validation**:
- [ ] No matches for `docs/docusaurus` (outside archived directories)
- [ ] No matches for port `3004` (outside archived directories)
- [ ] `docs` references meet the configured minimum (`EXPECTED_DOCS_V2_MIN`, default 50)
- [ ] Port `3400` references meet the configured minimum (`EXPECTED_DOCS_PORT_MIN`, default 20)
- [ ] Port `3401` references meet the configured minimum (`EXPECTED_DOCS_API_PORT_MIN`, default 10)
- [ ] `CORS_ORIGIN` values updated to 3400/3401 (no residual 3004)
- [ ] `config/services-manifest.json` `docusaurus` entry resolves to `docs` / `3400` via jq check
- [ ] `package.json` `validate-docs` script updated to `docs/content`
- [ ] `.env.example` guidance updated to docs and port 3400
- [ ] `docs/governance/**` and `docs/migration/**` contain only approved migration narratives

**If Fails**:
- Review `docs/migration/COMPLETE-REFERENCE-INVENTORY.md` to locate outstanding references
- Update status in `docs/migration/REFERENCE-UPDATE-TRACKING.md`
- Fix offending files and re-run the validation script
- For `.env`/CORS warnings, validate environment-specific overrides before suppressing
- For services-manifest failures, run `jq '.services[] | select(.id == "docusaurus")' config/services-manifest.json` to inspect the effective path/port

**Troubleshooting**:
- Legacy references found: update files directly and rerun script
- CORS not updated: verify backend configs (`apps/status/server.js`, `backend/api/documentation-api/src/config/appConfig.js`)
- services-manifest.json failing: ensure `path` is `docs` and `port` is `3400`; the script now reports the actual values returned by jq
- package.json failing: update `validate-docs` script target to `docs/content`
- Missing tooling: install `jq` and either ripgrep (`rg`) or GNU grep; the script falls back to a portable find+grep path when only BSD grep is available (macOS default)

**CI/CD Integration**:
```yaml
- name: Validate Technical References
  run: EXPECTED_DOCS_V2_MIN=75 EXPECTED_DOCS_PORT_MIN=30 EXPECTED_DOCS_API_PORT_MIN=20 bash docs/scripts/validate-technical-references.sh --strict
```

**Expected Duration**: <1 minute

---

### Step 9: Frontmatter Validation

**Purpose**: Validate YAML frontmatter across all documentation files.

**Command**:
```bash
python scripts/docs/validate-frontmatter.py \
  --schema v2 \
  --docs-dir ./docs/content \
  --output ./docs/reports/frontmatter-validation-$(date +%Y%m%d).json \
  --threshold-days 90 \
  --verbose
```

**Notes**:
- `--schema v2` is the default and automatically targets `./docs/content`; include `--docs-dir` only when validating a subset.
- Use `--schema legacy` to audit the deprecated documentation set in `./docs/context`.
- Owner validation enforces one of: DocsOps, ProductOps, ArchitectureGuild, FrontendGuild, BackendGuild, ToolingGuild, DataOps, SecurityOps, PromptOps, MCPGuild, SupportOps, ReleaseOps.

**Expected Output**:
```
=== Frontmatter Validation Summary ===
Schema: v2
Total files scanned: 135
Files with frontmatter: 135
Files missing frontmatter: 0
Files with incomplete frontmatter: 0
Outdated documents (> 90 days): 0

✅ All files passed validation
```

**Validation**:
- [ ] All files have frontmatter (135/135)
- [ ] All required fields present (title, description, tags, owner, lastReviewed)
- [ ] All owner values valid (in ALLOWED_OWNERS)
- [ ] All lastReviewed dates current (<90 days) or intentionally accepted
- [ ] No invalid date formats

**If Fails**:
- Review validation report JSON (detailed issues)
- Fix missing frontmatter fields
- Correct invalid owner assignments
- Update outdated lastReviewed dates
- Re-run validation after fixes

---

### Step 10: Version Validation

**Purpose**: Validate versioned documentation snapshots to ensure integrity and correctness.

**When to Run**:
- After creating a new version snapshot
- Before deploying versioned docs to production
- Quarterly as part of maintenance (check all active versions)

**Command**:
```bash
cd docs

# Validate version snapshot creation
bash ../scripts/validation/validate-version-snapshot.sh <VERSION>

# Example: Validate version 1.0.0
bash ../scripts/validation/validate-version-snapshot.sh 1.0.0
```

**Manual Validation Steps**:

#### 10.1: Version File Structure

```bash
# Check versions.json exists and contains version
cat versions.json | grep "<VERSION>"

# Expected: Version appears in array (e.g., "1.0.0")

# Verify versioned docs directory exists
ls -la versioned_docs/version-<VERSION>/

# Expected: Directory exists with all content subdirectories

# Count versioned MDX files
find versioned_docs/version-<VERSION>/ -name "*.mdx" | wc -l

# Expected: ~135-200 files (matches current content count)

# Verify sidebar snapshot exists
ls -lh versioned_sidebars/version-<VERSION>-sidebars.json

# Expected: File exists and is non-empty (> 1KB)
```

#### 10.2: Version Content Integrity

```bash
# Compare file counts between versions
CURRENT_COUNT=$(find content/ -name "*.mdx" | wc -l)
VERSION_COUNT=$(find versioned_docs/version-<VERSION>/ -name "*.mdx" | wc -l)

echo "Current: $CURRENT_COUNT, Version <VERSION>: $VERSION_COUNT"

# Expected: Counts should match (or version count slightly higher if files were added)

# Spot check key files exist in version
test -f versioned_docs/version-<VERSION>/index.mdx && echo "✅ index.mdx present"
test -d versioned_docs/version-<VERSION>/apps/ && echo "✅ apps/ directory present"
test -d versioned_docs/version-<VERSION>/api/ && echo "✅ api/ directory present"
```

#### 10.3: Version Build Test

```bash
# Test build with new version
npm run docs:build

# Expected: Build completes successfully
# Expected: Build time < 120s (with up to 3 versions)

# Verify version directories in build output
ls -la build/

# Expected for version 1.0.0:
#   - build/next/     (current unreleased)
#   - build/          (latest stable, e.g., 1.0.0 at root)
#   OR
#   - build/1.0.0/    (if not latest)
#   - build/next/

# Check sitemap includes version URLs
grep "version-<VERSION>" build/sitemap.xml || grep "<VERSION>" build/sitemap.xml

# Expected: Version URLs present in sitemap
```

#### 10.4: Version Navigation Test

```bash
# Start dev server
npm run docs:dev

# Manual checks (browser):
# 1. Navigate to http://localhost:3400
# 2. Version dropdown visible in navbar (top right)
# 3. Dropdown shows new version with correct label
# 4. Click version selector → Select new version
# 5. Verify navigation to correct path (/ or /vX.X.X/)
# 6. Verify content loads correctly
# 7. Test internal links work within version
# 8. Check banner displays correctly per version type

# Stop server: Ctrl+C
```

#### 10.5: Version Link Validation

```bash
# Run link validation on all versions
npm run docs:links 2>&1 | tee version-links-report.txt

# Check for version-specific broken links
grep "version-<VERSION>" version-links-report.txt | grep "Broken"

# Expected: < 5 broken links per version
# Expected: All internal links valid within version
```

**Validation Checklist**:

- [ ] versions.json contains new version entry
- [ ] versioned_docs/version-X.X.X/ directory exists
- [ ] File count matches current content (~135-200 files)
- [ ] versioned_sidebars/version-X.X.X-sidebars.json exists
- [ ] Build completes successfully with new version
- [ ] Build time < 120s (with up to 3 versions)
- [ ] Version dropdown shows new version with correct label
- [ ] Navigation to version works (correct path)
- [ ] Internal links work within version
- [ ] Banner displays correctly (unreleased/stable/deprecated)
- [ ] Sitemap includes version URLs
- [ ] Link validation passes (< 5 broken per version)

**If Fails**:
- **Missing version files**: Re-run `npx docusaurus docs:version X.X.X`
- **File count mismatch**: Check for uncommitted files in content/
- **Build fails**: Run `npm run docs:check` to validate current content first
- **Links broken**: Document in KNOWN-ISSUES.md (acceptable for versioned snapshots)
- **Dropdown missing**: Clear cache (`rm -rf .docusaurus`) and rebuild

**Quick Validation Script**:

```bash
#!/bin/bash
# Quick version validation script

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./validate-version.sh <VERSION>"
  exit 1
fi

echo "=== Validating Version $VERSION ==="

# Check files exist
[ -f versions.json ] && echo "✅ versions.json exists" || echo "❌ versions.json missing"
grep -q "$VERSION" versions.json && echo "✅ $VERSION in versions.json" || echo "❌ $VERSION not in versions.json"
[ -d "versioned_docs/version-$VERSION" ] && echo "✅ versioned_docs/version-$VERSION exists" || echo "❌ Directory missing"
[ -f "versioned_sidebars/version-$VERSION-sidebars.json" ] && echo "✅ Sidebar snapshot exists" || echo "❌ Sidebar missing"

# Count files
FILE_COUNT=$(find "versioned_docs/version-$VERSION" -name "*.mdx" 2>/dev/null | wc -l)
echo "📊 Files versioned: $FILE_COUNT"
[ "$FILE_COUNT" -gt 100 ] && echo "✅ File count acceptable" || echo "⚠️  File count low"

echo ""
echo "Next steps:"
echo "  1. Run: npm run docs:build"
echo "  2. Run: npm run docs:links"
echo "  3. Test version dropdown in browser"
```

---

## Full Validation Pipeline

**Run All Validations in Sequence**:

**Command**:
```bash
cd docs
npm run docs:check
```

**This executes**:
1. `npm run docs:auto` (content generation)
2. `npm run docs:validate-generated` (generation validation)
3. `npm run docs:lint` (markdown linting)
4. `npm run docs:typecheck` (TypeScript validation)
5. `npm run docs:test` (unit tests)
6. `npm run docs:build` (build validation)

**Then run separately**:
```bash
# Link validation (requires build)
npm run docs:links

# Frontmatter validation (Python script)
cd ..
python scripts/docs/validate-frontmatter.py \
  --schema v2 \
  --docs-dir ./docs/content \
  --output ./docs/reports/frontmatter-validation-$(date +%Y%m%d).json
```

**Expected Total Time**: 10-15 minutes

**Success Criteria**:
- [ ] docs:check exits with code 0 (all steps pass)
- [ ] docs:links finds 0 broken links
- [ ] validate-frontmatter.py exits with code 0 (all files valid)
- [ ] No errors in any validation step
- [ ] Warnings reviewed and acceptable

## Pre-Launch Validation Checklist

- [ ] Technical references validation passed (no legacy `docs/docusaurus` or port `3004` references)
- [ ] Version 1.0.0 created and validated (if launching versioned docs)
- [ ] Version dropdown functional in navbar
- [ ] All active versions build successfully (< 120s total)
- [ ] Link validation passed for all versions (< 5 broken per version)

---

## Validation Report

**After running all validations, create a validation report:**

### Validation Report Template

```markdown
# Documentation Validation Report

**Date**: YYYY-MM-DD
**Validator**: [Name]
**Purpose**: Pre-launch validation for docs

## Summary

| Validation | Status | Issues | Notes |
|------------|--------|--------|-------|
| Content Generation | ✅ Pass | 0 | 2 files generated, 1 updated |
| Generated Content | ✅ Pass | 0 | All markers and timestamps valid |
| Markdown Linting | ✅ Pass | 0 | No syntax issues |
| TypeScript Check | ✅ Pass | 0 | No type errors |
| Unit Tests | ✅ Pass | 0 | 10/10 tests passed |
| Build | ✅ Pass | 0 | Build time: 45s |
| Link Validation | ✅ Pass | 0 | 500+ links checked |
| Technical References | ✅ Pass | 0 | Legacy references removed; docs adoption verified |
| Frontmatter | ✅ Pass | 0 | 135/135 files valid |

**Overall Status**: ✅ **PASS** - Ready for launch

## Details

### Content Generation
- Files generated: 2 (ports table, design tokens)
- Files updated: 1 (MCP registry TODO marker)
- Duration: 2.3s
- Issues: None

### Generated Content Validation
- Tests passed: 6/6
- Markers validated: 4 files
- Timestamps current: Yes (within 1 hour)
- Issues: None

### Markdown Linting
- Files scanned: 135
- Issues found: 0
- Rules checked: 50+
- Duration: 5.2s

### TypeScript Check
- Files checked: 135 MDX + components
- Type errors: 0
- Duration: 8.1s

### Unit Tests
- Tests run: 10
- Tests passed: 10
- Tests failed: 0
- Duration: 3.5s

### Build Validation
- Pages generated: 135
- Static files: 250+
- Build time: 45.2s
- Warnings: 0
- Errors: 0

### Link Validation
- Pages scanned: 135
- Links checked: 523
- Broken links: 0
- Internal links: 473 (100% valid)
- External links: 50 (100% valid)
- Duration: 120s

### Technical References Validation
- Legacy references detected: 0 (`docs/docusaurus`, port `3004`)
- docs references detected: 87
- Port 3400 references detected: 58
- CORS configurations updated: Yes
- services-manifest.json updated: Yes
- package.json validate-docs script updated: Yes
- Duration: 15s

### Frontmatter Validation
- Files scanned: 135
- Files with frontmatter: 135 (100%)
- Files with issues: 0
- Outdated documents (>90 days): 0
- Duration: 2.1s

## Recommendations

- ✅ All validations passed
- ✅ No critical issues found
- ✅ Documentation is launch-ready
- ⏭️ Proceed with stakeholder approval
- ⏭️ Execute communication plan
- ⏭️ Schedule launch for Nov 15, 2025

## Sign-off

- [ ] DocsOps Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] Release Manager: _________________ Date: _______
```

**Save Report**: `docs/reports/validation-report-YYYY-MM-DD.md`

---

## Troubleshooting

### Issue: docs:auto fails with "Source file not found"

**Cause**: Source files missing or moved

**Solution**:
1. Verify source files exist:
   - `docs/context/ops/service-port-map.md`
   - `frontend/dashboard/tailwind.config.js`
2. Check file paths in docs-auto.mjs
3. Update paths if files moved
4. Re-run docs:auto

### Issue: docs:lint fails with frontmatter errors

**Cause**: Invalid YAML frontmatter

**Solution**:
1. Review error message (file, line, issue)
2. Open file and check frontmatter block
3. Fix YAML syntax (indentation, quotes, colons)
4. Ensure required fields present
5. Re-run docs:lint

### Issue: docs:build fails with "Cannot find module"

**Cause**: Missing dependencies or broken imports

**Solution**:
1. Run `npm install` in docs/
2. Check import paths in MDX files
3. Verify custom components exist
4. Clear cache: `rm -rf .docusaurus`
5. Re-run docs:build

### Issue: docs:links finds broken links

**Cause**: Links to moved/deleted content or external sites down

**Solution**:
1. Review broken links report
2. For internal links: Update paths to new locations
3. For external links: Verify manually, find replacement if dead
4. Document acceptable broken links (if any)
5. Re-run docs:links

### Issue: validate-frontmatter.py fails with "Invalid owner"

**Cause**: Owner value not in ALLOWED_OWNERS

**Solution**:
1. Check owner value in frontmatter
2. Verify owner is valid (DocsOps, ProductOps, etc.)
3. Update owner if incorrect
4. Add new owner to ALLOWED_OWNERS if legitimate
5. Re-run validation

---

## CI/CD Integration

**GitHub Actions** (if configured):

**Workflow**: `.github/workflows/docs-validation.yml`

**Triggers**:
- Push to main branch
- Pull request to main
- Manual workflow dispatch

**Steps**:
1. Checkout code
2. Setup Node.js 18+
3. Install dependencies (`npm install`)
4. Run docs:check
5. Run docs:links
6. Upload validation reports as artifacts
7. Comment on PR with validation results

**Status Badge**: Add to README.md
```markdown
[![Docs Validation](https://github.com/org/TradingSystem/actions/workflows/docs-validation.yml/badge.svg)](https://github.com/org/TradingSystem/actions/workflows/docs-validation.yml)
```

---

## Related Documentation

- [Review Checklist](./REVIEW-CHECKLIST.md) - Chapter-by-chapter review
- [Maintenance Checklist](./MAINTENANCE-CHECKLIST.md) - Quarterly hygiene
- [Communication Plan](./COMMUNICATION-PLAN.md) - Internal announcements
- [Migration Report](../migration/INVENTORY-REPORT.md) - Executive summary
- [docs README](../README.md) - Automation and helpers
