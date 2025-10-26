---
title: Data Warehouse Overview
sidebar_position: 1
tags: [backend, data, warehouse, index]
domain: backend
type: index
summary: Entry point for the warehouse layout, aggregation cadence, and retention policies
status: active
last_review: "2025-10-17"
---

# Data Warehouse Overview

The trading data warehouse consolida datasets derivados de ingestões (Data Capture, TP Capital, Web Scraper). Serve como referência para organização dos arquivos Parquet e regras de agregação intradiária.

## Key Documents

| Doc | What it covers |
|-----|----------------|
| [parquet-layout.md](parquet-layout.md) | Folder conventions, partition keys and naming rules for parquet assets. |
| [timeseries-aggregation.md](timeseries-aggregation.md) | Aggregation cadence (1m/5m/1h), derived metrics and downstream consumers. |

## Operational Responsibilities

- Align warehouse structure changes with migration plans tracked in `data/migrations/`.
- Mirror retention requirements with the policies described in `ops/monitoring/alerting-policy.md`.
- Update this overview when adding new aggregation layers or storage backends.
