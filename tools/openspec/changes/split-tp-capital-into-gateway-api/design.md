# Design Document: Split TP Capital into Gateway + API

## Context

### Current Architecture (Monolithic)

O TP Capital atual é um serviço Node.js monolítico que executa localmente na porta 4005, combinando:

1. **Telegram Integration Layer**
   - Telegraf bot (polling mode) - recebe mensagens de canais
   - TelegramClient (MTProto) - encaminha mensagens usando user account
   - Session management - arquivos `.session` persistentes no disco
   - Authentication flow - phone number + 2FA code

2. **Business Logic Layer**
   - Signal parsing - extrai asset, type, price, stop loss, take profit
   - Validation - verifica formato de dados, ranges válidos
   - Transformation - normaliza dados para schema TimescaleDB

3. **Data Access Layer**
   - TimescaleDB client - inserts, queries, transactions
   - Connection pooling - mantém pool de conexões ativas
   - Retry logic - 5 tentativas com 2s delay

4. **API Layer**
   - Express server - 15+ endpoints REST
   - Authentication - rate limiting, CORS, Helmet
   - Prometheus metrics - exporta métricas de uso

**Problema**: Todas as camadas estão acopladas no mesmo processo. Qualquer restart (deploy, crash, OOM) desconecta a sessão Telegram e perde mensagens.

---

### Target Architecture (Two-Layer)

```
┌────────────────────────────────────────────────────────────────┐
│                     TELEGRAM SERVERS                           │
│              (api.telegram.org - MTProto)                      │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       │ MTProto WebSocket (persistent)
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│         TELEGRAM GATEWAY (Local Process - systemd)             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Telegram Integration Layer                              │  │
│  │  - TelegramClient (MTProto session)                      │  │
│  │  - Telegraf bot (polling)                                │  │
│  │  - Session files (.session) - LOCAL DISK                 │  │
│  │  - Authentication (phone + 2FA)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  HTTP Publisher                                          │  │
│  │  - Retry logic (3x, exponential backoff)                │  │
│  │  - Failure queue (JSONL append)                         │  │
│  │  - Health check endpoint (/health)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       │ HTTP POST /ingest
                       │ X-Gateway-Token: <secret>
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│         TP CAPITAL API (Docker Container)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Layer                                               │  │
│  │  - Express + Helmet + CORS                               │  │
│  │  - Authentication middleware (Gateway token)             │  │
│  │  - Idempotency checks (messageId + timestamp)            │  │
│  │  - Rate limiting (120 req/min)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                    │  │
│  │  - Signal parsing                                        │  │
│  │  - Validation                                            │  │
│  │  - Transformation                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Data Access Layer                                       │  │
│  │  - TimescaleDB client                                    │  │
│  │  - Connection pooling                                    │  │
│  │  - Retry logic                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Observability                                           │  │
│  │  - Prometheus metrics (/metrics)                         │  │
│  │  - Pino structured logging                               │  │
│  │  - Health checks (/health)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       │ PostgreSQL protocol (port 5433)
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│         TIMESCALEDB (Docker Container)                         │
│  - tp_capital_signals (hypertable)                            │
│  - forwarded_messages                                          │
│  - telegram_channels, telegram_bots                            │
└────────────────────────────────────────────────────────────────┘
```

---

## Goals / Non-Goals

### Goals

1. ✅ **Enable Independent Deployment**
   - Update API logic (parsing, endpoints) without Telegram disconnect
   - Update Gateway (new channels, auth changes) without API downtime
   - Rollback API without affecting Gateway session

2. ✅ **Enable API Horizontal Scaling**
   - Run multiple API replicas behind load balancer
   - Each replica shares TimescaleDB connection pool
   - Gateway publishes to any available replica

3. ✅ **Secure Session Management**
   - Session files remain on local filesystem only
   - Zero exposure to Docker volumes or remote filesystems
   - Telegram credentials isolated to Gateway process

4. ✅ **Maintain Message Reliability**
   - Zero message loss during API restarts
   - Gateway retries with exponential backoff
   - Failure queue for extended API outages

5. ✅ **Simplify Testing**
   - Test API endpoints without mocking Telegram
   - Test Gateway without TimescaleDB dependency
   - Integration tests validate HTTP contract

### Non-Goals

1. ❌ **Gateway High Availability**
   - Single Gateway instance is acceptable
   - Telegram buffers messages during Gateway downtime
   - Active-passive HA adds complexity without significant benefit

