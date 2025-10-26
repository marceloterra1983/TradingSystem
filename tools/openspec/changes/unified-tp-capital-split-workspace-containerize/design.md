# Design Document: Unified Migration (TP Capital Split + Workspace Containerization)

**Change ID**: `unified-tp-capital-split-workspace-containerize`
**Last Updated**: 2025-10-25
**Status**: Design Complete

---

## Context

### Current State (Before Migration)

**TP Capital Monolith** (Port 4005):
- Single Node.js process combining Telegram + API + Business Logic
- Session files at `apps/tp-capital/.session`
- Direct TimescaleDB connection
- Started via `scripts/universal/start.sh`

**Workspace Service** (Port 3200):
- Node.js process with dual-strategy: TimescaleDB + LowDB fallback
- Started via `scripts/universal/start.sh`
- Optional LowDB file at `backend/data/workspace/library.json`

**Problems**:
1. TP Capital cannot be containerized (session files security)
2. Workspace dual-strategy adds complexity
3. No health checks, no auto-restart
4. Manual process management

### Target State (After Migration)

**TP Capital Gateway** (Port 4006 - systemd):
- Local process managing Telegram connections
- Session files stay on local disk
- Publishes to API via HTTP

**TP Capital API** (Port 4005 - Docker):
- Containerized REST API
- No Telegram code
- Scalable, deployable independently

**Workspace API** (Port 3200 - Docker):
- Containerized REST API
- TimescaleDB only (no LowDB)
- Hot-reload development mode

**TimescaleDB** (Port 5433 - Docker):
- Shared database for both services
- Schemas: `tp_capital`, `workspace`

---

## Goals / Non-Goals

### Goals

✅ **G1**: Enable independent deployment of TP Capital API and Workspace
✅ **G2**: Secure session file management (local disk only, never in Docker)
✅ **G3**: Remove LowDB from Workspace (single persistence strategy)
✅ **G4**: Maintain hot-reload development experience (< 2s)
✅ **G5**: Zero message loss during migration and normal operations
✅ **G6**: Health checks for all components (systemd + Docker)
✅ **G7**: Maintain backward compatibility (ports, API contracts)

### Non-Goals

❌ **NG1**: Full containerization of Telegram integration (impossible due to sessions)
❌ **NG2**: Gateway high availability (single instance sufficient)
❌ **NG3**: Message queue architecture (HTTP + retry sufficient for scale)
❌ **NG4**: Multi-stage production Docker builds (dev-friendly focus)
❌ **NG5**: Kubernetes or complex orchestration (Docker Compose sufficient)

---

## Decisions

### Decision 1: HTTP POST Instead of Message Queue (Gateway → API)

**Choice**: Use HTTP POST with retry logic instead of message queue (RabbitMQ, Kafka).

**Rationale**:
- ✅ **Simplicity**: No additional infrastructure (RabbitMQ requires separate container)
- ✅ **Request-Response**: Immediate feedback on success/failure
- ✅ **Retry Logic**: Easy to implement with exponential backoff
- ✅ **Debugging**: Simple to inspect with `curl`, logs are linear
- ✅ **Security**: HTTPS + token authentication, no broker ACLs
- ✅ **Scale**: Current volume (50-200 msgs/hour) doesn't require queue

**Implementation**:
```javascript
// Gateway: httpPublisher.js
export async function publishWithRetry(messageData, attempt = 0) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 5000; // 5s

  try {
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Token': config.apiSecretToken,
      },
      body: JSON.stringify(messageData),
      timeout: 10000,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { success: true };

  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, attempt); // Exponential backoff
      await sleep(delay);
      return publishWithRetry(messageData, attempt + 1);
    }

    // Max retries exceeded - save to failure queue
    await failureQueue.append(messageData);
    return { success: false, queued: true };
  }
}
```

**Trade-offs**:
- ⚠️ Synchronous: Gateway waits for API response (mitigated by 10s timeout)
- ⚠️ Coupling: Gateway must know API endpoint (configurable via env var)

**When to Migrate to Message Queue**:
- Message volume > 10,000/hour
- Need for message replay/dead-letter queues
- Multiple API consumers required

---

### Decision 2: Shared Secret Token for Gateway Authentication

**Choice**: Use shared secret token (`X-Gateway-Token` header) instead of OAuth or mTLS.

