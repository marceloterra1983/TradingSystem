---
title: AI Agent Guide - Vite Proxy Configuration
sidebar_position: 6
tags: [frontend, ai, automation, proxy, best-practices]
domain: frontend
owner: FrontendGuild
type: guide
summary: "Comprehensive guide for AI agents working with Vite proxy configuration"
description: "Guide for AI agents on proxy configuration and best practices to prevent API errors"
status: active
last_review: "2025-11-06"
lastReviewed: "2025-11-08"
---

# AI Agent Guide - Vite Proxy Configuration

**Audience:** AI Assistants (Claude, ChatGPT, Copilot, etc.)
**Last Updated:** 2025-11-06
**Status:** ✅ Production-Ready Pattern
**Priority:** P0 - Critical

lastReviewed: "2025-11-08"
---

## 🎯 Purpose

This document provides **AI-optimized instructions** for working with Vite proxy configuration in the TradingSystem project.

**Why This Matters:** Between 2025-10-27 and 2025-11-06, we experienced **4 recurring incidents** of "API Indisponível" errors caused by incorrect proxy configuration. This pattern must never repeat.

lastReviewed: "2025-11-08"
---

## 🚨 Red Flags (Immediate Action Required)

If you encounter ANY of these patterns, **STOP IMMEDIATELY** and read this document:

### User Messages Indicating Proxy Issues

```
❌ "API Indisponível"
❌ "Aguardando sincronização"
❌ "why workspace api disconnected from the frontend?"
❌ "Failed to fetch"
❌ "ERR_CONNECTION_REFUSED"
❌ "ERR_NAME_NOT_RESOLVED"
❌ "Não foi possível encontrar o endereço IP do servidor"
❌ "why we are always having trouble with [service] url"
```

### Code Patterns That Cause Issues

```typescript
// ❌ CRITICAL ERROR - Container hostname in browser code
const url = 'http://workspace-api:3200/api/items';

// ❌ CRITICAL ERROR - Hardcoded localhost with unexposed port
const url = 'http://localhost:3200/api/items';

// ❌ CRITICAL ERROR - VITE_ prefix on container hostname
VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200
```

### Environment Variable Patterns

```bash
# ❌ CRITICAL ERROR - VITE_ prefix exposes to browser
VITE_SERVICE_PROXY_TARGET=http://service-api:PORT

# ❌ WARNING - Localhost URL in browser-facing variable
VITE_SERVICE_API_URL=http://localhost:PORT
```

lastReviewed: "2025-11-08"
---

## ✅ Correct Patterns (Copy-Paste Ready)

### 1. Service Class Template

```typescript
/**
 * [Service Name] Service - [Brief Description]
 *
 * Manages [resource] through REST API
 */

class MyService {
  private baseUrl: string;

  constructor() {
    // ✅ CORRECT - Use relative path for Vite proxy
    // Browser → /api/my-service/* → Vite Proxy → my-service-api:PORT/*
    this.baseUrl = '/api/my-service';

    console.warn('[MyService] Using relative path (Vite proxy):', this.baseUrl);
  }

  async getResources() {
    const response = await fetch(`${this.baseUrl}/resources`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch resources');
    }

    return response.json();
  }
}

export const myService = new MyService();
```

### 2. Docker Compose Configuration

```yaml
# tools/compose/docker-compose.dashboard.yml
services:
  dashboard:
    environment:
      # ✅ Server-side proxy targets (NO VITE_ prefix!)
      - MY_SERVICE_PROXY_TARGET=http://my-service-api:PORT/path

      # Browser-facing URLs are set in .env file, not here
```

### 3. Environment File (.env)

```bash
# ✅ Browser-facing URL (relative path)
VITE_MY_SERVICE_API_URL=/api/my-service

# ❌ DO NOT add these (set in docker-compose.yml):
# MY_SERVICE_PROXY_TARGET - server-side only
```

### 4. Vite Configuration (vite.config.ts)

