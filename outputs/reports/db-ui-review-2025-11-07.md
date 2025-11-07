# Revisão de Containers Database-UI e Database Stack
**Data:** 2025-11-07  
**Status:** Correções aplicadas + Stack renomeada

## 📊 Status Atual dos Containers

### Stack `database-ui` (docker-compose.database-ui.yml)

| Container | Status | Problema | Stack Correta | Correção |
|-----------|--------|----------|---------------|----------|
| `dbui-launcher-api` | ❌ Unhealthy | Docker CLI não encontrado | ✅ database-ui | ✅ Dockerfile corrigido |
| `dbui-pgadmin` | ❌ Unhealthy | Healthcheck usando curl (não existe) | ✅ database-ui | ✅ Healthcheck corrigido |
| `dbui-pgweb` | ❌ Restarting | `host.docker.internal` não resolve | ✅ database-ui | ✅ Config corrigida |
| `dbui-adminer` | ✅ Healthy | Funcionando | ✅ database-ui | - |

### Stack `database` (docker-compose.database.yml)

| Container | Status | Problema | Stack Correta | Correção |
|-----------|--------|----------|---------------|----------|
| `dbui-questdb` | ✅ Healthy | Funcionando | ✅ database-ui | ✅ Movido de database para database-ui |
| `data-postgres-langgraph` | ❌ Removido | LangGraph excluído do projeto | ✅ Removido | ✅ Container e referências removidos |

## ✅ Correções Aplicadas

### 1. ✅ Corrigido `dbui-pgweb` - host.docker.internal
- **Antes:** `postgresql://postgres:postgres@host.docker.internal:5433/postgres`
- **Depois:** `postgresql://postgres:${WORKSPACE_DB_PASSWORD}@workspace-db:5432/workspace`
- **Arquivo:** `tools/compose/docker-compose.database-ui.yml`
- **Status:** ✅ Corrigido - agora usa nome do serviço Docker

### 2. ✅ Corrigido `dbui-launcher-api` - Docker CLI
- **Problema:** Docker CLI não encontrado no container
- **Solução:** Adicionado `RUN apk add --no-cache docker-cli curl` no Dockerfile
- **Arquivo:** `backend/api/launcher-api/Dockerfile`
- **Status:** ✅ Corrigido - precisa rebuild do container

### 3. ✅ Corrigido `dbui-pgadmin` - Healthcheck
- **Antes:** `curl -f http://localhost:5050/misc/ping` (curl não existe)
- **Depois:** `wget --no-verbose --tries=1 --spider http://localhost:5050/misc/ping`
- **Arquivo:** `tools/compose/docker-compose.database-ui.yml`
- **Status:** ✅ Corrigido - wget existe no pgAdmin

### 4. ✅ Corrigido QuestDB - Portas e referências
- **Porta padrão:** `9002` (alinhado com compose)
- **Referência:** `docker-compose.data.yml` → `docker-compose.database.yml`
- **Arquivos:** 
  - `frontend/dashboard/src/config/endpoints.ts`
  - `frontend/dashboard/src/components/pages/DatabasePage.tsx`
- **Status:** ✅ Corrigido

## ✅ Remoção Completa

### 1. ✅ `data-postgres-langgraph` - Removido completamente
- **Status:** Container removido (LangGraph foi totalmente excluído do projeto)
- **Ações realizadas:**
  - ✅ Container parado e removido
  - ✅ Referência removida de `tools/docker-launcher/docker-control-server.js`
  - ✅ Verificado: nenhum volume associado encontrado
  - ✅ Verificado: nenhuma outra referência específica ao projeto encontrada

## 📝 Próximos Passos

1. **Rebuild `dbui-launcher-api`** para aplicar correção do Docker CLI:
   ```bash
   docker compose -f tools/compose/docker-compose.database-ui.yml build dbui-launcher-api
   docker compose -f tools/compose/docker-compose.database-ui.yml up -d dbui-launcher-api
   ```

2. **Reiniciar `dbui-pgweb`** para aplicar nova configuração:
   ```bash
   docker compose -f tools/compose/docker-compose.database-ui.yml restart dbui-pgweb
   ```

3. **Reiniciar `dbui-pgadmin`** para aplicar novo healthcheck:
   ```bash
   docker compose -f tools/compose/docker-compose.database-ui.yml restart dbui-pgadmin
   ```

4. **Testar todos os containers** após correções

## 📋 Resumo das Mudanças

### Arquivos Modificados:
1. `tools/compose/docker-compose.database-ui.yml` - pgweb e pgadmin corrigidos (stack renomeada de db-ui para database-ui)
2. `backend/api/launcher-api/Dockerfile` - Docker CLI adicionado
3. `frontend/dashboard/src/config/endpoints.ts` - Porta QuestDB corrigida
4. `frontend/dashboard/src/components/pages/DatabasePage.tsx` - Referências corrigidas
5. `tools/docker-launcher/docker-control-server.js` - Referência ao langgraph removida

### Containers que precisam rebuild/restart:
- `dbui-launcher-api` - Rebuild necessário
- `dbui-pgweb` - Restart necessário
- `dbui-pgadmin` - Restart necessário