**Rationale**:
- ✅ **Stateless**: No token refresh, no auth server required
- ✅ **Simplicity**: Single environment variable on both sides
- ✅ **Performance**: Zero overhead, no validation HTTP calls
- ✅ **Rotation**: Easy to rotate - update .env, restart services
- ✅ **Local Communication**: localhost traffic, low attack surface

**Token Generation**:
```bash
# Generate 256-bit random token
openssl rand -hex 32
# Output: a3f5c8b2d9e1f4a7c6b3e2d1f8a5c7b9d4e6f1a2c8b5d3e9f7a1c4b6d2e8f5a3
```

**Validation (API)**:
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

**Security Considerations**:
- Store token in `.env` (not committed to git)
- Rotate quarterly or after security incident
- Monitor failed auth attempts (Prometheus counter)
- Log first 8 chars on startup for verification

**Trade-offs**:
- ⚠️ No expiration (valid indefinitely until rotated)
- ⚠️ If leaked, all Gateways affected (single shared secret)

---

### Decision 3: Idempotency via (channelId, messageId, timestamp) Composite Key

**Choice**: Prevent duplicate signals using natural Telegram message identifiers.

**Rationale**:
- ✅ **Natural Key**: Telegram provides unique (channelId, messageId)
- ✅ **Timestamp Window**: Check ±1 second to handle clock skew
- ✅ **Fast Query**: Index on (channel_id, message_id, ingested_at)
- ✅ **Audit Trail**: Can identify when duplicate was attempted

**Implementation (API)**:
```javascript
// API: middleware/idempotency.js
export async function idempotency(req, res, next) {
  const { channelId, messageId, timestamp } = req.body;

  // Query window: ±1 second
  const timestampDate = new Date(timestamp);
  const windowStart = new Date(timestampDate.getTime() - 1000);
  const windowEnd = new Date(timestampDate.getTime() + 1000);

  const existing = await timescaleClient.query(`
    SELECT 1 FROM tp_capital.tp_capital_signals
    WHERE channel_id = $1
      AND message_id = $2
      AND ingested_at BETWEEN $3 AND $4
    LIMIT 1
  `, [channelId, messageId, windowStart, windowEnd]);

  if (existing.rows.length > 0) {
    logger.info({ channelId, messageId }, 'Duplicate message skipped');
    return res.json({ status: 'ok', skipped: true });
  }

  next();
}
```

**Database Schema Change**:
```sql
-- Add message_id column
ALTER TABLE tp_capital.tp_capital_signals
ADD COLUMN message_id BIGINT;

-- Create unique constraint (prevents duplicates at DB level)
ALTER TABLE tp_capital.tp_capital_signals
ADD CONSTRAINT uk_signal_message UNIQUE (channel_id, message_id);

-- Create index for fast lookups
CREATE INDEX idx_tp_capital_signals_idempotency
ON tp_capital.tp_capital_signals (channel_id, message_id, ingested_at);
```

**Performance**:
- Query time: < 5ms (indexed lookup)
- Trade-off: Additional SELECT per insert (acceptable for current scale)

---

### Decision 4: TimescaleDB Only for Workspace (Remove LowDB)

**Choice**: Remove LowDB dual-strategy, use TimescaleDB exclusively.

**Rationale**:
- ✅ **Single Code Path**: Eliminate conditional logic, reduce testing burden
- ✅ **Production Ready**: TimescaleDB handles transactions, ACID guarantees
- ✅ **Scalability**: No file locking issues, concurrent writes supported
- ✅ **Consistency**: TP Capital already uses TimescaleDB, infrastructure exists
- ✅ **Migration Trivial**: JSON → SQL INSERT, automatable

**Migration Strategy**:
```javascript
// scripts/database/migrate-lowdb-to-timescale.js
import fs from 'fs';
import pg from 'pg';

const lowdbPath = 'backend/data/workspace/library.json';
const data = JSON.parse(fs.readFileSync(lowdbPath, 'utf8'));

const pool = new pg.Pool({ /* timescale config */ });

async function migrate() {
  console.log(`Found ${data.items?.length || 0} items to migrate`);

  for (const item of data.items || []) {
    await pool.query(`
      INSERT INTO workspace.workspace_items
      (id, title, content, category, priority, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [item.id, item.title, item.content, item.category,
        item.priority, item.status, item.createdAt, item.updatedAt]);
  }

  const result = await pool.query('SELECT COUNT(*) FROM workspace.workspace_items');
  console.log(`Migration complete: ${result.rows[0].count} items in TimescaleDB`);

  await pool.end();
}

