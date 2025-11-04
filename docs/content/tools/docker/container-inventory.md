---
title: "Docker Container Inventory"
description: "Snapshot of core TradingSystem containers with status and roles."
tags:
  - tools
  - docker
  - ops
owner: OpsGuild
lastReviewed: '2025-11-02'
---
# 📊 Inventário de Containers - Trading System

## 📱 APPS (Aplicações)

| Container | Imagem | Status | Health |
|-----------|--------|--------|--------|
| `apps-tp-capital` | `img-apps-tp-capital:latest` | ⏱️ 7 minutos | ✅ Healthy |
| `apps-workspace` | `img-apps-workspace:latest` | ⏱️ 11 horas | ✅ Healthy |

---

## 🗄️ DATABASE (Bancos de Dados)

| Container | Imagem | Status | Tipo |
|-----------|--------|--------|------|
| `data-timescaledb` | `timescale/timescaledb:latest-pg16` | ⏱️ 12 horas | TimescaleDB (Principal) ✅ |
| `data-timescaledb-backup` | `timescale/timescaledb:latest-pg16` | ⏱️ 22 horas | TimescaleDB (Backup) |
| `data-timescaledb-adminer` | `adminer:latest` | ⏱️ 22 horas | Admin UI |
| `data-timescaledb-pgweb` | `sosedoff/pgweb` | ⏱️ 12 horas | Web Interface |
| `data-timescaledb-pgadmin` | `dpage/pgadmin4` | ⏱️ 12 horas | PgAdmin |
| `data-timescaledb-exporter` | `prometheuscommunity/postgres-exporter:latest` | ⏱️ 22 horas | Metrics Exporter |
| `data-postgress-langgraph` | `postgres:15` | ⏱️ 22 horas | PostgreSQL (LangGraph) |
| `data-questdb` | `questdb/questdb:latest` | ⏱️ 22 horas | QuestDB |
| `data-qdrant` | `qdrant/qdrant` | ⏱️ 13 horas | Qdrant (Vector DB) |

---

## 📚 DOCUMENTATION (Documentação)

| Container | Imagem | Status | Health |
|-----------|--------|--------|--------|
| `docs-api` | `docs-api:latest` | ⏱️ 6 minutos | ✅ Healthy |
| `documentation` | `sha256:46d16bc...` | ⏱️ 12 horas | ✅ Healthy |

---

## 🕷️ FIRECRAWL (Web Scraping)

| Container | Imagem | Status | Health |
|-----------|--------|--------|--------|
| `firecrawl-proxy` | `img-firecrawl-proxy:latest` | ⏱️ 22 horas | ✅ Healthy |
| `firecrawl-api` | `nginx:alpine` | ⏱️ 22 horas | - |
| `firecrawl-playwright` | `nginx:alpine` | ⏱️ 22 horas | - |
| `firecrawl-postgres` | `postgres:15` | ⏱️ 22 horas | - |
| `firecrawl-redis` | `redis:latest` | ⏱️ 22 horas | - |

---

## 📊 MONITORING (Monitoramento)

| Container | Imagem | Status | Função |
|-----------|--------|--------|--------|
| `mon-prometheus` | `prom/prometheus:latest` | ⏱️ 22 horas | Coleta de Métricas |
| `mon-grafana` | `grafana/grafana:latest` | ⏱️ 22 horas | Visualização |
| `mon-alertmanager` | `prom/alertmanager:latest` | ⏱️ 22 horas | Gerenciamento de Alertas |
| `mon-alert-router` | `nginx:alpine` | ⏱️ 22 horas | Roteamento de Alertas |

---

## 🛠️ TOOLS (Ferramentas)

| Container | Imagem | Status | Função |
|-----------|--------|--------|--------|
| `tools-llamaindex-ingestion` | `sha256:59392dd...` | ⏱️ 7 minutos | Ingestão de Dados |
| `tools-llamaindex-query` | `sha256:5f10ba8...` | ⏱️ 12 horas | Consultas RAG |
| `ollama` | `ollama/ollama:latest` | ⏱️ 13 horas | LLM Local |

---

## 📈 Resumo Executivo

### Status Geral
- **Total de Containers:** 30
- **Containers Saudáveis:** 8 (com health check)
- **Containers em Execução:** 30 (100%)

### Análise de Uptime
| Uptime | Quantidade | Containers |
|--------|-----------|-----------|
| < 1 hora | 3 | `apps-tp-capital`, `docs-api`, `tools-llamaindex-ingestion` |
| 11-13 horas | 6 | `apps-workspace`, `documentation`, `data-timescaledb`, `data-timescaledb-pgweb`, `data-timescaledb-pgadmin`, `ollama`, `data-qdrant`, `tools-llamaindex-query` |
| 22 horas | 21 | Infraestrutura principal (databases, monitoring, firecrawl) |

### Serviços por Categoria
```
📱 Apps:          2 containers (6.7%)
🗄️ Databases:     9 containers (30%)
📚 Documentation: 2 containers (6.7%)
🕷️ Firecrawl:     5 containers (16.7%)
📊 Monitoring:    4 containers (13.3%)
🛠️ Tools:         3 containers (10%)
📈 TradingSystem: 5 containers (16.7%)
```

### 🔴 Containers Recém-Reiniciados (< 1h)
Estes containers foram reiniciados recentemente e merecem atenção:
1. **apps-tp-capital** (7 min)
2. **docs-api** (6 min)
3. **tools-llamaindex-ingestion** (7 min)

### 💚 Saúde do Sistema
**Containers com Health Check Ativo:**
- ✅ apps-tp-capital
- ✅ apps-workspace
- ✅ data-timescaledb
- ✅ docs-api
- ✅ documentation
- ✅ firecrawl-proxy

---

**Última atualização:** 30 de outubro de 2025













