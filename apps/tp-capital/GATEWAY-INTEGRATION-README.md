# TP Capital → Telegram Gateway Integration

## Overview

TP Capital now consumes Telegram messages from the **Telegram Gateway** database instead of maintaining its own direct bot connection. This change implements a **database polling pattern** where:

1. **Telegram Gateway** (port 4006) receives ALL Telegram messages and saves them to `telegram_gateway.telegram_messages`
2. **TP Capital** (port 4005) polls the Gateway database every 5 seconds for messages from channel `-1001649127710`
3. **TP Capital** parses signals and saves them to `tp_capital.tp_capital_signals`
4. **TP Capital** marks processed messages as `published` in the Gateway database

## What Changed

### Files Created

1. **`src/gatewayDatabaseClient.js`** (133 lines)
   - Dedicated PostgreSQL connection pool for Gateway database
   - Connection management and health checks
   - Query helper methods

2. **`src/gatewayPollingWorker.js`** (377 lines)
   - Core polling worker implementation
   - Batch message processing (up to 100 messages/poll)
   - Exponential backoff on errors
   - Graceful shutdown support
   - Idempotency checks (duplicate prevention)

3. **`src/gatewayMetrics.js`** (44 lines)
   - Prometheus metrics for observability
   - Counters: messages processed (by status)
   - Gauges: polling lag, messages waiting
   - Histograms: processing duration

### Files Modified

1. **`src/config.js`**
   - Added `gateway` configuration section
   - Made Telegram bot token optional (no longer required)
   - Added Gateway database validation

2. **`src/server.js`**
   - Removed direct Telegram bot initialization
   - Added Gateway polling worker initialization
   - Enhanced health check endpoint with Gateway DB status
   - Updated graceful shutdown to stop polling worker

### Configuration Added

New environment variables (already added to `.env.example`):

```bash
GATEWAY_DATABASE_NAME=telegram_gateway          # Gateway DB name
GATEWAY_DATABASE_SCHEMA=telegram_gateway        # Gateway schema
GATEWAY_POLLING_INTERVAL_MS=5000                # Poll every 5 seconds
SIGNALS_CHANNEL_ID=-1001649127710               # TP Capital signals channel
GATEWAY_BATCH_SIZE=100                          # Process up to 100 msgs/poll
```

## Quick Start

### Option 1: Automated Testing (Recommended)

```bash
# 1. Grant database permissions
psql -h localhost -p 5433 -U timescale -d telegram_gateway -f apps/tp-capital/setup-gateway-permissions.sql

# 2. Add Gateway configuration to .env (see .env.example)

# 3. Start TP Capital
cd apps/tp-capital
npm run dev

# 4. Run automated test suite
./test-gateway-integration.sh
```

### Option 2: Manual Testing

Follow the comprehensive guide: **[GATEWAY-INTEGRATION-TESTING.md](./GATEWAY-INTEGRATION-TESTING.md)**

## Architecture

### Before (Direct Bot Connection)

```
Telegram → TP Capital Bot → Parse Signal → Save to tp_capital_signals
```

**Issues:**
- TP Capital needs bot token and direct Telegram connection
- Tight coupling to Telegram API
- No message audit trail
- Difficult to replay messages

### After (Gateway Polling)

```
Telegram → Gateway Bot → Save to telegram_messages (status: received)
                             ↓
                  TP Capital Polling Worker (every 5s)
                             ↓
                  Parse Signal → Save to tp_capital_signals
                             ↓
                  Mark message as 'published'
```

**Benefits:**
- ✅ Single Telegram connection (Gateway)
- ✅ Complete message audit trail
- ✅ Easy to replay/reprocess messages
- ✅ Gateway can serve multiple consumers
- ✅ Decoupled from Telegram API
- ✅ Idempotent processing (no duplicates)

## Polling Pattern Details

### Polling Loop