2. ❌ **Message Queue (Kafka, RabbitMQ)**
   - HTTP + retry logic sufficient for current scale
   - Message queue adds operational complexity
   - Can be added later if scale requires

3. ❌ **Real-time Streaming**
   - Signals don't require <100ms latency
   - Batch processing acceptable (5-10s delay)
   - Dashboard updates every 30s

4. ❌ **Multi-region Deployment**
   - Single datacenter/host deployment
   - No need for geographic distribution
   - Local communication (localhost) is sufficient

---

## Decisions

### Decision 1: HTTP POST Instead of Message Queue

**Options Considered**:
1. **HTTP POST with Retry** (chosen)
2. Message Queue (RabbitMQ, Kafka)
3. gRPC Streaming
4. Shared Database (polling)

**Rationale**:
- ✅ **Simplicity**: No additional infrastructure (RabbitMQ, Kafka)
- ✅ **Request-Response**: Immediate feedback on success/failure
- ✅ **Retry Logic**: Easy to implement with exponential backoff
- ✅ **Debugging**: Simple to inspect with `curl`, logs are linear
- ✅ **Security**: HTTPS + token authentication, no broker ACLs

**Trade-offs**:
- ⚠️ Coupling: Gateway must know API endpoint URL
- ⚠️ Synchronous: Gateway blocks waiting for API response
- ⚠️ Load Balancing: Manual (multiple endpoints) vs automatic (queue consumers)

**Mitigation**:
- Async processing: Gateway publishes in background thread
- Timeout: 10s timeout prevents indefinite blocking
- Multiple endpoints: Config supports array of API URLs

---

### Decision 2: Authentication via Shared Secret Token

**Options Considered**:
1. **Shared Secret Token** (chosen)
2. OAuth 2.0 Client Credentials
3. Mutual TLS (mTLS)
4. JWT with RS256 signing

**Rationale**:
- ✅ **Stateless**: No token refresh, no auth server
- ✅ **Simplicity**: Single environment variable both sides
- ✅ **Performance**: Zero overhead, no validation calls
- ✅ **Rotation**: Easy to rotate - update .env, restart services
- ✅ **Local Communication**: localhost traffic, low risk

**Token Generation**:
```bash
# Generate 256-bit random token
openssl rand -hex 32
# Output: a3f5c8b2d9e1f4a7c6b3e2d1f8a5c7b9d4e6f1a2c8b5d3e9f7a1c4b6d2e8f5a3
```

**Validation**:
```javascript
// API: middleware/authGateway.js
export function authGateway(req, res, next) {
  const token = req.headers['x-gateway-token'];

  if (!token) {
    return res.status(401).json({ error: 'Missing X-Gateway-Token header' });
  }

  if (token !== process.env.GATEWAY_SECRET_TOKEN) {
    logger.warn({ ip: req.ip }, 'Invalid gateway token');
    return res.status(401).json({ error: 'Invalid gateway token' });
  }

  next();
}
```

**Trade-offs**:
- ⚠️ Single Point of Failure: If token leaks, all Gateways affected
- ⚠️ No Expiration: Token valid indefinitely until manually rotated

**Mitigation**:
- Store token in `.env` (not committed to git)
- Rotate token quarterly or after security incident
- Monitor failed authentication attempts (Prometheus metric)

---

### Decision 3: Idempotency via (channelId, messageId, timestamp)

**Problem**: Gateway retries can cause duplicate messages in DB.

**Options Considered**:
1. **Composite Key Check** (chosen)
2. UUID Generation (Gateway assigns unique ID)
3. Hash-based Deduplication (hash message content)
4. Database Unique Constraint

**Rationale**:
- ✅ **Natural Key**: Telegram provides unique (channelId, messageId)
- ✅ **Timestamp Window**: Check ±1 second to handle clock skew
- ✅ **Fast Query**: Index on (channel_id, message_id, ingested_at)
- ✅ **Audit Trail**: Can identify when duplicate attempted

