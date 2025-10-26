# Documentation Migration Inventory Report

**Date:** 2025-10-24  
**Phase:** Phase 4 - Automation Enhancements  
**Status:** In Progress  
**Next Phase:** Phase 5 - Validation & Cut-over

## Executive Summary

This report provides a comprehensive inventory of all documentation across the TradingSystem repository, mapping content from the legacy `docs/context/` system to the new `docs/content/` Docusaurus v3 workspace.

**Key Metrics:**
- Total documentation files: 251 legacy Markdown/MDX assets
- README files cataloged: 14 (apps 7, backend 2, frontend 2, docs 1, ops 1, shared 1)
- Target structure files: 135 (130 placeholder, 5 partial, 0 complete)
- Frontmatter compliance: 247/251 files (98.4%); four files missing headers
- Documentation health: Grade B+ (85/100)
- Migration readiness: Priority 1 scope spans 28 files; target workspace remains 96% placeholder content
- Technical references inventory: 150+ references across configuration, scripts, documentation, and source code (see `COMPLETE-REFERENCE-INVENTORY.md`)

## Scope of Work

This inventory covers:
1. All README.md files in `apps/`, `backend/`, `frontend/`
2. All markdown files in `docs/context/` (4 domains: backend, frontend, ops, shared)
3. All files in `docs/content/` (12 categories)
4. Migration mapping from legacy to target structure
5. All technical references to `docs/`, `docs/docusaurus`, `docs/context`, and port `3004` (150+ references)

## File Counts by Domain

### Legacy System (docs/)
| Domain/Area | File Count | Status | Priority |
|-------------|-----------|--------|----------|
| Backend | 58 | Active | Critical |
| Frontend | 57 | Active | High |
| Ops | 68 | Active | Critical |
| Shared | 45 | Active | High |
| Context Root | 9 | Active | Critical |
| Context PRD | 5 | Active | Medium |
| Architecture (global) | 2 | Active | High |
| Operations (global) | 1 | Active | High |
| Product (global) | 4 | Active | Medium |
| Root Meta | 2 | Active | Critical |
| **Total** | **251** | **Active** | **Mixed** |

### Target System (docs/content/)
| Category | File Count | Placeholder | Partial | Complete | Needs Migration |
|----------|-----------|-------------|---------|----------|----------------|
| apps | 20 | 20 | 0 | 0 | Yes |
| api | 3 | 3 | 0 | 0 | Yes |
| agents | 6 | 5 | 1 | 0 | Yes |
| database | 4 | 4 | 0 | 0 | Yes |
| diagrams | 1 | 1 | 0 | 0 | Yes |
| frontend | 14 | 13 | 1 | 0 | Yes |
| mcp | 3 | 3 | 0 | 0 | Yes |
| prd | 6 | 5 | 1 | 0 | Yes |
| prompts | 4 | 4 | 0 | 0 | Yes |
| reference | 13 | 13 | 0 | 0 | Yes |
| sdd | 12 | 12 | 0 | 0 | Yes |
| tools | 46 | 45 | 1 | 0 | Yes |
| changelog.mdx | 1 | 1 | 0 | 0 | Yes |
| faq.mdx | 1 | 1 | 0 | 0 | Yes |
| index.mdx | 1 | 0 | 1 | 0 | Yes |
| **Total** | **135** | **130** | **5** | **0** | **Yes** |

### README Files (apps/, backend/, frontend/)
| Domain | Count | Status | Last Updated |
|--------|-------|--------|-------------|
| apps | 7 | Complete | Oct 2025 |
| backend | 2 | Complete | Oct 2025 |
| frontend | 2 | Complete | Oct 2025 |
| docs | 1 | Complete | Oct 2025 |
| ops | 1 | Complete | Oct 2025 |
| shared | 1 | Complete | Oct 2025 |
| **Total** | **14** | **Complete** | **Current** |

## Migration Priority Matrix

### Priority 1: Critical (Migrate First)
**Operational Dependencies (13 files):**
- Onboarding guides (`docs/context/ops/onboarding/*.md`, 10 files)
- `docs/context/ops/service-port-map.md`
- `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`
- `docs/context/ops/service-startup-guide.md`

**Architecture & APIs (13 files):**
- `docs/context/backend/architecture/overview.md`
- `docs/context/backend/api/README.md`
- ADRs across backend, frontend, and shared architecture (7 files)
- OpenAPI specs (`docs/context/backend/api/*.openapi.yaml`, 4 files)

