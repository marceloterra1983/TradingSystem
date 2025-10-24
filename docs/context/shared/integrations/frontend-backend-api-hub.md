---
title: Frontend-Backend API Hub
sidebar_position: 10
tags: [frontend, backend, api, integration, shared]
domain: shared
type: guide
summary: Central map of how the dashboard consumes backend services and how to maintain the contracts that connect both sides
status: active
last_review: 2025-10-17
---

# Frontend-Backend API Hub

This guide consolidates the contracts that connect the React dashboard to the backend services. Use it to understand which APIs each screen depends on, where to update specifications, and how to keep the integration stable as new features are shipped.

## Quick reference

| Frontend surface | Backend service | Base URL (default) | Key endpoints | Spec / code |
|------------------|-----------------|--------------------|---------------|-------------|
| Workspace board (`frontend/dashboard/src/services/libraryService.ts#L4`) | Workspace API (`backend/api/workspace`) | `http://localhost:3200/api/items` | `GET/POST/PUT/DELETE /items` | [workspace.openapi.yaml](../../backend/api/specs/workspace.openapi.yaml) |
| B3 Market monitor (`frontend/dashboard/src/components/pages/B3MarketPage.tsx#L16`) | B3 API (`apps/b3-market-data`) | `http://localhost:3302` | `GET /overview`, `/adjustments`, `/gamma-levels`, `/dxy` | [B3 Integration Plan](../../backend/architecture/b3-integration-plan.md) |
| Web scraping (`frontend/dashboard/src/services/firecrawlService.ts`) | Firecrawl Proxy (`backend/api/firecrawl-proxy`) | `http://localhost:3600/api/v1` | `POST /scrape`, `POST /crawl`, `GET /crawl/:id` | [Firecrawl Proxy API](../../backend/api/firecrawl-proxy.md) |
| TP Capital signals (`frontend/dashboard/src/components/pages/TPCapitalOpcoesPage.tsx#L17`) | TP-Capital (`apps/tp-capital`) | `http://localhost:3200` | `GET /signals`, `GET /logs`, `DELETE /signals`, `GET /bots` | [TP Capital API Guide](../../backend/guides/guide-tp-capital.md) |
| Trading control (cards pending) (`frontend/dashboard/src/services/apiService.ts#L5`) | Trading Gateway API (planned .NET orchestration) | `http://localhost:8000` | `/api/v1/positions`, `/api/v1/orders`, `/api/v1/signals`, `/api/v1/risk/*` | Implementation planned in `backend/services/gateway` |

## Service notes

### Workspace API (port 3200)
- Frontend consome CRUD via `libraryService.ts` esperando envelope `ApiResponse<T>` com `success`, `data`, `count`.
- Contrato mantido em `docs/context/backend/api/specs/workspace.openapi.yaml`; atualizar OpenAPI + handlers ao alterar payloads.
- Persistência oficial em PostgreSQL (`postgresql://app_workspace:app_workspace_dev_password@localhost:5444/frontend_apps?schema=workspace`); métricas Prometheus expõem `tradingsystem_postgres_*`.
- CORS deve permitir origens do dashboard (`http://localhost:5173` em desenvolvimento) quando não operando em domínio unificado.
- Endpoint oficial: `/api/items` (alias legado removido).

### B3 API (port 3302)
- React Query polls `/overview` every 60 seconds and `/adjustments` every 120 seconds with `staleTime` and `placeholderData` to prevent flicker.
- Query parameters (`instrument`, `contract`, `from`, `to`) are validated with allowlists (`DI1`, `DDI`, `DOL`) and regex patterns (`[A-Z][0-9]{2}`) on both frontend and backend.
- Timestamps must be ISO 8601 UTC format; server runs with `TZ=UTC`.
- Observability: `/metrics` exports Prometheus histograms for QuestDB query duration (per endpoint), `/health?detailed=true` checks per-table readiness.
- Retry logic: QuestDB calls retry once with 100-300ms backoff on transient errors.

### Firecrawl Proxy API (port 3600)

**Purpose**: Provides validated, rate-limited access to the self-hosted Firecrawl service. Acts as an intermediary layer that adds request validation, abuse protection, consistent error handling, and observability before delegating to Firecrawl core.

**Architecture**: Node.js Express service with `express-validator`, `express-rate-limit`, `prom-client`, and `pino`. Proxies requests to Firecrawl core (port 3002) and exposes Prometheus metrics/health checks consumed by Service Launcher, Prometheus, and Grafana.

#### POST /api/v1/scrape
**Request**
- `url` (string, required): http/https URL, ≤ 2048 chars.
- `formats` (string[], optional): `markdown`, `html`, `rawHtml`, `links`, `screenshot`, `screenshot@fullPage`, `json`.
- `onlyMainContent` (boolean, optional, default `true`).
- `waitFor` (int, 0-30000), `timeout` (int, 1000-60000), `includeTags`/`excludeTags` (string[]).

