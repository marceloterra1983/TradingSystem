---
title: API Overview
sidebar_position: 20
tags: [api, integrations, summary, shared]
domain: shared
type: reference
summary: Summary of active TradingSystem APIs with purpose, ports, and documentation links
status: active
last_review: 2025-10-17
---

# API Overview

Use this landing page as the entry point to our active APIs. It highlights each service, its purpose, and where to find detailed documentation.

## Active Services

### Workspace
- **Purpose:** Manage the trading idea backlog and product roadmap requests.
- **Port:** `3102`
- **Stack:** Node.js + Express + LowDB.
- **Key endpoints:** `GET/POST /api/items`, `GET /api/prds/:language`.
- **Documentation:** See the [API Hub](./frontend-backend-api-hub.md) and the Workspace spec (`docs/context/backend/api/specs/workspace.openapi.yaml`).
- **Health:** `GET http://localhost:3100/health`

### TP-Capital API
- **Purpose:** Ingest Telegram signals and persist them into QuestDB.
- **Port:** `3200` (local) | `4005` (Docker stack).
- **Stack:** Node.js + Express + QuestDB.
- **Key endpoints:** `POST /webhook/telegram`, `GET /signals`, `GET /logs`.
- **Documentation:** Refer to the [API Hub](./frontend-backend-api-hub.md); TP-Capital docs estão em elaboração.
- **Health:** `GET http://localhost:3200/health`

### B3
- **Purpose:** Provide market data from B3 for analytics and monitoring.
- **Port:** `3302`.
- **Key endpoints:** `GET /api/market-data`.
- **Documentation:** Available in the [API Hub](./frontend-backend-api-hub.md); documentação detalhada será migrada para `docs/context/backend/api/`.
- **Health:** `GET http://localhost:3302/health`

### DocsAPI
- **Purpose:** Manage documentation assets (uploads, indexing, version metadata).
- **Port:** `3400`.
- **Key endpoints:** `GET/POST /api/docs`.
- **Documentation:** See the [API Hub](./frontend-backend-api-hub.md) and [Documentation API Implementation](../../backend/api/documentation-api/implementation-plan.md).
- **Health:** `GET http://localhost:3400/health`

### Laucher API
- **Purpose:** Launch local services and expose aggregated health data.
- **Port:** `3500` (local) | `9999` (legacy tooling).
- **Key endpoints:** `POST /launch`, `GET /api/status`, `GET /health`.
- **Documentation:** Consult the [Launcher API Guide](../../backend/api/service-launcher/README.md).
- **Health:** `GET http://localhost:9999/health`

## Usage Tips
1. Check `.env` files or the service README for authentication and configuration details.
2. Use the Laucher API to start/monitor stacks whenever possible.
3. Never expose these APIs publicly without authentication and network hardening.

## Roadmap
- [ ] Connect this page to dynamic data sourced from the Laucher.
- [ ] Add links to official client libraries (REST/gRPC) once available.
