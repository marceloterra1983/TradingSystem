# Vite Proxy Configuration Guide

**Critical Rules for Container-to-Container Communication**

This guide explains the correct way to configure Vite proxies when running the Dashboard in Docker containers, ensuring container hostnames never leak to browser code.

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Environment Variable Naming Convention](#environment-variable-naming-convention)
- [Configuration Examples](#configuration-examples)
- [Common Pitfalls](#common-pitfalls)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## The Problem

### What Happens When You Use VITE_ Prefix for Proxy Targets

Vite has a special behavior: **any environment variable prefixed with `VITE_` is automatically exposed to browser code** via `import.meta.env`.

**Incorrect Configuration (BROKEN):**
```yaml
# ❌ BAD: Using VITE_ prefix for container hostname
- VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api/v1
```

**What Happens:**
1. ✅ Vite server can read this and proxy correctly
2. ❌ Browser code can also read this via `import.meta.env.VITE_WORKSPACE_PROXY_TARGET`
3. ❌ Browser tries to fetch from `http://workspace-api:3200/api/v1/items`
4. ❌ Browser DNS lookup fails: "Cannot resolve workspace-api"
5. ❌ Frontend shows "API Indisponível" error

### The Architecture Problem

```
┌─────────────┐
│   Browser   │ ← Tries to fetch http://workspace-api:3200/api/v1/items ❌
└──────┬──────┘
       │ (DNS lookup fails - "workspace-api" is a Docker network hostname)
       │
       ▼
┌─────────────────────────────────────────────┐
│  Dashboard Container (React App)            │
│  - Reads import.meta.env.VITE_*             │
│  - Uses it for browser-side fetch()         │
└─────────────────────────────────────────────┘
```

**Container hostnames (like `workspace-api`) only work inside Docker networks, NOT from browser!**

---

## The Solution

### Use Non-VITE Prefixed Variables for Proxy Targets

**Correct Configuration (WORKING):**
```yaml
# ✅ GOOD: No VITE_ prefix = server-side only
- WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api/v1
```

**What Happens:**
1. ✅ Vite server reads `process.env.WORKSPACE_PROXY_TARGET` (server-side Node.js)
2. ✅ Vite proxy forwards `/api/workspace/*` to `http://workspace-api:3200/api/v1/*`
3. ✅ Browser code only sees relative path `/api/workspace/items`
4. ✅ Browser requests go to Vite server, which proxies to container
5. ✅ Everything works!

### The Correct Architecture

```
┌─────────────┐
│   Browser   │ ← Fetches /api/workspace/items (relative path) ✅
└──────┬──────┘
       │ HTTP request to localhost:3103
       ▼
┌─────────────────────────────────────────────┐
│  Vite Dev Server (Port 3103)                │
│  - Reads process.env.WORKSPACE_PROXY_TARGET │
│  - Proxy configured in vite.config.ts       │
└──────┬──────────────────────────────────────┘
       │ Forwards to http://workspace-api:3200/api/v1/items
       ▼
┌─────────────────────────────────────────────┐
│  Workspace API Container                    │
│  - Returns JSON response                    │
└─────────────────────────────────────────────┘
```

---

## Environment Variable Naming Convention

### Critical Rule: Separate Browser-Side from Server-Side

| Purpose | Prefix | Example | Exposed to Browser? | Use Case |
|---------|--------|---------|---------------------|----------|
| **Browser URLs** | `VITE_` | `VITE_DOCUSAURUS_URL=/docs` | ✅ Yes | Relative paths, public URLs |
| **Proxy Targets** | None | `WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api/v1` | ❌ No | Container hostnames, internal URLs |
| **API Endpoints** | `VITE_` | `VITE_API_BASE_URL=http://localhost:3103` | ✅ Yes | Browser-accessible URLs only |

### Naming Examples

```yaml
# ✅ CORRECT: Browser-facing configuration
- VITE_DOCUSAURUS_URL=/                    # Browser uses this for iframe src
- VITE_API_BASE_URL=http://localhost:3103  # Browser-accessible URL

# ✅ CORRECT: Server-side proxy targets (no VITE_ prefix!)
- WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api/v1
- DOCUSAURUS_PROXY_TARGET=http://docs-hub:80
- TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005

# ❌ WRONG: Using VITE_ for container hostnames
- VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200  # Leaks to browser!
```

---

## Configuration Examples

### Example 1: Workspace API

**File: `tools/compose/docker-compose.dashboard.yml`**
```yaml
environment:
  # ✅ Server-side proxy target (no VITE_ prefix)
  - WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api

  # ✅ Browser-facing URL (relative path for proxy forwarding)
  - VITE_WORKSPACE_API_URL=/api/workspace
```

**File: `frontend/dashboard/vite.config.ts`**
```typescript
const libraryProxy = resolveProxy(
  env.WORKSPACE_PROXY_TARGET ||           // ✅ Server-side (prioritized)
  env.VITE_WORKSPACE_PROXY_TARGET ||      // Legacy fallback
  env.VITE_WORKSPACE_API_URL,             // Browser-facing fallback
  'http://localhost:3210/api',            // Local dev fallback with /api path
);

// Proxy configuration
'/api/workspace': {
  target: libraryProxy.target,            // http://workspace-api:3200
  changeOrigin: true,
  rewrite: createRewrite(/^\/api\/workspace/, libraryProxy.basePath),  // /api
},
```

**Browser-Side Code: `frontend/dashboard/src/services/workspaceApiBase.ts`**
```typescript
const buildFallbackCandidates = (): Array<string | null> => {
  return [
    import.meta.env.VITE_WORKSPACE_API_URL,  // Browser-accessible URL
    // NOTE: VITE_WORKSPACE_PROXY_TARGET removed - it contained container hostname!
    getApiUrl('library'),                     // From api.ts config
    '/api/workspace',                         // Default relative path ✅
  ];
};
```

### Example 2: Docusaurus Documentation

**File: `tools/compose/docker-compose.dashboard.yml`**
```yaml
environment:
  # ✅ Server-side proxy target (NGINX container)
  - DOCUSAURUS_PROXY_TARGET=http://docs-hub:80

  # ✅ Browser-facing base URL (empty = versioned paths like /next/)
  - VITE_DOCUSAURUS_URL=/
```

**File: `frontend/dashboard/vite.config.ts`**
```typescript
const docsProxy = resolveProxy(
  env.DOCUSAURUS_PROXY_TARGET ||          // ✅ Server-side (no VITE_!)
  env.VITE_DOCUSAURUS_PROXY_TARGET ||     // Legacy fallback
  env.VITE_DOCUSAURUS_URL,
  'http://localhost:3404',
);
```

### Example 3: TP Capital API

**File: `tools/compose/docker-compose.dashboard.yml`**
```yaml
environment:
  # ✅ Server-side proxy target
  - TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005
```

---

## Common Pitfalls

### Pitfall 1: Using VITE_ for Container Hostnames

**Problem:**
```yaml
- VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200  # ❌ Exposed to browser!
```

**Symptoms:**
- Browser console error: "Failed to fetch"
- Network tab shows request to `http://workspace-api:3200`
- DNS lookup failure for container hostname

**Fix:**
```yaml
- WORKSPACE_PROXY_TARGET=http://workspace-api:3200  # ✅ Server-side only
```

### Pitfall 2: Browser Code Checking Proxy Targets

**Problem:**
```typescript
// ❌ Browser code checking proxy target variable
const baseUrl = import.meta.env.VITE_WORKSPACE_PROXY_TARGET || '/api/workspace';
```

**Why It Fails:**
If `VITE_WORKSPACE_PROXY_TARGET` contains `http://workspace-api:3200`, the browser will try to use that directly.

**Fix:**
```typescript
// ✅ Browser code should only check browser-accessible URLs
const baseUrl = import.meta.env.VITE_WORKSPACE_API_URL || '/api/workspace';
```

### Pitfall 3: Missing API Version in Proxy Target

**Problem:**
```yaml
- WORKSPACE_PROXY_TARGET=http://workspace-api:3200  # ❌ Missing /api/v1
```

**Result:** Proxy forwards to `/items` instead of `/api/v1/items` → 404 Not Found

**Fix:**
```yaml
- WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api/v1  # ✅ Includes version
```

### Pitfall 4: Hardcoding Proxy Targets in Browser Code

**Problem:**
```typescript
// ❌ Hardcoded container hostname in browser code
const response = await fetch('http://workspace-api:3200/api/v1/items');
```

**Fix:**
```typescript
// ✅ Use relative paths - Vite proxy handles forwarding
const response = await fetch('/api/workspace/items');
```

---

## Troubleshooting

### Issue: "API Indisponível" in Dashboard

**Diagnostic Steps:**

1. **Check environment variables in container:**
   ```bash
   docker exec dashboard-ui sh -c 'env | grep -E "WORKSPACE|VITE_WORKSPACE"'
   ```

   ✅ **Good:** Only `WORKSPACE_PROXY_TARGET` (no VITE_)
   ```
   WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api/v1
   ```

   ❌ **Bad:** `VITE_WORKSPACE_PROXY_TARGET` with container hostname
   ```
   VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api/v1
   ```

2. **Test container-to-container connectivity:**
   ```bash
   docker exec dashboard-ui wget -q -O- http://workspace-api:3200/api/v1/items
   ```
   Should return JSON: `{"success":true,"count":1,"data":[...]}`

3. **Test proxy endpoint from host:**
   ```bash
   curl -s http://localhost:3103/api/workspace/items | jq '.success'
   ```
   Should return: `true`

4. **Check Vite proxy configuration:**
   ```bash
   grep -A5 "'/api/workspace'" frontend/dashboard/vite.config.ts
   ```
   Verify it reads `env.WORKSPACE_PROXY_TARGET` (no VITE_ prefix)

5. **Check browser-side code:**
   ```bash
   grep -r "VITE_WORKSPACE_PROXY_TARGET" frontend/dashboard/src/
   ```
   Should return **no results** - browser code shouldn't reference proxy targets

### Issue: 404 Not Found for API Endpoints

**Possible Causes:**

1. **Missing API version path:**
   ```yaml
   # ❌ Wrong
   - WORKSPACE_PROXY_TARGET=http://workspace-api:3200

   # ✅ Correct
   - WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api/v1
   ```

2. **Incorrect rewrite pattern:**
   Check `vite.config.ts`:
   ```typescript
   rewrite: createRewrite(/^\/api\/workspace/, libraryProxy.basePath),
   ```
   Ensure `libraryProxy.basePath` is `/api/v1`

3. **Backend not listening on correct path:**
   ```bash
   docker exec workspace-api wget -q -O- http://localhost:3200/api/v1/items
   ```

### Issue: Proxy Not Forwarding Requests

**Check Vite logs:**
```bash
docker logs dashboard-ui --tail 100 | grep "proxy"
```

Look for errors like:
- `http proxy error: /api/workspace` → Target unreachable
- `ECONNREFUSED` → Container not running or wrong hostname
- `404` → Wrong path or missing API version

---

## Testing Checklist

Before deploying proxy configuration changes:

- [ ] Remove `VITE_` prefix from container hostname variables
- [ ] Update `vite.config.ts` to prioritize non-VITE variables
- [ ] Verify browser-side code doesn't reference proxy targets
- [ ] Test container-to-container connectivity
- [ ] Test proxy endpoint from host machine
- [ ] Check dashboard logs for proxy errors
- [ ] Verify frontend can fetch data successfully
- [ ] Test in both development and production modes

---

## Related Documentation

- [Docusaurus URL Configuration](./DOCUSAURUS-URL-CONFIGURATION.md) - Similar proxy issues with documentation
- [Workspace API Fix Report](../../outputs/WORKSPACE-API-FIX-2025-11-06.md) - Detailed incident analysis
- [Vite Proxy Documentation](https://vitejs.dev/config/server-options.html#server-proxy) - Official Vite proxy guide
- [Environment Variables](https://vitejs.dev/guide/env-and-mode.html) - How Vite handles env vars

---

## Summary

### The Golden Rules

1. **NEVER use `VITE_` prefix for container hostnames** - They leak to browser code
2. **ALWAYS use relative paths in browser code** - Let Vite proxy handle forwarding
3. **ALWAYS include API version in proxy targets** - Match backend URL structure
4. **ALWAYS test at multiple levels** - Container, proxy, and browser

### Quick Reference

```yaml
# ✅ CORRECT Configuration Template
environment:
  # Server-side proxy target (no VITE_ prefix!)
  - SERVICE_PROXY_TARGET=http://service-container:PORT/api/vX

  # Browser-facing URL (optional, for direct access)
  - VITE_SERVICE_API_URL=http://localhost:PORT/api/vX
```

```typescript
// ✅ CORRECT vite.config.ts
const serviceProxy = resolveProxy(
  env.SERVICE_PROXY_TARGET ||        // Server-side (prioritized)
  env.VITE_SERVICE_PROXY_TARGET ||   // Legacy fallback
  env.VITE_SERVICE_API_URL,          // Browser URL
  'http://localhost:PORT',           // Dev fallback
  '/api/vX',                         // Default basePath
);
```

```typescript
// ✅ CORRECT browser code
const response = await fetch('/api/service/endpoint');  // Relative path only!
```

---

**Last Updated:** 2025-11-06
**Maintainer:** TradingSystem Development Team
**Related Issues:** Workspace API Disconnection, Docusaurus URL Configuration
