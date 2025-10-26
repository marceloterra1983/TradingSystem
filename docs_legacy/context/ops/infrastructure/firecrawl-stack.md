---
title: Firecrawl Stack Overview
sidebar_position: 40
tags: [firecrawl, infrastructure, scraping, proxy, ops]
domain: ops
type: reference
summary: Deployment guide and architecture notes for the Firecrawl scraping stack and reverse proxy.
status: active
last_review: "2025-10-17"
---

# Firecrawl Stack Overview

> 🔍 Firecrawl powers large-scale documentation scraping and enrichment. This guide documents the container stack, networking model, and operational tasks required to keep the service healthy.

## Architecture

| Component | Port | Description |
|-----------|------|-------------|
| `firecrawl-api` | 3002 | Main Firecrawl API service (upstream core) handling scrape and crawl orchestration. |
| `firecrawl-playwright` | Internal (3000) | Headless browser service used for page rendering and JS execution. |
| `firecrawl-redis` | Internal (6379) | Queue, rate limiting, and transient job metadata. |
| `firecrawl-postgres` | Internal (5432) | Persistent storage for nuq job state and history. |
| `firecrawl-proxy` | 3600 | TradingSystem Express proxy layer (see [API Guide](../../backend/api/firecrawl-proxy.md)). |

### Network Topology

- All containers share the `tradingsystem_firecrawl` Docker network.
- Only `firecrawl-api` (port `3002`) and the local `firecrawl-proxy` (port `3600`) are exposed to the host.
- Internal services are addressed via Docker DNS (`http://firecrawl-api:3002`, `redis://firecrawl-redis:6379`, etc.).
- `firecrawl-proxy` never bypasses the proxy path; production workloads must call the proxy, not the upstream API directly.

## Deployment (Docker Compose)

```bash
# Start Firecrawl stack (requires root .env)
docker compose -f tools/firecrawl/firecrawl-source/docker-compose.yaml --env-file .env up -d

# Follow logs for API and proxy
docker compose -f tools/firecrawl/firecrawl-source/docker-compose.yaml logs -f firecrawl-api firecrawl-proxy
```

### Environment Configuration

All variables are loaded from the repository root `.env`. Primary parameters:

| Variable | Description |
|----------|-------------|
| `FIRECRAWL_API_URL` | Base URL for upstream Firecrawl API (`http://firecrawl-api:3002`). |
| `FIRECRAWL_HOST` / `FIRECRAWL_PORT` | Bind address and port for `firecrawl-api` inside the container. |
| `FIRECRAWL_NUQ_DATABASE_URL` | PostgreSQL connection string for `firecrawl-postgres`. |
| `FIRECRAWL_REDIS_URL` | Redis URL used for queues and rate limiting. |
| `FIRECRAWL_PLAYWRIGHT_URL` | Internal URL for the Playwright service (`http://firecrawl-playwright:3000/scrape`). |
| `FIRECRAWL_BULL_AUTH_KEY` | Required auth token for Bull board/queues. |
| `FIRECRAWL_TEST_API_KEY` | Local testing API key surfaced by the proxy for smoke tests. |
| `OPENAI_API_KEY`, `MODEL_NAME`, `MODEL_EMBEDDING_NAME` | LLM configuration when Firecrawl performs content summarization. |

> ⚠️ **Do not** create stack-specific `.env` files. Keep everything in the project root `.env` and wire it through `env_file`.

## Operational Tasks

### Health Checks

```bash
# Proxy health
curl http://localhost:3600/health

# Upstream Firecrawl API readiness
curl http://localhost:3002/v0/health/readiness

# Playwright microservice (only available when bound to host)
curl http://localhost:3000/health || echo "Playwright stays internal by default"
```
> ℹ️ Use `/v0/health/readiness` for readiness checks; some archived runbooks may still reference the legacy `/v1/health` endpoint.

Prometheus metrics are available at `http://localhost:3600/metrics` (surfaced by the proxy). Grafana dashboards live under **Scraping / Firecrawl**.

### Scaling

The upstream Firecrawl service manages workers internally. To increase local capacity:

- Increase container resources (`deploy.resources`) or
- Run multiple `firecrawl-api` instances behind an external load balancer.

There is no separate `firecrawl-workers` service anymore; scale the API service directly.

### Troubleshooting

- **429 rate limited:** Confirm proxy/LLM keys and reduce `FIRECRAWL_WORKER_CONCURRENCY`.
- **504 gateway timeout:** Check `firecrawl-api` (`docker compose ps`) and rerun `curl http://localhost:3002/v0/health/readiness`.
- **Proxy 502:** Ensure `firecrawl-api` is up and Redis/Postgres are healthy (`docker compose logs firecrawl-api firecrawl-redis`).
- **Playwright navigation errors:** Inspect `firecrawl-playwright` logs (`docker compose logs firecrawl-playwright`).

## Backup & Retention

- **Redis** is ephemeral; no backups are required.
- **PostgreSQL (`firecrawl-postgres`)** persists inside the `firecrawl_postgres_data` volume. Schedule periodic `pg_dump` backups.
- **Logs** are forwarded to the central observability stack (see `docs/context/ops/monitoring/prometheus-setup.md`).

## Related Documentation

- [Firecrawl Proxy API Guide](../../backend/api/firecrawl-proxy.md)
- [Reverse Proxy Setup](./reverse-proxy-setup.md)
- [Service Startup Guide](../service-startup-guide.md)
- [Automation Checklist](../automation/backup-job.md)
