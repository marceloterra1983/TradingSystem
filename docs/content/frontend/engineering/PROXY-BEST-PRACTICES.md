---
title: Vite Proxy Configuration - Best Practices
sidebar_position: 5
tags: [frontend, vite, proxy, configuration, best-practices]
domain: frontend
owner: FrontendGuild
type: guide
summary: "Comprehensive guide for configuring Vite proxy to connect browser code to Docker containers"
description: "Best practices for Vite proxy configuration to prevent API errors and connectivity issues"
status: active
last_review: "2025-11-06"
lastReviewed: "2025-11-08"
---

# Vite Proxy Configuration - Best Practices

**Last Updated:** 2025-11-06
**Status:** ✅ Production-Ready Pattern
**Priority:** P0 - Critical (Security & Connectivity)

lastReviewed: "2025-11-08"
---

## 🎯 Overview

This document establishes the **canonical pattern** for connecting frontend browser code to backend Docker containers through Vite's development proxy.

**Why This Matters:** Incorrect proxy configuration causes "API Indisponível" errors that are difficult to debug because they appear as silent network failures in the browser.

lastReviewed: "2025-11-08"
---

## 🏗️ Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│  - Can only resolve: localhost, public domains             │
│  - CANNOT resolve: Docker container hostnames              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ fetch('/api/workspace/items')
                            │ (relative path)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Vite Dev Server (Port 3103 on host)               │
│  - Reads process.env (server-side variables)               │
│  - Proxy configured in vite.config.ts                       │
│  - Has access to Docker network DNS                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ http://workspace-api:3200/api/items
                            │ (container hostname)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        Docker Container (workspace-api:3200)                │
│  - Only accessible within Docker network                    │
│  - Hostname resolves via Docker DNS                         │
└─────────────────────────────────────────────────────────────┘
```

lastReviewed: "2025-11-08"
---

## 🔑 Critical Rules (NEVER VIOLATE)

### Rule 1: Variable Scoping

```bash
# ✅ CORRECT - Server-side only (Vite proxy reads this)
WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api

# ✅ CORRECT - Browser-side (relative path)
VITE_WORKSPACE_API_URL=/api/workspace

# ❌ WRONG - Container hostname exposed to browser
VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api
```

**Golden Rule:**
> **NEVER use `VITE_` prefix for container hostnames**
> `VITE_*` variables are automatically exposed to browser code via `import.meta.env`

### Rule 2: Browser Code Uses Relative Paths

```typescript
// ✅ CORRECT - Relative path (Vite proxy intercepts)
const baseUrl = '/api/workspace/items';
fetch(baseUrl); // → http://localhost:3103/api/workspace/items → Vite proxy → container

// ❌ WRONG - Absolute localhost URL (bypasses proxy, wrong port)
const baseUrl = 'http://localhost:3200/api/items';
fetch(baseUrl); // → Connection refused (port not exposed)

// ❌ WRONG - Container hostname (browser can't resolve)
const baseUrl = 'http://workspace-api:3200/api/items';
fetch(baseUrl); // → DNS lookup failed
```

### Rule 3: Proxy Configuration Priority

```typescript
// vite.config.ts - Correct priority order
const proxy = resolveProxy(
  env.SERVICE_PROXY_TARGET,           // ✅ 1. Server-side (prioritized)
  env.VITE_SERVICE_PROXY_TARGET,      // ⚠️  2. Legacy fallback
  env.VITE_SERVICE_API_URL,           // ⚠️  3. Browser URL (last resort)
  'http://localhost:PORT/path',       // ✅ 4. Local dev fallback
);
```

lastReviewed: "2025-11-08"
---

## 📋 Complete Configuration Checklist

### 1. Docker Compose Configuration

**File:** `tools/compose/docker-compose.1-dashboard-stack.yml`

```yaml
services:
  dashboard:
    environment:
      # ✅ Server-side proxy targets (no VITE_ prefix!)
      - WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api
      - TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005
      - DOCUSAURUS_PROXY_TARGET=http://docs-hub:80

      # ✅ Browser-facing URLs (relative paths only)
      # These are set in .env file, not docker-compose
```

**Why Separate?**
- `WORKSPACE_PROXY_TARGET` → Server-side (Vite reads from `process.env`)
- `VITE_WORKSPACE_API_URL` → Browser-side (exposed via `import.meta.env`)

### 2. Environment File (.env)

```bash
# ✅ Browser-facing URLs (relative paths)
VITE_WORKSPACE_API_URL=/api/workspace
VITE_TP_CAPITAL_API_URL=/api/tp-capital
VITE_DOCUSAURUS_URL=/

