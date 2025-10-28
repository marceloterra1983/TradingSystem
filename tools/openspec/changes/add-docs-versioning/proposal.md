---
title: Add Documentation Versioning System
author: Claude Code
date: 2025-10-28
status: proposed
priority: high
tags: [documentation, versioning, docusaurus, governance]
---

# Add Documentation Versioning System

## Why

**Current Problem:**
The TradingSystem documentation (Docusaurus v3) does NOT have a versioning system implemented. This creates several critical issues:

1. **No Historical Reference**: Users cannot consult documentation for older system versions they may still be running
2. **API Breaking Changes Untracked**: When APIs evolve (Order Manager, Data Capture, Workspace), there's no way to compare specs between versions
3. **Migration Risk**: During Phase 6 cut-over (Nov 15 launch), we'll lose the ability to reference the "before" state
4. **User Confusion**: Current docs always reflect latest development, not stable releases
5. **Compliance Gap**: Trading systems require audit trails - including documentation changes

**Business Impact:**
- **HIGH** for API-driven services (Order Manager, Data Capture) - breaking changes are risky without version docs
- **MEDIUM** for general documentation - users may reference outdated procedures
- **LOW** for internal/governance content - less critical but still valuable

**Timing:**
Must be implemented **BEFORE Phase 6 cut-over** (Nov 15, 2025) to capture the first stable snapshot.

---

## What Changes

### Core Changes
1. **Enable Docusaurus Versioning** - Configure `docusaurus.config.js` with versioning preset
2. **Create Version 1.0 Snapshot** - First stable release after Phase 6 completion
3. **Update Navigation** - Add version dropdown in navbar
4. **Versioning Strategy** - Define when/how to create new versions (release-based)
5. **Governance Integration** - Add versioning procedures to validation guides
6. **CI/CD Automation** - Auto-version on releases via GitHub Actions

### Breaking Changes
- **NONE** - This is additive functionality. Existing docs remain as `current` (unreleased).

---

## Impact

### Affected Specs
- `specs/documentation-hosting/spec.md` - Add versioning requirements

### Affected Code/Files
- `docs/docusaurus.config.js` - Add versions configuration
- `docs/package.json` - Add versioning scripts
- `docs/governance/VALIDATION-GUIDE.md` - Add versioning procedures
- `.github/workflows/docs-version.yml` - New CI/CD workflow (optional)
- `docs/versions.json` - Created by Docusaurus (managed)
- `docs/versioned_docs/` - Version snapshots (managed)
- `docs/versioned_sidebars/` - Sidebar snapshots (managed)

### Affected Services
- **Documentation Hub (Port 3205)** - UI gains version selector
- **Documentation API (Port 3400)** - May need to index versioned content (future)

### Dependencies
- Docusaurus v3 (already installed) - Supports versioning natively
- No external dependencies required

---

## Risks & Mitigation

### Risk 1: Storage Bloat
**Risk**: Each version duplicates ~135 MDX files (~5MB compressed per version)
**Mitigation**:
- Implement retention policy (keep last 3 major versions + current)
- Archive older versions to separate storage after 2 years
- Total estimated: 3 versions × 5MB = 15MB (negligible)

### Risk 2: Build Time Increase
**Risk**: Each version adds ~10-15s to build time
**Mitigation**:
- Use `onlyIncludeVersions: ['current', 'latest']` in dev mode
- Full builds only in CI/CD
- Expected impact: Dev builds stay <60s, prod builds <120s

### Risk 3: User Confusion
**Risk**: Users may accidentally read old documentation
**Mitigation**:
- Add prominent banner on versioned pages: "⚠️ You are viewing v1.0 docs. Latest version is v2.0"
- Default to `current` version (latest development)
- Clear version labels: "1.0.0 (Stable)" vs "Next (Unreleased)"

### Risk 4: Maintenance Burden
**Risk**: Critical security fixes may need backporting to multiple versions
**Mitigation**:
- Document versioning policy: "Only current + latest stable receive updates"
- Provide clear migration guides when deprecating versions
- Limit active versions to 2-3 maximum

---

## Success Criteria

1. ✅ Version 1.0 snapshot created successfully after Phase 6 launch
2. ✅ Version dropdown appears in navbar with correct labels
3. ✅ Users can switch between versions without broken links
4. ✅ Build time remains <120s for full production builds
5. ✅ All 135 files correctly copied to `versioned_docs/version-1.0/`
6. ✅ Validation suite (docs:check) passes for both current + versioned docs
7. ✅ Governance docs updated with versioning procedures
8. ✅ CI/CD workflow (optional) tested and documented

---

## Alternatives Considered

### Alternative 1: Manual Version Folders
**Approach**: Create `docs/v1/`, `docs/v2/` manually
**Rejected**:
- Docusaurus native versioning is battle-tested
- Manual approach requires custom routing and build logic
- Loses Docusaurus features (version dropdown, banner, etc.)

### Alternative 2: Git-Based Versioning (Tags)
**Approach**: Use Git tags and deploy separate sites per version
**Rejected**:
- Requires multiple deployments and hosting
- Complex user experience (different URLs per version)
- High maintenance overhead

### Alternative 3: API-Only Versioning
**Approach**: Only version API docs, keep rest as "latest"
**Partially Adopted**:
- Will prioritize API sections for versioning
- But also version full docs for consistency
- Users benefit from seeing entire system state per version

---

## Timeline

### Phase 1: Preparation (Week 1 - Nov 7-14)
- Configure Docusaurus versioning preset
- Update governance documentation
- Test versioning locally

### Phase 2: First Version (Week 2 - Nov 15)
- Create v1.0 snapshot after Phase 6 cut-over
- Validate all links and navigation
- Deploy to production

### Phase 3: Automation (Week 3 - Nov 16-22)
- Implement CI/CD workflow (optional)
- Document versioning procedures
- Train team on workflow

### Phase 4: Maintenance (Ongoing)
- Monitor version storage and build times
- Review retention policy quarterly
- Update versions on major releases

---

## Related Work

- **Phase 6: Update References & Cut-over** - This change is a prerequisite
- **Documentation Governance** - Integrates with existing validation suite
- **API Specifications** - Versioned OpenAPI specs will align with doc versions

---

## Questions for Stakeholders

1. **Version Numbering**: Should we follow semver (1.0.0) or simple integers (v1, v2)?
   - Recommendation: Semver for clarity

2. **Snapshot Trigger**: Create versions on every major release or quarterly?
   - Recommendation: Major releases only (avoid clutter)

3. **Retention Policy**: How many versions to keep active?
   - Recommendation: Current + 2 latest stable versions

4. **Backport Policy**: Will we fix bugs in old versions?
   - Recommendation: Current + latest stable only

---

## Approval

- [ ] **DocsOps Lead** - Approve versioning strategy and governance integration
- [ ] **Release Manager** - Approve CI/CD workflow and release process
- [ ] **Architecture Guild** - Approve technical approach and risk mitigation
- [ ] **ProductOps** - Approve timeline and user experience

**Target Approval Date**: November 10, 2025
**Implementation Start**: November 11, 2025 (after approval)
