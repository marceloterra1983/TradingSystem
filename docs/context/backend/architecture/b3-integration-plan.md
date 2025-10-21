---
title: B3 Market Data Integration Plan
sidebar_position: 30
tags: [backend, architecture, b3, integration, market-data]
domain: backend
type: guide
summary: Integration plan for B3 market data service with QuestDB and real-time streaming
status: active
last_review: 2025-10-17
---

# B3 Integration Plan

## Objectives

- Consolidate the standalone **B3** project inside the TradingSystem mono-repository.
- Standardize all B3 market data storage on **QuestDB** (shared with TP-Capital).
- Surface B3 insights through a **single page** in the new documentation dashboard.

## Current State Snapshot

- Separate Python codebase (`../b3/`) with API, cron jobs, a legacy dashboard and container tooling.
- Data persisted across local files and SQLite/PostgreSQL depending on the service.
- Docker stack expõe três serviços (`b3-sistema`, `b3-dashboard`, `b3-cron`) usando portas diretas no host.
- No shared schema/ingress pipeline with `frontend/apps/tp-capital/infrastructure` QuestDB instance.

## Phase 1 — Discovery & Alignment

1. Catalogue B3 services, entry points, dependencies and environment variables.
2. Document existing data models (orders, signals, market snapshots) and the current persistence layer.
3. Define integration boundaries with the TradingSystem backend (DDD contexts, messaging contracts).
4. Decide target directory structure (e.g. `backend/api/b3-*`, `infrastructure/b3/`).

**Deliverables:** architecture notes, inventory checklist, dependency graph.
See also: [`b3-service inventory`](./b3-inventory.md) for the current component snapshot and QuestDB gaps.

## Phase 2 — QuestDB Data Model

1. Translate B3 datasets into QuestDB tables (schema design, timestamp strategy, symbols).
2. Write migration scripts to seed historical data into QuestDB (via ILP, REST or CSV imports).
3. Establish ingestion adapters inside the B3 API/cron to write to QuestDB instead of local stores.
4. Define retention policies and partitioning to keep queries fast.

**Deliverables:** QuestDB schema DDL, migration scripts, ingestion adapters. See [`b3-market-data` schema](../data/schemas/trading-core/tables/b3-market-data.md) and [migration plan](../data/migrations/2025-10-12-b3-questdb-migration.md).

## Phase 3 — Backend Refactor

1. Move the B3 API code into `frontend/apps/b3-market-data` (Node 20 + Express).
2. Align logging, configuration, dependency injection with existing backend conventions.
3. Introduce a shared library/package for QuestDB access (reuse TP Capital/TanStack patterns where possible).
4. Re-implement cron jobs as either Python worker or scheduled job inside the new folder.
5. Provide REST endpoints that expose aggregates required by the dashboard page.

**Deliverables:** integrated backend services (`frontend/apps/b3-market-data`), QuestDB client module (`infrastructure/b3/app/core/questdb_ingest.py`), tests (unit + integration).

## Phase 4 — Dashboard Page

1. Design a single `B3` page in `frontend/apps/dashboard` (follow existing layout conventions).
2. Consume the new backend endpoints via React Query; display KPIs, charts and event timelines.
3. Add navigation entry, routing and feature documentation updates.
4. Implement lightweight smoke tests (Playwright or Vitest component tests) for the page.

**Deliverables:** dashboard page, API hooks, documentation updates.

## Phase 5 — Infrastructure & Tooling

1. Create `infrastructure/b3/docker-compose.yml` that reuses shared QuestDB network/volumes.
2. Update `compose.dev.yml` with a `b3` profile; ensure services share the `questdb` service.
3. Provide README and .env examples that align with TradingSystem conventions.
4. Substituir referências a Traefik por instruções genéricas de proxy reverso quando necessário (nginx/Caddy).

**Deliverables:** compose files, environment templates, updated runbooks.

## Phase 6 — Migration & Validation

1. Run dual-write period: B3 writes to QuestDB and legacy storage to ensure parity.
2. Validate data accuracy with automated checks and manual spot testing.
3. Execute end-to-end test plan (cron → QuestDB → API → dashboard).
4. Prepare rollback plan and monitoring alerts (Prometheus/Grafana dashboards).

**Deliverables:** migration checklist, validation report, monitoring dashboards.

## Phase 7 — Decommission & Follow-up

1. Remove the old B3 Docker stack and redundant infrastructure artifacts.
2. Archive or delete unused scripts (`start-api.bat`, standalone dashboards) once the new flow is stable.
3. Update CHANGELOG, architecture docs, and onboarding materials.
4. Schedule a post-integration review to capture lessons learned.

**Deliverables:** cleanup PRs, documentation updates, retrospective notes.