migrate().catch(console.error);
```

**Rollback Plan**:
- Keep original `library.json` as `library.json.backup-YYYYMMDD`
- If migration fails, restore from backup
- If data inconsistency, re-run migration (idempotent via ON CONFLICT)

**Code Changes**:
```javascript
// Before: src/db/index.js
export function getDbClient() {
  if (config.dbStrategy === 'lowdb') {
    return getLowDbClient();
  }
  return getTimescaleDbClient();
}

// After: src/db/index.js
export function getDbClient() {
  if (config.dbStrategy === 'lowdb') {
    logger.warn('LowDB no longer supported - using TimescaleDB');
  }
  return getTimescaleDbClient();
}
```

---

### Decision 5: Development-Friendly Dockerfiles with Hot-Reload

**Choice**: Use `Dockerfile.dev` with source code volumes for instant hot-reload.

**Rationale**:
- ✅ **Hot-Reload Critical**: Developers need < 2s feedback loop
- ✅ **Volumes Enable Instant Changes**: Host code ↔ container sync without rebuild
- ✅ **Nodemon Integration**: Already used in `npm run dev`, reuse same pattern
- ✅ **Separate Dev/Prod**: Future production build can optimize separately

**Implementation (TP Capital API)**:
```dockerfile
# apps/tp-capital/api/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source (will be overridden by volume in dev)
COPY . .

EXPOSE 4005

# Use nodemon for hot-reload
CMD ["npm", "run", "dev"]
```

**Docker Compose Configuration**:
```yaml
services:
  tp-capital-api:
    build:
      context: ../../apps/tp-capital/api
      dockerfile: Dockerfile.dev
    volumes:
      # Source code (read-only)
      - ../../apps/tp-capital/api/src:/app/src:ro
      - ../../apps/tp-capital/api/package.json:/app/package.json:ro
      # Anonymous volume for node_modules (avoid overwrite)
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

**Trade-offs**:
- ✅ Hot-reload < 2s on Linux
- ⚠️ Hot-reload 2-5s on macOS/Windows (Docker VM overhead)
- ⚠️ Image size ~400MB (includes dev dependencies)

**Mitigation for macOS**:
```yaml
volumes:
  - ../../apps/tp-capital/api/src:/app/src:delegated  # Improves performance
```

---

### Decision 6: Separate Environment Files for Security

**Choice**: Use separate `.env` files for Gateway, API, and Workspace.

**Rationale**:
- ✅ **Separation of Concerns**: Each service sees only its required credentials
- ✅ **Security**: Database password not exposed to Gateway, Telegram creds not in API
- ✅ **Clarity**: Obvious which service needs which variables
- ✅ **Rotation**: Rotate credentials independently

**Directory Structure**:
```
apps/tp-capital/
├── telegram-gateway/
│   ├── .env              # Telegram credentials (SENSITIVE)
│   └── .env.example
└── api/
    ├── .env              # Database credentials (optional, compose overrides)
    └── .env.example

backend/api/workspace/
├── .env                  # Database credentials (optional, compose overrides)
└── .env.example
```

**Gateway `.env`**:
```bash
# Telegram Authentication (NEVER commit)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abc123...
TELEGRAM_PHONE_NUMBER=+5511999999999
TELEGRAM_SESSION=1AGAOMTQ5LjE1...
TELEGRAM_INGESTION_BOT_TOKEN=123456:ABC-DEF...

# Gateway Config
GATEWAY_PORT=4006
API_ENDPOINT=http://localhost:4005/ingest
API_SECRET_TOKEN=a3f5c8b2d9e1f4a7...

# Retry Config
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=5000
FAILURE_QUEUE_PATH=./data/failure-queue.jsonl
```

**API/Workspace `.env`** (or Docker Compose):
```bash
# Server
PORT=4005  # or 3200 for Workspace
NODE_ENV=production

# Database
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_DATABASE=APPS-TPCAPITAL  # or APPS-WORKSPACE
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=change_me_secure_password

# Gateway Auth (API only)
GATEWAY_SECRET_TOKEN=a3f5c8b2d9e1f4a7...

# CORS
CORS_ORIGIN=http://localhost:3103,http://localhost:3004
```

