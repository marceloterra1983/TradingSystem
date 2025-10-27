# TP Capital Gateway Integration - Monitoring Guide

## Overview

This guide provides monitoring instructions for the TP Capital Gateway polling integration in production.

## Quick Health Check

### Command Line
```bash
curl -s http://localhost:4005/health | jq '.'
```

### Expected Response (Healthy)
```json
{
  "status": "healthy",
  "timescale": true,
  "gatewayDb": "connected",
  "pollingWorker": {
    "running": true,
    "lastPollAt": "2025-10-27T00:00:26.179Z",
    "lagSeconds": 1.623,
    "consecutiveErrors": 0,
    "interval": 5000,
    "channelId": "-1001649127710",
    "batchSize": 100
  },
  "messagesWaiting": 0
}
```

## Key Metrics

### 1. Polling Lag (`lagSeconds`)
**What it means:** Time since last successful poll
**Healthy range:** 0-3 seconds
**Warning:** 3-5 seconds
**Critical:** > 5 seconds

**If unhealthy:**
- Check database connectivity
- Check for network issues
- Verify Gateway service is running
- Check TP Capital service logs

### 2. Messages Waiting (`messagesWaiting`)
**What it means:** Number of unprocessed messages in Gateway DB
**Healthy range:** 0-10 messages
**Warning:** 10-50 messages
**Critical:** > 50 messages

**If unhealthy:**
- Messages arriving faster than processing
- Check processing duration
- Verify signal parsing is not failing
- Consider increasing batch size or reducing poll interval

### 3. Worker Status (`running`)
**What it means:** Whether polling worker is active
**Healthy:** `true`
**Critical:** `false`

**If unhealthy:**
- Restart TP Capital service
- Check for uncaught errors in logs
- Verify database connections

### 4. Consecutive Errors (`consecutiveErrors`)
**What it means:** Number of failed polling cycles in a row
**Healthy:** 0-2
**Warning:** 3-5
**Critical:** > 5

**If unhealthy:**
- Check recent logs for error messages
- Verify database permissions
- Check for schema changes

## Prometheus Metrics

### Messages Processed
```promql
# Total messages processed
sum(tpcapital_gateway_messages_processed_total)

# By status (published, duplicate, failed, parse_failed)
sum by (status) (tpcapital_gateway_messages_processed_total)

# Success rate (last 5 minutes)
rate(tpcapital_gateway_messages_processed_total{status="published"}[5m])
  / rate(tpcapital_gateway_messages_processed_total[5m]) * 100
```

### Polling Lag
```promql
# Current lag
tpcapital_gateway_polling_lag_seconds

# Average lag (last 5 minutes)
avg_over_time(tpcapital_gateway_polling_lag_seconds[5m])

# Max lag (last 1 hour)
max_over_time(tpcapital_gateway_polling_lag_seconds[1h])
```

### Processing Duration
```promql
# 95th percentile (last 5 minutes)
histogram_quantile(0.95, rate(tpcapital_gateway_processing_duration_seconds_bucket[5m]))

# 99th percentile (last 5 minutes)
histogram_quantile(0.99, rate(tpcapital_gateway_processing_duration_seconds_bucket[5m]))
```

### Messages Waiting
```promql
# Current queue size
tpcapital_gateway_messages_waiting

# Average queue size (last 5 minutes)
avg_over_time(tpcapital_gateway_messages_waiting[5m])
```

## Grafana Dashboard

**Location:** `tools/monitoring/grafana/dashboards/tp-capital-gateway-dashboard.json`

