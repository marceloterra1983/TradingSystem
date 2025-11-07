# Frontend Configuration Quick Reference

**Last Updated:** 2025-11-07
**For:** TradingSystem Dashboard Developers

---

## The Golden Rules

### 1. Environment Variables Naming

```bash
# ✅ CORRECT - Browser code (relative paths)
VITE_WORKSPACE_API_URL=/api/workspace
VITE_TP_CAPITAL_API_URL=/api/tp-capital

# ✅ CORRECT - Server-side proxy targets (absolute URLs)
WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api
TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005

# ❌ WRONG - VITE_ prefix on server-side config
VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200

# ❌ WRONG - Hardcoded localhost in browser code
VITE_WORKSPACE_API_URL=http://localhost:3200/api
```

### 2. File Locations

```bash
# ✅ CORRECT - Single source of truth
/home/marce/Projetos/TradingSystem/.env

# ❌ WRONG - Local .env files (DO NOT CREATE)
/home/marce/Projetos/TradingSystem/frontend/dashboard/.env
/home/marce/Projetos/TradingSystem/frontend/dashboard/.env.local
```

### 3. Browser Code Patterns

```typescript
// ✅ CORRECT - Relative path (uses Vite proxy)
const url = '/api/workspace/items';
fetch(url);

// ✅ CORRECT - Using API_CONFIG
import { API_CONFIG } from '@/config/api';
fetch(`${API_CONFIG.workspace}/items`);

// ❌ WRONG - Hardcoded localhost
const url = 'http://localhost:3200/api/items';

// ❌ WRONG - Container hostname (only works in Docker)
const url = 'http://workspace-api:3200/api/items';

// ❌ WRONG - Environment variable with VITE_ prefix
const url = import.meta.env.VITE_WORKSPACE_PROXY_TARGET + '/items';
```

---

## Service Port Map

| Service | Browser Path | Vite Proxy Target | Container | Host Port |
|---------|-------------|-------------------|-----------|-----------|
| Workspace | `/api/workspace` | `workspace-api:3200/api` | 3200 | 3210 |
| TP Capital | `/api/tp-capital` | `tp-capital-api:4005` | 4005 | 4008 |
| Docs API | `/api/docs` | `documentation-api:3405` | 3405 | 3405 |
| RAG | `/api/v1/rag` | `rag-collections-api:3403` | 3403 | 3403 |
| Telegram | `/api/telegram-gateway` | `telegram-gateway-api:4010` | 4010 | 4010 |
| Firecrawl | `/api/firecrawl` | `firecrawl-proxy:3600` | 3600 | 3600 |

**Key:**
- **Browser Path:** What your React code uses
- **Vite Proxy Target:** Where Vite dev server forwards requests
- **Container Port:** Port inside Docker network
- **Host Port:** Port exposed on localhost (for direct access)

---

## Quick Commands

### Validation
```bash
# Check environment variables
cd frontend/dashboard
npm run validate:env

# Check for hardcoded URLs
grep -r "localhost:[0-9]" src/components --include="*.tsx" | grep -v "__tests__"

# Run ESLint
npm run lint -- --max-warnings 0
```

### Testing
```bash
# Test API connectivity (via Vite proxy)
curl -v http://localhost:3103/api/workspace/items
curl -v http://localhost:3103/api/tp-capital/signals

# Test direct container access
curl -v http://localhost:3210/api/items          # Workspace
curl -v http://localhost:4008/api/signals        # TP Capital
```

### Development
```bash
# Start dashboard (with Vite proxy)
cd frontend/dashboard
npm run dev

# Rebuild after config changes
npm run build

# Check bundle size
ls -lh dist/assets/*.js | head -5
```

---

## Common Errors & Fixes

### Error: "API Indisponível"

**Symptoms:**
- Network errors in browser console
- 404 or 500 responses from `/api/*` routes

**Causes:**
1. Wrong port in `.env`
2. Missing proxy configuration
3. Hardcoded localhost URL

**Fix:**
```bash
# 1. Check root .env has correct proxy targets
grep "PROXY_TARGET" /home/marce/Projetos/TradingSystem/.env

# 2. Verify Vite proxy config
grep -A 5 "/api/workspace" frontend/dashboard/vite.config.ts

# 3. Check browser code uses relative paths
grep -r "localhost:" frontend/dashboard/src/components
```

### Error: "Missing environment variable"

**Symptoms:**
- Build fails with Vite error
- `import.meta.env.VITE_XXX` is undefined

**Fix:**
```bash
# 1. Add to root .env
echo "VITE_WORKSPACE_API_URL=/api/workspace" >> .env

# 2. Restart Vite dev server
cd frontend/dashboard
npm run dev
```

### Error: ESLint "no-restricted-syntax"

**Symptoms:**
- `❌ Use relative paths instead of localhost URLs`

**Fix:**
```typescript
// ❌ BEFORE
const url = 'http://localhost:3200/api/items';

// ✅ AFTER
import { API_CONFIG } from '@/config/api';
const url = `${API_CONFIG.workspace}/items`;
```

### Error: "Container not found"

**Symptoms:**
- Vite proxy returns 502 Bad Gateway
- `ECONNREFUSED` in terminal

