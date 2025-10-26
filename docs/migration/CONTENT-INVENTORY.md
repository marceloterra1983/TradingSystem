## Executive Summary

- Total files: 251 Markdown/MDX assets under docs/ (excluding generated Docusaurus output)
- Domains: backend (58), frontend (57), ops (68), shared (45); PRD subset 10; root meta 2
- Frontmatter compliance: 247/251 files (98.4%) include required metadata; four gaps listed below
- Last complete review: 2025-10-17
- Documentation health grade: B+ (85/100)

## Summary Statistics

### Files by Domain
- backend: 58
- frontend: 57
- ops: 68
- shared: 45
- PRD (subset of shared): 10
- root meta: 2

### Files by Type
- reference: 83
- guide: 74
- index: 32
- runbook: 15
- overview: 5
- prd: 6
- adr: 7
- analysis: 1
- checklist: 1
- clarification: 1
- instructions: 1
- template: 1
- unknown: 24

### Files by Status
- active: 210
- draft: 10
- deprecated: 2
- implemented: 1
- in-progress: 1
- ready: 2
- stable: 1
- unknown: 24

### Average Word Count by Domain
- backend: 665 words/file
- frontend: 645 words/file
- ops: 609 words/file
- shared: 938 words/file

### Special Counts
- Runbooks: 15
- Overviews: 5
- Index pages: 32
- RFC documents: 3
- Draft files: 10 (see detailed list below)
- Frontmatter missing: 4 (see detailed list below)

### Draft Files
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

### Last Review Older Than 180 Days (reference: 2025-10-24)
- None detected

### Frontmatter Gaps
- `docs/context/ops/status/STATUS-COMMAND.md`
- `docs/context/ops/status/STATUS-IMPLEMENTATION.md`
- `docs/context/shared/guidelines/MARKDOWN-FILE-GUIDELINES.md`
- `docs/database-structure-standard.md`

## Domain Breakdown

### Backend Domain
**Location:** `docs/context/backend/`

**File Count:** 58 files

**Main Categories:**
- api/ (10 files) - API specifications, contracts, and OpenAPI sources
- architecture/ (8 files) - Architecture overview, service map, B3 integration
- architecture/decisions/ (4 ADRs) - LowDB, Agno Framework, OpenSpec review, frontend dependencies
- data/ (28 files) - Schemas, migrations, operations, warehouse
- guides/ (11 files) - Implementation guides for services
- references/ (3 files) - API styleguide, logging strategy

**Key Documents:**
1. `backend/README.md` - Central hub
2. `backend/architecture/overview.md` - Architecture overview
3. `backend/api/README.md` - API specifications index
4. `backend/data/schemas/README.md` - Data schema index
5. `backend/architecture/decisions/2025-10-09-adr-0001-use-lowdb.md` - Critical ADR

**Missing Frontmatter:** None detected (100% compliance)

### Frontend Domain
**Location:** `docs/context/frontend/`

**File Count:** 57 files

**Main Categories:**
- design-system/ (4 files) - Tokens, components, theming, patterns
- guidelines/ (4 files) - Style guide, accessibility, i18n, performance
- engineering/ (5 files) - Architecture, conventions, testing, build-ci
- features/ (9 files) - Feature specifications
- guides/ (19 files) - Implementation guides
- architecture/decisions/ (4 ADRs) - Zustand, shadcn/ui, localStorage, React Router

**Key Documents:**
1. `frontend/README.md` - Frontend hub
2. `frontend/design-system/tokens.mdx` - Design tokens
3. `frontend/engineering/architecture.mdx` - Frontend architecture
4. `frontend/features/customizable-layout.md` - Key feature
5. `frontend/guides/guide-documentation-dashboard.md` - Dashboard guide

**Missing Frontmatter:** None detected

### Ops Domain
**Location:** `docs/context/ops/`

**File Count:** 68 files

**Main Categories:**
- onboarding/ (10 files) - Quick start guides (PT/EN)
- deployment/ (4 files) - Windows native, rollback, scheduled tasks
- monitoring/ (5 files) - Prometheus, Grafana, alerting
- incidents/ (4 files) - Incident reports
- troubleshooting/ (1 file) - Container issues
- automation/ (3 files) - Backup, startup tasks
- checklists/ (5 files) - Pre-deploy, post-deploy, incident review
- infrastructure/ (7 files) - Centralized env, reverse proxy, container naming
- status/ (2 files) - Portfolio and implementation status snapshots

**Key Documents:**
1. `ops/README.md` - Operations hub
2. `ops/onboarding/QUICK-START-GUIDE.md` - Critical onboarding
3. `ops/service-port-map.md` - Service port reference
4. `ops/ENVIRONMENT-CONFIGURATION.md` - Environment setup
5. `ops/monitoring/prometheus-setup.md` - Monitoring setup

**Missing Frontmatter:** 2 files (`docs/context/ops/status/STATUS-COMMAND.md`, `docs/context/ops/status/STATUS-IMPLEMENTATION.md`)

### Shared Domain
**Location:** `docs/context/shared/`

**File Count:** 45 files

**Main Categories:**
- product/prd/ (10 PRDs in PT/EN) - Product requirements
- product/rfc/ (3 files) - Request for comments
- diagrams/ (27 files) - PlantUML sources and diagram indexes
- tools/templates/ (8 templates) - ADR, PRD, RFC, Guide, Runbook
- tools/docusaurus/ (2 files) - Docusaurus templates
- tools/openspec/ (1 file) - OpenSpec integration
- integrations/ (2 files) - API hub, overview
- summaries/ (5 files) - Executive summaries
- runbooks/ (1 file) - Operational runbooks
- guidelines/ (1 file) - Markdown style guide