**Response** (200)
```json
{
  "success": true,
  "data": {
    "markdown": "# Page Title...",
    "html": "<html>...</html>",
    "links": ["https://example.com/page"],
    "metadata": {
      "title": "Page Title",
      "description": "Summary",
      "fetchedAt": "2025-01-16T10:30:00.000Z"
    }
  }
}
```

**Validation errors** (400): Incorrect protocol, URL length > 2048, invalid format name, waitFor/timeout out of bounds, malformed tag arrays.

**Use cases**: Financial news scraping (InfoMoney, Valor, Bloomberg Brasil), investor relations pages, market commentary extraction.

#### POST /api/v1/crawl
**Request**
- `url` (string, required).
- `limit` (int 1-1000, default 10), `maxDepth` (int 1-10, default 2).
- `excludePaths` / `includePaths` (string[]), `scrapeOptions` (object mirroring `/scrape`), `allowBackwardLinks`, `allowExternalLinks`.

**Response** (200)
```json
{
  "success": true,
  "data": {
    "id": "crawl-abc123",
    "url": "http://localhost:3600/api/v1/crawl/crawl-abc123"
  }
}
```

**Validation errors** (400): Limit/depth out of range, invalid URL, malformed scrapeOptions.

**Use cases**: Regulatory document discovery (CVM/B3 circulars), market sentiment aggregation, company documentation crawls.

#### GET /api/v1/crawl/:id
**Purpose**: Poll crawl progress and retrieve results (supports pagination via `next`).

**Response** (200 – scraping)
```json
{
  "success": true,
  "data": {
    "status": "scraping",
    "total": 50,
    "completed": 25,
    "creditsUsed": 25,
    "expiresAt": "2025-01-17T10:30:00.000Z",
    "data": [],
    "next": null
  }
}
```

**Completed** responses include the `data` array of scraped pages (`url`, `title`, `markdown`, `metadata`) and optional `next` cursor for pagination. Status values: `scraping`, `completed`, `failed`.

**Errors**: 404 (job not found/expired), 503 (Firecrawl unavailable), 504 (timeout).

#### GET /health
Returns proxy status, uptime, and Firecrawl reachability (`reachable: true/false`). Used by Service Launcher and external monitors.

#### GET /metrics
Prometheus exposition including:
- `tradingsystem_http_requests_total`
- `tradingsystem_http_request_duration_seconds`
- `tradingsystem_firecrawl_scrape_total`
- `tradingsystem_firecrawl_scrape_duration_seconds`
- `tradingsystem_firecrawl_crawl_jobs_total`
- `tradingsystem_firecrawl_crawl_status_checks_total`

**Rate limiting**: 100 requests per minute per IP (60s window). Exceeding returns HTTP 429 with `Retry-After`. Metrics capture violations.

**Error handling**: Unified envelope `{ success: false, error, details? }`. Maps Firecrawl connection errors → 503, timeouts → 504, validation -> 400, not found -> 404.

**Observability**: Structured JSON logs (pino), Prometheus metrics, health check, and React Query polling for crawl status.

### Frontend Integration (Dashboard)
- **Service**: `firecrawlService.ts` wraps the proxy API through `getApiUrl('firecrawlProxy')` with safe defaults.
- **Hooks**: `useFirecrawl.ts` provides `useScrape`, `useCrawl`, `useCrawlStatus`, and `useFirecrawlHealth` built on React Query.
- **Page**: `FirecrawlPage.tsx` (Apps section) renders panels inside `CustomizablePageLayout` (`pageId="firecrawl"`).
- **Navigation**: Registered under Apps → `#/firecrawl`, uses CustomizablePageLayout drag-and-drop grid.
- **Validation**: `utils/validation.ts` mirrors backend rules for URL/format/limit/depth constraints.
- **State**: Crawl jobs persisted in `localStorage` (`firecrawl-jobs`) and synchronized via `firecrawl-job-created` events.
- **Polling**: `useCrawlStatus` refetches every 5 seconds while job status is `scraping`.

### TP Capital API (port 3200)
- Dashboard pages use optional `channel`, `type`, `search`, and `limit` query parameters when fetching `/signals`.
- `DELETE /signals` requires the `ingestedAt` payload; UI surfaces the action under admin tools.
- Ensure long polling does not starve QuestDB: prefer filters when exposing large datasets.
- Health signals: `/health` checks QuestDB connectivity, `/metrics` exposes ingestion counters.

### Trading Gateway API (planned, port 8000)
- `apiService.ts` already defines the client contract used by future trading controls (orders, positions, risk).
- The gateway must normalize responses to align with `getPositions`, `getOrders`, and `getRiskLimits` expectations.
- Document every new route in `docs/context/backend/api/` and mirror the updates here so the dashboard team can adjust quickly.

