# TradingSystem - Guia Completo de Startup

**Data:** 2025-11-12
**Status:** Sistema com startup automatizado completo

---

## 🚀 Quick Start

### Iniciar TODO o Sistema

```bash
bash scripts/docker/start-all-stacks.sh
```

**O que faz:**
- ✅ Verifica e libera portas (9080, 9081)
- ✅ Remove containers/volumes órfãos
- ✅ Inicia 12 stacks na ordem correta de dependência
- ✅ Valida health checks de cada serviço
- ✅ Exibe relatório final com status completo

**Tempo estimado:** ~3-5 minutos (primeira execução pode levar mais devido a builds)

### Parar TODO o Sistema

```bash
bash scripts/docker/stop-all-stacks.sh
```

**O que faz:**
- ✅ Para stacks em ordem reversa (aplicações → infraestrutura → gateway)
- ✅ Verifica que nenhum container ficou rodando
- ✅ Graceful shutdown (sem perda de dados)

---

## 📋 Stacks do Sistema (Ordem de Inicialização)

### 1. **Gateway Stack** (Traefik v3.0)
- **Arquivo:** `docker-compose.0-gateway-stack.yml`
- **Container:** `api-gateway`
- **Portas:** 9080 (HTTP), 9081 (Dashboard)
- **Função:** Reverse proxy centralizado para todos os serviços
- **Health:** Traefik ping endpoint
- **URL:** http://localhost:9081 (Dashboard Traefik)

### 2. **Dashboard Stack** (React + Vite)
- **Arquivo:** `docker-compose.1-dashboard-stack.yml`
- **Container:** `dashboard-ui`
- **Porta Interna:** 3103
- **Função:** Interface principal do sistema
- **Health:** curl http://localhost:3103/
- **URL:** http://localhost:9080/ (via Traefik)

### 3. **Documentation Stack** (Docusaurus v3)
- **Arquivo:** `docker-compose.2-docs-stack.yml`
- **Containers:** `docs-hub`, `documentation-api`
- **Função:** Hub de documentação + API de busca/RAG
- **Health:** HTTP endpoints
- **URL:** http://localhost:9080/docs/ (via Traefik)

### 4. **Database Stack** (Infrastructure)
- **Arquivo:** `docker-compose.5-0-database-stack.yml`
- **Containers:** Diversos bancos de dados compartilhados
- **Função:** Bancos de dados centralizados
- **Health:** Comandos específicos de cada DB

### 5. **Workspace Stack** (API + PostgreSQL + Redis)
- **Arquivo:** `docker-compose.4-3-workspace-stack.yml`
- **Containers:** `workspace-api`, `workspace-db`, `workspace-redis`
- **Porta Interna:** 3200 (API)
- **Função:** Gerenciamento de workspace items
- **Health:** PostgreSQL pg_isready, Redis ping, API /health
- **URL:** http://localhost:9080/api/workspace/ (via Traefik)

### 6. **TP Capital Stack**
- **Arquivo:** `docker-compose.4-1-tp-capital-stack.yml`
- **Função:** Ingestão de sinais de trading do Telegram
- **URL:** http://localhost:9080/api/tp-capital/ (via Traefik)

### 7. **n8n Automation Stack**
- **Arquivo:** `docker-compose-5-1-n8n-stack.yml`
- **Containers:** `n8n-app`, `n8n-worker`, `n8n-postgres`, `n8n-redis`, `n8n-proxy`
- **Função:** Plataforma de automação workflow
- **Health:** PostgreSQL + Redis + n8n app
- **URL:** http://localhost:9080/n8n/ (via Traefik)

### 8. **RAG Stack** (LlamaIndex + Qdrant)
- **Arquivo:** `docker-compose.4-4-rag-stack.yml`
- **Função:** Sistema RAG para busca semântica em documentação
- **Containers:** Qdrant vector DB, LlamaIndex query engine

### 9. **Telegram Stack**
- **Arquivo:** `docker-compose.4-2-telegram-stack-minimal-ports.yml`
- **Função:** Integração completa com Telegram (MTProto + Gateway API)
- **Containers:** TimescaleDB, Redis HA, RabbitMQ, MTProto, Gateway API

### 10. **Monitoring Stack** (Prometheus + Grafana)
- **Arquivo:** `docker-compose.6-1-monitoring-stack.yml`
- **Função:** Observabilidade e métricas do sistema

### 11. **Firecrawl Stack**
- **Arquivo:** `docker-compose.5-7-firecrawl-stack.yml`
- **Função:** Web scraping e crawling

### 12. **Course Crawler Stack**
- **Arquivo:** `docker-compose.4-5-course-crawler-stack.yml`
- **Função:** Crawler específico para cursos online

---

## 🔧 Scripts Disponíveis

### Startup Completo
- **`start-all-stacks.sh`**: Inicia TODOS os stacks (recomendado)
- **`smart-startup.sh`**: Inicia stacks essenciais (Gateway, Dashboard, Docs, Workspace, n8n)

### Shutdown
- **`stop-all-stacks.sh`**: Para todos os stacks (graceful)
- **`stop-gateway-stack.sh`**: Para apenas o Gateway

