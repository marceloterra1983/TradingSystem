---
title: Data Quality Runbook
sidebar_position: 20
tags: [data, quality, backend, runbook]
domain: backend
type: runbook
summary: Routine checks to ensure data integrity
status: active
last_review: "2025-10-17"
---

# Data Quality Runbook

## Weekly checks

- Validate required fields (`title`, `description`, `category`) in LowDB.
- Ensure enums (`priority`, `status`) are within allowed sets.
- Flag empty or malformed tags.
- Run `SELECT count(*) FROM tp_capital_signals WHERE ts > now() - 24h` to confirm QuestDB throughput.
- Spot-check `raw_message` formatting and ensure `buy_min`, `buy_max`, `target_final`, `stop` are numeric (NULL tolerated only when absent in source message).

## Monitoring

- Track idea counts and API response times (expose metrics via Prometheus).
- Alert when `ideas.json` exceeds configured thresholds (>1 MB suggests migration to SQL).
- Monitor `/metrics` from `tp-capital-signals` for ingestion latency and QuestDB write failures.
- Alert if `/signals?limit=1` returns zero rows for >10 minutes during market hours.

## Incident response

1. Identify corrupted entries from logs/report.
2. For QuestDB issues, move affected rows to `tp_capital_signals_deleted` via API and reseed from Telegram history.
3. Restore from latest backup if corruption is widespread.
4. Document findings and open follow-up tasks.
