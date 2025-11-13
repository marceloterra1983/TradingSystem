# 🐳 Docker Compose Stacks - Visão Geral

## 📊 Todos os Stacks Disponíveis (15 total)

### 🌐 0. Gateway Stack
**Arquivo:** `docker-compose.0-gateway-stack.yml`
**Containers:** 1
- `api-gateway` (Traefik) - Port 9082, 9083

### 🎨 1. Dashboard Stack
**Arquivo:** `docker-compose.1-dashboard-stack.yml`
**Containers:** 1
- `dashboard-ui` (React + Vite) - Port 8092

### 📚 2. Documentation Stack
**Arquivo:** `docker-compose.2-docs-stack.yml`
**Containers:** 2
- `docs-hub` (Docusaurus NGINX)
- `docs-api` (Documentation API) - Port 3405

### 💼 3. Workspace Stack
**Arquivo:** `docker-compose.4-3-workspace-stack.yml`
**Containers:** 1
- `workspace-api` (Node.js Express) - Port 3210

### 📈 4. TP Capital Stack
**Arquivo:** `docker-compose.4-1-tp-capital-stack.yml`
**Containers:** 1
- `tp-capital-api` (Trading signals ingestion) - Port 4008

### 📱 5. Telegram Stack (COMPLETO - 12 containers)
**Arquivo:** `docker-compose.4-2-telegram-stack-minimal-ports.yml`
**Containers:** 12
- Core Services (8):
  - `telegram-gateway-timescaledb` - Port 5434
  - `telegram-gateway-pgbouncer` - Port 6434
  - `telegram-gateway-redis-master` - Port 6379
  - `telegram-gateway-redis-replica` - Port 6385
  - `telegram-gateway-sentinel` - Port 26379
  - `telegram-gateway-rabbitmq` - Port 5672, 15672
  - `telegram-gateway-mtproto` - Port 14007
  - `telegram-gateway-api` - Port 14010
- Monitoring Services (4):
  - `telegram-gateway-prometheus` - Port 9090
  - `telegram-gateway-grafana` - Port 3100
  - `telegram-gateway-postgres-exporter` - Port 9187
  - `telegram-gateway-redis-exporter` - Port 9121

### 🧠 6. RAG Stack (LlamaIndex)
**Arquivo:** `docker-compose.4-4-rag-stack.yml`
**Containers:** 3
- `llamaindex-ingestion` (Ingestion pipeline)
- `llamaindex-query` (Query API) - Port 8202
- `qdrant` (Vector DB) - Port 6333, 6334

### 📖 7. Course Crawler Stack
**Arquivo:** `docker-compose.4-5-course-crawler-stack.yml`
**Containers:** 1
- `course-crawler` (Web scraping for courses)

### 🔄 8. N8N Stack
**Arquivo:** `docker-compose-5-1-n8n-stack.yml`
**Containers:** 1
- `n8n-proxy` (Workflow automation) - Port 5678

### 💬 9. Evolution API Stack
**Arquivo:** `docker-compose.5-2-evolution-api-stack.yml`
**Containers:** 7
- `evolution-manager` - Port 8080
- `evolution-api` - Port 8081
- `evolution-postgres` - Port 5432
- `evolution-pgbouncer` - Port 6432
- `evolution-redis` - Port 6379
- `evolution-minio` - Port 9000, 9001
- `evolution-minio-init` (init container)

### 📲 10. WAHA Stack
**Arquivo:** `docker-compose.5-3-waha-stack.yml`
**Containers:** ?
- WhatsApp HTTP API

### 🗄️ 11. Database Stack
**Arquivo:** `docker-compose.5-0-database-stack.yml`
**Containers:** 4
- `timescaledb` - Port 5432
- `questdb` - Port 9000, 8812, 9009
- `dbui-questdb` (QuestDB Web Console)
- `dbui-pgweb` (PostgreSQL Web UI)

### 🔀 12. Kestra Stack
**Arquivo:** `docker-compose.5-5-kestra-stack.yml`
**Containers:** 1
- `kestra` (Orchestration) - Port 8080

