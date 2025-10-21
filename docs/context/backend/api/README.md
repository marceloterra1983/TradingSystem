---
title: Backend API Contracts
sidebar_position: 1
tags: [backend, api, contracts, reference]
domain: backend
type: reference
summary: Catalogue of backend API specifications and follow-up tasks
status: active
last_review: 2025-10-17
---

# Backend API Contracts

| Service | Description | Spec |
|---------|-------------|------|
| Workspace API | CRUD for ideas, categories, priorities, and status. Port 3200. | [workspace.openapi.yaml](./specs/workspace.openapi.yaml) |
| Documentation API | Documentation systems registry, ideas management, file uploads, search, and statistics. Port 3400. | [documentation-api.openapi.yaml](./specs/documentation-api.openapi.yaml) |
| Firecrawl Proxy API | Validated web scraping proxy with rate limiting, metrics, and error normalization. | [firecrawl-proxy.md](firecrawl-proxy.md) |
| API Gateway | Entry point to .NET/Python services. | _Plan: expose `/openapi.json` via FastAPI._ |

> All specs follow OpenAPI 3.0.3 standard with comprehensive schemas, examples, and error responses.

## Next steps

1. Keep OpenAPI specs in this directory updated with every API change.
2. Update `frontend/api/README.md` whenever contracts change to reflect new endpoints.
3. Add CI job to validate and publish API specs (bundle + lint).
4. Consider upgrading to OpenAPI 3.1.0 for improved schema validation and JSON Schema compatibility.
5. Generate TypeScript types from OpenAPI specs for frontend type safety.
