---
title: Documentation Versioning System - Technical Design
author: Claude Code
date: 2025-10-28
status: proposed
tags: [documentation, versioning, docusaurus, architecture]
---

# Documentation Versioning System - Technical Design

## Context

The TradingSystem documentation portal (Docusaurus v3 on port 3205) currently lacks versioning. With 135 MDX files organized across 12 categories (Apps, APIs, Frontend, Database, Tools, SDD, PRD, Prompts, Agents, MCP, Diagrams, Reference), we need a robust versioning system to:

1. Preserve historical documentation snapshots aligned with system releases
2. Support users running different versions of TradingSystem
3. Enable API evolution tracking (Order Manager, Data Capture, Workspace APIs)
4. Provide audit trails for compliance and governance

**Current State:**
- Docusaurus v3.9.2 installed (native versioning support)
- Single documentation tree in `docs/content/`
- No `versions.json` or `versioned_docs/` directories
- Build time: ~45s (dev), ~60s (prod)
- 135 files × ~3.7KB avg = ~500KB total content

**Constraints:**
- Must maintain < 120s build time for CI/CD
- Must preserve existing validation suite (9 layers)
- Must integrate with Phase 6 cut-over (Nov 15)
- Must support multiple version navigation without breaking links

---

## Goals / Non-Goals

### Goals
1. **Version Snapshots**: Create immutable documentation snapshots on major releases
2. **User Navigation**: Provide clear version selector in UI with labels
3. **Build Performance**: Keep build times acceptable (< 120s)
4. **Governance Integration**: Update validation guides and procedures
5. **Automation Ready**: Design for future CI/CD workflow integration
6. **Storage Efficiency**: Implement retention policy to limit storage growth

### Non-Goals
1. **API-Specific Versioning**: Not implementing separate version tracks per API (use Docusaurus global versioning)
2. **Git-Based Versioning**: Not using Git tags to manage versions (use Docusaurus native)
3. **Backporting Fixes**: Not committing to fix bugs in all versions (only current + latest stable)
4. **Real-Time Sync**: Not syncing version docs with code releases automatically (manual trigger initially)

---

## Technical Decisions

### Decision 1: Use Docusaurus Native Versioning

