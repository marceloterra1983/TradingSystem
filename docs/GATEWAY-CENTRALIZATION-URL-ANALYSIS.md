---
title: Gateway Centralization - URL Analysis & Implementation
sidebar_position: 95
tags:
  - architecture
  - gateway
  - configuration
  - analysis
domain: infrastructure
type: analysis
summary: Complete analysis of all URLs in the system and recommendations for GATEWAY_PUBLIC_URL adoption
status: active
last_review: '2025-11-14'
---

# Gateway Centralization - URL Analysis & Implementation

**Date**: 2025-11-14
**Purpose**: Identify all URLs that should derive from `GATEWAY_PUBLIC_URL`

---

## 📊 URL Inventory & Classification

### Category 1: Public-Facing URLs (Should Use GATEWAY_PUBLIC_URL)

**These URLs are accessed FROM the browser or external clients:**

| Current Variable | Current URL | Should Be | Priority |
|------------------|-------------|-----------|----------|
| `N8N_BASE_URL` | `http://localhost:9080/n8n` | `${GATEWAY_PUBLIC_URL}/n8n` | ✅ DONE |
| `N8N_EDITOR_BASE_URL` | `http://localhost:9080/n8n` | `${GATEWAY_PUBLIC_URL}/n8n` | ✅ DONE |
| `N8N_API_BASE_URL` | `http://localhost:9080/n8n/api` | `${GATEWAY_PUBLIC_URL}/n8n/api` | ✅ DONE |
| `N8N_WEBHOOK_URL` | `http://localhost:9080/n8n/` | `${GATEWAY_PUBLIC_URL}/n8n/` | ✅ DONE |
| `WEBHOOK_URL` | `http://localhost:9080/n8n/` | `${GATEWAY_PUBLIC_URL}/n8n/` | ✅ DONE |
| `VITE_GATEWAY_HTTP_URL` | `http://localhost:9082` | `${GATEWAY_PUBLIC_URL}` | 🔄 TODO |
| `VITE_API_BASE_URL` | `http://localhost:3401` | `${GATEWAY_PUBLIC_URL}/api` | 🔄 TODO |
| `VITE_TELEGRAM_GATEWAY_API_URL` | `http://localhost:4010` | `${GATEWAY_PUBLIC_URL}/api/telegram-gateway` | 🔄 TODO |
| `EVOLUTION_API_PUBLIC_URL` | `http://localhost:4100` | `${GATEWAY_PUBLIC_URL}/api/evolution` | 🔄 TODO |
| `WAHA_PUBLIC_URL` | `http://localhost:3310` | `${GATEWAY_PUBLIC_URL}/api/waha` | 🔄 TODO |

---

### Category 2: Frontend-Only URLs (May Use GATEWAY_PUBLIC_URL)

**These are used in frontend for iframe embeds or navigation:**

| Current Variable | Current URL | Recommendation | Priority |
|------------------|-------------|----------------|----------|
| `VITE_N8N_URL` | `http://localhost:3680/n8n` | `${GATEWAY_PUBLIC_URL}/n8n` | 🔄 TODO |
| `VITE_KESTRA_BASE_URL` | `http://localhost:8180` | `${GATEWAY_PUBLIC_URL}/kestra` | ⚠️ FUTURE |
| `VITE_KESTRA_MANAGEMENT_URL` | `http://localhost:8685` | `${GATEWAY_PUBLIC_URL}/kestra/manage` | ⚠️ FUTURE |
| `VITE_PGADMIN_URL` | `http://localhost:5050` | `${GATEWAY_PUBLIC_URL}/pgadmin` | ⚠️ FUTURE |
| `VITE_PGWEB_URL` | `http://localhost:5052` | `${GATEWAY_PUBLIC_URL}/pgweb` | ⚠️ FUTURE |
| `VITE_ADMINER_URL` | `http://localhost:3910` | `${GATEWAY_PUBLIC_URL}/adminer` | ⚠️ FUTURE |
| `VITE_COURSE_CRAWLER_APP_URL` | `http://localhost:4201` | `${GATEWAY_PUBLIC_URL}/apps/course-crawler` (via `VITE_COURSE_CRAWLER_GATEWAY_PATH`) | ✅ DONE |
| `VITE_EVOLUTION_MANAGER_URL` | `http://localhost:4203/manager` | `${GATEWAY_PUBLIC_URL}/evolution/manager` | ⚠️ FUTURE |

