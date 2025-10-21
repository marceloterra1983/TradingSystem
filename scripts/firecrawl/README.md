# Firecrawl Management Scripts

Utility scripts for starting and stopping the Firecrawl Docker Compose stack.

> The Firecrawl **core** service (port 3002) runs via Docker Compose. The Firecrawl **Proxy API** (port 3600) is a separate Node.js service managed by `scripts/services/start-all.sh`.

## Prerequisites

- Docker daemon running with Compose support (`docker compose` or `docker-compose`)
- Root `.env` configured with all `FIRECRAWL_*` variables
- Firecrawl submodule initialized: `git submodule update --init --recursive`

## Scripts

### `start.sh`
- Starts the Firecrawl Docker stack (API, Redis, nuq-postgres, Playwright)
- Usage: `bash scripts/firecrawl/start.sh`
- Builds images on first run and waits ~10 seconds for readiness
- Prints container status and helpful access URLs

### `stop.sh`
- Stops the Firecrawl Docker stack
- Usage: `bash scripts/firecrawl/stop.sh [--remove-volumes]`
- Default: preserves volumes/data (`docker compose down`)
- `--remove-volumes`: also removes volumes (data loss, confirmation required)

## Quick Start

```bash
# Start Firecrawl core services
bash scripts/firecrawl/start.sh

# Check containers
docker ps | grep firecrawl

# Stream logs
docker compose -f infrastructure/firecrawl/firecrawl-source/docker-compose.yaml logs -f

# Stop (preserve data)
bash scripts/firecrawl/stop.sh
```

## Integration Notes

- Firecrawl core (3002) must be running before starting the Firecrawl Proxy (`backend/api/firecrawl-proxy`).
- Service Launcher monitors the proxy via `GET /health` and the proxy forwards connectivity checks to the core service.
- Dashboard features use the proxy API at `http://localhost:3600`.

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Port 3002 already in use | Stop conflicting process or adjust `FIRECRAWL_PORT` in `.env` |
| Build failures | Run `docker compose -f ... build` to inspect detailed output |
| Upstream connection errors | Check `docker compose logs api redis nuq-postgres` |
| Redis/Postgres unhealthy | Ensure volumes are intact; restart stack |

## Environment Variables

Key settings (all in root `.env`):
- `FIRECRAWL_PORT` – external core API port (default 3002)
- `FIRECRAWL_REDIS_URL` – Redis connection string used by the stack
- `FIRECRAWL_NUQ_DATABASE_URL` – PostgreSQL connection string
- See `infrastructure/firecrawl/README.md` and `.env.example` for the full list

## Related Documentation

- `infrastructure/firecrawl/README.md`
- `docs/context/backend/api/firecrawl-proxy.md`
- `scripts/services/README.md`
- `backend/api/firecrawl-proxy/README.md`