**Import Steps:**
1. Open Grafana UI (http://localhost:3000)
2. Navigate to Dashboards > Import
3. Upload `tp-capital-gateway-dashboard.json`
4. Select Prometheus data source
5. Click Import

**Dashboard Panels:**
- **Messages Processed:** Total count of processed messages
- **Polling Lag:** Real-time lag gauge with thresholds
- **Messages Waiting:** Current queue size
- **Worker Status:** Running/Down status
- **Messages by Status:** Rate of published/duplicate/failed messages
- **Processing Duration:** p95/p99 processing time
- **Success Rate:** Percentage of successfully published messages
- **Duplicate Rate:** Percentage of duplicate messages
- **Error Rate:** Percentage of failed messages

**Alerts Configured:**
- High Polling Lag (> 5s for 5 minutes)
- High Queue Size (> 100 messages for 5 minutes)

## Monitoring Script

**Location:** `apps/tp-capital/scripts/monitor-gateway-lag.sh`

**Usage:**
```bash
# Start monitoring (checks every 10 seconds)
./apps/tp-capital/scripts/monitor-gateway-lag.sh

# Custom health endpoint
TP_CAPITAL_URL=http://production-host:4005 ./apps/tp-capital/scripts/monitor-gateway-lag.sh
```

**Sample Output:**
```
🔍 TP Capital Gateway Polling Monitor
Health Endpoint: http://localhost:4005/health
Thresholds: WARN=3s, CRIT=5s
=========================================

2025-10-27 00:15:30 [OK] Lag: 1.6s | Waiting: 0 messages
2025-10-27 00:15:40 [OK] Lag: 2.1s | Waiting: 2 messages
2025-10-27 00:15:50 [WARNING] Lag: 3.5s | Waiting: 5 messages
2025-10-27 00:16:00 [CRITICAL] Lag: 6.2s | Waiting: 15 messages
```

## Database Queries

### Check Recent Signals
```sql
-- Last 10 signals inserted
SELECT
    id,
    asset,
    signal_type,
    buy_min,
    buy_max,
    target_final,
    source,
    to_char(ingested_at, 'YYYY-MM-DD HH24:MI:SS') as ingested
FROM tp_capital.tp_capital_signals
ORDER BY ingested_at DESC
LIMIT 10;
```

### Check Gateway Message Status
```sql
-- Recent messages by status
SELECT
    status,
    COUNT(*) as count,
    MAX(received_at) as last_received
FROM telegram_gateway.messages
WHERE channel_id = '-1001649127710'
    AND received_at > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

### Check for Duplicates
```sql
-- Find duplicate signals (should be none)
SELECT
    raw_message,
    channel,
    COUNT(*) as count
FROM tp_capital.tp_capital_signals
GROUP BY raw_message, channel
HAVING COUNT(*) > 1;
```

## Common Issues & Troubleshooting

### Issue: High Polling Lag

**Symptoms:**
- `lagSeconds` > 5
- Messages accumulating in queue

**Diagnosis:**
```bash
# Check database connectivity
docker exec -i data-timescaledb psql -U timescale -d "APPS-TPCAPITAL" -c "SELECT 1"
docker exec -i data-timescaledb psql -U timescale -d "APPS-TELEGRAM-GATEWAY" -c "SELECT 1"

# Check service logs
tail -100 /tmp/tp-capital-fixed-ts.log | grep ERROR
```

**Solutions:**
1. Restart TP Capital service
2. Check database server load
3. Verify network connectivity
4. Check for database locks

### Issue: Messages Not Processing

**Symptoms:**
- `messagesWaiting` increasing
- No new signals in database

**Diagnosis:**
```bash
# Check worker status
curl -s http://localhost:4005/health | jq '.pollingWorker.running'

# Check recent errors
tail -50 /tmp/tp-capital-fixed-ts.log | grep -A 5 "Failed to process"
```

**Solutions:**
1. Check signal parsing logic (parsing errors)
2. Verify database schema matches code
3. Check for permission issues
4. Review error logs for specific failures

### Issue: High Duplicate Rate

**Symptoms:**
- Many messages marked as `duplicate` in metrics
- Same signals appearing multiple times in logs

**Diagnosis:**
```bash
# Check for actual duplicates in signals table
docker exec -i data-timescaledb psql -U timescale -d "APPS-TPCAPITAL" -c "
SELECT raw_message, channel, COUNT(*) as count
FROM tp_capital.tp_capital_signals
GROUP BY raw_message, channel
HAVING COUNT(*) > 1;
"

# Check Gateway message status
docker exec -i data-timescaledb psql -U timescale -d "APPS-TELEGRAM-GATEWAY" -c "
SELECT message_id, status, metadata
FROM telegram_gateway.messages
WHERE channel_id = '-1001649127710'
ORDER BY received_at DESC
LIMIT 10;
"
```

**Solutions:**
1. If duplicates exist in signals table: Bug in duplicate detection logic
2. If Gateway keeps resetting status: Check status update logic
3. Verify `checkDuplicate()` method is working

### Issue: Parse Failures

**Symptoms:**
- High `parse_failed` metric
- Messages marked as `failed` with parse errors

**Diagnosis:**
```bash
# Check recent failed messages
docker exec -i data-timescaledb psql -U timescale -d "APPS-TELEGRAM-GATEWAY" -c "
SELECT message_id, text, metadata->>'error' as error
FROM telegram_gateway.messages
WHERE status = 'failed'
    AND channel_id = '-1001649127710'
ORDER BY received_at DESC
LIMIT 5;
"
```

**Solutions:**
1. Update `parseSignal()` regex patterns
2. Add new signal format handling
3. Improve error logging for failed parses

## Performance Tuning

### Increase Polling Frequency
**When:** Messages accumulating faster than processing
**Change:** Reduce `GATEWAY_POLLING_INTERVAL_MS` from 5000 to 3000 (3 seconds)

### Increase Batch Size
**When:** Consistent high message backlog
**Change:** Increase `GATEWAY_BATCH_SIZE` from 100 to 200

### Database Optimization
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'tp_capital'
ORDER BY idx_scan DESC;

-- Vacuum and analyze
VACUUM ANALYZE tp_capital.tp_capital_signals;
```

## Alerting Rules

### Prometheus Alert Rules

```yaml
groups:
  - name: tp_capital_gateway
    interval: 30s
    rules:
      - alert: HighPollingLag
        expr: tpcapital_gateway_polling_lag_seconds > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "TP Capital polling lag is high"
          description: "Polling lag is {{ $value }}s (threshold: 5s)"

      - alert: HighMessageQueue
        expr: tpcapital_gateway_messages_waiting > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "TP Capital message queue is large"
          description: "{{ $value }} messages waiting (threshold: 100)"

      - alert: WorkerDown
        expr: tpcapital_gateway_messages_processed_total == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "TP Capital worker is not processing messages"
          description: "No messages processed in the last 5 minutes"

      - alert: HighErrorRate
        expr: |
          rate(tpcapital_gateway_messages_processed_total{status=~"failed|parse_failed"}[5m])
          / rate(tpcapital_gateway_messages_processed_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "TP Capital error rate is high"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
```

## Contact & Escalation

**Service Owner:** TP Capital Team
**On-call:** [Configure your on-call rotation]
**Runbook:** This document

**Escalation Path:**
1. Check health endpoint and metrics
2. Review recent logs for errors
3. Restart service if needed
4. Check database connectivity
5. Escalate to database team if persistent

---

**Last Updated:** 2025-10-27
**Version:** 1.0
