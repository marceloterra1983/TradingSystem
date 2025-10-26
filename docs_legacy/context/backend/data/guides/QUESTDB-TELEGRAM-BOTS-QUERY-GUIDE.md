---
title: QuestDB Telegram Bots Query Guide
sidebar_position: 20
tags: [backend, data, questdb, telegram, queries, guide]
domain: backend
type: guide
summary: Practical guide for querying Telegram bot data in QuestDB with examples and best practices
status: active
last_review: "2025-10-17"
---

# QuestDB - How to Query Telegram Bots Table

## Issue

When querying `telegram_bots` in the QuestDB console with `SELECT * FROM telegram_bots LIMIT 1`, you only see 0-1 rows even though the data exists.

## Root Cause

The `telegram_bots` table uses **QuestDB's time-series partitioning** with `updated_at` as the designated timestamp column. The table stores historical versions of each bot (for audit trail), so you need to use the `LATEST ON` clause to get the current version of each bot.

## ✅ Correct Queries

### Get All Active Bots (Current Versions Only)

```sql
SELECT id, username, token, bot_type, description, status, created_at, updated_at
FROM (
  SELECT id, username, token, bot_type, description, status, created_at, updated_at
  FROM telegram_bots
  LATEST ON updated_at PARTITION BY id
)
WHERE status != 'deleted'
ORDER BY updated_at DESC;
```

### Get All Bots (Including Deleted)

```sql
SELECT id, username, token, bot_type, description, status, created_at, updated_at
FROM telegram_bots
LATEST ON updated_at PARTITION BY id
ORDER BY updated_at DESC;
```

### Get All Historical Versions (Full Audit Trail)

```sql
SELECT * FROM telegram_bots
ORDER BY updated_at DESC;
```

### Get Specific Bot by ID

```sql
SELECT * FROM telegram_bots
WHERE id = 'bot-1760367921268-vn6a4jw'
LATEST ON updated_at PARTITION BY id;
```

### Count Active Bots

```sql
SELECT COUNT(*) as active_bots
FROM (
  SELECT id, status
  FROM telegram_bots
  LATEST ON updated_at PARTITION BY id
)
WHERE status = 'active';
```

### Get Bots by Type

```sql
SELECT id, username, bot_type, description
FROM (
  SELECT id, username, bot_type, description, status
  FROM telegram_bots
  LATEST ON updated_at PARTITION BY id
)
WHERE bot_type = 'Forwarder' AND status = 'active';
```

## Why LATEST ON is Needed

QuestDB is designed for time-series data. The `telegram_bots` table uses an **append-only pattern** where:

1. **Creating a bot** → INSERTs a new row
2. **Updating a bot** → INSERTs a new row with the same ID but newer timestamp (UPDATE doesn't delete old rows)
3. **Deleting a bot** → INSERTs a new row with `status='deleted'`

This pattern provides:
- **Full audit trail** - Every change is preserved
- **Time-travel queries** - Query bot state at any point in time
- **High write performance** - No locks or updates needed

The `LATEST ON updated_at PARTITION BY id` clause tells QuestDB to:
- **PARTITION BY id** - Group rows by bot ID
- **LATEST ON updated_at** - Return only the most recent row in each group

## Quick Reference - QuestDB Console

When using the QuestDB console at `http://localhost:9000`, use this query in the text box at the top:

```sql
SELECT * FROM (
  SELECT * FROM telegram_bots
  LATEST ON updated_at PARTITION BY id
)
WHERE status != 'deleted'
ORDER BY updated_at DESC;
```

Then click the green "Run" button or press `Ctrl+Enter`.

## Verification

You can verify the bots are saved by:

### Option 1: Via API (Easiest)
```bash
curl http://localhost:4006/telegram/bots | json_pp
```

### Option 2: Via QuestDB HTTP API
```bash
curl -G "http://localhost:9000/exec" \
  --data-urlencode "query=SELECT * FROM telegram_bots LATEST ON updated_at PARTITION BY id WHERE status != 'deleted'" \
  | json_pp
```

### Option 3: Via QuestDB Console
1. Open http://localhost:9000
2. Paste the query above
3. Click Run

## Current Bots in Database

As of 2025-10-13 15:05:

1. **TPCapitalForwarderBot** (Forwarder)
   - ID: `bot-1760367921268-vn6a4jw`
   - Token: `7567198697:AAHLwMV3lRR8oy_2cDtdxc5Fc3aCTRAixa0`

2. **TPCapitalIngestionBot** (Ingestion)
   - ID: `bot-1760367922858-t7oda31`
   - Token: `7824620102:AAGn4nvACZJ5TMRaWPfYtSmwriYBpXU5P-8`

3. **@TPCapitalBot** (Test/Old)
   - ID: `bot-1760209368505-rq8quf5`
   - Token: `123456:ABC-DEF`

## Table Schema

```sql
CREATE TABLE telegram_bots (
  id SYMBOL,              -- Bot unique identifier
  username SYMBOL,        -- Bot username
  token STRING,           -- Telegram API token
  bot_type SYMBOL,        -- Type: Forwarder, Ingestion, Sender
  description STRING,     -- Human-readable description
  status SYMBOL,          -- Status: active, inactive, deleted
  created_at TIMESTAMP,   -- Creation time
  updated_at TIMESTAMP    -- Last update time (DESIGNATED TIMESTAMP)
) TIMESTAMP(updated_at) PARTITION BY DAY;
```

The `TIMESTAMP(updated_at)` designation makes this a time-series table.

## Common Mistakes

❌ **Wrong:**
```sql
SELECT * FROM telegram_bots;
-- Returns ALL historical versions, not just current ones
```

❌ **Wrong:**
```sql
SELECT * FROM telegram_bots LIMIT 1;
-- Returns only 1 row (could be any version)
```

✅ **Correct:**
```sql
SELECT * FROM telegram_bots
LATEST ON updated_at PARTITION BY id
WHERE status != 'deleted';
-- Returns current version of each bot
```

## Additional Resources

- QuestDB Documentation: https://questdb.io/docs/concept/designated-timestamp/
- QuestDB LATEST ON: https://questdb.io/docs/reference/sql/latest-on/
- Time-series patterns: https://questdb.io/docs/operations/data-retention/

---

**Summary:** The bots ARE in the database. Use the `LATEST ON` clause to query time-series tables correctly in QuestDB.
