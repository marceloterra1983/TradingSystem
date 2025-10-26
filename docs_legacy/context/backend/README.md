---
title: Backend Documentation
sidebar_position: 1
tags: [backend, overview, architecture, apis, data, guides]
domain: backend
type: overview
summary: Central reference for backend architecture, APIs, guides, and data with comprehensive index
status: active
last_review: "2025-10-18"
---

# Backend Documentation

> **Central hub** for backend services, APIs, data schemas, and implementation guides.

## 🎯 Quick Navigation

| Need                       | Go to                                                                |
| -------------------------- | -------------------------------------------------------------------- |
| **Architecture overview**  | [architecture/overview.md](architecture/overview.md)                 |
| **Service dependencies**   | [architecture/service-map.md](architecture/service-map.md)           |
| **API specifications**     | [api/README.md](api/README.md)                                       |
| **Data schemas**           | [data/schemas/README.md](data/schemas/README.md)                     |
| **Implementation guides**  | [guides/README.md](guides/README.md)                                 |
| **Architecture decisions** | [architecture/decisions/README.md](architecture/decisions/README.md) |

---

## 🏗️ Architecture

**Location**: `backend/architecture/`

### Core Documents

| Document                                                      | Description                                             | Tags                                           |
| ------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| [overview.md](architecture/overview.md)                       | High-level backend architecture overview                | `architecture`, `overview`, `services`         |
| [service-map.md](architecture/service-map.md)                 | Service dependencies, ports, and communication patterns | `architecture`, `services`, `map`, `reference` |
| [b3-integration-plan.md](architecture/b3-integration-plan.md) | B3 market data integration plan                         | `b3`, `integration`, `market-data`             |
| [b3-inventory.md](architecture/b3-inventory.md)               | B3 service component inventory                          | `b3`, `inventory`, `components`                |

### Architecture Decisions (ADRs)

**Location**: `backend/architecture/decisions/`

| ADR                                                                      | Title                              | Status | Date       |
| ------------------------------------------------------------------------ | ---------------------------------- | ------ | ---------- |
| [ADR-0001](architecture/decisions/2025-10-09-adr-0001-use-lowdb.md)      | Use LowDB for MVP Persistence      | Active | 2025-10-09 |
| [ADR-0002](architecture/decisions/2025-10-16-adr-0002-agno-framework.md) | Adopt Agno Framework for AI Agents | Active | 2025-10-16 |
| [OpenSpec Review](architecture/decisions/openspec-review-report.md)      | OpenSpec integration review        | Active | 2025-10-15 |

---

## 🔌 APIs

**Location**: `backend/api/`

### Active Services

| Service               | Port | Technology           | Purpose                                        | Documentation                                                       |
| --------------------- | ---- | -------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| **Library API**       | 3200 | Express + LowDB      | Idea Bank CRUD, documentação auxiliar          | [API Contracts](api/specs/workspace.openapi.yaml)                   |
| **TP Capital**        | 3200 | Express + QuestDB    | Telegram signal ingestion, `/signals` endpoint | [TP Capital Guide](guides/guide-tp-capital.md)                      |
| **B3 Market Data**    | 3302 | Express              | B3 market data service                         | [B3 Integration Plan](architecture/b3-integration-plan.md)          |
| **Documentation API** | 3400 | Express + FlexSearch | Documentation search and management            | [Implementation Plan](api/documentation-api/implementation-plan.md) |
| **Service Launcher**  | 3500 | Express              | Service orchestration and health checks        | [Launcher README](api/service-launcher/README.md)                   |
| **Firecrawl Proxy**   | 3600 | Express + Firecrawl  | Web scraping proxy service                     | [Firecrawl Proxy API](api/firecrawl-proxy.md)                       |

### API Specifications

| Spec                  | Format      | Endpoints    | Location                                                                             |
| --------------------- | ----------- | ------------ | ------------------------------------------------------------------------------------ |
| **Idea Bank API**     | OpenAPI 3.1 | 8 endpoints  | [api/idea-bank.openapi.yaml](api/idea-bank.openapi.yaml)                             |
| **Documentation API** | OpenAPI 3.1 | 12 endpoints | [api/specs/documentation-api.openapi.yaml](api/specs/documentation-api.openapi.yaml) |