**Implementation**:
```javascript
// API: middleware/idempotency.js
export async function idempotency(req, res, next) {
  const { channelId, messageId, timestamp } = req.body;

  // Check if message already processed (±1 second window)
  const timestampDate = new Date(timestamp);
  const windowStart = new Date(timestampDate.getTime() - 1000);
  const windowEnd = new Date(timestampDate.getTime() + 1000);

  const existing = await timescaleClient.fetchSignals({
    limit: 1,
    channel: channelId,
    fromTs: windowStart.toISOString(),
    toTs: windowEnd.toISOString(),
  });

  // Find exact match by messageId
  const duplicate = existing.find(s =>
    s.channel_id === channelId &&
    s.message_id === messageId
  );

  if (duplicate) {
    logger.info({ channelId, messageId }, 'Duplicate message skipped (idempotent)');
    return res.json({ status: 'ok', skipped: true });
  }

  next();
}
```

**Database Schema Addition**:
```sql
-- Add messageId column to tp_capital_signals
ALTER TABLE tp_capital.tp_capital_signals
ADD COLUMN message_id BIGINT;

-- Create index for fast idempotency checks
CREATE INDEX idx_tp_capital_signals_idempotency
ON tp_capital.tp_capital_signals (channel_id, message_id, ingested_at);
```

**Trade-offs**:
- ⚠️ Additional Query: Every insert requires SELECT check
- ⚠️ Race Condition: Two concurrent requests might both pass check

**Mitigation**:
- Index optimization: Query < 5ms on indexed columns
- Unique constraint: Add DB constraint for ultimate safety
  ```sql
  ALTER TABLE tp_capital.tp_capital_signals
  ADD CONSTRAINT uk_signal_message
  UNIQUE (channel_id, message_id);
  ```

---

### Decision 4: Retry Logic with Exponential Backoff

**Problem**: API may be temporarily unavailable (restart, OOM, network).

**Options Considered**:
1. **Exponential Backoff** (chosen)
2. Fixed Interval Retry
3. Immediate Failure (no retry)
4. Circuit Breaker Pattern

**Rationale**:
- ✅ **Graceful Degradation**: Gives API time to recover
- ✅ **Avoids Thundering Herd**: Delays increase exponentially
- ✅ **Configurable**: Max retries and base delay tunable
- ✅ **Monitoring**: Emit metrics on retry attempts

**Implementation**:
```javascript
// Gateway: httpPublisher.js
export async function publishWithRetry(messageData, attempt = 0) {
  const MAX_RETRIES = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
  const BASE_DELAY = parseInt(process.env.RETRY_DELAY_MS || '5000');

  try {
    const response = await fetch(`${config.apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Token': config.apiSecretToken,
      },
      body: JSON.stringify(messageData),
      timeout: 10000, // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    logger.info({ messageId: messageData.messageId }, 'Message published successfully');
    return { success: true };

  } catch (error) {
    logger.error({
      err: error.message,
      messageId: messageData.messageId,
      attempt
    }, 'Failed to publish message');

    if (attempt < MAX_RETRIES) {
      // Exponential backoff: 5s, 10s, 20s
      const delay = BASE_DELAY * Math.pow(2, attempt);
      logger.info({ attempt, delay, messageId: messageData.messageId }, 'Retrying...');

      await new Promise(resolve => setTimeout(resolve, delay));
      return publishWithRetry(messageData, attempt + 1);
    }

    // Max retries exceeded - save to failure queue
    logger.error({ messageId: messageData.messageId }, 'Max retries exceeded, saving to failure queue');
    await failureQueue.append(messageData);
    return { success: false, queued: true };
  }
}
```

**Failure Queue** (JSONL append-only):
```javascript
// Gateway: retryQueue.js
import fs from 'fs/promises';
import path from 'path';

const QUEUE_PATH = process.env.FAILURE_QUEUE_PATH || './data/failure-queue.jsonl';

export const failureQueue = {
  async append(messageData) {
    const line = JSON.stringify({
      ...messageData,
      failedAt: new Date().toISOString(),
    }) + '\n';

    await fs.appendFile(QUEUE_PATH, line, 'utf8');
    logger.info({ messageId: messageData.messageId }, 'Message saved to failure queue');
  },

  async * readAll() {
    const content = await fs.readFile(QUEUE_PATH, 'utf8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      yield JSON.parse(line);
    }
  },

  async clear() {
    await fs.writeFile(QUEUE_PATH, '', 'utf8');
    logger.info('Failure queue cleared');
  },
};
```

**Recovery Script** (`scripts/recover-failure-queue.js`):
```javascript
// Replay failed messages from JSONL queue
import { failureQueue } from '../apps/tp-capital/telegram-gateway/src/retryQueue.js';
import { publishWithRetry } from '../apps/tp-capital/telegram-gateway/src/httpPublisher.js';

