---
change-id: adapt-tp-capital-consume-gateway
status: proposal
created: 2025-10-26
author: Claude Code AI Agent
affected-specs:
  - tp-capital-api (MODIFIED)
breaking: true
---

# Proposal: Adapt TP Capital to Consume from Telegram Gateway Database

## Why

O **TP Capital** (porta 4005) atualmente mantém sua própria conexão direta com a API do Telegram através de um bot Telegraf (`telegramIngestion.js`), duplicando funcionalidade que já existe no **Telegram Gateway** (porta 4006).

Esta duplicação apresenta **problemas críticos de arquitetura**:

### 🔄 **Duplicação de Responsabilidade**
Dois serviços diferentes (`telegram-gateway` e `tp-capital`) mantêm conexões independentes com a API do Telegram para receber mensagens dos mesmos canais. Isso viola o princípio **Single Source of Truth**.

### 🎯 **Acoplamento Telegram ↔ Business Logic**
O TP Capital mistura duas responsabilidades completamente distintas:
1. **Integração Telegram** - Conexão com API, autenticação de bot, recepção de mensagens
2. **Business Logic de Sinais** - Parsing de mensagens, validação de sinais, persistência no banco

Esta mistura torna impossível:
- Testar parsing de sinais sem mockar Telegram
- Fazer deploy da lógica de negócio sem reautenticar bot
- Escalar processamento de sinais independentemente de I/O do Telegram

### 📊 **Perda de Dados e Inconsistência**
O **Telegram Gateway** já está configurado e operacional, salvando TODAS as mensagens de TODOS os canais em `telegram_gateway.telegram_messages`. Porém, o TP Capital ignora completamente esses dados e cria sua própria ingestão paralela, gerando:
- **Duplicação de dados** - Mesma mensagem em duas tabelas diferentes
- **Risco de perda** - Se bot do TP Capital falhar, mensagens não são capturadas
- **Inconsistência temporal** - Gateway e TP Capital podem processar em tempos diferentes

### 🔐 **Gestão de Credenciais Complexa**
Dois serviços diferentes precisam de tokens Telegram:
- Gateway: `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_SESSION`
- TP Capital: `TELEGRAM_INGESTION_BOT_TOKEN`

Isso multiplica surface area de segurança e dificulta rotação de credenciais.

### 🚀 **Impossibilidade de Reutilização**
Outros serviços futuros (ex: análise de sentimento, alertas customizados, audit logs) que precisem consumir mensagens do Telegram terão que escolher entre:
1. Criar seu próprio bot (mais duplicação)
2. Depender do TP Capital (acoplamento errado)
3. Não ter acesso aos dados históricos

---

## Solution: Database-Driven Consumer Pattern

Transformar o TP Capital em um **consumidor passivo** do Telegram Gateway, utilizando o padrão de **polling de banco de dados** para processar mensagens.

```
┌──────────────────────────────────────────┐
│   Telegram Gateway (LOCAL - Port 4006)   │  ← ALREADY EXISTS
│   - MTProto authentication               │
│   - Receives ALL messages (bot + client) │
│   - Stores in telegram_messages table    │
└────────────────┬─────────────────────────┘
                 │ PostgreSQL INSERT
                 ▼
┌──────────────────────────────────────────┐
│     TimescaleDB - telegram_gateway DB    │
│  Table: telegram_messages                │
│  - channel_id, message_id, text          │
│  - timestamp, status, metadata           │
└────────────────┬─────────────────────────┘
                 │ SELECT ... WHERE channel_id = -1001649127710
                 │          AND status = 'received'
                 ▼
┌──────────────────────────────────────────┐
│  TP Capital Polling Worker (NEW)         │  ← TO BE CREATED
│  - Polls every 5 seconds                 │
│  - Filters signals channel only          │
│  - Parses messages → signals             │
│  - Marks as processed                    │
└────────────────┬─────────────────────────┘
                 │ INSERT into tp_capital_signals
                 ▼
┌──────────────────────────────────────────┐
│     TimescaleDB - tp_capital DB          │
│  Table: tp_capital_signals               │
│  - asset, buy_min, buy_max, targets      │
│  - stop, raw_message, ingested_at        │
└──────────────────────────────────────────┘
```