---

### Category 3: Internal Container URLs (Should NOT Use GATEWAY_PUBLIC_URL)

**These are used for container-to-container communication:**

| Current Variable | Current URL | Action | Reason |
|------------------|-------------|--------|--------|
| `MTPROTO_SERVICE_URL` | `http://localhost:4007` | ✅ KEEP | Internal service discovery |
| `GATEWAY_SERVICE_URL` | `http://localhost:4007` | ✅ KEEP | Internal service discovery |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | ✅ KEEP | Direct container access |
| `LLAMAINDEX_QUERY_URL` | `http://localhost:8202` | ✅ KEEP | Internal API call |
| `LLAMAINDEX_INGESTION_URL` | `http://localhost:8201` | ✅ KEEP | Internal API call |
| `QDRANT_URL` | `http://localhost:6333` | ✅ KEEP | Direct database connection |
| `VITE_QDRANT_URL` | `http://localhost:6333` | ⚠️ PROXY | Should go via gateway for security |
| `COLLECTIONS_SERVICE_URL` | `http://localhost:3402` | ✅ KEEP | Internal service |
| `VITE_RAG_COLLECTIONS_URL` | `http://localhost:3403` | ⚠️ PROXY | Should go via gateway |
| `WAHA_BASE_URL` | `http://localhost:3310` | ✅ KEEP | Internal service |

---

### Category 4: CORS Configuration (Should Use GATEWAY_PUBLIC_URL)

**CORS origins should allow gateway URL:**

| Current Variable | Current Value | Should Be | Priority |
|------------------|---------------|-----------|----------|
| `CORS_ORIGIN` | `http://localhost:9080,...` | `${GATEWAY_PUBLIC_URL},...` | 🔄 TODO |
| `COURSE_CRAWLER_CORS_ORIGINS` | `http://localhost:9080,...` | `${GATEWAY_PUBLIC_URL},...` | 🔄 TODO |

---

## 🎯 Implementation Plan

### Phase 1: Critical Updates (Immediate) ✅ DONE

- [x] `N8N_*` variables → Use `${GATEWAY_PUBLIC_URL}/n8n`
- [x] `WEBHOOK_URL` → Use `${GATEWAY_PUBLIC_URL}/n8n/`
- [x] Create validation script
- [x] Create rollback script
- [x] Document changes

---

### Phase 2: Frontend Public URLs (High Priority) 🔄 IN PROGRESS

#### 2.1 Update .env.defaults

```bash
# Frontend - Public URLs (Browser Access)
VITE_GATEWAY_HTTP_URL=${GATEWAY_PUBLIC_URL}
VITE_API_BASE_URL=${GATEWAY_PUBLIC_URL}/api
VITE_TELEGRAM_GATEWAY_API_URL=${GATEWAY_PUBLIC_URL}/api/telegram-gateway
VITE_N8N_URL=${GATEWAY_PUBLIC_URL}/n8n
```

#### 2.2 Update CORS Configuration

```bash
# CORS - Allow Gateway URL
CORS_ORIGIN=${GATEWAY_PUBLIC_URL},http://localhost:3400,http://localhost:3401
COURSE_CRAWLER_CORS_ORIGINS=${GATEWAY_PUBLIC_URL},http://localhost:4201
```

#### 2.3 Update Docker Compose Files

**File**: `tools/compose/docker-compose.1-dashboard-stack.yml`

```yaml
environment:
  - VITE_GATEWAY_HTTP_URL=${GATEWAY_PUBLIC_URL}
  - VITE_API_BASE_URL=${GATEWAY_PUBLIC_URL}/api
  - VITE_TELEGRAM_GATEWAY_API_URL=${GATEWAY_PUBLIC_URL}/api/telegram-gateway
  - VITE_N8N_URL=${GATEWAY_PUBLIC_URL}/n8n
```