async function recoverQueue() {
  let recovered = 0;
  let failed = 0;

  for await (const messageData of failureQueue.readAll()) {
    const result = await publishWithRetry(messageData);
    if (result.success) {
      recovered++;
    } else {
      failed++;
    }
  }

  if (failed === 0) {
    await failureQueue.clear();
    console.log(`✅ Recovered ${recovered} messages. Queue cleared.`);
  } else {
    console.log(`⚠️ Recovered ${recovered}, failed ${failed}. Queue NOT cleared.`);
  }
}

recoverQueue().catch(console.error);
```

**Trade-offs**:
- ⚠️ Delayed Processing: Messages can take up to 35s to fail (5s + 10s + 20s)
- ⚠️ Out-of-Order: Retried messages arrive after newer messages

**Mitigation**:
- Timestamp preservation: Use original Telegram timestamp, not processing time
- Manual recovery: Run recovery script during maintenance window

---

### Decision 5: Separate Environment Files

**Problem**: Mixing Telegram credentials with DB credentials in single `.env`.

**Options Considered**:
1. **Separate .env Files** (chosen)
2. Single .env with Prefixes (GATEWAY_, API_)
3. Vault/Secrets Manager (HashiCorp Vault)
4. Docker Secrets (swarm mode)

**Rationale**:
- ✅ **Separation of Concerns**: Gateway only sees Telegram creds
- ✅ **Security**: DB password not exposed to Gateway process
- ✅ **Clarity**: Obvious which service needs which variables
- ✅ **Rotation**: Rotate Telegram creds without touching API

**Directory Structure**:
```
apps/tp-capital/
├── telegram-gateway/
│   ├── .env                    # Telegram credentials
│   ├── .env.example
│   └── src/
└── api/
    ├── .env                    # DB credentials (optional, uses compose)
    ├── .env.example
    └── src/
```

**Gateway `.env`**:
```bash
# Telegram Authentication (NEVER commit)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abc123def456...
TELEGRAM_PHONE_NUMBER=+5511999999999
TELEGRAM_SESSION=1AGAOMTQ5LjE1...
TELEGRAM_INGESTION_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_DESTINATION_CHANNEL_ID=-1001234567890

# Gateway Configuration
GATEWAY_PORT=4006
NODE_ENV=production
LOG_LEVEL=info

# API Communication
API_ENDPOINT=http://localhost:4005/ingest
API_SECRET_TOKEN=a3f5c8b2d9e1f4a7c6b3e2d1f8a5c7b9d4e6f1a2c8b5d3e9f7a1c4b6d2e8f5a3

# Retry Configuration
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=5000
FAILURE_QUEUE_PATH=./data/failure-queue.jsonl
```

**API `.env`** (Docker Compose takes precedence):
```bash
# Server Configuration
PORT=4005
NODE_ENV=production
LOG_LEVEL=info

# Database Connection
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_DATABASE=APPS-TPCAPITAL
TIMESCALEDB_SCHEMA=tp_capital
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=pass_timescale

# Gateway Authentication
GATEWAY_SECRET_TOKEN=a3f5c8b2d9e1f4a7c6b3e2d1f8a5c7b9d4e6f1a2c8b5d3e9f7a1c4b6d2e8f5a3

# CORS Configuration
CORS_ORIGIN=http://localhost:3103,http://localhost:3004

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

**Docker Compose** (takes precedence over .env):
```yaml
services:
  tp-capital-api:
    environment:
      PORT: 4005
      TIMESCALEDB_HOST: ${TIMESCALEDB_HOST:-localhost}
      TIMESCALEDB_PASSWORD: ${TIMESCALEDB_PASSWORD}
      GATEWAY_SECRET_TOKEN: ${GATEWAY_SECRET_TOKEN}
```

**Trade-offs**:
- ⚠️ Duplication: `GATEWAY_SECRET_TOKEN` must be in both `.env` files
- ⚠️ Sync Risk: Token mismatch causes authentication failures

**Mitigation**:
- Validation script: `scripts/validate-env.sh` checks token matches
- Startup check: Both services log first 8 chars of token on startup (for verification)
  ```javascript
  logger.info({
    tokenPrefix: config.gatewaySecretToken.slice(0, 8) + '...'
  }, 'Gateway token loaded');
  ```

---

## Data Model Changes

### New Column: `message_id`

**Table**: `tp_capital.tp_capital_signals`