**Fix:**
```bash
# 1. Check container is running
docker ps | grep workspace-api

# 2. Check Docker network
docker network inspect workspace-stack_default

# 3. Verify proxy target
grep "WORKSPACE_PROXY_TARGET" .env
```

---

## File Paths Cheatsheet

```
/home/marce/Projetos/TradingSystem/
├── .env                                           # ✅ EDIT THIS (centralized config)
├── frontend/dashboard/
│   ├── .env                                      # ❌ DELETE (violates governance)
│   ├── .env.local                                # ❌ DELETE (violates governance)
│   ├── .env.example                              # ✅ KEEP (documentation)
│   ├── vite.config.ts                            # Proxy configuration
│   ├── validate-env-vars.mjs                     # Build-time validation
│   └── src/
│       ├── config/
│       │   ├── api.ts                            # API client config
│       │   └── endpoints.ts                      # Service endpoints
│       └── components/
│           └── pages/                            # Components (check for hardcoded URLs)
```

---

## Environment Variable Catalog

### Browser-Facing (VITE_ prefix)

| Variable | Current Value | Type | Required |
|----------|---------------|------|----------|
| `VITE_WORKSPACE_API_URL` | `/api/workspace` | Relative path | Yes |
| `VITE_TP_CAPITAL_API_URL` | `/api/tp-capital` | Relative path | Yes |
| `VITE_DOCUMENTATION_API_URL` | `/api/docs` | Relative path | No (default) |
| `VITE_DOCUSAURUS_URL` | `/docs` | Relative path | No (default) |
| `VITE_USE_UNIFIED_DOMAIN` | `false` | Boolean | No |
| `VITE_TELEGRAM_GATEWAY_API_TOKEN` | `gw_secret_...` | Secret | Yes |
| `VITE_TP_CAPITAL_API_KEY` | `bbf913dad...` | Secret | Yes |
| `VITE_LLAMAINDEX_JWT` | `eyJhbGci...` | JWT | No |

### Server-Side (No VITE_ prefix)

| Variable | Value | Usage |
|----------|-------|-------|
| `WORKSPACE_PROXY_TARGET` | `http://workspace-api:3200/api` | Vite proxy |
| `TP_CAPITAL_PROXY_TARGET` | `http://tp-capital-api:4005` | Vite proxy |
| `DOCS_API_PROXY_TARGET` | `http://documentation-api:3405` | Vite proxy |
| `RAG_COLLECTIONS_PROXY_TARGET` | `http://rag-collections-api:3403` | Vite proxy |
| `FIRECRAWL_PROXY_TARGET` | `http://firecrawl-proxy:3600` | Vite proxy |
| `TELEGRAM_GATEWAY_PROXY_TARGET` | `http://telegram-gateway-api:4010` | Vite proxy |

---

## Decision Tree

```
┌─────────────────────────────────┐
│ Need to add environment variable │
└───────────┬─────────────────────┘
            │
            ▼
     Is it used in browser code?
            │
    ┌───────┴───────┐
    │               │
   Yes             No
    │               │
    ▼               ▼
Add VITE_      Add without
prefix         VITE_ prefix
    │               │
    ▼               ▼
Must be        Can be absolute
relative       URL (container
path           hostname)
(/api/...)
    │               │
    └───────┬───────┘
            ▼
    Add to root .env
    (not local .env!)
            │
            ▼
    Validate:
    npm run validate:env
            │
            ▼
    Rebuild:
    npm run build
```

---

## ESLint Quick Fixes

### Hardcoded localhost URL

```typescript
// ❌ Error: Hardcoded localhost URL
const API_URL = 'http://localhost:3200/api/items';

// ✅ Fix 1: Use API_CONFIG
import { API_CONFIG } from '@/config/api';
const API_URL = `${API_CONFIG.workspace}/items`;

// ✅ Fix 2: Use ENDPOINTS
import { ENDPOINTS } from '@/config/endpoints';
const API_URL = `${ENDPOINTS.workspace}/items`;

// ✅ Fix 3: Relative path directly
const API_URL = '/api/workspace/items';
```

### Container hostname

```typescript
// ❌ Error: Container hostname
const API_URL = 'http://workspace-api:3200/api/items';

// ✅ Fix: Relative path
const API_URL = '/api/workspace/items';
```

### Template literal

```typescript
// ❌ Error: Hardcoded URL in template
const url = `http://localhost:${port}/api/items`;

// ✅ Fix: Relative path
const url = `/api/workspace/items`;
```

---

## Pre-Commit Checklist

Before committing changes:

- [ ] No local `.env` files exist in `frontend/dashboard/`
- [ ] All env vars in root `.env` only
- [ ] Browser-facing vars use `VITE_` prefix
- [ ] Browser-facing URLs are relative paths
- [ ] Server-side proxy targets have NO `VITE_` prefix
- [ ] Validation passes: `npm run validate:env`
- [ ] ESLint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] API tests pass: `curl http://localhost:3103/api/workspace/items`

---

## References

- **Full Audit:** `FRONTEND-CONFIG-AUDIT-2025-11-07.md`
- **Solutions:** `FRONTEND-CONFIG-SOLUTIONS-2025-11-07.md`
- **Proxy Best Practices:** `docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md`
- **Governance:** `governance/controls/VALIDATION-GUIDE.md`

---

**Generated:** 2025-11-07 | **Maintained by:** Claude Code (Frontend Specialist)
