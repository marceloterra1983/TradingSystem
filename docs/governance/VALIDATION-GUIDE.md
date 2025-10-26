# Documentation Validation Guide

**Purpose**: Execute the complete validation suite to ensure docs is launch-ready.

**Audience**: DocsOps, Release Engineers, QA Team

**Timeline**: Run during Week 3 of review (Nov 7-14) and before every release

## Validation Suite Overview

**The complete validation suite consists of 5 validation layers:**

1. **Content Generation** (`docs:auto`) - Generate reference content from source files
2. **Generated Content Validation** (`docs:validate-generated`) - Verify generation succeeded
3. **Markdown Linting** (`docs:lint`) - Check markdown syntax and style
4. **TypeScript Type Checking** (`docs:typecheck`) - Validate TypeScript in MDX files
5. **Unit Tests** (`docs:test`) - Run automation script tests
6. **Build Validation** (`docs:build`) - Ensure Docusaurus builds successfully
7. **Link Validation** (`docs:links`) - Check all internal and external links
8. **Technical References Validation** (`docs/scripts/validate-technical-references.sh`) - Ensure legacy references removed and docs adoption verified
9. **Frontmatter Validation** (`validate-frontmatter.py`) - Validate YAML frontmatter

**Total Execution Time**: ~10-15 minutes

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
  EXPECTED_DOCS_V2_MIN=75 EXPECTED_3205_MIN=30 bash docs/scripts/validate-technical-references.sh --strict
  ```

**Expected Output**:
```
[SUCCESS] No legacy docs/docusaurus references detected (outside excluded paths)
[SUCCESS] No legacy port 3004 references detected (outside excluded paths)
[SUCCESS] Found 82 docs references (threshold 50)
[SUCCESS] Found 45 references to port 3205 (threshold 20)
[SUCCESS] CORS_ORIGIN definitions reference port 3205
[SUCCESS] services-manifest.json references docs on port 3205
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
- [ ] Port `3205` references meet the configured minimum (`EXPECTED_3205_MIN`, default 20)
- [ ] `CORS_ORIGIN` values updated to 3205 (no residual 3004)
- [ ] `config/services-manifest.json` `docusaurus` entry resolves to `docs` / `3205` via jq check
- [ ] `package.json` `validate-docs` script updated to `docs/content`
- [ ] `.env.example` guidance updated to docs and port 3205
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
- services-manifest.json failing: ensure `path` is `docs` and `port` is `3205`; the script now reports the actual values returned by jq
- package.json failing: update `validate-docs` script target to `docs/content`
- Missing tooling: install `jq` and either ripgrep (`rg`) or GNU grep; the script falls back to a portable find+grep path when only BSD grep is available (macOS default)

**CI/CD Integration**:
```yaml
- name: Validate Technical References
  run: EXPECTED_DOCS_V2_MIN=75 EXPECTED_3205_MIN=30 bash docs/scripts/validate-technical-references.sh --strict
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
- Port 3205 references detected: 34
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
