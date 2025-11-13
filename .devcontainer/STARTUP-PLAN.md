# TradingSystem Dev Container - Plano de Startup

**Data:** 2025-11-12 16:15:00
**Status:** ✅ Pronto para iniciar containers

---

## ✅ Pré-requisitos Validados

### 1. Docker Access
- ✅ **Docker daemon:** v28.5.1 - Funcionando
- ✅ **Permissões:** Socket configurado (666) - Acesso OK
- ✅ **Docker Compose:** v2 - Disponível

### 2. Redes Docker Existentes
✅ **Redes TradingSystem encontradas:**
- `tradingsystem_backend` - Para APIs e serviços backend
- `tradingsystem_frontend` - Para Dashboard e UIs
- `tradingsystem_monitoring` - Para Prometheus/Grafana

✅ **Outras redes encontradas:**
- `telegram_backend` - Telegram Gateway
- `tp_capital_backend` - TP Capital
- `evolution_backend` - Evolution API
- `n8n_backend` - N8N Automation
- `kestra_internal` - Kestra Orchestration
- `waha_backend` - WAHA WhatsApp

### 3. Volumes Existentes
✅ **Volumes do dev container:**
- `tradingsystem_devcontainer_node-modules`
- `tradingsystem_devcontainer_dashboard-node-modules`
- `tradingsystem_devcontainer_docs-node-modules`
- `tradingsystem_devcontainer_venv`

### 4. Arquivos de Configuração
- ✅ `.env` principal - Encontrado (8.8KB)
- ✅ `.env.shared` - Encontrado (6.6KB)
- ✅ Scripts de startup - Disponíveis

### 5. Containers Ativos
- ✅ Apenas dev container rodando (limpo para startup)
- ✅ Nenhum conflito de portas detectado

---

## 🎯 Ordem de Startup (15 Stacks)

### Fase 1: Infraestrutura Base (2 stacks)

#### Stack 1: API Gateway
**Arquivo:** `tools/compose/docker-compose.0-gateway-stack.yml`
**Serviços:**
- Traefik API Gateway (9080, 9081)
- Reverse proxy para todos os serviços

**Redes:** tradingsystem_backend, tradingsystem_frontend

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d
```

#### Stack 2: Databases & Storage
**Arquivo:** `tools/compose/docker-compose.5-0-database-stack.yml`
**Serviços:**
- TimescaleDB (PostgreSQL) - 5432
- Redis - 6379
- QuestDB
- Database UIs (Adminer, PgAdmin, etc.)

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.5-0-database-stack.yml up -d
```

**Aguardar:** 15 segundos para DBs iniciarem

---

### Fase 2: Monitoramento (1 stack)

#### Stack 3: Monitoring & Observability
**Arquivo:** `tools/compose/docker-compose.6-1-monitoring-stack.yml`
**Serviços:**
- Prometheus - 9090
- Grafana - 3100
- Loki - 3101

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.6-1-monitoring-stack.yml up -d
```

---

### Fase 3: Core Application Services (2 stacks)

#### Stack 4: Workspace
**Arquivo:** `tools/compose/docker-compose.4-3-workspace-stack.yml`
**Serviços:**
- Workspace API - 3200
- PostgreSQL Workspace
- Redis Workspace

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml up -d
```

#### Stack 5: TP Capital
**Arquivo:** `tools/compose/docker-compose.4-1-tp-capital-stack.yml`
**Serviços:**
- TP Capital Trading - 4005
- Data ingestion

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d
```

---

### Fase 4: Communication & Integration (3 stacks)

#### Stack 6: Telegram Gateway
**Arquivo:** `tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml`
**Serviços:**
- MTProto Gateway - 14007
- Telegram API - 14010
- TimescaleDB, Redis, RabbitMQ

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml up -d
```

#### Stack 7: Evolution API (WhatsApp)
**Arquivo:** `tools/compose/docker-compose.5-2-evolution-api-stack.yml`
**Serviços:**
- Evolution API - 8080
- PostgreSQL, Redis

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.5-2-evolution-api-stack.yml up -d
```

#### Stack 8: WAHA (WhatsApp)
**Arquivo:** `tools/compose/docker-compose.5-3-waha-stack.yml`
**Serviços:**
- WAHA API

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.5-3-waha-stack.yml up -d
```