**Trade-offs**:
- ⚠️ Duplication: `GATEWAY_SECRET_TOKEN` in both Gateway and API .env
- ⚠️ Sync Risk: Token mismatch causes auth failures

**Mitigation**:
```bash
# Validation script
scripts/validate-env.sh

# Checks:
# 1. GATEWAY_SECRET_TOKEN matches in both files
# 2. All required variables present
# 3. Token length >= 32 chars
```

---

### Decision 7: Retry Logic with Exponential Backoff + Failure Queue

**Choice**: Gateway retries 3x with exponential backoff, then persists to JSONL queue.

**Rationale**:
- ✅ **Graceful Degradation**: Gives API time to recover (restart, OOM, network glitch)
- ✅ **Avoids Thundering Herd**: Delays increase exponentially (5s, 10s, 20s)
- ✅ **Durable Queue**: JSONL append-only file survives Gateway crashes
- ✅ **Manual Recovery**: Operator can replay queue after extended API outage

**Retry Schedule**:
```
Attempt 0: Immediate
Attempt 1: 5s delay  (2^0 * 5s)
Attempt 2: 10s delay (2^1 * 5s)
Attempt 3: 20s delay (2^2 * 5s)
After 3 failures: Save to queue
```

**Failure Queue (JSONL)**:
```javascript
// Gateway: retryQueue.js
import fs from 'fs/promises';

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
    for (const line of content.split('\n').filter(Boolean)) {
      yield JSON.parse(line);
    }
  },

  async clear() {
    await fs.writeFile(QUEUE_PATH, '', 'utf8');
  },
};
```

**Recovery Script**:
```bash
# scripts/recover-failure-queue.sh
node apps/telegram-gateway/scripts/recover-queue.js
```

**Trade-offs**:
- ⚠️ Delayed Processing: Up to 35s total (5+10+20)
- ⚠️ Out-of-Order: Retried messages arrive after newer messages

**Mitigation**:
- Preserve original Telegram timestamp (not processing time)
- Dashboard sorts by `ingested_at` (original time)

---

### Decision 8: systemd Service for Gateway (Linux)

**Choice**: Deploy Gateway as systemd service instead of Docker container.

**Rationale**:
- ✅ **Session Files Local**: No volume mounts, direct filesystem access
- ✅ **Auto-Restart**: systemd restarts on crash (configurable retry)
- ✅ **Boot Integration**: Starts automatically on system boot
- ✅ **Resource Limits**: MemoryMax, CPUQuota configurable
- ✅ **Logging**: journalctl integration (centralized logs)

**Service File** (`/etc/systemd/system/tp-capital-gateway.service`):
```ini
[Unit]
Description=Telegram Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=trading
Group=trading
WorkingDirectory=/home/trading/TradingSystem/apps/telegram-gateway
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=telegram-gateway

# Environment
EnvironmentFile=/home/trading/TradingSystem/apps/telegram-gateway/.env

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/trading/TradingSystem/apps/telegram-gateway/data
ReadWritePaths=/home/trading/TradingSystem/apps/telegram-gateway/.session

# Resource Limits
MemoryMax=500M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
```

**Management**:
```bash
# Install
sudo systemctl enable tp-capital-gateway

# Start
sudo systemctl start tp-capital-gateway

# Status
sudo systemctl status tp-capital-gateway

# Logs
sudo journalctl -u tp-capital-gateway -f

# Restart
sudo systemctl restart tp-capital-gateway
```

**Alternative (Windows Service)**:
- Use `node-windows` package
- Similar configuration, different tooling

---

## Data Model Changes

### TP Capital: New Column `message_id`

**Table**: `tp_capital.tp_capital_signals`

**Migration**:
```sql
-- Add column (nullable for existing data)
ALTER TABLE tp_capital.tp_capital_signals
ADD COLUMN message_id BIGINT;

-- Create unique constraint
ALTER TABLE tp_capital.tp_capital_signals
ADD CONSTRAINT uk_signal_message UNIQUE (channel_id, message_id);

-- Create composite index
CREATE INDEX idx_tp_capital_signals_idempotency
ON tp_capital.tp_capital_signals (channel_id, message_id, ingested_at);
```

**Performance Impact**:
- Index size: ~10MB per 100k signals
- Query time: < 5ms (index scan)

### Workspace: No Schema Changes

- Existing schema unchanged
- Migration script adds data from LowDB (if exists)
- No breaking changes to table structure

---

## Monitoring & Observability

