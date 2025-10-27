---
title: Inventário de Serviços
description: Inventário completo de serviços e containers
tags:
  - reference
  - inventory
owner: DocsOps
lastReviewed: '2025-10-27'
---

# Inventário de Serviços - TradingSystem

**Data**: 2025-10-25
**Status**: Documentação completa de containers e serviços locais

> **📋 Nova Estratégia de Containerização**
> Uma análise completa de quais serviços devem ser containerizados está disponível em **[CONTAINERIZATION-STRATEGY.md](CONTAINERIZATION-STRATEGY.md)**.
> Destaque: **TP Capital será dividido em 2 camadas** (Gateway local + API containerizada) - veja proposta OpenSpec completa.

---

## 📦 CONTAINERS DOCKER (29 rodando)

> **🎉 NOVO**: Workspace API e TP Capital API agora containerizados!
>
> - ✅ `workspace-service` (Port 3200) - Healthy
> - ✅ `tp-capital-api` (Port 4005) - Healthy

### 📋 Lista Completa de Containers

| # | Container | Imagem | Porta(s) | Status | Categoria |
|---|-----------|--------|----------|--------|-----------|
| 1 | **tp-capital-api** | apps-tp-capital-api | 4005 | ✅ Healthy | Application Services |
| 2 | **workspace-service** | apps-workspace | 3200 | ✅ Healthy | Application Services |
| 3 | **data-timescaledb** | timescale/timescaledb:latest-pg16 | 5433 | ✅ Up 17h | Databases |
| 4 | **data-timescaledb-backup** | img-data-timescaledb-backup | 5434 | ✅ Up 17h | Databases |
| 5 | **data-postgress-langgraph** | img-data-postgress-langgraph | 5435 | ✅ Up 17h | Databases |
| 6 | **firecrawl-postgres** | img-firecrawl-postgres | 5436 | ✅ Up 17h | Databases |
| 7 | **data-questdb** | questdb/questdb:latest | 8812, 9000, 9009 | ✅ Up 17h | Databases |
| 8 | **data-qdrant** | img-data-qdrant | 6333 | ✅ Up 17h | Databases |
| 9 | **firecrawl-redis** | img-firecrawl-redis | 6379 | ✅ Up 17h | Databases |
| 10 | **data-timescaledb-adminer** | adminer:latest | 8080 | ✅ Up 17h | Database Tools |
| 11 | **data-timescaledb-pgadmin** | dpage/pgadmin4:latest | 5050 | ✅ Up 17h | Database Tools |
| 12 | **data-timescaledb-pgweb** | sosedoff/pgweb:latest | 8081 | ✅ Up 17h | Database Tools |
| 13 | **data-timescaledb-exporter** | img-data-timescaledb-exporter | 9187 | ✅ Up 17h | Database Tools |
| 14 | **mon-prometheus** | img-mon-prometheus | 9090 | ✅ Up 17h | Monitoring |
| 15 | **mon-grafana** | img-mon-grafana | 3000 | ✅ Up 17h | Monitoring |
| 16 | **mon-alertmanager** | img-mon-alertmanager | 9093 | ✅ Up 17h | Monitoring |
| 17 | **mon-alert-router** | img-mon-alert-router | 9094 | ✅ Up 17h | Monitoring |
| 18 | **ollama** | img-ollama | 11434 | ✅ Up 17h | AI/ML |
| 19 | **tools-langgraph** | img-infra-langgraph | 8111 | ✅ Healthy | AI/ML |
| 20 | **tools-agno-agents** | img-infra-agno-agents | 8200 | ✅ Healthy | AI/ML |
| 21 | **infra-llamaindex-ingestion** | img-infra-llamaindex-ingestion | 8201 | ✅ Up 17h | AI/ML |
| 22 | **infra-llamaindex-query** | img-infra-llamaindex-query | 8202 | ✅ Up 17h | AI/ML |
| 23 | **data-frontend-apps** | img-data-frontend-apps | 3001 | ✅ Up 17h | AI/ML |
| 24 | **docs-api** | nginx:latest | 3400 | ✅ Healthy | Documentation |
| 25 | **docs-api-viewer** | nginx:alpine | 3101 | ⚠️ Unhealthy | Documentation |
| 26 | **firecrawl-api** | nginx:alpine | 3002 | ✅ Up 17h | Web Scraping |
| 27 | **firecrawl-playwright** | img-firecrawl-playwright | 3003 | ✅ Up 17h | Web Scraping |
| 28 | **firecrawl-proxy** | img-firecrawl-proxy | 3600 | ✅ Healthy | Web Scraping |
| 29 | **individual-containers-registry** | img-outros-containers-registry | 5000 | ✅ Up 17h | Infrastructure |