**Purpose**: Enable idempotency checks (prevent duplicate signal inserts).

**Migration**:
```sql
-- Add column (nullable initially for existing data)
ALTER TABLE tp_capital.tp_capital_signals
ADD COLUMN message_id BIGINT;

-- Backfill existing rows with synthetic IDs (optional)
-- UPDATE tp_capital.tp_capital_signals
-- SET message_id = extract(epoch from ingested_at)::bigint
-- WHERE message_id IS NULL;

-- Create unique constraint (prevents duplicates)
ALTER TABLE tp_capital.tp_capital_signals
ADD CONSTRAINT uk_signal_message
UNIQUE (channel_id, message_id);

-- Create index for fast lookups
CREATE INDEX idx_tp_capital_signals_idempotency
ON tp_capital.tp_capital_signals (channel_id, message_id, ingested_at);
```

**Query Performance**:
```sql
-- Before (full table scan)
EXPLAIN ANALYZE
SELECT * FROM tp_capital.tp_capital_signals
WHERE channel_id = -1001234567890
  AND ingested_at BETWEEN '2025-01-01' AND '2025-01-02';
-- Seq Scan: 120ms

-- After (index scan)
EXPLAIN ANALYZE
SELECT * FROM tp_capital.tp_capital_signals
WHERE channel_id = -1001234567890
  AND message_id = 12345
  AND ingested_at BETWEEN '2025-01-01' AND '2025-01-02';
-- Index Scan: 2ms
```

---

## Deployment Architecture

### systemd Service for Gateway

**File**: `/etc/systemd/system/tp-capital-gateway.service`

```ini
[Unit]
Description=TP Capital Telegram Gateway
Documentation=https://github.com/yourusername/TradingSystem
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=trading
Group=trading
WorkingDirectory=/home/trading/TradingSystem/apps/tp-capital/telegram-gateway
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tp-capital-gateway

# Environment
Environment=NODE_ENV=production
EnvironmentFile=/home/trading/TradingSystem/apps/tp-capital/telegram-gateway/.env

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/trading/TradingSystem/apps/tp-capital/telegram-gateway/data
ReadWritePaths=/home/trading/TradingSystem/apps/tp-capital/telegram-gateway/.session

# Resource limits
LimitNOFILE=65536
MemoryMax=500M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
```

**Installation**:
```bash
# Copy service file
sudo cp tp-capital-gateway.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable tp-capital-gateway

# Start service
sudo systemctl start tp-capital-gateway

# Check status
sudo systemctl status tp-capital-gateway

# View logs
sudo journalctl -u tp-capital-gateway -f
```

---

### Docker Container for API

**File**: `apps/tp-capital/api/Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Runtime stage
FROM base AS runtime
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY src ./src
COPY package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4005/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
```

**Build & Run**:
```bash
# Build image
docker build -t tp-capital-api:1.0.0 apps/tp-capital/api/

# Run locally (dev)
docker run --rm -p 4005:4005 \
  --env-file apps/tp-capital/api/.env \
  --network host \
  tp-capital-api:1.0.0

# Run via docker-compose (prod)
docker compose -f tools/compose/docker-compose.tp-capital.yml up -d
```

---

## Monitoring & Observability

### Prometheus Metrics

#### Gateway Metrics (`http://localhost:4006/metrics`)

```javascript
// Gateway: src/metrics.js
import promClient from 'prom-client';

export const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Connection status (0 = disconnected, 1 = connected)
export const telegramConnectionStatus = new promClient.Gauge({
  name: 'telegram_connection_status',
  help: 'Telegram connection status (0=disconnected, 1=connected)',
  registers: [register],
});

// Messages received from Telegram
export const messagesReceived = new promClient.Counter({
  name: 'telegram_messages_received_total',
  help: 'Total messages received from Telegram channels',
  labelNames: ['channel_id', 'channel_name'],
  registers: [register],
});

// Messages published to API
export const messagesPublished = new promClient.Counter({
  name: 'telegram_messages_published_total',
  help: 'Total messages successfully published to API',
  registers: [register],
});

// Publish failures
export const publishFailures = new promClient.Counter({
  name: 'telegram_publish_failures_total',
  help: 'Total failed attempts to publish to API',
  labelNames: ['reason'],
  registers: [register],
});

// Retry attempts
export const retryAttempts = new promClient.Counter({
  name: 'telegram_retry_attempts_total',
  help: 'Total retry attempts for failed publishes',
  labelNames: ['attempt_number'],
  registers: [register],
});

// Failure queue size
export const failureQueueSize = new promClient.Gauge({
  name: 'telegram_failure_queue_size',
  help: 'Number of messages in failure queue',
  registers: [register],
});
```

