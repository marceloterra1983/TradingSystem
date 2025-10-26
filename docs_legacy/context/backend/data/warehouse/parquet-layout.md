---
title: Parquet Layout
sidebar_position: 20
tags: [data, warehouse, backend, parquet]
domain: backend
type: reference
summary: Structure of Parquet files used for market history
status: draft
last_review: "2025-10-17"
---

# Parquet Layout

- Directory pattern: `data/parquet/<symbol>/<YYYY>/<MM>/<DD>.parquet`.
- Suggested schema: `timestamp`, `symbol`, `bid`, `ask`, `last`, `volume`, `aggressor`, `spread`, `exchange`.
- Compression: Snappy (default) to balance size and speed.
- Partitioning: by symbol and date to optimise reads.

> Add diagrams or table definitions as the pipeline evolves.