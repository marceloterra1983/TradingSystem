---
title: "AI Agent Proxy Configuration Guide"
sidebar_position: 21
tags: [frontend, proxy, ai-agents, automation]
domain: frontend
type: guide
summary: "Guide for AI agents when configuring Vite proxy settings"
status: active
last_review: "2025-11-13"
---

# AI Agent Proxy Configuration Guide

## Purpose

This guide is specifically written for AI agents (like Claude, GPT, etc.) when they need to configure or debug Vite proxy settings in the TradingSystem project.

## Quick Decision Tree

```
Are you configuring a Vite proxy?
│
├─ YES → Read this entire guide
│
└─ NO → Skip to [HTTP Client Guide](./http-client-implementation-guide)
```

## Critical Instructions for AI Agents

### 🚨 STOP: Read These Rules FIRST

Before making ANY changes to proxy configuration:

1. **NEVER use `VITE_` prefix for proxy target environment variables**
2. **ALWAYS use relative paths in browser code** (no `http://localhost` URLs)
3. **ALWAYS set `changeOrigin: true`** in proxy configuration
4. **ALWAYS rebuild the Docker container** after proxy config changes

### Pattern Recognition

**If you see this pattern:**

```typescript
// ❌ WRONG PATTERN - FIX IMMEDIATELY
const API_URL = import.meta.env.VITE_API_URL; // "http://workspace-api:3200"
fetch(`${API_URL}/items`);
```

**Replace with:**

```typescript
// ✅ CORRECT PATTERN
fetch('/api/workspace/items'); // Vite proxy handles routing
```

## Step-by-Step Proxy Configuration

### Step 1: Environment Variables

Create/update `.env` file:

```bash
# ✅ CORRECT - Server-side only (no VITE_ prefix)
WORKSPACE_PROXY_TARGET=http://workspace-api:3200
TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005

# ❌ WRONG - Exposed to browser (DO NOT USE)
# VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200
```

### Step 2: Vite Configuration

Update `vite.config.ts`:

```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      proxy: {
        '/api/workspace': {
          target: env.WORKSPACE_PROXY_TARGET || 'http://localhost:3200',
          changeOrigin: true, // CRITICAL: Prevents CORS errors
          rewrite: (path) => path.replace(/^\/api\/workspace/, '/api'),
        },
        '/api/tp-capital': {
          target: env.TP_CAPITAL_PROXY_TARGET || 'http://localhost:4005',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tp-capital/, ''),
        },
      },
    },
  };
});
```

### Step 3: Update Service Code

```typescript
// services/workspaceService.ts

// ❌ REMOVE THIS
// const API_URL = import.meta.env.VITE_API_URL;

// ✅ USE RELATIVE PATHS
export async function fetchItems() {
  const response = await fetch('/api/workspace/items');
  return response.json();
}
```

### Step 4: Docker Configuration

Update `docker-compose.yml`:

```yaml
services:
  dashboard:
    build:
      context: ./frontend/dashboard
    environment:
      # ✅ Container hostname (not exposed to browser)
      WORKSPACE_PROXY_TARGET: http://workspace-api:3200
      TP_CAPITAL_PROXY_TARGET: http://tp-capital-api:4005
    networks:
      - tradingsystem_backend
```

### Step 5: Rebuild and Validate

```bash
# Rebuild container (REQUIRED after vite.config.ts changes)
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d --build

# Validate proxy works
curl http://localhost:8092/api/workspace/health

# Should return: {"status":"healthy","service":"workspace-api"}
```

## Common Mistakes and Fixes

### Mistake 1: Using VITE_ Prefix

```bash
# ❌ WRONG
VITE_WORKSPACE_URL=http://workspace-api:3200

# ✅ CORRECT
WORKSPACE_PROXY_TARGET=http://workspace-api:3200
```

**Why?** `VITE_*` variables are exposed to the browser. Container hostnames are not resolvable from the browser!

### Mistake 2: Hardcoded URLs

