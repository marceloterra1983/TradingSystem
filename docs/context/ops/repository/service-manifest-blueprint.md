---
title: Service Manifest Blueprint
sidebar_position: 20
tags:
  - automation
  - manifest
  - devtooling
  - ops
domain: ops
type: reference
summary: Proposed structure and data fields for the shared service manifest driving scripts and CI
status: active
last_review: 2025-10-17
---

## Motivation

- Current shell scripts hardcode service ports, paths, and commands (e.g., `scripts/start-services.sh`).
- GitHub workflows rely on per-project working directories, making the repo brittle during moves.
- A centralized manifest (JSON or YAML) will describe each service, enabling tooling to remain in sync.

## Candidate Fields

| Field | Description | Example |
| --- | --- | --- |
| `id` | Unique identifier used across scripts/CI. | `tp-capital-signals` |
| `type` | `backend`, `frontend`, `docs`, `infra`, etc. | `backend` |
| `path` | Relative path to project directory. | `frontend/apps/tp-capital` |
| `start` | Command to start in development mode. | `npm run dev` |
| `build` | Production build command (optional). | `npm run build` |
| `test` | Primary test command (optional). | `npm test` |
| `port` | Primary dev port (if applicable). | `3200` |
| `env` | Path to environment template (optional). | `.env.example` |
| `workspace` | Boolean indicating inclusion in npm workspaces. | `true` |

## Initial Service List

| id | path | port | workspace |
| --- | --- | --- | --- |
| `tp-capital-signals` | `frontend/apps/tp-capital` | 3200 | true |
| `b3-market-data` | `frontend/apps/b3-market-data` | 3302 | true |
| `documentation-api` | `backend/api/documentation-api` | 3400 | true |
| `service-launcher` | `frontend/apps/service-launcher` | 3500 | true |
| `dashboard` | `frontend/apps/dashboard` | 3103 | true |
| `docs-hub` | `docs/docusaurus` | 3004 | true |
| `alert-router` | `infrastructure/monitoring/alert-router` | n/a | true |
| `agent-mcp` | `infrastructure/Agent-MCP` | 8080 | false |
| `firecrawl` | `infrastructure/firecrawl/firecrawl-source` | 3002 | false (submodule) |

> Submodule services should have `workspace: false` and `managed: external` flags to skip workspace scripts while still exposing metadata for dashboards.

## Manifest Format Proposal

```json
{
  "version": 1,
  "services": [
    {
      "id": "tp-capital-signals",
      "type": "backend",
      "path": "frontend/apps/tp-capital",
      "start": "npm run dev",
      "build": "npm run build",
      "test": "npm test",
      "port": 3200,
      "env": ".env.example",
      "workspace": true
    }
  ]
}
```

JSON eases consumption from shell, Node, and Python tools. Frontend dashboard can ingest the same data to drive service cards.

## Next Steps

- Confirm the final schema (`version`, required fields) and store under `backend/manifest.json`.
- Update `scripts/start-services.sh` and other helpers to read the manifest using `jq` or a Node helper.
- Create a CI assertion (GitHub Action or lint script) that validates manifest entries reference real paths and env templates.

## Tooling

- CLI helper: `scripts/service-manifest.js` (list or query manifest entries).
- Runtime consumer: `scripts/start-services.sh` loads the manifest at runtime to avoid hard-coded service maps.