# ❌ DO NOT add VITE_ prefix to these:
# WORKSPACE_PROXY_TARGET - set in docker-compose.yml
# TP_CAPITAL_PROXY_TARGET - set in docker-compose.yml
```

### 3. Vite Configuration (vite.config.ts)

```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // ✅ Resolve proxy targets (server-side only)
  const workspaceProxy = resolveProxy(
    env.WORKSPACE_PROXY_TARGET ||           // Server-side (prioritized)
    env.VITE_WORKSPACE_PROXY_TARGET ||      // Legacy fallback
    env.VITE_WORKSPACE_API_URL,             // Browser URL
    'http://localhost:3200/api',            // Local dev fallback
  );

  return {
    server: {
      proxy: {
        // ✅ Proxy route (browser → Vite → container)
        '/api/workspace': {
          target: workspaceProxy.target,      // http://workspace-api:3200
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/workspace/, workspaceProxy.basePath),
        },
      },
    },
  };
});

// ✅ Helper function to parse proxy URLs
function resolveProxy(
  ...candidates: Array<string | undefined>
): { target: string; basePath: string } {
  const url = candidates.find(c => c && c.length > 0) || '';
  const match = url.match(/^(https?:\/\/[^/]+)(\/.*)?$/);

  if (!match) {
    return { target: url, basePath: '' };
  }

  return {
    target: match[1],           // http://workspace-api:3200
    basePath: match[2] || '',   // /api
  };
}

// ✅ Helper to create rewrite rules
function createRewrite(pattern: RegExp, replacement: string) {
  return (path: string) => path.replace(pattern, replacement);
}
```

### 4. Browser Service Code

```typescript
// ✅ CORRECT Pattern
class WorkspaceService {
  private baseUrl: string;

  constructor() {
    // Use relative path to leverage Vite proxy
    this.baseUrl = '/api/workspace/items';
  }

  async getItems() {
    // Vite proxy intercepts and forwards to container
    const response = await fetch(this.baseUrl);
    return response.json();
  }
}

// ❌ WRONG Pattern
class WorkspaceServiceBad {
  private baseUrl: string;

  constructor() {
    // Direct localhost URL bypasses proxy
    this.baseUrl = 'http://localhost:3200/api/items';
  }

  async getItems() {
    // Connection refused (port not exposed to browser)
    const response = await fetch(this.baseUrl);
    return response.json();
  }
}
```

lastReviewed: "2025-11-08"
---

## 🔍 Troubleshooting Guide

### Symptom: "API Indisponível" Error

**Root Causes:**
1. Container hostname exposed to browser via `VITE_` prefix
2. Hardcoded localhost URL with wrong port
3. Direct container hostname in browser code

**Diagnosis:**

```bash
# 1. Check environment variables in container
docker exec dashboard-ui env | grep -E "(PROXY_TARGET|API_URL)"

# Expected output:
# WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api  ← No VITE_ prefix
# VITE_WORKSPACE_API_URL=/api/workspace                 ← Relative path

# ❌ BAD output:
# VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200  ← Exposed to browser!
```

```bash
# 2. Test proxy endpoint
curl -s http://localhost:3103/api/workspace/items | jq '.success'
# Should return: true
```

```bash
# 3. Run validation script
bash scripts/env/validate-env.sh
# Should pass: ✓ No VITE_ prefix misuse
```

**Fix:**

1. Remove `VITE_` prefix from proxy target in `docker-compose.yml`
2. Change browser-facing URL to relative path in `.env`
3. Update `vite.config.ts` to prioritize non-VITE variable
4. Rebuild container: `docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d --build`

### Symptom: "Failed to fetch" Error

**Root Cause:** Browser trying to connect directly to container hostname

**Browser Console Shows:**
```
GET http://workspace-api:3200/api/items net::ERR_NAME_NOT_RESOLVED
```

**Fix:** Ensure service uses relative path, not container hostname.

### Symptom: "Connection refused" Error

**Root Cause:** Browser trying to connect to unexposed port

**Browser Console Shows:**
```
GET http://localhost:3200/api/items net::ERR_CONNECTION_REFUSED
```

**Fix:** Change to relative path `/api/workspace/items` (goes through proxy on port 3103).

lastReviewed: "2025-11-08"
---

## 📝 Service Template

Use this template for all new services:

```typescript
/**
 * [Service Name] - [Brief Description]
 *
 * Manages [resource] through REST API
 */

// ✅ Extract base URL from environment (relative path)
const getBaseApiUrl = (): string => {
  const apiUrl = import.meta.env.VITE_MY_SERVICE_API_URL;

  // Default to relative path (Vite proxy)
  return apiUrl || '/api/my-service';
};

const BASE_API_URL = getBaseApiUrl();

console.warn('[MyService] Using base URL:', BASE_API_URL);