**Key Documents:**
1. `shared/README.md` - Shared resources hub
2. `shared/product/prd/README.md` - PRD catalog
3. `shared/diagrams/README.md` - Diagram index
4. `shared/tools/templates/index.md` - Template catalog
5. `shared/integrations/frontend-backend-api-hub.md` - API integration hub

**Missing Frontmatter:** `docs/context/shared/guidelines/MARKDOWN-FILE-GUIDELINES.md`

## Migration Priority Assessment

### Critical (Must Migrate First)
**Priority 1 - Operational Dependencies (13 files):**
- `docs/context/ops/onboarding/*.md` (10 files) → `docs/content/ops/onboarding/`
- `docs/context/ops/service-port-map.md` → `docs/content/tools/ports-services/overview.mdx`
- `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` → `docs/content/tools/security-config/overview.mdx`
- `docs/context/ops/service-startup-guide.md` → `docs/content/ops/startup/service-startup-guide.mdx`

**Priority 1 - Architecture & APIs (13 files):**
- `docs/context/backend/architecture/overview.md` → `docs/content/reference/architecture/overview.mdx`
- `docs/context/backend/api/README.md` → `docs/content/api/overview.mdx`
- ADRs across backend, frontend, and shared architecture (7 files) → `docs/content/reference/adrs/`
- OpenAPI specs (`docs/context/backend/api/*.openapi.yaml`, 4 files) → `docs/content/reference/specs/openapi/`

**Priority 1 - Root Meta Documents (2 files):**
- `docs/README.md` → `docs/content/meta/index.mdx`
- `docs/database-structure-standard.md` → `docs/content/meta/database-structure-standard.mdx`

### High (Migrate Early)
**Priority 2 - Features & Guides (39 files):**
- `docs/context/frontend/features/` (9 files) → `docs/content/frontend/features/`
- `docs/context/backend/guides/` (11 files) → `docs/content/guides/backend/`
- `docs/context/frontend/guides/` (19 files) → `docs/content/guides/frontend/`

**Priority 2 - Design System (13 files):**
- `docs/context/frontend/design-system/` (4 files) → `docs/content/frontend/design-system/`
- `docs/context/frontend/engineering/` (5 files) → `docs/content/frontend/engineering/`
- `docs/context/frontend/guidelines/` (4 files) → `docs/content/frontend/guidelines/`

**Priority 2 - Data & Schemas (18 files):**
- `docs/context/backend/data/schemas/` (8 files) → `docs/content/database/schemas/`
- `docs/context/backend/data/migrations/` (5 files) → `docs/content/database/migrations/`
- `docs/context/backend/data/operations/` (5 files) → `docs/content/database/operations/`

### Medium (Migrate Mid-Phase)
**Priority 3 - Templates & References (13 files):**
- `docs/context/shared/tools/templates/` (8 files) → `docs/content/reference/templates/`
- `docs/context/backend/references/` (3 files) → `docs/content/reference/`
- `docs/context/frontend/references/` (2 files) → `docs/content/reference/`

**Priority 3 - PRDs & Product Docs (13 files):**
- `docs/context/shared/product/prd/` (10 files) → `docs/content/prd/products/`
- `docs/context/shared/product/rfc/` (3 files) → `docs/content/prd/archive/` (if deprecated)

**Priority 3 - Monitoring & Deployment (9 files):**
- `docs/context/ops/monitoring/` (5 files) → `docs/content/ops/monitoring/`
- `docs/context/ops/deployment/` (4 files) → `docs/content/ops/deployment/`

### Low (Migrate Last)
**Priority 4 - Archives & Historical (2 deprecated docs):**
- `docs/context/backend/guides/gemini-installation-wsl.md` (status: deprecated)
- `docs/context/ops/claude-z-ai-guide.md` (status: deprecated)

**Priority 4 - Summaries & Overviews (5 files):**
- `docs/context/shared/summaries/` (5 files) → `docs/content/meta/summaries/`

## Content Gaps

### Areas with Sparse Documentation
- **Agents/MCP**: Only basic structure exists; needs detailed agent orchestration docs
- **Security**: Limited security configuration documentation
- **Testing**: Few testing strategy documents
- **Performance**: Minimal performance optimization guides

### Outdated Content (Old last_review Dates)
No files exceed the 180-day threshold (reference date 2025-10-24). Continue quarterly reviews to maintain freshness.

### Incomplete Content (Draft Status)
10 files carry `status: draft`; see the Draft Files list above for full paths and assign owners for completion.

## Recommendations

1. **Immediate Actions:**
   - Migrate Priority 1 (Critical) files first
   - Run `docs:auto` to generate reference content (ports, env vars)
   - Validate all internal links in migrated content

2. **Phase 4 Preparation:**
   - Create migration tracking spreadsheet with columns: source_path, target_path, status, owner, priority
   - Assign SME owners for each domain
   - Schedule review sessions for ADRs and PRDs

3. **Automation Opportunities:**
   - Automate frontmatter transformation script
   - Create link rewriting utility
   - Build validation script for migrated content

4. **Quality Assurance:**
   - Run `npm run docs:check` after each batch migration
   - Use `npm run docs:links` to validate all links
   - Ensure PlantUML diagrams render correctly

**Reference:** Agent 2 report for detailed per-file metadata extraction methodology.
