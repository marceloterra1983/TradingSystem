# OpenSpec Change Proposal: Adapt TP Capital to Consume from Gateway

## Quick Summary

Transform TP Capital from maintaining its own Telegram bot connection to consuming messages from the existing Telegram Gateway database via polling pattern.

## Status

🟡 **Proposal Stage** - Awaiting approval

## Key Files

- **[proposal.md](./proposal.md)** - Complete architectural rationale and impact analysis
- **[design.md](./design.md)** - Technical design decisions for polling worker implementation
- **[tasks.md](./tasks.md)** - Detailed implementation checklist (9 phases, 100+ tasks)
- **[specs/tp-capital-api/spec.md](./specs/tp-capital-api/spec.md)** - Specification deltas (ADDED, REMOVED, MODIFIED requirements)

## Architecture Change

### Current (Problematic)
```
Telegram API
    ↓
TP Capital Telegraf Bot  → Parse Signal → Save to tp_capital_signals
```

**Problems**: Duplicate Telegram connection, tight coupling, single point of failure

### Proposed (Clean)
```
Telegram API
    ↓
Telegram Gateway → Save to telegram_messages (ALL channels)
    ↓
TP Capital Polling Worker (filters channel -1001649127710)
    ↓
Parse Signal → Save to tp_capital_signals
```

**Benefits**: Single source of truth, separation of concerns, independent deployments, easier testing

## Implementation Highlights

### New Components
1. **Gateway Polling Worker** (`gatewayPollingWorker.js`)
   - Polls every 5s (configurable)
   - Batch processing (100 messages/poll)
   - Idempotent signal processing
   - Exponential backoff on errors

2. **Gateway Database Client** (`gatewayDatabaseClient.js`)
   - Dedicated connection pool (max 5 connections)
   - Cross-database access to `telegram_gateway` DB
   - Error handling and graceful shutdown

3. **Prometheus Metrics**
   - `messages_processed_total` (counter with status labels)
   - `polling_lag_seconds` (gauge)
   - `processing_duration_seconds` (histogram)
   - `messages_waiting` (gauge)

### Removed Components
1. **Direct Telegram Bot** (`telegramIngestion.js`) - DELETED
2. **Bot Token Configuration** (`TELEGRAM_INGESTION_BOT_TOKEN`) - REMOVED

## Breaking Changes

⚠️ **WARNING**: This is a breaking change. Requires careful migration.

1. **Telegram bot removed** - TP Capital no longer connects to Telegram API
2. **Environment variables changed** - Remove bot token, add Gateway config
3. **Processing delay** - 0-5s latency vs instant (configurable)
4. **Startup dependency** - Gateway must be running before TP Capital
5. **Database permissions** - TP Capital user needs access to `telegram_gateway` DB

## Migration Checklist

- [ ] Verify Telegram Gateway is running and healthy
- [ ] Grant TP Capital user access to Gateway database (SQL grants)
- [ ] Deploy new code (polling worker + Gateway client)
- [ ] Remove Telegram bot token from `.env`
- [ ] Test end-to-end message flow
- [ ] Monitor for 7 days

## Validation

### Quick Validation Script
```bash
# 1. Start TP Capital with new code
cd apps/tp-capital && npm run dev

# 2. Send test message to Telegram channel -1001649127710

# 3. Verify Gateway received message
psql -h localhost -p 5433 -U timescale -d telegram_gateway -c \
  "SELECT * FROM telegram_gateway.telegram_messages ORDER BY received_at DESC LIMIT 1"

# 4. Wait up to 5 seconds, verify TP Capital processed
psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -c \
  "SELECT * FROM tp_capital.tp_capital_signals ORDER BY ingested_at DESC LIMIT 1"

# 5. Verify Gateway message updated to 'published'
psql -h localhost -p 5433 -U timescale -d telegram_gateway -c \
  "SELECT status, metadata FROM telegram_gateway.telegram_messages \
   WHERE channel_id = '-1001649127710' ORDER BY received_at DESC LIMIT 1"
```

## Success Criteria

- ✅ TP Capital starts without Telegram bot token
- ✅ Polling worker connects to Gateway database
- ✅ Messages processed within 5s
- ✅ Signals appear in Dashboard
- ✅ Gateway messages marked as `published`
- ✅ Idempotency prevents duplicates
- ✅ Health check includes Gateway DB status
- ✅ Prometheus metrics exported

## Timeline

**Estimated Effort**: 4-6 hours total

| Phase | Duration |
|-------|----------|
| Database Preparation | 15 min |
| Code Implementation | 1-2 hours |
| Testing | 1-2 hours |
| Documentation | 1-2 hours |
| Deployment | 30 min |

## Related Proposals

- `split-tp-capital-into-gateway-api` - Alternative approach using HTTP push pattern
  - That proposal creates a NEW Gateway and uses HTTP POST
  - This proposal leverages EXISTING Gateway and uses database polling
  - Both achieve separation of concerns, different trade-offs

## Questions?

Contact: Claude Code AI Agent
Created: 2025-10-26
Change ID: `adapt-tp-capital-consume-gateway`
