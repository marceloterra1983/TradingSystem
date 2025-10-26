# Execution Summary: Unified Migration Plan

**Change ID**: `unified-tp-capital-split-workspace-containerize`
**Created**: 2025-10-25
**Status**: Ready for Implementation

---

## ✅ Completed: Proposal Phase

### 1. Proposta Unificada Criada (3,262 linhas)

**Estrutura completa:**
```
unified-tp-capital-split-workspace-containerize/
├── proposal.md (612 linhas)
├── design.md (738 linhas)
├── tasks.md (690 linhas)
└── specs/
    ├── tp-capital-telegram-gateway/spec.md (312 linhas)
    ├── tp-capital-api/spec.md (414 linhas)
    └── workspace-service/spec.md (496 linhas)
```

### 2. Arquitetura Definida

**Antes (Monolítico)**:
- TP Capital: Local service (porta 4005) com Telegram integrado
- Workspace: Local service (porta 3200) com LowDB + TimescaleDB

**Depois (Splitado + Containerizado)**:
```
Telegram Servers
    ↓ MTProto
Telegram Gateway (LOCAL - systemd - Port 4006)
    ↓ HTTP POST /ingest (X-Gateway-Token)
TP Capital API (CONTAINER - Port 4005)
    ↓ PostgreSQL
TimescaleDB (CONTAINER - Port 5433)
    ↑ PostgreSQL
Workspace Service (CONTAINER - Port 3200)
```

### 3. Componentes Especificados

#### Telegram Gateway (Local - systemd)
> **NOTA IMPORTANTE**: O Telegram Gateway é um **serviço compartilhado** (`apps/telegram-gateway/`), não específico do TP Capital. Qualquer aplicação que precise integrar com Telegram pode usar este Gateway como intermediário.

- **Responsabilidades**:
  - Autenticação Telegram (MTProto)
  - Session files (`.session/` com permissões 0600)
  - Message reception (bot + user account)
  - HTTP POST para API com retry logic (3 tentativas, exponential backoff)
  - Failure queue (JSONL append-only)
  - Prometheus metrics

- **Endpoints**:
  - `GET /health` - Health check
  - `GET /metrics` - Prometheus metrics

#### TP Capital API (Container - Docker)
- **Responsabilidades**:
  - Endpoint `/ingest` (recebe do Gateway)
  - Autenticação via `X-Gateway-Token`
  - Idempotency checks (composite key: channelId, messageId, timestamp)
  - TimescaleDB persistence com retry logic
  - REST API para queries (/signals, /channels, etc)
  - Prometheus metrics

- **Endpoints**:
  - `POST /ingest` - Recebe mensagens do Gateway
  - `GET /signals` - Query signals
  - `GET /channels` - Gerenciar canais
  - `GET /health` - Health check
  - `GET /metrics` - Prometheus metrics

#### Workspace Service (Container - Docker)
- **Responsabilidades**:
  - CRUD de workspace items
  - **LowDB removido** - apenas TimescaleDB
  - Migração automática de `library.json → TimescaleDB`
  - Retry logic para conexões de banco
  - Prometheus metrics

- **Endpoints**:
  - `GET/POST/PUT/DELETE /api/items` - CRUD operations
  - `GET /health` - Health check
  - `GET /metrics` - Prometheus metrics

---

## 🚧 Próximos Passos (Implementação)

### Fase 1: Pre-Migration (1h) ✅ PARCIALMENTE COMPLETO
- [x] Backup criado em `/tmp/migration-backup-20251025/`
- [x] Serviços verificados (TP Capital e Workspace rodando)
- [x] Diretórios criados:
  ```
  apps/telegram-gateway/{src,data,.session}
  apps/tp-capital/api/{src/routes,src/middleware,src/services}
  ```

### Fase 2: Split TP Capital (4-6h) ⏳ PENDENTE
**Tarefas principais:**
1. Separar código Telegram para Gateway
   - `telegramIngestionManual.js` → Gateway
   - `telegramUserForwarderPolling.js` → Gateway
   - Criar HTTP POST client para API

2. Criar API com endpoint `/ingest`
   - Middleware de autenticação (`authGateway.js`)
   - Route `/ingest` com idempotency
   - Manter endpoints existentes (/signals, /channels)

3. Configurar `.env` separados
   - `.env.gateway` (credenciais Telegram)
   - `.env.api` (API_SECRET_TOKEN, TimescaleDB)

4. Criar systemd service para Gateway
   ```ini
   [Unit]
   Description=Telegram Gateway
   After=network-online.target

   [Service]
   Type=simple
   User=trading
   WorkingDirectory=/home/trading/apps/telegram-gateway
   ExecStart=/usr/bin/node src/server.js
   Restart=always
   RestartSec=10s
   MemoryMax=500M
   ```

### Fase 3: Containerize Workspace (3-4h) ⏳ PENDENTE
1. Criar `Dockerfile.dev` e `docker-compose.yml`
2. Remover código LowDB do `src/`
3. Criar script de migração `scripts/migrate-lowdb-to-timescale.js`
4. Testar hot-reload (nodemon + volume mounts)

### Fase 4-9: Restante (10-13h) ⏳ PENDENTE
- Docker Compose Integration
- Scripts & Automation (atualizar universal scripts)
- Data Migration (executar migração LowDB)
- End-to-End Testing
- Documentation
- Production Deploy

---

