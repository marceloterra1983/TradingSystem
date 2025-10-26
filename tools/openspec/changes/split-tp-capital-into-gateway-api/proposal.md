---
change-id: split-tp-capital-into-gateway-api
status: proposal
created: 2025-10-25
author: Claude Code AI Agent
affected-specs:
  - tp-capital-telegram-gateway (NEW)
  - tp-capital-api (MODIFIED)
breaking: true
---

# Proposal: Split TP Capital into Telegram Gateway + Containerized API

## Why

O serviço **TP Capital** (porta 4005) atualmente é um monólito local que combina duas responsabilidades fundamentalmente diferentes:

1. **Integração Telegram** - Gerencia autenticação MTProto, mantém sessões persistentes (.session files), recebe mensagens via bot (Telegraf) e client (TelegramClient), e encaminha para canal destino
2. **Business Logic + API** - Expõe REST API, faz parsing de sinais, persiste em TimescaleDB, exporta métricas Prometheus, e serve o Dashboard

Esta arquitetura monolítica apresenta **problemas críticos**:

### 🔒 **Session Security Risk**
Session files Telegram (`.session`) contêm tokens de autenticação sensíveis que **NÃO devem** estar em volumes Docker. Containerizar o serviço completo requer montar esses arquivos como volumes, criando vetores de ataque e complexidade de secrets management.

### 📦 **Impossibilidade de Containerização**
Tentativas de containerizar o TP Capital completo enfrentam trade-offs inaceitáveis:
- **Session files em volumes Docker** → Security risk, gestão complexa de persistência
- **Session files fora de containers** → Volumes externos quebram isolamento Docker
- **Reautenticação a cada deploy** → Requer intervenção manual (telefone + 2FA), downtime prolongado

### 🚀 **Escalabilidade Bloqueada**
A API REST (endpoints `/signals`, `/channels`, `/logs`) poderia escalar horizontalmente, mas está acoplada ao Telegram client que **DEVE ser single-instance** (múltiplas sessões simultâneas causam ban pela Telegram API).

### 🔄 **Deploy Arriscado**
Qualquer mudança na lógica de API (ex: adicionar novo endpoint `/metrics/custom`) requer restart completo do serviço, **desconectando a sessão Telegram ativa** e perdendo mensagens durante reconexão.

### 📊 **Testing Complexo**
Testes unitários de parsing de sinais ou endpoints REST dependem de mockar todo o stack Telegram, tornando TDD praticamente inviável.

---

## Solution: Two-Layer Architecture

Separar o TP Capital em **dois serviços independentes** com responsabilidades bem definidas:

```
┌─────────────────────────────────────────┐
│  Telegram Gateway (LOCAL - Port 4006)   │
│  - Autenticação Telegram (MTProto)      │
│  - Session files (.session) em disco    │
│  - Recebe mensagens (bot + user client) │
│  - Publica via HTTP POST → API          │
└─────────────────┬───────────────────────┘
                  │ HTTP: POST /ingest
                  │ Auth: X-Gateway-Token
                  ▼
┌─────────────────────────────────────────┐
│  TP Capital API (CONTAINER - Port 4005) │
│  - REST API (Express + CORS + Helmet)   │
│  - Signal parsing e validação           │
│  - TimescaleDB persistence              │
│  - Prometheus metrics                   │
│  - CRUD channels/bots                   │
└─────────────────┬───────────────────────┘
                  │ PostgreSQL protocol
                  ▼
┌─────────────────────────────────────────┐
│  TimescaleDB (CONTAINER - Port 5433)    │
│  - tp_capital_signals                   │
│  - forwarded_messages                   │
│  - telegram_channels/bots               │
└─────────────────────────────────────────┘
```

**Benefícios Imediatos**:
- ✅ **Session files locais** → Zero risk, zero volume mounts
- ✅ **API containerizada** → Deploy independente, escalável, versionada
- ✅ **Restart sem downtime** → API restart não afeta conexão Telegram
- ✅ **Testing isolado** → Testar API sem mockar Telegram
- ✅ **Secrets separados** → Telegram creds apenas no gateway local

---

## What Changes