```typescript
// ❌ WRONG
fetch('http://localhost:3200/api/items');

// ✅ CORRECT
fetch('/api/workspace/items');
```

**Why?** Hardcoded URLs break in Docker. Use relative paths and let Vite proxy handle routing.

### Mistake 3: Missing changeOrigin

```typescript
// ❌ WRONG
proxy: {
  '/api/workspace': {
    target: 'http://workspace-api:3200',
    // Missing changeOrigin!
  },
}

// ✅ CORRECT
proxy: {
  '/api/workspace': {
    target: 'http://workspace-api:3200',
    changeOrigin: true, // REQUIRED
  },
}
```

**Why?** Without `changeOrigin`, the Host header doesn't match the target, causing CORS errors.

## Validation Checklist for AI Agents

Before completing proxy configuration, verify:

- [ ] `.env` has NO `VITE_` prefixed proxy variables
- [ ] `vite.config.ts` uses non-VITE environment variables
- [ ] `vite.config.ts` has `changeOrigin: true` for all proxies
- [ ] All `fetch()` calls use relative paths (no `localhost` URLs)
- [ ] Docker compose file sets proxy targets correctly
- [ ] ESLint is configured to catch hardcoded URLs
- [ ] Container rebuilt after configuration changes
- [ ] Proxy test passes (curl or fetch from browser)

## Automated Validation

```bash
# Run validation script
bash scripts/env/validate-env.sh

# Expected output:
# ✅ No VITE_ prefixed proxy targets found
# ✅ No hardcoded localhost URLs in source code
# ✅ Proxy configuration is valid
```

## Quick Reference: Request Flow

### Development Mode

```
Browser Request:     /api/workspace/items
        ↓
Vite Dev Server:     Proxy intercepts
        ↓
Rewrite Path:        /api/items
        ↓
Forward To:          http://workspace-api:3200/api/items
        ↓
Response:            { data: [...] }
        ↓
Browser:             Receives response
```

### Production Mode (via Gateway)

```
Browser Request:     /api/workspace/items
        ↓
Traefik Gateway:     Routes to workspace-api
        ↓
Path Transform:      /api/items
        ↓
Backend Service:     http://workspace-api:3200/api/items
        ↓
Response:            { data: [...] }
```

## Troubleshooting Guide for AI Agents

### Problem: "API Indisponível" Error

**Diagnostic Steps**:

1. Check if `VITE_` prefix used:
   ```bash
   grep "^VITE_.*_PROXY" .env
   ```

2. Check for hardcoded URLs:
   ```bash
   grep -r "localhost:[0-9]" src/
   ```

3. Verify proxy config:
   ```bash
   grep -A 5 "proxy:" vite.config.ts
   ```

**Fix Priority**:
1. Remove `VITE_` prefix from `.env`
2. Change hardcoded URLs to relative paths
3. Add `changeOrigin: true` to proxy config
4. Rebuild container

### Problem: CORS Errors

**Solution**: Add `changeOrigin: true` to proxy configuration.

### Problem: 404 Not Found

**Solution**: Check `rewrite` function in proxy config. Ensure it transforms paths correctly.

## Best Practices Summary

1. **Environment Variables**: No `VITE_` prefix for proxy targets
2. **Browser Code**: Use relative paths only
3. **Proxy Config**: Always set `changeOrigin: true`
4. **Path Rewriting**: Transform `/api/workspace/*` → `/api/*`
5. **Validation**: Run validation script before committing
6. **Container**: Rebuild after configuration changes
7. **Testing**: Test with both curl and browser fetch

## Related Documentation

- [Proxy Best Practices](./PROXY-BEST-PRACTICES)
- [HTTP Client Implementation Guide](./http-client-implementation-guide)
- [Environment Variables Guide](../../tools/security-config/env)

---

**Target Audience**: AI Agents (Claude, GPT, etc.)  
**Last Updated**: 2025-11-13  
**Status**: Active
