---
title: Trading Core Tables Overview
sidebar_position: 1
tags: [backend, data, tables, index]
domain: backend
type: index
summary: Quick map of documented tables under the trading-core schema
status: active
last_review: 2025-10-17
---

# Trading Core Tables Overview

Use this index to jump to the detailed table specifications maintained in this folder.

| Table | Purpose | Reference |
|-------|---------|-----------|
| `trading_core.positions` | Snapshot of intraday and end-of-day positions used by the risk engine. | [positions.md](positions.md) |
| `trading_core.trades` | Execution feed enriched with strategy metadata and latency metrics. | [trades.md](trades.md) |
| `tp_capital_signals` | QuestDB time-series table storing normalized TP Capital Telegram signals. | [tp-capital-signals.md](tp-capital-signals.md) |
| `b3_*` tables | Proposed QuestDB schema set consolidating B3 snapshots, adjustments, indicators and GammaLevels. | [b3-market-data.md](b3-market-data.md) |

## Maintenance Notes

- Keep column lists in the individual docs sorted alphabetically to ease diffs.
- When adding a new table document, update this index and add the table to ETL ownership runbooks in `ops/automation/`.
- Review `last_review` dates whenever schemas change in migrations.
