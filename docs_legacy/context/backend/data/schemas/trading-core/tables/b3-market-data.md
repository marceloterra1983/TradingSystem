---
title: b3_market_data tables
sidebar_position: 30
tags: [data, questdb, trading-core, b3, backend]
domain: backend
type: reference
summary: Proposed QuestDB schema set for consolidated B3 market data ingested into TradingSystem
status: draft
last_review: "2025-10-17"
---

# B3 Tables (QuestDB)

The legacy B3 stack persisted JSON/CSV artefacts under `tools/b3/data/processed`. To integrate with TradingSystem we normalize the feeds into QuestDB append-only tables. This document captures the target schema definitions that Phase 2 of the integration plan will implement.

## `b3_snapshots`

Intraday snapshot capturing the latest DI, DDI and DOL adjustments plus high-level indicators.

| Column | Type | Notes |
|--------|------|-------|
| `ts` | `TIMESTAMP` | Designated timestamp (`timestamp` field from the JSON payload). |
| `coleta_data` | `DATE` | Date string `data_coleta` normalized to ISO. |
| `coleta_hora` | `STRING` | Original capture time (`hora_coleta`) for reference. |
| `instrument` | `SYMBOL` | Instrument label (e.g. `DI1`, `DDI`, `DOL`). |
| `contract_month` | `SYMBOL` | `vencimento` (e.g. `X25`). |
| `price_settlement` | `DOUBLE` | `preco_numerico`. |
| `price_settlement_prev` | `DOUBLE` | `preco_anterior_numerico`. |
| `status` | `SYMBOL` | Snapshot status (`sucesso`, `falha`). |
| `source` | `SYMBOL` | Source identifier (`B3`, `Manual`). |
| `ingested_at` | `TIMESTAMP` | Server ingest time. |

```sql
CREATE TABLE IF NOT EXISTS b3_snapshots (
  ts TIMESTAMP,
  coleta_data DATE,
  coleta_hora STRING,
  instrument SYMBOL,
  contract_month SYMBOL,
  price_settlement DOUBLE,
  price_settlement_prev DOUBLE,
  status SYMBOL,
  source SYMBOL,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;
```

## `b3_indicators`

Key financial indicators extracted from the `indicadores_financeiros` block.

| Column | Type | Notes |
|--------|------|-------|
| `ts` | `TIMESTAMP` | Snapshot timestamp (same as parent snapshot). |
| `name` | `SYMBOL` | Indicator label (`TAXA SELIC - (a.a.)`, `DIF OPER CASADA - COMPRA`, etc.). |
| `value` | `DOUBLE` | Parsed numeric value. |
| `display_value` | `STRING` | Original string with locale formatting. |
| `updated_at` | `DATE` | `data_atualizacao` parsed to ISO date. |
| `ingested_at` | `TIMESTAMP` | Server ingest time. |

```sql
CREATE TABLE IF NOT EXISTS b3_indicators (
  ts TIMESTAMP,
  name SYMBOL,
  value DOUBLE,
  display_value STRING,
  updated_at DATE,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;
```

## `b3_vol_surface`

Surface data under `superficie_volatilidade`.

| Column | Type | Notes |
|--------|------|-------|
| `ts` | `TIMESTAMP` | Snapshot timestamp. |
| `contract_month` | `SYMBOL` | `mes` (e.g. `nov-25`). |
| `delta_bucket` | `SYMBOL` | `delta_1`, `delta_5`, etc. |
| `volatility` | `DOUBLE` | Numeric value for the delta bucket. |
| `updated_at` | `DATE` | Derived from `data_atualizacao`. |
| `ingested_at` | `TIMESTAMP` | Server ingest time. |

```sql
CREATE TABLE IF NOT EXISTS b3_vol_surface (
  ts TIMESTAMP,
  contract_month SYMBOL,
  delta_bucket SYMBOL,
  volatility DOUBLE,
  updated_at DATE,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY MONTH;
```

