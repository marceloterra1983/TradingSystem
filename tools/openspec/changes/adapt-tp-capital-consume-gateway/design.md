# Design Document: Gateway Polling Worker for TP Capital

## Context

The Telegram Gateway (`apps/telegram-gateway/`) is already operational, saving ALL Telegram messages to `telegram_gateway.telegram_messages` table in TimescaleDB. Currently, TP Capital maintains its own Telegraf bot connection to ingest signals, creating duplication and tight coupling with Telegram API.

This design document describes the **polling worker pattern** to decouple TP Capital from direct Telegram access, transforming it into a database-driven consumer of Gateway data.

### Stakeholders
- **TP Capital Service**: Needs reliable signal ingestion without Telegram coupling
- **Telegram Gateway**: Provides message storage, no changes required
- **TimescaleDB**: Hosts both `telegram_gateway` and `tp_capital` databases
- **Dashboard Users**: Expect signal data within seconds of Telegram message

### Constraints
- Gateway database is on same TimescaleDB instance as TP Capital database (localhost:5433)
- TP Capital must process signals from channel `-1001649127710` only
- Acceptable processing delay: 0-5 seconds
- Zero message loss tolerance
- No modifications to Gateway service code

---

## Goals / Non-Goals

### Goals
- ✅ Remove direct Telegram bot connection from TP Capital
- ✅ Implement reliable polling mechanism for Gateway database
- ✅ Ensure idempotent signal processing (no duplicates)
- ✅ Maintain existing signal parsing logic and database schema
- ✅ Provide graceful degradation if Gateway database is temporarily unavailable
- ✅ Add observability metrics for polling worker health

### Non-Goals
- ❌ Modify Telegram Gateway service or database schema
- ❌ Change TP Capital signals table structure
- ❌ Implement real-time WebSocket connections
- ❌ Support multiple signal channels (single channel focus)
- ❌ Historical message backfill (process only new messages unless configured)

---

## Decisions

### 1. Polling Pattern Choice

**Decision**: Use **time-based polling** with fixed interval (default 5s)

**Rationale**:
- **Simplicity**: No need for triggers, notifications, or queue infrastructure
- **Database-native**: Leverages PostgreSQL/TimescaleDB strengths
- **Predictable load**: Fixed polling interval prevents thundering herd
- **Testable**: Easy to test with static database fixtures

**Alternatives Considered**:
1. **PostgreSQL LISTEN/NOTIFY**
   - ✅ Pros: Real-time notifications, zero polling overhead
   - ❌ Cons: Requires modifying Gateway code to NOTIFY, connection management complexity
   - **Rejected**: Violates constraint of not modifying Gateway

2. **HTTP Push from Gateway**
   - ✅ Pros: Real-time, Gateway controls delivery
   - ❌ Cons: Requires Gateway changes, authentication complexity, retry logic duplication
   - **Rejected**: Already implemented in existing proposal `split-tp-capital-into-gateway-api`

3. **Event-driven (Kafka/RabbitMQ)**
   - ✅ Pros: Scalable, decoupled, ordered delivery
   - ❌ Cons: Infrastructure overhead, Gateway changes required
   - **Rejected**: Over-engineering for single consumer

**Implementation**:
```javascript
// Polling loop with configurable interval
async function pollLoop() {
  while (isRunning) {
    try {
      await pollAndProcessBatch();
    } catch (error) {
      logger.error({ err: error }, 'Polling cycle failed');
      await sleep(RETRY_DELAY); // Wait before retry
    }
    await sleep(POLLING_INTERVAL);
  }
}
```

---

### 2. Batch Processing Strategy

**Decision**: Fetch up to **100 messages per poll**, process sequentially with transaction per message

**Rationale**:
- **Performance**: Reduces number of database round-trips
- **Memory efficiency**: Bounded batch size prevents OOM
- **Fault isolation**: Failure in one message doesn't block others
- **Observability**: Easy to track individual message processing

**Batch Size Calculation**:
- Normal load: 1-5 messages per poll (low volume channel)
- Burst scenario: Up to 20-30 messages during volatility spikes
- Safety margin: 100 messages = ~20 minutes of extreme burst traffic

**Processing Strategy**:
```javascript
const messages = await fetchUnprocessed(BATCH_SIZE);

for (const msg of messages) {
  try {
    await processInTransaction(msg); // Isolated transaction
  } catch (error) {
    await markAsFailed(msg, error); // Don't block other messages
  }
}
```

