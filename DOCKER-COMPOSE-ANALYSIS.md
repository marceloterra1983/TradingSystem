# TradingSystem - Docker Compose Analysis & Startup Guide

**Data:** 2025-11-12
**Status:** Sistema reiniciado, necessário startup manual dos serviços

---

## 📋 Análise Completa dos Arquivos Docker Compose

### 1. Gateway Stack (API Gateway)

**Arquivos encontrados:**
- ❌ `docker-compose.gateway.yml` - Traefik puro, porta 80 (conflita com sistema)
- ⚠️ `docker-compose.0-gateway-stack.yml` - Traefik + proxies nginx, porta 9080 (tem proxies que não devem estar aqui)

**Problema identificado:**
O arquivo `docker-compose.0-gateway-stack.yml` contém definições de **proxies nginx para todos os serviços** (n8n-proxy, kestra-proxy, dbui-*-proxy, grafana-proxy). Esses proxies devem estar em seus respectivos stacks, não no Gateway.

**Solução recomendada:**
Usar `docker-compose.0-gateway-stack.yml` mas **remover** todas as definições de proxy nginx, deixando apenas o Traefik.

### 2. Dashboard Stack

**Arquivo:** `docker-compose.1-dashboard-stack.yml`

**Serviços:**
- `dashboard-ui` (React + Vite)

**Dependências:** Gateway (Traefik)

**Porta exposta via Gateway:** http://localhost:9080/

**Status:** ✅ Arquivo correto, sem problemas identificados

### 3. Documentation Stack

**Arquivo:** `docker-compose.2-docs-stack.yml`

**Serviços:**
- `docs-hub` (Docusaurus v3)
- `documentation-api` (Node.js/Express)

**Dependências:** Gateway (Traefik)

**Portas expostas via Gateway:**
- http://localhost:9080/docs/ (Docusaurus)
- http://localhost:9080/api/docs/ (Documentation API)

**Status:** ✅ Arquivo correto, sem problemas identificados

### 4. Workspace Stack

**Arquivo:** `docker-compose.4-3-workspace-stack.yml`

**Serviços:**
- `workspace-api` (Node.js/Express)
- LowDB (file-based database)

**Dependências:** Gateway (Traefik)

**Porta exposta via Gateway:** http://localhost:9080/api/workspace/

**Status:** ✅ Arquivo correto, sem problemas identificados

### 5. n8n Automation Stack

**Arquivo:** `docker-compose-5-1-n8n-stack.yml`

**Serviços:**
- `n8n-postgres` (PostgreSQL)
- `n8n-redis` (Redis cache)
- `n8n-app` (n8n automation platform)
- `n8n-worker` (background jobs)
- `n8n-proxy` (nginx - iframe embedding)

**Dependências:**
- Gateway (Traefik)
- n8n-postgres, n8n-redis (internos)

**Porta exposta via Gateway:** http://localhost:9080/n8n/

**Status:** ✅ Arquivo correto, n8n-proxy está onde deve estar (no próprio stack)

**Configuração especial:** Requer `N8N_PROXY_TARGET=http://localhost:9080/n8n` no `.env`

---

## 🚀 Ordem Correta de Inicialização

```bash
# 1. Gateway (Traefik) - DEVE SER PRIMEIRO
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d

# 2. Dashboard
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d

# 3. Documentation
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d

# 4. Workspace
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml up -d

# 5. n8n (Opcional)
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml up -d
```

---

## ⚠️ Problemas Identificados

### 1. Gateway Stack com Proxies Nginx Indevidos

**Arquivo:** `docker-compose.0-gateway-stack.yml`

**Serviços que NÃO deveriam estar aqui:**
- `n8n-proxy` (deve estar em `docker-compose-5-1-n8n-stack.yml` - ✅ JÁ ESTÁ LÁ!)
- `kestra-proxy` (deve estar em `docker-compose.5-5-kestra-stack.yml`)
- `dbui-pgadmin-proxy` (deve estar em algum stack de dbui)
- `dbui-adminer-proxy` (deve estar em algum stack de dbui)
- `dbui-pgweb-proxy` (deve estar em algum stack de dbui)
- `dbui-questdb-proxy` (deve estar em algum stack de dbui)
- `grafana-proxy` (deve estar em `docker-compose.6-1-monitoring-stack.yml`)

**Impacto:**
Quando você inicia o Gateway, ele tenta criar TODOS esses proxies, mas os serviços backend (n8n-app, kestra, adminer, etc.) não estão rodando, causando crash loops.

**Solução:**
Remover todos os proxies nginx do `docker-compose.0-gateway-stack.yml`, deixando apenas o Traefik.

### 2. Arquivo `docker-compose.gateway.yml` Usa Porta 80

