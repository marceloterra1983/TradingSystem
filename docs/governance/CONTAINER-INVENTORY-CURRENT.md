---
title: Container Inventory - Current State
tags: [inventory, docker, infrastructure]
domain: infrastructure
type: reference
summary: Inventário atual de containers Docker após padronização de nomenclatura
status: active
last_review: "2025-10-30"
---

# 📊 Inventário de Containers - TradingSystem (Atual)

**Data**: 2025-10-30
**Total de Containers**: 25
**Containers Healthy**: 5
**Status**: ✅ Todos operacionais após migração de nomenclatura

---

## 📱 APPS (Aplicações de Negócio) - 2 containers

| Container | Imagem | Porta | Status | Health |
|-----------|--------|-------|--------|--------|
| `apps-tpcapital` | `img-apps-tp-capital:latest` | 4005 | Running 2h | ✅ Healthy |
| `apps-workspace` | `img-apps-workspace:latest` | 3200 | Running 13h | ✅ Healthy |

**Função**: Aplicações principais do TradingSystem
- **apps-tpcapital**: Trading signals do canal TP Capital (Telegram → TimescaleDB)
- **apps-workspace**: Gerenciamento de ideias e documentação de workspace

---

## 🗄️ DATA (Bancos de Dados) - 9 containers

### TimescaleDB (Principal)

| Container | Imagem | Porta | Uptime | Função |
|-----------|--------|-------|--------|--------|
| `data-timescale` | `timescale/timescaledb:latest-pg16` | 5433 | 14h | ✅ Banco principal |
| `data-timescale-backup` | `timescale/timescaledb:latest-pg16` | 5434 | 26h | Backup/Replica |
| `data-timescale-admin` | `adminer:latest` | 8080 | 26h | Admin UI (Adminer) |
| `data-timescale-pgweb` | `sosedoff/pgweb` | 8081 | 14h | Web Interface |
| `data-timescale-pgadmin` | `dpage/pgadmin4` | 5050 | 14h | PgAdmin |
| `data-timescale-exporter` | `prometheuscommunity/postgres-exporter` | 9187 | 26h | Prometheus Metrics |

### Outros Bancos

| Container | Imagem | Porta | Uptime | Tipo |
|-----------|--------|-------|--------|------|
| `data-postgres-langgraph` | `postgres:15` | 5435 | 26h | PostgreSQL (LangGraph) |
| `data-questdb` | `questdb/questdb:latest` | 9000, 8812 | 26h | QuestDB (Time-series) |
| `data-qdrant` | `qdrant/qdrant` | 6333-6334 | 15h | Qdrant (Vector DB) |

**Bancos de Dados Ativos**:
- `tradingsystem` - Banco principal (schemas: tp_capital, telegram_gateway)
- `APPS-WORKSPACE` - Workspace items
- `APPS-TPCAPITAL` - TP Capital legacy
- `APPS-TELEGRAM-GATEWAY` - Gateway legacy

---

## 📚 DOCS (Documentação) - 2 containers

| Container | Imagem | Porta | Status | Health |
|-----------|--------|-------|--------|--------|
| `docs-hub` | `img-docs-hub:latest` | 3400 | Running 14h | ✅ Healthy |
| `docs-api` | `img-docs-api:latest` | 3401 | Running 2h | ✅ Healthy |

**Função**: Sistema de documentação
- **docs-hub**: Docusaurus v3 static site (NGINX)
- **docs-api**: FlexSearch + CRUD API para documentação

---

## 🛠️ TOOLS (Ferramentas) - 5 containers

| Container | Imagem | Porta | Uptime | Função |
|-----------|--------|-------|--------|--------|
| `tools-firecrawl-proxy` | `img-tools-firecrawl-proxy:latest` | 3600 | 26h | ✅ Healthy (Proxy) |
| `tools-firecrawl-api` | `nginx:alpine` | 3002 | 26h | Firecrawl API |
| `tools-firecrawl-playwright` | `nginx:alpine` | 3003 | 26h | Playwright |
| `tools-firecrawl-postgres` | `postgres:15` | 5436 | 26h | PostgreSQL |
| `tools-firecrawl-redis` | `redis:latest` | 6379 | 26h | Redis Cache |