## `b3_gamma_levels`

GammaLevels snapshot mirrored in QuestDB for historical analysis.

| Column | Type | Notes |
|--------|------|-------|
| `ts` | `TIMESTAMP` | GammaLevels timestamp (`gammalevels.timestamp`). |
| `instrument` | `SYMBOL` | Instrument key (e.g. `ES_SP500`, `VIX`). |
| `call_wall` | `DOUBLE` | Parsed numeric value when available. |
| `put_wall` | `DOUBLE` | Parsed numeric value or `NULL` when `N/A`. |
| `gamma_flip` | `DOUBLE` | Optional Gamma Flip threshold (only for some instruments). |
| `raw_payload` | `STRING` | JSON fragment stored for audit. |
| `status` | `SYMBOL` | `sucesso`, `falha`, etc. |
| `ingested_at` | `TIMESTAMP` | Server ingest time. |

```sql
CREATE TABLE IF NOT EXISTS b3_gamma_levels (
  ts TIMESTAMP,
  instrument SYMBOL,
  call_wall DOUBLE,
  put_wall DOUBLE,
  gamma_flip DOUBLE,
  raw_payload STRING,
  status SYMBOL,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;
```

## `b3_adjustments`

Migrated from `ajustes_b3.csv`. Each row captures DI1/DDI/DOL settlements at a given `data/hora`.

| Column | Type | Notes |
|--------|------|-------|
| `ts` | `TIMESTAMP` | Combined `data` + `hora` converted to UTC. |
| `instrument` | `SYMBOL` | `ddi`, `di1`, `dol` normalized to upper-case. |
| `contract_month` | `SYMBOL` | Column `${instrument}_vencimento`. |
| `price_settlement` | `DOUBLE` | `${instrument}_preco_numerico`. |
| `price_prev` | `DOUBLE` | `${instrument}_preco_anterior_numerico`. |
| `status` | `SYMBOL` | Row status (`migrado`, `ajustado`). |
| `ingested_at` | `TIMESTAMP` | Migration timestamp. |

Partition by month due to low daily row counts.

```sql
CREATE TABLE IF NOT EXISTS b3_adjustments (
  ts TIMESTAMP,
  instrument SYMBOL,
  contract_month SYMBOL,
  price_settlement DOUBLE,
  price_prev DOUBLE,
  status SYMBOL,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY MONTH;
```

## `b3_indicators_daily`

Historical indicator series taken from `indicadores_b3.csv`.

| Column | Type | Notes |
|--------|------|-------|
| `ts` | `TIMESTAMP` | Derived from `data` + `hora`. |
| `indicator` | `SYMBOL` | Column header (normalized). |
| `value` | `DOUBLE` | Numeric value for the indicator. |
| `ingested_at` | `TIMESTAMP` | Migration timestamp. |

## `b3_dxy_ticks`

Normalized DXY points from `dxy_coleta.csv`.

| Column | Type | Notes |
|--------|------|-------|
| `ts` | `TIMESTAMP` | Combined date/time. |
| `bucket` | `SYMBOL` | `dxy_8h50`, `dxy_8h55`, etc. |
| `value` | `DOUBLE` | Numeric delta (percentage). |
| `ingested_at` | `TIMESTAMP` | Ingestion timestamp. |

## Next Steps

- Validate column naming against downstream analytics and the new dashboard requirements.
- Produce migration scripts that upsert CSV/JSON data into these tables (`ops` checklist to follow).
- Decide retention policies (likely 180 days for intraday snapshots, 730 days for daily aggregates).
- Implement read models / REST endpoints in the integrated backend to replace `json_server.py`.
- Initial automation lives in `tools/b3/sql/schema.sql` (DDL), `tools/b3/scripts/migrate_to_questdb.py` (CSV/JSON importer) and the runtime ingestor at `tools/b3/app/core/questdb_ingest.py` invoked from the scheduler.
