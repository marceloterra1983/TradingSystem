---
title: Readme
sidebar_position: 1
tags: [documentation]
domain: shared
type: index
summary: TradingSystem Documentation Portal
status: active
last_review: "2025-10-23"
---

> ## ⚠️ DEPRECATION NOTICE - Legacy Documentation System
>
> **This documentation system (docs/) is deprecated and will be archived on 2025-11-15.**
>
> ### 🚀 New Documentation System (docs)
>
> **Primary Documentation**: [docs](http://localhost:3205) (Docusaurus v3)
>
> **Quick Links**:
> - 📖 [Documentation Hub](http://localhost:3205) - New documentation portal
> - 🗂️ [Content Directory](../docs/content/) - Browse all documentation
> - 📋 [Migration Status](../docs/migration/INVENTORY-REPORT.md) - Migration progress
> - ✅ [Validation Guide](../docs/governance/VALIDATION-GUIDE.md) - Quality assurance
>
> **What Changed**:
> - ✅ 135+ pages with improved navigation and search
> - ✅ Auto-generated reference content (ports, tokens)
> - ✅ Comprehensive app, API, frontend, database, and tool documentation
> - ✅ Multi-language support (PT/EN for PRDs)
> - ✅ Quarterly maintenance and quality reviews
>
> **Migration Timeline**:
> - ✅ Phase 0-4: Content migration and automation (Complete)
> - 🔄 Phase 5: Review & governance (In Progress)
> - ⏳ Phase 6: Update references & cut-over (Current)
> - 📅 Archive Date: 2025-11-15
>
> **For Contributors**:
> - ❌ Do NOT add new content to docs_legacy/ (use docs instead)
> - ✅ Run `npm --prefix docs run docs:dev` to start new docs server
> - ✅ See [docs/README.md](../docs/README.md) for automation and helpers
>
> **Legacy Access**:
> - This documentation remains accessible at http://localhost:3004 during transition
> - Content will be archived (read-only) after 2025-11-15
> - Redirects will be added in final cut-over

---

# 📚 TradingSystem Documentation

> **Single entry portal** for all TradingSystem documentation  
> **LEGACY SYSTEM** - See docs at `http://localhost:3205` for current documentation
>
> **Last updated:** 2025-10-23  
> **Status:** Active  
> **Maintainers:** Docs & Ops Guild  
> **Last Complete Review:** 2025-10-23 (Cleanup & Reorganization)

**🎯 Quick Start:** This README is the **central entry point** for all TradingSystem documentation. Use the index below for quick navigation.

---

## 📑 Complete Index

> **For AI agents**: See [Quick Reference for AI](#-quick-reference-for-ai) section below for optimized navigation.

### 📖 Root Documentation (Meta-Documentation)

| Document                                                                 | Description                                                               | Last Updated |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------ |
| **[DIRECTORY-STRUCTURE.md](DIRECTORY-STRUCTURE.md)**                     | 📁 Complete project directory structure with detailed descriptions        | 2025-10-17   |
| **[DOCUMENTATION-STANDARD.md](DOCUMENTATION-STANDARD.md)**               | 📐 Official documentation standard: YAML frontmatter, PlantUML, templates | 2025-10-17   |
| **[AI-NAVIGATION-GUIDE.md](AI-NAVIGATION-GUIDE.md)**                     | 🤖 AI-first navigation guide for LLMs and automation workflows            | 2025-10-17   |
| **[INSTALLED-COMPONENTS.md](INSTALLED-COMPONENTS.md)**                   | 📦 Complete inventory of dependencies, tools and installed services       | 2025-10-15   |
| **[DOCSPECS-IMPLEMENTATION-GUIDE.md](DOCSPECS-IMPLEMENTATION-GUIDE.md)** | 🔌 OpenAPI/AsyncAPI implementation guide with validation pipeline         | 2025-10-15   |

### 📊 Documentation Review Reports

| Document                                                                                                           | Description                                           | Date       |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------- |
| **[2025-10-17-documentation-review-complete.md](reports/2025-10-17-documentation-review-complete.md)**             | 📋 Complete documentation review report (Phases 1-5)  | 2025-10-17 |
| **[2025-10-17-documentation-audit.md](reports/2025-10-17-documentation-review/2025-10-17-documentation-audit.md)** | 🔍 Documentation audit report with validation results | 2025-10-17 |
| **[broken-links-analysis.md](reports/2025-10-17-documentation-review/broken-links-analysis.md)**                   | 🔗 Broken links analysis with remediation plan        | 2025-10-17 |
| **[plantuml-validation.md](reports/2025-10-17-documentation-review/plantuml-validation.md)**                       | 🎨 PlantUML diagram validation report                 | 2025-10-17 |
| **[navigation-validation.md](reports/2025-10-17-documentation-review/navigation-validation.md)**                   | 🧭 Navigation structure validation report             | 2025-10-17 |

### 🗂️ Context Structure

```text
docs/
├── README.md                        # 👈 YOU ARE HERE - Entry portal
├── DIRECTORY-STRUCTURE.md           # 📁 Complete project structure guide
├── DOCUMENTATION-STANDARD.md        # 📐 Official documentation standard
├── AI-NAVIGATION-GUIDE.md           # 🤖 AI navigation guide for LLMs
├── INSTALLED-COMPONENTS.md          # 📦 Component inventory
├── DOCSPECS-IMPLEMENTATION-GUIDE.md # 🔌 OpenAPI/AsyncAPI implementation
│
├── context/                         # 📚 Documentation organized by context
│   ├── intro.md                     # Landing page (slug: /)
│   ├── backend/                     # APIs, architecture, data, migrations
│   ├── frontend/                    # Dashboard, features, guides
│   ├── ops/                         # Runbooks, automation, monitoring
│   └── shared/                      # Product docs, templates, tools
│       ├── product/prd/             # PRDs & RFCs (PT/EN)
│       ├── runbooks/                # Operational runbooks
│       ├── summaries/               # Executive summaries
│       ├── tools/templates/         # Document templates
│       └── glossary.md              # Canonical terminology
│
├── docusaurus/                      # 🌐 Docusaurus instance (Port 3004)
│   ├── src/                         # React components & pages
│   ├── static/                      # Static assets
│   ├── docs/                        # Symlink to ../context/
│   └── docusaurus.config.ts         # Configuration
│
├── spec/                            # 📋 OpenAPI & AsyncAPI specs
│   ├── openapi.yaml                 # REST API specification
│   ├── asyncapi.yaml                # WebSocket specification
│   ├── schemas/                     # JSON schemas
│   └── examples/                    # Code examples
│
├── ingest/                          # 🔄 Documentation ingestion pipeline
│   ├── from_docusaurus.py           # Docusaurus knowledge extractor
│   └── assets/symbols.yaml          # Market symbols heuristics
│
└── reports/                         # 📊 Audits & technical analysis
    └── (generated reports)
```

---

## 🤖 Quick Reference for AI

> **Purpose**: Optimized navigation for AI agents, LLMs, and automated tooling.

### 📍 Navigation Map

**Where to find information by intent**:

| Intent                      | Primary Location                                          | Secondary Locations                                                    |
| --------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| **System Architecture**     | `context/backend/architecture/overview.md`                | `context/intro.md`, `context/shared/diagrams/system-architecture.puml` |
| **API Documentation**       | `context/shared/integrations/frontend-backend-api-hub.md` | `context/backend/api/`, `` `spec/openapi.yaml` ``                      |
| **Implementation Guides**   | `context/backend/guides/`, `context/frontend/guides/`     | `context/ops/onboarding/`                                              |
| **Data Schemas**            | `context/backend/data/schemas/`                           | `context/backend/data/operations/`                                     |
| **Deployment & Operations** | `context/ops/deployment/`, `context/ops/onboarding/`      | `context/shared/runbooks/`                                             |
| **Product Requirements**    | `context/shared/product/prd/`                          | `context/shared/product/prd/README.md` (index)                        |
| **Architecture Decisions**  | `context/backend/architecture/decisions/`                 | `context/frontend/architecture/decisions/`                             |
| **Feature Specifications**  | `context/frontend/features/`                              | `context/frontend/guides/`                                             |
| **Troubleshooting**         | `context/ops/troubleshooting/`, `context/ops/incidents/`  | `context/shared/runbooks/`                                             |
| **Templates & Standards**   | `context/shared/tools/templates/`                         | `DOCUMENTATION-STANDARD.md`                                            |

### 📚 High-Value Documents by Context

**Architecture & Design**:

1. [backend/architecture/overview.md](context/backend/architecture/overview.md) - Backend architecture overview
2. [backend/architecture/service-map.md](context/backend/architecture/service-map.md) - Service dependencies and ports
3. [frontend/architecture/overview.md](context/frontend/architecture/overview.md) - Frontend architecture
4. [shared/diagrams/system-architecture.puml](context/shared/diagrams/system-architecture.puml) - Visual system architecture
5. [shared/integrations/frontend-backend-api-hub.md](context/shared/integrations/frontend-backend-api-hub.md) - API integration hub

**Implementation & Development**:

1. [backend/guides/guide-idea-bank-api.md](context/backend/guides/guide-idea-bank-api.md) - Idea Bank API implementation
2. [frontend/guides/guide-documentation-dashboard.md](context/frontend/guides/guide-documentation-dashboard.md) - Dashboard implementation
3. [frontend/features/customizable-layout.md](context/frontend/features/customizable-layout.md) - Layout system
4. [backend/data/schemas/README.md](context/backend/data/schemas/README.md) - Data schema index
5. [ops/onboarding/QUICK-START-GUIDE.md](context/ops/onboarding/QUICK-START-GUIDE.md) - Developer quick start

**Operations & Deployment**:

1. [ops/service-port-map.md](context/ops/service-port-map.md) - Service port reference
2. [ops/ENVIRONMENT-CONFIGURATION.md](context/ops/ENVIRONMENT-CONFIGURATION.md) - Environment setup
3. [ops/deployment/windows-native.md](context/ops/deployment/windows-native.md) - Windows deployment
4. [ops/monitoring/prometheus-setup.md](context/ops/monitoring/prometheus-setup.md) - Monitoring setup
5. [shared/runbooks/README.md](context/shared/runbooks/README.md) - Runbook catalog

**Product & Requirements**:

1. [shared/product/prd/banco-ideias-prd.md](context/shared/product/prd/banco-ideias-prd.md) - Idea Bank PRD
2. [shared/product/prd/docusaurus-implementation-prd.md](context/shared/product/prd/docusaurus-implementation-prd.md) - Docusaurus PRD
3. [shared/product/prd/tp-capital-signal-table-prd.md](context/shared/product/prd/tp-capital-signal-table-prd.md) - TP Capital Signal Table PRD
4. [shared/product/prd/tp-capital-telegram-connections-prd.md](context/shared/product/prd/tp-capital-telegram-connections-prd.md) - Telegram Connections PRD
5. [shared/product/prd/monitoramento-prometheus-prd.md](context/shared/product/prd/monitoramento-prometheus-prd.md) - Prometheus Monitoring PRD
6. [backend/architecture/decisions/2025-10-09-adr-0001-use-lowdb.md](context/backend/architecture/decisions/2025-10-09-adr-0001-use-lowdb.md) - LowDB ADR
7. [frontend/architecture/decisions/2025-10-11-adr-0001-use-zustand-for-state-management.md](context/frontend/architecture/decisions/2025-10-11-adr-0001-use-zustand-for-state-management.md) - Zustand ADR

### 🏷️ Semantic Search Keywords

**By Technology**:

-   `questdb` - Time-series database documentation
-   `react` - Frontend React components and guides
-   `express` - Node.js API services
-   `python` - ML pipeline and analytics
-   `docker` - Container orchestration
-   `prometheus` - Monitoring and metrics
-   `plantuml` - Architecture diagrams
-   `websocket` - Real-time communication
-   `telegram` - TP Capital integration
-   `profitdll` - Market data capture (Windows DLL)

**By Functionality**:

-   `real-time`, `streaming`, `live-feed` - Real-time data processing
-   `trading`, `orders`, `positions`, `risk-management` - Trading operations
-   `ml`, `machine-learning`, `backtesting`, `signals` - Analytics and ML
-   `deployment`, `monitoring`, `incidents`, `runbooks` - Operations
-   `optimization`, `performance`, `lazy-loading`, `bundle` - Performance

**By Domain**:

-   `backend` - Backend services, APIs, data (45 files)
-   `frontend` - React dashboard, UI components (28 files)
-   `ops` - Operations, deployment, monitoring (36 files)
-   `shared` - Cross-cutting concerns, templates (30 files)

### 📖 Glossary Reference

See [glossary.md](context/glossary.md) for complete technical terminology.

**Critical terms for AI context**:

-   **ProfitDLL**: 64-bit Windows DLL for market data capture (Nelogica)
-   **QuestDB**: Time-series database for trading signals and logs
-   **LowDB**: JSON file-based database (MVP, migrating to PostgreSQL)
-   **Idea Bank**: System for managing trading ideas and research
-   **TP Capital**: Telegram signal ingestion service
-   **Dashboard**: React 18 frontend application (port 3103)
-   **Docusaurus**: Documentation platform (port 3004)
-   **ADR**: Architecture Decision Record
-   **PRD**: Product Requirements Document
-   **Runbook**: Operational procedure document

### 🎯 Document Classification

**By Type** (use `type:` frontmatter field):

-   `guide` - Implementation instructions (25+ guides)
-   `reference` - Technical specifications (40+ references)
-   `adr` - Architecture decisions (6 ADRs)
-   `prd` - Product requirements (12 PRDs)
-   `index` - Navigation hubs (15+ indices)
-   `feature` - Feature specifications (9 features)
-   `runbook` - Operational procedures
-   `overview` - High-level summaries

**By Domain** (use `domain:` frontmatter field):

-   `backend` - Backend services, APIs, data
-   `frontend` - UI, React components, features
-   `ops` - Operations, deployment, monitoring
-   `shared` - Cross-cutting concerns, templates

### 🤖 AI-Specific Resources

-   **[AI-NAVIGATION-GUIDE.md](AI-NAVIGATION-GUIDE.md)** - Comprehensive AI navigation guide with intent-based discovery
-   **[DOCUMENTATION-STANDARD.md](DOCUMENTATION-STANDARD.md)** - Frontmatter schema and documentation rules
-   **[DIRECTORY-STRUCTURE.md](DIRECTORY-STRUCTURE.md)** - Complete project structure with descriptions
-   **[glossary.md](context/glossary.md)** - Technical terminology and acronyms
-   **`spec/openapi.yaml`** - OpenAPI specification (25+ endpoints)
-   **[spec/asyncapi.yaml](spec/asyncapi.yaml)** - AsyncAPI specification (15+ channels)

### 📊 Quick Statistics

-   **Total documents**: 195+ markdown files (100% with complete frontmatter)
-   **Domains**: 4 (backend, frontend, ops, shared)
-   **Document types**: 11 types
-   **Languages**: PT (primary) + EN (PRD translations)
-   **Diagrams**: 19 PlantUML architecture diagrams (validated)
-   **API endpoints**: 25+ REST endpoints, 15+ WebSocket channels
-   **Services**: 6 backend APIs, 1 frontend app, 1 documentation platform
-   **Documentation Health**: Grade B+ (85/100) - Improved from D (62.6/100)
-   **Link Validation**: Automated via GitHub Actions (see badge in root README.md)
-   **Last Complete Review**: 2025-10-17 (5-phase documentation review)

### ✅ Documentation Quality

**Recent Improvements** (October 2025):

-   ✅ 100% frontmatter compliance (195/195 files)
-   ✅ AI-optimized navigation guide created
-   ✅ Domain READMEs enhanced with comprehensive indices
-   ✅ Glossary expanded (15 → 50+ terms)
-   ✅ Validation tools implemented (4 Python scripts)
-   ✅ Reports organized (22 archived, 5 active)
-   ✅ Docusaurus build passing with no errors
-   ✅ PlantUML diagrams validated (19 diagrams)
-   ✅ Automated link validation in CI/CD (GitHub Actions workflow)
-   ℹ️ PlantUML offline mode available via `PLANTUML_BASE_URL` (see diagrams guide)
-   ⚠️ 27 broken links remaining (down from 49 - 45% reduction, automated validation active)

**See**: [2025-10-17-documentation-review-complete.md](reports/2025-10-17-documentation-review-complete.md) for complete review report.

---

## 🎯 Quick Navigation by Area

### 📁 Structure & Organization

-   **[DIRECTORY-STRUCTURE.md](DIRECTORY-STRUCTURE.md)** - Complete guide to all project folders
    -   Backend APIs (6 services: library, tp-capital, b3-data, docs, launcher, firecrawl-proxy)
    -   Frontend Apps (React Dashboard - Port 3103)
    -   Docusaurus (Docusaurus)
    -   Infrastructure (Docker, monitoring, AI tools)
    -   Naming conventions and navigation

### 📐 Standards & Guides

-   **[DOCUMENTATION-STANDARD.md](DOCUMENTATION-STANDARD.md)** - Official documentation standard
    -   Mandatory YAML frontmatter
    -   PlantUML diagram requirements
    -   Available templates (ADR, PRD, RFC, Guide, Runbook)
    -   Documentation workflow
    -   Quality checklist

See [DOCUMENTATION-STANDARD.md](DOCUMENTATION-STANDARD.md) for complete reference and examples.

### 📦 Components & Technologies

-   **[INSTALLED-COMPONENTS.md](INSTALLED-COMPONENTS.md)** - Complete system inventory
    -   Runtime Environments (Node.js, Python, Docker)
    -   Dashboard (React, Vite, Tailwind, Zustand)
    -   Backend APIs (Express, QuestDB, LowDB)
    -   Documentation System (Docusaurus 3.9.1)
    -   Databases (QuestDB, TimescaleDB, Qdrant)
    -   Monitoring (Prometheus, Grafana, AlertManager)
    -   AI/ML Tools (Agno Agents, LangGraph, LlamaIndex)
    -   OpenSpec (Spec-driven development)
    -   Testing (Vitest, Jest, Cypress)

### 🔌 API Specifications

-   **[DOCSPECS-IMPLEMENTATION-GUIDE.md](DOCSPECS-IMPLEMENTATION-GUIDE.md)** - OpenSpec implementation
    -   OpenAPI 3.1 specification (25+ endpoints)
    -   AsyncAPI 3.0 specification (15+ channels)
    -   Docusaurus ingestion pipeline
    -   Spectral validation
    -   Frontend integration
    -   Automated workflows

---

## 📖 Document Taxonomy

| Document Type  | Where to Start                            | Notes                                         |
| -------------- | ----------------------------------------- | --------------------------------------------- |
| **Overview**   | `context/intro.md` (slug `/`)             | Context hub landing page                      |
| **Backend**    | `context/backend/README.md`               | Architecture, APIs, data schemas, migrations  |
| **Frontend**   | `context/frontend/README.md`              | Dashboard guides, feature specs, ADRs         |
| **Operations** | `context/ops/README.md`                   | Deployment, automation, monitoring, incidents |
| **Product**    | `context/shared/product/prd/README.md`    | PRDs/RFCs in PT with EN translations          |
| **Templates**  | `context/shared/tools/templates/index.md` | Templates for ADR/PRD/Guide/Runbook           |
| **Glossary**   | `context/glossary.md`                     | Shared vocabulary                             |
| **Structure**  | `DIRECTORY-STRUCTURE.md`                  | Complete directory guide                      |
| **Standards**  | `DOCUMENTATION-STANDARD.md`               | Official documentation standards              |
| **Components** | `INSTALLED-COMPONENTS.md`                 | Inventory of installed components             |
| **API Specs**  | `DOCSPECS-IMPLEMENTATION-GUIDE.md`        | OpenAPI/AsyncAPI implementation               |

---

## 📋 Standard Frontmatter

All Markdown files must include the frontmatter below (see [DOCUMENTATION-STANDARD.md](DOCUMENTATION-STANDARD.md) for complete reference):

```yaml
---
title: Document Title
sidebar_position: 1
tags: [category, topic, keywords]
domain: frontend | backend | ops | shared
type: guide | reference | adr | prd | rfc | runbook
summary: Brief one-line description
status: draft | active | deprecated
last_review: YYYY-MM-DD
---
```

**Required fields**: `title`, `sidebar_position`, `tags`, `domain`, `type`, `summary`, `status`, `last_review`.

Missing metadata is treated as technical debt—linting will flag when CI check is active.

---

## 🧩 Available Templates

Official templates are in `context/shared/tools/templates/`:

| Template           | When to Use                           | Location                                                                                                              |
| ------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **ADR**            | Architecture Decision Record          | [`template-adr.md`](context/shared/tools/templates/template-adr.md)                                                   |
| **ADR + PlantUML** | ADR with diagrams                     | [`template-adr-with-plantuml.md`](context/shared/tools/templates/template-adr-with-plantuml.md)                       |
| **PRD**            | Product Requirements Document         | [`template-prd.md`](context/shared/tools/templates/template-prd.md)                                                   |
| **RFC**            | Request for Comments                  | [`template-rfc.md`](context/shared/tools/templates/template-rfc.md)                                                   |
| **Runbook**        | Operational procedures                | [`template-runbook.md`](context/shared/tools/templates/template-runbook.md)                                           |
| **Guide**          | Implementation guide                  | [`template-guide.md`](context/shared/tools/templates/template-guide.md)                                               |
| **Technical Spec** | Technical specification with diagrams | [`template-technical-spec-with-plantuml.md`](context/shared/tools/templates/template-technical-spec-with-plantuml.md) |

**How to use:**

1. Copy the relevant template to the destination folder
2. Fill in all frontmatter fields
3. Update indices/tables that reference the new document
4. Add the document to `README.md` if it's a root document

---

## 🛠️ Local Development

### Start Docusaurus

```bash
# From repository root
cd docs/docusaurus
npm install

# Start dev server (port 3004, host 0.0.0.0)
# Note: 'prestart' runs 'scripts/sync-spec.js' automatically
# Note: Dashboard runs on port 3103 (not 3101)
npm run start -- --port 3004 --host 0.0.0.0

# Clear cache when restructuring navigation
npm run clear
```

### Via Docker

```bash
cd docs/docusaurus
docker compose up --build
```

### Important Notes

-   ✅ Dev server reloads Markdown/MDX changes automatically
-   ✅ Scripts `prestart`/`prebuild` run `scripts/sync-spec.js` to sync OpenSpec documentation
-   ⚠️ Use `npm run clear` when adding/removing `_category_.json` or moving files
-   ⚠️ If spec sync causes structure changes, run `npm run clear` to update navigation

---

## ✅ Checklist for Creating Documentation

### For Documents in `context/`

1. **Choose folder** (`backend`, `frontend`, `ops`, `shared`, `product`)
2. **Copy a template** from `shared/tools/templates/` if creating new artifact
3. **Fill frontmatter** (title, domain, type, summary, status, last_review)
4. **Add cross-links** to related documents (`See also` or tables)
5. **Update indices** (`README.md`, tables, or `_category_.json` as needed)
6. **Run locally** with `npm run start` and confirm sidebar + links
7. **Submit PR** referencing related ADRs/PRDs and include screenshots if there are MDX component changes

### For Documents in Root `docs/`

When adding a **new meta document (`.md`) in root `/docs`**, follow this process:

1. **Create document** with descriptive name in SCREAMING-KEBAB-CASE

    - Example: `NEW-FEATURE-GUIDE.md`, `API-INTEGRATION-GUIDE.md`

2. **Add entry to README.md** in TWO sections:

    **a) Table "Root Documentation (Meta-Documentation)":**

    ```markdown
    | **[NEW-FEATURE-GUIDE.md](NEW-FEATURE-GUIDE.md)** | 🎯 Brief document description | YYYY-MM-DD |
    ```

    **b) Section "Quick Navigation by Area":**

    ```markdown
    ### 🎯 Category Name

    -   **[NEW-FEATURE-GUIDE.md](NEW-FEATURE-GUIDE.md)** - Expanded description
        -   Key point 1
        -   Key point 2
        -   Key point 3
    ```

3. **Update structure tree** in "Context Structure" section:

    ```text
    docs/
    ├── README.md
    ├── DIRECTORY-STRUCTURE.md
    ├── DOCUMENTATION-STANDARD.md
    ├── INSTALLED-COMPONENTS.md
    ├── DOCSPECS-IMPLEMENTATION-GUIDE.md
    ├── NEW-FEATURE-GUIDE.md           # 🆕 Add here with icon
    ```

4. **Check taxonomy** and add entry to "Document Taxonomy" table if applicable

5. **Run locally** and verify all links

6. **Commit with descriptive message:**

    ```bash
    git add docs/README.md docs/NEW-FEATURE-GUIDE.md
    git commit -m "docs: add NEW-FEATURE-GUIDE.md to Docusaurus"
    ```

### ⚠️ IMPORTANT: README.md Maintenance

**README.md must ALWAYS be updated with all documents in root `/docs`.**

-   ✅ **Before creating new root document:** Check if similar document already exists
-   ✅ **When creating new root document:** Update README.md immediately
-   ✅ **When renaming root document:** Update all references in README.md
-   ✅ **When deprecating root document:** Mark as deprecated or remove from README.md

**Golden rule:** If it's in `/docs/*.md`, it must be indexed in `README.md`

### Validating Restored Documents

After restoring DOCUMENTATION-STANDARD.md and DIRECTORY-STRUCTURE.md:

1. Start Docusaurus: `cd docs/docusaurus && npm run start -- --port 3004 --host 0.0.0.0`
2. Verify both documents render correctly
3. Check all internal links work
4. Confirm frontmatter displays properly in Docusaurus
5. Test navigation from sidebar

---

## 🔍 Quality & Automation

### ✅ Already Implemented

-   ✅ **i18n Support**: PT/EN locales configured in `docusaurus.config.ts` (default: `pt`, locales: `['pt', 'en']`)
-   ✅ **PlantUML Diagrams**: `@akebifiky/remark-simple-plantuml` plugin integrated for automatic `.puml` rendering
-   ✅ **Mermaid Diagrams**: `@docusaurus/theme-mermaid` enabled for inline support
-   ✅ **Sidebar autogeneration**: `sidebars.ts` uses `{type: 'autogenerated'}` with `_category_.json` metadata
-   ✅ **Centralized index**: README.md as single portal for all documentation
-   ✅ **Category validation**: `_category_.json` reviewed for `context/shared/tools/docusaurus` after archiving tutorials (no stale `link.id` references)

### 🚧 Pending Tasks

-   [ ] **Frontmatter lint**: Validate required fields (title, tags, domain, type, summary, status, last_review) via CLI script
-   [x] **Broken link detection**: ✅ CI check active via ".github/workflows/docs-link-validation.yml" (Phase 8 complete)
-   [ ] **Translation diff automation**: Auto-detect PT → EN sync gaps in `product/prd/` and flag outdated translations
-   [ ] **Export AI**: Generate `index.json` machine-readable for LLM assistants with metadata + doc summaries
-   [ ] **README.md auto-sync**: Script to detect new `.md` files in `/docs` and suggest README.md update

Until complete automation is implemented, reviewers must manually verify metadata (`last_review`) and navigation updates.

> **Verify categories after moves**
>
> ```bash
> find docs/context/shared -name "_category_.json" -exec jq -r '.link?.id // empty' {} \;
> ```

---

## 📊 Documentation Statistics

### Root Documents

-   **Total:** 6 documents (README + 5 meta-docs, including AI navigation guide)
-   **Average size:** ~500-700 lines
-   **Coverage:** Structure, Standards, Components, API Specs

### Context Documents (`context/`)

-   **Domains:** 4 (backend, frontend, ops, shared)
-   **Templates:** 7 different types
-   **Languages:** PT (primary) + EN (translations)

### API Specifications (`spec/`)

-   **OpenAPI:** 25+ documented endpoints
-   **AsyncAPI:** 15+ WebSocket channels
-   **Schemas:** 50+ JSON schemas
-   **Examples:** 40+ code examples

---

## 🔗 Useful Links

### Official Documentation

-   **Docusaurus:** <https://docusaurus.io/docs>
-   **PlantUML:** <https://plantuml.com/>
-   **OpenAPI Spec:** <https://spec.openapis.org/oas/v3.1.0>
-   **AsyncAPI Spec:** <https://www.asyncapi.com/docs/specifications/v3.0.0>

### Internal Tools

-   **Docusaurus Dev:** <http://localhost:3004>
-   **Dashboard:** <http://localhost:3103>
-   **Prometheus:** <http://localhost:9090>
-   **Grafana:** <http://localhost:3000>

### Repository

-   **Issues:** <https://github.com/your-org/TradingSystem/issues>
-   **PRs:** <https://github.com/your-org/TradingSystem/pulls>
-   **Wiki:** <https://github.com/your-org/TradingSystem/wiki>

---

## 🤝 Contributing

### General Conventions

-   Follow root [`CONTRIBUTING.md`](../CONTRIBUTING.md) for branch/PR conventions
-   Use Conventional Commits with `docs:` scope when updating documentation
-   Mention responsible team (backend/frontend/ops/product) in PR description for visibility
-   When deprecating content, mark `status: deprecated` and add link to substitute document

### Review Process

1. **Self-review:** Check authoring checklist before submitting PR
2. **Peer review:** Another team member should review technical documentation
3. **Navigation check:** Confirm sidebars and indices are updated
4. **Link validation:** Verify all links (internal and external)
5. **Build test:** Confirm `npm run build` passes without errors

### Communication Channels

-   **Technical questions:** Open issue with `docs:` label
-   **Change proposals:** Use RFC template in `shared/tools/templates/`
-   **Quick discussions:** Docs & Ops channel on Slack/Discord

---

## 📝 README.md Maintenance

### When to Update This README

**✅ Always update when:**

-   Add new `.md` document in root `/docs`
-   Add new documentation category in `context/`
-   Create new templates in `shared/tools/templates/`
-   Change documented directory structure
-   Update authoring or review process
-   Add new tools to documentation stack

**⚠️ Check periodically:**

-   "Last updated" dates (quarterly)
-   Broken links (monthly)
-   Outdated statistics (quarterly)
-   Backlog section (after each sprint)

### Required README.md Structure

Keep these sections **always present** and **in this order**:

1. **Header** (title, description, metadata)
2. **Complete Index** (all root docs + structure)
3. **Quick Navigation by Area** (logical grouping)
4. **Document Taxonomy** (reference table)
5. **Standard Frontmatter** (metadata example)
6. **Available Templates** (template table)
7. **Local Development** (setup commands)
8. **Checklist for Creating Documentation** (step-by-step process)
9. **Quality & Automation** (status and backlog)
10. **Statistics** (documentation metrics)
11. **Useful Links** (external resources)
12. **Contributing** (conventions and process)
13. **README.md Maintenance** (this section)

### Validation Script (Future)

```bash
# Validate README.md is synced with files in /docs
npm run docs:validate-readme

# Auto-generate entry for new document
npm run docs:add-to-readme -- NEW-DOCUMENT.md

# Check broken links in README.md
npm run docs:check-links
```

---

## 📌 Version of this README

**Version:** 2.0.3  
**Last updated:** 2025-10-18  
**Last Complete Review:** 2025-10-17  
**Changelog:**

-   v2.0.3 (2025-10-18): Added documentation link validation workflow (`.github/workflows/docs-link-validation.yml`), updated `docs/context/ops/automated-code-quality.md` with section numbering
-   v2.0.2 (2025-10-17): Documentation review complete (Phases 1-5), added AI optimization, validated build and navigation
-   v2.0.1 (2025-10-17): Restored DOCUMENTATION-STANDARD.md and DIRECTORY-STRUCTURE.md from archive, updated ports and service names
-   v2.0.0 (2025-10-15): Complete restructuring as single documentation portal
-   v1.0.0 (2025-10-10): Initial documentation workspace version

**Next scheduled review:** 2026-01-17 (quarterly review)
