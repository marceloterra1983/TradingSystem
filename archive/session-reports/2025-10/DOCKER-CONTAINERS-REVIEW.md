# Docker Containers Review - TradingSystem Linux Environment

**Date:** 2025-10-12
**Environment:** WSL2 Ubuntu
**Project:** TradingSystem

---

## 📊 Current Container Status

### ✅ Running Successfully (9 containers)

| Container | Image | Status | Ports | Purpose |
|-----------|-------|--------|-------|---------|
| **tp-capital-questdb-1** | questdb/questdb:7.3.3 | Up 40m | 9000, 8812, 9009 | Time-series database for market data |
| **tp-capital-tp-capital-ingestion-1** | tp-capital-tp-capital-ingestion | Up 40m | 4005 | TP Capital signal ingestion service |
| **tradingsystem-prometheus** | prom/prometheus:v2.55.1 | Up 40m | 9090 | Metrics collection and monitoring |
| **tradingsystem-grafana** | grafana/grafana:11.2.0 | Up 40m | 3000 | Metrics visualization |
| **flowise** | flowiseai/flowise:latest | Up 3h | 3100 | AI workflow automation |
| **b3-sistema** | b3-b3-system | Up 38h | 8082 | B3 market system (healthy) |
| **b3-dashboard** | b3-b3-dashboard | Up 38h | 3000 (internal) | B3 dashboard UI |
| **b3-cron** | b3-b3-cron | Up 38h | - | B3 scheduled tasks |
| **traefik** | traefik:v2.10 | Up 38h | 80, 443, 8080-8081 | Reverse proxy |

### ⚠️ Restarting/Failing (3 containers)

| Container | Image | Issue | Root Cause |
|-----------|-------|-------|------------|
| **tradingsystem-dashboard** | dashboard-dashboard | Restarting (1) | Invalid `--host` option passed to npm-run-all |
| **tradingsystem-docs** | docs-docusaurus | Restarting (1) | Missing dependency: `@akebifiky/remark-simple-plantuml` |
| **tradingsystem-alertmanager** | prom/alertmanager:v0.27.0 | Restarting (1) | Config error: "unsupported scheme for URL" in alertmanager.yml |
| **tradingsystem-alert-router** | monitoring-alert-router | Restarting (1) | Likely depends on alertmanager |

### 🔌 Supporting Infrastructure (6 containers)

| Container | Image | Status | Purpose |
|-----------|-------|--------|---------|
| **evolution_api** | atendai/evolution-api:v2.1.1 | Up 38h (unhealthy) | WhatsApp API integration |
| **evolution_postgres** | postgres:15-alpine | Up 38h (healthy) | Evolution API database |
| **evolution_redis** | redis:7-alpine | Up 38h (healthy) | Evolution API cache |
| **n8n** | n8nio/n8n:latest | Up 38h | Workflow automation |
| **n8n_postgres** | postgres:15-alpine | Up 38h (healthy) | N8N database |
| **portainer** | portainer/portainer-ce:latest | Up 38h | Docker management UI |

---

## 🏗️ Architecture Analysis

### Services Moved to Linux/Docker

Based on the current setup and CLAUDE.md, the following services are now containerized:

#### ✅ Successfully Containerized

1. **Documentation System** (port 3004)
   - Location: `docs/`
   - Docker Compose: `docs/docker-compose.yml`
   - Status: ⚠️ Failing (missing dependency)

2. **Dashboard** (port 5173)
   - Location: `frontend/apps/dashboard/`
   - Docker Compose: `frontend/apps/dashboard/docker-compose.yml`
   - Status: ⚠️ Failing (config issue)

3. **Monitoring Stack** (ports 9090, 3000, 9093)
   - Location: `infrastructure/monitoring/`
   - Services: Prometheus, Grafana, Alertmanager, Alert-Router
   - Status: Partial (Prometheus & Grafana OK, Alertmanager failing)

