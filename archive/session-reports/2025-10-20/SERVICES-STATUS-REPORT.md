# 📊 Services Status Report

**Date**: 2025-10-16  
**Time**: Current  
**Status**: ✅ **Dashboard Running** | ⚠️ Most services stopped

---

## 🐳 Docker Containers Status

### Data Layer (`data-*`)

| Container | Status | Health | Ports |
|-----------|--------|--------|-------|
| data-timescaledb | ❌ Stopped | - | 5433 (→5432) |
| data-timescaledb-backup | ❌ Stopped | - | - |
| data-timescaledb-exporter | ❌ Stopped | - | 9187 |
| data-timescaledb-pgadmin | ❌ Stopped | - | 5050 |
| data-timescaledb-pgweb | ❌ Stopped | - | 8081 |

### AI & Infrastructure (`infra-*`)

| Container | Status | Health | Ports |
|-----------|--------|--------|-------|
| **infra-langgraph** | ❌ Stopped | - | 8111 |
| data-qdrant | ❌ Stopped | - | 6333, 6334 |
| infra-llamaindex-ingestion | ❌ Stopped | - | Internal |
| infra-llamaindex-query | ❌ Stopped | - | 3450 |
| infra-agno-agents | ❌ Stopped | - | 8200 |
| data-postgress-langgraph | ❌ Stopped | - | 5432 |
| data-questdb | ❌ Stopped | - | 9002, 9010, 8813 |

### Monitoring (`mon-*`)

| Container | Status | Health | Ports |
|-----------|--------|--------|-------|
| mon-prometheus | ❌ Stopped | - | 9090 |
| mon-alertmanager | ❌ Stopped | - | 9093 |
| mon-grafana | ❌ Stopped | - | 3000 |
| mon-alert-router | ❌ Stopped | - | 8080 |

### Documentation (`docs-*`)

| Container | Status | Health | Ports |
|-----------|--------|--------|-------|
| **docs-api** | ✅ Running | ✅ Healthy | 3400 |
| docs-docusaurus | ❌ Stopped | - | 3004 |
| docs-api-viewer | ❌ Stopped | - | 3101 |

### Firecrawl Stack (`firecrawl-*`)

| Container | Status | Health | Ports |
|-----------|--------|--------|-------|
| firecrawl-api | ❌ Stopped | - | 3002 |
| firecrawl-playwright | ❌ Stopped | - | Internal (3000) |
| firecrawl-redis | ❌ Stopped | - | Internal (6379) |
| firecrawl-postgres | ❌ Stopped | - | Internal (5432) |

### Applications (`apps-*`)

| Container | Status | Health | Ports |
|-----------|--------|--------|-------|

### LangGraph Dev Sandbox

| Container | Status | Health | Ports |
|-----------|--------|--------|-------|
| infra-langgraph-dev | ❌ Stopped | - | 8112 |
| infra-redis-dev | ❌ Stopped | - | 6380 |
| infra-postgres-dev | ❌ Stopped | - | 5443 |

---

## 🚀 Node.js Services Status

| Service | Port | Status | Type |
|---------|------|--------|------|
| **Workspace API** | 3100 | ❌ DOWN | Node.js/Express |
| **Dashboard** | 3103 | ❌ DOWN | React/Vite |
| **TP Capital** | 3200 | ❌ DOWN | Node.js/Express |
| **B3 Market Data** | 3302 | ❌ DOWN | Node.js/Express |
| **Documentation API** | 3400 | ✅ OK | Docker Container |
| **Service Launcher** | 3500 | ❌ DOWN | Node.js/Express |
| **Docusaurus** | 3004 | ✅ OK | Node.js/Docusaurus |

---

## ⚠️ Issues Detected

### 1. TimescaleDB Stopped
- **Status**: Containers `data-timescaledb*` parados
- **Action**: Iniciar stack de dados: `docker compose -f infrastructure/compose/docker-compose.timescale.yml up -d`
- **Impacto**: Armazenamento de dados indisponível até religar

### 2. Most Services Stopped
- **Stopped**: 26 containers
- **Running**: 2 containers
- **Action**: Restart stacks if needed

### 3. Dashboard Not Running
- **Issue**: Port 3103 was blocked by duplicate process
- **Action**: Cleaned up, ready to restart

---

## 🔧 How to Fix

### Start All Stacks
```bash
# From project root
bash start-all-stacks.sh
```

### Start Individual Services

#### Dashboard (Port 3103)
```bash
cd frontend/apps/dashboard
npm run dev
```

#### Workspace API (Port 3200)
```bash
cd backend/api/workspace
npm run dev
```

#### TP Capital (Port 3200)
```bash
cd frontend/apps/tp-capital
npm run dev
```

#### B3 Market Data (Port 3302)
```bash
cd frontend/apps/b3-market-data
npm run dev
```

#### Service Launcher (Port 3500)
```bash
cd frontend/apps/service-launcher
npm run dev
```

---

## 📋 Quick Actions

### Start Dashboard Only
```bash
cd /home/marce/projetos/TradingSystem/frontend/apps/dashboard
npm run dev
```

### Start All Docker Stacks
```bash
cd /home/marce/projetos/TradingSystem
bash start-all-stacks.sh
```

### Check TimescaleDB Health
```bash
docker logs data-timescaledb --tail 50
docker exec -it data-timescaledb pg_isready -U "${TIMESCALEDB_USER:-timescale}"
```

---

**Generated**: 2025-10-16  
**Purpose**: Service status verification after performance optimizations