export interface MyResource {
  id: string;
  name: string;
  // ... other fields
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class MyService {
  private baseUrl: string;

  constructor() {
    // ✅ ALWAYS use relative path for Vite proxy
    this.baseUrl = BASE_API_URL;
  }

  async getResources(): Promise<MyResource[]> {
    const response = await fetch(this.baseUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch resources');
    }

    const result: ApiResponse<MyResource[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch resources');
    }

    return result.data;
  }

  // ... other methods
}

export const myService = new MyService();
```

lastReviewed: "2025-11-08"
---

## 🧪 Testing Checklist

Before deploying a new service:

- [ ] ✅ Service uses relative paths (no localhost URLs)
- [ ] ✅ No `VITE_` prefix on container hostnames in `.env`
- [ ] ✅ Proxy target configured in `docker-compose.yml`
- [ ] ✅ Proxy route added to `vite.config.ts`
- [ ] ✅ Browser-facing URL uses relative path
- [ ] ✅ Validation script passes (`bash scripts/env/validate-env.sh`)
- [ ] ✅ Container rebuilt with `--build` flag
- [ ] ✅ Proxy endpoint returns data (`curl http://localhost:3103/api/...`)
- [ ] ✅ No browser console errors
- [ ] ✅ Service health check passes

lastReviewed: "2025-11-08"
---

## 🚨 Common Mistakes

### Mistake 1: Using VITE_ Prefix for Proxy Targets

```bash
# ❌ WRONG - Exposes container hostname to browser
VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api

# ✅ CORRECT - Server-side only
WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api
```

**Impact:** Browser tries to resolve `workspace-api` hostname → DNS lookup fails → "API Indisponível"

### Mistake 2: Hardcoding Localhost URLs in Browser Code

```typescript
// ❌ WRONG - Bypasses proxy, wrong port
const baseUrl = 'http://localhost:3200/api/items';

// ✅ CORRECT - Goes through Vite proxy
const baseUrl = '/api/workspace/items';
```

**Impact:** Browser connects to unexposed port → Connection refused

### Mistake 3: Missing Base Path in Proxy Rewrite

```typescript
// ❌ WRONG - Strips base path incorrectly
'/api/workspace': {
  target: 'http://workspace-api:3200',  // Missing /api base path
  rewrite: (path) => path.replace(/^\/api\/workspace/, ''),
}
// Result: http://workspace-api:3200/items (404 - should be /api/items)

// ✅ CORRECT - Preserves base path
'/api/workspace': {
  target: 'http://workspace-api:3200',
  rewrite: (path) => path.replace(/^\/api\/workspace/, '/api'),
}
// Result: http://workspace-api:3200/api/items (200 OK)
```

### Mistake 4: Forgetting Container Rebuild

```bash
# ❌ WRONG - Vite embeds env vars at build time
docker compose up -d
# Old environment variables still active in container

# ✅ CORRECT - Force rebuild to pick up new variables
docker compose up -d --build
```

lastReviewed: "2025-11-08"
---

## 📊 Service Inventory (Current Status)

| Service | URL | Proxy Target | Status |
|---------|-----|--------------|--------|
| **Workspace Items** | `/api/workspace/items` | `workspace-api:3200/api` | ✅ Working |
| **Workspace Categories** | `/api/workspace/categories` | `workspace-api:3200/api` | ✅ Working |
| **TP Capital API** | `/api/tp-capital` | `tp-capital-api:4005` | ✅ Working |
| **Docusaurus** | `/next/*` | `docs-hub:80` | ✅ Working |
| **LlamaIndex RAG** | `/api/v1/rag/*` | `llamaindex-query:8202` | ✅ Working |

lastReviewed: "2025-11-08"
---

## 🔗 Related Documentation

- **Arquivo `frontend/dashboard/docs/PROXY-CONFIGURATION-GUIDE.md`** - guia detalhado na pasta do dashboard
- **Relatório `outputs/WORKSPACE-API-FIX-2025-11-06.md`** - incidente Workspace API
- **Relatório `outputs/CATEGORIES-API-FIX-2025-11-06.md`** - correções de categorias
- **Relatório `outputs/PROXY-FIXES-COMPLETE-2025-11-06.md`** - resumo completo
- **CLAUDE.md (raiz do repositório)** - seção “When Working with Vite Proxy Configuration”

lastReviewed: "2025-11-08"
---

## 🤖 Instructions for AI Assistants

When working with Vite proxy configuration:

1. **ALWAYS read this document first** before modifying proxy config
2. **NEVER use `VITE_` prefix** for container hostnames
3. **ALWAYS use relative paths** in browser code (`/api/...`)
4. **ALWAYS run validation script** after changes (`bash scripts/env/validate-env.sh`)
5. **ALWAYS rebuild container** with `--build` flag after config changes
6. **ALWAYS test endpoints** with `curl` before marking as complete

**If you encounter "API Indisponível" errors:**
1. Check for `VITE_` prefix on proxy targets → Remove it
2. Check for hardcoded localhost URLs in services → Change to relative paths
3. Rebuild container → Test with curl → Verify in browser

lastReviewed: "2025-11-08"
---

**Last Updated:** 2025-11-06
**Maintained By:** TradingSystem Core Team
**Review Frequency:** After each proxy-related incident (immediately)
**Status:** ✅ Production-Ready Pattern