**Benefícios Imediatos**:
- ✅ **Single source of truth** - Gateway é o único ponto de ingestão do Telegram
- ✅ **Separation of concerns** - Gateway = I/O, TP Capital = Business Logic
- ✅ **Historical data access** - TP Capital pode processar mensagens antigas
- ✅ **Simplified testing** - Testar parsing inserindo dados direto no banco
- ✅ **Reusability** - Outros serviços podem consumir mesma fonte
- ✅ **No duplicate credentials** - TP Capital não precisa mais de token Telegram

---

## What Changes

### 🔴 **Removed Components**

#### 1. Direct Telegram Bot Connection (REMOVED)
- **File**: `apps/tp-capital/src/telegramIngestion.js` (DELETE)
- **Reason**: Gateway já faz este trabalho
- **Impact**: TP Capital não terá mais conexão direta com Telegram API
- **Migration**: Nenhuma - funcionalidade substituída por polling worker

#### 2. Telegram Bot Token Configuration (REMOVED)
- **Variable**: `TELEGRAM_INGESTION_BOT_TOKEN` (DELETE from .env)
- **Reason**: TP Capital não precisa mais autenticar com Telegram
- **Impact**: Uma credencial a menos para gerenciar
- **Migration**: Remover do `.env`, documentar em README

#### 3. Server.js Telegram Bot Initialization (REMOVED)
- **File**: `apps/tp-capital/src/server.js` (MODIFY)
- **Lines to remove**: Import e inicialização de `telegramIngestion`
- **Before**:
```javascript
import { createTelegramIngestion } from './telegramIngestion.js';
const telegramBot = createTelegramIngestion();
if (telegramBot) await telegramBot.launch();
```
- **After**: Código removido completamente

---

### 🆕 **New Components**

#### 1. Gateway Polling Worker (NEW)
- **File**: `apps/tp-capital/src/gatewayPollingWorker.js` (CREATE)
- **Responsibility**: Poll `telegram_gateway.telegram_messages` for signals channel
- **Key Features**:
  - Polls every 5 seconds (configurable via `GATEWAY_POLLING_INTERVAL_MS`)
  - Filters: `channel_id = '-1001649127710' AND status = 'received'`
  - Batch processing: Fetch up to 100 messages per poll (prevents overload)
  - Error handling: Retry with exponential backoff on DB errors
  - Graceful shutdown: Finish current batch before stopping
  - Idempotency: Skip messages already processed (check by `message_id`)