---

### 🚀 Application Services (2 containers - NOVO)

| Container | Imagem | Porta | Status | Propósito |
|-----------|---------|-------|--------|-----------|
| **tp-capital-api** | apps-tp-capital-api | 4005 | ✅ Up (healthy) | TP Capital REST API + Business Logic |
| **workspace-service** | apps-workspace | 3200 | ✅ Up (healthy) | Workspace API (Idea Bank CRUD) |

**URLs Application Services**:

- TP Capital API: <http://localhost:4005>
- Workspace API: <http://localhost:3200>

---

### 🗄️ Databases (7 containers)

| Container | Imagem | Porta | Status | Propósito |
|-----------|---------|-------|--------|-----------|
| **data-timescaledb** | timescale/timescaledb:latest-pg16 | 5433 | ✅ Up 6h | TimescaleDB principal (TP Capital) |
| **data-timescaledb-backup** | img-data-timescaledb-backup | 5434 | ✅ Up 6h | Backup TimescaleDB |
| **data-postgress-langgraph** | img-data-postgress-langgraph | 5435 | ✅ Up 6h | PostgreSQL para LangGraph |
| **firecrawl-postgres** | img-firecrawl-postgres | 5436 | ✅ Up 6h | PostgreSQL para Firecrawl |
| **data-questdb** | questdb/questdb:latest | 8812, 9000, 9009 | ✅ Up 6h | QuestDB (analytics/time-series) |
| **data-qdrant** | img-data-qdrant | 6333 | ✅ Up 6h | Vector database (embeddings) |
| **firecrawl-redis** | img-firecrawl-redis | 6379 | ✅ Up 6h | Redis cache para Firecrawl |

**Portas Database**:

- TimescaleDB: `5433` (principal), `5434` (backup)
- PostgreSQL: `5435` (LangGraph), `5436` (Firecrawl)
- QuestDB: `8812` (HTTP), `9000` (Web UI), `9009` (InfluxDB)
- Qdrant: `6333` (gRPC)
- Redis: `6379`

---

### 🛠️ Database Tools (4 containers)

| Container | Imagem | Porta | Status | Propósito |
|-----------|---------|-------|--------|-----------|
| **data-timescaledb-adminer** | adminer:latest | 8080 | ✅ Up 6h | Adminer (PHP DB manager) |
| **data-timescaledb-pgadmin** | dpage/pgadmin4:latest | 5050 | ✅ Up 6h | PgAdmin4 (PostgreSQL GUI) |
| **data-timescaledb-pgweb** | sosedoff/pgweb:latest | 8081 | ✅ Up 6h | PgWeb (lightweight PostgreSQL web UI) |
| **data-timescaledb-exporter** | img-data-timescaledb-exporter | 9187 | ✅ Up 6h | Prometheus exporter para TimescaleDB |

**URLs Database Tools**:

- Adminer: <http://localhost:8080>
- PgAdmin: <http://localhost:5050>
- PgWeb: <http://localhost:8081>
- TimescaleDB Exporter: <http://localhost:9187/metrics>

---

### 📊 Monitoring Stack (4 containers)

| Container | Imagem | Porta | Status | Propósito |
|-----------|---------|-------|--------|-----------|
| **mon-prometheus** | img-mon-prometheus | 9090 | ✅ Up 6h | Prometheus (metrics collector) |
| **mon-grafana** | img-mon-grafana | 3000 | ✅ Up 6h | Grafana (dashboards) |
| **mon-alertmanager** | img-mon-alertmanager | 9093 | ✅ Up 6h | Alertmanager (alerting) |
| **mon-alert-router** | img-mon-alert-router | 9094 | ✅ Up 6h | Alert routing service |

**URLs Monitoring**:

- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3000>
- Alertmanager: <http://localhost:9093>
- Alert Router: <http://localhost:9094>

---

### 🤖 AI/ML Stack (6 containers)

| Container | Imagem | Porta | Status | Propósito |
|-----------|---------|-------|--------|-----------|
| **ollama** | img-ollama | 11434 | ✅ Up 6h | Ollama (local LLMs) |
| **tools-langgraph** | img-infra-langgraph | 8111 | ✅ Up 6h (healthy) | LangGraph workflows |
| **tools-agno-agents** | img-infra-agno-agents | 8200 | ✅ Up 6h (healthy) | Agno AI agents |
| **infra-llamaindex-ingestion** | img-infra-llamaindex-ingestion | 8201 | ✅ Up 6h | LlamaIndex ingestion |
| **infra-llamaindex-query** | img-infra-llamaindex-query | 8202 | ✅ Up 6h | LlamaIndex query |
| **data-frontend-apps** | img-data-frontend-apps | 3001 | ✅ Up 6h | Frontend AI apps |

