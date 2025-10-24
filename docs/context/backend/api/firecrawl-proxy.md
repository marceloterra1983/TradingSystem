---
title: Firecrawl Proxy API Specification
sidebar_position: 30
tags: [api, firecrawl, web-scraping, proxy, integration]
domain: backend
type: reference
summary: Complete API specification for the Firecrawl Proxy service including endpoints, validation rules, use cases, and integration examples
status: active
last_review: "2025-10-17"
---

# Overview

The Firecrawl Proxy API is the hardened façade that TradingSystem exposes for all Firecrawl operations. It validates incoming payloads, enforces abuse protection, and enriches telemetry before delegating to the self-hosted Firecrawl core (Docker stack on port **3002**). The proxy itself is a Node.js Express service running on port **3600**, instrumented with prom-client metrics and pino structured logging.

**Highlights**
- Strong validation (`express-validator`) covering URL format, formats array, numeric ranges, and optional options objects.
- Rate limiting (`express-rate-limit`) capped at 100 requests per minute per IP with structured 429 responses and Prometheus counters.
- Unified error layer mapping Firecrawl connectivity issues to HTTP 503/504 and preserving upstream messages for 4xx/5xx API responses.
- Observability via `/metrics` (Prometheus) and JSON logs (pino), plus `/health` for Service Launcher and infra probes.
- Built for the TradingSystem dashboard (`firecrawlService.ts` + React Query hooks) but available to any internal client that follows the same contract.

**Dependencies**
- Firecrawl core stack (Docker Compose): API service, worker processes, Playwright browser, Redis queue, PostgreSQL metadata store.
- Centralised configuration in the **root** `.env` (see [Configuration](#configuration)).
- Prometheus/Grafana for metrics scraping and dashboarding.

# Architecture Diagram

Source: [firecrawl-proxy-architecture.puml](../../shared/diagrams/firecrawl-proxy-architecture.puml)

```plantuml
@startuml
!include ../../shared/diagrams/firecrawl-proxy-architecture.puml
@enduml
```

# Sequence Flow

Source: [firecrawl-proxy-sequence.puml](../../shared/diagrams/firecrawl-proxy-sequence.puml)

```plantuml
@startuml
!include ../../shared/diagrams/firecrawl-proxy-sequence.puml
@enduml
```

# API Endpoints

## GET `/health`
- **Purpose**: Lightweight readiness probe and upstream (Firecrawl core) reachability check.
- **Auth**: None (internal use only; exposed behind VPN/Service Launcher).

**Response (200)**
```json
{
  "success": true,
  "data": {
    "service": "firecrawl-proxy",
    "status": "ok",
    "firecrawl": {
      "reachable": true,
      "baseUrl": "http://localhost:3002"
    },
    "uptime": 125.34,
    "timestamp": "2025-01-16T10:30:00.000Z"
  }
}
```

**Failure modes**
- Upstream Firecrawl unavailable ⇒ `firecrawl.reachable: false` but HTTP **200** (caller decides severity).
- Internal errors follow the error envelope documented in [Error Handling](#error-handling).

---

## POST `/api/v1/scrape`
- **Purpose**: Scrape a single page and return the requested formats.
- **Content-Type**: `application/json`

| Field             | Type      | Required | Constraints / Notes                                                                 |
|-------------------|-----------|----------|--------------------------------------------------------------------------------------|
| `url`             | string    | ✓        | `http`/`https`, ≤ 2048 chars                                                        |
| `formats`         | string[]  |          | Allowed: `markdown`, `html`, `rawHtml`, `links`, `screenshot`, `screenshot@fullPage`, `json`. Default `['markdown']` |
| `onlyMainContent` | boolean   |          | Default `true`; removes nav/footers where possible                                  |
| `waitFor`         | integer   |          | 0–30000 (ms)                                                                        |
| `timeout`         | integer   |          | 1000–60000 (ms). Default `FIRECRAWL_PROXY_TIMEOUT`                                  |
| `includeTags`     | string[]  |          | Strings ≤ 2048 chars                                                                |
| `excludeTags`     | string[]  |          | Strings ≤ 2048 chars                                                                |

**Success (200)**
```json
{
  "success": true,
  "data": {
    "markdown": "# Ibovespa avança\n\nO índice B3...",
    "html": "<html>...</html>",
    "links": ["https://www.infomoney.com.br/mercados/"],
    "metadata": {
      "title": "Ibovespa avança",
      "description": "Resumo dos mercados",
      "fetchedAt": "2025-01-16T10:30:00.000Z"
    }
  }
}
```

**Validation error (400)**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "URL must be valid and use http/https",
      "path": "url",
      "location": "body"
    }
  ]
}
```

**Upstream failures**
- Firecrawl unreachable ⇒ 503 `{"success":false,"error":"Firecrawl service unavailable"}`
- Upstream timeout ⇒ 504 `{"success":false,"error":"Firecrawl request timed out"}`
- Rate limit hit ⇒ 429 (see [Rate Limiting](#rate-limiting)).

---

## POST `/api/v1/crawl`
- **Purpose**: Start a multi-page crawl job.
- **Content-Type**: `application/json`

| Field                | Type      | Required | Constraints / Notes                                             |
|----------------------|-----------|----------|------------------------------------------------------------------|
| `url`                | string    | ✓        | `http`/`https`, ≤ 2048 chars                                     |
| `limit`              | integer   |          | 1–1000 (default 10)                                             |
| `maxDepth`           | integer   |          | 1–10 (default 2)                                                |
| `excludePaths`       | string[]  |          | Glob-like patterns (each ≤ 2048 chars)                           |
| `includePaths`       | string[]  |          | Patterns to include (each ≤ 2048 chars)                          |
| `scrapeOptions`      | object    |          | Same schema as `/api/v1/scrape` body                             |
| `allowBackwardLinks` | boolean   |          | Default `false`                                                  |
| `allowExternalLinks` | boolean   |          | Default `false`                                                  |

**Success (200)**
```json
{
  "success": true,
  "data": {
    "id": "crawl-abc123",
    "url": "http://localhost:3600/api/v1/crawl/crawl-abc123"
  }
}
```

**Validation error (400)**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "limit must be between 1 and 1000",
      "path": "limit",
      "location": "body"
    }
  ]
}
```