---

### Phase 3: Embedded Apps Routing (Medium Priority) ⚠️ FUTURE

**Requires Traefik routing configuration for each app:**

#### 3.1 Kestra Integration

```yaml
# Traefik labels for Kestra
- "traefik.http.routers.kestra.rule=PathPrefix(`/kestra`)"
- "traefik.http.services.kestra.loadbalancer.server.port=8180"
```

**Environment**:
```bash
VITE_KESTRA_BASE_URL=${GATEWAY_PUBLIC_URL}/kestra
```

#### 3.2 PgAdmin Integration

```yaml
# Traefik labels for PgAdmin
- "traefik.http.routers.pgadmin.rule=PathPrefix(`/pgadmin`)"
- "traefik.http.services.pgadmin.loadbalancer.server.port=5050"
```

**Environment**:
```bash
VITE_PGADMIN_URL=${GATEWAY_PUBLIC_URL}/pgadmin
```

#### 3.3 Other Admin Tools

Similar pattern for:
- PgWeb (`/pgweb`)
- Adminer (`/adminer`)
- Evolution Manager (`/evolution/manager`)

---

### Phase 4: Security Improvements (Medium Priority) ⚠️ FUTURE

**Problem**: Frontend directly accessing internal services exposes them

**Current State**:
```bash
# ❌ Frontend → Direct container access
VITE_QDRANT_URL=http://localhost:6333
VITE_RAG_COLLECTIONS_URL=http://localhost:3403
```

**Solution**: Proxy via Gateway

```bash
# ✅ Frontend → Gateway → Container
VITE_QDRANT_URL=${GATEWAY_PUBLIC_URL}/api/qdrant
VITE_RAG_COLLECTIONS_URL=${GATEWAY_PUBLIC_URL}/api/collections
```

**Requires**:
1. Add Traefik routes for these services
2. Add authentication middleware
3. Update frontend code to use new URLs

---

## 📋 Checklist de Implementação

### Phase 2 Tasks

#### Update .env.defaults

- [ ] Replace `VITE_GATEWAY_HTTP_URL` with `${GATEWAY_PUBLIC_URL}`
- [ ] Replace `VITE_API_BASE_URL` with `${GATEWAY_PUBLIC_URL}/api`
- [ ] Replace `VITE_TELEGRAM_GATEWAY_API_URL` with `${GATEWAY_PUBLIC_URL}/api/telegram-gateway`
- [ ] Replace `VITE_N8N_URL` with `${GATEWAY_PUBLIC_URL}/n8n`
- [ ] Update `CORS_ORIGIN` to include `${GATEWAY_PUBLIC_URL}`
- [ ] Update `COURSE_CRAWLER_CORS_ORIGINS` to include `${GATEWAY_PUBLIC_URL}`

#### Update Docker Compose Files

- [ ] `docker-compose.1-dashboard-stack.yml` - Update all VITE_ URLs
- [ ] `docker-compose.4-1-tp-capital-stack.yml` - Update CORS origins
- [ ] `docker-compose.4-5-course-crawler-stack.yml` - Update CORS origins

#### Update Frontend Code

- [ ] `frontend/dashboard/src/config/api.ts` - Use `VITE_GATEWAY_HTTP_URL`
- [ ] `frontend/dashboard/src/config/endpoints.ts` - Update hardcoded URLs
- [ ] `frontend/dashboard/vite.config.ts` - Update proxy configuration

#### Validate Changes

- [ ] Run validation script: `bash scripts/maintenance/validate-n8n-gateway-login.sh`
- [ ] Test dashboard loading
- [ ] Test all iframe embeds (n8n, databases, etc.)
- [ ] Test API calls from browser
- [ ] Verify CORS headers

---

## 🔍 Risk Analysis

### Low Risk (Safe to Change Now)