**Alternatives Considered**:
1. **Single transaction for entire batch**
   - ✅ Pros: Atomic batch processing
   - ❌ Cons: One failure rolls back entire batch, long-held locks
   - **Rejected**: Reduces reliability, increases lock contention

2. **Parallel processing with Promise.all**
   - ✅ Pros: Faster throughput
   - ❌ Cons: Database connection pool exhaustion, harder to debug
   - **Rejected**: Sequential processing is fast enough (<100ms per message)

---

### 3. Idempotency Mechanism

**Decision**: Use **composite uniqueness check** (`raw_message` + `channel` + `telegram_date`)

**Rationale**:
- **Correctness**: Prevents duplicate signals if worker restarts mid-batch
- **Simplicity**: No need for distributed locks or external state
- **Database-level**: Leverages PostgreSQL uniqueness constraints

**Implementation**:
```javascript
// Before inserting signal, check if already exists
const exists = await tpCapitalDb.query(`
  SELECT 1 FROM tp_capital.tp_capital_signals
  WHERE raw_message = $1
    AND channel = $2
    AND telegram_date = $3
  LIMIT 1
`, [msg.text, msg.channel_id, msg.telegram_date]);

if (exists.rows.length > 0) {
  // Already processed, skip and mark Gateway message as published
  await markAsPublished(msg.message_id);
  return;
}
```

**Database Schema Enhancement** (optional):
```sql
-- Add unique constraint to prevent duplicates at DB level
ALTER TABLE tp_capital.tp_capital_signals
ADD CONSTRAINT unique_signal_message
UNIQUE (raw_message, channel, telegram_date);
```

**Alternatives Considered**:
1. **Redis SET for deduplication**
   - ✅ Pros: Fast lookups, distributed state
   - ❌ Cons: Extra infrastructure, persistence concerns, state sync issues
   - **Rejected**: Database is sufficient and more reliable

2. **Gateway message_id tracking**
   - ✅ Pros: Guaranteed uniqueness (Telegram API guarantees)
   - ❌ Cons: Requires schema change to store `message_id` in signals table
   - **Deferred**: Can add later if needed

---

### 4. Gateway Database Status Updates

**Decision**: Update `status = 'published'` and add `processed_by: 'tp-capital'` to `metadata` JSON

**Rationale**:
- **Minimal schema impact**: Reuses existing `status` enum and `metadata` JSONB
- **Audit trail**: `metadata.processed_at` provides timestamp
- **Multi-consumer support**: Other services can check `metadata.processed_by` to avoid reprocessing

**Implementation**:
```javascript
await gatewayDb.query(`
  UPDATE telegram_gateway.telegram_messages
  SET status = 'published',
      metadata = metadata || $1::jsonb
  WHERE message_id = $2
`, [
  JSON.stringify({
    processed_by: 'tp-capital',
    processed_at: new Date().toISOString(),
    signal_asset: signal.asset, // Optional: metadata about processing
  }),
  msg.message_id
]);
```

**Status State Machine**:
```
received → published (success)
         → failed (parsing error or DB error)
```

**Alternatives Considered**:
1. **New status `processed_tp_capital`**
   - ✅ Pros: Explicit status enum
   - ❌ Cons: Requires schema migration, adds complexity
   - **Rejected**: `metadata` field is sufficient

2. **No status update**
   - ✅ Pros: Simplicity
   - ❌ Cons: Cannot distinguish processed vs unprocessed messages
   - **Rejected**: Causes infinite reprocessing

---

### 5. Error Handling & Retry Logic

**Decision**: **Fail fast with exponential backoff** for database errors, **mark as failed** for parsing errors

**Error Categories**:

| Error Type | Handling Strategy | Status Update |
|------------|-------------------|---------------|
| **Database connection error** | Retry with exponential backoff (1s, 2s, 4s, 8s, max 30s) | No update |
| **Parsing error** | Mark message as `failed` with error in `metadata` | `status = 'failed'` |
| **Duplicate signal** | Skip silently, mark as `published` | `status = 'published'` |
| **Transaction rollback** | Retry once, then mark as `failed` | `status = 'failed'` |

