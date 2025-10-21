---
title: Container Naming Convention
sidebar_position: 50
tags: [ops, infrastructure, docker, containers, naming, standards]
domain: ops
type: reference
summary: Official container naming convention, prefixes, categories, and process for adding new containers
status: active
last_review: 2025-10-18
---

# Container Naming Convention

Consistent container names make automation, monitoring, and incident response predictable. This guide defines the standard that every Docker Compose file in the TradingSystem project must follow.

## Naming Rules

- Format: `{prefix}-{service-name}[-{variant}]`
- Prefix: lower-case, maps to an approved category (see table below)
- Service name: descriptive, kebab-case, no underscores or camelCase
- Variant (optional): use for `-dev`, `-test`, or other scoped environments
- All Compose files **must** set `container_name` explicitly; do not rely on auto-generated names
- Avoid numeric suffixes unless required for sharded deployments (document rationale if used)
- **Image tag pattern**: every container image must follow `img-{container_name}:{tag}`. Always retag upstream/base images locally (e.g., `docker tag postgres:16-alpine img-data-postgress-langgraph:16-alpine`) and make Compose reference the renamed tag.

## Category Prefixes

| Prefix | Category | Purpose | Examples |
|--------|----------|---------|----------|
| `data-*` | Data Layer | Databases, ingestion pipelines, admin tooling | `data-timescaledb`, `data-timescaledb-pgadmin` |
| `infra-*` | Core Infrastructure | LangGraph, Qdrant, shared services | `infra-langgraph`, `data-postgress-langgraph` |
| `mon-*` | Monitoring & Observability | Metrics, alerts, dashboards | `mon-prometheus`, `mon-alertmanager` |
| `docs-*` | Documentation Platform | Docs hub, Specs viewer, APIs | `docs-docusaurus`, `docs-api` |
| `firecrawl-*` | Web Scraping Stack | Firecrawl upstream services | `firecrawl-api`, `firecrawl-redis` |

## Container Inventory (28)

### Data Layer (`data-*`)

| Container | Ports | Description | Compose File |
|-----------|-------|-------------|--------------|
| QuestDB (legacy) | - | Container removido (dados migrados para TimescaleDB) | - |
| `data-timescaledb` | 5433 → 5432 | TimescaleDB (PostgreSQL 15) | `infrastructure/compose/docker-compose.timescale.yml` |
| `data-timescaledb-backup` | Internal | Nightly pg_dump backup runner | `infrastructure/compose/docker-compose.timescale.yml` |
| `data-timescaledb-exporter` | 9187 | Prometheus exporter for TimescaleDB | `infrastructure/compose/docker-compose.timescale.yml` |
| `data-timescaledb-pgadmin` | 5050 | pgAdmin UI for TimescaleDB | `infrastructure/compose/docker-compose.timescale.yml` |
| `data-timescaledb-pgweb` | 8081 | Lightweight Postgres web client | `infrastructure/compose/docker-compose.timescale.yml` |

### AI & Infrastructure (`infra-*`)

| Container | Ports | Description | Compose File |
|-----------|-------|-------------|--------------|
| `infra-langgraph` | 8111 | LangGraph production server | `infrastructure/compose/docker-compose.infra.yml` |
| `data-qdrant` | 6333, 6334 | Vector database for embeddings | `infrastructure/compose/docker-compose.infra.yml` |
| `infra-llamaindex-ingestion` | Internal | LlamaIndex ingestion pipeline | `infrastructure/compose/docker-compose.infra.yml` |
| `infra-llamaindex-query` | 3450 | LlamaIndex query API | `infrastructure/compose/docker-compose.infra.yml` |
| `infra-agno-agents` | 8200 | Agno multi-agent service | `infrastructure/compose/docker-compose.infra.yml` |
| `data-postgress-langgraph` | 5432 | Postgres for LangGraph checkpoints | `infrastructure/compose/docker-compose.infra.yml` |
| `data-questdb` | 9002, 9010, 8813 | QuestDB for AI tooling telemetry | `infrastructure/compose/docker-compose.infra.yml` |

### Monitoring (`mon-*`)

| Container | Ports | Description | Compose File |
|-----------|-------|-------------|--------------|
| `mon-prometheus` | 9090 | Metrics collection & alert rules | `infrastructure/monitoring/docker-compose.yml` |
| `mon-alertmanager` | 9093 | Alert routing (email, Slack, GitHub) | `infrastructure/monitoring/docker-compose.yml` |
| `mon-grafana` | 3000 | Observability dashboards | `infrastructure/monitoring/docker-compose.yml` |
| `mon-alert-router` | 8080 | GitHub issue + Slack notifier bridge | `infrastructure/monitoring/docker-compose.yml` |

### Documentation (`docs-*`)

| Container | Ports | Description | Compose File |
|-----------|-------|-------------|--------------|
| `docs-api` | 3400 | Documentation management API | `infrastructure/compose/docker-compose.docs.yml` |
| `docs-docusaurus` | 3004 → 80 | Static documentation hub | `infrastructure/compose/docker-compose.docs.yml` |
| `docs-api-viewer` | 3101 → 3000 | OpenAPI/AsyncAPI viewer | `infrastructure/compose/docker-compose.docs.yml` |

### Firecrawl Stack (`firecrawl-*`)

