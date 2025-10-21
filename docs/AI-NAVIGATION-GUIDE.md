---
title: AI Navigation Guide
sidebar_position: 4
tags: [ai, navigation, llm, index, semantic-search, quick-reference]
domain: shared
type: reference
summary: Comprehensive navigation guide optimized for AI agents and LLMs with semantic structure and context-aware discovery
status: active
last_review: 2025-10-17
---

# 🤖 AI Navigation Guide

> **Purpose**: Optimized entry point for AI agents, LLMs, and automated tooling to navigate TradingSystem documentation efficiently.

## 📋 Quick Context

**Project**: TradingSystem - Local trading platform with Windows-native core + Docker Compose auxiliaries  
**Architecture**: Microservices + Event-Driven + Domain-Driven Design  
**Stack**: C# (.NET 8) + Python 3.11 + React 18 + Node.js 20  
**Documentation**: 195+ markdown files across 4 domains with complete YAML frontmatter

---

## 🎯 Navigation by Intent

### "I need to understand the system architecture"

**Start here**:
1. [intro.md](context/intro.md) - System overview and service footprint
2. [backend/architecture/overview.md](context/backend/architecture/overview.md) - Backend architecture
3. [backend/architecture/service-map.md](context/backend/architecture/service-map.md) - Service dependencies and ports
4. [frontend/architecture/overview.md](context/frontend/architecture/overview.md) - Frontend architecture
5. [shared/diagrams/system-architecture.puml](context/shared/diagrams/system-architecture.puml) - Visual architecture

**Key concepts**: ProfitDLL integration, Windows-native services, Docker Compose stacks, microservices communication

### "I need to implement a new feature"

**Start here**:
1. [shared/tools/templates/](context/shared/tools/templates/) - Document templates (ADR, PRD, Guide)
2. [backend/guides/](context/backend/guides/) - Backend implementation guides
3. [frontend/guides/](context/frontend/guides/) - Frontend implementation guides
4. [DOCUMENTATION-STANDARD.md](DOCUMENTATION-STANDARD.md) - Documentation requirements

**Process**: PRD → ADR → Implementation Guide → Feature Spec

### "I need to understand data schemas"

**Start here**:
1. [backend/data/schemas/README.md](context/backend/data/schemas/README.md) - Schema index
2. [backend/data/schemas/trading-core/](context/backend/data/schemas/trading-core/) - Core trading tables
4. [backend/data/schemas/logging/](context/backend/data/schemas/logging/) - Logging schemas

**Technologies**: QuestDB (time-series), LowDB (MVP), PostgreSQL (planned migration)

### "I need to deploy or operate services"

**Start here**:
1. [ops/onboarding/QUICK-START-GUIDE.md](context/ops/onboarding/QUICK-START-GUIDE.md) - Quick start
2. [ops/deployment/](context/ops/deployment/) - Deployment playbooks
3. [ops/monitoring/](context/ops/monitoring/) - Monitoring setup
4. [ops/service-port-map.md](context/ops/service-port-map.md) - Port reference
5. [shared/runbooks/](context/shared/runbooks/) - Operational runbooks

**Key scripts**: `start-all-services.sh`, `start-all-stacks.sh`, `check-services.sh`

### "I need API documentation"

**Start here**:
1. [shared/integrations/frontend-backend-api-hub.md](context/shared/integrations/frontend-backend-api-hub.md) - API hub
2. [backend/api/](context/backend/api/) - API specifications
3. `spec/openapi.yaml` - OpenAPI spec (25+ endpoints)
4. [spec/asyncapi.yaml](spec/asyncapi.yaml) - AsyncAPI spec (15+ channels)

**Services**: Library API (3200), TP Capital (3200), B3 (3302), Documentation API (3400), Service Launcher (3500), Firecrawl Proxy (3600)

---

## 📚 Document Classification

### By Type

**Guides** (`type: guide`) - Implementation instructions
- Backend: 7 guides in `backend/guides/`
- Frontend: 10 guides in `frontend/guides/`
- Ops: 8 guides in `ops/onboarding/`, `ops/development/`
- Shared: 5 guides in `shared/tools/`

