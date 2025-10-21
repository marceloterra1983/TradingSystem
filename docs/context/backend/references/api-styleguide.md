---
title: API Styleguide
sidebar_position: 20
tags: [api, backend, reference, conventions]
domain: backend
type: reference
summary: Conventions for REST APIs exposed by TradingSystem services
status: active
last_review: 2025-10-17
---

# API Styleguide

## General conventions

- Base URL: `http://localhost:<port>/api`.
- Format: JSON (UTF-8). Always set `Content-Type: application/json; charset=utf-8`.
- Response envelope:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "optional",
    "error": "optional"
  }
  ```
- Errors: `success: false`, include `error` string, and `errors[]` array for validation issues.

## Status codes

| Code | Usage |
|------|-------|
| 200 OK | Successful GET/PUT/DELETE |
| 201 Created | Successful resource creation |
| 204 No Content | Optional for deletes |
| 400 Bad Request | Validation failures |
| 404 Not Found | Missing resource |
| 500 Internal Server Error | Unexpected failure (log stack) |

## Route naming

- Use plurals for collections (`/api/items`).
- Single resource path for sub-entities (`/api/files/:id`).
- Segments by context (`/systems`, `/stats`).

## Versioning

- MVP uses `/api` without versioning. Adopt `/api/v1` when breaking changes appear.
- Document changes via RFC + ADR before release.

## Documentation

- Maintain OpenAPI specs under `backend/api/*.openapi.yaml`.
- Sync `frontend/api/README.md` with any contract updates.

## Security (planned)

- Token-based authentication (Authorization header).
- Rate limiting middleware.
- TLS termination via reverse proxy when running beyond local dev.