### 🆕 New Component: Telegram Gateway (Local Service)

**Location**: `apps/tp-capital/telegram-gateway/`
**Port**: `4006` (new)
**Technology**: Node.js local process (systemd service)

**Responsibilities**:
- ✅ Telegram authentication (MTProto via TelegramClient)
- ✅ Bot ingestion (Telegraf with polling)
- ✅ User account forwarding (TelegramClient with session files)
- ✅ Session file management (`.session` stored locally)
- ✅ HTTP publisher → POST to API `/ingest` endpoint
- ✅ Retry logic with exponential backoff (3 retries, 5s delay)
- ✅ Failure queue (persist messages if API is down)
- ✅ Minimal Express server (only `/health` endpoint)

**Files Created**:
```
apps/tp-capital/telegram-gateway/
├── src/
│   ├── index.js                    # Entry point
│   ├── telegramIngestion.js        # Telegraf bot (receives messages)
│   ├── telegramForwarder.js        # TelegramClient (forwards messages)
│   ├── httpPublisher.js            # NEW - Publishes to API
│   ├── retryQueue.js               # NEW - Handles failures
│   ├── config.js                   # Gateway config
│   └── logger.js                   # Pino logger
├── .session/                       # Session files (git ignored)
├── .env                            # Telegram credentials
├── package.json
├── tp-capital-gateway.service      # systemd unit file
└── README.md
```

**New Environment Variables** (`.env`):
```bash
# Telegram Authentication (SENSITIVE)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abc123...
TELEGRAM_PHONE_NUMBER=+5511999999999
TELEGRAM_SESSION=1AGAOMTQ5LjE1...

# Bot Tokens
TELEGRAM_INGESTION_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_DESTINATION_CHANNEL_ID=-1001234567890

# Gateway Configuration
GATEWAY_PORT=4006
API_ENDPOINT=http://localhost:4005/ingest
API_SECRET_TOKEN=change_me_gateway_token_secure_random_string

# Retry Configuration
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=5000
FAILURE_QUEUE_PATH=./data/failure-queue.jsonl
```

---

### 🔄 Modified Component: TP Capital API (Containerized)

**Location**: `apps/tp-capital/api/`
**Port**: `4005` (unchanged)
**Technology**: Docker container (Node.js 20 Alpine)

**Responsibilities**:
- ✅ REST API (Express + Helmet + CORS + Rate Limiting)
- ✅ **NEW**: `/ingest` endpoint (receives from Gateway)
- ✅ Signal parsing and validation
- ✅ TimescaleDB persistence (inserts/queries)
- ✅ Prometheus metrics export (`/metrics`)
- ✅ CRUD endpoints (`/signals`, `/channels`, `/bots`, `/logs`)
- ✅ Health checks (`/health`)
- ✅ **NEW**: Gateway authentication (validates `X-Gateway-Token`)
- ✅ **NEW**: Idempotency checks (prevent duplicate signals)

**Files Created/Modified**:
```
apps/tp-capital/api/
├── src/
│   ├── server.js                   # Express server (MODIFIED)
│   ├── routes/
│   │   ├── ingestion.js            # NEW - Gateway ingestion endpoint
│   │   ├── signals.js              # Existing signals routes
│   │   ├── channels.js             # Existing channels CRUD
│   │   ├── bots.js                 # Existing bots CRUD
│   │   └── health.js               # Existing health checks
│   ├── middleware/
│   │   ├── authGateway.js          # NEW - Validates Gateway token
│   │   └── idempotency.js          # NEW - Prevents duplicates
│   ├── services/
│   │   ├── timescaleClient.js      # Existing DB client
│   │   ├── parseSignal.js          # Existing signal parser
│   │   └── metricsService.js       # Existing Prometheus
│   ├── config.js                   # API config
│   └── logger.js                   # Pino logger
├── Dockerfile                      # NEW - Multi-stage build
├── .dockerignore                   # NEW
├── package.json
└── README.md
```