## Environment variables

> **Central rule**: Configure every variable in the **root** `.env`. Service-specific `.env` files (including `frontend/dashboard/.env`) are not allowed. Vite automatically reads `VITE_*` entries from the root file, so no extra steps are needed client side. See `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` for the full standard.

Example entries for the root `.env`:
```bash
# Shared API endpoints
VITE_API_BASE_URL=http://localhost:8000
VITE_B3_API_URL=http://localhost:3302
VITE_TP_CAPITAL_API_URL=http://localhost:3200
VITE_WORKSPACE_API_URL=http://localhost:3100

# Firecrawl Proxy configuration
FIRECRAWL_PROXY_PORT=3600
FIRECRAWL_PROXY_BASE_URL=http://localhost:3002
FIRECRAWL_PROXY_TIMEOUT=30000
FIRECRAWL_PROXY_RATE_LIMIT_WINDOW_MS=60000
FIRECRAWL_PROXY_RATE_LIMIT_MAX=100
FIRECRAWL_PROXY_LOG_LEVEL=info

# Dashboard access (Vite consumes these automatically)
VITE_FIRECRAWL_PROXY_URL=http://localhost:3600
```

Adjust the unified-domain override (`VITE_API_BASE_URL=http://tradingsystem.local`) as needed; do **not** duplicate settings in feature directories. The shared `CORS_ORIGIN` configuration is documented under SECURITY.

## Update workflow

1. Modify the backend handler or contract (OpenAPI specification under `docs/context/backend/api/`).
2. Regenerate or adjust frontend clients (`services/` modules) and confirm the expected response schema.
3. Update this hub (table + notes) so the change is visible to both teams.
4. Add or refresh integration tests (backend) and React Query mocks (frontend) before merging.

## Monitoring checklist

- Every API listed above implements `/health` and `/metrics`; expose them through the observability stack to alert on disconnects.
- QuestDB-backed services (`tp-capital`, `b3-market-data`) should log query duration; keep p95 under 500 ms.
- When adding a new service, align on log format (`timestamp`, `context.service`, `correlationId`) for cross-service tracing.

## Integration diagram

**Diagram source:** [frontend-backend-api-overview.puml](frontend-backend-api-overview.puml)

```plantuml
@startuml
skinparam componentStyle rectangle
skinparam wrapWidth 200
skinparam defaultFontName Courier
skinparam defaultFontSize 12

rectangle "Dashboard Frontend\nReact 18\nPort 3103" as Dashboard
component "Workspace API\nNode.js Express\nPort 3100" as Workspace
component "B3 API\nNode.js Express\nPort 3302" as B3
component "TP Capital API\nNode.js Express\nPort 3200" as TpCapital
component "Trading Gateway API\n.NET 8 (planned)\nPort 8000" as Gateway

component "Firecrawl Proxy API\nNode.js Express\nPort 3600" as FirecrawlProxy
package "Proxy Internals" {
  component "Validation" as Validation
  component "Rate Limiter\n100 req/min" as RateLimiter
  component "Metrics" as Metrics
  component "Logger" as Logger
}

component "Firecrawl Service\nDocker Compose\nPort 3002" as Firecrawl
package "Firecrawl Core" {
  component "API Service" as FirecrawlAPI
  component "Workers" as Workers
  component "Playwright" as Playwright
  database "Redis Queue" as Redis
  database "PostgreSQL" as Postgres
}

Dashboard --> Workspace : /api/items CRUD
Dashboard --> B3 : /overview\n/adjustments\n/gamma-levels
Dashboard --> TpCapital : /signals\n/logs\n/metrics
Dashboard ..> Gateway : /api/v1/* (planned)

Dashboard --> FirecrawlProxy : /api/v1/scrape\n/api/v1/crawl\n/api/v1/crawl/:id
FirecrawlProxy --> Validation : validate payloads
Validation --> RateLimiter : enforce quotas
RateLimiter --> Firecrawl : /v1/scrape\n/v1/crawl (validated)
Firecrawl --> FirecrawlAPI
FirecrawlAPI --> Workers
Workers --> Playwright
Workers --> Redis
FirecrawlAPI --> Postgres
FirecrawlProxy --> Metrics : record operations
FirecrawlProxy --> Logger : structured logs

note right of Gateway
  Future gateway consolida
  positions, orders e risk
  endpoints em uma única interface.
end note

note right of FirecrawlProxy
  Proxy adds:
  - request validation
  - 100 req/min rate limit
  - structured error handling
  - Prometheus metrics & logging
end note

note right of Firecrawl
  Firecrawl core stack (API, workers,
  Playwright browsers, Redis queue,
  PostgreSQL metadata) running via Docker Compose.
end note

@enduml
```
