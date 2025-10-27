# Gateway Integration Testing Guide

This guide walks you through testing the new Telegram Gateway polling integration for TP Capital.

## Prerequisites

- ✅ Telegram Gateway service running on port 4006
- ✅ TimescaleDB running with both `telegram_gateway` and `APPS-TPCAPITAL` databases
- ✅ Environment variables configured in `.env`

## Step 1: Database Permissions Setup

Run the SQL script to grant TP Capital user access to the Gateway database:

```bash
# Connect to TimescaleDB and run permissions script
psql -h localhost -p 5433 -U timescale -d telegram_gateway -f apps/tp-capital/setup-gateway-permissions.sql
```

**Expected output:**
```
GRANT
GRANT
GRANT
```

**Verify permissions:**
```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'telegram_messages'
  AND grantee = 'timescale';
```

Should show `SELECT` and `UPDATE` privileges for user `timescale`.

---

## Step 2: Environment Configuration

Add these variables to your `.env` file (already in `.env.example`):

```bash
# Telegram Gateway Database (for TP Capital signal polling)
GATEWAY_DATABASE_NAME=telegram_gateway
GATEWAY_DATABASE_SCHEMA=telegram_gateway
GATEWAY_POLLING_INTERVAL_MS=5000        # Poll every 5 seconds
SIGNALS_CHANNEL_ID=-1001649127710       # TP Capital signals channel
GATEWAY_BATCH_SIZE=100                  # Process up to 100 messages per poll
```

**Verify configuration:**
```bash
# Check if Gateway database is accessible
psql -h localhost -p 5433 -U timescale -d telegram_gateway -c "SELECT COUNT(*) FROM telegram_gateway.telegram_messages;"
```

---

## Step 3: Start TP Capital Service

```bash
cd /home/marce/Projetos/TradingSystem/apps/tp-capital
npm run dev
```

**Expected startup logs:**
```
Gateway database client initialized
Gateway polling worker configured
Gateway polling worker started successfully
TP Capital API listening on port 4005
```

**⚠️ If you see errors:**
- Check database permissions (Step 1)
- Verify environment variables (Step 2)
- Check TimescaleDB is running: `docker ps | grep timescale`

---

## Step 4: Verify Health Endpoint

```bash
curl http://localhost:4005/health | jq
```

**Expected response:**
```json
{
  "status": "healthy",
  "timescale": true,
  "gatewayDb": "connected",
  "pollingWorker": {
    "running": true,
    "lastPollAt": "2025-10-26T...",
    "lagSeconds": 0,
    "consecutiveErrors": 0,
    "interval": 5000,
    "channelId": "-1001649127710",
    "batchSize": 100
  },
  "messagesWaiting": 0
}
```

**✅ Good signs:**
- `status: "healthy"`
- `gatewayDb: "connected"`
- `pollingWorker.running: true`
- `pollingWorker.consecutiveErrors: 0`

**❌ Bad signs:**
- `status: "degraded"` → Check database connections
- `gatewayDb: "error"` → Check permissions (Step 1)
- `pollingWorker: null` → Check logs for startup errors

---

## Step 5: Test End-to-End Message Flow

### 5.1 Insert Test Message into Gateway Database

```sql
-- Insert a test signal message
INSERT INTO telegram_gateway.telegram_messages (
  channel_id,
  message_id,
  text,
  telegram_date,
  received_at,
  status,
  metadata
) VALUES (
  '-1001649127710',
  999999,
  E'🎯 SINAL DE COMPRA\n\n📊 ATIVO: PETR4\n💰 COMPRA: 28.50 - 28.80\n🎯 ALVO 1: 29.20\n🎯 ALVO 2: 29.80\n🏁 ALVO FINAL: 30.50\n🛑 STOP: 27.90',
  NOW(),
  NOW(),
  'received',
  '{}'::jsonb
);
```

### 5.2 Wait for Polling Cycle (max 5 seconds)

```bash
# Watch TP Capital logs
tail -f /path/to/tp-capital/logs
```

**Expected logs:**
```
Processing batch of messages (count: 1)
Signal processed successfully (messageId: 999999, asset: PETR4, signalType: buy)
```

### 5.3 Verify Signal Saved in TP Capital Database

```sql
-- Check tp_capital_signals table
SELECT
  signal_type,
  asset,
  buy_min,
  buy_max,
  target_1,
  target_2,
  target_final,
  stop,
  source,
  ingested_at
FROM tp_capital.tp_capital_signals
WHERE raw_message LIKE '%PETR4%'
ORDER BY ingested_at DESC
LIMIT 1;
```

**Expected result:**
```
 signal_type | asset | buy_min | buy_max | target_1 | target_2 | target_final | stop  |     source      |     ingested_at
-------------+-------+---------+---------+----------+----------+--------------+-------+-----------------+---------------------
 buy         | PETR4 |   28.50 |   28.80 |    29.20 |    29.80 |        30.50 | 27.90 | telegram-gateway| 2025-10-26 14:30:00
```

### 5.4 Verify Message Status Updated in Gateway Database

```sql
-- Check message was marked as 'published'
SELECT
  message_id,
  channel_id,
  status,
  metadata->'processed_by' as processed_by,
  metadata->'signal_asset' as signal_asset
FROM telegram_gateway.telegram_messages
WHERE message_id = 999999;
```