**URLs AI/ML**:

- Ollama: <http://localhost:11434>
- LangGraph: <http://localhost:8111>
- Agno Agents: <http://localhost:8200>
- LlamaIndex Ingestion: <http://localhost:8201>
- LlamaIndex Query: <http://localhost:8202>
- Frontend AI Apps: <http://localhost:3001>

---

### 🌐 Documentation & APIs (3 containers)

| Container | Imagem | Porta | Status | Propósito |
|-----------|---------|-------|--------|-----------|
| **docs-api** | nginx:latest | 3400 | ✅ Up 6h (healthy) | Documentation API (FlexSearch) |
| **docs-api-viewer** | nginx:alpine | 3101 | ⚠️ Up 6h (unhealthy) | API viewer (DEPRECATED - use 3205) |
| **firecrawl-proxy** | img-firecrawl-proxy | 3600 | ✅ Up 6h (healthy) | Firecrawl proxy service |

**URLs Documentation**:

- Documentation API: <http://localhost:3400>
- API Viewer (OLD): <http://localhost:3101> ⚠️ DEPRECATED
- Firecrawl Proxy: <http://localhost:3600>

**IMPORTANTE**: `docs-api-viewer` (3101) está **DEPRECATED**. Usar novo API Viewer no Dashboard (3103/#/docs → DocsAPI) ou Docusaurus (3205/api/*).

---

### 🔍 Web Scraping Stack (3 containers)

| Container | Imagem | Porta | Status | Propósito |
|-----------|---------|-------|--------|-----------|
| **firecrawl-api** | nginx:alpine | 3002 | ✅ Up 6h | Firecrawl API |
| **firecrawl-playwright** | img-firecrawl-playwright | 3003 | ✅ Up 6h | Playwright browser automation |
| **firecrawl-proxy** | img-firecrawl-proxy | 3600 | ✅ Up 6h (healthy) | Firecrawl proxy/gateway |

**URLs Firecrawl**:

- Firecrawl API: <http://localhost:3002>
- Firecrawl Playwright: <http://localhost:3003>
- Firecrawl Proxy: <http://localhost:3600>

---

### 🔧 Infrastructure (1 container)

| Container | Imagem | Porta | Status | Propósito |
|-----------|---------|-------|--------|-----------|
| **individual-containers-registry** | img-outros-containers-registry | 5000 | ✅ Up 6h | Docker Registry (private images) |

**URL**: <http://localhost:5000>

---

## 🚀 SERVIÇOS LOCAIS (Node.js)

> **📦 Migração para Containers em Andamento**
>
> - ✅ **Workspace API** → Migrado para container `workspace-service`
> - ✅ **TP Capital API** → Migrado para container `tp-capital-api`
> - 🔜 **TP Capital Gateway** → Será criado como serviço local (systemd) - veja proposta OpenSpec

### ✅ Rodando (0 serviços principais)

**Todos os serviços principais foram containerizados! 🎉**

Os serviços Workspace API e TP Capital API agora rodam como containers Docker (veja seção "Application Services" acima).

---

### ⚠️ Transição para Containers

| Serviço (Antigo) | Status | Novo Container | Porta |
|------------------|--------|----------------|-------|
| ~~Workspace API (local)~~ | ✅ Migrado | `workspace-service` | 3200 |
| ~~TP Capital (local)~~ | ✅ Migrado | `tp-capital-api` | 4005 |

---

### ❌ NÃO Rodando (Serviços de Desenvolvimento)

| Serviço | Porta | Tecnologia | Propósito | Como Iniciar |
|---------|-------|------------|-----------|--------------|
| **Dashboard** | 3103 | React + Vite | Frontend principal (dev) | `cd frontend/dashboard && npm run dev` |
| **Docusaurus** | 3205 | Docusaurus v3 | Documentation site (dev) | `cd docs/docusaurus && npm run start -- --port 3205` |

**Nota**: Dashboard e Docusaurus são mantidos locais em **desenvolvimento** para hot-reload. Em produção, serão containerizados.

---

## 📋 RESUMO GERAL

### Por Categoria

| Categoria | Containers | Serviços Locais | Total |
|-----------|-----------|-----------------|-------|
| **Application Services** | 2 (Workspace, TP Capital) | 0 | 2 |
| **Databases** | 7 | 0 | 7 |
| **Database Tools** | 4 | 0 | 4 |
| **Monitoring** | 4 | 0 | 4 |
| **AI/ML** | 6 | 0 | 6 |
| **Documentation** | 2 | 1 (Docusaurus - parado) | 3 |
| **Web Scraping** | 3 | 0 | 3 |
| **Frontend** | 1 (Frontend Apps) | 1 (Dashboard - parado) | 2 |
| **Infrastructure** | 1 (Registry) | 0 | 1 |
| **TOTAL** | **29** | **2** | **31** |

---

### Status Atual

| Status | Containers | Serviços Locais |
|--------|-----------|-----------------|
| ✅ **Rodando** | 29/29 (100%) | 0/2 (0%) |
| ⚠️ **Unhealthy** | 1 (docs-api-viewer) | 0 |
| ❌ **Parado** | 0 | 2 (Dashboard, Docusaurus) |

---

## 🔌 MAPA DE PORTAS COMPLETO

### 3000-3999 (APIs & Frontend)

| Porta | Serviço | Tipo | Status |
|-------|---------|------|--------|
| 3000 | Grafana | Container | ✅ Running |
| 3001 | Frontend AI Apps | Container | ✅ Running |
| 3002 | Firecrawl API | Container | ✅ Running |
| 3003 | Firecrawl Playwright | Container | ✅ Running |
| 3101 | API Viewer (OLD) | Container | ⚠️ DEPRECATED |
| **3103** | **Dashboard** | **Local Node.js (dev)** | ❌ **Not Running** |
| **3200** | **Workspace API** | **Container** | ✅ **Running (Healthy)** |
| **3205** | **Docusaurus** | **Local Node.js (dev)** | ❌ **Not Running** |
| 3400 | Documentation API | Container | ✅ Running |
| 3600 | Firecrawl Proxy | Container | ✅ Running |

### 4000-4999 (Custom APIs)

| Porta | Serviço | Tipo | Status |
|-------|---------|------|--------|
| **4005** | **TP Capital API** | **Container** | ✅ **Running (Healthy)** |

### 5000-5999 (Databases & Registry)

| Porta | Serviço | Tipo | Status |
|-------|---------|------|--------|
| 5000 | Docker Registry | Container | ✅ Running |
| 5050 | PgAdmin4 | Container | ✅ Running |
| 5433 | TimescaleDB | Container | ✅ Running |
| 5434 | TimescaleDB Backup | Container | ✅ Running |
| 5435 | PostgreSQL (LangGraph) | Container | ✅ Running |
| 5436 | PostgreSQL (Firecrawl) | Container | ✅ Running |

### 6000-6999 (Cache & Vector DB)

| Porta | Serviço | Tipo | Status |
|-------|---------|------|--------|
| 6333 | Qdrant | Container | ✅ Running |
| 6379 | Redis | Container | ✅ Running |

### 8000-8999 (AI/ML & Tools)

| Porta | Serviço | Tipo | Status |
|-------|---------|------|--------|
| 8080 | Adminer | Container | ✅ Running |
| 8081 | PgWeb | Container | ✅ Running |
| 8111 | LangGraph | Container | ✅ Running |
| 8200 | Agno Agents | Container | ✅ Running |
| 8201 | LlamaIndex Ingestion | Container | ✅ Running |
| 8202 | LlamaIndex Query | Container | ✅ Running |
| 8812 | QuestDB HTTP | Container | ✅ Running |

### 9000-9999 (Monitoring & QuestDB)

| Porta | Serviço | Tipo | Status |
|-------|---------|------|--------|
| 9000 | QuestDB Web UI | Container | ✅ Running |
| 9009 | QuestDB InfluxDB | Container | ✅ Running |
| 9090 | Prometheus | Container | ✅ Running |
| 9093 | Alertmanager | Container | ✅ Running |
| 9094 | Alert Router | Container | ✅ Running |
| 9187 | TimescaleDB Exporter | Container | ✅ Running |

### 11000-11999 (AI Models)

| Porta | Serviço | Tipo | Status |
|-------|---------|------|--------|
| 11434 | Ollama | Container | ✅ Running |

---

## 📂 DOCKER COMPOSE FILES

### Localização: `tools/compose/`

| Arquivo | Propósito | Containers |
|---------|-----------|-----------|
| `docker-compose.timescale.yml` | TimescaleDB + Tools | 5 (TimescaleDB, Backup, Adminer, PgAdmin, PgWeb, Exporter) |
| `docker-compose.monitoring.yml` | Prometheus Stack | 4 (Prometheus, Grafana, Alertmanager, Alert Router) |
| `docker-compose.database.yml` | QuestDB + Qdrant | 2 (QuestDB, Qdrant) |
| `docker-compose.docs.yml` | Documentation APIs | 2 (docs-api, docs-api-viewer) |
| `docker-compose.firecrawl.yml` | Firecrawl Stack | 5 (API, Playwright, Proxy, PostgreSQL, Redis) |
| `docker-compose.infrastructure.yml` | AI/ML Infrastructure | 6 (LangGraph, Agno, LlamaIndex x2, Ollama, Frontend Apps, LangGraph DB) |
| `docker-compose.individual.yml` | Registry | 1 (Docker Registry) |

### Como Gerenciar

```bash
# Iniciar stack específica
docker compose -f tools/compose/docker-compose.timescale.yml up -d

# Parar stack específica
docker compose -f tools/compose/docker-compose.timescale.yml down

# Ver logs
docker compose -f tools/compose/docker-compose.timescale.yml logs -f

# Ver status
docker compose -f tools/compose/docker-compose.timescale.yml ps
```

---

## 🎯 PRÓXIMOS PASSOS

### Para Iniciar Ambiente de Desenvolvimento

```bash
# 1. Containers já estão rodando ✅
docker ps  # Confirmar 29 containers UP (incluindo workspace-service e tp-capital-api)

# 2. Iniciar Dashboard (Port 3103) - Dev apenas
cd frontend/dashboard
npm install
npm run dev

# 3. Iniciar Docusaurus (Port 3205) - Dev apenas
cd docs/docusaurus
npm install
npm run start -- --port 3205

# 4. Verificar tudo rodando
bash scripts/check-apis.sh

# Ou testar Application Services containerizados
curl http://localhost:3200/api/items   # Workspace API
curl http://localhost:4005/health      # TP Capital API
```

### Verificação Rápida

```bash
# Containers
docker ps | wc -l
# Deve retornar: 30 (29 containers + header)

# Containers rodando
docker ps --format "{{.Names}}" | wc -l
# Deve retornar: 29

# Serviços locais (dev apenas)
lsof -i -P -n | grep LISTEN | grep -E ":(3103|3205)"
# Deve mostrar: 3103 (Dashboard), 3205 (Docusaurus) - apenas em dev
```

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### 1. **docs-api-viewer (Port 3101) - DEPRECATED**

Container `docs-api-viewer` está **unhealthy** e **DEPRECATED**.

**Motivo**: Novo API Viewer integrado no Dashboard (3103/#/docs → DocsAPI) com Swagger UI, RapiDoc e Redoc.

**Ação**: Pode ser removido futuramente.

### 2. **TP Capital - Porta Correta**

**Porta correta**: **4005** (não 3200!)

TP Capital NÃO tem conflito com Workspace API (3200). Ambos podem rodar simultaneamente.

### 3. **Workspace API - Dual Persistence**

Workspace API (3200) usa:

- **LowDB** (development) - arquivo JSON local
- **QuestDB** (production) - container na porta 9000

### 4. **TimescaleDB vs PostgreSQL**

Projeto usa **TimescaleDB** (5433) para time-series (TP Capital), não PostgreSQL padrão.

PostgreSQL padrão usado apenas para:

- LangGraph (5435)
- Firecrawl (5436)

### 5. **Firecrawl Stack Completo**

Firecrawl possui 5 containers:

- API (3002)
- Playwright (3003)
- Proxy (3600)
- PostgreSQL (5436)
- Redis (6379)

---

## 📊 HEALTH CHECK COMPLETO

### Script Automatizado

```bash
# Executar
bash scripts/check-apis.sh

# Ou via Service Launcher API
curl http://localhost:3500/api/health/full | jq
```

### Manual

```bash
# Containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Serviços locais (dev apenas)
lsof -i -P -n | grep LISTEN | grep -E ":(3103|3205)"

# Teste de conectividade - Application Services (containerizados)
curl -s http://localhost:3200/api/items        # Workspace API (container)
curl -s http://localhost:4005/health           # TP Capital API (container)

# Teste de conectividade - Outros serviços
curl -s http://localhost:3400/api/docs         # Documentation API
curl -s http://localhost:3600/api/health       # Firecrawl Proxy
```

---

**Última Atualização**: 2025-10-25
**Containers Rodando**: 29/29 (100%)
**Serviços Locais Rodando**: 0/2 (0%) - Dashboard e Docusaurus em dev apenas
**Status Geral**: ✅ Todos os serviços principais containerizados! Dashboard + Docusaurus rodando localmente em dev
