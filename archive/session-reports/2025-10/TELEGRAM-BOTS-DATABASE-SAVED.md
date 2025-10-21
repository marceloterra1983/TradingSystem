# Telegram Bots Saved to Database

**Date:** 2025-10-13 15:05 (São Paulo time)
**Status:** ✅ Complete

## Summary

Both Telegram bots (Forwarder and Ingestion) have been successfully saved to the `telegram_bots` table in QuestDB.

## Bots Registered

### 1. Forwarder Bot ✅

```json
{
  "id": "bot-1760367921268-vn6a4jw",
  "username": "TPCapitalForwarderBot",
  "token": "7567198697:AAHLwMV3lRR8oy_2cDtdxc5Fc3aCTRAixa0",
  "bot_type": "Forwarder",
  "description": "Forwards messages from source channel (-1001649127710) to destination channel (-1003158967612)",
  "status": "active",
  "created_at": "2025-10-13T15:05:21.268000Z",
  "updated_at": "2025-10-13T15:05:21.268000Z"
}
```

**Purpose:** Automatically forwards messages from source Telegram channel to destination channel.

**Configuration:**
- Source Channel: `-1001649127710`
- Destination Channel: `-1003158967612`
- Mode: Polling

### 2. Ingestion Bot ✅

```json
{
  "id": "bot-1760367922858-t7oda31",
  "username": "TPCapitalIngestionBot",
  "token": "7824620102:AAGn4nvACZJ5TMRaWPfYtSmwriYBpXU5P-8",
  "bot_type": "Ingestion",
  "description": "Ingests trading signals from Telegram channels and saves to QuestDB",
  "status": "active",
  "created_at": "2025-10-13T15:05:22.858000Z",
  "updated_at": "2025-10-13T15:05:22.858000Z"
}
```

**Purpose:** Listens to Telegram channels, parses trading signals, and saves them to QuestDB for analysis.

## Database Schema

Table: `telegram_bots`

```sql
CREATE TABLE telegram_bots (
  id SYMBOL,                    -- Unique bot identifier (bot-{timestamp}-{random})
  username SYMBOL,              -- Bot username (e.g., "TPCapitalForwarderBot")
  token STRING,                 -- Telegram bot API token
  bot_type SYMBOL,              -- Bot type: "Forwarder", "Ingestion", "Sender"
  description STRING,           -- Human-readable description
  status SYMBOL,                -- Status: "active", "inactive", "deleted"
  created_at TIMESTAMP,         -- Creation timestamp
  updated_at TIMESTAMP          -- Last update timestamp
) TIMESTAMP(updated_at) PARTITION BY DAY;
```

## API Endpoints

### List All Bots
```bash
curl http://localhost:4006/telegram/bots
```

### Create Bot
```bash
curl -X POST http://localhost:4006/telegram/bots \
  -H "Content-Type: application/json" \
  -d '{
    "username": "BotUsername",
    "token": "BOT_TOKEN",
    "bot_type": "Forwarder",
    "description": "Bot description"
  }'
```

### Update Bot
```bash
curl -X PUT http://localhost:4006/telegram/bots/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive"
  }'
```

### Delete Bot (Soft Delete)
```bash
curl -X DELETE http://localhost:4006/telegram/bots/{id}
```

## Benefits of Database Storage

1. **Centralized Management:** All bot tokens and configurations in one place
2. **Version Control:** Track bot changes over time with timestamps
3. **Audit Trail:** Know when bots were created/updated/deleted
4. **Multi-Bot Support:** Easily add new bots without code changes
5. **Status Tracking:** Enable/disable bots without removing them
6. **API Integration:** Manage bots via REST API from any client

## Security Considerations

⚠️ **Important:** Bot tokens are stored in plaintext in the database. For production:

1. **Encrypt tokens** before storing (use AES-256 encryption)
2. **Restrict database access** to authorized users only
3. **Use environment variables** for active bot tokens (as backup)
4. **Rotate tokens** periodically
5. **Monitor access logs** for suspicious activity

## Current Bot Status

| Bot Username | Type | Status | Created | Description |
|-------------|------|--------|---------|-------------|
| TPCapitalForwarderBot | Forwarder | Active | 2025-10-13 15:05 | Forwards messages between channels |
| TPCapitalIngestionBot | Ingestion | Active | 2025-10-13 15:05 | Ingests signals to QuestDB |
| @TPCapitalBot | Forwarder | Active | 2025-10-11 19:02 | Test bot (old) |

## Querying Bots

### Via API (Recommended)
```bash
# Get all active bots
curl http://localhost:4006/telegram/bots | jq '.data[] | select(.status == "active")'

# Get bots by type
curl http://localhost:4006/telegram/bots | jq '.data[] | select(.bot_type == "Forwarder")'
```

### Via QuestDB HTTP API
```bash
# Get all bots
curl "http://localhost:9000/exec?query=SELECT%20*%20FROM%20telegram_bots%20LATEST%20ON%20updated_at%20PARTITION%20BY%20id%20WHERE%20status%20!=%20'deleted'"

# Get bot by ID
curl "http://localhost:9000/exec?query=SELECT%20*%20FROM%20telegram_bots%20WHERE%20id='bot-1760367921268-vn6a4jw'%20LATEST%20ON%20updated_at%20PARTITION%20BY%20id"
```

### Via QuestDB Console
```sql
-- Get all active bots
SELECT * FROM (
  SELECT * FROM telegram_bots
  LATEST ON updated_at PARTITION BY id
) WHERE status != 'deleted';

-- Get forwarder bots only
SELECT * FROM (
  SELECT * FROM telegram_bots
  LATEST ON updated_at PARTITION BY id
) WHERE bot_type = 'Forwarder' AND status = 'active';
```

## Integration with Service

The bots stored in the database are for **documentation and management purposes**. The active bots running in the TP Capital Signals service are configured via:

1. **Environment Variables (.env):**
   ```env
   TELEGRAM_FORWARDER_BOT_TOKEN=7567198697:AAHLwMV3lRR8oy_2cDtdxc5Fc3aCTRAixa0
   TELEGRAM_INGESTION_BOT_TOKEN=7824620102:AAGn4nvACZJ5TMRaWPfYtSmwriYBpXU5P-8
   ```

2. **Service Initialization (server.js):**
   ```javascript
   const telegramIngestion = createTelegramIngestion();
   const telegramForwarder = createTelegramForwarder();
   ```

**Future Enhancement:** Load bot tokens dynamically from QuestDB instead of .env file for centralized bot management.

## Verification

✅ **Database:** QuestDB running on port 9000
✅ **Service:** TP Capital Signals running on port 4006
✅ **Bots Registered:** 2 active bots (Forwarder + Ingestion)
✅ **API Access:** All CRUD operations working

## Related Files

- `frontend/apps/tp-capital/src/server.js` - Bot CRUD endpoints (lines 184-310)
- `frontend/apps/tp-capital/src/telegramForwarder.js` - Forwarder bot implementation
- `frontend/apps/tp-capital/src/telegramIngestion.js` - Ingestion bot implementation
- `TELEGRAM-FORWARDER-COMPLETE.md` - Complete forwarder implementation guide

## Next Steps

1. ✅ Clean up old test bot (@TPCapitalBot) if no longer needed
2. Consider implementing token encryption for security
3. Consider loading active bot tokens from database instead of .env
4. Add bot health monitoring/status updates
5. Create UI for bot management in dashboard

---

**Status:** ✅ Both bots successfully registered in telegram_bots table and currently running.