**Options Considered:**
1. **Docusaurus Native Versioning** (CHOSEN)
   - Pros: Battle-tested, built-in UI, automatic routing, version dropdown
   - Cons: All-or-nothing versioning (can't version individual sections)

2. **Manual Version Folders** (`docs/v1/`, `docs/v2/`)
   - Pros: Full control, selective versioning
   - Cons: Custom routing, no native UI, high maintenance

3. **Multi-Instance Docusaurus** (separate sites per version)
   - Pros: Complete isolation, can deploy separately
   - Cons: Complex hosting, inconsistent UX, high overhead

**Decision**: Use Docusaurus native versioning
**Rationale**: Proven, low-maintenance, excellent UX, integrates with existing build pipeline

---

### Decision 2: Release-Based Versioning Strategy

**Options Considered:**
1. **Release-Based** (CHOSEN): Version on major releases (1.0, 2.0, 3.0)
2. **Time-Based**: Version quarterly (Q1-2025, Q2-2025)
3. **Feature-Based**: Version when major features ship

**Decision**: Release-based with semantic versioning
**Rationale**:
- Aligns with software releases (1.0 = Phase 6 launch)
- Clear labels for users ("1.0.0 Stable" vs "Next Unreleased")
- Predictable cadence (major releases ~6-12 months)
- Easy to communicate ("v2.0 docs released with Order Manager v2")

**Version Numbering**: Semver format (`1.0.0`, `2.0.0`)

---

### Decision 3: Retention Policy

**Policy**: Keep **current + 2 latest stable versions**

**Example Timeline:**
- Current (unreleased) - Always available
- v2.0.0 (latest stable) - Active support
- v1.5.0 (previous stable) - Maintenance mode
- v1.0.0 (archived) - Read-only, no updates

**After 2 years**: Move to `archived-versions/` (optional future feature)

**Storage Impact:**
- Per version: ~135 files × 3.7KB = ~500KB × 3 versions = 1.5MB
- Negligible compared to node_modules (~300MB)

---

### Decision 4: Configuration Structure

**Docusaurus Config Changes** (`docs/docusaurus.config.js`):

```javascript
presets: [
  [
    'classic',
    {
      docs: {
        // ... existing config
        lastVersion: 'current',
        versions: {
          current: {
            label: 'Next (Unreleased) 🚧',
            path: 'next',
            banner: 'unreleased',
          },
          '1.0.0': {
            label: '1.0.0 (Stable) ✅',
            path: '',  // Default path (/)
            banner: 'none',
          },
        },
        onlyIncludeVersions: process.env.NODE_ENV === 'development'
          ? ['current']
          : undefined,  // All versions in production
      },
    },
  ],
]
```

**Package.json Scripts**:
```json
{
  "scripts": {
    "docs:version": "docusaurus docs:version",
    "docs:version:create": "npm run docs:version -- $VERSION",
    "docs:version:list": "cat versions.json",
    "docs:build:fast": "NODE_ENV=development npm run docs:build"
  }
}
```

---

### Decision 5: Navbar Integration

**Navigation Changes** (`docs/docusaurus.config.js`):

```javascript
navbar: {
  items: [
    // ... existing items
    {
      type: 'docsVersionDropdown',
      position: 'right',
      dropdownActiveClassDisabled: true,
      dropdownItemsAfter: [
        {
          type: 'html',
          value: '<hr style="margin: 0.3rem 0;">',
        },
        {
          href: 'https://github.com/TradingSystem/TradingSystem/releases',
          label: 'All Releases',
        },
      ],
    },
  ],
}
```

**Result**: Dropdown shows:
- Next (Unreleased) 🚧
- 1.0.0 (Stable) ✅
- ---
- All Releases (GitHub link)

---

### Decision 6: Banner Configuration

**Version Banners**:
- **Current/Next**: Yellow banner "⚠️ Unreleased version - Features may change"
- **Latest Stable**: No banner (default experience)
- **Older Versions**: Blue banner "ℹ️ You are viewing v1.0 docs. Latest version is v2.0 →"

**Implementation**: Docusaurus handles automatically via `banner` config

---

## Architecture

### File Structure After Versioning

```
docs/
├── content/                        # Current (unreleased) docs
│   ├── apps/
│   ├── api/
│   └── ... (existing structure)
│
├── versions.json                   # ["1.0.0"] - Managed by Docusaurus
│
├── versioned_docs/                 # Snapshots (immutable)
│   └── version-1.0.0/
│       ├── apps/
│       ├── api/
│       └── ... (full copy of content/)
│
├── versioned_sidebars/             # Sidebar snapshots
│   └── version-1.0.0-sidebars.json
│
└── docusaurus.config.js            # Version configuration
```

### Build Process

**Development Mode** (fast builds):
```bash
NODE_ENV=development npm run docs:dev
# Only builds 'current' version
# Build time: ~45s (unchanged)
```

**Production Mode** (full builds):
```bash
npm run docs:build
# Builds all versions (current + 1.0.0 + future versions)
# Build time: ~45s + (15s × num_versions)
# Expected: ~75s with 2 versions
```

---

## Data Flow

### Version Creation Flow

```
1. Release Manager triggers version creation
   ↓
2. Run: npx docusaurus docs:version 1.0.0
   ↓
3. Docusaurus copies content/ → versioned_docs/version-1.0.0/
   ↓
4. Docusaurus adds "1.0.0" to versions.json
   ↓
5. Docusaurus creates versioned_sidebars/version-1.0.0-sidebars.json
   ↓
6. Git commit: "docs: version 1.0.0"
   ↓
7. Deploy to production (port 3205)
   ↓
8. Users see version dropdown in navbar
```

### Version Navigation Flow

```
User visits http://localhost:3205/
   ↓
Default route: /next/ (current unreleased)
   ↓
User clicks version dropdown → Selects "1.0.0 (Stable)"
   ↓
Router navigates to: / (version-1.0.0 content)
   ↓
All internal links resolve correctly within version
```

---

## Migration Plan

### Phase 1: Configuration (Pre-Launch)

**Before Phase 6 cut-over (Nov 11-14):**

1. **Update Docusaurus Config**
   ```bash
   # Edit docs/docusaurus.config.js
   # Add versions configuration (see Decision 4)
   ```

2. **Add Scripts**
   ```bash
   # Update docs/package.json
   # Add docs:version, docs:version:create scripts
   ```

3. **Test Locally**
   ```bash
   cd docs
   npx docusaurus docs:version 0.9.0  # Test version
   npm run docs:dev
   # Verify version dropdown appears
   # Verify navigation works
   # Verify banners show correctly
   ```

4. **Validate**
   ```bash
   npm run docs:check
   # Ensure all validations pass with version 0.9.0
   ```

5. **Cleanup Test Version**
   ```bash
   rm -rf versioned_docs/version-0.9.0
   rm versioned_sidebars/version-0.9.0-sidebars.json
   # Remove "0.9.0" from versions.json
   git add -A && git commit -m "chore: test versioning setup"
   ```

### Phase 2: First Stable Version (Launch Day)

**On Phase 6 cut-over (Nov 15):**

1. **Create Version 1.0**
   ```bash
   cd docs
   npx docusaurus docs:version 1.0.0
   ```

2. **Validate Snapshot**
   ```bash
   # Check files copied
   ls -la versioned_docs/version-1.0.0/

   # Verify 135 files present
   find versioned_docs/version-1.0.0/ -name "*.mdx" | wc -l
   # Expected: 135
   ```

3. **Test Build**
   ```bash
   npm run docs:build
   # Expected build time: ~75s (45s base + 30s for v1.0.0)
   ```

4. **Run Full Validation**
   ```bash
   npm run docs:check
   npm run docs:links
   # All validations must pass
   ```

5. **Commit and Deploy**
   ```bash
   git add versions.json versioned_docs/ versioned_sidebars/
   git commit -m "docs: version 1.0.0

   🚀 First stable documentation snapshot after Phase 6 launch.

   - 135 files versioned
   - Navbar version selector enabled
   - Build time: 75s

   Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"

   git push origin main
   ```

### Phase 3: Governance Updates (Post-Launch)

**Week of Nov 16-22:**

1. **Update VALIDATION-GUIDE.md**
   - Add "Step 10: Version Validation"
   - Document version creation procedure
   - Add validation checks for versioned docs

2. **Update MAINTENANCE-CHECKLIST.md**
   - Add quarterly version review task
   - Document retention policy enforcement
   - Add version deprecation procedure

3. **Update README.md**
   - Document versioning commands
   - Add "Creating a New Version" section
   - Update build time estimates

### Phase 4: CI/CD Automation (Optional - Future)

**After manual process proven (Dec 2025+):**

Create `.github/workflows/docs-version.yml`:

```yaml
name: Version Documentation
on:
  release:
    types: [published]

jobs:
  version-docs:
    runs-on: ubuntu-latest
    if: startsWith(github.event.release.tag_name, 'v')

    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: docs/package-lock.json

      - name: Install dependencies
        run: cd docs && npm ci

      - name: Create version
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          cd docs
          npx docusaurus docs:version $VERSION

      - name: Validate
        run: |
          cd docs
          npm run docs:check

      - name: Commit versioned docs
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add versions.json versioned_docs/ versioned_sidebars/
          git commit -m "docs: version $VERSION (automated)"
          git push

      - name: Comment on release
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.payload.release.id,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Documentation versioned automatically. View at http://localhost:3205/'
            })
```

**Trigger**: Creates version when GitHub release is published with tag `v1.0.0`, `v2.0.0`, etc.

---

## Rollback Plan

### If Version Creation Fails

**Scenario**: Version 1.0.0 created but validation fails

**Steps**:
1. Remove version entry from `versions.json`
2. Delete `versioned_docs/version-1.0.0/`
3. Delete `versioned_sidebars/version-1.0.0-sidebars.json`
4. Commit rollback
5. Investigate validation failures
6. Fix issues in `content/` (current docs)
7. Retry version creation

**Recovery Time**: < 30 minutes

### If Build Performance Degrades

**Scenario**: Build time exceeds 120s with 3+ versions

**Options**:
1. **Short-term**: Archive oldest version (move to separate storage)
2. **Medium-term**: Optimize build (enable incremental builds if Docusaurus supports)
3. **Long-term**: Deprecate versions > 2 years old

---

## Risks / Trade-offs

### Risk 1: Stale Version Documentation

**Risk**: Users reference old version docs without realizing updates exist

**Mitigation**:
- Prominent banner on versioned pages: "ℹ️ Viewing v1.0 docs. Latest is v2.0 →"
- Clear labels in version dropdown: "(Stable)" vs "(Archived)"
- Link to release notes in banner

**Trade-off**: Accept some users will deliberately reference old docs (valid use case)

---

### Risk 2: Link Rot in Versioned Docs

**Risk**: External links in versioned docs break over time

**Mitigation**:
- Run `npm run docs:links` on all versions quarterly
- Document broken links in known issues
- Don't fix external links in archived versions (immutable snapshots)

**Trade-off**: Archived versions reflect "point in time" - broken links are acceptable

---

### Risk 3: Content Drift Between Versions

**Risk**: Bug fix or clarification needed in multiple versions

**Mitigation**:
- Policy: Only update current + latest stable
- Document fixes in changelog per version
- Provide clear migration guides between versions

**Trade-off**: Older versions may have minor inaccuracies (acceptable for archived content)

---

## Performance Considerations

### Build Time Impact

**Baseline** (no versioning):
- Dev builds: ~45s (only current)
- Prod builds: ~60s (optimized)

**With 1 version** (v1.0.0):
- Dev builds: ~45s (NODE_ENV=development skips versions)
- Prod builds: ~75s (+15s for v1.0.0)

**With 2 versions** (v1.0.0, v2.0.0):
- Dev builds: ~45s (unchanged)
- Prod builds: ~90s (+30s for 2 versions)

**With 3 versions** (max recommended):
- Dev builds: ~45s (unchanged)
- Prod builds: ~105s (+45s for 3 versions)

**Threshold**: Stay under 120s (acceptable for CI/CD)

---

### Storage Impact

**Per Version Snapshot**:
- MDX files: 135 × 3.7KB ≈ 500KB
- Generated HTML: ~2MB (after build)
- Total per version: ~2.5MB

**Total with 3 versions**:
- Versioned source: 3 × 500KB = 1.5MB
- Build output: 3 × 2MB = 6MB
- Combined: ~7.5MB (negligible)

---

### Runtime Performance

**User Impact**: No measurable difference
- Version routing adds <10ms latency
- Static site generation means no runtime overhead
- Version selector dropdown is pure client-side

---

## Open Questions

### Question 1: Backport Critical Security Fixes?

**Context**: If a security vulnerability is discovered in docs (e.g., exposed credential in example), should we fix in old versions?

**Options**:
1. **Yes, backport critical security issues** (Recommended)
2. **No, only fix in current** (Simpler but risky)

**Recommendation**: Document as exception to "no backports" policy. Critical security fixes are backported to all versions.

---

### Question 2: Version Deprecation Notice Period?

**Context**: How long before we remove a version?

**Options**:
1. **6 months notice** (Aggressive)
2. **12 months notice** (Balanced)
3. **24 months notice** (Conservative)

**Recommendation**: 12 months notice + prominent deprecation banner

---

### Question 3: Include Version in Footer?

**Context**: Should footer show "Documentation version 1.0.0"?

**Recommendation**: Yes, add to footer for clarity. Users should always know which version they're viewing.

---

## Testing Plan

### Unit Tests

**No new unit tests required** - Docusaurus versioning is framework-level

### Integration Tests

**Manual testing checklist**:

1. **Version Creation**
   - [ ] `npx docusaurus docs:version 0.9.0` succeeds
   - [ ] `versions.json` contains `["0.9.0"]`
   - [ ] `versioned_docs/version-0.9.0/` contains 135 files
   - [ ] `versioned_sidebars/version-0.9.0-sidebars.json` created

2. **Version Navigation**
   - [ ] Version dropdown appears in navbar
   - [ ] Dropdown shows correct labels
   - [ ] Clicking "0.9.0" navigates to `/` (versioned path)
   - [ ] Clicking "Next" navigates to `/next/` (current path)

3. **Banner Display**
   - [ ] "Next" version shows unreleased banner (yellow)
   - [ ] "0.9.0" version shows no banner (latest stable)
   - [ ] After creating v1.0.0, "0.9.0" shows outdated banner (blue)

4. **Link Resolution**
   - [ ] Internal links work within same version
   - [ ] Cross-version links handled gracefully (redirect to equivalent page)
   - [ ] External links work in all versions

5. **Build Validation**
   - [ ] `npm run docs:build` succeeds with versions
   - [ ] Build time < 120s (with 3 versions)
   - [ ] `npm run docs:check` passes for all versions
   - [ ] `npm run docs:links` passes for all versions

---

## Monitoring & Observability

### Metrics to Track

1. **Build Performance**
   - Track build time per version
   - Alert if > 120s threshold exceeded
   - Monitor storage growth

2. **User Behavior**
   - Track version selector usage (if analytics enabled)
   - Monitor which versions users view most
   - Identify if users get stuck on old versions

3. **Content Health**
   - Run `docs:links` weekly on all versions
   - Track broken link count per version
   - Alert on regressions

---

## Success Metrics

### Quantitative

1. ✅ Version 1.0.0 created successfully
2. ✅ 135 files present in `versioned_docs/version-1.0.0/`
3. ✅ Build time < 120s with 3 versions
4. ✅ `docs:check` passes with 0 errors
5. ✅ `docs:links` finds < 5 broken links per version

### Qualitative

1. ✅ Users can easily find and navigate between versions
2. ✅ Version labels are clear and unambiguous
3. ✅ Governance team can create versions without assistance
4. ✅ Stakeholders approve versioning strategy

---

## References

- [Docusaurus Versioning Guide](https://docusaurus.io/docs/versioning)
- [Semantic Versioning Specification](https://semver.org/)
- [TradingSystem Phase 6 Plan](../../changes/migrate-docs-to-docusaurus-v2/tasks.md)
- [Documentation Validation Guide](../../../docs/governance/VALIDATION-GUIDE.md)

---

## Appendix: Command Reference

```bash
# Create new version
cd docs
npx docusaurus docs:version <VERSION>

# Example: Version 1.0.0
npx docusaurus docs:version 1.0.0

# List versions
cat docs/versions.json

# Build with specific versions (dev)
NODE_ENV=development npm run docs:build

# Build all versions (prod)
npm run docs:build

# Validate all versions
npm run docs:check && npm run docs:links

# Remove a version (manual)
# 1. Remove from versions.json
# 2. Delete versioned_docs/version-X.X.X/
# 3. Delete versioned_sidebars/version-X.X.X-sidebars.json
# 4. Commit changes
```

---

**Status**: Ready for stakeholder review
**Next Step**: Approval and Phase 1 implementation
