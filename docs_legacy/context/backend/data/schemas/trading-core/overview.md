---
title: Database Schema Overview
sidebar_position: 10
tags: [data, schema, backend, overview]
domain: backend
type: reference
summary: Initial map of TradingSystem schemas and tables
status: active
last_review: "2025-10-17"
---

# Database Schema Overview

## 1. Idea Bank (LowDB)

File: `backend/api/idea-bank/db/ideas.json`

```json
{
  "ideas": [
    {
      "id": "1",
      "title": "...",
      "description": "...",
      "category": "documentacao",
      "priority": "high",
      "status": "new",
      "tags": ["ui", "ux"],
      "createdAt": "2025-10-08T23:00:00.000Z",
      "updatedAt": null
    }
  ]
}
```

Key fields:
- `category`: enum (`documentacao`, `coleta-dados`, `banco-dados`, `analise-dados`, `gestao-riscos`, `dashboard`).
- `priority`: enum (`low`, `medium`, `high`, `critical`).
- `status`: enum (`new`, `review`, `in-progress`, `completed`, `rejected`).

## 2. Documentation API (LowDB)

File: `backend/api/documentation-api/db/db.json`

Base structure:
```json
{
  "systems": [],
  "ideas": [],
  "links": [],
  "files": [],
  "nextId": 1,
  "nextLinkId": 1,
  "nextFileId": 1,
  "nextSystemId": 1
}
```

- `systems`: registered systems (id, name, shortName, port, status, color, icon).
- `ideas`: documentation ideas (same shape as Idea Bank).
- `files`: upload metadata (`idea_id`, `filename`, `original_name`, `mime_type`, `size`).

## 3. Trading data (Parquet)

- Directory layout: `data/parquet/<symbol>/<YYYY>/<MM>/<DD>.parquet` (planned).
- Columns: `timestamp`, `symbol`, `bid`, `ask`, `last`, `volume`, `aggressor`, etc.
- Document transformations em pipelines de dados conforme forem definidos.

## 4. TP-Capital (QuestDB)

- Tables: `tp_capital_signals` (active dataset) and `tp_capital_signals_deleted` (soft-deleted archive).
- Managed by `apps/tp-capital`, which exposes REST endpoints consumed by the dashboard (`/signals`, `/telegram/bots`, `/telegram/channels`).
- Partitioned by day with designated timestamp `ts`; primary filters: `channel`, `signal_type`, `ingested_at`.
- See [tp-capital-signals.md](tables/tp-capital-signals.md) for detailed column definitions and API shape.

## 5. Planned migration (PostgreSQL/Timescale)

- Target tables: `ideas`, `idea_tags`, `documentation_systems`, `documentation_files`.
- Consider normalisation: `idea_tags` (idea_id, tag), `idea_history` (audit trail).
- Publish an ADR when the final schema is approved; QuestDB remains dedicated to time-series datasets post-migration.

## Next steps

- [ ] Produce ER diagrams (Mermaid, Draw.io) for Idea Bank + Documentation.
- [ ] Define naming conventions (snake_case for SQL) across PostgreSQL and QuestDB exports.
- [ ] Document indexes and constraints during the PostgreSQL migration.
