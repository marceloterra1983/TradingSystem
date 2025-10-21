---
title: Firecrawl Proxy Implementation Guide
sidebar_position: 30
tags: [firecrawl, proxy, api, express]
domain: backend
type: guide
summary: Implementation details for the Firecrawl Proxy Express service that mediates requests to the Firecrawl scraping stack.
status: active
last_review: 2025-10-17
---

# Firecrawl Proxy Implementation Guide

The Firecrawl Proxy is a Node.js/Express service that validates and forwards scraping requests from the TradingSystem dashboard to the upstream Firecrawl stack. It enriches responses with structured logging, metrics, and standardized payloads while enforcing rate limits and centralized configuration.

## Service Overview

- **Port:** `3600`
- **Upstream:** `http://localhost:3002` (Firecrawl core)
- **Purpose:** Harden public interactions with Firecrawl by adding validation, throttling, and observability.
- **Deployment:** Docker Compose service `firecrawl-proxy` (see [Firecrawl Stack Overview](../../../ops/infrastructure/firecrawl-stack.md)).

## Quick Start

```bash
cd backend/api/firecrawl-proxy
npm install
npm run dev
```

Ensure the Firecrawl stack is running locally (`docker compose -f infrastructure/firecrawl/docker-compose.yml up -d`) before issuing scrape or crawl requests.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | `GET` | Service uptime and Firecrawl connectivity status. |
| `/metrics` | `GET` | Prometheus metrics for proxy operations and upstream latencies. |
| `/api/v1/scrape` | `POST` | Single URL scrape with format selection (`markdown`, `links`, `html`). |
| `/api/v1/crawl` | `POST` | Starts Firecrawl crawl job with depth/limit controls. |
| `/api/v1/crawl/{id}` | `GET` | Retrieves crawl job status and collected data. |

All JSON responses share the `{ success, data }` envelope. Validation errors return `{ success: false, error, details }`.

## Configuration

Environment variables are loaded from the root `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `FIRECRAWL_PROXY_PORT` | HTTP port for the proxy | `3600` |
| `FIRECRAWL_PROXY_BASE_URL` | Upstream Firecrawl base URL | `http://localhost:3002` |
| `FIRECRAWL_PROXY_TIMEOUT` | Timeout (ms) for upstream requests | `30000` |
| `FIRECRAWL_PROXY_RATE_LIMIT_WINDOW_MS` | Rate-limit window in milliseconds | `60000` |
| `FIRECRAWL_PROXY_RATE_LIMIT_MAX` | Requests allowed per window | `100` |
| `FIRECRAWL_PROXY_LOG_LEVEL` | Pino log level | `info` |
| `CORS_ORIGIN` | Comma-separated list of allowed origins | `http://localhost:3103,http://localhost:3004` |

## Development & Testing

```bash
# Unit tests
npm run test

# Integration tests against live Firecrawl
npm run test:integration

# Linting
npm run lint
```

Vitest and Supertest provide coverage across request validation logic and upstream response handling. Use `npm run test:integration` only when Firecrawl core is reachable.

## Logging & Metrics

- Structured logs via **pino** (JSON format).
- Prometheus metrics under `tradingsystem_firecrawl_proxy_*` namespaces.
- Histogram buckets capture upstream latency and payload sizes.
- Errors trigger structured events with `severity=error` and error codes.

## Related Documentation

- [Firecrawl Proxy API Reference](../firecrawl-proxy.md)
- [Firecrawl Stack Overview](../../../ops/infrastructure/firecrawl-stack.md)
- [Scraping Dashboard Feature](../../../frontend/features/webscraper-app.md)
- [Service Startup Guide](../../../ops/onboarding/START-SERVICES.md)
