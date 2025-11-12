# Workspace API Fix - Traefik Middleware

**Date:** 2025-11-11
**Status:** ✅ **FIXED**

---

## Problem

Workspace page in Dashboard was showing "API Indisponível" (API Unavailable) error. The API was returning HTTP 404 for `/items` and `/categories` endpoints.

## Root Cause

The Workspace API server registers routes with `/api` prefix:
- `/api/items`
- `/api/categories`  
- `/health` (exception - no prefix)

However, the Traefik middleware was only stripping the `/api/workspace` prefix without adding `/api` back, resulting in:
- Gateway: `/api/workspace/items` → Traefik: `/items` → Workspace API: **404 Not Found**

## Solution

Restored the `addapi` middleware to the Workspace API Traefik configuration:

```yaml
# File: tools/compose/docker-compose.4-3-workspace-stack.yml

# Path transformation: /api/workspace/X → /api/X
# Step 1: Strip /api/workspace → /X
# Step 2: Add /api prefix → /api/X
- "traefik.http.middlewares.workspace-path-transform.chain.middlewares=workspace-strip,workspace-addapi"
- "traefik.http.middlewares.workspace-strip.stripprefix.prefixes=/api/workspace"
- "traefik.http.middlewares.workspace-addapi.addprefix.prefix=/api"
```

## Validation

```bash
curl http://localhost:9080/api/workspace/items
# HTTP 200 ✅

curl http://localhost:9080/api/workspace/categories  
# HTTP 200 ✅
```

## Trade-off

The `/health` endpoint returns HTTP 404 via Gateway because it's at root level (no `/api` prefix):
- Direct: `http://workspace-api:3200/health` → HTTP 200 ✅
- Via Gateway: `http://localhost:9080/api/workspace/health` → HTTP 404 ❌

**Impact:** None - Traefik health checks use the direct container path (`/health`), not the Gateway route.

## Key Learning

**Not all APIs follow the same route pattern!** Always verify the actual route structure before configuring Traefik middleware:

- **Workspace API**: Routes have `/api` prefix (except `/health`)
- **TP Capital API**: Routes at root level (no `/api` prefix)
- **Documentation API**: Routes at root level (no `/api` prefix)

**Rule of Thumb:**
1. Test endpoints directly: `docker exec container curl http://localhost:PORT/route`
2. Match middleware to actual route structure
3. Health checks should use internal paths, not Gateway routes

---

**Result:** Dashboard Workspace page now loads successfully! 🎉