#### API Metrics (`http://localhost:4005/metrics`)

```javascript
// API: src/metrics.js
import promClient from 'prom-client';

export const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Ingestion requests
export const ingestionRequests = new promClient.Counter({
  name: 'api_ingestion_requests_total',
  help: 'Total ingestion requests received from Gateway',
  labelNames: ['status'], // success, duplicate, error
  registers: [register],
});

// Signal inserts
export const signalInserts = new promClient.Counter({
  name: 'api_signals_inserted_total',
  help: 'Total signals successfully inserted into TimescaleDB',
  labelNames: ['signal_type'],
  registers: [register],
});

// Database errors
export const dbErrors = new promClient.Counter({
  name: 'api_timescaledb_errors_total',
  help: 'Total TimescaleDB connection/query errors',
  labelNames: ['error_type'],
  registers: [register],
});

// Request duration
export const requestDuration = new promClient.Histogram({
  name: 'api_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});
```

### Grafana Dashboard

**Panels**:
1. **Connection Health** (gauge)
   - `telegram_connection_status` (Gateway)
   - `api_health_status` (API - derived from /health)

2. **Message Throughput** (graph)
   - `rate(telegram_messages_received_total[5m])`
   - `rate(telegram_messages_published_total[5m])`
   - `rate(api_signals_inserted_total[5m])`

3. **Failure Rates** (graph)
   - `rate(telegram_publish_failures_total[5m])`
   - `rate(api_timescaledb_errors_total[5m])`

4. **Retry Activity** (stacked graph)
   - `telegram_retry_attempts_total` by `attempt_number`

5. **Failure Queue** (gauge)
   - `telegram_failure_queue_size`

6. **Latency** (heatmap)
   - `histogram_quantile(0.95, api_http_request_duration_seconds)`

---

## Risks / Trade-offs

### Risk 1: HTTP Overhead vs Message Queue

**Trade-off**: HTTP adds latency (~5-10ms) vs message queue (~1-2ms).

**Analysis**:
- Current signal volume: ~50 messages/hour (peak: 200/hour)
- 10ms overhead = 0.01s per message
- Total overhead: 200 * 0.01s = 2 seconds/hour
- Impact: **Negligible** for current scale

**When to migrate to Message Queue**:
- Volume > 10,000 messages/hour
- API latency > 100ms
- Need for message replay/dead-letter queues
- Multiple consumers required

### Risk 2: Session File Corruption

**Scenario**: Disk corruption, OS crash, or manual deletion of `.session` files.

**Impact**: Gateway requires reauthorization (phone + 2FA), 5-10 minutes downtime.

**Mitigation**:
- ✅ Backup session files daily: `scripts/backup-telegram-sessions.sh`
- ✅ Store backups in separate filesystem/S3
- ✅ Document reauthorization process: `docs/runbooks/telegram-reauth.md`

**Backup Script**:
```bash
#!/bin/bash
# scripts/backup-telegram-sessions.sh

SESSION_DIR="/home/trading/TradingSystem/apps/tp-capital/telegram-gateway/.session"
BACKUP_DIR="/backup/telegram-sessions"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/sessions-$DATE.tar.gz" -C "$SESSION_DIR" .

# Keep only last 30 backups
ls -t "$BACKUP_DIR"/sessions-*.tar.gz | tail -n +31 | xargs rm -f

echo "✅ Session files backed up to $BACKUP_DIR/sessions-$DATE.tar.gz"
```

**Cron Job**:
```cron
# Backup Telegram sessions daily at 2 AM
0 2 * * * /home/trading/TradingSystem/scripts/backup-telegram-sessions.sh >> /var/log/telegram-backup.log 2>&1
```

### Risk 3: Gateway Crash During API Downtime

**Scenario**: Gateway crashes while API is down, losing messages in retry queue (in-memory).

**Impact**: Messages received during crash window are lost.

**Mitigation**:
- ✅ Persist to failure queue **before** retry (not after max retries)
- ✅ Telegram buffers messages for 24h (can replay on reconnect)
- ✅ Systemd auto-restart: Gateway restarts in <10s

