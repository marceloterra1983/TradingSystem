---
title: Documentation Hosting - Versioning Requirements
capability: documentation-hosting
version: 1.1.0
date: 2025-10-28
status: proposed
tags: [documentation, versioning, docusaurus]
---

# Documentation Hosting - Versioning Delta

This spec defines the ADDED requirements for documentation versioning in the TradingSystem documentation portal (Docusaurus v3).

---

## ADDED Requirements

### Requirement: Version Snapshot Management

The documentation system SHALL support creating immutable snapshots of documentation content at specific points in time.

#### Scenario: Create version snapshot

- **GIVEN** the documentation content is in a stable state (Phase 6 complete)
- **WHEN** a release manager executes `npx docusaurus docs:version <VERSION>`
- **THEN** the system SHALL:
  - Copy all files from `docs/content/` to `versioned_docs/version-<VERSION>/`
  - Create a snapshot of the sidebar configuration in `versioned_sidebars/version-<VERSION>-sidebars.json`
  - Add the version identifier to `versions.json`
  - Preserve all frontmatter, formatting, and content integrity

#### Scenario: Version snapshot validation

- **GIVEN** a version snapshot has been created
- **WHEN** validation is performed
- **THEN** the system SHALL verify:
  - File count matches source (135 MDX files)
  - All frontmatter is valid and preserved
  - All internal links resolve within the version
  - Sidebar configuration is complete

---

### Requirement: Version Navigation

The documentation system SHALL provide clear navigation between different documentation versions.

#### Scenario: Version selector display

- **GIVEN** multiple documentation versions exist
- **WHEN** a user visits the documentation portal
- **THEN** the system SHALL:
  - Display a version dropdown in the navbar (position: right)
  - Show version labels clearly ("1.0.0 (Stable)", "Next (Unreleased)")
  - Indicate the current version being viewed
  - Allow switching between versions without losing page context

#### Scenario: Default version routing

- **GIVEN** multiple versions exist (e.g., "1.0.0" and "current")
- **WHEN** a user visits the root URL (`/`)
- **THEN** the system SHALL route to the latest stable version (e.g., "1.0.0")

#### Scenario: Current version routing

- **GIVEN** the "current" (unreleased) version exists
- **WHEN** a user navigates to `/next/`
- **THEN** the system SHALL serve the current unreleased documentation

---

### Requirement: Version Labeling

The documentation system SHALL provide clear, unambiguous labels for each version to prevent user confusion.

#### Scenario: Stable version label

- **GIVEN** the latest stable version is "1.0.0"
- **WHEN** the version is displayed in the dropdown
- **THEN** the label SHALL be "1.0.0 (Stable) ✅"

#### Scenario: Unreleased version label

- **GIVEN** the current development version exists
- **WHEN** the version is displayed in the dropdown
- **THEN** the label SHALL be "Next (Unreleased) 🚧"

#### Scenario: Archived version label

- **GIVEN** an older version "1.0.0" exists and a newer version "2.0.0" is stable
- **WHEN** version "1.0.0" is displayed in the dropdown
- **THEN** the label SHALL be "1.0.0" (no decoration)

---

### Requirement: Version Banners

The documentation system SHALL display contextual banners to inform users which version they are viewing and alert them to newer versions.

#### Scenario: Unreleased version banner

- **GIVEN** a user is viewing the "current" (unreleased) version
- **WHEN** a page is rendered
- **THEN** the system SHALL display a yellow banner stating:
  - "⚠️ Unreleased version - Features may change"

#### Scenario: Latest stable version banner

- **GIVEN** a user is viewing the latest stable version (e.g., "2.0.0")
- **WHEN** a page is rendered
- **THEN** the system SHALL NOT display a banner (default experience)

#### Scenario: Outdated version banner

- **GIVEN** a user is viewing an older version (e.g., "1.0.0") and a newer stable version exists (e.g., "2.0.0")
- **WHEN** a page is rendered
- **THEN** the system SHALL display a blue banner stating:
  - "ℹ️ You are viewing v1.0.0 docs. Latest version is v2.0.0 →"
  - Include a link to the equivalent page in the latest version

