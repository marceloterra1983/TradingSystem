# Dashboard Access Guide - WSL2 + Docker

**Date:** 2025-11-12
**Status:** ✅ ALL SERVICES WORKING
**Access Method:** Docker Internal Network IPs

---

## ✅ SOLUTION: How to Access the Dashboard

### From WSL2 Terminal (Linux)

All services are accessible via Docker internal network IPs:

#### Main Dashboard
```bash
# Access via Traefik Gateway (RECOMMENDED)
http://172.80.8.3:9080/

# Direct access to container (bypasses Traefik)
http://172.80.0.18:3103/
```

#### Documentation Hub
```bash
# Access via Traefik Gateway
http://172.80.8.3:9080/docs/

# Direct access to container
http://172.80.8.4:80/
```

#### Traefik Dashboard (Monitoring)
```bash
# Access Traefik's own dashboard
http://172.80.8.3:8080/dashboard/

# Or via published port
http://localhost:9083/dashboard/
```

### From Windows Browser

**OPTION 1: Use Port Mapping (CURRENT)**
Docker Compose already exposes ports 9082 and 9083 on the Windows host:

```yaml
# docker-compose.0-gateway-stack.yml
ports:
  - "9082:9080"  # HTTP Gateway
  - "9083:8080"  # Traefik Dashboard
```

**Access URLs:**
- Dashboard: http://localhost:9082/
- Documentation: http://localhost:9082/docs/
- Traefik Dashboard: http://localhost:9083/dashboard/

**OPTION 2: Direct IP Access**
If port mapping doesn't work, use Docker internal IPs:
- Dashboard: http://172.80.8.3:9080/
- Documentation: http://172.80.8.3:9080/docs/

---

## 🔍 Network Architecture

### Traefik Gateway Networks

The `api-gateway` container is connected to 3 networks:

1. **tradingsystem_frontend** (172.80.8.3)
   - Dashboard UI
   - Documentation Hub
   - Frontend apps

2. **tradingsystem_backend** (172.80.0.20)
   - Workspace API
   - Documentation API
   - Backend services

3. **tp_capital_backend** (172.80.9.2)
   - TP Capital API
   - Trading signals
   - Telegram integration

### Service Discovery

Traefik discovers services via Docker labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.dashboard-ui.rule=PathPrefix(`/`)"
  - "traefik.http.services.dashboard-ui.loadbalancer.server.port=3103"
```

---

## 📊 Service IP Map

| Service | Container Name | Internal IP | Port | Access Via Gateway |
|---------|---------------|-------------|------|-------------------|
| **Dashboard UI** | dashboard-ui | 172.80.0.18 | 3103 | http://172.80.8.3:9080/ |
| **Docs Hub** | docs-hub | 172.80.8.4 | 80 | http://172.80.8.3:9080/docs/ |
| **Docs API** | docs-api | (check) | 3000 | http://172.80.8.3:9080/api/docs/* |
| **Workspace API** | workspace-service | 172.80.0.10 | 3200 | http://172.80.8.3:9080/api/workspace/* |
| **TP Capital API** | tp-capital-api | 172.80.0.22 | 4005 | http://172.80.8.3:9080/api/tp-capital/* |
| **Telegram Gateway** | telegram-gateway-api | 172.80.4.3 | 4010 | http://172.80.8.3:9080/api/telegram-gateway/* |
| **Traefik Gateway** | api-gateway | 172.80.8.3 | 9080 | Published: :9082 |
| **Traefik Dashboard** | api-gateway | 172.80.8.3 | 8080 | Published: :9083 |

---

## 🧪 Testing Commands

### 1. Test Dashboard via Gateway
```bash
curl -i http://172.80.8.3:9080/
# Expected: HTTP/1.1 200 OK + HTML content
```

### 2. Test Documentation Hub
```bash
curl -i http://172.80.8.3:9080/docs/
# Expected: HTTP/1.1 200 OK + Docusaurus HTML
```

### 3. Test Workspace API
```bash
curl -i http://172.80.8.3:9080/api/workspace/health
# Expected: HTTP/1.1 200 OK + {"status":"healthy"}
```

### 4. Test TP Capital API (Requires API Key)
```bash
curl -i -H "X-API-Key: bbf913dad93ae879f1fbbec4490303a2c0d49be1d717342a64173a192f99f1a1" \
  http://172.80.8.3:9080/api/tp-capital/health