**Implementation**:
```javascript
async function processMessage(msg) {
  try {
    // 1. Parse signal
    const signal = parseSignal(msg.text);
  } catch (parseError) {
    // Parsing failed - mark as failed permanently
    logger.warn({ err: parseError, messageId: msg.message_id }, 'Failed to parse signal');
    await markAsFailed(msg.message_id, parseError);
    return;
  }

  try {
    // 2. Check idempotency
    if (await isDuplicate(signal)) {
      await markAsPublished(msg.message_id);
      return;
    }

    // 3. Insert signal
    await insertSignal(signal);

    // 4. Mark as published
    await markAsPublished(msg.message_id);
  } catch (dbError) {
    // Database error - let polling loop retry
    logger.error({ err: dbError, messageId: msg.message_id }, 'Database error processing message');
    throw dbError; // Propagate to retry logic
  }
}

async function pollLoop() {
  let retryDelay = 1000; // Start with 1s
  const MAX_RETRY_DELAY = 30000; // Cap at 30s

  while (isRunning) {
    try {
      await pollAndProcessBatch();
      retryDelay = 1000; // Reset on success
    } catch (error) {
      logger.error({ err: error, retryDelay }, 'Polling failed, retrying...');
      await sleep(retryDelay);
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY); // Exponential backoff
    }
    await sleep(POLLING_INTERVAL);
  }
}
```

**Alerting Triggers**:
- ✅ Consecutive failures > 5: Alert on Gateway DB connectivity
- ✅ Failed messages > 10% of total: Alert on parsing errors (signal format changed)
- ✅ Messages stuck in `received` > 1 hour: Alert on worker crash

---

### 6. Graceful Shutdown

**Decision**: **Finish current batch** before shutting down, with 30s timeout

**Rationale**:
- **Data consistency**: Completing current batch prevents partial processing
- **Bounded shutdown time**: 30s timeout ensures service doesn't hang
- **Signal handling**: Respect `SIGTERM` from Docker/systemd

**Implementation**:
```javascript
let isRunning = true;
let currentBatchPromise = null;

async function pollLoop() {
  while (isRunning) {
    currentBatchPromise = pollAndProcessBatch();
    await currentBatchPromise;
    currentBatchPromise = null;
    await sleep(POLLING_INTERVAL);
  }
}

async function gracefulShutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received');
  isRunning = false; // Stop accepting new batches

  if (currentBatchPromise) {
    logger.info('Waiting for current batch to complete...');
    try {
      await Promise.race([
        currentBatchPromise,
        sleep(30000).then(() => { throw new Error('Shutdown timeout'); })
      ]);
      logger.info('Current batch completed successfully');
    } catch (error) {
      logger.warn({ err: error }, 'Shutdown timeout, forcing exit');
    }
  }

  await closeGatewayPool();
  await closeTpCapitalPool();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

---

### 7. Observability & Metrics

**Decision**: Export **Prometheus metrics** for polling worker health

**Metrics**:
```javascript
// Counter: Total messages processed successfully
const messagesProcessedTotal = new Counter({
  name: 'tpcapital_gateway_messages_processed_total',
  help: 'Total messages processed from Gateway',
  labelNames: ['status'], // 'published', 'failed', 'duplicate'
});

// Gauge: Current polling lag (time since last poll)
const pollingLagSeconds = new Gauge({
  name: 'tpcapital_gateway_polling_lag_seconds',
  help: 'Time since last successful poll',
});

// Histogram: Message processing duration
const processingDurationSeconds = new Histogram({
  name: 'tpcapital_gateway_processing_duration_seconds',
  help: 'Time to process a single message',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5], // 10ms to 5s
});

