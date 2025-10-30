---
title: Container Naming Convention
tags: [governance, docker, infrastructure]
domain: infrastructure
type: standard
summary: Convenção de nomenclatura para containers Docker no TradingSystem
status: proposed
last_review: "2025-10-30"
---

# Container Naming Convention - TradingSystem

## 📋 Objetivo

Estabelecer uma convenção de nomenclatura clara, consistente e escalável para todos os containers Docker do projeto TradingSystem.

## 🎯 Princípios

1. **Clareza**: Nome deve indicar stack, serviço e função
2. **Consistência**: Todos seguem o mesmo padrão
3. **Brevidade**: Nomes curtos mas descritivos
4. **Escalabilidade**: Suporta crescimento do sistema
5. **Manutenibilidade**: Fácil identificar e agrupar

---

## 📐 Padrão de Nomenclatura

### Formato Geral

```
{stack}-{service}[-{function}]

Onde:
  stack    = Categoria principal (apps, data, docs, tools, monitor, rag)
  service  = Nome do serviço (máx 12 chars, kebab-case)
  function = Função específica opcional (máx 8 chars)
```

### Exemplos

```yaml
✓ apps-tpcapital              # App TP Capital
✓ data-timescale-admin        # TimescaleDB Admin UI
✓ docs-api                    # Documentation API
✓ tools-firecrawl-proxy       # Firecrawl Proxy
✓ monitor-prometheus          # Prometheus
✓ rag-llamaindex-query        # LlamaIndex Query Service
```

---

## 🗂️ Stacks Definidos

### 1. **apps** - Aplicações de Negócio
Serviços principais do TradingSystem

| Service | Container Name | Imagem |
|---------|---------------|--------|
| TP Capital | `apps-tpcapital` | `img-apps-tpcapital:latest` |
| Workspace | `apps-workspace` | `img-apps-workspace:latest` |

### 2. **data** - Bancos de Dados
Armazenamento e persistência

| Service | Container Name | Imagem | Porta |
|---------|---------------|--------|-------|
| TimescaleDB (Principal) | `data-timescale` | `timescale/timescaledb:latest-pg16` | 5433 |
| TimescaleDB (Backup) | `data-timescale-backup` | `timescale/timescaledb:latest-pg16` | 5434 |
| TimescaleDB Admin | `data-timescale-admin` | `adminer:latest` | 8080 |
| TimescaleDB PgWeb | `data-timescale-pgweb` | `sosedoff/pgweb` | 8081 |
| TimescaleDB PgAdmin | `data-timescale-pgadmin` | `dpage/pgadmin4` | 5050 |
| TimescaleDB Exporter | `data-timescale-exporter` | `prometheuscommunity/postgres-exporter` | 9187 |
| PostgreSQL (LangGraph) | `data-postgres-langgraph` | `postgres:15` | 5435 |
| QuestDB | `data-questdb` | `questdb/questdb:latest` | 9000 |
| Qdrant (Vector DB) | `data-qdrant` | `qdrant/qdrant` | 6333 |

### 3. **docs** - Documentação
Sistemas de documentação

| Service | Container Name | Imagem | Porta |
|---------|---------------|--------|-------|
| Documentation Hub | `docs-hub` | `img-docs-hub:latest` | 3400 |
| Documentation API | `docs-api` | `img-docs-api:latest` | 3401 |

### 4. **tools** - Ferramentas
Utilitários e ferramentas de suporte

| Service | Container Name | Imagem | Porta |
|---------|---------------|--------|-------|
| Firecrawl Proxy | `tools-firecrawl-proxy` | `img-tools-firecrawl-proxy:latest` | 3600 |
| Firecrawl API | `tools-firecrawl-api` | `nginx:alpine` | 3002 |
| Firecrawl Playwright | `tools-firecrawl-playwright` | `nginx:alpine` | 3003 |
| Firecrawl PostgreSQL | `tools-firecrawl-postgres` | `postgres:15` | 5436 |
| Firecrawl Redis | `tools-firecrawl-redis` | `redis:latest` | 6379 |

### 5. **monitor** - Monitoramento
Observabilidade e métricas

