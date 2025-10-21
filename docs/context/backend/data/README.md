---
title: Data Architecture Hub
sidebar_position: 1
tags: [backend, data, storage, overview]
domain: backend
type: reference
summary: Data storage, persistence, and operations for TradingSystem
status: active
last_review: 2025-10-17
---

# Data Architecture Hub

## Current storage

| Area | Technology | Description |
|------|------------|-------------|
| Documentation / Ideas | LowDB (JSON) | Files `db/ideas.json` and `db/db.json` inside Idea Bank and Documentation APIs (MVP storage). |
| Signal ingestion | QuestDB (time-series) | `tp_capital_signals` and `tp_capital_signals_deleted` tables managed by the TP-Capital service via HTTP REST. |
| Market data | Parquet files | Historical tick/quote data written by the Data Capture service. |
| ML models | Binary files (`.pkl`, `.onnx`, etc.) | Planned location: `data/models/`. |
| Analytical layer | TimescaleDB (PostgreSQL 15) | Complementa o QuestDB para relatórios SQL, compressão/retention e integrações externas. |

## Folder layout

- `schemas/`  domain-specific schemas and table definitions.
  - `trading-core/` (Idea Bank, Documentation, QuestDB signal schemas) with ER diagrams and table specs.
  - `logging/`  observability data structures (placeholder).
- `migrations/`  strategy, checklists, and dated migration plans.
- `operations/`  backup/restore, retention, data quality procedures.
- `warehouse/`  layout and aggregation rules for Parquet/warehouse layers.
- `glossary.md`  data-specific terminology (TBD).

## Frontend integration touchpoints

- `Connections` page consumes `/telegram/bots` and `/telegram/channels` endpoints exposed by the TP-Capital service, which reads/writes QuestDB records.
- `TP CAPITAL | OPCOES` page queries `/signals` (QuestDB passthrough) and `/logs` (service log store) to render the production table and operational telemetry.
- Legacy Idea Bank and Documentation dashboards still rely on LowDB until the PostgreSQL migration closes (see `migrations/`).

## Planned evolution

- Introduzir e operar a camada **TimescaleDB** para consultas analíticas mantendo QuestDB como ingestão principal.
- Executar a migração **LowDB → PostgreSQL** para Idea Bank / Documentation, alinhando-se com a arquitetura dual QuestDB/TimescaleDB.
- Introduzir um lightweight **data warehouse** for aggregated metrics fed by QuestDB exports and Parquet backfills.
- Standardise ETL/ELT pipelines (document under `warehouse/`) and codify QuestDB retention automation in `operations/`.

> Each Markdown file should include front matter with `domain: backend` and the relevant `type` (e.g., `data-schema`, `data-migration`, `data-operations`).
