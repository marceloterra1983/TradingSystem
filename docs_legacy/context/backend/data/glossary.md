---
title: Data Glossary
sidebar_position: 90
tags: [data, glossary, backend, terminology]
domain: backend
type: reference
summary: Terms specific to data architecture and storage
status: active
last_review: "2025-10-17"
---

# Data Glossary

| Term | Definition |
|------|------------|
| QuestDB | Column-oriented time-series database used to persist TP Capital Telegram signals with day partitions. |
| LowDB | JSON file store that backs Idea Bank and Documentation APIs during the MVP phase. |
| TimescaleDB | PostgreSQL extension for time-series workloads (candidate for market analytics warehouse). |
| Feature Store | (Legacy) conceito planejado para armazenar features de ML; atualmente não utilizado. |
| Parquet | Columnar file format used for market history storage. |
| TP-Capital Service | Node.js ingestion API that normalizes Telegram payloads and writes to QuestDB, exposing `/signals`, `/logs`, `/telegram/*` endpoints for the dashboard. |