**Problema:** O arquivo `docker-compose.gateway.yml` (que só tem Traefik, sem proxies) usa porta 80, que está ocupada no sistema.

**O sistema foi configurado para usar porta 9080**, então devemos usar o arquivo `docker-compose.0-gateway-stack.yml` (após limpeza).

---

## 🔧 Scripts de Automação Criados

### 1. Script de Startup

**Localização:** `scripts/docker/startup-all-services.sh`

**Uso:**
```bash
bash scripts/docker/startup-all-services.sh
```

**O que faz:**
- Inicia Gateway (Traefik)
- Aguarda Gateway ficar healthy
- Inicia Dashboard
- Aguarda Dashboard ficar healthy
- Inicia Documentation
- Aguarda Documentation ficar healthy
- Inicia Workspace
- Aguarda Workspace ficar healthy
- Inicia n8n (se disponível)
- Aguarda n8n ficar healthy
- Mostra resumo e URLs de acesso

### 2. Script de Shutdown

**Localização:** `scripts/docker/stop-gateway-stack.sh`

**Uso:**
```bash
bash scripts/docker/stop-gateway-stack.sh
```

**O que faz:**
- Para n8n (ordem reversa)
- Para Workspace
- Para Documentation
- Para Dashboard
- Para Gateway (por último)

---

## 📝 Ações Necessárias

### ⚠️ CRÍTICO - Limpar Gateway Stack

**Arquivo a ser editado:** `tools/compose/docker-compose.0-gateway-stack.yml`

**Ações:**
1. **Remover** todas as definições de serviços proxy nginx (linhas ~203-450):
   - `n8n-proxy`
   - `kestra-proxy`
   - `dbui-pgadmin-proxy`
   - `dbui-adminer-proxy`
   - `dbui-pgweb-proxy`
   - `dbui-questdb-proxy`
   - `grafana-proxy`

2. **Manter** apenas:
   - Definição do serviço `traefik`
   - Networks
   - Volumes

3. **Verificar** se o Traefik está configurado para porta 9080 (não 80)

### ✅ Verificações Pós-Limpeza

Após limpar o Gateway stack, executar:

```bash
# 1. Parar tudo
bash scripts/docker/stop-gateway-stack.sh

# 2. Limpar volumes órfãos
docker volume prune

# 3. Iniciar tudo
bash scripts/docker/startup-all-services.sh

# 4. Verificar status
docker ps --filter 'label=com.tradingsystem.tier' --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## 🌐 URLs de Acesso

Após startup bem-sucedido:

- **Main Dashboard:** http://localhost:9080/
- **Gateway Dashboard:** http://localhost:9081/
- **Documentation Hub:** http://localhost:9080/docs/
- **Workspace API:** http://localhost:9080/api/workspace/
- **n8n Automation:** http://localhost:9080/n8n/

---

## 📚 Documentação de Referência

- **Gateway Policy:** `governance/policies/api-gateway-policy.md`
- **Traefik Migration Guide:** `docs/TRAEFIK-GATEWAY-MIGRATION.md`
- **Iframe Embedding Solution:** `IFRAME-EMBEDDING-DEFINITIVE-SOLUTION.md`
- **Environment Variables:** `docs/content/tools/security-config/env.mdx`

---

## 🐛 Troubleshooting

### Problema: "Address already in use" ao iniciar Gateway

**Causa:** Porta 9080 ou 9081 já está em uso

**Solução:**
```bash
# Verificar o que está usando as portas
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "9080|9081"

# Se for um container antigo, parar
docker stop <container-name>
```

### Problema: n8n-proxy em crash loop

**Causa:** n8n-proxy está definido no Gateway stack, mas n8n-app não está rodando

**Solução:** Remover n8n-proxy do Gateway stack (ele já está corretamente definido em `docker-compose-5-1-n8n-stack.yml`)

### Problema: Dashboard não carrega n8n

**Causa:** Variável `N8N_PROXY_TARGET` não está configurada no `.env`

**Solução:**
```bash
# Adicionar ao .env
echo "N8N_PROXY_TARGET=http://localhost:9080/n8n" >> .env

# Reiniciar Dashboard
docker restart dashboard-ui
```

---

## ✅ Checklist de Inicialização

- [ ] Porta 9080 está livre
- [ ] Porta 9081 está livre
- [ ] Networks `tradingsystem-network` e `tradingsystem_backend` existem
- [ ] Arquivo `.env` contém `N8N_PROXY_TARGET=http://localhost:9080/n8n`
- [ ] Gateway stack foi limpo (sem proxies nginx indevidos)
- [ ] Todos os volumes órfãos foram removidos (`docker volume prune`)
- [ ] Script de startup executou sem erros
- [ ] Todos os containers estão `healthy`
- [ ] URLs de acesso estão respondendo

---

**Última atualização:** 2025-11-12 09:30 BRT