**Implementation Sketch**:
```javascript
export class GatewayPollingWorker {
  constructor({ interval, channelId, logger, gatewayDb, tpCapitalDb }) {
    this.interval = interval || 5000; // 5s default
    this.channelId = channelId;
    this.logger = logger;
    this.gatewayDb = gatewayDb; // Connection to telegram_gateway DB
    this.tpCapitalDb = tpCapitalDb; // Connection to tp_capital DB
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    this.logger.info('Gateway polling worker started');
    while (this.isRunning) {
      try {
        await this.pollAndProcess();
      } catch (error) {
        this.logger.error({ err: error }, 'Polling cycle failed');
      }
      await this.sleep(this.interval);
    }
  }

  async pollAndProcess() {
    // 1. Fetch unprocessed messages from Gateway DB
    const messages = await this.gatewayDb.query(`
      SELECT channel_id, message_id, text, telegram_date, metadata
      FROM telegram_gateway.telegram_messages
      WHERE channel_id = $1 AND status = 'received'
      ORDER BY received_at ASC
      LIMIT 100
    `, [this.channelId]);

    if (messages.rows.length === 0) {
      this.logger.debug('No new messages to process');
      return;
    }

    this.logger.info({ count: messages.rows.length }, 'Processing batch');

    // 2. Process each message
    for (const msg of messages.rows) {
      try {
        await this.processMessage(msg);
      } catch (error) {
        this.logger.error({ err: error, messageId: msg.message_id }, 'Failed to process message');
        // Mark as failed in Gateway DB
        await this.gatewayDb.query(`
          UPDATE telegram_gateway.telegram_messages
          SET status = 'failed', metadata = metadata || $1
          WHERE message_id = $2
        `, [JSON.stringify({ error: error.message }), msg.message_id]);
      }
    }
  }

  async processMessage(msg) {
    // 3. Parse signal from message text
    const signal = parseSignal(msg.text, {
      timestamp: msg.telegram_date,
      channel: msg.channel_id,
      source: 'telegram-gateway'
    });

    // 4. Check if already processed (idempotency)
    const exists = await this.tpCapitalDb.query(`
      SELECT 1 FROM tp_capital.tp_capital_signals
      WHERE raw_message = $1 AND channel = $2
      LIMIT 1
    `, [msg.text, msg.channel_id]);

    if (exists.rows.length > 0) {
      this.logger.debug({ messageId: msg.message_id }, 'Signal already processed, skipping');
      // Mark as published in Gateway DB
      await this.gatewayDb.query(`
        UPDATE telegram_gateway.telegram_messages
        SET status = 'published'
        WHERE message_id = $1
      `, [msg.message_id]);
      return;
    }

    // 5. Insert into TP Capital signals table
    await this.tpCapitalDb.query(`
      INSERT INTO tp_capital.tp_capital_signals (
        channel, signal_type, asset, buy_min, buy_max,
        target_1, target_2, target_final, stop,
        raw_message, source, ingested_at, ts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      signal.channel, signal.signal_type, signal.asset,
      signal.buy_min, signal.buy_max, signal.target_1,
      signal.target_2, signal.target_final, signal.stop,
      signal.raw_message, signal.source, signal.ingested_at, signal.ts
    ]);

    // 6. Mark as published in Gateway DB
    await this.gatewayDb.query(`
      UPDATE telegram_gateway.telegram_messages
      SET status = 'published', metadata = metadata || $1
      WHERE message_id = $2
    `, [JSON.stringify({ processed_by: 'tp-capital', processed_at: new Date() }), msg.message_id]);

    this.logger.info({ asset: signal.asset, messageId: msg.message_id }, 'Signal processed successfully');
  }

  async stop() {
    this.logger.info('Stopping gateway polling worker...');
    this.isRunning = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 2. Gateway Database Client (NEW)
- **File**: `apps/tp-capital/src/gatewayDatabaseClient.js` (CREATE)
- **Responsibility**: Manage connection pool to `telegram_gateway` database
- **Configuration**: Uses same TimescaleDB host, different database name
- **Environment Variables**:
  ```bash
  GATEWAY_DATABASE_NAME=telegram_gateway  # Default
  GATEWAY_DATABASE_SCHEMA=telegram_gateway
  # Reuses: TIMESCALEDB_HOST, TIMESCALEDB_PORT, TIMESCALEDB_USER, TIMESCALEDB_PASSWORD
  ```

**Implementation**:
```javascript
import pkg from 'pg';
const { Pool } = pkg;

let gatewayPool;

export async function getGatewayPool() {
  if (!gatewayPool) {
    gatewayPool = new Pool({
      host: process.env.TIMESCALEDB_HOST || 'localhost',
      port: parseInt(process.env.TIMESCALEDB_PORT || '5433', 10),
      database: process.env.GATEWAY_DATABASE_NAME || 'telegram_gateway',
      user: process.env.TIMESCALEDB_USER || 'timescale',
      password: process.env.TIMESCALEDB_PASSWORD,
      max: 5, // Lower pool size (read-only operations)
      idleTimeoutMillis: 30000,
    });

    gatewayPool.on('error', (err) => {
      console.error('Gateway DB pool error:', err);
    });
  }

  return gatewayPool;
}

export async function closeGatewayPool() {
  if (gatewayPool) {
    await gatewayPool.end();
    gatewayPool = null;
  }
}
```

#### 3. Server.js Integration (MODIFIED)
- **File**: `apps/tp-capital/src/server.js` (MODIFY)
- **Changes**:
  - Remove Telegram bot imports and initialization
  - Add Gateway polling worker import and initialization
  - Start worker after server is ready
  - Graceful shutdown includes stopping worker

**Changes**:
```javascript
// OLD (REMOVE):
import { createTelegramIngestion } from './telegramIngestion.js';

// NEW (ADD):
import { GatewayPollingWorker } from './gatewayPollingWorker.js';
import { getGatewayPool, closeGatewayPool } from './gatewayDatabaseClient.js';

// OLD (REMOVE):
const telegramBot = createTelegramIngestion();
if (telegramBot) {
  await telegramBot.launch();
  logger.info('Telegram bot launched');
}

// NEW (ADD):
const gatewayDb = await getGatewayPool();
const pollingWorker = new GatewayPollingWorker({
  interval: parseInt(process.env.GATEWAY_POLLING_INTERVAL_MS || '5000', 10),
  channelId: process.env.SIGNALS_CHANNEL_ID || '-1001649127710',
  logger,
  gatewayDb,
  tpCapitalDb: timescaleClient.pool, // Reuse existing pool
});

pollingWorker.start(); // Non-blocking
logger.info('Gateway polling worker started');

// Graceful shutdown (ADD):
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await pollingWorker.stop();
  await closeGatewayPool();
  await timescaleClient.close();
  process.exit(0);
});
```

---

### 📝 **Configuration Changes**

#### Environment Variables (apps/tp-capital/.env)

**REMOVED**:
```bash
# Telegram Bot Configuration (NOT NEEDED ANYMORE)
TELEGRAM_INGESTION_BOT_TOKEN=123456:ABC-DEF...
```

**ADDED**:
```bash
# Gateway Database Configuration
GATEWAY_DATABASE_NAME=telegram_gateway      # Default: telegram_gateway
GATEWAY_DATABASE_SCHEMA=telegram_gateway    # Default: telegram_gateway

# Gateway Polling Configuration
GATEWAY_POLLING_INTERVAL_MS=5000            # Poll every 5 seconds (default)
SIGNALS_CHANNEL_ID=-1001649127710           # TP Capital signals channel
```

**UNCHANGED** (reused from existing config):
```bash
# TimescaleDB connection (reused for both tp_capital and gateway DBs)
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=pass_timescale
```

---

## Impact

### 🔴 Breaking Changes

#### 1. **BREAKING**: Direct Telegram connection removed
- **Before**: TP Capital had its own Telegraf bot receiving messages
- **After**: TP Capital polls Gateway database for messages
- **Migration**:
  1. Ensure Telegram Gateway is running and healthy
  2. Verify Gateway is receiving messages from channel `-1001649127710`
  3. Deploy TP Capital with new polling worker code
  4. Monitor first 100 messages processed successfully
  5. Remove `TELEGRAM_INGESTION_BOT_TOKEN` from `.env`

#### 2. **BREAKING**: Dependency on Gateway Database
- **Before**: TP Capital was independent (only needed Telegram API)
- **After**: TP Capital requires Gateway database to be accessible
- **Impact**:
  - If Gateway database is down, TP Capital cannot process new signals
  - TP Capital needs READ/WRITE access to `telegram_gateway.telegram_messages` table
- **Mitigation**:
  - Gateway database has same availability as TP Capital database (same TimescaleDB instance)
  - Add health check for Gateway database connectivity

#### 3. **BREAKING**: Message Processing Delay
- **Before**: Instant processing (Telegram → TP Capital < 100ms)
- **After**: Delayed processing (Telegram → Gateway → Poll → TP Capital, up to 5s delay)
- **Impact**: Signals appear in Dashboard 0-5 seconds after Telegram message
- **Mitigation**:
  - Configurable polling interval (can reduce to 1s if needed: `GATEWAY_POLLING_INTERVAL_MS=1000`)
  - For real-time needs, Gateway can still HTTP POST to TP Capital endpoint (future enhancement)

#### 4. **BREAKING**: Startup Order Dependency
- **Before**: TP Capital could start independently
- **After**: Gateway must be running first (to populate messages table)
- **Impact**: Startup scripts must ensure Gateway starts before TP Capital
- **Mitigation**:
  - Universal `start` script already handles service dependencies
  - TP Capital gracefully waits if Gateway DB is temporarily unavailable

---

### 📊 Affected Components

| Component | Impact | Action Required |
|-----------|--------|-----------------|
| **TP Capital (monolith)** | Remove Telegram bot, add polling worker | Code refactor, test end-to-end |
| **Telegram Gateway** | No changes | Verify `telegram_messages` table schema |
| **TimescaleDB** | New cross-database queries | Grant TP Capital user access to `telegram_gateway` DB |
| **Dashboard** | No changes | No action (signal data format unchanged) |
| **Universal Scripts** | Startup order enforcement | Update `start.sh` to start Gateway before TP Capital |
| **Health Checks** | Add Gateway DB connectivity check | Update `apps/tp-capital/routes/health.js` |
| **Monitoring** | New metrics for polling worker | Add Prometheus metrics: `polling_messages_processed_total`, `polling_errors_total` |
| **Documentation** | Architecture diagrams | Update `docs/` with new data flow diagrams |

---

### ✨ Benefits

#### 🏗️ **Architectural Improvements**
- ✅ **Single Source of Truth**: Gateway é o único serviço que fala com Telegram API
- ✅ **Clear Separation of Concerns**: Gateway = I/O, TP Capital = Business Logic
- ✅ **Reusability**: Outros serviços podem consumir `telegram_messages` table
- ✅ **Simplified Testing**: Mock signals inserindo rows no banco, sem mockar Telegram

#### 🔐 **Security Improvements**
- ✅ **Reduced Credential Surface**: TP Capital não precisa mais de Telegram token
- ✅ **Centralized Secret Management**: Todas as credenciais Telegram em um único serviço (Gateway)
- ✅ **Database-Level Security**: Access control via PostgreSQL roles

#### 🚀 **Operational Improvements**
- ✅ **Independent Deployments**: Atualizar TP Capital não afeta recepção de mensagens
- ✅ **Historical Data Access**: TP Capital pode reprocessar mensagens antigas (replay)
- ✅ **Easier Debugging**: Inspecionar `telegram_messages` table para troubleshooting
- ✅ **No Message Loss**: Gateway buffering garante zero perda durante TP Capital downtime

#### 📈 **Observability Improvements**
- ✅ **Clear Failure Isolation**: Diferenciar falhas de I/O (Gateway) vs parsing (TP Capital)
- ✅ **Granular Metrics**: Tracking de polling lag, batch sizes, processing rates
- ✅ **Audit Trail**: Cada mensagem tem status tracking (received → published → failed)

---

### ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Polling lag during high volume** | Signals delayed by >5s if >100 msgs/poll | Increase polling frequency or batch size |
| **Gateway DB schema change** | Polling worker breaks if columns renamed | Version check on startup, fail fast with clear error |
| **Duplicate processing on restart** | Same signal saved twice if worker crashes mid-batch | Idempotency check by `raw_message` + `channel` |
| **Message stuck in 'received' status** | Gateway has message but TP Capital never processes | Health check alerts on messages older than 60s |
| **Cross-database deadlock** | UPDATE on `telegram_messages` conflicts with Gateway INSERT | Use `SKIP LOCKED` or short transactions |
| **Gateway DB connection pool exhaustion** | TP Capital starves Gateway of connections | Dedicated connection pool with low `max: 5` |

---

## Compatibility

### ✅ Backward Compatible
- ✅ **REST API unchanged**: `/signals`, `/channels` endpoints identical
- ✅ **Database schema unchanged**: `tp_capital_signals` table structure same
- ✅ **Dashboard unchanged**: No frontend changes required
- ✅ **Prometheus metrics unchanged**: Existing metrics maintained
- ✅ **Port 4005 unchanged**: TP Capital API still on same port

### ⚠️ Breaking Changes
- ⚠️ **Telegram bot removed**: Direct Telegram connection no longer exists
- ⚠️ **Environment variables changed**: `TELEGRAM_INGESTION_BOT_TOKEN` removed, `GATEWAY_*` added
- ⚠️ **Startup dependency**: Gateway must be running before TP Capital
- ⚠️ **Processing delay**: Up to 5s delay (configurable) vs instant before
- ⚠️ **Database permissions**: TP Capital user needs access to `telegram_gateway` DB

---

## Migration Path

### Phase 1: Pre-Migration (15 minutes)
1. ✅ Verify Telegram Gateway is running: `curl http://localhost:4006/health`
2. ✅ Check Gateway is receiving messages:
   ```sql
   SELECT COUNT(*) FROM telegram_gateway.telegram_messages
   WHERE channel_id = '-1001649127710'
   AND received_at > NOW() - INTERVAL '1 hour';
   ```
3. ✅ Backup TP Capital config: `cp apps/tp-capital/.env apps/tp-capital/.env.backup`
4. ✅ Export current signals: `pg_dump -h localhost -p 5433 -t tp_capital.tp_capital_signals > backup_signals.sql`

### Phase 2: Database Permissions (5 minutes)
1. ✅ Grant TP Capital user access to Gateway database:
   ```sql
   -- Connect to postgres database
   GRANT CONNECT ON DATABASE telegram_gateway TO timescale;

   -- Connect to telegram_gateway database
   \c telegram_gateway
   GRANT USAGE ON SCHEMA telegram_gateway TO timescale;
   GRANT SELECT, UPDATE ON TABLE telegram_gateway.telegram_messages TO timescale;
   ```
2. ✅ Test cross-database access:
   ```bash
   psql -h localhost -p 5433 -U timescale -d telegram_gateway -c \
     "SELECT COUNT(*) FROM telegram_gateway.telegram_messages LIMIT 1"
   ```

### Phase 3: Code Changes (30-45 minutes)
1. ✅ Create `gatewayDatabaseClient.js` (see implementation above)
2. ✅ Create `gatewayPollingWorker.js` (see implementation above)
3. ✅ Modify `server.js` to use polling worker instead of Telegram bot
4. ✅ Delete `telegramIngestion.js` (no longer needed)
5. ✅ Update `.env`:
   ```bash
   # Remove TELEGRAM_INGESTION_BOT_TOKEN
   # Add:
   GATEWAY_DATABASE_NAME=telegram_gateway
   GATEWAY_DATABASE_SCHEMA=telegram_gateway
   GATEWAY_POLLING_INTERVAL_MS=5000
   SIGNALS_CHANNEL_ID=-1001649127710
   ```

### Phase 4: Testing (30 minutes)
1. ✅ Start TP Capital with new code: `cd apps/tp-capital && npm run dev`
2. ✅ Verify polling worker starts: Check logs for `Gateway polling worker started`
3. ✅ Send test message to Telegram channel `-1001649127710`
4. ✅ Verify Gateway receives: Check `telegram_gateway.telegram_messages` table
5. ✅ Verify TP Capital processes within 5s: Check `tp_capital.tp_capital_signals` table
6. ✅ Verify status update: Check Gateway message has `status = 'published'`
7. ✅ Verify idempotency: Send same message again, should skip processing
8. ✅ Test health check: `curl http://localhost:4005/health` (should include Gateway DB status)

### Phase 5: Production Deploy (15 minutes)
1. ✅ Stop TP Capital: `pkill -f "node.*tp-capital"`
2. ✅ Deploy new code: `git pull && npm install`
3. ✅ Start TP Capital: `npm run start` or use universal `start` script
4. ✅ Monitor logs for 5 minutes: `tail -f logs/combined.log`
5. ✅ Verify signals appearing in Dashboard: Check real-time updates
6. ✅ Update documentation: `docs/apps/tp-capital/README.md`

---

## Timeline

**Total Estimated Effort**: 4-6 hours (including testing and documentation)

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **1. Pre-Migration** | 15 min | None |
| **2. Database Permissions** | 5 min | Phase 1 complete |
| **3. Code Changes** | 30-45 min | Phase 2 complete |
| **4. Testing** | 30 min | Phase 3 complete |
| **5. Production Deploy** | 15 min | Phase 4 complete |
| **6. Documentation** | 1-2 hours | Phase 5 complete |
| **7. Monitoring Setup** | 30 min | Phase 5 complete |

**Total Development Time**: 2-3 hours
**Total Testing/QA Time**: 2-3 hours

---

## Success Metrics

### Implementation Success
- ✅ TP Capital starts without Telegram bot token
- ✅ Polling worker connects to Gateway database
- ✅ Messages from channel `-1001649127710` are processed within 5s
- ✅ Signals appear in `tp_capital_signals` table with correct parsing
- ✅ Gateway messages updated to `status = 'published'`
- ✅ Idempotency prevents duplicate signals
- ✅ Health check includes Gateway DB connectivity

### Performance Benchmarks
- ✅ Polling lag < 5s (median)
- ✅ Processing time < 100ms per message (parsing + DB insert)
- ✅ TP Capital memory unchanged (< 200MB)
- ✅ Gateway DB connection pool stable (< 5 connections used)
- ✅ Zero message loss during 24h test period

### Post-Deploy Monitoring (7 days)
- Gateway database connection errors < 1/day
- Polling worker uptime > 99.9%
- Messages stuck in 'received' status < 0.1% (with alerting)
- Duplicate signals = 0 (idempotency check working)
- Dashboard signal freshness < 10 seconds

---

## Open Questions

### 1. ⚠️ Gateway Message Status Enum
**Question**: Should we add a new status `processed_by_tp_capital` or reuse `published`?
**Options**:
- **Reuse `published`** (simpler, existing schema)
- **Add new status** (more explicit, future-proof if other consumers)

**Recommendation**: **Reuse `published`** (simpler, store processor name in `metadata.processed_by`)

### 2. ⚠️ Historical Message Processing
**Question**: Should TP Capital reprocess ALL historical messages on first startup?
**Options**:
- **Process all** (backfill existing data, time-consuming)
- **Process from now** (ignore old messages, clean start)
- **Configurable cutoff** (env var `PROCESS_MESSAGES_SINCE=2025-10-26T00:00:00Z`)

**Recommendation**: **Configurable cutoff** (flexibility for both scenarios)

### 3. ⚠️ Polling vs HTTP Push Hybrid
**Question**: Should Gateway also HTTP POST to TP Capital for real-time processing?
**Options**:
- **Polling only** (simpler, current proposal)
- **HTTP push + polling fallback** (real-time + reliability)

**Recommendation**: **Polling only** (5s delay acceptable, can optimize later if needed)

---

## References

### Related Specs
- **MODIFIED**: `specs/tp-capital-api/spec.md` (this proposal)
- **EXISTING**: `specs/telegram-gateway/spec.md` (no changes)
- **EXISTING**: `specs/status/spec.md` (affected - health check updates)

### Affected Documentation
- `docs/apps/tp-capital/README.md` - Update architecture section
- `docs/apps/telegram-gateway/README.md` - Add consumer pattern docs
- `INVENTARIO-SERVICOS.md` - Update TP Capital entry
- `API-INTEGRATION-STATUS.md` - Update TP Capital status

### Related Proposals
- `split-tp-capital-into-gateway-api` - Different approach (HTTP push, new Gateway creation)
- This proposal is **complementary** (leverages existing Gateway, uses polling pattern)

---

**Status**: 🟡 Proposal Stage (awaiting approval)
**Author**: Claude Code AI Agent
**Date**: 2025-10-26
**Change ID**: `adapt-tp-capital-consume-gateway`
**Priority**: High (architectural improvement, reduces duplication)
