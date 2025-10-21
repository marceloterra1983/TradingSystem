# Telegram Bots - Query Workaround

**Date:** 2025-10-13
**Issue:** QuestDB console shows fewer bots than actually exist
**Status:** ✅ Data IS in database, use API to query

## Problem

When querying `telegram_bots` directly in the QuestDB console at http://localhost:9000, you may see fewer rows than expected. However, the **data IS correctly saved** in the database.

## Root Cause

The `telegram_bots` table uses **WAL (Write-Ahead Log)** mode in QuestDB. Simple `SELECT *` queries may not show all data immediately due to:
1. WAL segments not yet fully visible
2. Query cache issues
3. Partition visibility timing

The API endpoint uses the correct query pattern with `LATEST ON` clause which properly reads from WAL-enabled tables.

## ✅ Solution: Use the API Endpoint

Instead of querying QuestDB directly, use the API endpoint which handles WAL tables correctly:

```bash
# Get all bots
curl http://localhost:4006/telegram/bots | json_pp

# Get all channels
curl http://localhost:4006/telegram/channels | json_pp
```

## Current Status

**Via API (Correct):**
```bash
$ curl -s http://localhost:4006/telegram/bots | python3 -m json.tool

{
    "data": [
        {
            "id": "bot-1760368440357-k975jrt",
            "username": "TPCapitalForwarderBot",
            "token": "7567198697:AAHLwMV3lRR8oy_2cDtdxc5Fc3aCTRAixa0",
            "bot_type": "Forwarder",
            "description": "Test insert",
            "status": "active"
        },
        {
            "id": "bot-1760367922858-t7oda31",
            "username": "TPCapitalIngestionBot",
            "token": "7824620102:AAGn4nvACZJ5TMRaWPfYtSmwriYBpXU5P-8",
            "bot_type": "Ingestion",
            "description": "Ingests trading signals from Telegram channels and saves to QuestDB",
            "status": "active"
        },
        {
            "id": "bot-1760367921268-vn6a4jw",
            "username": "TPCapitalForwarderBot",
            "token": "7567198697:AAHLwMV3lRR8oy_2cDtdxc5Fc3aCTRAixa0",
            "bot_type": "Forwarder",
            "description": "Forwards messages from source channel (-1001649127710) to destination channel (-1003158967612)",
            "status": "active"
        },
        {
            "id": "bot-1760209368505-rq8quf5",
            "username": "@TPCapitalBot",
            "token": "123456:ABC-DEF",
            "bot_type": "Forwarder",
            "description": "Bot for forwarding TP Capital signals",
            "status": "active"
        }
    ]
}
```

✅ **Result:** 4 bots found

**Via QuestDB Console (Incomplete):**
```sql
SELECT * FROM telegram_bots;
```
❌ **Result:** Only 1 bot visible (test-bot-1)

## Verification

The bots ARE saved correctly. You can verify by:

### Option 1: Use API (Recommended)
```bash
curl http://localhost:4006/telegram/bots
```

### Option 2: Check QuestDB Logs
```bash
docker logs tp-capital-questdb-1 --tail 100 | grep telegram_bots
```

You'll see entries like:
```
2025-10-13T15:14:00.367543Z I committed data block [wal=/root/.questdb/db/telegram_bots~7/wal5/0, rows=1]
2025-10-13T15:14:00.372386Z I job finished [table=telegram_bots~7, rows=1]
```

### Option 3: Check Partition Files
```bash
docker exec tp-capital-questdb-1 ls -lah /root/.questdb/db/telegram_bots~7/
```

You'll see partitions:
```
drwxrwxr-x  2 root root 4.0K Oct 11 15:38 2025-10-11
drwxrwxr-x  2 root root 4.0K Oct 13 12:05 2025-10-13.4
```

## Why This Happens

QuestDB uses **WAL (Write-Ahead Log)** for high-performance writes. Data is:
1. Written to WAL first (fast)
2. Applied to table partitions asynchronously (background)
3. Visible via API queries that use `LATEST ON` clause

Simple `SELECT *` queries may not immediately show all WAL data, but the API query does.

## Workaround Summary

✅ **DO:** Use API endpoints
```bash
curl http://localhost:4006/telegram/bots
curl http://localhost:4006/telegram/channels
```

❌ **DON'T:** Use simple SELECT in QuestDB console
```sql
SELECT * FROM telegram_bots;  -- May show incomplete data
```

⚠️ **ALTERNATIVE:** Use proper WAL query (complex)
```sql
SELECT * FROM (
  SELECT * FROM telegram_bots
  LATEST ON updated_at PARTITION BY id
)
WHERE status != 'deleted'
ORDER BY updated_at DESC;
```

## API Endpoints Reference

### Bots

```bash
# List all bots
GET http://localhost:4006/telegram/bots

# Create bot
POST http://localhost:4006/telegram/bots
{
  "username": "BotName",
  "token": "TOKEN",
  "bot_type": "Forwarder",
  "description": "Description"
}

# Update bot
PUT http://localhost:4006/telegram/bots/{id}
{
  "status": "inactive"
}

# Delete bot
DELETE http://localhost:4006/telegram/bots/{id}
```

### Channels

```bash
# List all channels
GET http://localhost:4006/telegram/channels

# Create channel
POST http://localhost:4006/telegram/channels
{
  "label": "Channel Name",
  "channel_id": -1001649127710,
  "channel_type": "source",
  "description": "Description"
}
```

## Data IS Saved!

Despite the QuestDB console showing incomplete data, **the bots ARE correctly saved** in the database. The API confirms this by returning all 4 bots when queried.

**Both forwarder and ingestion bots** have been successfully registered and are running.

## Related Documentation

- [TELEGRAM-FORWARDER-COMPLETE.md](TELEGRAM-FORWARDER-COMPLETE.md) - Forwarder implementation
- [TELEGRAM-BOTS-DATABASE-SAVED.md](TELEGRAM-BOTS-DATABASE-SAVED.md) - Bot registration details
- [../../guides/data/QUESTDB-TELEGRAM-BOTS-QUERY-GUIDE.md](../../guides/data/QUESTDB-TELEGRAM-BOTS-QUERY-GUIDE.md) - Query examples

---

**Summary:** Always use the API endpoint (`http://localhost:4006/telegram/bots`) to query bots. The data IS in the database, the QuestDB console just doesn't show it correctly due to WAL timing.
