---
title: "Proxy Configuration Best Practices"
slug: /frontend/engineering/PROXY-BEST-PRACTICES
sidebar_position: 20
tags: [frontend, proxy, vite, docker, best-practices]
domain: frontend
type: guide
summary: "Best practices for configuring Vite proxy in containerized environments"
status: active
last_review: "2025-11-13"
---

# Proxy Configuration Best Practices

## Overview

This guide documents best practices for configuring Vite proxy in Docker containers to prevent common issues like "API Indisponível" errors.

## The #1 Cause of Proxy Errors

**Using `VITE_` prefix for container hostnames exposes them to the browser, causing connection failures.**

## Critical Rules

### Rule 1: Never Use `VITE_` Prefix for Proxy Targets

❌ **WRONG**:
```bash
# .env
VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200
```

✅ **CORRECT**:
```bash
# .env
WORKSPACE_PROXY_TARGET=http://workspace-api:3200
```

**Why?** Vite automatically exposes all `VITE_*` variables to the browser. Container hostnames like `workspace-api` are NOT resolvable from the browser!

### Rule 2: Always Use Relative Paths in Browser Code

❌ **WRONG**:
```typescript
// Browser code
const url = 'http://localhost:3200/api/items';
const url = `${import.meta.env.VITE_API_URL}/items`;
```

✅ **CORRECT**:
```typescript
// Browser code
const url = '/api/workspace/items'; // Vite proxy handles this
```

**Why?** The browser should ONLY know about relative paths. The Vite dev server (or production reverse proxy) handles routing to the backend.

### Rule 3: Vite Proxy Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/workspace': {
        target: process.env.WORKSPACE_PROXY_TARGET || 'http://localhost:3200',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/workspace/, '/api'),
      },
    },
  },
});
```

**Key Points**:
- Use non-`VITE_` environment variables for targets
- `changeOrigin: true` prevents CORS issues
- `rewrite` transforms `/api/workspace/items` → `/api/items`

### Rule 4: ESLint Validation

```javascript
// .eslintrc.cjs
module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^http:\\/\\/(localhost|127\\.0\\.0\\.1):\\d+/]',
        message: 'Use relative paths instead of localhost URLs',
      },
    ],
  },
};
```

**This prevents**:
```typescript
const url = 'http://localhost:3200/api/items'; // ❌ ESLint error
```

## Container vs Host Networking

### In Docker Compose

```yaml
services:
  dashboard:
    build: ./frontend/dashboard
    environment:
      # ✅ Container hostname (server-side only)
      WORKSPACE_PROXY_TARGET: http://workspace-api:3200
      
      # ❌ DO NOT use VITE_ prefix
      # VITE_WORKSPACE_PROXY_TARGET: http://workspace-api:3200
    networks:
      - tradingsystem_backend
  
  workspace-api:
    image: workspace-api
    networks:
      - tradingsystem_backend
```

**Network Resolution**:
- `dashboard` container → `workspace-api:3200` ✅ (same Docker network)
- Browser → `workspace-api:3200` ❌ (hostname not in DNS)
- Browser → `/api/workspace/items` ✅ (Vite proxy routes to container)

### Development vs Production

| Environment | Browser URL       | Proxied To                    |
|-------------|-------------------|-------------------------------|
| Development | `/api/workspace/` | `http://workspace-api:3200`   |
| Production  | `/api/workspace/` | `http://localhost:9082` (via Gateway) |

## Common Pitfalls

### Pitfall 1: Exposing Container Hostnames

```typescript
// ❌ WRONG - Exposed to browser
const API_URL = import.meta.env.VITE_WORKSPACE_API_URL;
// Value: "http://workspace-api:3200" (not resolvable from browser)

// ✅ CORRECT - Use relative path
const url = '/api/workspace/items';
```

### Pitfall 2: Hardcoded Localhost URLs

```typescript
// ❌ WRONG - Breaks in Docker
fetch('http://localhost:3200/api/items');

// ✅ CORRECT - Use relative path
fetch('/api/workspace/items');
```

### Pitfall 3: Missing `changeOrigin`

```typescript
// ❌ WRONG - CORS errors
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
    changeOrigin: true, // Prevents CORS issues
  },
}
```

## Validation

### Step 1: Check Environment Variables

```bash
# In .env file
grep "^VITE_.*_PROXY_TARGET" .env

# Should return NOTHING
# If you see results, remove the VITE_ prefix
```

### Step 2: Check Source Code

```bash
# Search for hardcoded localhost URLs
grep -r "localhost:[0-9]" src/

# Search for VITE_ proxy variables in code
grep -r "VITE_.*PROXY" src/
```

### Step 3: Test Proxy

```bash
# Start containers
docker compose up -d

# Test from browser console
fetch('/api/workspace/health').then(r => r.json()).then(console.log)

# Should return: { status: 'healthy', service: 'workspace-api' }
```

## Troubleshooting

### Error: "API Indisponível"

**Cause**: Browser trying to connect to container hostname

**Solution**:
1. Check for `VITE_` prefix on proxy targets → Remove it
2. Check for hardcoded localhost URLs → Use relative paths
3. Rebuild container: `docker compose up -d --build`

### Error: "CORS policy blocked"

**Cause**: Missing `changeOrigin: true` in proxy config

**Solution**:
```typescript
proxy: {
  '/api/workspace': {
    target: 'http://workspace-api:3200',
    changeOrigin: true, // ADD THIS
  },
}
```

### Error: "404 Not Found" on API calls

**Cause**: Path rewrite not configured correctly

**Solution**:
```typescript
proxy: {
  '/api/workspace': {
    target: 'http://workspace-api:3200',
    rewrite: (path) => path.replace(/^\/api\/workspace/, '/api'),
  },
}
```

## Checklist

Before deploying proxy configuration:

- [ ] No `VITE_` prefix on proxy target variables
- [ ] All browser code uses relative paths (no `localhost` URLs)
- [ ] `changeOrigin: true` in proxy config
- [ ] `rewrite` function transforms paths correctly
- [ ] ESLint rule prevents hardcoded URLs
- [ ] Container build successful
- [ ] Proxy test passes (fetch from browser)
- [ ] No console errors in browser

## Related Documentation

- [HTTP Client Implementation Guide](http-client-implementation-guide.mdx)
- [ADR-008: HTTP Client Standardization](../../reference/adrs/ADR-008-http-client-standardization.md)
- [Environment Variables Guide](../../tools/security-config/env.mdx)
- [API Gateway Policy](../../governance/policies/api-gateway-policy.md)

---

**Last Updated**: 2025-11-13  
**Status**: Active  
**Applies To**: All Frontend Applications