```typescript
// Add new proxy route
const myServiceProxy = resolveProxy(
  env.MY_SERVICE_PROXY_TARGET ||           // Server-side (prioritized)
  env.VITE_MY_SERVICE_PROXY_TARGET ||      // Legacy fallback
  env.VITE_MY_SERVICE_API_URL,             // Browser URL
  'http://localhost:PORT/path',            // Local dev fallback
);

// Proxy configuration
server: {
  proxy: {
    '/api/my-service': {
      target: myServiceProxy.target,
      changeOrigin: true,
      rewrite: createRewrite(/^\/api\/my-service/, myServiceProxy.basePath),
    },
  },
}
```

lastReviewed: "2025-11-08"
---

## 🔄 Automated Workflow (Follow This Exactly)

### When User Reports "API Indisponível"

1. **Identify Service**
   ```bash
   # Check which service is failing from user's screenshot or message
   # Example: "Categories API not loading" → workspace-api categories endpoint
   ```

2. **Diagnose Root Cause**
   ```bash
   # Test the proxy endpoint
   curl -s http://localhost:3103/api/workspace/categories | jq '.success'
   # Expected: true
   # If fails: Proxy misconfigured

   # Test the backend directly
   docker exec workspace-api wget -q -O- http://localhost:3200/api/categories | jq '.success'
   # Expected: true
   # If works: Confirms proxy issue

   # Check environment variables
   docker exec dashboard-ui env | grep -E "(PROXY_TARGET|API_URL)" | grep -i workspace
   # Expected: WORKSPACE_PROXY_TARGET=... (no VITE_ prefix)
   # If VITE_WORKSPACE_PROXY_TARGET: ROOT CAUSE FOUND
   ```

3. **Find Hardcoded URLs**
   ```bash
   # Search service files for hardcoded URLs
   grep -r "http://localhost:[0-9]" frontend/dashboard/src/services/[service]Service.ts
   grep -r "http://.*-api:" frontend/dashboard/src/services/[service]Service.ts
   ```

4. **Apply Fix**
   ```typescript
   // Change from:
   this.baseUrl = 'http://localhost:3200/api/categories';

   // To:
   this.baseUrl = '/api/workspace/categories';
   ```

5. **Validate Fix**
   ```bash
   # Run validation script
   bash scripts/env/validate-env.sh
   # Must show: ✓ No VITE_ prefix misuse

   # Rebuild container
   docker compose -f tools/compose/docker-compose.dashboard.yml up -d --build

   # Test endpoint
   curl -s http://localhost:3103/api/workspace/categories | jq '.success'
   # Must return: true
   ```

6. **Document Fix**
   ```bash
   # Create incident report in outputs/
   # Follow pattern from:
   # - WORKSPACE-API-FIX-2025-11-06.md
   # - CATEGORIES-API-FIX-2025-11-06.md
   ```

### When Adding New Service

1. **Create Service File**
   ```bash
   # Use template from section "Correct Patterns" above
   # File: frontend/dashboard/src/services/myService.ts
   ```

2. **Add Environment Variables**
   ```bash
   # In docker-compose.dashboard.yml (server-side)
   - MY_SERVICE_PROXY_TARGET=http://my-service-api:PORT

   # In .env (browser-side)
   VITE_MY_SERVICE_API_URL=/api/my-service
   ```

3. **Add Proxy Route**
   ```bash
   # In vite.config.ts
   # Copy pattern from existing services (workspace, tp-capital, etc.)
   ```

4. **Validate**
   ```bash
   bash scripts/env/validate-env.sh
   docker compose up -d --build
   curl http://localhost:3103/api/my-service/test
   ```

lastReviewed: "2025-11-08"
---

## 🧪 Pre-Deployment Checklist

Before marking any proxy-related task as complete:

