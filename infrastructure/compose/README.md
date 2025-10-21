# Docker Compose Stacks

Each stack is defined in its own compose file so you can start only the
infrastructure you need. All stacks expect the centralized `.env` at the repo
root, so always pass `--env-file .env` when using `docker compose`.

## Available stacks

| Stack | File | Project name (`name:`) | Typical command |
|-------|------|------------------------|-----------------|
| TimescaleDB cluster (database + pgAdmin/pgweb/exporter/backup) | `docker-compose.timescale.yml` | `tradingsystem-timescale` | `docker compose --env-file .env -f infrastructure/compose/docker-compose.timescale.yml up -d` |
| QuestDB (time-series ingestion) | `docker-compose.data.yml` | `tradingsystem-data` | `docker compose --env-file .env -f infrastructure/compose/docker-compose.data.yml up -d` |
| Infrastructure services (LangGraph, Qdrant, LlamaIndex, Agno Agents) | `docker-compose.infra.yml` | `tradingsystem-infra` | `docker compose --env-file .env -f infrastructure/compose/docker-compose.infra.yml up -d` |
| Documentation services (Docs API, optional Docusaurus) | `docker-compose.docs.yml` | `tradingsystem-docs` | `docker compose --env-file .env -f infrastructure/compose/docker-compose.docs.yml up -d` |
| Legacy infra placeholder (kept for automation compatibility) | `docker-compose.infra.yml` | `tradingsystem-infra` | _no services by default_ |

Monitoring lives under `infrastructure/monitoring/docker-compose.yml` and can be
started with:

```bash
docker compose --env-file .env -f infrastructure/monitoring/docker-compose.yml up -d
```

## Network conventions

- The QuestDB stack exposes a shared bridge network named `tradingsystem_data`.
  Other stacks that need database access can attach to it by declaring an
  external network with the same name.
- The infrastructure stack exposes `tradingsystem_infra`; use it if you need to
  connect additional services to Qdrant or LangGraph.
- Each stack sets an explicit Compose project name via the `name:` key. This
  prevents collisions between stacks and keeps resource names predictable
  (e.g., `tradingsystem-timescale`, `tradingsystem-monitoring`).

## Tips

- Use `docker compose ... config` to validate a stack before bringing it up.
- Pass `--remove-orphans` when switching between stack revisions to clean up
  old containers.
- When you no longer need a stack, stop it with the same command replacing
  `up -d` by `down`.