**Função**: Web scraping e ferramentas de suporte (Firecrawl stack)

---

## 📊 MONITOR (Monitoramento) - 4 containers

| Container | Imagem | Porta | Uptime | Função |
|-----------|--------|-------|--------|--------|
| `monitor-prometheus` | `prom/prometheus:latest` | 9090 | 26h | Métricas |
| `monitor-grafana` | `grafana/grafana:latest` | 3000 | 26h | Dashboards |
| `monitor-alertmanager` | `prom/alertmanager:latest` | 9093 | 26h | Alertas |
| `monitor-alert-router` | `nginx:alpine` | 9094 | 26h | Roteamento |

**Função**: Observabilidade do sistema
- Coleta de métricas (Prometheus)
- Visualização (Grafana)
- Gerenciamento de alertas

---

## 🤖 RAG (Retrieval-Augmented Generation) - 3 containers

| Container | Imagem | Porta | Uptime | Função |
|-----------|--------|-------|--------|--------|
| `rag-ollama` | `ollama/ollama:latest` | 11435 | 15h | LLM Local |
| `rag-llamaindex-ingest` | `img-rag-llamaindex-ingest:latest` | 8201 | 2h | Ingestão RAG |
| `rag-llamaindex-query` | `img-rag-llamaindex-query:latest` | 8202 | 14h | Consultas RAG |

**Função**: Pipeline RAG para documentação
- LLM local (Ollama)
- Ingestão e indexação de documentos
- Sistema de consultas semânticas

---

## 📈 Resumo Executivo

### Status Geral
| Métrica | Valor |
|---------|-------|
| **Total de Containers** | 25 |
| **Containers Healthy** | 5 (com health check) |
| **Containers Running** | 25 (100%) |
| **Stacks Definidos** | 6 (apps, data, docs, tools, monitor, rag) |
| **Portas em Uso** | 3000-11435 |

### Distribuição por Stack
```
📱 APPS:     2 containers (8%)
🗄️ DATA:     9 containers (36%)
📚 DOCS:     2 containers (8%)
🛠️ TOOLS:    5 containers (20%)
📊 MONITOR:  4 containers (16%)
🤖 RAG:      3 containers (12%)
```

### Health Status
| Stack | Healthy | Total | % |
|-------|---------|-------|---|
| APPS | 2/2 | 2 | 100% |
| DOCS | 2/2 | 2 | 100% |
| TOOLS | 1/5 | 5 | 20% |
| DATA | 0/9 | 9 | 0% (sem health check) |
| MONITOR | 0/4 | 4 | 0% (sem health check) |
| RAG | 0/3 | 3 | 0% (sem health check) |

### Uptime Analysis
| Uptime | Quantidade | Stacks |
|--------|-----------|--------|
| < 3h | 3 | apps-tpcapital, docs-api, rag-llamaindex-ingest |
| 13-15h | 5 | apps-workspace, docs-hub, data-timescale, data-qdrant, rag-ollama, rag-llamaindex-query |
| 24-26h | 17 | Maioria (data, tools, monitor) |

---

## 🔗 Networks Docker

| Network | Containers |
|---------|-----------|
| `tradingsystem_backend` | apps-*, docs-api |
| `tradingsystem_frontend` | docs-hub |
| `tools_default` | tools-*, rag-* |
| `monitoring_default` | monitor-* |
| `firecrawl_default` | tools-firecrawl-* |

---

## 🎯 Serviços Públicos (Portas Expostas)

### Frontend/UI
- **3000** - Grafana (Dashboards)
- **3103** - Dashboard Principal (React + Vite)
- **3400** - Documentation Hub (Docusaurus)
- **5050** - PgAdmin
- **8080** - Adminer
- **8081** - PgWeb

### APIs
- **3200** - Workspace API
- **3401** - Documentation API
- **4005** - TP Capital API
- **3600** - Firecrawl Proxy