### 🕷️ 13. Firecrawl Stack
**Arquivo:** `docker-compose.5-7-firecrawl-stack.yml`
**Containers:** 1
- `firecrawl-proxy` (Web scraping proxy) - Port 3002

### 📊 14. Monitoring Stack
**Arquivo:** `docker-compose.6-1-monitoring-stack.yml`
**Containers:** ?
- Prometheus, Grafana, Loki, Promtail, etc.

---

## 🚀 Ordem de Startup (Respeitando Dependências)

### Fase 1: Infrastructure (PRIMEIRO!)
1. **Database Stack** → Aguarda 10s
2. **TP Capital Stack** → Aguarda 5s
3. **Workspace Stack** → Aguarda 5s
4. **Telegram Stack** (12 containers) → Aguarda 10s

### Fase 2: Gateway & Frontend
5. **Gateway (Traefik)** → Aguarda 5s
6. **Dashboard** → Aguarda 5s
7. **Documentation Hub** → Aguarda 3s

### Fase 3: Auxiliary Services (Opcional)
8. RAG Stack (LlamaIndex)
9. N8N
10. Evolution API
11. WAHA
12. Kestra
13. Firecrawl
14. Course Crawler
15. Monitoring Stack

**Tempo Total:** ~50 segundos (core) + 30s (health checks) = ~80 segundos

---

## 🔴 Ordem de Shutdown (Reverso)

### Fase 1: Frontend First
1. Gateway (Traefik)
2. Dashboard
3. Documentation Hub

### Fase 2: Application Services
4. Workspace API
5. TP Capital
6. Telegram Stack (12 containers)
7. RAG Stack
8. Course Crawler

### Fase 3: Auxiliary & Infrastructure
9. N8N
10. Evolution API
11. WAHA
12. Kestra
13. Firecrawl
14. Monitoring Stack
15. **Database Stack (ÚLTIMO!)**

**Tempo Total:** ~20 segundos

---

## 📊 Estatísticas

**Total de Stacks:** 15
**Total de Containers (máximo):** ~40+
**Containers Essenciais:** 8 (Gateway, Dashboard, Docs, Workspace, TP Capital, Database, Telegram Gateway API)
**Containers Opcionais:** 32+

**Portas Principais:**
- 9082 → API Gateway (HTTP)
- 9083 → Traefik Dashboard
- 8092 → Dashboard UI (direct access)
- 3405 → Documentation API (direct access)
- 3210 → Workspace API (direct access)
- 4008 → TP Capital API (direct access)
- 8202 → LlamaIndex Query API (direct access)

**Redes Docker:**
- `tradingsystem_backend` - Serviços backend
- `tradingsystem_frontend` - Serviços frontend
- `tp_capital_backend` - TP Capital isolado
- `tradingsystem_databases` - Databases compartilhadas

---

## ✅ Scripts de Gerenciamento

### Shutdown Completo
```bash
bash /workspace/scripts/docker/shutdown-all.sh
```

### Startup Completo
```bash
bash /workspace/scripts/docker/startup-all.sh
```

### Verificar Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -30
```

### Contar Containers Ativos
```bash
docker ps --filter "label=com.tradingsystem.stack" --format "{{.Names}}" | wc -l
```

---

## 🔧 Troubleshooting

### Container específico não iniciou?
```bash
# Ver logs
docker compose -f tools/compose/docker-compose.X-stack.yml logs --tail 50

# Recriar container
docker compose -f tools/compose/docker-compose.X-stack.yml up -d --force-recreate
```

### Verificar health de todos os containers
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(healthy|unhealthy)"
```

### Remover tudo e reiniciar do zero
```bash
# ⚠️ CUIDADO! Remove TODOS os containers e volumes
bash /workspace/scripts/docker/shutdown-all.sh
docker system prune -af --volumes
bash /workspace/scripts/docker/startup-all.sh
```

---

**Última Atualização:** 2025-11-12 (incluído RAG, Evolution API, WAHA, Monitoring)