**Upstream failure (503)**
```json
{
  "success": false,
  "error": "Firecrawl service unavailable"
}
```

---

## GET `/api/v1/crawl/:id`
- **Purpose**: Poll crawl progress and retrieve results (auto-paginated).
- **Path parameter**: `id` must be alphanumeric with hyphen/underscore, ≤ 100 chars.

**In-progress response (200)**
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

**Completed response (200)**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "total": 50,
    "completed": 50,
    "creditsUsed": 50,
    "expiresAt": "2025-01-17T10:30:00.000Z",
    "data": [
      {
        "url": "https://example.com/report.pdf",
        "title": "Quarterly Report",
        "markdown": "# Quarterly Report...",
        "metadata": {
          "contentType": "application/pdf"
        }
      }
    ],
    "next": "http://localhost:3600/api/v1/crawl/crawl-abc123?page=2"
  }
}
```

**Not found (404)**
```json
{
  "success": false,
  "error": "Route not found: GET /api/v1/crawl/crawl-unknown"
}
```

**Timeout (504)**
```json
{
  "success": false,
  "error": "Firecrawl request timed out"
}
```

---

## GET `/metrics`
- **Purpose**: Prometheus exposition endpoint (text format).
- **Auth**: None (scraped by Prometheus inside trusted network).

Metric families:
- `tradingsystem_http_requests_total{service,method,route,status_code}`
- `tradingsystem_http_request_duration_seconds_bucket{service,method,route,status_code,le}`
- `tradingsystem_firecrawl_scrape_total{service,status}`
- `tradingsystem_firecrawl_scrape_duration_seconds_bucket{service,status,le}`
- `tradingsystem_firecrawl_crawl_jobs_total{service,status}`
- `tradingsystem_firecrawl_crawl_status_checks_total{service,crawl_status}`

**Snippet**
```
# HELP tradingsystem_firecrawl_scrape_total Total Firecrawl scrape operations handled by proxy.
# TYPE tradingsystem_firecrawl_scrape_total counter
tradingsystem_firecrawl_scrape_total{service="firecrawl-proxy",status="success"} 124
tradingsystem_firecrawl_scrape_total{service="firecrawl-proxy",status="failure"} 3
```

# Validation Rules

| Field                | Validation Logic                                                                   | Error Message / Notes                                   |
|----------------------|-------------------------------------------------------------------------------------|----------------------------------------------------------|
| `url`                | Must exist, be non-empty, `isURL` (http/https), length ≤ 2048                      | "URL must be valid and use http/https"                  |
| `formats`            | Optional array, every element must be in allow-list                                | `Invalid format: ${value}`                              |
| `onlyMainContent`    | Optional boolean                                                                   | "onlyMainContent must be a boolean"                     |
| `waitFor`            | Optional integer 0–30000                                                           | "waitFor must be an integer between 0 and 30000"        |
| `timeout`            | Optional integer 1000–60000                                                        | "timeout must be between 1000 and 60000 milliseconds"   |
| `includeTags`/`excludeTags` | Optional string arrays; each string ≤ 2048                                   | "Array items must be strings" / "Array items exceed maximum length" |
| `limit`              | Optional integer 1–1000                                                            | "limit must be between 1 and 1000"                      |
| `maxDepth`           | Optional integer 1–10                                                              | "maxDepth must be between 1 and 10"                     |
| `excludePaths`/`includePaths` | Optional string arrays (≤ 2048 chars per item)                             | Same as tags                                             |
| `scrapeOptions`      | Optional object (non-null, non-array)                                              | "scrapeOptions must be an object"                       |
| `allowBackwardLinks` | Optional boolean                                                                   | "allowBackwardLinks must be a boolean"                  |
| `allowExternalLinks` | Optional boolean                                                                   | "allowExternalLinks must be a boolean"                  |
| `id` (path)          | Required, alphanumeric with `-_`, ≤ 100 chars                                      | "Crawl ID must be alphanumeric" / "Crawl ID exceeds maximum length" |

Validation mirrors `backend/api/firecrawl-proxy/src/middleware/validation.js` to keep frontend/app logic aligned.

## Rate Limiting
- **Policy**: 100 requests per minute per IP (configurable via `FIRECRAWL_PROXY_RATE_LIMIT_WINDOW_MS` / `_MAX`).
- **Exceeded response (429)**
```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "retryAfter": 60
}
```
- `Retry-After` header is set; Prometheus tracks violation counts for Grafana alerting.

## Error Handling

All error responses honour the envelope `{ success: false, error: string, details?: array }`.

| Scenario                 | HTTP Status | Payload Example / Notes                                                   |
|--------------------------|-------------|----------------------------------------------------------------------------|
| Validation failure       | 400         | See examples above (`error: "Validation failed"`, `details` array).       |
| Crawl ID not found       | 404         | `{ "success": false, "error": "Route not found: GET /api/v1/crawl/:id" }` |
| Rate limit exceeded      | 429         | Includes `retryAfter` integer (seconds).                                   |
| Firecrawl unavailable    | 503         | `{ "success": false, "error": "Firecrawl service unavailable" }`         |
| Firecrawl timeout        | 504         | `{ "success": false, "error": "Firecrawl request timed out" }`           |
| Upstream API error       | Upstream    | Proxy forwards original status + message from Firecrawl API.               |

## Use Cases

1. **Financial News Scraping** – Scheduled job hits `/api/v1/scrape` for InfoMoney/Valor/Bloomberg; results feed QuestDB + sentiment pipeline.
2. **Regulatory Documents (CVM/B3)** – `/api/v1/crawl` with filters to ingest circulars, poll status every 5s, archive PDFs in storage.
3. **Company Earnings Reports** – Scrape IR sections for markdown/raw HTML, parse tables for earnings analytics.
4. **Market Sentiment Aggregation** – Batch scrapes (Promise.all) across 10+ portals; aggregator handles 429 responses gracefully.

## Implementation Notes

### Quick Start
For rapid setup and testing, see the **[Quick Start guide](https://github.com/your-org/TradingSystem/blob/main/backend/api/firecrawl-proxy/README.md#quick-start)** in the implementation README.

### Production Deployment
For production deployment procedures including systemd service setup, PM2 configuration, and Docker deployment, see:
- **[Firecrawl Proxy - Production Deployment](https://github.com/your-org/TradingSystem/blob/main/backend/api/firecrawl-proxy/README.md#production-deployment)**
- **[Firecrawl Infrastructure - Production Deployment](https://github.com/your-org/TradingSystem/blob/main/tools/firecrawl/README.md#production-deployment)**

### Testing
The proxy includes comprehensive test suites:
- **Unit tests**: Validation middleware, rate limiter, error handling
- **Integration tests**: Full request/response cycle with mocked Firecrawl

See: **[Testing Guide](https://github.com/your-org/TradingSystem/blob/main/backend/api/firecrawl-proxy/README.md#testing)**

### Service Management
The proxy integrates with the TradingSystem service orchestration:
- Registered in `config/services-manifest.json`
- Monitored by Service Launcher (port 3500)
- Health checks via `/health` endpoint
- Automatic restart on failure

See: **[Service Management](https://github.com/your-org/TradingSystem/blob/main/backend/api/firecrawl-proxy/README.md#service-management)**

## Configuration

> **Centralised env rule**: Configure all variables in the **root** `.env`. No service-specific `.env` files are permitted. See `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`.

| Variable                              | Description                                                 | Default                     |
|---------------------------------------|-------------------------------------------------------------|-----------------------------|
| `FIRECRAWL_PROXY_PORT`                | Express listen port                                         | `3600`                      |
| `FIRECRAWL_PROXY_BASE_URL`            | Upstream Firecrawl core URL                                | `http://localhost:3002`     |
| `FIRECRAWL_PROXY_TIMEOUT`             | Upstream timeout in milliseconds                           | `30000`                     |
| `FIRECRAWL_PROXY_RATE_LIMIT_WINDOW_MS`| Rate-limit window in ms                                    | `60000`                     |
| `FIRECRAWL_PROXY_RATE_LIMIT_MAX`      | Requests allowed per window per IP                         | `100`                       |
| `FIRECRAWL_PROXY_LOG_LEVEL`           | pino log level                                             | `info`                      |
| `CORS_ORIGIN`                         | Comma-separated allow-list for browser clients              | `http://localhost:3103,http://localhost:3004` |
| `VITE_FIRECRAWL_PROXY_URL`            | Dashboard proxy URL (consumed automatically by Vite)        | `http://localhost:3600`     |

