---
title: Shared Documentation
sidebar_position: 1
tags: [shared, overview, templates, product, diagrams, tools]
domain: shared
type: overview
summary: Central hub for templates, product docs, diagrams, runbooks, and cross-cutting documentation
status: active
last_review: 2025-10-18
---

# Shared Documentation

> **Central hub** for cross-cutting assets: product requirements, templates, diagrams, runbooks, and tools.

## 🎯 Quick Navigation

| Need                      | Go to                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------ |
| **Product requirements**  | [product/prd/](product/prd/)                                                         |
| **Document templates**    | [tools/templates/](tools/templates/)                                                 |
| **Architecture diagrams** | [diagrams/](diagrams/)                                                               |
| **Operational runbooks**  | [runbooks/](runbooks/)                                                               |
| **Executive summaries**   | [summaries/](summaries/)                                                             |
| **API integration hub**   | [integrations/frontend-backend-api-hub.md](integrations/frontend-backend-api-hub.md) |

---

## 📋 Product Requirements

**Location**: `shared/product/prd/`

### Product Requirements Documents

**Location**: `shared/product/prd/`

| PRD                                                                                             | Title                     | Status | Tags                      |
| ----------------------------------------------------------------------------------------------- | ------------------------- | ------ | ------------------------- |
| [banco-ideias-prd.md](product/prd/banco-ideias-prd.md)                                       | Idea Bank                 | Active | `prd`, `idea-bank`  |
| [docusaurus-implementation-prd.md](product/prd/docusaurus-implementation-prd.md)             | Docusaurus Implementation | Active | `prd`, `docusaurus` |
| [tp-capital-telegram-connections-prd.md](product/prd/tp-capital-telegram-connections-prd.md) | Telegram Connections      | Active | `prd`, `telegram`   |
| [tp-capital-signal-table-prd.md](product/prd/tp-capital-signal-table-prd.md)                 | TP Capital Signal Table   | Active | `prd`, `tp-capital` |
| [monitoramento-prometheus-prd.md](product/prd/monitoramento-prometheus-prd.md)               | Prometheus Monitoring     | Active | `prd`, `monitoring` |

### RFCs (Requests for Comments)

**Location**: `shared/product/rfc/`

-   **PT**: [product/rfc/pt/](product/rfc/pt/) - Portuguese RFCs
-   **EN**: [product/rfc/en/](product/rfc/en/) - English RFCs

---

## 🧰 Templates

**Location**: `shared/tools/templates/`

| Template                                                                                             | Purpose                       | When to Use                               |
| ---------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------- |
| [template-adr.md](tools/templates/template-adr.md)                                                   | Architecture Decision Record  | Document architectural decisions          |
| [template-adr-with-plantuml.md](tools/templates/template-adr-with-plantuml.md)                       | ADR with diagrams             | ADR requiring visual architecture         |
| [template-prd.md](tools/templates/template-prd.md)                                                   | Product Requirements Document | Define product features and requirements  |
| [template-rfc.md](tools/templates/template-rfc.md)                                                   | Request for Comments          | Propose technical changes for discussion  |
| [template-runbook.md](tools/templates/template-runbook.md)                                           | Operational Runbook           | Document operational procedures           |
| [template-guide.md](tools/templates/template-guide.md)                                               | Implementation Guide          | Create step-by-step implementation guides |
| [template-technical-spec-with-plantuml.md](tools/templates/template-technical-spec-with-plantuml.md) | Technical Specification       | Document technical designs with diagrams  |

**Usage**: Copy template to destination folder, fill frontmatter, and update content.

---

## 🎨 Architecture Diagrams

**Location**: `shared/diagrams/`

### System Architecture

| Diagram                                                                           | Description                  | Format   |
| --------------------------------------------------------------------------------- | ---------------------------- | -------- |
| [system-architecture.puml](diagrams/system-architecture.puml)                     | Complete system architecture | PlantUML |
| [deployment-architecture.puml](diagrams/deployment-architecture.puml)             | Deployment topology          | PlantUML |
| [docker-container-architecture.puml](diagrams/docker-container-architecture.puml) | Container architecture       | PlantUML |

### Data Flow

| Diagram                                                                   | Description               | Format   |
| ------------------------------------------------------------------------- | ------------------------- | -------- |

### Sequence Diagrams

| Diagram                                                                                                   | Description                | Format   |
| --------------------------------------------------------------------------------------------------------- | -------------------------- | -------- |
| [sequence-telegram-bot-configuration.puml](diagrams/sequence-telegram-bot-configuration.puml)             | Telegram bot configuration | PlantUML |
| [firecrawl-proxy-sequence.puml](diagrams/firecrawl-proxy-sequence.puml)                                   | Firecrawl proxy sequence   | PlantUML |
| [agno-agents-signal-orchestration-sequence.puml](diagrams/agno-agents-signal-orchestration-sequence.puml) | Agno agents orchestration  | PlantUML |

### Component Diagrams

