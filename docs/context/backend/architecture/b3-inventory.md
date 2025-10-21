---
title: B3 Service Inventory
sidebar_position: 40
tags: [backend, architecture, b3, inventory, components]
domain: backend
type: reference
summary: Complete inventory of B3 market data service components, endpoints, and infrastructure
status: active
last_review: 2025-10-17
---

# B3 Service Inventory

## Overview

> **Status:** Legacy stack removed — documentation mantida apenas para referência histórica.

- **Purpose:** Collects and publishes Brazilian B3 market data plus GammaLevels analytics.
- **Current Runtime:** Python 3.11 stack with custom scrapers (Playwright/Selenium/BeautifulSoup).
- **Deployment:** (Removido) Standalone Docker Compose stack (`infrastructure/b3/docker-compose.yml`) executava:
  - `b3-sistema` (API + data processing, exposed on `8082`)
  - `b3-cron` (scheduler for collectors)
  - `b3-dashboard` (Next.js 15 UI)
  - Supporting infrastructure: Redis, PostgreSQL (Evolution API).
- **Storage:** Local JSON/CSV files under `/app/data/processed`, cached via Redis; no QuestDB integration yet.

## Code Layout Highlights

| Path | Description |
|------|-------------|
| `app/core/` | Configuration, logging, cache, scheduler, storage helpers (file-based). |
| `app/modules/` | Individual collectors (ajuste B3, indicadores, superfície de volatilidade, DXY, GammaLevels). |
| `app/facades/` | Facade layer to orchestrate module execution. |
| `json_server.py` | HTTP server exposing `/ultimo-dado`, `/gamma`, CSV/HTML assets. |
| `gammalevels/` | Data + scripts specific to GammaLevels (requires credentials). |
| `scripts/` | Maintenance and collection scripts (manual runs, utilities). |
| `b3-dashboard/` | Next.js 15 frontend (separate dockerized service today). |

## Data Flow (Current)

1. Cron jobs trigger collectors that scrape external sources and write results to JSON/CSV under `data/processed/`.
2. Optional GammaLevels integration downloads additional analytics using stored credentials.
3. `json_server.py` serves the processed data via HTTP; Redis provides short-lived caching (default 5 min).
4. The standalone B3 dashboard consumes the JSON endpoints to render charts/tables.

## External Dependencies

- **QuestDB:** **Not utilized today** — target datastore for integration.
- **Redis:** Cache layer for HTTP server (configured via `app/core/cache.py`).
- **PostgreSQL:** Only for Evolution API sidecar, not for B3 data itself.
- **GammaLevels Credentials:** Supplied through `env.example` for analytics scraping.
- **Reverse Proxy (opcional):** Utilize nginx/Caddy na borda quando precisar publicar serviços externamente.

## Environment & Configuration

- `env.example` defines GammaLevels credentials, logging levels, cleanup toggles, retention window, timezone, optional Firecrawl API key.
- Runtime expects directories:
  - `/app/data/processed/ultimo_dado.json`, `gamma.json`, CSV exports, `dashboard.html`.
  - `/app/log/` for log rotation.
- Telemetry/health:
  - `/status` endpoint returns metadata.
  - Docker healthcheck uses `/status`.

## QuestDB Integration Targets

| Dataset | Current Storage | QuestDB Target | Notes |
|---------|-----------------|----------------|-------|
| Último dado (market snapshot) | `ultimo_dado.json` | `b3_snapshots` table keyed by timestamp + symbol | Replace JSON writes with ILP inserts; expose API via TradingSystem backend. |
| GammaLevels analytics | `gamma.json` | `b3_gamma_levels` | Need schema for strikes, exposure, neutral levels; handle credentials securely. |
| CSV exports (ajustes, indicadores, superfície, DXY) | CSV per module | Dedicated tables (`b3_adjustments`, `b3_indicators`, etc.) | Determine partitioning (e.g., `symbol`, `date`). |
| Cron metadata/logs | Text logs | `b3_jobs` (optional) | Track collector runs and failures for observability. |

**Gaps**
- QuestDB ingestion helper (`app/core/questdb_ingest.py`) needs to be hardened and monitored in production.
- Dashboard expects JSON/CSV files; new dashboard page must call TradingSystem APIs backed by QuestDB queries.
- Alerts/monitoring for collectors not wired into Prometheus/Grafana stack.

## Integration Considerations

1. **Backend Migration**
   - Move core services into `backend/api/b3-*` modules.
   - Introduce QuestDB client library (reuse `frontend/apps/tp-capital/src/questdbClient.ts` ideas translated to Node).
   - Replace `json_server.py` with the shared Express service (`frontend/apps/b3-market-data`).

2. **Dashboard Consolidation**
   - Retire `b3-dashboard` Next.js app.
 - Deliver a single page in `frontend/apps/dashboard` using shared layout/components.
  - Provide React Query hooks hitting the new `b3-market-data` API endpoints.

3. **Infrastructure Alignment**
   - Add `b3` profile to `compose.dev.yml`, referencing shared QuestDB service.
   - Remover proxies redundantes do stack B3; usar portas diretas ou reverse proxy externo quando necessário.
   - Define runbooks/env templates consistent with existing infra docs.

4. **Data Migration**
   - Build import scripts to backfill existing JSON/CSV data into QuestDB.
   - Validate parity between old file outputs and new queries.

5. **Security & Secrets**
   - Store GammaLevels credentials via `.env` + secret management (not committed).
   - Ensure QuestDB has appropriate auth if exposed outside local dev.

## Next Steps (Phase 1 Deliverables)

- [ ] Confirm ownership of each collector module and contact points.
- [ ] Inventory external endpoints used for scraping (rate limits, auth).
- [ ] Document QuestDB schema proposal and data retention policy.
- [ ] Draft migration checklist for replacing file writes with QuestDB ingestion (see `infrastructure/b3/scripts/migrate_to_questdb.py`).
- [ ] Evaluate effort to convert cron jobs into reusable scheduler within TradingSystem.