---

## 💾 Data

**Location**: `backend/data/`

### Data Schemas

**Location**: `backend/data/schemas/`

| Domain           | Tables                                                | Technology  | Documentation                                                  |
| ---------------- | ----------------------------------------------------- | ----------- | -------------------------------------------------------------- |
| **Trading Core** | trades, positions, tp_capital_signals, b3_market_data | QuestDB     | [Trading Core Overview](data/schemas/trading-core/overview.md) |
| **Logging**      | service_logs, audit_logs                              | QuestDB     | [Logging Overview](data/schemas/logging/overview.md)           |

### Data Operations

**Location**: `backend/data/operations/`

| Document                                                                                   | Purpose                       | Tags                                     |
| ------------------------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------- |
| [backup-restore.md](data/operations/backup-restore.md)                                     | Backup and restore procedures | `backup`, `restore`, `operations`        |
| [retention-policy.md](data/operations/retention-policy.md)                                 | Data retention policies       | `retention`, `policy`, `data-management` |
| [questdb-timescaledb-dual-storage.md](data/operations/questdb-timescaledb-dual-storage.md) | Dual storage strategy         | `questdb`, `timescaledb`, `strategy`     |
| [data-quality-runbook.md](data/operations/data-quality-runbook.md)                         | Data quality procedures       | `data-quality`, `runbook`, `operations`  |

### Data Migrations

**Location**: `backend/data/migrations/`

| Migration                                                                                | Description                   | Status   |
| ---------------------------------------------------------------------------------------- | ----------------------------- | -------- |
| [strategy.md](data/migrations/strategy.md)                                               | Migration strategy overview   | Active   |
| [2025-10-12-b3-questdb-migration.md](data/migrations/2025-10-12-b3-questdb-migration.md) | B3 to QuestDB migration       | Complete |
| [2025-11-01-migration-plan.md](data/migrations/2025-11-01-migration-plan.md)             | LowDB to PostgreSQL migration | Planned  |
| [checklist.md](data/migrations/checklist.md)                                             | Migration checklist template  | Active   |

---

## 📖 Guides

**Location**: `backend/guides/`

| Guide                                                           | Service           | Technology           | Status |
| --------------------------------------------------------------- | ----------------- | -------------------- | ------ |
| [guide-idea-bank-api.md](guides/guide-idea-bank-api.md)         | Idea Bank API     | Express + LowDB      | Active |
| [guide-documentation-api.md](guides/guide-documentation-api.md) | Documentation API | Express + FlexSearch | Active |
| [DOCSAPI-QUICK-START.md](guides/DOCSAPI-QUICK-START.md)         | Documentation API | Quick start          | Active |
| [agno-agents-guide.md](guides/agno-agents-guide.md)             | Agno Agents       | Python + Agno        | Active |
| [gemini-installation-wsl.md](guides/gemini-installation-wsl.md) | Gemini setup      | WSL                  | Active |
| [buildkit-guide.md](guides/buildkit-guide.md)                   | Docker BuildKit   | Docker               | Active |

---

## 📚 References

**Location**: `backend/references/`

| Reference                                             | Purpose                       | Tags                                   |
| ----------------------------------------------------- | ----------------------------- | -------------------------------------- |
| [api-styleguide.md](references/api-styleguide.md)     | API design standards          | `api`, `standards`, `styleguide`       |
| [logging-strategy.md](references/logging-strategy.md) | Logging strategy and patterns | `logging`, `strategy`, `observability` |

---

## 🚀 Quick Start

### Node.js APIs

```bash
# Library API (Idea Bank)
cd backend/api/workspace
npm install
cp .env.example .env
npm start

# Documentation API
cd backend/api/documentation-api
npm install
npm start
```

### Core Services (Planned)