---

### Fase 5: AI & RAG Services (1 stack)

#### Stack 9: RAG System
**Arquivo:** `tools/compose/docker-compose.4-4-rag-stack.yml`
**Serviços:**
- Qdrant Vector DB - 6333
- Ollama LLM - 11434
- LlamaIndex Query API - 8202
- LlamaIndex Ingestion

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d
```

**Aguardar:** 30 segundos para Ollama baixar modelos

---

### Fase 6: Automation & Workflows (2 stacks)

#### Stack 10: N8N Workflow Automation
**Arquivo:** `tools/compose/docker-compose-5-1-n8n-stack.yml`
**Serviços:**
- N8N - 5678
- PostgreSQL

**Comando:**
```bash
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml up -d
```

#### Stack 11: Kestra Orchestration
**Arquivo:** `tools/compose/docker-compose.5-5-kestra-stack.yml`
**Serviços:**
- Kestra
- PostgreSQL

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.5-5-kestra-stack.yml up -d
```

---

### Fase 7: Tools & Utilities (2 stacks)

#### Stack 12: Firecrawl Web Scraping
**Arquivo:** `tools/compose/docker-compose.5-7-firecrawl-stack.yml`
**Serviços:**
- Firecrawl API
- Redis

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.5-7-firecrawl-stack.yml up -d
```

#### Stack 13: Course Crawler
**Arquivo:** `tools/compose/docker-compose.4-5-course-crawler-stack.yml`
**Serviços:**
- Course Crawler API - 3600

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.4-5-course-crawler-stack.yml up -d
```

---

### Fase 8: Frontend Applications (2 stacks)

#### Stack 14: Dashboard UI
**Arquivo:** `tools/compose/docker-compose.1-dashboard-stack.yml`
**Serviços:**
- Dashboard React + Vite - 8090
- Nginx proxy

**Redes:** tradingsystem_frontend, tradingsystem_backend

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d
```

#### Stack 15: Documentation Hub
**Arquivo:** `tools/compose/docker-compose.2-docs-stack.yml`
**Serviços:**
- Docusaurus v3 - 3404
- Documentation API - 3405

**Redes:** tradingsystem_frontend, tradingsystem_backend

**Comando:**
```bash
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d
```

---

## 🚀 Startup Automático (Recomendado)

### Opção 1: Script Completo (Todas as 15 stacks)
```bash
bash .devcontainer/scripts/start-all-stacks.sh
```

**Tempo estimado:** 3-5 minutos
**Ordem automática:** Infraestrutura → Databases → Monitoring → Services → Frontend

### Opção 2: Script de Startup Essencial (Apenas 7 stacks principais)
Crie um script simplificado para startup rápido:

```bash
#!/bin/bash
# Startup essencial - Apenas serviços críticos

cd /workspace

# 1. Gateway
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d

# 2. Databases
docker compose -f tools/compose/docker-compose.5-0-database-stack.yml up -d
sleep 15

# 3. Monitoring
docker compose -f tools/compose/docker-compose.6-1-monitoring-stack.yml up -d

# 4. Workspace
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml up -d

# 5. Dashboard
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d

# 6. Docs
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d

# 7. RAG
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d

echo "✅ Stacks essenciais iniciados!"
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

## 🔍 Validação Pós-Startup

### 1. Verificar Containers Rodando
```bash
docker ps --filter "label=com.tradingsystem.stack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Esperado:** 15+ containers com status `Up`

### 2. Testar Endpoints Principais

#### Gateway (Traefik)
```bash
curl -s http://localhost:9080/ | head -5
curl -s http://localhost:9081/api/overview | jq '.providers'
```

#### Dashboard UI
```bash
curl -s http://localhost:9080/ -I | grep "200 OK"
```

#### Documentation Hub
```bash
curl -s http://localhost:9080/docs/ -I | grep "200 OK"
```

#### Workspace API
```bash
curl -s http://localhost:9080/api/workspace/health | jq '.'
```

#### Documentation API
```bash
curl -s http://localhost:3405/health | jq '.'
```

### 3. Verificar Logs (Se houver erros)
```bash
# Ver logs de um stack específico
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml logs -f