**New Environment Variables** (Docker Compose):
```bash
# Server Configuration
PORT=4005
NODE_ENV=production

# Database Connection
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_DATABASE=APPS-TPCAPITAL
TIMESCALEDB_SCHEMA=tp_capital
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=pass_timescale

# Gateway Authentication
GATEWAY_SECRET_TOKEN=change_me_gateway_token_secure_random_string

# CORS Configuration
CORS_ORIGIN=http://localhost:3103,http://localhost:3004

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

---

### 🔗 New Communication Flow

#### 1. Telegram → Gateway
```javascript
// telegramIngestion.js (Gateway)
bot.on('channel_post', async (post) => {
  const messageData = {
    channelId: post.chat.id,
    messageId: post.message_id,
    text: post.text || post.caption,
    timestamp: new Date(post.date * 1000).toISOString(),
    photos: post.photo ? extractPhotoData(post.photo) : [],
  };

  // Publish to API with retry logic
  await httpPublisher.publish(messageData);
});
```

#### 2. Gateway → API
```javascript
// httpPublisher.js (Gateway - NEW)
export async function publish(messageData) {
  const response = await fetch(`${config.apiEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Token': config.apiSecretToken,
    },
    body: JSON.stringify(messageData),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
}
```

#### 3. API → TimescaleDB
```javascript
// routes/ingestion.js (API - NEW)
router.post('/ingest',
  authGateway,      // Validate X-Gateway-Token
  idempotency,      // Check if already processed
  async (req, res) => {
    const messageData = req.body;

    // Parse signal from message text
    const parsed = parseSignal(messageData.text);

    // Insert into TimescaleDB
    await timescaleClient.insertSignal({
      channel_id: messageData.channelId,
      asset: parsed.asset,
      signal_type: parsed.type,
      price: parsed.price,
      stop_loss: parsed.stopLoss,
      take_profit: parsed.takeProfit,
      raw_message: messageData.text,
      ingested_at: messageData.timestamp,
    });

    res.json({ status: 'ok' });
  }
);
```

---

### 📦 Docker Compose Integration

**New File**: `tools/compose/docker-compose.tp-capital.yml`

```yaml
version: '3.8'

services:
  tp-capital-api:
    build:
      context: ../../apps/tp-capital/api
      dockerfile: Dockerfile
    container_name: tp-capital-api
    image: img-tp-capital-api:latest
    ports:
      - "4005:4005"
    environment:
      NODE_ENV: production
      PORT: 4005
      TIMESCALEDB_HOST: ${TIMESCALEDB_HOST:-localhost}
      TIMESCALEDB_PORT: ${TIMESCALEDB_PORT:-5433}
      TIMESCALEDB_DATABASE: ${TIMESCALEDB_DATABASE:-APPS-TPCAPITAL}
      TIMESCALEDB_USER: ${TIMESCALEDB_USER:-timescale}
      TIMESCALEDB_PASSWORD: ${TIMESCALEDB_PASSWORD}
      GATEWAY_SECRET_TOKEN: ${GATEWAY_SECRET_TOKEN}
      CORS_ORIGIN: ${CORS_ORIGIN}
    networks:
      - tradingsystem
    depends_on:
      - timescaledb
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4005/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  tradingsystem:
    external: true
```

---

### 🛠️ Scripts Updates

#### Universal Startup (`scripts/universal/start.sh`)
- ✅ Detect if `tp-capital-api` container exists
- ✅ Start container if exists: `docker compose -f tools/compose/docker-compose.tp-capital.yml up -d`
- ✅ Check if Gateway process is running (port 4006)
- ✅ Start Gateway if not running: `systemctl start tp-capital-gateway` (or direct `node` command)

#### Health Check (`scripts/maintenance/health-check-all.sh`)
- ✅ Check container health: `docker inspect tp-capital-api --format='{{.State.Health.Status}}'`
- ✅ Check Gateway HTTP: `curl -s http://localhost:4006/health`
- ✅ Validate communication: Gateway → API connectivity test

---

## Impact

### 🔴 Breaking Changes

#### 1. **BREAKING**: TP Capital monolítico não existe mais
- **Before**: Single service at `apps/tp-capital/` on port 4005
- **After**: Two services - Gateway (4006) + API (4005)
- **Migration**: Follow migration guide to split codebase and configure secrets

#### 2. **BREAKING**: New port 4006 for Gateway
- **Before**: Only port 4005 used
- **After**: Port 4006 (Gateway) + port 4005 (API)
- **Impact**: Firewall rules may need updates if restrictive

#### 3. **BREAKING**: Separate environment files
- **Before**: Single `.env` in `apps/tp-capital/`
- **After**: Gateway `.env` (Telegram creds) + API `.env` (DB creds)
- **Migration**: Copy credentials to appropriate files, generate `GATEWAY_SECRET_TOKEN`

#### 4. **BREAKING**: Startup command changed
- **Before**: `cd apps/tp-capital && npm run dev`
- **After**:
  - Gateway: `systemctl start tp-capital-gateway` (or `node src/index.js`)
  - API: `docker compose -f tools/compose/docker-compose.tp-capital.yml up -d`
- **Workaround**: Universal `start` command handles both automatically

#### 5. **BREAKING**: Session files location moved
- **Before**: `apps/tp-capital/.session`
- **After**: `apps/tp-capital/telegram-gateway/.session`
- **Migration**: Move session files to new location before first startup

---

### 📊 Affected Components

| Component | Impact | Action Required |
|-----------|--------|-----------------|
| **TP Capital (monolith)** | Split into 2 services | Follow migration guide, test end-to-end |
| **Telegram Gateway** | NEW service | Install systemd unit, configure .env |
| **TP Capital API** | Containerized | Build Docker image, configure compose |
| **Docker Compose** | New file added | Add `docker-compose.tp-capital.yml` to startup scripts |
| **Universal Scripts** | Detection logic | Update `start.sh`, `stop.sh`, `status.sh` |
| **Health Check** | Two endpoints | Check both Gateway (4006) and API (4005) |
| **Dashboard** | API calls | No changes needed (port 4005 maintained) |
| **Prometheus** | Two targets | Add Gateway metrics scraping (4006/metrics) |
| **Documentation** | Architecture | Update diagrams, README, ADRs |

---

### ✨ Benefits

#### 🔒 **Security Improvements**
- ✅ Session files **never** leave local filesystem
- ✅ Telegram credentials isolated to Gateway only
- ✅ API has zero access to Telegram secrets
- ✅ Gateway authentication via shared token (rotatable)

#### 🚀 **Operational Excellence**
- ✅ **Independent deployments**: Update API without Telegram disconnect
- ✅ **Scalability unlocked**: API can scale horizontally (multiple replicas)
- ✅ **Graceful degradation**: API restart doesn't break message reception
- ✅ **Rollback trivial**: Docker tag rollback for API, Gateway unaffected

#### 🧪 **Development Velocity**
- ✅ **Isolated testing**: Test API endpoints without Telegram mocks
- ✅ **Faster iteration**: API changes don't require Telegram reauth
- ✅ **Clear boundaries**: Two repos with single responsibilities
- ✅ **Parallel development**: Teams can work on Gateway and API independently

#### 📊 **Monitoring & Observability**
- ✅ **Separate metrics**: Gateway connection status vs API performance
- ✅ **Failure isolation**: Identify if issue is Telegram or DB related
- ✅ **Granular health checks**: Both services have dedicated `/health` endpoints
- ✅ **Retry visibility**: Track Gateway→API failures and retries

---

### ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Message loss during API downtime** | Messages not persisted | Gateway retry logic (3x) + failure queue (JSONL) |
| **Network latency Gateway→API** | Increased message processing time | Local communication (localhost), <10ms overhead |
| **Duplicate messages on retry** | Duplicate signals in DB | API idempotency checks (messageId + timestamp) |
| **Gateway crash loses buffer** | Messages in memory lost | Persist to failure queue before processing |
| **API crash during write** | Partial writes to TimescaleDB | DB transactions + rollback on error |
| **Misconfigured GATEWAY_SECRET_TOKEN** | Unauthorized access or denial | Validation in API startup, clear error messages |
| **Session file corruption** | Gateway authentication fails | Backup session files before migration |

---

## Compatibility

### ✅ Backward Compatible
- ✅ **Port 4005 maintained**: Dashboard and external clients unchanged
- ✅ **API endpoints identical**: `/signals`, `/channels`, `/bots` - zero changes
- ✅ **Database schema unchanged**: No migrations required
- ✅ **Universal commands**: `start`, `stop`, `status` work seamlessly
- ✅ **Docker Compose networks**: Integrates with existing `tradingsystem` network

### ⚠️ Breaking Changes
- ⚠️ **Direct Telegram integration removed from API**: Must use Gateway
- ⚠️ **New port 4006**: Gateway requires firewall rule if restricted
- ⚠️ **Two .env files**: Separate secrets management
- ⚠️ **systemd service**: Gateway requires service installation
- ⚠️ **Session files moved**: Update backup scripts if automated

---

## Migration Path

### Phase 1: Pre-Migration (30 minutes)
1. ✅ Backup session files: `cp -r apps/tp-capital/.session /backup/`
2. ✅ Backup current `.env`: `cp apps/tp-capital/.env /backup/tp-capital.env.backup`
3. ✅ Export existing data: `pg_dump -h localhost -p 5433 -U timescale APPS-TPCAPITAL > backup.sql`
4. ✅ Verify TimescaleDB health: `curl http://localhost:5433` (should connect)

### Phase 2: Code Split (1-2 hours)
1. ✅ Create directory structure: `telegram-gateway/` and `api/`
2. ✅ Move Telegram code to Gateway: `telegramIngestion.js`, `telegramForwarder.js`
3. ✅ Move API code to API: `server.js`, `routes/`, `services/`
4. ✅ Create shared code: `shared/types.js`, `shared/validators.js`
5. ✅ Implement `httpPublisher.js` in Gateway
6. ✅ Implement `/ingest` endpoint in API

### Phase 3: Configuration (30 minutes)
1. ✅ Create Gateway `.env` with Telegram credentials
2. ✅ Create API `.env` with DB credentials
3. ✅ Generate secure `GATEWAY_SECRET_TOKEN`: `openssl rand -hex 32`
4. ✅ Add token to both `.env` files (must match)
5. ✅ Create systemd unit file: `tp-capital-gateway.service`

### Phase 4: Containerization (1 hour)
1. ✅ Create `Dockerfile` for API
2. ✅ Create `.dockerignore`
3. ✅ Create `docker-compose.tp-capital.yml`
4. ✅ Build image: `docker compose build`
5. ✅ Test locally: `docker compose up` (verify logs)

### Phase 5: Testing (1-2 hours)
1. ✅ Start Gateway: `node telegram-gateway/src/index.js`
2. ✅ Start API: `docker compose up`
3. ✅ Send test message to Telegram channel
4. ✅ Verify Gateway receives message (check logs)
5. ✅ Verify Gateway publishes to API (check logs)
6. ✅ Verify API persists to TimescaleDB: `SELECT * FROM tp_capital_signals ORDER BY ingested_at DESC LIMIT 10`
7. ✅ Test retry logic: Stop API, send message, restart API (should persist)
8. ✅ Test idempotency: Send duplicate message (should skip)
9. ✅ Test health checks: `curl http://localhost:4006/health` and `curl http://localhost:4005/health`

### Phase 6: Production Deploy (30 minutes)
1. ✅ Stop old monolith: `pkill -f "node.*tp-capital"`
2. ✅ Install Gateway systemd service: `sudo systemctl enable tp-capital-gateway`
3. ✅ Start Gateway: `sudo systemctl start tp-capital-gateway`
4. ✅ Start API: `docker compose -f tools/compose/docker-compose.tp-capital.yml up -d`
5. ✅ Update universal scripts: `start.sh`, `stop.sh`, `status.sh`
6. ✅ Verify end-to-end: Send message, check Dashboard
7. ✅ Monitor logs: `journalctl -u tp-capital-gateway -f` and `docker logs -f tp-capital-api`

---

## Timeline

**Total Estimated Effort**: 12-16 hours (including testing and documentation)

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **1. Pre-Migration** | 30 min | None |
| **2. Code Split** | 1-2 hours | Phase 1 complete |
| **3. Configuration** | 30 min | Phase 2 complete |
| **4. Containerization** | 1 hour | Phase 3 complete |
| **5. Testing** | 1-2 hours | Phase 4 complete |
| **6. Production Deploy** | 30 min | Phase 5 complete |
| **7. Documentation** | 2-3 hours | Phase 6 complete |
| **8. Monitoring Setup** | 1 hour | Phase 6 complete |

**Total Development Time**: 7-9 hours
**Total Documentation/QA Time**: 5-7 hours

---

## Success Metrics

### Implementation Success
- ✅ Gateway starts and connects to Telegram without errors
- ✅ API container starts and connects to TimescaleDB
- ✅ End-to-end message flow: Telegram → Gateway → API → DB → Dashboard
- ✅ Retry logic works: API downtime doesn't lose messages
- ✅ Idempotency works: Duplicate messages are skipped
- ✅ Health checks passing: Both `/health` endpoints return 200
- ✅ Universal commands work: `start`, `stop`, `status` detect both services

### Performance Benchmarks
- ✅ Message latency < 100ms (Telegram → DB)
- ✅ Gateway → API HTTP call < 10ms (localhost)
- ✅ API container memory < 200MB
- ✅ Gateway process memory < 150MB
- ✅ Zero message loss during 24h test period

### Post-Deploy Monitoring (7 days)
- Container restarts < 1/day (API)
- Gateway process uptime > 99.9%
- TimescaleDB connection errors = 0
- Gateway → API failures < 0.1% (with retries)
- Dashboard signal freshness < 5 seconds

---

## Open Questions

### 1. ⚠️ Retry Queue Persistence Format
**Question**: Should failure queue use JSONL, SQLite, or Redis?
**Options**:
- **JSONL** (simple, append-only, easy inspection)
- **SQLite** (query capabilities, ACID, size limits)
- **Redis** (fast, distributed, requires additional container)

**Recommendation**: **JSONL** (simplicity, low dependencies, easy recovery)

### 2. ⚠️ Monitoring Stack Integration
**Question**: Should Gateway export Prometheus metrics?
**Options**:
- **Yes** - Add `/metrics` endpoint to Gateway (port 4006/metrics)
- **No** - Only API exports metrics

**Recommendation**: **Yes** - Gateway metrics are critical:
- `telegram_connection_status` (gauge: 0/1)
- `telegram_messages_received_total` (counter)
- `telegram_messages_published_total` (counter)
- `telegram_publish_failures_total` (counter)

### 3. ⚠️ Gateway High Availability
**Question**: Should Gateway have failover mechanism?
**Options**:
- **Single instance** (current proposal)
- **Active-Passive** (standby Gateway with session file sync)
- **Not needed** (Gateway crash is recoverable, messages buffer in Telegram)

**Recommendation**: **Single instance** (active-passive adds complexity, Telegram buffering is sufficient)

---

## References

### Related Specs
- **NEW**: `specs/tp-capital-telegram-gateway/spec.md` (this proposal)
- **MODIFIED**: `specs/tp-capital-api/spec.md` (this proposal)
- **EXISTING**: `specs/status/spec.md` (affected - health check updates)

### Affected Documentation
- `CLAUDE.md` - Update TP Capital architecture section
- `INVENTARIO-SERVICOS.md` - Add Gateway, modify API entry
- `API-INTEGRATION-STATUS.md` - Update TP Capital status
- `docs/context/backend/guides/guide-tp-capital.md` - Complete rewrite
- `docs/context/ops/service-startup-guide.md` - Add Gateway startup
- `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` - Separate .env docs

### Future ADRs
- **ADR-00X**: Two-layer architecture pattern for services with persistent connections
- **ADR-00Y**: systemd vs Docker for session-based services

### Related Proposals
- `containerize-tp-capital-workspace` - Different approach (full containerization)
- This proposal is **mutually exclusive** with full containerization approach

---

**Status**: 🟡 Proposal Stage (awaiting approval)
**Author**: Claude Code AI Agent
**Date**: 2025-10-25
**Change ID**: `split-tp-capital-into-gateway-api`
**Priority**: High (architectural change, enables future scalability)