**References** (`type: reference`) - Technical specifications
- API docs, schemas, design systems, logging strategies
- 40+ reference documents across all domains

**ADRs** (`type: adr`) - Architecture decisions
- Backend: 2 ADRs in `backend/architecture/decisions/`
- Frontend: 4 ADRs in `frontend/architecture/decisions/`

**PRDs** (`type: prd`) - Product requirements
- 5 PRDs in `shared/product/prd/` (English primary language)

**Indices** (`type: index`) - Navigation hubs
- Domain READMEs, feature catalogues, schema indices

### By Domain

**Backend** (`domain: backend`) - 45 files
- Architecture, APIs, data schemas, guides, references
- Focus: .NET services, Python ML, Node.js APIs, QuestDB

**Frontend** (`domain: frontend`) - 28 files
- React dashboard, features, guides, architecture
- Focus: React 18, TypeScript, Tailwind, Zustand, shadcn/ui

**Ops** (`domain: ops`) - 36 files
- Deployment, monitoring, incidents, automation, onboarding
- Focus: Windows services, Docker Compose, Prometheus, Grafana

**Shared** (`domain: shared`) - 30 files
- Product docs, templates, diagrams, runbooks, tools
- Focus: Cross-cutting concerns, standards, templates

### By Technology

**Tags to search**:
- `questdb` - Time-series database docs
- `react` - Frontend React components
- `express` - Node.js API services
- `python` - ML pipeline and analytics
- `docker` - Container orchestration
- `prometheus` - Monitoring and metrics
- `plantuml` - Architecture diagrams
- `websocket` - Real-time communication
- `telegram` - TP Capital integration

---

## 🗂️ Domain Deep Dive

### Backend Domain

**Entry point**: [backend/README.md](context/backend/README.md)

**Key subdirectories**:
- `api/` - API specifications and service docs (6 services)
- `architecture/` - System design, service map, ADRs
- `data/` - Schemas, migrations, operations, guides
- `guides/` - Implementation guides for backend services
- `references/` - API styleguide, logging strategy

**Most important files**:
1. `architecture/overview.md` - Backend architecture overview
2. `architecture/service-map.md` - Service dependencies
3. `api/README.md` - API index
4. `data/schemas/README.md` - Schema index
5. `guides/guide-idea-bank-api.md` - Idea Bank implementation

### Frontend Domain

**Entry point**: [frontend/README.md](context/frontend/README.md)

**Key subdirectories**:
- `features/` - Feature specifications (9 features)
- `guides/` - Implementation guides (10 guides)
- `architecture/` - Frontend architecture and ADRs
- `api/` - Frontend API integration docs
- `references/` - Design system, component library

**Most important files**:
1. `features/customizable-layout.md` - Layout system
2. `features/feature-idea-bank.md` - Idea Bank feature
3. `guides/guide-documentation-dashboard.md` - Dashboard guide
4. `guides/dark-mode.md` - Dark mode implementation
5. `architecture/overview.md` - Frontend architecture

### Ops Domain

**Entry point**: [ops/README.md](context/ops/README.md)

**Key subdirectories**:
- `onboarding/` - Quick start guides (8 guides)
- `deployment/` - Deployment playbooks
- `monitoring/` - Monitoring setup
- `incidents/` - Incident runbooks
- `infrastructure/` - Infrastructure setup
- `troubleshooting/` - Common issues

**Most important files**:
1. `onboarding/QUICK-START-GUIDE.md` - Quick start
2. `service-port-map.md` - Port reference
3. `ENVIRONMENT-CONFIGURATION.md` - Environment setup
4. `deployment/windows-native.md` - Windows deployment
5. `monitoring/prometheus-setup.md` - Monitoring setup

### Shared Domain

**Entry point**: [shared/README.md](context/shared/README.md)

