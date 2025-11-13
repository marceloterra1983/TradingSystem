# 🚀 TradingSystem - Guia de Inicialização Limpa

**Data:** 2025-11-12
**Status:** ✅ Pronto para uso

---

## 📋 Sumário das Correções

### Portas Adicionadas aos Compose Files

As seguintes portas foram **adicionadas** aos arquivos compose para garantir acesso direto aos serviços:

| Serviço | Arquivo | Porta | Mapeamento |
|---------|---------|-------|------------|
| **Dashboard UI** | `tools/compose/docker-compose.1-dashboard-stack.yml` | 8090 | `8090:3103` |
| **Documentation Hub** | `tools/compose/docker-compose.2-docs-stack.yml` | 3404 | `3404:80` |
| **Documentation API** | `tools/compose/docker-compose.2-docs-stack.yml` | 3405 | `3405:3000` |
| **Workspace API** | `tools/compose/docker-compose.4-3-workspace-stack.yml` | 3200 | `3200:3200` |

### Portas Já Configuradas

- **API Gateway (Traefik)**: `9080:9080` ✅
- **Traefik Dashboard**: `9081:9080` ✅

---

## 🧹 Passo 1: Limpeza Completa do Ambiente

**IMPORTANTE:** Execute este passo ANTES de iniciar os containers.

```bash
# Execute com sudo (requer privilégios de root)
sudo bash /workspace/.devcontainer/scripts/cleanup-environment.sh
```

**O script irá:**

1. ✅ Parar TODOS os containers Docker
2. ✅ Remover containers stopped
3. ✅ Matar processos nas portas: 9080, 9081, 8090, 3404, 3200, 3405, 4005, 4008, 4010
4. ✅ Verificar se as portas estão livres
5. ✅ Mostrar estado do sistema

**Confirmação:** O script pedirá confirmação antes de executar.

---

## 🚀 Passo 2: Iniciar Todas as Stacks

Após a limpeza, inicie todas as stacks:

```bash
# Dentro do dev container
cd /workspace
bash .devcontainer/scripts/start-all-stacks.sh
```

**Ordem de inicialização automática:**

1. `0-gateway-stack` - Traefik API Gateway
2. `5-0-database-stack` - PostgreSQL, Redis, Database UIs
3. `4-3-workspace-stack` - Workspace API + DB + Redis
4. `1-dashboard-stack` - Dashboard UI (React + Vite)
5. `2-docs-stack` - Documentation Hub + API

---

## ✅ Passo 3: Verificar Status

```bash
# Verificar containers em execução
docker ps --filter "label=com.tradingsystem.stack"

# Verificar portas mapeadas
netstat -tuln | grep -E ':(9080|9081|8090|3404|3200)'

# Verificar logs
docker logs -f api-gateway
docker logs -f dashboard-ui
docker logs -f docs-hub
```

---

## 🌐 Passo 4: Testar Acesso

### No Navegador (Host)

1. **API Gateway**: http://localhost:9080
2. **Traefik Dashboard**: http://localhost:9081/dashboard/
3. **Dashboard UI**: http://localhost:8090 ⭐
4. **Documentation Hub**: http://localhost:3404 ⭐
5. **Workspace API**: http://localhost:3200/api/health

### No Terminal (Dev Container)

```bash
# API Gateway
curl http://localhost:9080

# Dashboard
curl http://localhost:8090

# Documentation
curl http://localhost:3404

# Workspace API
curl http://localhost:3200/api/health

# Docs API
curl http://localhost:3405/health
```

---

## 🛑 Passo 5: Parar Todas as Stacks

Quando precisar parar tudo:

```bash
bash .devcontainer/scripts/stop-all-stacks.sh
```

---

## 🔧 Troubleshooting

### Problema: Porta em uso

```bash
# Identificar processo
lsof -i :8090

# Matar processo específico
kill -9 <PID>

# OU executar limpeza completa novamente
sudo bash .devcontainer/scripts/cleanup-environment.sh
```

### Problema: Container unhealthy

```bash
# Ver logs do container
docker logs <container-name>

# Reiniciar container específico
docker restart <container-name>

# Reiniciar stack completa
docker compose -f tools/compose/docker-compose.X-stack.yml restart
```

### Problema: 404 page not found

**Causa:** Traefik não conseguiu descobrir os serviços.

**Solução:**
```bash
# 1. Verificar se containers estão na rede correta
docker network inspect tradingsystem_frontend
docker network inspect tradingsystem_backend

# 2. Reiniciar gateway
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml restart

# 3. Verificar rotas do Traefik
curl http://localhost:9081/api/http/routers | jq
```

---

## 📊 Portas Completas do Sistema

| Porta | Serviço | Descrição |
|-------|---------|-----------|
| **9080** | API Gateway | Traefik - Entrypoint principal |
| **9081** | Traefik Dashboard | Monitoramento do gateway |
| **8090** | Dashboard UI | Interface principal (React) |
| **3404** | Documentation Hub | Docusaurus (estático) |
| **3405** | Documentation API | FlexSearch + CRUD |
| **3200** | Workspace API | API de workspace items |
| 4005 | TP Capital API | Trading signals |
| 4010 | Telegram Gateway | Telegram integration |

---

## 🎯 Checklist de Verificação

Após inicialização, verificar:

- [ ] API Gateway responde em http://localhost:9080
- [ ] Traefik Dashboard acessível em http://localhost:9081/dashboard/
- [ ] Dashboard UI carrega em http://localhost:8090
- [ ] Documentation Hub acessível em http://localhost:3404
- [ ] Workspace API retorna JSON em http://localhost:3200/api/health
- [ ] Todos os containers estão `Up (healthy)`
- [ ] Nenhuma porta conflitando

---

## 📝 Notas Importantes

1. **Sempre use o script de limpeza** antes de iniciar em um ambiente novo
2. **Aguarde 10-15 segundos** após `start-all-stacks.sh` para containers ficarem healthy
3. **Portas 8090 e 3404 são críticas** para acesso direto ao frontend
4. **Port forwarding do VSCode** deve estar ativo para acesso do host
5. **Networks externas** (`tradingsystem_backend`, `tradingsystem_frontend`) devem existir

---

**Última Atualização:** 2025-11-12
**Versão:** 1.0.0