| Service | Container Name | Imagem | Porta |
|---------|---------------|--------|-------|
| Prometheus | `monitor-prometheus` | `prom/prometheus:latest` | 9090 |
| Grafana | `monitor-grafana` | `grafana/grafana:latest` | 3000 |
| AlertManager | `monitor-alertmanager` | `prom/alertmanager:latest` | 9093 |
| Alert Router | `monitor-alert-router` | `nginx:alpine` | 9094 |

### 6. **rag** - Retrieval-Augmented Generation
LLMs, embeddings, RAG pipelines

| Service | Container Name | Imagem | Porta |
|---------|---------------|--------|-------|
| Ollama | `rag-ollama` | `ollama/ollama:latest` | 11435 |
| LlamaIndex Ingestion | `rag-llamaindex-ingest` | `img-rag-llamaindex-ingest:latest` | 8201 |
| LlamaIndex Query | `rag-llamaindex-query` | `img-rag-llamaindex-query:latest` | 8202 |

---

## 🏷️ Convenção de Imagens Docker

### Imagens Custom (Construídas no Projeto)

**Formato**: `img-{stack}-{service}:{tag}`

```dockerfile
# Exemplos
img-apps-tpcapital:latest
img-apps-tpcapital:v1.2.0
img-apps-workspace:latest
img-docs-api:latest
img-tools-firecrawl-proxy:latest
img-rag-llamaindex-query:latest
```

### Imagens Externas (Docker Hub/Registry)

Manter nome original do registro:

```yaml
# Exemplos
timescale/timescaledb:latest-pg16
prom/prometheus:latest
grafana/grafana:latest
ollama/ollama:latest
postgres:15
redis:latest
```

---

## 📊 Tabela de Migração

### APPS

| Nome Atual | Nome Proposto | Imagem Atual | Imagem Proposta |
|-----------|--------------|--------------|-----------------|
| `apps-tp-capital` | `apps-tpcapital` | `img-apps-tp-capital:latest` | `img-apps-tpcapital:latest` |
| `apps-workspace` | `apps-workspace` | `img-apps-workspace:latest` | ✓ Sem mudança |

### DATA

| Nome Atual | Nome Proposto | Observação |
|-----------|--------------|------------|
| `data-timescaledb` | `data-timescale` | Nome simplificado |
| `data-timescaledb-backup` | `data-timescale-backup` | Consistente |
| `data-timescaledb-adminer` | `data-timescale-admin` | Adminer → Admin |
| `data-timescaledb-pgweb` | `data-timescale-pgweb` | ✓ Mantém pgweb |
| `data-timescaledb-pgadmin` | `data-timescale-pgadmin` | ✓ Mantém pgadmin |
| `data-timescaledb-exporter` | `data-timescale-exporter` | Consistente |
| `data-postgress-langgraph` | `data-postgres-langgraph` | Corrige typo (postgre**ss** → postgres) |
| `data-questdb` | ✓ `data-questdb` | Sem mudança |
| `data-qdrant` | ✓ `data-qdrant` | Sem mudança |

### DOCS

| Nome Atual | Nome Proposto | Imagem Atual | Imagem Proposta |
|-----------|--------------|--------------|-----------------|
| `documentation` | `docs-hub` | `sha256:46d16bc...` | `img-docs-hub:latest` |
| `docs-api` | ✓ `docs-api` | `docs-api:latest` | `img-docs-api:latest` |

### TOOLS

| Nome Atual | Nome Proposto | Imagem Atual | Imagem Proposta |
|-----------|--------------|--------------|-----------------|
| `firecrawl-proxy` | `tools-firecrawl-proxy` | `img-firecrawl-proxy:latest` | `img-tools-firecrawl-proxy:latest` |
| `firecrawl-api` | `tools-firecrawl-api` | `nginx:alpine` | ✓ Sem mudança |
| `firecrawl-playwright` | `tools-firecrawl-playwright` | `nginx:alpine` | ✓ Sem mudança |
| `firecrawl-postgres` | `tools-firecrawl-postgres` | `postgres:15` | ✓ Sem mudança |
| `firecrawl-redis` | `tools-firecrawl-redis` | `redis:latest` | ✓ Sem mudança |

### MONITOR

