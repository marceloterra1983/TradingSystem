# Documentation Migration Artifacts

This directory contains all artifacts related to the migration from `docs/context/` (legacy Docusaurus) to `docs/content/` (Docusaurus v3).

## Phase 0: Preparation (Complete)

### Deliverables

1. **[README-CATALOG.md](README-CATALOG.md)**
   - Catalog of all README.md files in apps/, backend/, frontend/
   - 9 files cataloged with metadata (domain, audience, status, summary)
   - All marked Complete with recent updates (October 2025)
   - Cross-reference map included

2. **[CONTENT-INVENTORY.md](CONTENT-INVENTORY.md)**
   - Comprehensive inventory of 195+ files in docs/context/
   - Organized by domain (backend, frontend, ops, shared)
   - Migration priority assessment (Critical, High, Medium, Low)
   - Content gaps identified
   - Statistics and recommendations

3. **[MIGRATION-MAPPING.md](MIGRATION-MAPPING.md)**
   - Authoritative migration guide
   - Mapping criteria definitions (Complete, Draft, Gap)
   - Domain-to-category mappings
   - File-level mapping examples
   - Migration rules (frontmatter, naming, structure)
   - Special cases (multi-language, diagrams, OpenAPI, templates)
   - Validation checklist (15+ items)

4. **[INVENTORY-REPORT.md](INVENTORY-REPORT.md)**
   - Executive summary for stakeholders
   - File counts by domain and category
   - Migration priority matrix
   - Migration readiness assessment
   - Recommendations and next steps
   - Success metrics

## Migration Phases

### Phase 0: Preparation ✅ Complete
- Catalog all README files
- Inventory docs/context/ content
- Create migration mapping
- Generate inventory report

### Phase 1: Content Migration (Next)
- Migrate Priority 1 files (31 critical files)
- Migrate Priority 2 files (63 high-priority files)
- Validate internal links
- Run build and link validation

### Phase 2: Validation
- Link validator passes
- Diagrams render correctly
- Frontmatter compliance 100%
- SME review complete

### Phase 3: Cut-over
- Production switch to docs
- Legacy docs archived
- Redirects configured
- User feedback collected

## Usage

### For Migration Implementers
1. Read `MIGRATION-MAPPING.md` for authoritative migration rules
2. Use `CONTENT-INVENTORY.md` to identify files to migrate
3. Follow priority order in `INVENTORY-REPORT.md`
4. Validate using checklist in `MIGRATION-MAPPING.md`

### For Stakeholders
1. Review `INVENTORY-REPORT.md` for executive summary
2. Approve migration priorities
3. Assign domain owners
4. Track progress against success metrics

### For Reviewers
1. Use `README-CATALOG.md` to understand current README state
2. Reference `MIGRATION-MAPPING.md` for validation criteria
3. Check migrated content against Complete/Draft/Gap definitions

## Related Documentation

- **Migration Tasks:** `tools/openspec/changes/migrate-docs-to-docusaurus-v2/tasks.md`
- **Legacy Docs:** `docs_legacy/README.md` (archived portal)
- **Target Docs:** `docs/README.md` (new system)
- **Domain READMEs:** 
  - `docs_legacy/context/backend/README.md`
  - `docs_legacy/context/frontend/README.md`
  - `docs_legacy/context/ops/README.md`
  - `docs_legacy/context/shared/README.md`

## Automation

### Available Commands
```bash
# Generate reference content (ports, env vars, MCP registry)
npm --prefix docs run docs:auto

# Run full validation (lint, type-check, build)
npm --prefix docs run docs:check

# Validate all links
npm --prefix docs run docs:links

# Run tests for automation helpers
npm --prefix docs run docs:test

# Create new MDX page with frontmatter
bash scripts/docusaurus/new.sh <section/slug> --title "Title"
```

### Husky Hooks
- **pre-commit:** Runs `docs:lint`
- **pre-push:** Runs `docs:check`
- **Bypass:** Export `SKIP_DOCS_HOOKS=1` in emergencies

## Contact

- **DocsOps:** Documentation operations and standards
- **ProductOps:** PRD and product documentation
- **ArchitectureGuild:** ADRs and architecture decisions
- **Ops Guild:** Runbooks and operational procedures

## Version History

- **v1.0.0** (2025-10-24): Phase 0 complete - Catalog, inventory, mapping, and report created
- **v1.1.0** (TBD): Phase 1 complete - Priority 1 & 2 files migrated
- **v1.2.0** (TBD): Phase 2 complete - Validation passed
- **v2.0.0** (TBD): Phase 3 complete - Production cut-over

---

**Last Updated:** 2025-10-24  
**Status:** Phase 0 Complete, Phase 1 Ready to Start  
**Next Review:** After Phase 1 completion
