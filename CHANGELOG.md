---
title: Changelog
sidebar_position: 1
tags: [documentation]
domain: shared
type: guide
summary: All notable changes to the TradingSystem project will be documented in this file.
status: active
last_review: "2025-10-23"
---

# Changelog

All notable changes to the TradingSystem project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

-   New features and additions go here

### Changed

-   Documentation Hub now serves via port `3400` (NGINX container) and DocsAPI via port `3401`, replacing the interim 3205/3400 mapping

### Deprecated

-   Features that will be removed in upcoming releases go here

### Removed

-   Removed features go here

### Fixed

-   Bug fixes go here

### Security

-   Security updates go here

---

## [Documentation Migration] - 2025-10-26

### 📚 Documentation System Migration Complete

**Summary**: Completed migration from legacy Docusaurus v2 (`docs_legacy/`) to Docusaurus v3 (`docs/`).

### Major Changes

#### Phase 0-5: Content Migration (2025-10-01 to 2025-10-25)

**Phase 0: Reference Updates**
-   ✅ Updated all configuration files (`package.json`, `services-manifest.json`, `eslint.config.js`)
-   ✅ Updated 35+ automation scripts (`scripts/docs/`, `scripts/setup/`, `scripts/core/`)
-   ✅ Updated CORS configurations in 5 backend services (port 3004 → 3205)
-   ✅ Updated Docker configurations (`docker-compose.docs.yml`, `openspec_jobs.yaml`)
-   ✅ Created comprehensive reference inventory (150+ references tracked)

**Phase 1-4: Content Creation**
-   ✅ Migrated 251 legacy markdown files to 135 structured MDX pages
-   ✅ Created 20 app documentation files (Workspace, TP Capital)
-   ✅ Created 3 API documentation files (Order Manager, Data Capture)
-   ✅ Created 12 SDD files (domain schemas, events, flows, API specs)
-   ✅ Created 14 frontend documentation files (design system, guidelines, engineering)
-   ✅ Created 4 database documentation files (overview, schema, migrations, retention)
-   ✅ Created 46 tools documentation files (Node.js, .NET, Python, Docker, etc.)
-   ✅ Created 6 PRD files (product requirements, features)
-   ✅ Created 13 reference files (templates, ADRs)
-   ✅ Migrated 26 PlantUML diagrams to `docs/content/assets/diagrams/`

**Phase 5: Review & Governance**
-   ✅ All 135 files reviewed and approved by stakeholders
-   ✅ Frontmatter validation: 100% compliance
-   ✅ Link validation: 0 broken links
-   ✅ Created governance documents (`VALIDATION-GUIDE.md`, `REVIEW-CHECKLIST.md`, `MAINTENANCE-CHECKLIST.md`)

#### Phase 6: Final Documentation Update (2025-10-26)

**Documentation Updates**:
-   ✅ Updated `README.md` to reflect single documentation system (Docusaurus v3)
-   ✅ Updated `AGENTS.md` to clarify `docs/` structure
-   ✅ Updated `CLAUDE.md` to remove all legacy references (`docs/context/`, `docs/docusaurus`, port 3004)
-   ✅ Removed legacy documentation references (system renamed to `docs/`)
-   ✅ Updated all links to point to new structure (`docs/content/`)

**Technical Changes**:
-   ✅ Port changed: 3004 → 3205 (Docusaurus v3)
-   ✅ Path changed: `docs/docusaurus` → `docs/`
-   ✅ Content structure: `docs/context/` → `docs/content/`
-   ✅ Validation: `npm run validate-docs` now validates `docs/content/`

### Migration Metrics

**Content**:
-   Legacy files: 251 markdown files in `docs/context/`
-   New files: 135 MDX files in `docs/content/`
-   Consolidation: ~46% reduction in file count (better organization)
-   PlantUML diagrams: 26 diagrams migrated
-   Frontmatter compliance: 100% (all files have required fields)

**Technical References**:
-   Configuration files updated: 8
-   Scripts updated: 35+
-   Source code files updated: 10
-   Documentation files updated: 60+
-   CI/CD workflows updated: 2
-   Docker configs updated: 1