**Root Meta Documents (2 files):**
- `docs/README.md`
- `docs/database-structure-standard.md`

**Total Priority 1:** 28 files

### Priority 2: High (Migrate Early)
**Features & Guides (39 files):**
- `docs/context/frontend/features/` (9 files)
- `docs/context/backend/guides/` (11 files)
- `docs/context/frontend/guides/` (19 files)

**Design System (13 files):**
- `docs/context/frontend/design-system/` (4 files)
- `docs/context/frontend/engineering/` (5 files)
- `docs/context/frontend/guidelines/` (4 files)

**Data & Schemas (18 files):**
- `docs/context/backend/data/schemas/` (8 files)
- `docs/context/backend/data/migrations/` (5 files)
- `docs/context/backend/data/operations/` (5 files)

**Total Priority 2:** 70 files

### Priority 3: Medium (Migrate Mid-Phase)
**Templates & References (13 files):**
- `docs/context/shared/tools/templates/` (8 files)
- `docs/context/backend/references/` (3 files)
- `docs/context/frontend/references/` (2 files)

**PRDs & Product Docs (13 files):**
- `docs/context/shared/product/prd/` (10 files)
- `docs/context/shared/product/rfc/` (3 files)

**Monitoring & Deployment (9 files):**
- `docs/context/ops/monitoring/` (5 files)
- `docs/context/ops/deployment/` (4 files)

**Total Priority 3:** 35 files

### Priority 4: Low (Migrate Last)
**Archives & Historical (2 deprecated docs):**
- `docs/context/backend/guides/gemini-installation-wsl.md`
- `docs/context/ops/claude-z-ai-guide.md`

**Summaries & Overviews (5 files):**
- `docs/context/shared/summaries/` (5 files)

**Total Priority 4:** 7 files

## Technical References Inventory

**Overview**: In addition to content migration, the cutover requires updating 150+ technical references across the codebase.

**Categories**:
- Configuration files: 4 critical files (`package.json`, `config/services-manifest.json`, `.env.example`, `pyrightconfig.json`)
- Automation scripts: 35+ scripts in `scripts/docs/`, `scripts/setup/`, `scripts/core/`, `scripts/docker/`
- Documentation: 60+ markdown files with links, commands, or port references
- Source code: 20+ files with CORS, URLs, or configuration references
- Docker & infrastructure: 5 files with volumes, ports, and service definitions

**Status**: Complete inventory available in `COMPLETE-REFERENCE-INVENTORY.md`

**Tracking**: Progress tracked in `REFERENCE-UPDATE-TRACKING.md`

**Priority**: P0-P1 references must be updated before cutover (estimated 2-3 days)

## Migration Readiness Assessment