### Prometheus Metrics

**Gateway** (`http://localhost:4006/metrics`):
```javascript
telegram_connection_status          # Gauge: 0=disconnected, 1=connected
telegram_messages_received_total    # Counter by channel_id
telegram_messages_published_total   # Counter (successful)
telegram_publish_failures_total     # Counter by reason
telegram_retry_attempts_total       # Counter by attempt_number
telegram_failure_queue_size         # Gauge: messages in queue
```

**API** (`http://localhost:4005/metrics`):
```javascript
api_ingestion_requests_total        # Counter by status (success/duplicate/error)
api_signals_inserted_total          # Counter by signal_type
api_timescaledb_errors_total        # Counter by error_type
api_http_request_duration_seconds   # Histogram by method, route, status
```

**Workspace** (`http://localhost:3200/metrics`):
```javascript
tradingsystem_http_requests_total   # Counter by method, route, status
tradingsystem_http_request_duration_seconds  # Histogram
workspace_items_count               # Gauge: total items
workspace_db_connection_status      # Gauge: 0=disconnected, 1=connected
```

### Grafana Dashboards

**Panel 1: System Health**
- Gateway connection status (gauge)
- API container health (gauge)
- Workspace container health (gauge)
- TimescaleDB health (gauge)

**Panel 2: Message Throughput**
- `rate(telegram_messages_received_total[5m])` (Gateway)
- `rate(telegram_messages_published_total[5m])` (Gateway)
- `rate(api_signals_inserted_total[5m])` (API)

**Panel 3: Failure Rates**
- `rate(telegram_publish_failures_total[5m])`
- `rate(api_timescaledb_errors_total[5m])`
- `telegram_failure_queue_size`

**Panel 4: Latency (95th percentile)**
- `histogram_quantile(0.95, api_http_request_duration_seconds)`
- `histogram_quantile(0.95, tradingsystem_http_request_duration_seconds)`

---

## Risks & Mitigations

### Risk 1: Session File Corruption
**Impact**: High (requires manual reauth with phone + 2FA, 5-10min downtime)
**Mitigation**:
- Daily backup cron: `scripts/backup-telegram-sessions.sh`
- Validation on load: detect corruption, rename to `.corrupt`, trigger reauth
- Documentation: `docs/runbooks/telegram-reauth.md`

### Risk 2: Gateway Crash During API Downtime
**Impact**: Medium (messages in retry queue lost if crash before persist)
**Mitigation**:
- Persist to JSONL **before** first retry attempt
- Systemd auto-restart (10s delay)
- Telegram buffers messages for 24h (can replay on reconnect)

### Risk 3: Workspace Data Loss in Migration
**Impact**: High (user data potentially lost)
**Mitigation**:
- Mandatory backup before migration
- Validation: COUNT(*) === JSON.items.length
- Idempotent migration (ON CONFLICT DO NOTHING)
- Keep `library.json.backup` for 30 days

### Risk 4: Port Conflicts
**Impact**: Low (startup fails with clear error)
**Mitigation**:
- Universal start script detects occupied ports
- `--force-kill` flag offers to kill processes
- Clear error messages indicating which port/process

### Risk 5: Token Mismatch (Gateway ≠ API)
**Impact**: Medium (Gateway cannot publish, messages queue)
**Mitigation**:
- Validation script: `scripts/validate-env.sh` checks token matches
- Startup log: Both services log first 8 chars of token
- Clear error: API logs "Invalid gateway token" with IP

---

## Migration Phases (Summary)

1. **Pre-Migration** (1h): Backup everything, validate environment
2. **Split TP Capital** (4-6h): Create Gateway + API, move code, implement HTTP
3. **Containerize Workspace** (3-4h): Create Dockerfile, remove LowDB, add retry
4. **Docker Compose** (2h): Create apps.yml, configure networks/volumes/health
5. **Scripts** (2h): Update start/stop/health scripts for 3 components
6. **Data Migration** (1h): Run LowDB→TimescaleDB if exists
7. **Testing** (3-4h): End-to-end, hot-reload, retry, health checks
8. **Documentation** (2-3h): Update CLAUDE.md, READMEs, guides
9. **Deploy** (1h): Stop monolith, start Gateway + containers, verify

**Total**: 18-24 hours over 5-7 days

---

**Status**: 🟢 Design Complete
**Approvals**: Pending
**Next**: Implement tasks.md checklist