| Container | Ports | Description | Compose File |
|-----------|-------|-------------|--------------|
| `firecrawl-api` | 3002 | Main Firecrawl upstream API | `infrastructure/firecrawl/firecrawl-source/docker-compose.yaml` |
| `firecrawl-playwright` | Internal (3000) | Playwright browser service | `infrastructure/firecrawl/firecrawl-source/docker-compose.yaml` |
| `firecrawl-redis` | Internal (6379) | Queue + rate limiting cache | `infrastructure/firecrawl/firecrawl-source/docker-compose.yaml` |
| `firecrawl-postgres` | Internal (5432) | nuq PostgreSQL state database | `infrastructure/firecrawl/firecrawl-source/docker-compose.yaml` |

### LangGraph Dev Sandbox

| Container | Ports | Description | Compose File |
|-----------|-------|-------------|--------------|
| `infra-langgraph-dev` | 8112 → 8111 | LangGraph development server | `infrastructure/compose/docker-compose.langgraph-dev.yml` |
| `infra-redis-dev` | 6380 → 6379 | Redis cache for LangGraph dev | `infrastructure/compose/docker-compose.langgraph-dev.yml` |
| `infra-postgres-dev` | 5443 → 5432 | Postgres for LangGraph dev | `infrastructure/compose/docker-compose.langgraph-dev.yml` |

## Process for Adding a New Container

1. **Select prefix** based on the service category (table above).
2. **Name the container** using kebab-case and append variants if needed (`-dev`, `-test`).
3. **Retag the image** to `img-{container_name}:{tag}` (`docker tag ...`). Do NOT reference upstream names directly in Compose.
4. **Update the Compose file** with both explicit `container_name` and the new `image` tag.
   - Set `platform: linux/amd64` unless the service explicitly targets another architecture.
5. **Document ports** and dependencies in the relevant README or ops guide.
6. **Add to monitoring**: update Prometheus scrape configs or dashboard targets.
7. **Update documentation**: this guide, [service-port-map.md](../service-port-map.md), `SERVICES-STATUS-REPORT.md`, and `SERVICES-RUNNING.md`.
8. **Dashboard integration**: add the container to `frontend/apps/dashboard/src/components/pages/launcher/DockerContainersSection.tsx`.
9. **Automation scripts**: update any scripts under `scripts/services/` or `scripts/maintenance/` that manage container lists.

## Image Build Workflow

- Global version variable: `IMG_VERSION` (defined in `.env` / `.env.example`).
- Build & retag all images via `bash scripts/docker/build-images.sh`. The script will:
  - Retag upstream bases (TimescaleDB, Grafana, Redis, etc.) to `img-*:${IMG_VERSION}`.
  - Build Node/Python services (LangGraph, LlamaIndex, Alert Router, Firecrawl, Docs) for `linux/amd64`.
- After building, commit the updated `IMG_VERSION` and run `docker compose pull` (or `up --pull always`) to consume the new tags.
- When promoting a new release, bump `IMG_VERSION` and rebuild; keep previous tags for rollback.
- For ad-hoc retags or pulling published images, use helper scripts:
  - `scripts/services/tag-image.sh <name> <source>` retag upstream images to `img-*`.
  - `scripts/services/pull-images.sh` pulls all `img-*:${IMG_VERSION}` tags.
  - `scripts/docker/prune-old-images.sh` prunes older versions (default keeps last 3) of `img-*` images.

## Migration History

- **Phase 2 (2025-10-12)** unified legacy names (`tradingsystem-*`, `docs-api`, `langgraph-dev`) into the current prefix-based convention.
- Historical names are retained only in the `archive/` directory for reference; production documentation must never use them.
- The migration simplified automation scripts, allowed prefix-based filters (`docker ps --filter name=mon-`), and removed conflicting auto-generated container names.

## Enforcement Guidelines

- Code reviews must verify new Compose files or updates follow the naming format.
- CI scripts can run `docker compose config` and grep for `container_name` to ensure compliance.
- `scripts/services/start-all.sh` and `scripts/services/status.sh` include guard clauses; keep them updated.
- Non-compliant names should block merges until corrected.

## Special Cases

- **Development variants**: append `-dev` (e.g., `infra-langgraph-dev`). Ensure ports do not clash with production containers.
- **Image reuse**: if the same base image backs multiple containers, retag it for each container individually (e.g., `img-data-timescaledb:2.15.2-pg15`, `img-data-frontend-apps:2.16.1-pg16`) to preserve the one-to-one relationship between container and image names.
- **Testing containers**: append `-test` and document teardown steps.
- **Temporary tooling**: append `-temp` and add cleanup tasks to the relevant runbook.
- **Third-party containers**: if a vendor image enforces a name, document the exception in this file.

## Related Documentation

- [Service Port Map](../service-port-map.md)
- [Ops README](../README.md)
- [Firecrawl Stack Overview](firecrawl-stack.md)
- [Frontend Dashboard Docker section](../../../../frontend/apps/dashboard/src/components/pages/launcher/DockerContainersSection.tsx)
- [Automation scripts index](../../../../scripts/README.md)

## Troubleshooting

- List containers by prefix: `docker ps --filter name=data-`
- Inspect Compose config quickly: `docker compose config | rg container_name`
- Rename legacy containers: stop/delete, update Compose, and recreate with `docker compose up -d`
- For suffix collisions (`-1`, `-2`), confirm no duplicate services share the same `container_name`

Following this convention keeps 28 containers organized and discoverable, making future additions painless.
