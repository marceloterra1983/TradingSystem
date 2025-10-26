# CORS Configuration Update Validation Guide

**Date:** 2025-10-25  
**Objective:** Confirm that all CORS updates replacing port 3004 with 3205 are applied and services accept cross-origin requests.  
**Scope:** apps/status, apps/tp-capital, backend/api/firecrawl-proxy, apps/b3-market-data, and Docker docs stack.

---

## 1. Pre-Validation Checklist

- [ ] All source files updated according to migration plan
- [ ] No affected services running (prevents stale caches)
- [ ] `.env` does not override `CORS_ORIGIN` with legacy ports
- [ ] Browser cache cleared or incognito session ready
- [ ] Docker docs stack stopped (if previously running)

---

## 2. Service-by-Service Validation

### 2.1 apps/status/server.js (Port 3500)

```bash
# 1. Confirm code references
grep -n "3004" apps/status/server.js
grep -n "3205" apps/status/server.js

# 2. Start service
cd apps/status
npm run dev &
SERVICE_PID=$!
sleep 5

# 3. Dashboard origin (3101)
curl -H "Origin: http://localhost:3101" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -I http://localhost:3500/api/status

# 4. Docusaurus origin (3205)
curl -H "Origin: http://localhost:3205" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -I http://localhost:3500/api/status

# 5. Health check data
curl http://localhost:3500/api/status | jq '.services[] | select(.id=="docusaurus")'

# 6. Stop service
kill $SERVICE_PID
```

**Status:** [ ] PASSED / [ ] FAILED  
**Notes:** ______________________________________

---

### 2.2 apps/tp-capital/src/server.js (Port 3200)

```bash
# 1. Confirm code references
grep -n "3004" apps/tp-capital/src/server.js
grep -n "3205" apps/tp-capital/src/server.js

# 2. Start service
cd apps/tp-capital
npm run dev &
SERVICE_PID=$!
sleep 5

# 3. CORS preflight
curl -H "Origin: http://localhost:3205" \
     -X OPTIONS \
     -I http://localhost:3200/health

# 4. Sample request
curl -H "Origin: http://localhost:3205" \
     http://localhost:3200/signals?limit=5

# 5. Stop service
kill $SERVICE_PID
```

**Status:** [ ] PASSED / [ ] FAILED  
**Notes:** ______________________________________

---

### 2.3 backend/api/firecrawl-proxy/src/server.js (Port 3600)

```bash
# 1. Confirm code references
grep -n "3004" backend/api/firecrawl-proxy/src/server.js
grep -n "3205" backend/api/firecrawl-proxy/src/server.js

# 2. Start service
cd backend/api/firecrawl-proxy
npm run dev &
SERVICE_PID=$!
sleep 5

# 3. CORS preflight
curl -H "Origin: http://localhost:3205" \
     -X OPTIONS \
     -I http://localhost:3600/health

# 4. Root endpoint
curl -H "Origin: http://localhost:3205" \
     http://localhost:3600/

# 5. Stop service
kill $SERVICE_PID
```

**Status:** [ ] PASSED / [ ] FAILED  
**Notes:** ______________________________________

---

### 2.4 apps/b3-market-data/src/config.js (Port 3302)

```bash
# 1. Confirm code references
grep -n "3004" apps/b3-market-data/src/config.js
grep -n "3205" apps/b3-market-data/src/config.js

# 2. Verify overrides
grep -E "B3_API_CORS_ORIGIN|CORS_ORIGIN" .env

# 3. Start service
cd apps/b3-market-data
npm run dev &
SERVICE_PID=$!
sleep 5

# 4. CORS preflight
curl -H "Origin: http://localhost:3205" \
     -X OPTIONS \
     -I http://localhost:3302/health

# 5. Stop service
kill $SERVICE_PID
```

**Status:** [ ] PASSED / [ ] FAILED  
**Notes:** ______________________________________

---

## 3. Docker Compose Validation

### 3.1 Volume Mount Update

```bash
# 1. Confirm code references
grep -n "docs/spec" tools/compose/docker-compose.docs.yml
grep -n "docs/static/specs" tools/compose/docker-compose.docs.yml

# 2. Ensure directory exists
ls -la docs/static/specs/

# 3. Restart stack
docker compose -f tools/compose/docker-compose.docs.yml down -v
docker compose -f tools/compose/docker-compose.docs.yml up -d

# 4. Inspect logs
docker compose -f tools/compose/docker-compose.docs.yml logs docs-api-viewer

# 5. Validate served files
curl http://localhost:3101/
curl http://localhost:3101/ | grep -o "href=\"[^\"]*\"" | head -5

# 6. Teardown
docker compose -f tools/compose/docker-compose.docs.yml down
```

**Status:** [ ] PASSED / [ ] FAILED  
**Notes:** ______________________________________

---

## 4. Integration Testing

### 4.1 Dashboard → Backend APIs

```bash
bash scripts/core/start-all.sh
sleep 30

# Launch dashboard (command depends on OS)
xdg-open http://localhost:3101 2>/dev/null || open http://localhost:3101
```

**Validation:**  
- Observe DevTools network tab for successful requests  
- Confirm `Access-Control-Allow-Origin` includes `http://localhost:3205` where applicable  
- Ensure pages relying on tp-capital and b3-market-data load data without CORS errors

**Status:** [ ] PASSED / [ ] FAILED  
**Notes:** ______________________________________

---

### 4.2 Docusaurus → Backend APIs

```bash
cd docs
npm run start -- --port 3205 &
DOCS_PID=$!
sleep 10
xdg-open http://localhost:3205 2>/dev/null || open http://localhost:3205

# After manual validation
kill $DOCS_PID
```

**Validation:**  
- Navigate to API documentation pages using live requests  
- Exercise “Try it out” flows and confirm responses succeed  
- Monitor browser console for CORS warnings

**Status:** [ ] PASSED / [ ] FAILED  
**Notes:** ______________________________________

---

## 5. Environment Variable Review

```bash
grep -E "CORS_ORIGIN|B3_API_CORS_ORIGIN" .env
grep "3205" .env
if [ -f .env.local ]; then
  grep -E "CORS_ORIGIN" .env.local
fi
```

**Checks:**  
- No lingering `3004` references in environment files  
- Overrides include `http://localhost:3205`

**Status:** [ ] PASSED / [ ] FAILED  
**Notes:** ______________________________________

---

## 6. Troubleshooting

- **CORS error persists:** Restart services and clear browser cache (`pkill -f "node.*dev"` then rerun startup scripts).  
- **Docker viewer missing specs:** Confirm `docs/static/specs` populated, rebuild stack with `docker compose -f tools/compose/docker-compose.docs.yml up -d`.  
- **Docusaurus health check failing:** Ensure nothing else binds to port 3205 and restart docs site.

---

## 7. Final Validation Checklist

- [ ] All backend services validated with port 3205 origins
- [ ] Docker docs stack serving specs from `docs/static/specs`
- [ ] Documentation links updated in `.env.example`
- [ ] Dashboard and Docusaurus integration confirmed
- [ ] No remaining references to port 3004 in active configuration
- [ ] Validation notes captured for audit trail

---

## 8. Sign-off

- **Validated by:** _____________________  
- **Date:** _____________________  
- **Status:** [ ] APPROVED / [ ] NEEDS REWORK  
- **Next steps:** ______________________________________