## 📋 Checklist de Implementação

### Gateway
- [ ] Criar `src/server.js` (HTTP server + health + metrics)
- [ ] Criar `src/telegramClient.js` (MTProto + session management)
- [ ] Criar `src/publishToAPI.js` (HTTP POST com retry logic)
- [ ] Criar `src/failureQueue.js` (JSONL append-only)
- [ ] Criar `.env.gateway` (TELEGRAM_*, GATEWAY_PORT, API_ENDPOINT, API_SECRET_TOKEN)
- [ ] Criar `package.json` (dependências: telegram, telegraf, prom-client)
- [ ] Criar systemd service file

### API
- [ ] Criar `src/routes/ingestion.js` (POST /ingest)
- [ ] Criar `src/middleware/authGateway.js` (valida X-Gateway-Token)
- [ ] Criar `src/services/signalStorage.js` (idempotency + TimescaleDB)
- [ ] Refatorar `src/server.js` (mover rotas Telegram para separado)
- [ ] Criar `Dockerfile.dev` e `docker-compose.yml`
- [ ] Criar `.env.api` (API_PORT, API_SECRET_TOKEN, TIMESCALEDB_*)

### Workspace
- [ ] Remover imports de LowDB
- [ ] Criar `scripts/migrate-lowdb-to-timescale.js`
- [ ] Criar `Dockerfile.dev` e `docker-compose.yml`
- [ ] Atualizar `src/server.js` (apenas TimescaleDB)
- [ ] Criar `.env.workspace` (WORKSPACE_PORT, TIMESCALEDB_*)

### Testing
- [ ] Teste 1: Gateway → API (mensagem com sucesso)
- [ ] Teste 2: Gateway → API (retry após falha transitória)
- [ ] Teste 3: Gateway → Failure Queue (API down)
- [ ] Teste 4: Idempotency (mensagem duplicada)
- [ ] Teste 5: Workspace CRUD (após migração LowDB)
- [ ] Teste 6: Hot-reload em containers
- [ ] Teste 7: Health checks (todos os componentes)
- [ ] Teste 8: Metrics endpoints (Prometheus scraping)

---

## 🔧 Comandos de Execução

### Desenvolvimento Local

**1. Iniciar Telegram Gateway (local)**:
```bash
cd apps/telegram-gateway
node src/server.js
# OU via systemd:
systemctl start tp-capital-gateway
```

**2. Iniciar API (container)**:
```bash
cd apps/tp-capital/api
docker compose up -d
# Logs em tempo real:
docker compose logs -f tp-capital-api
```

**3. Iniciar Workspace (container)**:
```bash
cd backend/api/workspace
docker compose up -d
docker compose logs -f workspace-service
```

### Validação

**Health Checks**:
```bash
curl http://localhost:4006/health  # Gateway
curl http://localhost:4005/health  # API
curl http://localhost:3200/health  # Workspace
```

**Metrics**:
```bash
curl http://localhost:4006/metrics  # Gateway
curl http://localhost:4005/metrics  # API
curl http://localhost:3200/metrics  # Workspace
```

**Test Message Flow**:
```bash
# Simular mensagem do Telegram (via Gateway)
# Gateway deve postar para API automaticamente
# Verificar no banco:
curl http://localhost:4005/signals?limit=1
```

---

## ⚠️ Breaking Changes

1. **Nova porta 4006** para Telegram Gateway (adicionar ao firewall)
2. **Token de autenticação** entre Gateway e API (configurar em ambos `.env`)
3. **Session files** movidos para `telegram-gateway/.session/` (backup necessário)
4. **LowDB removido** do Workspace (migração obrigatória)
5. **Variáveis de ambiente reorganizadas** (3 arquivos `.env` separados)
6. **Endpoints de ingest** mudaram (Gateway não aceita mais webhooks externos)

---

## 📊 Estimativas

**Total**: 18-24 horas over 5-7 days

| Fase | Tempo | Status |
|------|-------|--------|
| Pre-Migration | 1h | ✅ Parcial |
| Split TP Capital | 4-6h | ⏳ Pendente |
| Containerize Workspace | 3-4h | ⏳ Pendente |
| Docker Compose Integration | 2h | ⏳ Pendente |
| Scripts & Automation | 2h | ⏳ Pendente |
| Data Migration | 1h | ⏳ Pendente |
| End-to-End Testing | 3-4h | ⏳ Pendente |
| Documentation | 2-3h | ⏳ Pendente |
| Production Deploy | 1h | ⏳ Pendente |

---

## 🎯 Recomendação

A proposta está **100% especificada e pronta para implementação**.

**Para executar a migração completa**:
1. Reserve 3-5 dias de trabalho dedicado
2. Execute tasks.md sequencialmente (9 fases, 65+ tarefas)
3. Valide cada fase antes de prosseguir
4. Mantenha backups durante toda a migração

**Arquivos prontos para uso**:
- `proposal.md` - Justificativa executiva
- `design.md` - Decisões técnicas detalhadas
- `tasks.md` - Checklist completo de implementação (COPIAR E COLAR)
- `specs/*.md` - Especificações testáveis (formato OpenSpec)

**Localização**:
```
/home/marce/Projetos/TradingSystem/tools/openspec/changes/unified-tp-capital-split-workspace-containerize/
```

---

**Status Final**: 📋 Especificação completa, aguardando implementação sequencial das 9 fases.
