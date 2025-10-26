---
title: positions table
sidebar_position: 20
tags: [data, trading-core, backend, schema]
domain: backend
type: reference
summary: Table definition for open positions tracking
status: draft
last_review: "2025-10-17"
---

# positions table

| Column | Type | Description |
|--------|------|-------------|
| position_id | uuid | Primary key. |
| symbol | text | Asset identifier. |
| quantity | numeric | Current net position. |
| avg_price | numeric | Volume-weighted average price. |
| unrealized_pnl | numeric | Live mark-to-market. |
| updated_at | timestamptz | Timestamp of last update. |

Constraints:
- Enforce `symbol` + `strategy_id` uniqueness if multi-strategy.
- Keep `quantity` = 0 when position closed (row may remain for history).

Related tables: `trades`, `strategy_settings`, `risk_limits` (future).