**Expected result:**
```
 message_id |   channel_id    |  status   | processed_by | signal_asset
------------+-----------------+-----------+--------------+--------------
     999999 | -1001649127710  | published | "tp-capital" | "PETR4"
```

---

## Step 6: Test Idempotency (Duplicate Prevention)

### 6.1 Re-insert the Same Message

```sql
-- Update status back to 'received' to simulate duplicate
UPDATE telegram_gateway.telegram_messages
SET status = 'received'
WHERE message_id = 999999;
```

### 6.2 Wait for Next Polling Cycle

**Expected logs:**
```
Signal already processed, skipping (messageId: 999999, asset: PETR4)
```

### 6.3 Verify No Duplicate Signal Created

```sql
-- Should still have only 1 signal for this message
SELECT COUNT(*) FROM tp_capital.tp_capital_signals
WHERE raw_message LIKE '%PETR4%';
```

**Expected:** `COUNT = 1` (not 2!)

---

## Step 7: Check Prometheus Metrics

```bash
curl http://localhost:4005/metrics | grep tpcapital_gateway
```

**Expected metrics:**
```
# HELP tpcapital_gateway_messages_processed_total Total messages processed
# TYPE tpcapital_gateway_messages_processed_total counter
tpcapital_gateway_messages_processed_total{status="published"} 1
tpcapital_gateway_messages_processed_total{status="duplicate"} 1

# HELP tpcapital_gateway_polling_lag_seconds Time since last poll
# TYPE tpcapital_gateway_polling_lag_seconds gauge
tpcapital_gateway_polling_lag_seconds 0

# HELP tpcapital_gateway_messages_waiting Messages waiting
# TYPE tpcapital_gateway_messages_waiting gauge
tpcapital_gateway_messages_waiting 0

# HELP tpcapital_gateway_processing_duration_seconds Processing duration
# TYPE tpcapital_gateway_processing_duration_seconds histogram
tpcapital_gateway_processing_duration_seconds_bucket{le="0.01"} 2
tpcapital_gateway_processing_duration_seconds_bucket{le="0.05"} 2
tpcapital_gateway_processing_duration_seconds_sum 0.015
tpcapital_gateway_processing_duration_seconds_count 2
```

---

## Step 8: Test Real Telegram Message (Optional)

If you have access to the Telegram channel `-1001649127710`:

1. Send a signal message to the channel through Telegram
2. Gateway receives and saves to `telegram_gateway.telegram_messages`
3. TP Capital polls and processes within 5 seconds
4. Check signal appears in `tp_capital.tp_capital_signals`

---

## Troubleshooting

### Error: "GATEWAY_DATABASE_NAME must be provided"

**Fix:** Add Gateway configuration to `.env` (see Step 2)

### Error: "Gateway DB connection test failed"

**Possible causes:**
1. Database permissions not granted → Re-run Step 1
2. Wrong database name in .env → Check `GATEWAY_DATABASE_NAME=telegram_gateway`
3. TimescaleDB not running → `docker compose -f tools/compose/docker-compose.database.yml up -d`

### Error: "permission denied for table telegram_messages"

**Fix:** Run permissions SQL script (Step 1)

### Polling worker shows `consecutiveErrors > 0`

**Check logs for:**
- Database connection errors → Verify TimescaleDB is accessible
- SQL syntax errors → Check schema names match configuration
- Network issues → Verify Docker networking if using containers

### Messages not being processed

**Debug checklist:**
1. Check Gateway has messages: `SELECT COUNT(*) FROM telegram_gateway.telegram_messages WHERE status='received' AND channel_id='-1001649127710';`
2. Check polling worker is running: `curl http://localhost:4005/health | jq '.pollingWorker.running'`
3. Check for parse errors in logs: `grep "parse_failed" /path/to/logs`
4. Verify channel ID matches: `echo $SIGNALS_CHANNEL_ID` should be `-1001649127710`

---

## Success Criteria ✅

- [ ] Health endpoint shows `status: "healthy"` and `gatewayDb: "connected"`
- [ ] Polling worker running (`pollingWorker.running: true`)
- [ ] Test message successfully processed and saved to `tp_capital_signals`
- [ ] Gateway message status updated to `published`
- [ ] Duplicate message correctly skipped (idempotency works)
- [ ] Prometheus metrics showing message counts
- [ ] No errors in service logs
- [ ] Real-time dashboard shows signals (if applicable)

---

## Next Steps After Successful Testing

1. **Monitor Production Metrics**
   - Set up Prometheus alerts for `pollingErrors` and `pollingLagSeconds`
   - Create Grafana dashboard for Gateway polling metrics

2. **Optional Cleanup**
   - Delete old Telegram bot code: `rm apps/tp-capital/src/telegramIngestion.js`
   - Remove `TELEGRAM_INGESTION_BOT_TOKEN` from `.env` (no longer needed)

3. **Performance Tuning** (if needed)
   - Adjust `GATEWAY_POLLING_INTERVAL_MS` (default 5000ms)
   - Increase `GATEWAY_BATCH_SIZE` if processing high volumes (default 100)

---

## Reference

- **OpenSpec Proposal:** `tools/openspec/changes/adapt-tp-capital-consume-gateway/proposal.md`
- **Technical Design:** `tools/openspec/changes/adapt-tp-capital-consume-gateway/design.md`
- **Implementation Tasks:** `tools/openspec/changes/adapt-tp-capital-consume-gateway/tasks.md`