### Bancos de Dados
- **5433** - TimescaleDB (Principal)
- **5434** - TimescaleDB (Backup)
- **5435** - PostgreSQL (LangGraph)
- **5436** - PostgreSQL (Firecrawl)
- **6333** - Qdrant (Vector DB)
- **9000** - QuestDB (Web Console)

### Monitoring
- **9090** - Prometheus
- **9093** - AlertManager
- **9094** - Alert Router
- **9187** - TimescaleDB Exporter

### RAG/AI
- **8201** - LlamaIndex Ingestion
- **8202** - LlamaIndex Query
- **11435** - Ollama

---

## ✅ Validação Pós-Migração (2025-10-30)

### Containers Renomeados (21 total)

#### Stack APPS
- ✅ `apps-tp-capital` → `apps-tpcapital`

#### Stack DATA
- ✅ `data-timescaledb` → `data-timescale`
- ✅ `data-timescaledb-backup` → `data-timescale-backup`
- ✅ `data-timescaledb-adminer` → `data-timescale-admin`
- ✅ `data-timescaledb-pgweb` → `data-timescale-pgweb`
- ✅ `data-timescaledb-pgadmin` → `data-timescale-pgadmin`
- ✅ `data-timescaledb-exporter` → `data-timescale-exporter`
- ✅ `data-postgress-langgraph` → `data-postgres-langgraph` (typo corrigido)

#### Stack DOCS
- ✅ `documentation` → `docs-hub`

#### Stack TOOLS (antes: sem prefixo)
- ✅ `firecrawl-proxy` → `tools-firecrawl-proxy`
- ✅ `firecrawl-api` → `tools-firecrawl-api`
- ✅ `firecrawl-playwright` → `tools-firecrawl-playwright`
- ✅ `firecrawl-postgres` → `tools-firecrawl-postgres`
- ✅ `firecrawl-redis` → `tools-firecrawl-redis`

#### Stack MONITOR (antes: mon-)
- ✅ `mon-prometheus` → `monitor-prometheus`
- ✅ `mon-grafana` → `monitor-grafana`
- ✅ `mon-alertmanager` → `monitor-alertmanager`
- ✅ `mon-alert-router` → `monitor-alert-router`

#### Stack RAG (antes: tools- ou sem prefixo)
- ✅ `ollama` → `rag-ollama`
- ✅ `tools-llamaindex-ingestion` → `rag-llamaindex-ingest`
- ✅ `tools-llamaindex-query` → `rag-llamaindex-query`

### Testes de Conectividade
- ✅ Dashboard (3103) - Respondendo
- ✅ Workspace API (3200) - Healthy
- ✅ Documentation Hub (3400) - Healthy
- ✅ Documentation API (3401) - Healthy
- ✅ TP Capital (4005) - Healthy
- ✅ Firecrawl Proxy (3600) - Healthy
- ✅ TimescaleDB (tradingsystem) - Conectado

### Health Checks
- ✅ 5/5 containers com health check = Healthy
- ✅ 0 erros de conectividade
- ✅ 0 containers parados

---

## 📝 Próximos Passos

- [ ] Atualizar compose files com novos nomes
- [ ] Rebuild imagens com prefixo `img-{stack}-{service}`
- [ ] Remover imagens antigas (SHA hashes)
- [ ] Atualizar scripts de deploy
- [ ] Atualizar documentação de projeto (README, CLAUDE.md)
- [ ] Configurar labels `com.tradingsystem.stack` nos containers

---

## 🔗 Documentação Relacionada

- [Container Naming Convention](./CONTAINER-NAMING-CONVENTION.md) - Convenção de nomenclatura
- [Migration Script](../../scripts/docker/migrate-container-names.sh) - Script de migração
- [Docker Overview](../content/tools/docker/overview.mdx) - Visão geral do Docker no projeto
- [Architecture](../content/reference/architecture/containerization.md) - Arquitetura de containers

---

**Última Atualização**: 2025-10-30 às 11:45 UTC
**Status**: ✅ Migração concluída com sucesso - Sistema 100% operacional