| Change | Risk Level | Mitigation |
|--------|------------|------------|
| `VITE_GATEWAY_HTTP_URL=${GATEWAY_PUBLIC_URL}` | 🟢 Low | Already equals `localhost:9082` |
| `VITE_N8N_URL=${GATEWAY_PUBLIC_URL}/n8n` | 🟢 Low | N8N already via gateway |
| CORS updates | 🟢 Low | Adding URL, not removing |

### Medium Risk (Test Thoroughly)

| Change | Risk Level | Mitigation |
|--------|------------|------------|
| `VITE_API_BASE_URL=${GATEWAY_PUBLIC_URL}/api` | 🟡 Medium | Test all API endpoints |
| `VITE_TELEGRAM_GATEWAY_API_URL=${GATEWAY_PUBLIC_URL}/api/telegram-gateway` | 🟡 Medium | Verify Traefik routing exists |

### High Risk (Future Phase)

| Change | Risk Level | Reason |
|--------|------------|--------|
| Proxy Qdrant via gateway | 🔴 High | Requires new Traefik config + auth |
| Proxy Collections service | 🔴 High | Requires new Traefik config + auth |
| Embed admin tools | 🔴 High | Complex routing + session handling |

---

## ✅ Validation Checklist

After each phase, verify:

### Browser Tests

- [ ] Dashboard loads: `http://localhost:9082/`
- [ ] N8N accessible: `http://localhost:9082/n8n/`
- [ ] Workspace API: `http://localhost:9082/api/workspace/items`
- [ ] Telegram Gateway: `http://localhost:9082/api/telegram-gateway/health`

### Network Tests

```bash
# Test gateway routing
curl -I http://localhost:9082/
curl -I http://localhost:9082/api/workspace/health
curl -I http://localhost:9082/n8n/
```

### CORS Tests

```bash
# Test CORS headers
curl -H "Origin: http://localhost:9082" -I http://localhost:9082/api/workspace/items
```

### Frontend Tests

- [ ] Dashboard → API calls work
- [ ] Dashboard → N8N iframe loads
- [ ] Dashboard → Database page works
- [ ] No console errors
- [ ] Session persistence works

---

## 📊 Impact Summary

### URLs Centralized (Phase 1) ✅

- N8N URLs: 5 variables
- Total reduction: ~80% (5 hardcoded → 1 base)

### URLs to Centralize (Phase 2) 🔄

- Frontend URLs: 4 variables
- CORS configuration: 2 variables
- Total reduction: ~85% (6 hardcoded → 1 base)

### URLs to Proxy (Phase 3+4) ⚠️

- Admin tools: 5 variables
- Internal services: 2 variables
- Total: 7 URLs requiring Traefik configuration

---

## 🎯 Next Steps

### Immediate (Today)

1. ✅ Implement Phase 2.1 (Update .env.defaults)
2. ✅ Implement Phase 2.2 (Update CORS)
3. ✅ Implement Phase 2.3 (Update Docker Compose)
4. ✅ Run validation tests
5. ✅ Document changes

### Short-term (This Week)

1. ⚠️ Plan Phase 3 (Admin tools routing)
2. ⚠️ Create Traefik configuration for Kestra
3. ⚠️ Create Traefik configuration for PgAdmin
4. ⚠️ Test embedded tools via gateway

### Long-term (Next Sprint)

1. 🔮 Plan Phase 4 (Security improvements)
2. 🔮 Proxy Qdrant via gateway with auth
3. 🔮 Proxy Collections service via gateway
4. 🔮 Add rate limiting to all public endpoints

---

## 📚 Related Documentation

- [Implementation Guide](./GATEWAY-CENTRALIZATION-IMPLEMENTATION.md)
- [Deployment Checklist](./DEPLOYMENT-CHECKLIST-GATEWAY-CENTRALIZATION.md)
- [Code Review](./GATEWAY-CENTRALIZATION-CODE-REVIEW.md)
- [Validation Script](../scripts/maintenance/validate-n8n-gateway-login.sh)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Next Review**: After Phase 2 implementation
