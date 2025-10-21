---
title: Data Retention Policy
sidebar_position: 30
tags: [data, retention, backend, policy]
domain: backend
type: reference
summary: Retention policy covering LowDB, QuestDB, Parquet, and logs
status: active
last_review: 2025-10-17
---

# Data Retention Policy

Define retention windows for each dataset:
- **LowDB JSON**: keep rolling 14 daily snapshots; archive monthly exports to cold storage.
- **QuestDB (tp_capital_signals)**: retain 30 days online; archive monthly CSV exports before deletion; keep `tp_capital_signals_deleted` for 90 days.
- **QuestDB (telegram tables)**: keep full history; prune records older than 365 days once PostgreSQL migration introduces configuration DB.
- **Parquet history**: keep N years of intraday data (minimum 2 years, subject to disk capacity).
- **Uploaded documentation files (`uploads/`)**: retain indefinitely until compliance policy is defined.
- **Logs**: maintain 30 days of structured logs (JSONL) and rotate daily.

Add regulator/compliance requirements when established.
