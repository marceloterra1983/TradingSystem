# Evolution API Stack

Containerized reference stack for [Evolution API](https://github.com/EvolutionAPI/evolution-api) aligned with TradingSystem standards (Clean Architecture + single `.env`). The stack ships with PostgreSQL + PgBouncer, Redis cache, MinIO (S3-compatible media storage), the Evolution API service, and the Evolution Manager UI.

## Components

| Service | Purpose | Ports (host → container) |
| --- | --- | --- |
| `evolution-postgres` | Primary PostgreSQL 16 instance with tuned config & migrations | `${EVOLUTION_DB_PORT:-5436} → 5432` |
| `evolution-pgbouncer` | Connection pooler used by Prisma (transaction mode) | `${EVOLUTION_PGBOUNCER_PORT:-6436} → 6432` |
| `evolution-redis` | Cache store for session/webhook data (`CACHE_REDIS_*`) | `${EVOLUTION_REDIS_PORT:-6386} → 6379` |
| `evolution-minio` | Object storage for media/S3 integrations | `${EVOLUTION_MINIO_API_PORT:-9302} → 9000`, `${EVOLUTION_MINIO_CONSOLE_PORT:-9303} → 9001` |
| `evolution-minio-init` | One-shot bucket/bootstrap job (`evolution-media`) | – |
| `evolution-api` | Core API (Baileys/official WhatsApp bridge) | `${EVOLUTION_API_PORT:-4100} → 8080` |
| `evolution-manager` | Web UI for provisioning connections | `${EVOLUTION_MANAGER_PORT:-4203} → 80` |

All services live on the isolated `evolution_backend` network. Named volumes persist data/sessions (`evolution-postgres-data`, `evolution-redis-data`, `evolution-minio-data`, `evolution-api-instances`).

## Required `.env` keys

Add these variables to the root `.env` (no per-service `.env` files are allowed):

```
EVOLUTION_DB_NAME=evolution
EVOLUTION_DB_USER=evolution
EVOLUTION_DB_PASSWORD=super-secure-password
EVOLUTION_DB_SCHEMA=evolution_api
EVOLUTION_DB_CLIENT_NAME=evolution-stack
EVOLUTION_DB_HOST=evolution-pgbouncer
EVOLUTION_DB_PORT=5436
EVOLUTION_DB_HOST_BIND=127.0.0.1
EVOLUTION_DB_POOL_PORT=6432
EVOLUTION_PGBOUNCER_PORT=6436
EVOLUTION_PGBOUNCER_HOST_BIND=127.0.0.1
EVOLUTION_API_PORT=4100
EVOLUTION_API_HOST_BIND=127.0.0.1
EVOLUTION_API_PUBLIC_URL=http://localhost:4100
EVOLUTION_MANAGER_PORT=4203
EVOLUTION_MANAGER_HOST_BIND=127.0.0.1
EVOLUTION_REDIS_PORT=6386
EVOLUTION_REDIS_HOST_BIND=127.0.0.1
EVOLUTION_MINIO_ROOT_USER=evolution
EVOLUTION_MINIO_ROOT_PASSWORD=super-secure-minio
EVOLUTION_MINIO_BUCKET=evolution-media
EVOLUTION_MINIO_REGION=us-east-1
EVOLUTION_MINIO_API_PORT=9302
EVOLUTION_MINIO_API_HOST_BIND=127.0.0.1
EVOLUTION_MINIO_CONSOLE_PORT=9303
EVOLUTION_MINIO_CONSOLE_HOST_BIND=127.0.0.1
EVOLUTION_S3_ENDPOINT=http://evolution-minio:9000
EVOLUTION_CACHE_REDIS_PREFIX_KEY=evolution
EVOLUTION_MANAGER_API_BASE_URL=http://evolution-api:8080
```

Override or extend as needed (TLS certs, metrics credentials, etc.). Defaults are baked into the compose file so the stack boots even if some keys are missing, but sensitive values must be set explicitly before production use.

## Usage

```bash
# start everything
docker compose -f tools/compose/docker-compose.evolution-api.yml up -d

# only the API + UI (DB/cache already running)
docker compose -f tools/compose/docker-compose.evolution-api.yml up -d evolution-api evolution-manager

# inspect status/health
docker compose -f tools/compose/docker-compose.evolution-api.yml ps
```

### Health validation

1. Database: `psql -h localhost -p ${EVOLUTION_DB_PORT} -U ${EVOLUTION_DB_USER} -d ${EVOLUTION_DB_NAME}`.  
2. Redis: `redis-cli -h 127.0.0.1 -p ${EVOLUTION_REDIS_PORT} ping`.  
3. MinIO: browse `http://localhost:${EVOLUTION_MINIO_CONSOLE_PORT}` (bucket `evolution-media` auto-created).  
4. API: `curl -H "accept: application/json" http://localhost:${EVOLUTION_API_PORT}/health`.  
5. Manager: open `http://localhost:${EVOLUTION_MANAGER_PORT}` and point it to `EVOLUTION_API_PUBLIC_URL`.

## Notes

- The compose file sets `DATABASE_PROVIDER=psql_bouncer` so Prisma talks to PgBouncer (`pgbouncer=true` in the URI).  
- Redis is pre-wired via `CACHE_REDIS_URI=redis://evolution-redis:6379/6`. Tweak TTL/prefix through corresponding env vars.  
- MinIO can be replaced with any S3 endpoint by overriding `EVOLUTION_S3_ENDPOINT`, `S3_USE_SSL`, and `S3_PORT`.  
- Telemetry is disabled (`TELEMETRY_ENABLED=false`) but can be re-enabled via `.env`.

See `tools/compose/docker-compose.evolution-api.yml` for full details.
