---
title: Backup and Restore Procedures
sidebar_position: 10
tags: [data, backup, backend, runbook]
domain: backend
type: runbook
summary: Backup and recovery steps for LowDB, QuestDB, and Parquet assets
status: active
last_review: "2025-10-17"
---

# Backup and Restore Procedures

## Backup

- **LowDB**: copy `db/ideas.json` and `db/db.json` using scheduled PowerShell scripts.
- **QuestDB**: run `questdb-export.ps1` (see infrastructure repo) or stop the `tp-capital-signals` service and zip `%QUESTDB_ROOT%/db/` to capture `tp_capital_signals*`, `telegram_bots`, `telegram_channels`.
- **Parquet**: replicate `data/parquet/` to secondary storage (e.g., `robocopy /MIR`).
- **Configuration**: store `.env` files and secrets securely alongside backups.

## Restore

1. Stop services (`Idea Bank API`, `Documentation API`).
2. Stop `tp-capital-signals` ingestion API (ensures QuestDB writes are quiesced).
3. Restore JSON files and QuestDB data directory from backup snapshot.
4. Start services:
   - `tp-capital-signals` (`npm start`) and wait for `/health` = `{ questdb: true }`.
   - `Idea Bank API`, `Documentation API`.
5. Validate data:
   - `GET /signals?limit=5` returns recent rows.
   - `GET /telegram/bots` and `GET /telegram/channels` match expected config.
   - Idea/Documentation APIs list entries correctly.