### Troubleshooting
- **`fix-workspace-api.sh`**: Reinicia workspace-api para resolver problemas de conectividade
- **`recreate-workspace-stack.sh`**: Recria completamente o workspace stack

---

## 🏥 Health Checks

### Verificar Status Geral

```bash
docker ps --filter 'label=com.tradingsystem' --format "table {{.Names}}\t{{.Status}}"
```

### Contar Containers Healthy

```bash
docker ps --filter 'label=com.tradingsystem' --filter 'health=healthy' --format "{{.Names}}" | wc -l
```

### Listar Containers Unhealthy

```bash
docker ps --filter 'label=com.tradingsystem' --filter 'health=unhealthy' --format "table {{.Names}}\t{{.Status}}"
```

### Ver Logs de um Container

```bash
docker logs -f <container-name>
docker logs --tail 50 <container-name>
```

---

## 🌐 URLs de Acesso

Após startup completo:

- **Main Dashboard:** http://localhost:9080/
- **Gateway Dashboard (Traefik):** http://localhost:9081/
- **Documentation Hub:** http://localhost:9080/docs/
- **Workspace API:** http://localhost:9080/api/workspace/
- **TP Capital API:** http://localhost:9080/api/tp-capital/
- **n8n Automation:** http://localhost:9080/n8n/
- **Documentation API:** http://localhost:9080/api/docs/

---

## ⚠️ Troubleshooting

### Problema: "Address already in use" nas portas 9080 ou 9081

**Causa:** Processos órfãos ocupando as portas.

**Solução:** O script `start-all-stacks.sh` detecta e mata automaticamente (com sudo).

**Manual:**
```bash
# Identificar processos
sudo lsof -i :9080
sudo lsof -i :9081

# Matar processos
sudo kill -9 <PID>
```

### Problema: workspace-api unhealthy

**Causa:** Timeout de conexão com PostgreSQL ou Redis.

**Solução 1 - Reiniciar:**
```bash
bash scripts/docker/fix-workspace-api.sh
```

**Solução 2 - Recriar stack:**
```bash
bash scripts/docker/recreate-workspace-stack.sh
```

### Problema: dashboard-ui unhealthy

**Causa:** Healthcheck verificando porta errada.

**Solução:** Já corrigido em `docker-compose.1-dashboard-stack.yml`:
- Healthcheck: porta 3103 (Vite)
- Traefik loadbalancer: porta 3103

### Problema: Containers em "Created" mas não "Up"

**Causa:** Dependências não satisfeitas ou falta de recursos.

**Solução:**
```bash
# Iniciar manualmente
docker start <container-name>

# Ver logs para diagnóstico
docker logs <container-name>
```

### Problema: n8n não inicia

**Causa:** PostgreSQL ou Redis não estão healthy.

**Solução:**
```bash
# Verificar dependências
docker ps | grep -E "n8n-postgres|n8n-redis"

# Reiniciar stack
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml restart
```

---

## 📊 Correções Aplicadas (Histórico)

### 2025-11-12 - Gateway Stack Unificado
- **Problema:** Dois arquivos conflitantes (docker-compose.0-gateway-stack.yml e docker-compose.gateway.yml)
- **Solução:** Unificado em docker-compose.0-gateway-stack.yml
- **Redução:** 342 → 147 linhas (57% redução)
- **Removido:** 7 proxies nginx que estavam no lugar errado

### 2025-11-12 - Dashboard Healthcheck Corrigido
- **Problema:** Healthcheck verificando porta 9080, mas Vite roda na 3103
- **Solução:** Corrigido healthcheck e Traefik loadbalancer para porta 3103
- **Resultado:** dashboard-ui agora fica healthy

### 2025-11-12 - Smart Startup com Port Cleanup
- **Problema:** Portas bloqueadas por processos órfãos após restart do sistema
- **Solução:** Script smart-startup.sh detecta e mata processos automaticamente (com sudo)
- **Portas monitoradas:** 9080, 9081

### 2025-11-12 - Startup Completo de Todas as Stacks
- **Problema:** Apenas stacks essenciais eram iniciados (5 de 12)
- **Solução:** Novo script start-all-stacks.sh inicia TODOS os 12 stacks
- **Features:** Health checks, ordem de dependência, relatório final

---

## 🎯 Próximos Passos

### Fase 3 - Week 1 (Planejada)
- [ ] Fix PWA plugin compatibility (vite-plugin-pwa@1.1.0 + Vite 7)
- [ ] Implement service-to-service authentication
- [ ] Add API versioning strategy
- [ ] Enhance test coverage (target: 80%)

### Melhorias Futuras
- [ ] Script de restart individual de stacks
- [ ] Health check dashboard automatizado
- [ ] Notificações de falha via webhook
- [ ] Logs centralizados (ELK/Loki)

---

## 📚 Documentação Relacionada

- **Gateway Policy:** `governance/policies/api-gateway-policy.md`
- **Traefik Migration:** `docs/TRAEFIK-GATEWAY-MIGRATION.md`
- **Docker Compose Analysis:** `DOCKER-COMPOSE-ANALYSIS.md`
- **Gateway Unification:** `GATEWAY-UNIFICATION.md`
- **Phase 2.3 Report:** `docs/PHASE-2-3-FINAL-REPORT.md`

---

**Última atualização:** 2025-11-12 13:30 BRT