**Key subdirectories**:
- `product/prd/` - Product requirements (PT/EN)
- `tools/templates/` - Document templates
- `diagrams/` - PlantUML architecture diagrams
- `integrations/` - API hub and integration docs
- `runbooks/` - Operational runbooks
- `summaries/` - Executive summaries

**Most important files**:
1. `integrations/frontend-backend-api-hub.md` - API hub
2. `product/prd/banco-ideias-prd.md` - Idea Bank PRD
3. `diagrams/system-architecture.puml` - System diagram
4. `tools/templates/index.md` - Template index
5. `diagrams/plantuml-guide.md` - Diagram guide

---

## 🔍 Semantic Search Keywords

### By Functionality

**Real-time data**: `websocket`, `questdb`, `time-series`, `streaming`, `live-feed`  
**Trading**: `profitdll`, `orders`, `positions`, `risk-management`, `execution`  
**Data ingestion**: `telegram`, `tp-capital`, `b3`, `market-data`, `signals`  
**UI/UX**: `react`, `dashboard`, `customizable-layout`, `dark-mode`, `shadcn-ui`  
**Infrastructure**: `docker`, `prometheus`, `grafana`, `monitoring`, `deployment`  
**Documentation**: `docusaurus`, `plantuml`, `openapi`, `asyncapi`, `specs`

### By Concern

**Performance**: `optimization`, `lazy-loading`, `bundle`, `caching`, `latency`  
**Security**: `authentication`, `authorization`, `env-vars`, `secrets`, `risk-controls`  
**Quality**: `testing`, `validation`, `linting`, `code-quality`, `ci-cd`  
**Operations**: `deployment`, `monitoring`, `incidents`, `runbooks`, `automation`

---

## 📖 Glossary Quick Reference

See [glossary.md](context/glossary.md) for complete definitions.

**Critical terms**:
- **ProfitDLL**: 64-bit Windows DLL for market data capture (Nelogica)
- **QuestDB**: Time-series database for trading signals and logs
- **LowDB**: JSON file-based database (MVP, migrating to PostgreSQL)
- **Idea Bank**: System for managing trading ideas and research
- **TP Capital**: Telegram signal ingestion service
- **Dashboard**: React 18 frontend (port 3103)
- **Docusaurus**: Documentation platform (port 3004)

---

## 🛠️ Standards and Templates

**Documentation standard**: [DOCUMENTATION-STANDARD.md](DOCUMENTATION-STANDARD.md)  
**Directory structure**: [DIRECTORY-STRUCTURE.md](DIRECTORY-STRUCTURE.md)  
**Templates**: [shared/tools/templates/](context/shared/tools/templates/)

**Required frontmatter**:
```yaml
title: Document Title
sidebar_position: 1
tags: [array, of, tags]
domain: frontend|backend|ops|shared
type: guide|reference|adr|prd|rfc|runbook|overview|index|glossary|template|feature
summary: One-line description
status: draft|active|deprecated
last_review: YYYY-MM-DD
```

---

## 🚀 Quick Actions

**Find a specific document**: Use tags and domain filters  
**Understand a service**: Check `backend/api/` or `backend/guides/`  
**Learn a feature**: Check `frontend/features/`  
**Deploy a service**: Check `ops/deployment/` and `ops/onboarding/`  
**Create new doc**: Use templates in `shared/tools/templates/`  
**View diagrams**: Check `shared/diagrams/` for PlantUML files

---

## 📊 Documentation Statistics

- **Total files**: 195+ markdown documents
- **Domains**: 4 (backend, frontend, ops, shared)
- **Document types**: 11 (guide, reference, adr, prd, rfc, runbook, overview, index, glossary, template, feature)
- **Languages**: PT (primary) + EN (translations for PRDs)
- **Diagrams**: 20+ PlantUML architecture diagrams
- **API specs**: OpenAPI (25+ endpoints) + AsyncAPI (15+ channels)

---

**Last updated**: 2025-10-17  
**Maintained by**: Docs & Ops Guild  
**Related**: [README.md](README.md), [glossary.md](context/glossary.md), [DOCUMENTATION-STANDARD.md](DOCUMENTATION-STANDARD.md)