4. **TP Capital Stack** (ports 9000, 4005)
   - Location: `frontend/apps/tp-capital/infrastructure/`
   - Services: QuestDB + Signal Ingestion
   - Status: ✅ Fully operational

#### ⚠️ Should NOT Be Containerized (Per CLAUDE.md)

According to CLAUDE.md, these **MUST RUN NATIVELY ON WINDOWS**:

1. **Data Capture Service** (C# + ProfitDLL)
   - Reason: ProfitDLL is Windows-native 64-bit DLL
   - Latency: < 500ms required (Docker adds 10-50ms)

2. **Order Manager Service** (C# + Risk Engine)
   - Reason: Direct ProfitDLL integration for order execution
   - Latency: Critical for trading

3. **Analytics Pipeline** (Python + ML)
   - Reason: Disk I/O performance (Docker ~30% slower)
   - Direct NVMe/SSD access required

#### ✅ Appropriate for Docker (Auxiliary Services)

1. **Documentation Hub** - Non-critical, developer tool
2. **Dashboard UI** - Frontend only, no trading logic
3. **Monitoring Stack** - Observability, not in critical path
4. **TP Capital Ingestion** - Signal processing (not order execution)

---

## 🐛 Issues & Fixes

### Issue #1: Dashboard Container Restarting

**Error:**
```
ERROR: Invalid Option: --host
```

**Root Cause:**
The `--host` flag is being passed to `npm-run-all` instead of to the underlying Vite command.

**Current Docker Compose:**
```yaml
command: ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

**Fix Location:** `frontend/apps/dashboard/docker-compose.yml:10`

**Solution:**
```yaml
# Option 1: Fix in docker-compose.yml
command: ["npm", "run", "dev"]  # Remove --host from docker-compose

# Option 2: Update package.json script
# In frontend/apps/dashboard/package.json:
"dev:vite": "vite --host 0.0.0.0"
```

---

### Issue #2: Docs Container Missing Dependency

**Error:**
```
Cannot find module '@akebifiky/remark-simple-plantuml'
```

**Root Cause:**
The Dockerfile doesn't properly install all dependencies, or node_modules volume is stale.

**Fix Location:** `docs/Dockerfile` or `docs/docker-compose.yml`

**Solution:**

```bash
# Quick fix (rebuild container):
cd docs
docker compose down
docker compose build --no-cache
docker compose up -d

# OR install missing package:
cd docs
npm install @akebifiky/remark-simple-plantuml
docker compose restart docusaurus
```

**Permanent Fix - Update Dockerfile:**
```dockerfile
# In docs/Dockerfile
RUN npm install && npm cache clean --force
```

---

### Issue #3: Alertmanager Configuration Error

**Error:**
```
Loading configuration file failed: unsupported scheme "" for URL
```

**Root Cause:**
The `alertmanager.yml` config has an invalid webhook URL (likely using environment variable `$SLACK_WEBHOOK_URL` that's empty).

**Fix Location:** `infrastructure/monitoring/alertmanager/alertmanager.yml`

**Current Config (likely):**
```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: $SLACK_WEBHOOK_URL  # Empty or invalid
```

**Solution:**

```bash
# Option 1: Set the environment variable
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Option 2: Use default receiver without webhook
# Edit infrastructure/monitoring/alertmanager/alertmanager.yml:
receivers:
  - name: 'default'
    # Remove slack_configs if not configured

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
```

---

### Issue #4: Alert Router Dependency

**Status:** Restarting

**Root Cause:**
Depends on Alertmanager, which is failing. Will resolve automatically once Alertmanager is fixed.

---

## 📋 Docker Compose Files Inventory

### Active Compose Files

1. **`infrastructure/monitoring/docker-compose.yml`**
   - Services: Prometheus, Grafana, Alertmanager, Alert-Router, Node-Exporter
   - Network: monitoring
   - Status: Partial (2/4 services running)

2. **`docs/docker-compose.yml`**
   - Services: Docusaurus (dev + prod)
   - Status: Failing (missing dependency)

3. **`frontend/apps/tp-capital/infrastructure/docker-compose.yml`**
   - Services: QuestDB, TP Capital Ingestion
   - Status: ✅ Running

4. **`frontend/apps/dashboard/docker-compose.yml`**
   - Services: Dashboard (Vite dev server)
   - Status: Failing (config error)

## 🎯 Recommended Actions

### Priority 1: Fix Failing Containers

```bash
# 1. Fix Dashboard
cd frontend/apps/dashboard
# Edit package.json: add --host to dev:vite script
docker compose down
docker compose up -d

# 2. Fix Docs
cd docs
npm install @akebifiky/remark-simple-plantuml
docker compose restart docusaurus

# 3. Fix Alertmanager
cd infrastructure/monitoring
# Edit alertmanager/alertmanager.yml: remove or configure Slack webhook
docker compose restart alertmanager
docker compose restart alert-router
```

### Priority 2: Clean Up Unused Images

```bash
# Remove dangling images
docker image prune -f

# Remove unused images (free up 15+ GB)
docker image rm \
  docs-new-docusaurus \
  docs-mkdocs \
  tp_capital_ver2-telegram-bot \
  tp_capital_ver2-web \
  tp_capital_ver2-api \
  docker-local-b3-system \
  docker-local-b3-cron
```

### Priority 3: Document Container Strategy

Create `docs/architecture/decisions/ADR-000X-container-strategy.md` documenting:
- Which services run in Docker (auxiliary)
- Which services run native Windows (core trading)
- Rationale for each decision

### Priority 4: Health Checks

Add health checks to all containerized services:

```yaml
# Example for dashboard
services:
  dashboard:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## 📊 Resource Usage

```bash
# Current Docker resource usage
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

**Estimated:**
- Running containers: ~2-3GB RAM
- Images: ~30GB disk space
- Reclaimable (unused images): ~15GB

---

## 🔄 Migration Status

### Migrated to Linux/Docker ✅

- [x] Documentation Hub (Docusaurus)
- [x] Dashboard UI (React + Vite)
- [x] Monitoring Stack (Prometheus + Grafana)
- [x] TP Capital Signals (QuestDB + Ingestion)
- [x] Supporting infrastructure (n8n, Portainer, Evolution API)

### Staying on Windows Native ✅

- [x] Data Capture (C# + ProfitDLL) - **MUST BE WINDOWS**
- [x] Order Manager (C# + Risk Engine) - **MUST BE WINDOWS**
- [x] Analytics Pipeline (Python + ML) - **Windows preferred for performance**

### Architecture Alignment

The current Docker setup **correctly follows** the CLAUDE.md architecture:
- ✅ Core trading services NOT containerized (per requirement)
- ✅ Auxiliary services containerized (appropriate)
- ✅ Monitoring/observability in Docker (best practice)

---

## 🚀 Next Steps

1. **Immediate:** Fix the 3 failing containers (see Priority 1 above)
2. **Short-term:** Clean up unused Docker images (free 15GB)
3. **Medium-term:** Add health checks and proper logging
4. **Long-term:** Consider Kubernetes for production (optional)

---

## 📝 Notes

- Total containers running: 18
- Docker images: 40+ (many unused)
- Network strategy: Bridge networks per stack (monitoring, tp-capital, etc.)
- Volume strategy: Named volumes for persistence, bind mounts for development

**Evolution API Status:**
The `evolution_api` container shows "unhealthy" but is still running. This is not critical to TradingSystem functionality (it's for WhatsApp integration).

---

## 🔗 Related Documentation

- [CLAUDE.md](CLAUDE.md) - Project guidelines (Docker restrictions)
- [LINUX-SETUP-CHECKLIST.md](LINUX-SETUP-CHECKLIST.md) - Linux migration checklist
- [README.md](README.md) - Project overview

---

**Review completed:** 2025-10-12 02:15 UTC
**Environment:** WSL2 Ubuntu on Windows
**Docker version:** Check with `docker --version`