- [ ] ✅ Service uses **relative paths** (no localhost URLs)
- [ ] ✅ No **`VITE_` prefix** on container hostnames in `.env`
- [ ] ✅ Proxy target configured in **`docker-compose.yml`**
- [ ] ✅ Proxy route added to **`vite.config.ts`**
- [ ] ✅ Browser-facing URL uses **relative path**
- [ ] ✅ **Validation script** passes (`bash scripts/env/validate-env.sh`)
- [ ] ✅ Container **rebuilt** with `--build` flag
- [ ] ✅ Proxy endpoint **returns data** (`curl http://localhost:3103/api/...`)
- [ ] ✅ No **browser console errors**
- [ ] ✅ **ESLint** passes (no hardcoded URL warnings)
- [ ] ✅ **Service health check** passes

lastReviewed: "2025-11-08"
---

## 📚 Required Reading (Before Any Changes)

**MUST READ in this order:**

1. **[PROXY-BEST-PRACTICES](./PROXY-BEST-PRACTICES)** - Complete technical guide (10 min read)
2. **CLAUDE.md (raiz do repositório)** — seção “When Working with Vite Proxy Configuration” (2 min read)
3. **Relatório `outputs/PROXY-FIXES-COMPLETE-2025-11-06.md`** — resumo das correções (5 min read)

**Historical Context (Optional but Recommended):**

4. **Relatório `outputs/WORKSPACE-API-FIX-2025-11-06.md`** - Workspace items incident
5. **Relatório `outputs/CATEGORIES-API-FIX-2025-11-06.md`** - Categories incident
6. **Relatório `outputs/API-OPTIMIZATION-REPORT-2025-11-06.md`** - Full system analysis

lastReviewed: "2025-11-08"
---

## 🎓 Understanding the Architecture

### Why This Pattern Exists

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│                                                              │
│  Problem: Cannot resolve Docker container hostnames         │
│  - "workspace-api" only exists in Docker network DNS        │
│  - Ports 3200, 4005 not exposed to host machine            │
│                                                              │
│  Solution: Use relative paths → Vite proxy bridges gap     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ fetch('/api/workspace/items')
                            │ (relative path - no hostname)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Vite Dev Server (Port 3103 on host)               │
│                                                              │
│  - Reads process.env (server-side variables)               │
│  - Has access to Docker network DNS                         │
│  - Forwards requests to container hostnames                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ http://workspace-api:3200/api/items
                            │ (container hostname works here)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        Docker Container (workspace-api:3200)                │
│                                                              │
│  - Only accessible within Docker network                    │
│  - Returns JSON data                                        │
└─────────────────────────────────────────────────────────────┘
```

### Variable Scoping (Critical Concept)

```bash
# Server-side (Vite reads from process.env)
WORKSPACE_PROXY_TARGET=http://workspace-api:3200
# ✅ Only Vite can see this
# ✅ Browser code CANNOT access this
# ✅ Used in vite.config.ts to configure proxy

# Browser-side (exposed via import.meta.env)
VITE_WORKSPACE_API_URL=/api/workspace
# ✅ Browser code CAN access this via import.meta.env.VITE_WORKSPACE_API_URL
# ✅ Must be a relative path (no hostnames!)
# ✅ Used in service classes to build fetch URLs
```

**Golden Rule:**
> If a variable has the `VITE_` prefix, it will be embedded in the browser bundle and accessible to JavaScript. **NEVER** put container hostnames in VITE_ variables.

lastReviewed: "2025-11-08"
---

## 🤖 Communication Guidelines

### When Reporting to User

```markdown
✅ **Categories API Fixed!**

**Problem:** Service was using hardcoded `http://localhost:3200/api/categories`

**Solution:** Changed to relative path `/api/workspace/categories`

**Verification:**
\`\`\`bash
$ curl http://localhost:3103/api/workspace/categories | jq '.success'
true
\`\`\`

**Impact:** All CRUD operations now working correctly.

**Documentation:** Created [CATEGORIES-API-FIX-2025-11-06.md](...)
```

### When Asking for Clarification

