# 🚨 Unhealthy Containers - Root Cause Analysis

**Data**: 2025-11-03  
**Status**: ⚠️ 4 containers unhealthy

---

## 📋 Executive Summary

O comando `status` revelou **4 containers com health check failing**:

1. ✗ `rag-llamaindex-ingest` (Port 8201)
2. ✗ `rag-service` (Port 3402)  
3. ✗ `tools-kestra` (Ports 8100, 8101)
4. ✗ `tools-langgraph` (Port 8115)

**Root Cause**: Container **`data-qdrant` não existe**, causando falhas em cascata nos serviços RAG.

---

## 🔍 Problem 1: Missing Qdrant Container (CRITICAL)

### Symptoms

```bash
# rag-llamaindex-ingest logs
ERROR - Failed to initialize Qdrant client: [Errno -3] Temporary failure in name resolution
# Tentando conectar com: data-qdrant:6333

# rag-service logs  
ERROR - External service failed: getaddrinfo ENOTFOUND data-qdrant
# Tentando conectar com: http://data-qdrant:6333/collections/documentation
```

### Root Cause

O container `data-qdrant` **não está rodando**, mas é uma dependência crítica para:

- ✗ `rag-llamaindex-ingest` - Ingestion service (vector storage)
- ✗ `rag-service` - Documentation API (vector search)
- ✗ `tools-langgraph` - Depende dos serviços acima

### Why It Happened

O script `scripts/start.sh` referencia `docker-compose.database.yml` (linha 348), **mas o Qdrant está definido em `docker-compose.timescale.yml`**.

**Verificação**:
```bash
# Qdrant NÃO está no database compose
docker compose -f tools/compose/docker-compose.database.yml config --services | grep qdrant
# (sem resultado)

# Qdrant ESTÁ no timescale compose
docker compose -f tools/compose/docker-compose.timescale.yml config --services | grep qdrant
# data-qdrant ✓
```

### Solution

```bash
# Opção 1: Iniciar Qdrant standalone
docker compose -f tools/compose/docker-compose.timescale.yml up -d data-qdrant

# Opção 2: Usar script automatizado
bash scripts/docker/fix-unhealthy-containers.sh
```

---

## 🔍 Problem 2: Kestra Missing Database Password

### Symptoms

```bash
# tools-kestra logs
DependencyInjectionException: Missing required value at path: datasources.default.password
Connection refused to localhost:8081
```

### Root Cause

O Kestra precisa de variáveis de ambiente para conectar ao PostgreSQL, mas o `docker-compose.tools.yml` **não está carregando** o `.env` corretamente.

**Evidência**:
```bash
# Variáveis EXISTEM no .env
grep KESTRA .env
KESTRA_DB_PASSWORD=kestra_password_change_in_production
KESTRA_BASICAUTH_PASSWORD=admin_change_in_production

# Mas o compose mostra warnings
docker compose -f tools/compose/docker-compose.tools.yml config
# WARNING: The "KESTRA_DB_PASSWORD" variable is not set. Defaulting to blank string.
```

### Solution

```bash
# Reiniciar Kestra com env vars explícitas
export KESTRA_DB_HOST=tools-kestra-postgres
export KESTRA_DB_PORT=5432
export KESTRA_DB_NAME=kestra
export KESTRA_DB_USER=kestra
export KESTRA_DB_PASSWORD=kestra_password_change_in_production

docker compose -f tools/compose/docker-compose.tools.yml restart kestra

# Ou usar script automatizado
bash scripts/docker/fix-unhealthy-containers.sh
```

---

## 🔍 Problem 3: LangGraph Dependencies Failing

### Symptoms

```bash
# tools-langgraph logs
ERROR - DocsAPI health check failed: All connection attempts failed
ERROR - Firecrawl health check failed: [Errno -3] Temporary failure in name resolution
```

### Root Cause

**Efeito cascata** do Problem 1:

1. `data-qdrant` não existe
2. `rag-service` (DocsAPI) falha ao conectar com Qdrant → unhealthy
3. `tools-langgraph` tenta conectar com `rag-service` → timeout → unhealthy

### Solution

Ao corrigir o Problem 1 (iniciar Qdrant), o LangGraph será automaticamente corrigido:

```bash
# Reiniciar serviços após Qdrant estar disponível
docker restart rag-service rag-llamaindex-ingest tools-langgraph
```

---

## ✅ Automated Fix Script

Criei um script automatizado que corrige TODOS os problemas:

```bash
bash scripts/docker/fix-unhealthy-containers.sh
```

**O que o script faz**:

1. ✅ Verifica se `data-qdrant` existe, se não, cria via `docker-compose.timescale.yml`
2. ✅ Aguarda Qdrant ficar healthy (max 30s)
3. ✅ Reinicia Kestra com variáveis de ambiente corretas
4. ✅ Aguarda Kestra responder (max 60s)
5. ✅ Reinicia serviços RAG afetados (`rag-llamaindex-ingest`, `rag-service`, `tools-langgraph`)
6. ✅ Aguarda 10s para health checks
7. ✅ Exibe status final

---

## 📊 Impact Analysis

### Affected Features

| Feature | Status | Impact |
|---------|--------|--------|
| RAG Search (LlamaIndex) | ❌ Down | Cannot query documentation |
| RAG Ingestion | ❌ Down | Cannot index new documents |
| Documentation API | ⚠️ Partial | FlexSearch works, RAG endpoints fail |
| LangGraph Workflows | ❌ Down | Cannot execute workflows |
| Kestra Orchestration | ❌ Down | Cannot schedule/run pipelines |

### Working Services (Unaffected)

✅ Dashboard (3103)  
✅ Status API (3500)  
✅ Telegram Gateway API (4010)  
✅ TP Capital API (4006)  
✅ Workspace API (3201)  
✅ Documentation Hub (3404) - Docusaurus  
✅ DocsAPI (3405) - FlexSearch (partial)  
✅ Ollama (11434)  
✅ Redis (6380)  
✅ Collections Service (3403)  
✅ Grafana (3104)  
✅ Prometheus (9091)

---

## 🔧 Manual Fix Steps (Alternative)

Se preferir corrigir manualmente sem usar o script:

### Step 1: Start Qdrant

```bash
cd /home/marce/Projetos/TradingSystem

# Iniciar Qdrant
docker compose -f tools/compose/docker-compose.timescale.yml up -d data-qdrant

# Verificar saúde
docker ps --filter "name=data-qdrant" --format "{{.Names}}\t{{.Status}}"

# Aguardar healthy (pode demorar 10-20s)
watch -n 2 'docker inspect --format="{{.State.Health.Status}}" data-qdrant'
```

### Step 2: Fix Kestra

```bash
# Exportar variáveis
export KESTRA_DB_HOST=tools-kestra-postgres
export KESTRA_DB_PORT=5432
export KESTRA_DB_NAME=kestra
export KESTRA_DB_USER=kestra
export KESTRA_DB_PASSWORD=kestra_password_change_in_production
export KESTRA_BASICAUTH_USERNAME=admin
export KESTRA_BASICAUTH_PASSWORD=admin_change_in_production

# Reiniciar Kestra
docker compose -f tools/compose/docker-compose.tools.yml restart kestra

# Verificar logs
docker logs -f tools-kestra --tail 50
```

### Step 3: Restart RAG Services

```bash
# Aguardar Qdrant estar pronto
sleep 5

# Reiniciar serviços afetados
docker restart rag-llamaindex-ingest
docker restart rag-service
docker restart tools-langgraph

# Aguardar health checks
sleep 10

# Verificar status
bash scripts/status.sh
```

---

## 🎯 Prevention & Long-term Fixes

### 1. Update `scripts/start.sh`

**Problem**: Script usa `docker-compose.database.yml` mas Qdrant está em `docker-compose.timescale.yml`

**Fix**: Atualizar linha 348 para usar o compose correto ou garantir que Qdrant seja iniciado separadamente.

### 2. Fix Kestra Compose

**Problem**: `docker-compose.tools.yml` não carrega `.env` corretamente

**Fix**: Adicionar `env_file: ../../.env` no serviço Kestra:

```yaml
services:
  kestra:
    env_file:
      - ../../.env
    environment:
      # Existing vars...
```

### 3. Add Dependency Checks

**Problem**: Serviços iniciam sem verificar se dependências estão disponíveis

**Fix**: Adicionar `healthcheck` e `depends_on` com `condition: service_healthy` nos composes:

```yaml
services:
  rag-service:
    depends_on:
      data-qdrant:
        condition: service_healthy
```

---

## 📝 Verification Commands

Após executar as correções, verificar:

```bash
# Ver todos os containers unhealthy
docker ps --filter "health=unhealthy"

# Ver status completo
bash scripts/status.sh

# Verificar Qdrant especificamente
curl -s http://localhost:6333/collections | jq '.'

# Verificar RAG Service
curl -s http://localhost:3402/api/v1/rag/status/health | jq '.'

# Verificar Kestra
curl -s http://localhost:8100/api/v1/configs | jq '.'

# Health check completo
bash scripts/maintenance/health-check-all.sh
```

---

## 🔗 Related Documentation

- [Docker Compose Files](tools/compose/)
- [Service Port Map](docs/content/tools/ports-services.mdx)
- [RAG System Architecture](docs/content/sdd/)
- [Troubleshooting Guide](docs/content/tools/troubleshooting/)

---

**Last Updated**: 2025-11-03  
**Author**: AI Assistant (via Claude Code)  
**Status**: Ready for execution
