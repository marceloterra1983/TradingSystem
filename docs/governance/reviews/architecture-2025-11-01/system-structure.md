---
title: "System Structure Assessment"
sidebar_position: 1
description: "Inventory of TradingSystem components, layering, and alignment with Clean Architecture and DDD principles."
---

## Component Hierarchy

```
TradingSystem/
├── Core Trading (Native Windows - PLANNED)
│   ├── data-capture (C# + ProfitDLL)
│   ├── order-manager (C# + Risk Engine)
│   └── analytics-pipeline (Python + ML)
│
├── Backend Services (Docker + Node.js)
│   ├── workspace-api (3200) → TimescaleDB
│   ├── tp-capital (4005) → TimescaleDB + Telegram
│   ├── documentation-api (3401) → FlexSearch + RAG Proxy
│   ├── service-launcher (3500) → Health orchestration
│   └── firecrawl-proxy (3600) → Firecrawl API
│
├── Frontend (React + Vite)
│   └── dashboard (3103) → Zustand + TanStack Query
│
├── Documentation (Docusaurus v3)
│   └── docs-hub (3400) → NGINX + Docusaurus
│
├── RAG Stack (Docker)
│   ├── ollama (11434) → GPU-accelerated LLM
│   ├── llamaindex-ingestion (8201) → Qdrant
│   ├── llamaindex-query (8202) → Qdrant
│   ├── rag-service (3402) → JWT proxy
│   └── rag-collections-service (3403) → File watcher
│
└── Infrastructure (Docker)
    ├── timescaledb (5432) → Centralized database
    ├── qdrant (6333) → Vector store
    ├── redis (6380) → RAG caching
    ├── prometheus (9090) → Metrics
    └── grafana (3001) → Dashboards
```

**Assessment**
- ✅ Clear layering with well-defined service boundaries.
- ✅ Microservices adhere to single-responsibility scope.
- ⚠️ Mixed deployment (Windows native + Docker) introduces operational complexity.
- ⚠️ Shared TimescaleDB instance increases coupling between services.

## Architectural Patterns Detected

### Clean Architecture (Layered)

```
Domain Layer → Entities, Value Objects, Aggregates
Application Layer → Use Cases, Commands, Queries
Infrastructure Layer → ProfitDLL, WebSocket, Databases
Presentation Layer → Controllers, APIs, React Components
```

**Assessment:** ✅ Well-defined in design documentation, but core trading services are still planned.

### Domain-Driven Design (DDD)

```
Aggregates: OrderAggregate, TradeAggregate, PositionAggregate
Value Objects: Price, Symbol, Quantity, Timestamp
Domain Events: OrderFilledEvent, SignalGeneratedEvent
Repositories: ITradeRepository, IOrderRepository
Ubiquitous Language: Trade, Order, Signal, Position, Risk
```

**Assessment:** ✅ Strong DDD foundation in documentation; ⚠️ implementation for core services is pending.