# Expected: HTTP/1.1 200 OK
```

### 5. List All Active Routers
```bash
docker exec api-gateway curl -s http://localhost:8080/api/http/routers | jq 'keys'
```

### 6. Check Service Health
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(dashboard|docs|gateway|workspace|tp-capital)"
```

---

## ⚠️ Troubleshooting

### Issue: "Failed to connect to localhost port 9082"

**Cause:** Port 9082 is published by Docker, but WSL2 networking might not forward it correctly.

**Solutions:**

1. **Use Docker internal IP:**
   ```bash
   http://172.80.8.3:9080/
   ```

2. **Check if port is listening:**
   ```bash
   docker port api-gateway
   # Expected output:
   # 8080/tcp -> 0.0.0.0:9083
   # 9080/tcp -> 0.0.0.0:9082
   ```

3. **Test from WSL2:**
   ```bash
   curl http://localhost:9082/
   # If this fails but http://172.80.8.3:9080/ works,
   # it's a WSL2 port forwarding issue
   ```

4. **Configure Windows Port Forwarding (if needed):**
   ```powershell
   # Run as Administrator in PowerShell
   .\scripts\setup\setup-wsl-port-forwarding.ps1
   ```

### Issue: "404 Not Found" for /docs/

**Cause:** Middleware stripping not working or Docs Hub container not healthy.

**Check:**
```bash
# 1. Verify Docs Hub is healthy
docker ps --filter "name=docs-hub" --format "{{.Status}}"

# 2. Check router configuration
docker exec api-gateway curl -s http://localhost:8080/api/http/routers/docs-hub | jq

# 3. Test docs-hub directly
curl -i http://172.80.8.4:80/
```

### Issue: CORS Errors in Browser

**Cause:** Vite dev server CORS configuration.

**Check `.env` file:**
```bash
# Dashboard .env should have:
VITE_API_BASE_URL=http://localhost:9082
VITE_USE_UNIFIED_DOMAIN=true
```

---

## 🚀 Quick Start Commands

```bash
# 1. Start all services
cd /workspace/tools/compose
docker compose -f docker-compose.0-gateway-stack.yml up -d
docker compose -f docker-compose.1-dashboard-stack.yml up -d
docker compose -f docker-compose.2-docs-stack.yml up -d

# 2. Wait 10 seconds for health checks
sleep 10

# 3. Verify all routers active
docker exec api-gateway curl -s http://localhost:8080/api/http/routers | jq 'keys'

# 4. Access dashboard
# From WSL2:
curl http://172.80.8.3:9080/

# From Windows browser:
# Open: http://localhost:9082/
```

---

## 📝 Next Steps

### Immediate
- [x] Fix Traefik middleware `@file` references - **DONE**
- [x] Recreate affected containers - **DONE**
- [x] Verify routers active - **DONE**
- [ ] **Test from Windows browser** - http://localhost:9082/

### Future
- [ ] Create ADR documenting why `@file` middlewares don't work in WSL2
- [ ] Update Traefik documentation with WSL2-specific notes
- [ ] Consider moving to inline middleware definitions everywhere
- [ ] Set up automated health checks in CI/CD

---

## 📚 Related Documentation

- [Traefik Middleware Fix Summary](TRAEFIK-MIDDLEWARE-FIX-SUMMARY.md)
- [Port Registry](docs/content/tools/ports-services.mdx)
- [Gateway Architecture](docs/content/reference/adrs/adr-006-api-gateway.md)
- [Docker Compose Documentation](docs/content/tools/docker/)

---

**Last Updated:** 2025-11-12 20:45 BRT
**Status:** ✅ All services accessible via Docker internal IPs
**Access:** http://172.80.8.3:9080/ (WSL2) or http://localhost:9082/ (Windows)