```markdown
I found a potential proxy configuration issue in `[service]Service.ts`.

The service is using:
\`\`\`typescript
this.baseUrl = 'http://localhost:3200/api/items';
\`\`\`

This should be:
\`\`\`typescript
this.baseUrl = '/api/workspace/items';
\`\`\`

Should I proceed with this fix?
```

lastReviewed: "2025-11-08"
---

## 🔧 Debugging Commands (Copy-Paste Ready)

```bash
# Check environment variables in container
docker exec dashboard-ui env | grep -E "(PROXY_TARGET|API_URL)" | sort

# Validate environment configuration
bash scripts/env/validate-env.sh

# Test proxy endpoints
curl -s http://localhost:3103/api/workspace/items | jq '.'
curl -s http://localhost:3103/api/workspace/categories | jq '.'
curl -s http://localhost:3103/api/tp-capital | jq '.'

# Test backend directly (from container)
docker exec workspace-api wget -q -O- http://localhost:3200/api/items | jq '.'
docker exec workspace-api wget -q -O- http://localhost:3200/api/categories | jq '.'

# Check Dashboard logs
docker logs dashboard-ui --tail 50 | grep -i "error\|fail\|proxy"

# Rebuild container (after config changes)
docker compose -f tools/compose/docker-compose.dashboard.yml up -d --build

# Run ESLint
cd frontend/dashboard && npm run lint
```

lastReviewed: "2025-11-08"
---

## 📊 Historical Incident Log

| Date | Service | Root Cause | Fix Applied | Duration |
|------|---------|------------|-------------|----------|
| 2025-10-27 | Docusaurus | VITE_DOCUSAURUS_PROXY_TARGET | Removed VITE_ prefix | 2h |
| 2025-11-03 | Workspace Items | Hardcoded localhost:3201 | Changed to /api/workspace | 1h |
| 2025-11-06 | TP Capital | VITE_TP_CAPITAL_PROXY_TARGET | Removed VITE_ prefix | 30m |
| 2025-11-06 | Categories | Hardcoded localhost:3200 | Changed to /api/workspace/categories | 20m |

**Total Incidents:** 4
**Pattern:** 100% of incidents caused by container hostnames exposed to browser
**Prevention:** ESLint rules + validation script + this documentation

lastReviewed: "2025-11-08"
---

## 🎯 Success Criteria

You have successfully completed a proxy-related task when:

1. ✅ User confirms service is working
2. ✅ No browser console errors
3. ✅ `curl` test returns valid JSON
4. ✅ Validation script passes
5. ✅ ESLint passes
6. ✅ Documentation created (if incident)
7. ✅ Container rebuilt and healthy

lastReviewed: "2025-11-08"
---

## 🚀 Quick Reference

**One-line fix for most issues:**
```typescript
// Change this.baseUrl from localhost URL to relative path
this.baseUrl = '/api/[service-name]/[endpoint]';
```

**One-line validation:**
```bash
bash scripts/env/validate-env.sh && curl -s http://localhost:3103/api/[service]/[endpoint] | jq '.success'
```

**One-line rebuild:**
```bash
docker compose -f tools/compose/docker-compose.dashboard.yml up -d --build
```

lastReviewed: "2025-11-08"
---

**Last Updated:** 2025-11-06
**Maintained By:** TradingSystem Core Team
**Review Frequency:** After each proxy-related incident (immediately)
**Status:** ✅ Production-Ready Pattern

lastReviewed: "2025-11-08"
---

## ⚡ TL;DR for Experienced AI Agents

If user reports "API Indisponível":
1. Search for `http://localhost:` or `http://.*-api:` in service files
2. Replace with `/api/service-name/endpoint`
3. Run `bash scripts/env/validate-env.sh`
4. Rebuild: `docker compose ... up -d --build`
5. Test: `curl http://localhost:3103/api/... | jq '.success'`
6. Done ✅

**Never violate:** No `VITE_` prefix on container hostnames. Always use relative paths in browser code.