```javascript
while (isRunning) {
  try {
    // Fetch messages with status='received' for signals channel
    messages = await fetchUnprocessedMessages()

    for (msg of messages) {
      // 1. Parse signal
      signal = parseSignal(msg.text)

      // 2. Check duplicate
      if (isDuplicate(signal)) {
        markAsPublished(msg)
        continue
      }

      // 3. Save signal
      insertSignal(signal)

      // 4. Mark as published
      markAsPublished(msg)
    }

    // Wait for next poll
    await sleep(5000)

  } catch (error) {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    retryDelay = Math.min(retryDelay * 2, 30000)
    await sleep(retryDelay)
  }
}
```

### Error Handling

- **Connection errors**: Exponential backoff (1s → 2s → 4s → 8s → max 30s)
- **Parse errors**: Mark message as `failed` with error details
- **Database errors**: Retry next polling cycle
- **Consecutive errors**: Log FATAL after 10 consecutive failures

### Graceful Shutdown

```javascript
// On SIGTERM/SIGINT:
1. Stop polling loop (isRunning = false)
2. Wait for current batch to complete (max 30s timeout)
3. Close Gateway DB connection pool
4. Close TP Capital DB connection pool
5. Exit process
```

## Monitoring

### Health Endpoint

```bash
curl http://localhost:4005/health | jq
```

**Response:**
```json
{
  "status": "healthy",
  "timescale": true,
  "gatewayDb": "connected",
  "pollingWorker": {
    "running": true,
    "lastPollAt": "2025-10-26T14:30:00.000Z",
    "lagSeconds": 0,
    "consecutiveErrors": 0,
    "interval": 5000,
    "channelId": "-1001649127710",
    "batchSize": 100
  },
  "messagesWaiting": 0
}
```

### Prometheus Metrics

```bash
curl http://localhost:4005/metrics | grep tpcapital_gateway
```

**Metrics:**
- `tpcapital_gateway_messages_processed_total{status="published|duplicate|failed|parse_failed"}` - Counter
- `tpcapital_gateway_polling_lag_seconds` - Gauge
- `tpcapital_gateway_processing_duration_seconds` - Histogram
- `tpcapital_gateway_messages_waiting` - Gauge
- `tpcapital_gateway_polling_errors_total{type="connection|database"}` - Counter

## Database Schema

### Gateway Database (telegram_gateway.telegram_messages)

```sql
CREATE TABLE telegram_gateway.telegram_messages (
  channel_id TEXT,
  message_id TEXT,
  text TEXT,
  telegram_date TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  status TEXT,  -- 'received', 'published', 'failed'
  metadata JSONB,
  PRIMARY KEY (channel_id, message_id)
);

-- Processed messages have status='published' with metadata:
{
  "processed_by": "tp-capital",
  "processed_at": "2025-10-26T14:30:00.000Z",
  "signal_asset": "PETR4"
}
```

### TP Capital Database (tp_capital.tp_capital_signals)

```sql
-- Same schema as before, but now has source='telegram-gateway'
SELECT * FROM tp_capital.tp_capital_signals
WHERE source = 'telegram-gateway'
ORDER BY ingested_at DESC;
```

## Idempotency

**Problem:** What if TP Capital processes the same message twice?

**Solution:** Before inserting a signal, check if it already exists:

```sql
SELECT 1 FROM tp_capital.tp_capital_signals
WHERE raw_message = $1 AND channel = $2
LIMIT 1;
```

If found, skip insert and just mark Gateway message as `published`.

**Optional:** Add unique constraint for enforcement:

```sql
ALTER TABLE tp_capital.tp_capital_signals
ADD CONSTRAINT unique_signal_per_channel
UNIQUE (raw_message, channel, telegram_date);
```

## Performance

- **Polling Interval:** 5 seconds (configurable via `GATEWAY_POLLING_INTERVAL_MS`)
- **Batch Size:** 100 messages/poll (configurable via `GATEWAY_BATCH_SIZE`)
- **Throughput:** Up to 1,200 messages/minute (100 msgs * 12 polls/min)
- **Latency:** Max 5 seconds from message arrival to processing
- **Database Overhead:** Minimal (single SELECT query per poll if no messages)

## Troubleshooting