---

### Requirement: Build Performance with Versions

The documentation system SHALL maintain acceptable build performance as versions are added.

#### Scenario: Development build performance

- **GIVEN** multiple versions exist (e.g., 3 versions)
- **WHEN** a developer runs `npm run docs:dev` with `NODE_ENV=development`
- **THEN** the system SHALL:
  - Only build the "current" version (skip versioned snapshots)
  - Complete the build in < 60 seconds
  - Provide fast hot-reload for development

#### Scenario: Production build performance

- **GIVEN** three versions exist ("current", "2.0.0", "1.0.0")
- **WHEN** a production build is triggered (`npm run docs:build`)
- **THEN** the system SHALL:
  - Build all versions (current + 2 stable)
  - Complete the build in < 120 seconds
  - Generate static HTML for all versions

#### Scenario: Build time monitoring

- **GIVEN** the documentation system is in production
- **WHEN** build time exceeds 120 seconds
- **THEN** the system SHOULD alert maintainers to investigate performance degradation

---

### Requirement: Version Retention Policy

The documentation system SHALL enforce a retention policy to limit storage growth and maintenance burden.

#### Scenario: Active versions limit

- **GIVEN** the retention policy is "current + 2 latest stable versions"
- **WHEN** a fourth stable version is created
- **THEN** the system SHOULD:
  - Flag the oldest version for deprecation review
  - Notify maintainers to consider archiving or removal

#### Scenario: Deprecated version handling

- **GIVEN** a version is marked for deprecation (> 12 months notice given)
- **WHEN** the deprecation period expires
- **THEN** maintainers MAY:
  - Remove the version from `versions.json`
  - Delete the versioned snapshot directories
  - Archive the version to separate storage (optional)

---

### Requirement: Link Resolution Across Versions

The documentation system SHALL ensure links resolve correctly within each version snapshot.

#### Scenario: Internal links within version

- **GIVEN** a user is viewing version "1.0.0"
- **WHEN** the user clicks an internal link (e.g., `/apps/workspace/overview`)
- **THEN** the system SHALL:
  - Resolve the link within version "1.0.0" context
  - Navigate to `/apps/workspace/overview` (not `/next/apps/workspace/overview`)

#### Scenario: Cross-version link handling

- **GIVEN** a link points to a specific version (e.g., `/next/apps/workspace/overview`)
- **WHEN** the user clicks the link from version "1.0.0"
- **THEN** the system SHALL:
  - Navigate to the "current" version of that page
  - Update the version dropdown to reflect "Next (Unreleased)"

#### Scenario: Broken link tolerance in archived versions

- **GIVEN** an archived version "1.0.0" contains external links
- **WHEN** external links break over time (e.g., 404 errors)
- **THEN** the system SHOULD:
  - Document known broken links in the governance docs
  - NOT attempt to fix links in archived versions (immutable snapshots)

---

### Requirement: Validation Suite for Versioned Content

The documentation system SHALL extend the existing validation suite to support versioned content.

#### Scenario: Validate all active versions

- **GIVEN** multiple versions exist (current + stable versions)
- **WHEN** `npm run docs:check` is executed
- **THEN** the system SHALL:
  - Run content generation for current version only
  - Run linting on current version only (versioned snapshots are immutable)
  - Run build validation for all versions
  - Report errors per version

#### Scenario: Link validation per version

- **GIVEN** multiple versions exist
- **WHEN** `npm run docs:links` is executed
- **THEN** the system SHALL:
  - Build all versions
  - Check internal links for each version independently
  - Report broken links per version (< 5 per version threshold)

---

### Requirement: Version Creation Workflow

The documentation system SHALL provide a standardized workflow for creating new versions.

#### Scenario: Pre-version validation

- **GIVEN** a release manager intends to create a new version
- **WHEN** pre-version validation is performed
- **THEN** the following checks MUST pass:
  - All Phase 6 tasks complete (or equivalent release milestone)
  - All critical issues (P0/P1) resolved
  - Full validation suite passes (`npm run docs:check`)
  - Link validation passes (`npm run docs:links`)
  - Stakeholder sign-offs received

