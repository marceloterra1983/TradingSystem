---
title: tp_capital_signals table
sidebar_position: 40
tags: [data, questdb, trading-core, backend]
domain: backend
type: reference
summary: QuestDB schema for normalized TP Capital Telegram signals and supporting reference tables
status: active
last_review: 2025-10-17
---

# `tp_capital_signals`

QuestDB time-series table populated by `frontend/apps/tp-capital`. The ingestion service receives Telegram messages, normalizes them, persists the record, and exposes REST endpoints consumed by the dashboard (`/signals`, `/logs`, `/telegram/bots`, `/telegram/channels`).

## Column reference

| Column | Type | Notes |
|--------|------|-------|
| `ts` | `TIMESTAMP` | Designated timestamp (partitioned by day). Parsed from message timestamp or current time. |
| `channel` | `SYMBOL` | Human-friendly channel label (`@TPCapital_Oficial`). |
| `signal_type` | `SYMBOL` | Operation type (`Swing Trade`, `Day Trade`, etc.). |
| `asset` | `SYMBOL` | Underlying asset ticker. |
| `buy_min` | `DOUBLE` | Lower bound for buy zone. |
| `buy_max` | `DOUBLE` | Upper bound for buy zone. |
| `target_1` | `DOUBLE` | First profit target. |
| `target_2` | `DOUBLE` | Second profit target (optional). |
| `target_final` | `DOUBLE` | Final profit target (optional). |
| `stop` | `DOUBLE` | Stop-loss level. |
| `raw_message` | `STRING` | Original Telegram message (sanitised quotes). |
| `source` | `SYMBOL` | Message origin (`forwarder`, `ingestion`, etc.). |
| `ingested_at` | `TIMESTAMP` | Server-side ingestion timestamp (used for deletion workflow). |

Primary access patterns:
- Dashboard table (`TP CAPITAL | OPCOES`) filters by `channel`, `signal_type`, search by `asset`/`raw_message`, with `LIMIT` 100-1000.
- Back-office scripts delete rows by `ingested_at` to rebuild after corrections.

Example DDL:

```sql
CREATE TABLE tp_capital_signals (
  ts TIMESTAMP,
  channel SYMBOL,
  signal_type SYMBOL,
  asset SYMBOL,
  buy_min DOUBLE,
  buy_max DOUBLE,
  target_1 DOUBLE,
  target_2 DOUBLE,
  target_final DOUBLE,
  stop DOUBLE,
  raw_message STRING,
  source SYMBOL,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;
```

## Soft deletion archive: `tp_capital_signals_deleted`

When the dashboard sends a DELETE request (`DELETE /signals` with `ingestedAt` in ISO format), the service:
1. Copies the matching row(s) into `tp_capital_signals_deleted`, appending `deleted_at TIMESTAMP`.
2. Rebuilds `tp_capital_signals` without the deleted rows using a temporary table swap (QuestDB pattern).

Columns mirror the primary table with the extra `deleted_at TIMESTAMP` column.

## Supporting reference tables

The service also relies on append-only tables to manage Telegram configuration. Create them alongside the signals table to enable CRUD from the dashboard.

### `telegram_bots`

Stores Telegram bot credentials and metadata surfaced on the Connections page.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `SYMBOL` | Generated (`bot-${timestamp}-${rand}`) primary key. |
| `username` | `SYMBOL` | Bot username (`@MyBot`). |
| `token` | `STRING` | Sensitive token (stored as plain text, restrict QuestDB access). |
| `bot_type` | `SYMBOL` | `Forwarder` or `Sender`. |
| `description` | `STRING` | Operator notes. |
| `status` | `SYMBOL` | `active`, `deleted`. |
| `created_at` | `TIMESTAMP` | Creation timestamp. |
| `updated_at` | `TIMESTAMP` | Last update timestamp. |

```sql
CREATE TABLE IF NOT EXISTS telegram_bots (
  id SYMBOL,
  username SYMBOL,
  token STRING,
  bot_type SYMBOL,
  description STRING,
  status SYMBOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) TIMESTAMP(updated_at) PARTITION BY DAY;
```

### `telegram_channels`

Tracks Telegram channels monitored by the ingestion service.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `SYMBOL` | Generated (`channel-${timestamp}-${rand}`) primary key. |
| `label` | `SYMBOL` | Friendly name (`TP CAPITAL | OPCOES`). |
| `channel_id` | `LONG` | Numeric Telegram channel ID. |
| `channel_type` | `SYMBOL` | `source` or `destination`. |
| `description` | `STRING` | Operational notes and filters. |
| `status` | `SYMBOL` | `active` / `deleted`. |
| `signal_count` | `LONG` | Counter maintained by backfills or ops scripts. |
| `last_signal` | `TIMESTAMP` | Latest signal timestamp for quick lookups. |
| `created_at` | `TIMESTAMP` | Creation timestamp. |
| `updated_at` | `TIMESTAMP` | Last update timestamp. |

```sql
CREATE TABLE IF NOT EXISTS telegram_channels (
  id SYMBOL,
  label SYMBOL,
  channel_id LONG,
  channel_type SYMBOL,
  description STRING,
  status SYMBOL,
  signal_count LONG,
  last_signal TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) TIMESTAMP(updated_at) PARTITION BY DAY;
```

## API integration

| Endpoint | Purpose | Consumer |
|----------|---------|----------|
| `GET /signals?limit=500&channel=&type=&search=` | Query recent signals from QuestDB. | Dashboard `TPCapitalOpcoesPage`. |
| `DELETE /signals` (body: `{ "ingestedAt": "2025-10-11T12:34:56.789Z" }`) | Soft delete and archive a signal. | Operations tooling (manual cleanup). |
| `GET /logs?limit=&level=` | Retrieve in-memory ingestion logs. | Dashboard logs section. |
| `GET /bots` | Summarise active ingestion bot configuration. | Dashboard Connections page status panel. |
| `GET /telegram/bots` | List bot records stored in QuestDB. | Dashboard bot CRUD table. |
| `POST /telegram/bots` | Create bot record. | Dashboard bot form. |
| `PUT /telegram/bots/:id` | Update bot record. | Dashboard bot form. |
| `DELETE /telegram/bots/:id` | Soft delete bot record. | Dashboard bot table. |
| `GET /telegram/channels` | List monitored channels. | Dashboard channel table. |
| `POST /telegram/channels` | Insert new channel. | Dashboard channel form. |
| `PUT /telegram/channels/:id` | Update channel metadata. | Dashboard channel form. |
| `DELETE /telegram/channels/:id` | Soft delete channel. | Dashboard channel table. |

> **Security note**: QuestDB currently stores bot tokens in clear text. Lock down QuestDB HTTP/PG connections and plan a follow-up task to encrypt or externalise secrets.

## Monitoring

- `/metrics` exposes Prometheus counters/summary metrics from the ingestion service (include in monitoring stack).
- `/health` checks QuestDB connectivity and should be polled by Ops.
- Use `questdbClient.healthcheck()` logs to alert when QuestDB becomes unreachable.

Update this document whenever the schema or API contract changes so frontend specs remain aligned with the live database structure.