// Gauge: Messages waiting to be processed
const messagesWaitingGauge = new Gauge({
  name: 'tpcapital_gateway_messages_waiting',
  help: 'Number of messages in received status',
});
```

**Health Check Endpoint** (`/health`):
```json
{
  "status": "healthy",
  "gatewayDb": "connected",
  "tpCapitalDb": "connected",
  "pollingWorker": {
    "running": true,
    "lastPollAt": "2025-10-26T12:34:56.789Z",
    "lagSeconds": 2.3,
    "messagesWaiting": 5
  }
}
```

---

## Risks / Trade-offs

### Risk 1: Polling Delay
**Trade-off**: Accept 0-5s delay for simplicity vs <100ms with LISTEN/NOTIFY
**Mitigation**: Configurable polling interval, can reduce to 1s if needed
**Monitoring**: Alert if `pollingLagSeconds > 10`

### Risk 2: Gateway Schema Changes
**Trade-off**: Tight coupling to Gateway DB schema
**Mitigation**:
- Version check on startup (query for required columns)
- Fail fast with clear error if schema incompatible
- Document schema contract in Gateway README

### Risk 3: Database Connection Pool Exhaustion
**Trade-off**: Cross-database queries consume connections
**Mitigation**:
- Dedicated connection pool for Gateway (`max: 5`)
- Separate pool for TP Capital (`max: 10`)
- Monitor pool usage with Prometheus metrics

### Risk 4: Message Ordering
**Trade-off**: Sequential processing slower than parallel, but preserves order
**Mitigation**: Query uses `ORDER BY received_at ASC` to maintain chronological processing
**Note**: Signal order rarely matters (each signal is independent)

---

## Migration Plan

### Step 1: Database Preparation
```sql
-- Grant TP Capital user access to Gateway database
GRANT CONNECT ON DATABASE telegram_gateway TO timescale;
GRANT USAGE ON SCHEMA telegram_gateway TO timescale;
GRANT SELECT, UPDATE ON TABLE telegram_gateway.telegram_messages TO timescale;

-- Optional: Add unique constraint for idempotency
ALTER TABLE tp_capital.tp_capital_signals
ADD CONSTRAINT unique_signal_message
UNIQUE (raw_message, channel, telegram_date);
```

### Step 2: Code Deployment
1. Deploy `gatewayDatabaseClient.js`
2. Deploy `gatewayPollingWorker.js`
3. Modify `server.js` to start worker
4. Remove `telegramIngestion.js`
5. Update `.env` configuration

### Step 3: Validation
```bash
# 1. Start TP Capital
npm run dev

# 2. Send test message to Telegram channel
# (Manual step in Telegram app)

# 3. Verify Gateway received
psql -h localhost -p 5433 -U timescale -d telegram_gateway -c \
  "SELECT * FROM telegram_gateway.telegram_messages ORDER BY received_at DESC LIMIT 1"

# 4. Wait up to 5 seconds, verify TP Capital processed
psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -c \
  "SELECT * FROM tp_capital.tp_capital_signals ORDER BY ingested_at DESC LIMIT 1"

# 5. Verify Gateway message updated
psql -h localhost -p 5433 -U timescale -d telegram_gateway -c \
  "SELECT status, metadata FROM telegram_gateway.telegram_messages ORDER BY received_at DESC LIMIT 1"
# Expected: status='published', metadata contains processed_by='tp-capital'
```

### Step 4: Rollback Plan
```bash
# If polling worker fails, revert to direct Telegram bot:
1. Stop TP Capital
2. Restore .env backup (restore TELEGRAM_INGESTION_BOT_TOKEN)
3. Checkout previous git commit
4. Restart TP Capital
5. Verify Telegram bot reconnects
```

---

## Open Questions

### Q1: Historical Message Backfill
**Question**: Should polling worker process ALL historical messages on first startup?
**Current Decision**: **No** - Process only new messages (`received_at > NOW()`)
**Deferred**: Add configuration flag `PROCESS_MESSAGES_SINCE` for manual backfill if needed

### Q2: Cross-Database Transaction Coordination
**Question**: Should we use two-phase commit for Gateway update + Signal insert?
**Current Decision**: **No** - Use eventual consistency (idempotency check on retry)
**Rationale**: Complexity not justified, failure mode is acceptable (message reprocessed but skipped as duplicate)

### Q3: Multiple Consumer Support
**Question**: How will other services consume Gateway messages without conflicts?
**Current Decision**: **metadata.processed_by** field tracks which services processed
**Future Enhancement**: Consider separate `processing_log` table if >3 consumers

---

## References

### External Resources
- [PostgreSQL Connection Pooling Best Practices](https://node-postgres.com/features/pooling)
- [TimescaleDB Hypertable Query Performance](https://docs.timescale.com/timescaledb/latest/how-to-guides/hypertables/)
- [Idempotency Patterns](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)

### Related Code
- `apps/telegram-gateway/src/messageStore.js` - Gateway database schema
- `apps/telegram-gateway/src/index.js` - Gateway message ingestion
- `apps/tp-capital/src/parseSignal.js` - Signal parsing logic (reused)
- `apps/tp-capital/src/timescaleClient.js` - TP Capital database client (reused)

### Related Proposals
- `split-tp-capital-into-gateway-api` - Alternative HTTP push approach
- `optimize-docker-security-performance` - Container optimization context