### Ready (Structure Complete, Needs Content)
- **frontend/**: 14 files scaffolded (13 placeholder, 1 partial)
- **tools/**: 46 files scaffolded (45 placeholder, 1 partial)
- **sdd/**: 12 placeholder stubs ready for authoring

### Needs Work (Structure Incomplete)
- **apps/**: 20 placeholder files require SME content
- **reference/**: 13 placeholder files pending docs:auto integration
- **prompts/**: 4 placeholder files need examples and governance
- **database/**: 4 placeholder files need ER diagrams and runbooks

### Blocked (Automation/Decisions Required)
- **api/**: Blocked by OpenAPI/Redoc generation (Phase 3)
- **agents/mcp/**: Blocked by MCP registry automation (Phase 3)
- **prd/**: Blocked until historical PRDs handed off
- **diagrams/**: Blocked until PlantUML rendering decided

## Content Gaps Identified

### Critical Gaps
1. **Generated Reference Content:**
   - Ports table (automated via docs:auto)
   - OpenAPI/Redoc pages (automation pending)
   - MCP registry (blocked – external configuration files)
   - Environment variables table (automation pending)

2. **Production Runbooks:**
   - App-specific troubleshooting
   - Operational checklists
   - Incident response procedures

3. **Historical Archives:**
   - 2 deprecated guides pending archival (see Priority 4)
   - PRD archive backlog still outstanding (10 active PRDs in shared/product/prd/)
   - Migration history timeline not yet documented

### Documentation Sparse Areas
- Agents/MCP orchestration (needs detailed docs)
- Security configuration (limited docs)
- Testing strategies (few documents)
- Performance optimization (minimal guides)

### Outdated Content
- No files exceed the 180-day SLA (reference date 2025-10-24)
- Draft status files requiring completion (10):
  - `docs/context/backend/data/migrations/2025-11-01-migration-plan.md`
  - `docs/context/backend/data/schemas/logging/overview.md`
  - `docs/context/backend/data/schemas/trading-core/tables/b3-market-data.md`
  - `docs/context/backend/data/schemas/trading-core/tables/positions.md`
  - `docs/context/backend/data/schemas/trading-core/tables/trades.md`
  - `docs/context/backend/data/warehouse/parquet-layout.md`
  - `docs/context/backend/data/warehouse/timeseries-aggregation.md`
  - `docs/context/frontend/features/TEMPLATE-feature-spec.md`
  - `docs/context/ops/automation/backup-job.md`
  - `docs/context/shared/product/plans/llamaindex-implementation-plan.md`

## Mapping Criteria

### Complete
- All required frontmatter fields present and valid
- Recent last_review date (within 180 days)
- No TODO/TBD/FIXME markers
- All internal links updated to new slugs
- Images/diagrams present and renderable

### Draft
- Missing sections or incomplete content
- Frontmatter present but some fields empty/placeholder
- Contains TODO/TBD/WIP markers
- Cross-links still point to legacy paths

### Gap
- No content in target
- Single-line placeholder or autogenerated stub
- Critical content missing

## Domain-to-Category Mapping Summary

**Key Mappings:**
- `backend/api/` → `content/api/` + `content/reference/sdd/api/`
- `backend/architecture/` → `content/reference/adrs/`
- `backend/data/` → `content/database/`
- `frontend/` → `content/frontend/`
- `ops/` → `content/ops/`
- `shared/product/prd/` → `content/product/prd/`
- `shared/diagrams/` → `content/assets/diagrams/` + `content/diagrams/guide`
- `docs/spec/` → `content/reference/specs/openapi/`
- Root meta docs → `content/meta/`

**See:** `MIGRATION-MAPPING.md` for complete mapping details.

## Recommendations

### Immediate Actions (Week 1)
1. ✅ **Complete** – docs:auto now generates ports, tokens, and MCP automation status
2. **Resolve MCP config access** (commit sanitized configs or expose API endpoint) to unblock registry automation
3. **Migrate Priority 1 files** (28 critical files)
4. **Validate automation outputs** in `content/reference/generated/`
5. **Create migration tracking spreadsheet** with columns: source_path, target_path, status, owner, priority
6. **Review technical references inventory** (`COMPLETE-REFERENCE-INVENTORY.md`) and assign owners for each category

### Phase 4 Preparation (Weeks 2-4)
1. **Assign SME owners** for each domain (backend, frontend, ops, product)
2. **Schedule review sessions** for ADRs and PRDs
3. **Migrate Priority 2 files** (70 high-priority files)
4. **Run link validation** after each batch migration

### Automation Opportunities
1. ✅ **Frontmatter transformation script** (implemented via docs:auto generators)
2. ⏳ **Link rewriting utility** using migration mapping CSV (scheduled for Phase 6)
3. ✅ **Validation script** for generated content (`docs/tests/validate-generated-content.test.mjs`)
4. **Placeholder detection** to identify incomplete migrations

### Quality Assurance
1. Run `npm run docs:check` after each batch migration
2. Use `npm run docs:links` to validate all links
3. Ensure PlantUML diagrams render correctly
4. Test onboarding guides with new developers
5. Verify service port map accuracy

## Risks & Mitigation

### Risk: Automation Blockers
- **Impact:** api/, agents/, mcp/ categories blocked until Phase 3 automation complete
- **Mitigation:** Prioritize completing Phase 3 automation tasks; create manual placeholders with TODO markers

### Risk: SME Availability
- **Impact:** Content review and validation delays
- **Mitigation:** Assign backup reviewers; schedule review sessions in advance; use async review process

### Risk: Link Rot
- **Impact:** Broken internal links after migration
- **Mitigation:** Create comprehensive link mapping; use automated link rewriting; run link validator frequently

### Risk: Diagram Rendering
- **Impact:** PlantUML diagrams may not render in docs
- **Mitigation:** Test PlantUML plugin early; have fallback to static images; document rendering process

### Risk: Translation Drift
- **Impact:** PT/EN translations out of sync
- **Mitigation:** Mark outdated translations with status: translation-needed; schedule translation review

## Success Metrics

### Phase 0 - Preparation (Complete)
- ✅ README catalog created (9 files)
- ✅ Content inventory completed (195+ files)
- ✅ Migration mapping document created
- ✅ Inventory report generated

### Phase 1 - Content Migration
- [ ] Priority 1 files migrated (28 files)
- [ ] Priority 2 files migrated (70 files)
- [ ] All internal links validated
- [ ] Build passes without errors

### Phase 2 - Validation
- [ ] Link validator passes (0 broken links)
- [ ] All diagrams render correctly
- [ ] Frontmatter compliance 100%
- [ ] SME review complete for critical docs

### Phase 3 - Cut-over
- [ ] Production switch to docs
- [ ] Legacy docs archived
- [ ] Redirects configured
- [ ] User feedback collected

### Phase 4 (In Progress) - Automation
- ✅ Ports table generation from `docs/context/ops/service-port-map.md`
- ✅ Design tokens extraction from `frontend/dashboard/tailwind.config.js`
- ✅ Generated content validation (`docs:validate-generated`)
- ✅ docs:check pipeline updated to include generation validation
- ✅ Husky hooks run docs:auto (commit) and docs:check (push)
- ⚠️ MCP registry generation (blocked - configs external to repo)
- ⏳ OpenAPI spec generation (pending service implementation)
- ⏳ Environment variables table generation (pending source consolidation)

### Phase 6 (In Progress) - Update References & Cut-over
- 🔄 Technical references inventory (complete – see `COMPLETE-REFERENCE-INVENTORY.md`)
- ⏳ Technical references updates (0% – tracking in `REFERENCE-UPDATE-TRACKING.md`)
- 🔄 Internal link updates in docs (11 files updated)
- 🔄 Frontend component updates (apiConfig.docsUrl → port 3205)
- 🔄 Backend README updates (reference docs)
- 🔄 CI/CD workflow updates (validate docs)
- 🔄 PlantUML diagram migration (26 diagrams to assets/diagrams/source/)
- 🔄 Legacy docs archival (deprecation notice added)
- ⏳ Cut-over execution (scheduled 2025-11-15)
- ⏳ Post-launch monitoring (30-day transition period)

## Next Steps

1. **Complete Phase 6 tasks**:
   - [ ] Copy PlantUML diagrams to docs/content/assets/diagrams/source/
   - [ ] Update remaining legacy references in code and docs
   - [ ] Update all technical references (150+ files) using `REFERENCE-UPDATE-TRACKING.md`
   - [ ] Validate reference updates with grep-based validation commands
   - [ ] Run full validation suite (docs:check, validate-frontmatter.py, docs:links)
   - [ ] Execute cut-over plan (see `governance/CUTOVER-PLAN.md`)

2. **Launch docs** (2025-11-15):
   - [ ] Final stakeholder approval
   - [ ] Execute communication plan
   - [ ] Monitor for issues (first 24 hours)
   - [ ] Collect user feedback

3. **Post-Launch** (30-day transition):
   - [ ] Address feedback and issues
   - [ ] Archive legacy docs/ (2025-12-15)
   - [ ] Schedule first quarterly review (Q1 2026)
   - [ ] Update governance documents based on lessons learned

## Appendices

### Appendix A: README Catalog
See `README-CATALOG.md` for complete catalog of 9 README files.

### Appendix B: Content Inventory
See `CONTENT-INVENTORY.md` for detailed inventory of 195+ files in docs/context/.

### Appendix C: Migration Mapping
See `MIGRATION-MAPPING.md` for authoritative migration guide with criteria, mappings, rules, and validation checklist.

### Appendix D: Agent Reports
Original agent reports available for detailed analysis:
- Agent 1: README Catalog (9 files analyzed)
- Agent 2: Content Inventory (awaiting full scan confirmation)
- Agent 3: Target Structure Analysis (205 files, migration readiness)
- Agent 4: Migration Mapping Document (comprehensive guide)

---

**Report Prepared By:** Documentation Migration Team  
**Review Status:** Pending stakeholder approval  
**Next Review:** After Phase 4 completion