```powershell
# Data Capture (.NET 8 + ProfitDLL)
cd backend/services/data-capture
dotnet run

# Order Manager (.NET 8)
cd backend/services/order-manager
dotnet run

```

---

## 🔗 See Also

### Cross-Domain Integration

**Frontend Integration:**

-   [Frontend Documentation Hub](../frontend/README.md) - React dashboard consuming backend APIs
-   [API Integration Guide](../shared/integrations/frontend-backend-api-hub.md) - Complete API integration patterns
-   [Idea Bank Feature](../frontend/features/feature-idea-bank.md) - Frontend consuming Library API (port 3200)
-   [TP Capital Signals Feature](../frontend/features/feature-tp-capital-signals.md) - Frontend consuming TP Capital API

**Operations:**

-   [Operations Hub](../ops/README.md) - Deployment, monitoring, and incident management
-   [Service Port Map](../ops/service-port-map.md) - Complete port reference for all services
-   [Environment Configuration](../ops/ENVIRONMENT-CONFIGURATION.md) - Centralized .env management
-   [Service Startup Guide](../ops/onboarding/START-SERVICES.md) - How to start all backend services

**Shared Resources:**

-   [Product Requirements (PRDs)](../shared/product/prd/) - Product specifications for backend features
-   [Architecture Diagrams](../shared/diagrams/) - System architecture visualizations
-   [Document Templates](../shared/tools/templates/) - ADR, RFC, and guide templates

### Key Backend Guides

**Implementation:**

-   [Idea Bank API Guide](guides/guide-idea-bank-api.md) - Complete implementation guide for Library API
-   [TP Capital Guide](guides/guide-tp-capital.md) - Telegram signal ingestion implementation
-   [Documentation API Guide](guides/guide-documentation-api.md) - Documentation search and management
-   [Agno Agents Guide](guides/agno-agents-guide.md) - AI agent implementation with Agno Framework

**Data & Schemas:**

-   [Trading Core Schema Overview](data/schemas/trading-core/overview.md) - QuestDB trading schemas
-   [Data Quality Runbook](data/operations/data-quality-runbook.md) - Data quality procedures
-   [Backup & Restore Guide](data/operations/backup-restore.md) - Database backup procedures

**Architecture Decisions:**

-   [ADR-0001: Use LowDB for MVP](architecture/decisions/2025-10-09-adr-0001-use-lowdb.md) - Persistence strategy
-   [ADR-0002: Adopt Agno Framework](architecture/decisions/2025-10-16-adr-0002-agno-framework.md) - AI agent framework

### External Resources

-   [Express.js Documentation](https://expressjs.com/) - Node.js web framework
-   [QuestDB Documentation](https://questdb.io/docs/) - Time-series database
-   [TimescaleDB Documentation](https://docs.timescale.com/) - PostgreSQL extension for time-series
-   [.NET 8 Documentation](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8) - Core trading services

---

## 🏷️ Tags for Search

**Architecture**: `architecture`, `services`, `microservices`, `event-driven`, `ddd`
**APIs**: `express`, `rest`, `websocket`, `openapi`, `asyncapi`
**Data**: `questdb`, `lowdb`, `postgresql`, `timescaledb`, `schemas`, `migrations`
**Technologies**: `dotnet`, `python`, `nodejs`, `profitdll`, `ml`
**Operations**: `deployment`, `monitoring`, `backup`, `restore`, `data-quality`

---

## 📋 Guidelines

1. **Architecture decisions**: Record as ADRs in `architecture/decisions/`
2. **API changes**: Update OpenAPI specs and guides
3. **Data schemas**: Document in `data/schemas/` with migration plans
4. **New services**: Use [NEW-SERVICE-TEMPLATE.md](NEW-SERVICE-TEMPLATE.md)
5. **Guides**: Keep implementation guides updated with code changes

---

**Last updated**: 2025-10-18
**Maintainers**: Backend Guild
**Related**: [Frontend Documentation](../frontend/README.md) | [Operations Hub](../ops/README.md) | [Shared Resources](../shared/README.md)