#### Scenario: Post-version validation

- **GIVEN** a new version has been created
- **WHEN** post-version validation is performed
- **THEN** the following checks MUST pass:
  - File count matches expected (135 MDX files)
  - Version dropdown functional in UI
  - All internal links resolve within new version
  - Build time < 120s (with new version)
  - All validation suite tests pass

---

### Requirement: Version Naming Convention

The documentation system SHALL enforce semantic versioning for version identifiers.

#### Scenario: Valid version format

- **GIVEN** a release manager creates a new version
- **WHEN** the version identifier is provided
- **THEN** the system SHALL accept:
  - Semantic version format: `MAJOR.MINOR.PATCH` (e.g., `1.0.0`, `2.1.3`)

#### Scenario: Invalid version format rejection

- **GIVEN** a release manager attempts to create a version with invalid format
- **WHEN** the format is not semantic versioning (e.g., `v1`, `version-1`, `1.0`)
- **THEN** the system SHOULD:
  - Display a warning or error
  - Recommend the correct format (`1.0.0`)

---

### Requirement: Rollback Capability

The documentation system SHALL support rolling back a version creation if validation fails.

#### Scenario: Version creation rollback

- **GIVEN** a version "1.0.0" was created but validation fails
- **WHEN** a maintainer executes rollback procedures
- **THEN** the system SHALL allow:
  - Removing "1.0.0" from `versions.json`
  - Deleting `versioned_docs/version-1.0.0/`
  - Deleting `versioned_sidebars/version-1.0.0-sidebars.json`
  - Committing rollback changes to Git

#### Scenario: Recovery time

- **GIVEN** a version creation failure occurs
- **WHEN** rollback is executed
- **THEN** the recovery time SHOULD be < 30 minutes

---

### Requirement: Version Deprecation Notice

The documentation system SHALL provide clear deprecation notices for versions nearing end-of-life.

#### Scenario: Deprecation banner display

- **GIVEN** a version "1.0.0" is marked for deprecation (12 months notice)
- **WHEN** a user views version "1.0.0"
- **THEN** the system SHALL display a red banner stating:
  - "⚠️ This version will be removed on [DATE]. Please migrate to v2.0.0 →"
  - Include a link to migration guide (if available)

#### Scenario: Deprecation notice period

- **GIVEN** a version is marked for deprecation
- **WHEN** the deprecation notice is published
- **THEN** the notice period SHALL be at least 12 months before removal

---

### Requirement: Storage Efficiency

The documentation system SHALL manage storage growth efficiently as versions accumulate.

#### Scenario: Per-version storage estimate

- **GIVEN** a single version snapshot is created
- **WHEN** storage usage is measured
- **THEN** each version SHALL consume approximately:
  - Source files (MDX): ~500KB (135 files × 3.7KB avg)
  - Generated HTML: ~2MB (after build)
  - Total per version: ~2.5MB

#### Scenario: Total storage with retention policy

- **GIVEN** the retention policy allows current + 2 stable versions (3 versions total)
- **WHEN** all versions are present
- **THEN** total storage SHALL be approximately:
  - Source: 3 × 500KB = 1.5MB
  - Built output: 3 × 2MB = 6MB
  - Combined: ~7.5MB (negligible impact)

---

## MODIFIED Requirements

### Requirement: Documentation Build Process

The documentation system SHALL build all active versions in production mode and only the current version in development mode.

**PREVIOUS BEHAVIOR**:
- Single documentation tree built (`docs/content/`)
- Build time: ~60s (production)

**NEW BEHAVIOR**:
- Development mode: Only build "current" version (fast iteration)
- Production mode: Build all active versions (current + stable snapshots)
- Expected build times:
  - Development: ~45-60s (unchanged)
  - Production: ~75-105s (depending on version count)

#### Scenario: Development mode build

- **GIVEN** `NODE_ENV=development` is set
- **WHEN** `npm run docs:build` is executed
- **THEN** the system SHALL:
  - Only build the "current" version
  - Skip versioned snapshots
  - Complete in < 60 seconds

#### Scenario: Production mode build