| Nome Atual | Nome Proposto |
|-----------|--------------|
| `mon-prometheus` | `monitor-prometheus` |
| `mon-grafana` | `monitor-grafana` |
| `mon-alertmanager` | `monitor-alertmanager` |
| `mon-alert-router` | `monitor-alert-router` |

### RAG

| Nome Atual | Nome Proposto | Imagem Atual | Imagem Proposta |
|-----------|--------------|--------------|-----------------|
| `ollama` | `rag-ollama` | `ollama/ollama:latest` | ✓ Sem mudança |
| `tools-llamaindex-ingestion` | `rag-llamaindex-ingest` | `sha256:59392dd...` | `img-rag-llamaindex-ingest:latest` |
| `tools-llamaindex-query` | `rag-llamaindex-query` | `sha256:5f10ba8...` | `img-rag-llamaindex-query:latest` |

---

## 🔄 Plano de Migração

### Fase 1: Preparação (Sem Downtime)
- [x] Criar documento de convenção
- [ ] Atualizar compose files com novos nomes (usando aliases)
- [ ] Atualizar variáveis de ambiente
- [ ] Testar em ambiente de desenvolvimento

### Fase 2: Imagens (Pode Executar em Produção)
- [ ] Rebuild imagens com novos nomes
- [ ] Push para registry com novas tags
- [ ] Atualizar compose files para usar novas imagens

### Fase 3: Containers (Requer Restart)
- [ ] Parar containers antigos
- [ ] Criar containers com novos nomes
- [ ] Validar conectividade
- [ ] Remover containers antigos

### Fase 4: Limpeza
- [ ] Remover imagens antigas não utilizadas
- [ ] Atualizar documentação
- [ ] Atualizar scripts de deploy
- [ ] Atualizar monitoring/alerting

---

## 📝 Checklist de Validação

Ao adicionar um novo container, verificar:

- [ ] Nome segue padrão `{stack}-{service}[-{function}]`
- [ ] Stack é um dos 6 definidos (`apps`, `data`, `docs`, `tools`, `monitor`, `rag`)
- [ ] Service name tem máximo 12 caracteres
- [ ] Function suffix (se presente) tem máximo 8 caracteres
- [ ] Imagem custom segue padrão `img-{stack}-{service}:{tag}`
- [ ] Imagem externa mantém nome original
- [ ] Container tem health check (se aplicável)
- [ ] Labels incluem `com.tradingsystem.stack` e `com.tradingsystem.service`
- [ ] Documentado em `CONTAINER-NAMING-CONVENTION.md`

---

## 🎯 Benefícios da Nova Convenção

### 1. **Clareza**
```bash
# Antes
docker ps | grep timescale
data-timescaledb
data-timescaledb-backup
data-timescaledb-adminer
data-timescaledb-pgweb
data-timescaledb-pgadmin

# Depois
docker ps | grep timescale
data-timescale
data-timescale-backup
data-timescale-admin
data-timescale-pgweb
data-timescale-pgadmin
```

### 2. **Agrupamento Fácil**
```bash
# Listar todos containers de uma stack
docker ps | grep "^apps-"
docker ps | grep "^data-"
docker ps | grep "^monitor-"
```

### 3. **Autocomplete no Shell**
```bash
docker logs app<TAB>        # Completa para apps-
docker logs apps-<TAB>      # Lista: apps-tpcapital, apps-workspace
```

### 4. **Busca Eficiente**
```bash
# Encontrar rapidamente
docker ps --filter "name=^apps-"
docker ps --filter "label=com.tradingsystem.stack=apps"
```

---

## 📖 Referências

- Docker naming best practices: https://docs.docker.com/engine/reference/commandline/container_create/#name
- Compose naming: https://docs.docker.com/compose/compose-file/compose-file-v3/#container_name
- Label schema: http://label-schema.org/

---

## 🔗 Documentação Relacionada

- `docs/content/tools/docker/overview.mdx` - Docker no TradingSystem
- `docs/governance/DIAGRAM-MIGRATION-GUIDE.md` - Diagramas de arquitetura
- `docs/content/reference/inventory.md` - Inventário de serviços

---

**Última Atualização**: 2025-10-30
**Responsável**: Arquitetura de Infraestrutura
**Status**: Proposto (Aguardando Aprovação)
