---
title: trades table
sidebar_position: 10
tags: [data, trading-core, backend, schema]
domain: backend
type: reference
summary: Table definition for executed trades (future PostgreSQL schema)
status: draft
last_review: "2025-10-17"
---

# trades table

| Column | Type | Description |
|--------|------|-------------|
| trade_id | uuid | Primary key. |
| symbol | text | Asset identifier. |
| side | text | buy/sell enum. |
| quantity | numeric | Executed quantity. |
| price | numeric | Execution price. |
| executed_at | timestamptz | Execution timestamp. |
| strategy_id | uuid | Optional strategy reference. |

Indexes to consider:
- `trade_id` primary key.
- `(symbol, executed_at)` for timeline queries.
- `(strategy_id, executed_at)` for analytics.

Constraints:
- `side` enum (`BUY`, `SELL`).
- `quantity > 0`. 