**Improved Retry Logic** (persist first):
```javascript
export async function publishWithRetry(messageData, attempt = 0) {
  // FIRST: Persist to failure queue (durable)
  if (attempt === 0) {
    await failureQueue.append(messageData);
  }

  try {
    const response = await publish(messageData);

    // SUCCESS: Remove from failure queue
    await failureQueue.remove(messageData.messageId);
    return { success: true };

  } catch (error) {
    if (attempt < MAX_RETRIES) {
      await sleep(BASE_DELAY * Math.pow(2, attempt));
      return publishWithRetry(messageData, attempt + 1);
    }

    // FAILURE: Already in queue, just log
    logger.error('Max retries exceeded, message remains in queue');
    return { success: false, queued: true };
  }
}
```

---

## Migration Plan

### Phase 1: Pre-Migration (30 minutes)

**Goal**: Prepare environment and backup data.

**Tasks**:
1. ✅ Backup session files:
   ```bash
   tar -czf /backup/tp-capital-sessions-$(date +%Y%m%d).tar.gz \
     apps/tp-capital/.session
   ```

2. ✅ Backup current `.env`:
   ```bash
   cp apps/tp-capital/.env /backup/tp-capital.env.backup
   ```

3. ✅ Export TimescaleDB data:
   ```bash
   pg_dump -h localhost -p 5433 -U timescale \
     -t tp_capital.tp_capital_signals \
     -t tp_capital.forwarded_messages \
     APPS-TPCAPITAL > /backup/tp-capital-db-$(date +%Y%m%d).sql
   ```

4. ✅ Verify backups:
   ```bash
   ls -lh /backup/tp-capital-*
   ```

**Success Criteria**:
- ✅ All backups created and readable
- ✅ Backup sizes match expectations (sessions ~1MB, DB ~10-100MB)

---

### Phase 2: Code Split (1-2 hours)

**Goal**: Separate monolith into Gateway and API codebases.

**Tasks**:
1. ✅ Create directory structure:
   ```bash
   mkdir -p apps/tp-capital/telegram-gateway/src
   mkdir -p apps/tp-capital/api/src/routes
   mkdir -p apps/tp-capital/api/src/middleware
   mkdir -p apps/tp-capital/api/src/services
   mkdir -p apps/tp-capital/shared
   ```

2. ✅ Move Telegram code to Gateway:
   ```bash
   # Telegram integration files
   mv apps/tp-capital/src/telegramIngestion.js telegram-gateway/src/
   mv apps/tp-capital/src/telegramIngestionManual.js telegram-gateway/src/
   mv apps/tp-capital/src/telegramForwarder.js telegram-gateway/src/
   mv apps/tp-capital/src/telegramForwarderManual.js telegram-gateway/src/
   mv apps/tp-capital/src/telegramUserForwarder.js telegram-gateway/src/
   mv apps/tp-capital/src/telegramUserForwarderPolling.js telegram-gateway/src/

   # Session files
   mv apps/tp-capital/.session telegram-gateway/
   ```

3. ✅ Move API code to API:
   ```bash
   # Server and routes
   cp apps/tp-capital/src/server.js api/src/

   # Services
   mv apps/tp-capital/src/timescaleClient.js api/src/services/
   mv apps/tp-capital/src/parseSignal.js api/src/services/
   mv apps/tp-capital/src/logger.js api/src/
   mv apps/tp-capital/src/config.js api/src/
   ```

4. ✅ Create shared utilities:
   ```bash
   # Types and validators (used by both)
   touch apps/tp-capital/shared/types.js
   touch apps/tp-capital/shared/validators.js
   touch apps/tp-capital/shared/constants.js
   ```

5. ✅ Create new files:
   - `telegram-gateway/src/httpPublisher.js` (publishes to API)
   - `telegram-gateway/src/retryQueue.js` (failure queue)
   - `telegram-gateway/src/index.js` (entry point)
   - `api/src/routes/ingestion.js` (receives from Gateway)
   - `api/src/middleware/authGateway.js` (validates token)
   - `api/src/middleware/idempotency.js` (prevents duplicates)

**Success Criteria**:
- ✅ All files moved to correct locations
- ✅ No files remain in `apps/tp-capital/src/` (old location)
- ✅ Shared code extracted to `shared/`

---

### Phase 3: Configuration (30 minutes)

**Goal**: Create separate `.env` files and generate secrets.