- **GIVEN** `NODE_ENV=production` (default)
- **WHEN** `npm run docs:build` is executed
- **THEN** the system SHALL:
  - Build "current" version
  - Build all stable version snapshots
  - Complete in < 120 seconds (with 3 versions)

---

### Requirement: Documentation Navigation Bar

The documentation system SHALL include a version dropdown in the navigation bar to allow users to switch between versions.

**PREVIOUS BEHAVIOR**:
- Navbar items: Overview, APIs dropdown, GitHub link
- No version selector

**NEW BEHAVIOR**:
- Add version dropdown (position: right)
- Display current version with label
- Allow switching between versions
- Include link to "All Releases" (GitHub)

#### Scenario: Navbar with version selector

- **GIVEN** multiple versions exist
- **WHEN** a user views the documentation
- **THEN** the navbar SHALL display:
  - Existing items (Overview, APIs, GitHub)
  - Version dropdown (right side)
  - Current version indicator

---

## REMOVED Requirements

**None** - This change is purely additive. No existing requirements are removed.

---

## RENAMED Requirements

**None** - No requirements are renamed in this change.

---

## Migration Notes

### For Users

1. **Default Version Change**: After v1.0.0 is created, the default route (`/`) will serve the stable version (1.0.0) instead of the current (unreleased) version. Users wanting to view unreleased docs must navigate to `/next/`.

2. **Bookmarks**: Existing bookmarks to documentation pages will continue to work, now pointing to the stable version. Update bookmarks to `/next/` to follow unreleased docs.

3. **Search**: Search results may include multiple versions. Use the version dropdown to filter results (if search supports versioning).

### For Maintainers

1. **Build Time Increase**: Expect production builds to take ~15s longer per version. Plan CI/CD pipelines accordingly.

2. **Storage**: Each version adds ~2.5MB storage. Monitor and enforce retention policy (current + 2 stable).

3. **Validation**: Run validation suite on all versions before releases. Update governance checklists to include version validation.

4. **Backports**: Establish policy for critical fixes (recommendation: current + latest stable only).

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] Create test version (0.9.0) in local environment
- [ ] Verify version dropdown appears and functions correctly
- [ ] Test navigation between versions
- [ ] Verify banners display correctly per version type
- [ ] Confirm internal links resolve within each version
- [ ] Measure build time with multiple versions (< 120s)
- [ ] Run full validation suite (`npm run docs:check`)
- [ ] Run link validation (`npm run docs:links`)
- [ ] Test rollback procedure (delete test version)

### Post-Deployment Testing

- [ ] Verify v1.0.0 snapshot created successfully (135 files)
- [ ] Confirm version dropdown functional in production
- [ ] Test user workflows (view stable vs unreleased)
- [ ] Monitor build performance (< 120s with 2 versions)
- [ ] Validate all links in both versions
- [ ] Verify banners display correctly
- [ ] Test version switching on mobile devices
- [ ] Confirm search works across versions (if applicable)

---

## Compliance & Audit

### Audit Trail Requirements

- All version creations MUST be committed to Git with descriptive messages
- Version creation date, author, and reason MUST be documented
- Deprecation notices MUST be logged with 12-month notice period
- Version removal MUST be approved by DocsOps Lead and Release Manager

### Compliance Considerations

- Documentation snapshots provide audit trail for regulatory compliance
- Trading system documentation changes are traceable via version history
- Immutable snapshots prevent retroactive changes (integrity)

---

## Related Specifications

- `specs/documentation-hosting/spec.md` - Base documentation hosting requirements (this spec extends it)
- `specs/docs-navigation/spec.md` - Navigation and UI requirements (version dropdown integrates here)

---

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.1.0 | 2025-10-28 | Claude Code | Added versioning requirements (snapshot management, navigation, banners, performance, retention, validation) |
| 1.0.0 | 2025-10-23 | Original | Initial documentation hosting spec (no versioning) |

---

**Status**: Proposed
**Approval Required**: DocsOps Lead, Release Manager, Architecture Guild
**Target Implementation**: Phase 1 starts Nov 7, v1.0.0 created Nov 15