| Diagram                                                                                     | Description                  | Format   |
| ------------------------------------------------------------------------------------------- | ---------------------------- | -------- |
| [firecrawl-proxy-architecture.puml](diagrams/firecrawl-proxy-architecture.puml)             | Firecrawl proxy architecture | PlantUML |
| [agno-agents-component-architecture.puml](diagrams/agno-agents-component-architecture.puml) | Agno agents components       | PlantUML |
| [database-ui-tools-architecture.puml](diagrams/database-ui-tools-architecture.puml)         | Database UI tools            | PlantUML |

### State Machines

| Diagram                                                                               | Description            | Format   |
| ------------------------------------------------------------------------------------- | ---------------------- | -------- |
| [state-machine-order-lifecycle.puml](diagrams/state-machine-order-lifecycle.puml)     | Order lifecycle states | PlantUML |
| [state-machine-connection-states.puml](diagrams/state-machine-connection-states.puml) | Connection states      | PlantUML |

### Entity-Relationship

| Diagram                                             | Description    | Format   |
| --------------------------------------------------- | -------------- | -------- |

### ADR Diagrams

| Diagram                                                                         | Description           | Format   |
| ------------------------------------------------------------------------------- | --------------------- | -------- |
| [adr-0002-before-architecture.puml](diagrams/adr-0002-before-architecture.puml) | ADR-0002 before state | PlantUML |
| [adr-0002-after-architecture.puml](diagrams/adr-0002-after-architecture.puml)   | ADR-0002 after state  | PlantUML |

**Guide**: See [diagrams/plantuml-guide.md](diagrams/plantuml-guide.md) for PlantUML rendering instructions.

---

## 🔗 Integrations

**Location**: `shared/integrations/`

| Document                                                                              | Description                              | Tags                         |
| ------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------- |
| [frontend-backend-api-hub.md](integrations/frontend-backend-api-hub.md)               | API integration hub (Frontend ↔ Backend) | `api`, `integration`, `hub`  |
| [api-overview.md](integrations/api-overview.md)                                       | API overview                             | `api`, `overview`            |
| [frontend-backend-api-overview.puml](integrations/frontend-backend-api-overview.puml) | API overview diagram                     | `api`, `diagram`, `plantuml` |

---

## 📖 Runbooks

**Location**: `shared/runbooks/`

**Status**: Folder seeded, content migrating from `ops/`.

**Purpose**: Operational procedures with global scope (cross-domain runbooks).

---

## 📊 Executive Summaries

**Location**: `shared/summaries/`

| Summary                                                        | Description                  | Tags                              |
| -------------------------------------------------------------- | ---------------------------- | --------------------------------- |
| [backend-summary.md](summaries/backend-summary.md)             | Backend executive summary    | `backend`, `summary`, `overview`  |
| [frontend-summary.md](summaries/frontend-summary.md)           | Frontend executive summary   | `frontend`, `summary`, `overview` |
| [ops-summary.md](summaries/ops-summary.md)                     | Operations executive summary | `ops`, `summary`, `overview`      |
| [runbooks-adr-overview.md](summaries/runbooks-adr-overview.md) | Runbooks and ADRs overview   | `runbooks`, `adr`, `overview`     |

---

## 🛠️ Tools & Utilities

**Location**: `shared/tools/`

| Tool                                                             | Description                         | Tags                                    |
| ---------------------------------------------------------------- | ----------------------------------- | --------------------------------------- |
| [openspec-workflow.md](tools/openspec-workflow.md)               | OpenSpec workflow guide             | `openspec`, `workflow`, `specs`         |
| [version-management-guide.md](tools/version-management-guide.md) | Documentation version management    | `versioning`, `guide`, `documentation`  |
| [glm-readme.md](tools/glm-readme.md)                             | GLM CLI usage guide                 | `glm`, `claude`, `cli`                  |
| [search-guide.md](tools/search-guide.md)                         | Documentation search guide          | `search`, `guide`, `documentation`      |
| [COMMIT-CHECKLIST-v2.1.md](tools/COMMIT-CHECKLIST-v2.1.md)       | Commit checklist for reorganization | `commit`, `checklist`, `reorganization` |

### OpenSpec

**Location**: `shared/tools/openspec/`

-   [README.md](tools/openspec/README.md) - OpenSpec integration guide

### Docusaurus

**Location**: `shared/tools/docusaurus/`

