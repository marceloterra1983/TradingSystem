---
title: JS/TS Workspace Inventory
sidebar_position: 10
tags:
  - javascript
  - tooling
  - repository
  - ops
domain: ops
type: reference
summary: Enumerates existing JavaScript/TypeScript packages and environment templates to support workspace migration planning
status: active
last_review: "2025-10-17"
---

## Package.json Locations

| Location | Notes |
| --- | --- |
| `package.json` | Root; currently no workspace definition. |
| `apps/b3-market-data/package.json` | Express service (QuestDB integration). |
| `backend/api/documentation-api/package.json` | Documentation CRUD API. |
| `backend/api/workspace/package.json` | Legacy idea bank service. |
| `apps/service-launcher/package.json` | Service orchestrator. |
| `apps/tp-capital/package.json` | Telegram ingestion API. |
| `frontend/dashboard/package.json` | React dashboard (Vite). |
| `docs/docusaurus/package.json` | Documentation hub. |
| `tools/monitoring/alert-router/package.json` | Monitoring helper service. |
| `tools/Agent-MCP/package.json` | MCP server platform. |
| `tools/Agent-MCP/agent_mcp/dashboard/package.json` | Next.js dashboard. |
| `tools/Agent-MCP/agent-mcp-node/package.json` | Node agent runner. |
| `tools/firecrawl/firecrawl-source/apps/api/package.json` | Upstream Firecrawl API (submodule). |
| `tools/firecrawl/firecrawl-source/apps/api/native/package.json` | Native API variant (submodule). |
| `tools/firecrawl/firecrawl-source/apps/js-sdk/package.json` | JS SDK (submodule). |
| `tools/firecrawl/firecrawl-source/apps/js-sdk/firecrawl/package.json` | SDK sub-package (submodule). |
| `tools/firecrawl/firecrawl-source/apps/playwright-service-ts/package.json` | Playwright service (submodule). |
| `tools/firecrawl/firecrawl-source/apps/test-suite/package.json` | Firecrawl tests (submodule). |
| `tools/firecrawl/firecrawl-source/apps/ui/ingestion-ui/package.json` | UI package (submodule). |
| `tools/firecrawl/firecrawl-source/examples/*/package.json` | Example apps (submodule). |
| `.tmp/OpenSpec/package.json` | Generated tooling workspace (should be excluded). |

> Packages under submodules will be managed via upstream workflows and should remain outside the internal workspace scope.

## Environment Templates (`.env.example`)

| Location | Notes |
| --- | --- |
| `.env.example` | Root project template. |
| `apps/b3-market-data/.env.example` | Service-specific config. |
| `backend/api/documentation-api/.env.example` | Service-specific config. |
| `backend/api/workspace/.env.example` | Legacy service. |
| `apps/service-launcher/.env.example` | Launcher API. |
| `apps/tp-capital/.env.example` | Telegram ingestion. |
| `frontend/dashboard/.env.example` | React dashboard. |
| `backend/services/llamaindex/.env.example` | ML service. |
| `backend/services/timescaledb-sync/.env.example` | Sync pipeline. |
| `tools/firecrawl/.env.example` | Local deployment configuration. |
| `tools/Agent-MCP/.env.example` | MCP server configuration template. |
| `tools/firecrawl/firecrawl-source/...` | Multiple example templates within upstream submodule (ignored for shared config planning). |

## Observations & Next Steps

- Internal workspace candidates: backend API services, dashboard frontend, documentation hub, monitoring alert-router.
- Submodule packages and example templates should stay decoupled; the service manifest must flag them as external.
- Shared `.env` template can cover repeated variables (QuestDB, ports, OpenAI) while allowing per-service overrides documented above.

## Shared Manifest Reference

- See `config/services-manifest.json` for the canonical list of services consumed by scripts/CI.

## Automation Consumers

- `scripts/start-services.sh` reads the manifest to start internal services dynamically.