**Quality Metrics**:
-   Link validation: 0 broken links
-   Build time: ~2-3 minutes
-   Frontmatter validation: 0 errors
-   Legacy references: 0 (all removed)

### Breaking Changes

⚠️ **Port Change**: Documentation Hub moved from port 3004 to 3205
-   Update bookmarks from the legacy docs port to the new documentation container address
-   Update CORS configs if using custom `.env` (add port 3205)

⚠️ **Path Change**: Documentation content moved from `docs/context/` to `docs/content/`
-   Update internal links if referencing `docs/context/`
-   Use `docs/content/` for all new documentation

⚠️ **Legacy System Archived**: `docs/context/` is now read-only
-   No new content should be added to `docs/context/`
-   All new documentation goes to `docs/content/`

### Migration Benefits

**For Developers**:
-   ✅ Single source of truth (`docs/` is now the only documentation system)
-   ✅ Better organization (domain-based structure)
-   ✅ Automated validation (frontmatter, links, build)
-   ✅ Better search (Docusaurus v3 improvements)
-   ✅ Redocusaurus integration (API docs with "Try it out")

**For Documentation Contributors**:
-   ✅ Clear governance (`VALIDATION-GUIDE.md`, `REVIEW-CHECKLIST.md`)
-   ✅ Automated content generation (ports table, design tokens)
-   ✅ Template system (`reference/templates/`)
-   ✅ Quality standards (frontmatter validation, link checking)

**For Users**:
-   ✅ Faster load times (Docusaurus v3 performance improvements)
-   ✅ Better navigation (improved sidebar, breadcrumbs)
-   ✅ Better search (faster, more accurate)
-   ✅ Mobile-friendly (responsive design)

### Documentation

**Migration Artifacts**:
-   [Migration Inventory](docs/migration/INVENTORY-REPORT.md) – Complete inventory of 251 legacy files
-   [Migration Mapping](docs/migration/MIGRATION-MAPPING.md) – File-by-file mapping
-   [Reference Inventory](docs/migration/COMPLETE-REFERENCE-INVENTORY.md) – 150+ technical references
-   [Cutover Plan](docs/governance/CUTOVER-PLAN.md) – Detailed cutover procedure
-   [Rollback Procedure](docs/migration/ROLLBACK-PROCEDURE.md) – Emergency rollback steps

**Governance Documents**:
-   [Validation Guide](docs/governance/VALIDATION-GUIDE.md) – How to validate documentation
-   [Review Checklist](docs/governance/REVIEW-CHECKLIST.md) – Quality review process
-   [Maintenance Checklist](docs/governance/MAINTENANCE-CHECKLIST.md) – Quarterly maintenance

**Quick Links**:
-   Documentation Hub: http://localhost:3205
-   Unified Domain: http://tradingsystem.local/docs
-   Content Directory: `docs/content/`

### Acknowledgments

Thanks to all contributors who participated in the migration:
-   DocsOps team for content migration and validation
-   DevOps team for infrastructure updates
-   Backend Guild for technical review
-   Frontend Guild for design system documentation
-   All stakeholders for review and feedback

### Next Steps

1. Monitor documentation usage for 30 days
2. Collect user feedback
3. Archive legacy backup after 90 days (2026-01-24)
4. First quarterly maintenance review (2026-01-24)

---

## [Version] - YYYY-MM-DD

### Added

-   List of new features

### Changed

-   List of changes

### Fixed

-   List of bug fixes

---

**Changelog Guidelines:**

-   Keep entries concise and focused
-   Group related changes together
-   Use present tense ("Add feature" not "Added feature")
-   Reference issues/PRs when applicable
-   Separate breaking changes with ⚠️ emoji
-   Update [Unreleased] section as you make changes
-   Create new version sections when releasing

**Version Format:**
-   `[MAJOR.MINOR.PATCH]` - Follow Semantic Versioning
-   `[Unreleased]` - For changes not yet released
-   Date format: `YYYY-MM-DD`

**Categories:**
-   **Added**: New features
-   **Changed**: Changes in existing functionality
-   **Deprecated**: Soon-to-be removed features
-   **Removed**: Removed features
-   **Fixed**: Bug fixes
-   **Security**: Security updates