**Tasks**:
1. ✅ Generate Gateway secret token:
   ```bash
   openssl rand -hex 32
   # Output: a3f5c8b2d9e1f4a7c6b3e2d1f8a5c7b9d4e6f1a2c8b5d3e9f7a1c4b6d2e8f5a3
   ```

2. ✅ Create Gateway `.env`:
   ```bash
   cat > apps/tp-capital/telegram-gateway/.env << 'EOF'
   # Copy from backup, add new variables
   GATEWAY_PORT=4006
   API_ENDPOINT=http://localhost:4005/ingest
   API_SECRET_TOKEN=a3f5c8b2d9e1f4a7c6b3e2d1f8a5c7b9d4e6f1a2c8b5d3e9f7a1c4b6d2e8f5a3
   MAX_RETRY_ATTEMPTS=3
   RETRY_DELAY_MS=5000
   FAILURE_QUEUE_PATH=./data/failure-queue.jsonl
   EOF
   ```

3. ✅ Create API `.env`:
   ```bash
   cat > apps/tp-capital/api/.env << 'EOF'
   PORT=4005
   NODE_ENV=production
   TIMESCALEDB_HOST=localhost
   TIMESCALEDB_PORT=5433
   TIMESCALEDB_DATABASE=APPS-TPCAPITAL
   TIMESCALEDB_USER=timescale
   TIMESCALEDB_PASSWORD=pass_timescale
   GATEWAY_SECRET_TOKEN=a3f5c8b2d9e1f4a7c6b3e2d1f8a5c7b9d4e6f1a2c8b5d3e9f7a1c4b6d2e8f5a3
   CORS_ORIGIN=http://localhost:3103,http://localhost:3004
   EOF
   ```

4. ✅ Validate token matches:
   ```bash
   scripts/validate-env.sh
   ```

**Success Criteria**:
- ✅ Both `.env` files exist
- ✅ `GATEWAY_SECRET_TOKEN` matches in both files
- ✅ Validation script passes

---

### Phase 4: Implementation (2-3 hours)

Implementation details are captured in `tasks.md`. Refer to that file for complete checklist.

---

### Phase 5: Testing (1-2 hours)

Testing procedures are captured in `tasks.md`. Refer to that file for complete test scenarios.

---

### Phase 6: Production Deploy (30 minutes)

Deployment steps are captured in `tasks.md`. Refer to that file for complete deployment checklist.

---

## Open Questions

### Question 1: Should Gateway have `/metrics` endpoint?

**Context**: Gateway metrics are valuable (connection status, retry counts), but adding Express server increases complexity.

**Options**:
1. **Yes** - Add minimal Express server (only `/health` and `/metrics`)
2. **No** - Log metrics to JSONL, collect with external scraper
3. **Push Gateway** - Gateway pushes metrics to Prometheus Pushgateway

**Recommendation**: **Yes** - Minimal Express server is <50 lines, standard pattern, integrates with existing Prometheus.

### Question 2: Should failure queue have size limit?

**Context**: Unbounded JSONL file could grow to GB if API is down for extended period.

**Options**:
1. **No limit** - Trust manual intervention if API is down >24h
2. **Size limit** - Rotate at 100MB (circular buffer)
3. **Time limit** - Discard messages older than 48h

**Recommendation**: **Size limit (100MB)** - Balance between recovery window and disk usage. Alert if queue > 50MB.

### Question 3: Should API support multiple Gateway instances?

**Context**: Future scale may require multiple Gateways (different channels).

**Options**:
1. **Single Gateway** (current proposal)
2. **Multiple Gateways** - Each with unique token
3. **Token-per-Channel** - Different tokens for different channel groups

**Recommendation**: **Single Gateway** for MVP. Add multi-Gateway support when >500 messages/hour.

---

## References

### External Documentation
- [Telegram MTProto API](https://core.telegram.org/mtproto)
- [Telegraf Framework](https://telegraf.js.org/)
- [TimescaleDB Best Practices](https://docs.timescale.com/timescaledb/latest/how-to-guides/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)

### Internal Documentation
- `CLAUDE.md` - Project architecture overview
- `docs/context/backend/guides/guide-tp-capital.md` - TP Capital guide (will be rewritten)
- `docs/context/ops/service-startup-guide.md` - Service startup procedures

### Related Changes
- `containerize-tp-capital-workspace` - Alternative approach (mutually exclusive)

---

**Last Updated**: 2025-10-25
**Status**: Draft
**Reviewers**: Awaiting approval