-   [README.md](tools/docusaurus/README.md) - Docusaurus templates overview
-   [mdx-components-guide.mdx](tools/docusaurus/mdx-components-guide.mdx) - MDX components guide
-   [archive/docusaurus-examples/README.md](https://github.com/marceloterra/TradingSystem/blob/main/archive/docusaurus-examples/README.md) - Generic Docusaurus tutorials archived for reference

---

## 🏷️ Tags for Search

**Product**: `prd`, `rfc`, `product`, `requirements`, `roadmap`  
**Templates**: `template`, `adr`, `guide`, `runbook`, `technical-spec`  
**Diagrams**: `plantuml`, `architecture`, `sequence`, `component`, `state-machine`, `erd`  
**Tools**: `openspec`, `docusaurus`, `glm`, `search`, `versioning`  
**Integration**: `api`, `integration`, `frontend-backend`, `hub`

---

## 📋 Guidelines

1. **Product docs**: Create PRDs in PT (source of truth), then translate to EN
2. **Templates**: Use templates from `tools/templates/` for consistency
3. **Diagrams**: Store PlantUML source files in `diagrams/`, embed in docs
4. **Runbooks**: Global runbooks in `shared/runbooks/`, domain-specific in respective domains
5. **Summaries**: Keep executive summaries updated quarterly

---

## 🔗 See Also

### Domain Documentation

**Backend:**

-   [Backend Documentation Hub](../backend/README.md) - Backend services, APIs, and data schemas
-   [Backend Architecture](../backend/architecture/overview.md) - Backend architecture overview
-   [Backend ADRs](../backend/architecture/decisions/) - Backend architectural decisions
-   [Backend API Specifications](../backend/api/README.md) - OpenAPI specs and API contracts

**Frontend:**

-   [Frontend Documentation Hub](../frontend/README.md) - React dashboard and UI components
-   [Frontend Architecture](../frontend/architecture/overview.md) - Frontend architecture overview
-   [Frontend ADRs](../frontend/architecture/decisions/) - Frontend architectural decisions
-   [Frontend Features](../frontend/features/) - Feature specifications and implementations

**Operations:**

-   [Operations Hub](../ops/README.md) - Deployment, monitoring, and incident management
-   [Service Port Map](../ops/service-port-map.md) - Complete service port reference
-   [Environment Configuration](../ops/ENVIRONMENT-CONFIGURATION.md) - Centralized .env management
-   [Deployment Guides](../ops/deployment/) - Deployment procedures and checklists

### Key Shared Resources

**Product Documentation:**

-   [PRD Catalog](product/prd/README.md) - Product Requirements Documents
-   [PRD Files](product/prd/) - All PRDs in English
-   [RFC Catalog (PT)](product/rfc/pt/README.md) - Portuguese RFCs
-   [RFC Catalog (EN)](product/rfc/en/README.md) - English RFCs

**Templates:**

-   [ADR Template](tools/templates/template-adr.md) - Architecture Decision Record
-   [ADR with PlantUML](tools/templates/template-adr-with-plantuml.md) - ADR with diagrams
-   [PRD Template](tools/templates/template-prd.md) - Product Requirements Document
-   [RFC Template](tools/templates/template-rfc.md) - Request for Comments
-   [Runbook Template](tools/templates/template-runbook.md) - Operational Runbook
-   [Guide Template](tools/templates/template-guide.md) - Implementation Guide
-   [Technical Spec Template](tools/templates/template-technical-spec-with-plantuml.md) - Technical Specification

**Diagrams:**

-   [PlantUML Guide](diagrams/plantuml-guide.md) - How to create and render PlantUML diagrams
-   [System Architecture](diagrams/system-architecture.puml) - Complete system architecture
-   [Deployment Architecture](diagrams/deployment-architecture.puml) - Deployment topology
-   [Docker Container Architecture](diagrams/docker-container-architecture.puml) - Container architecture

**Integration:**

-   [Frontend ↔ Backend API Hub](integrations/frontend-backend-api-hub.md) - Complete API integration guide
-   [API Overview](integrations/api-overview.md) - API overview and patterns
-   [API Overview Diagram](integrations/frontend-backend-api-overview.puml) - Visual API map

**Tools:**

-   [OpenSpec Workflow](tools/openspec-workflow.md) - OpenSpec integration guide
-   [Version Management Guide](tools/version-management-guide.md) - Documentation versioning
-   [Search Guide](tools/search-guide.md) - Documentation search tips
-   [Docusaurus Tools](tools/docusaurus/) - Docusaurus templates and guides

### Executive Summaries

-   [Backend Summary](summaries/backend-summary.md) - Backend executive overview
-   [Frontend Summary](summaries/frontend-summary.md) - Frontend executive overview
-   [Ops Summary](summaries/ops-summary.md) - Operations executive overview
-   [Runbooks & ADRs Overview](summaries/runbooks-adr-overview.md) - Runbooks and ADRs summary

### External Resources

-   [PlantUML Documentation](https://plantuml.com/) - Diagram as code
-   [Markdown Guide](https://www.markdownguide.org/) - Markdown syntax reference
-   [Docusaurus Documentation](https://docusaurus.io/docs) - Documentation site generator
-   [OpenAPI Specification](https://swagger.io/specification/) - API specification standard
-   [Conventional Commits](https://www.conventionalcommits.org/) - Commit message convention

---

**Last updated**: 2025-10-18  
**Maintainers**: Docs & Product Guilds  
**Related**: [Backend Documentation](../backend/README.md), [Frontend Documentation](../frontend/README.md), [Operations Hub](../ops/README.md)