### Service Won't Start

**Error:** `GATEWAY_DATABASE_NAME must be provided`

**Fix:** Add Gateway configuration to `.env`:
```bash
GATEWAY_DATABASE_NAME=telegram_gateway
GATEWAY_DATABASE_SCHEMA=telegram_gateway
GATEWAY_POLLING_INTERVAL_MS=5000
SIGNALS_CHANNEL_ID=-1001649127710
GATEWAY_BATCH_SIZE=100
```

### Gateway DB Connection Failed

**Error:** `Gateway DB connection test failed`

**Possible causes:**
1. Database permissions not granted → Run `setup-gateway-permissions.sql`
2. Wrong database name → Check `GATEWAY_DATABASE_NAME` in `.env`
3. TimescaleDB not running → `docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d tp-capital-timescaledb`

### Messages Not Being Processed

**Debug steps:**
1. Check Gateway has messages:
   ```sql
   SELECT COUNT(*) FROM telegram_gateway.telegram_messages
   WHERE status='received' AND channel_id='-1001649127710';
   ```

2. Check polling worker is running:
   ```bash
   curl http://localhost:4005/health | jq '.pollingWorker.running'
   ```

3. Check for parse errors in logs:
   ```bash
   grep "parse_failed" /path/to/logs
   ```

4. Verify channel ID matches:
   ```bash
   echo $SIGNALS_CHANNEL_ID  # Should be -1001649127710
   ```

## OpenSpec Documentation

Complete technical documentation in `tools/openspec/changes/adapt-tp-capital-consume-gateway/`:

- **[proposal.md](../../tools/openspec/changes/adapt-tp-capital-consume-gateway/proposal.md)** - Why, benefits, migration plan
- **[design.md](../../tools/openspec/changes/adapt-tp-capital-consume-gateway/design.md)** - Technical decisions, patterns
- **[tasks.md](../../tools/openspec/changes/adapt-tp-capital-consume-gateway/tasks.md)** - Implementation checklist
- **[specs/](../../tools/openspec/changes/adapt-tp-capital-consume-gateway/specs/)** - Requirement deltas (ADDED/REMOVED/MODIFIED)

## Migration Notes

### Breaking Changes

- ❌ **Removed:** Direct Telegram bot connection in TP Capital
- ❌ **Removed:** `TELEGRAM_INGESTION_BOT_TOKEN` requirement (now optional)

### Backwards Compatibility

- ✅ Signal parsing logic unchanged (`parseSignal()`)
- ✅ Database schema unchanged (`tp_capital_signals`)
- ✅ API endpoints unchanged
- ✅ Prometheus metrics namespace preserved

### Optional Cleanup (After Testing Succeeds)

```bash
# Delete old Telegram ingestion code (no longer used)
rm apps/tp-capital/src/telegramIngestion.js

# Remove bot token from .env (optional, if not using forwarder)
# TELEGRAM_INGESTION_BOT_TOKEN=...  # Can be removed
```

## Future Enhancements

1. **LISTEN/NOTIFY Pattern** (optional optimization)
   - Replace polling with PostgreSQL LISTEN/NOTIFY
   - Reduces latency to <100ms
   - Requires Gateway to NOTIFY on new messages

2. **Batch Insert** (optional optimization)
   - Insert multiple signals in single transaction
   - Improves throughput for high-volume scenarios

3. **Message Replay** (future feature)
   - Admin API to replay messages by date range
   - Useful for testing or reprocessing

4. **Multiple Consumers** (future)
   - Other services can poll Gateway for their own channels
   - Gateway becomes centralized Telegram message hub

## Support

For questions or issues:
1. Check health endpoint: `curl http://localhost:4005/health`
2. Check logs: `tail -f /path/to/tp-capital/logs`
3. Run test suite: `./test-gateway-integration.sh`
4. Review OpenSpec docs: `tools/openspec/changes/adapt-tp-capital-consume-gateway/`

---

**Last Updated:** 2025-10-26
**Status:** ✅ Ready for Testing
**Version:** 1.0.0