## Monitoring & Observability
- **Prometheus** scrapes `/metrics` (default 15s). Dashboards should track request throughput, latency (p95/p99), scrape successes/failures, crawl status distribution, and rate-limit violations.
- **Grafana**: Recommended panels – HTTP requests by status, `firecrawl_scrape_total` split by success/failure, `firecrawl_crawl_status_checks_total` by crawl status.
- **Logging**: Pino JSON log fields include service, action, url, statusCode, durationMs, ip, userAgent. Logs can be shipped to ELK/Loki.
- **Health checks**: `/health` polled by Service Launcher and ops monitoring; alert if `firecrawl.reachable` remains false > 2 intervals.

### Performance Monitoring

For detailed performance monitoring including:
- Key metrics to track (request rate, error rate, latency percentiles)
- Grafana dashboard configuration
- Prometheus alert rules
- Performance optimization strategies

See: **[Firecrawl Proxy - Performance Monitoring](https://github.com/your-org/TradingSystem/blob/main/backend/api/firecrawl-proxy/README.md#performance-monitoring)**

### Infrastructure Monitoring

Monitor the underlying Firecrawl stack:
- Redis queue depth and memory usage
- Worker process health and throughput
- Playwright browser resource usage
- PostgreSQL query performance

See: **[Firecrawl Infrastructure - Monitoring](https://github.com/your-org/TradingSystem/blob/main/tools/firecrawl/README.md#monitoring)**

## Testing
- **Unit tests** (`npm run test` inside `backend/api/firecrawl-proxy`)
  - Validation middleware coverage.
  - Rate limiter handler behaviour.
  - FirecrawlService error mapping (ECONNREFUSED, ETIMEDOUT, upstream 4xx/5xx).
- **Integration tests** using `supertest` & mocked axios verifying `/api/v1/scrape`, `/api/v1/crawl`, `/api/v1/crawl/:id` happy paths & error paths.
- **Coverage target**: ≥ 80% lines/branches for routes, middleware, services.

## Troubleshooting

| Symptom                                   | Mitigation                                                                 |
|-------------------------------------------|----------------------------------------------------------------------------|
| Proxy fails to start                      | Confirm root `.env` exists and contains `FIRECRAWL_PROXY_*` values.        |
| `/api/v1/scrape` returns 400              | Inspect `details` array; validate URL protocol, formats array, numeric fields. |
| Excessive 429 responses                   | Reduce request concurrency or adjust rate-limit values cautiously.         |
| Upstream 503 errors                       | Verify Firecrawl stack (`docker compose ps`), test core `/v1/health`.       |
| Upstream 504 errors                       | Increase `FIRECRAWL_PROXY_TIMEOUT`, ensure Firecrawl workers/playwright have resources. |
| `firecrawl.reachable` false in `/health`  | Firecrawl core not reachable; check docker network / port 3002.            |
| Slow responses                            | Examine Prometheus histograms, scale Firecrawl workers, review system load. |

### Advanced Troubleshooting

For comprehensive troubleshooting including:
- Rate limit tuning and monitoring
- Upstream connection failures and circuit breaker patterns
- Timeout configuration and optimization
- Memory leak detection and mitigation
- CORS configuration issues
- Performance optimization strategies

See: **[Firecrawl Proxy - Advanced Troubleshooting](https://github.com/your-org/TradingSystem/blob/main/backend/api/firecrawl-proxy/README.md#advanced-troubleshooting)**

### Infrastructure Issues

If the proxy reports `firecrawl.reachable: false`, troubleshoot the core Firecrawl stack:
- **[Firecrawl Infrastructure - Troubleshooting](https://github.com/your-org/TradingSystem/blob/main/tools/firecrawl/README.md#troubleshooting)**
- **[Firecrawl Infrastructure - Monitoring](https://github.com/your-org/TradingSystem/blob/main/tools/firecrawl/README.md#monitoring)**

Diagnostic commands:
```bash
# Tail proxy logs
tail -f backend/api/firecrawl-proxy/logs/service.log

# Hit proxy health
curl http://localhost:3600/health

# Check Firecrawl core directly (ops only)
curl http://localhost:3002/v1/health
```

## Security

### Proxy Security
The proxy implements multiple security layers:
- Input validation on all endpoints
- Per-IP rate limiting (configurable)
- CORS whitelist enforcement
- Request size limits
- Secure error handling (no stack traces in production)

For security hardening procedures, see: **[Firecrawl Proxy - Security Hardening](https://github.com/your-org/TradingSystem/blob/main/backend/api/firecrawl-proxy/README.md#security-hardening)**

### Infrastructure Security
The Firecrawl core stack should be secured:
- Enable authentication in production
- Network isolation (Redis not exposed publicly)
- Proxy usage for IP rotation

See: **[Firecrawl Infrastructure - Security Considerations](https://github.com/your-org/TradingSystem/blob/main/tools/firecrawl/README.md#security-considerations)**

# References

## Internal Documentation

### Implementation Guides
- **[Firecrawl Proxy Implementation](https://github.com/your-org/TradingSystem/blob/main/backend/api/firecrawl-proxy/README.md)** - Complete implementation guide with quick start, testing, deployment, and troubleshooting
- **[Firecrawl Infrastructure Setup](https://github.com/your-org/TradingSystem/blob/main/tools/firecrawl/README.md)** - Core Firecrawl stack deployment, configuration, and maintenance

### Architecture & Integration
- **[Backend API Catalogue](README.md)** - Overview of all backend APIs
- **[Frontend ↔ Backend API Hub](../../shared/integrations/frontend-backend-api-hub.md)** - API integration patterns
- **[Reverse Proxy Setup](../../ops/tools/reverse-proxy-setup.md)** - Nginx integration and unified domain architecture

### Operations
- **[Environment Configuration](../../ops/ENVIRONMENT-CONFIGURATION.md)** - Centralized environment variable management
- **[Service Launcher](../service-launcher/README.md)** - Service orchestration and health monitoring
- **[Health Monitoring Guide](../../ops/health-monitoring.md)** - Comprehensive health check documentation

### Diagrams
- **[Firecrawl Proxy Architecture](../../shared/diagrams/firecrawl-proxy-architecture.puml)** - Component diagram
- **[Firecrawl Proxy Sequence](../../shared/diagrams/firecrawl-proxy-sequence.puml)** - Interaction flow

## External Resources

### Firecrawl
- **[Firecrawl Official Docs](https://docs.firecrawl.dev)** - Official documentation
- **[Firecrawl API Reference](https://docs.firecrawl.dev/api-reference)** - API endpoints and parameters
- **[Firecrawl Self-Host Guide](https://docs.firecrawl.dev/contributing/self-host)** - Self-hosting instructions
- **[Firecrawl GitHub](https://github.com/mendableai/firecrawl)** - Source code and issues

### Libraries & Tools
- **[express-validator](https://express-validator.github.io/docs/)** - Request validation middleware
- **[prom-client](https://github.com/siimon/prom-client)** - Prometheus metrics client
- **[pino](https://getpino.io)** - Fast JSON logger
- **[express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)** - Rate limiting middleware