# Ver logs de todos os containers TradingSystem
docker ps --filter "label=com.tradingsystem.stack" --format "{{.Names}}" | xargs -I {} docker logs {} --tail 20
```

### 4. Health Checks Automatizados
```bash
bash .devcontainer/scripts/test-services-health.sh
```

---

## 📊 Recursos Estimados

### Memória Total Estimada: ~4.5GB
- Gateway: ~100MB
- Databases (3): ~1.5GB
- Monitoring (3): ~500MB
- APIs (5): ~800MB
- Frontend (2): ~300MB
- RAG (Ollama): ~1GB
- Outros: ~300MB

### CPU
- Baixo em idle (~10%)
- Médio em uso normal (~30-50%)
- Alto durante builds/ingestions (~80-100%)

### Disco
- Volumes: ~2GB
- Images: ~10GB
- Logs: ~500MB/dia

---

## 🌐 Service URLs (Port Forwarding)

### Acessíveis via VS Code Port Forwarding:

**Principais:**
- http://localhost:9080 - API Gateway (Traefik) - **Entrypoint principal**
- http://localhost:9081 - Traefik Dashboard
- http://localhost:8090 - Dashboard UI (direto, sem gateway)
- http://localhost:3404 - Documentation Hub (direto)

**APIs:**
- http://localhost:3200 - Workspace API
- http://localhost:3405 - Documentation API
- http://localhost:4005 - TP Capital
- http://localhost:8202 - RAG Query API

**Databases:**
- http://localhost:5432 - TimescaleDB (PostgreSQL)
- http://localhost:6379 - Redis

**Monitoring:**
- http://localhost:9090 - Prometheus
- http://localhost:3100 - Grafana

**Automation:**
- http://localhost:5678 - N8N

---

## 🛑 Shutdown

### Parar Todos os Stacks
```bash
bash .devcontainer/scripts/stop-all-stacks.sh
```

### Parar Stack Específico
```bash
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml down
```

### Parar e Remover Volumes (Limpar completamente)
```bash
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml down -v
```

---

## 📝 Troubleshooting

### Problema: Porta já em uso
```bash
# Encontrar processo usando a porta
lsof -i :9080

# Parar container específico
docker stop <container-name>
```

### Problema: Container não inicia
```bash
# Ver logs detalhados
docker compose -f <stack-file> logs --tail 50

# Verificar health check
docker inspect <container-name> | jq '.[0].State.Health'
```

### Problema: Rede não encontrada
```bash
# Criar redes manualmente
docker network create tradingsystem_backend
docker network create tradingsystem_frontend
docker network create tradingsystem_monitoring
```

### Problema: Falta de memória
```bash
# Verificar uso de memória
docker stats --no-stream

# Parar stacks não essenciais
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml down
docker compose -f tools/compose/docker-compose.5-5-kestra-stack.yml down
```

---

## ✅ Checklist de Verificação

### Antes do Startup:
- [x] Docker daemon funcionando
- [x] Permissões do socket corretas
- [x] .env principal existe
- [x] Redes TradingSystem existem
- [x] Espaço em disco suficiente (>10GB)

### Durante o Startup:
- [ ] Gateway iniciado (9080, 9081)
- [ ] Databases iniciadas (5432, 6379)
- [ ] Monitoring iniciado (9090, 3100)
- [ ] APIs iniciadas (3200, 3405, 4005)
- [ ] Frontend iniciado (8090, 3404)

### Após o Startup:
- [ ] Todos os containers `Up`
- [ ] Health checks `healthy`
- [ ] URLs acessíveis
- [ ] Logs sem erros críticos

---

**Pronto para iniciar!** 🚀

Execute:
```bash
bash .devcontainer/scripts/start-all-stacks.sh
```
