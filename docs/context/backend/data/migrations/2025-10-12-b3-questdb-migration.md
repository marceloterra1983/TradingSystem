---
title: B3 QuestDB Migration Plan
sidebar_position: 30
tags: [data, questdb, b3, backend, migration]
domain: backend
type: guide
summary: Migration steps to move the B3 data pipeline from file-based storage to QuestDB
status: active
last_review: 2025-10-17
---

# Migration Plan — B3 ➜ QuestDB

## Goals

- Replace JSON/CSV persistence used by the legacy B3 stack with QuestDB tables defined in [b3-market-data.md](../schemas/trading-core/tables/b3-market-data.md).
- Expose data to the TradingSystem backend/dashboards through shared APIs instead of the standalone `json_server.py` and Next.js app.
- Ensure no data loss during the cutover and maintain historical continuity.

## Prerequisites

- QuestDB instance running (shared `frontend/apps/tp-capital/infrastructure` service).
- Finalised table DDL executed (`b3_snapshots`, `b3_indicators`, `b3_vol_surface`, `b3_gamma_levels`, `b3_adjustments`, `b3_indicators_daily`, `b3_dxy_ticks`).
- Access credentials for GammaLevels and other external sources verified.

## Step-by-step

1. **Schema Deployment**
   - Apply DDL scripts to QuestDB (either via REST `/exec` or sqltool).
   - Version-control the SQL under `infrastructure/b3/sql/` (new folder).

2. **Historical Backfill**
   - Convert existing CSV/JSON files into QuestDB-friendly CSV or ILP streams.
   - Use `infrastructure/b3/scripts/migrate_to_questdb.py` (wraps QuestDB `/imp` endpoint) or custom loaders to import:
     - `data/processed/ajustes_b3.csv` → `b3_adjustments`
     - `indicadores_b3.csv` → `b3_indicators_daily`
     - `superficie_volatilidade_b3.csv` → `b3_vol_surface`
     - `dxy_coleta.csv` → `b3_dxy_ticks`
     - `ultimo_dado.json` snapshots → `b3_snapshots` + `b3_indicators`
     - `gamma.json` → `b3_gamma_levels`
   - Capture load statistics and validate row counts.

3. **Ingestion Refactor**
   - Update B3 collector modules to write directly to QuestDB (Python ILP client / helper functions building on `app/core/questdb_ingest.py`).
   - Maintain backward-compatible writes to JSON/CSV during shadow period (feature flag).
   - Introduce retry logic and telemetry (Prometheus counters) for ingestion success/failure.

4. **API Surface**
   - Implement FastAPI endpoints in `backend/api/b3` querying QuestDB.
   - Mirror legacy JSON contract initially (`/ultimo-dado`, `/gamma`, `/status`) for progressive rollout.
   - Add new aggregated endpoints tailored for the single TradingSystem dashboard page.

5. **Dashboard Integration**
   - Build the `B3` page in `frontend/apps/dashboard` consuming the new backend endpoints.
   - Add navigation entry and document the KPIs/visualizations.

6. **Cutover**
   - Schedule downtime window (or run active-active) to switch consumers from old API to new service.
   - Freeze legacy stack, validate real-time ingestion and dashboard displays.
   - Desativar `b3-dashboard`, `json_server.py` e proxies auxiliares (ex.: Traefik) assim que o novo fluxo estiver estável.

## Validation Checklist

- [ ] Row counts between CSV/JSON and QuestDB match (± tolerance).
- [ ] New endpoints return identical payloads to legacy API for sample dates.
- [ ] Prometheus alerting in place for ingestion failures and stale data.
- [ ] Dashboard smoke tests pass (CI + manual).
- [ ] Backups / exports configured for QuestDB to satisfy retention policies.

## Rollback

- Keep legacy file-based writes enabled for at least one full trading day.
- Snapshot QuestDB tables before cutover (`COPY TO` or nightly backup).
- If issues occur, point the dashboard back to the legacy API and replay missing data from CSV dumps.

## Ownership

- **Data Engineering:** Table creation, migration scripts, QuestDB ops.
- **Backend Team:** API implementation, ingestion refactor.
- **Frontend Team:** Dashboard page integration.
- **Ops:** Deployment pipeline updates, monitoring, incident response.
