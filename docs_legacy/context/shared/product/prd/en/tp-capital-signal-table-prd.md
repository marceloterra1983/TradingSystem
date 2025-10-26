---
title: PRD TP Capital Signal Table
sidebar_position: 70
tags: [telegram, questdb, data-pipeline, dashboard, prd]
domain: shared
type: prd
summary: Productize the end-to-end pipeline that receives TP Capital Telegram messages, normalizes them, stores records in QuestDB, and renders the TP CAPITAL | OPCOES table inside the Banco de Dados hub
status: active
last_review: "2025-10-17"
language: en
translated_from: ../pt/tp-capital-signal-table-prd.md
---

# PRD: TP Capital Signal Table

## Metadata

-   **Author:** Product & Platform
-   **Date:** 2025-10-10
-   **Status:** Active
-   **Priority:** P0
-   **Version:** 1.0.0

## Executive Summary

The TP Capital ingestion pipeline is in production. Telegram messages flow from the forwarder bot into the ingestion service, are normalised, and written to QuestDB (`tp_capital_signals` plus the `tp_capital_signals_deleted` archive). The TP-Capital API exposes REST endpoints consumed by the dashboard: `/signals` renders the `TP CAPITAL | OPCOES` table, `/logs` provides operator visibility, and `/telegram/*` powers CRUD for bots and channels. This PRD records the canonical requirements, success criteria, and maintenance guardrails for the feature.

## Problem Statement

Even after the initial launch we must ensure:

-   Signals remain lossless, timestamped, and queryable within seconds of arriving on Telegram.
-   The dashboard always reflects the latest state stored in QuestDB with fast refresh and intuitive filtering.
-   Telegram configuration (bots, channels, forwarders) lives in a single source of truth instead of spreadsheets or local JSON.
-   Operators can audit ingestion health, delete erroneous signals safely, and backfill when required.

## Goals & KPIs

-   **Freshness**: Persist compliant TP Capital messages in QuestDB within **&lt;2 seconds** of reception.
-   **UI latency**: Keep `TP CAPITAL | OPCOES` refresh under **1 second** for the latest 500 rows (React Query + QuestDB REST).
-   **Availability**: `/signals`, `/logs`, `/telegram/*` endpoints return 200 within **&lt;500 ms** P95 during market hours.
-   **Data quality**: Reject malformed payloads, guaranteeing key columns (`ts`, `channel`, `signal_type`, `asset`, `buy_min`, `buy_max`, `target_final`, `stop`) are non-null/typed. Optional targets may be null.
-   **Operations**: MTTR &lt;5 minutes for ingestion incidents; soft-delete workflow completes without manual QuestDB intervention.

## In Scope

-   Telegram forwarder + ingestion service (Telegraf) writing to QuestDB via HTTP `/exec`.
-   QuestDB schema design for `tp_capital_signals`, `tp_capital_signals_deleted`, `telegram_bots`, `telegram_channels`.
-   REST API hosted at port 4005 exposing `/signals`, `/logs`, `/telegram/bots`, `/telegram/channels`, `/bots`, `/metrics`, `/health`.
-   Dashboard integrations: Connections page CRUD + status, TP CAPITAL | OPCOES table & log viewer.
-   Observability (structured logs, Prometheus metrics) and retention automation (30-day rolling window).

## Out of Scope

-   Automated order execution triggered by TP Capital signals.
-   Historical analytics beyond 30-day retention (handled by downstream warehouse).
-   Multi-tenant support or segregation across different Telegram vendors.
-   Authentication/authorisation (to be addressed with broader platform security initiative).

## User Stories

-   **Analyst**: Filters signals by channel/type and exports data for quant research.
-   **Automation Agent**: Polls `/signals` for actionable events; depends on consistent schema.
-   **Operator**: Manages bot/channel credentials in the dashboard, receives inline feedback when ingestion fails.
-   **Support Engineer**: Checks `/logs` and `/metrics` to diagnose Telegram outages and perform soft deletes by `ingested_at`.

## Functional Requirements

### 1. Message Processing

-   Normalise payload `{timestamp, channel_name, operation_type, asset, buy_min, buy_max, target_1, target_2, target_final, stop, raw_message, source}`.
-   Default missing metadata to sensible fallbacks (`channel='Desconhecido'`, `signal_type='Swing Trade'`).
-   Reject malformed payloads with structured error logs; future backlog item to persist into `signals_errors`.

### 2. QuestDB Persistence

-   `tp_capital_signals` partitioned by day on `ts`.
-   Soft-delete workflow copies rows into `tp_capital_signals_deleted` with `deleted_at`.
-   Append-only tables `telegram_bots` and `telegram_channels` capture configuration history (status `active`/`deleted`).
-   Retention automation keeps 30 days of active signals and 90 days of deleted archive.

### 3. API Endpoints

| Endpoint             | Method | Description                                                                               |
| -------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `/signals`           | GET    | Returns recent signals with filters (`limit`, `channel`, `type`, `search`, `from`, `to`). |
| `/signals`           | DELETE | Soft delete by `ingestedAt` (ISO8601).                                                    |
| `/logs`              | GET    | Retrieve in-memory ingestion logs (`limit`, `level`).                                     |
| `/bots`              | GET    | Summarise active ingestion bot status (configured, mode, running).                        |
| `/telegram/bots`     | CRUD   | Manage QuestDB bot records (username, token, type, description).                          |
| `/telegram/channels` | CRUD   | Manage QuestDB channel records (label, channel_id, type, description, status).            |
| `/metrics`           | GET    | Prometheus metrics (requests, latency, errors).                                           |
| `/health`            | GET    | Health JSON `{ status, questdb }`.                                                        |

### 4. Dashboard Integration

-   Connections page uses React Query (10 s polling) to display and mutate QuestDB-backed bot/channel tables.
-   TP CAPITAL | OPCOES page uses React Query to fetch `/signals` (15 s polling) and `/logs` (30 s), with client-side search, filter, and manual refresh.
-   Layout persistency continues to rely on `CustomizablePageLayout`; data itself resides in QuestDB.

### 5. Operations

-   Provide PowerShell/Node seed scripts (`scripts/seed-sample-data.js`) to backfill data.
-   Backup procedure covers QuestDB data directory and ingestion `.env` files (see `backend/data/operations/backup-restore.md`).
-   Metrics exported via `/metrics`; integrate with Prometheus/Grafana for alerting on write failures or stale data.

## Data Model

### `tp_capital_signals`

| Column         | Type      | Description                                       |
| -------------- | --------- | ------------------------------------------------- |
| `ts`           | TIMESTAMP | Signal timestamp (designated).                    |
| `channel`      | SYMBOL    | Telegram channel label.                           |
| `signal_type`  | SYMBOL    | Operation type (`Swing Trade`, `Day Trade`, ...). |
| `asset`        | SYMBOL    | Underlying asset ticker.                          |
| `buy_min`      | DOUBLE    | Buy range lower bound.                            |
| `buy_max`      | DOUBLE    | Buy range upper bound.                            |
| `target_1`     | DOUBLE    | First target (nullable).                          |
| `target_2`     | DOUBLE    | Second target (nullable).                         |
| `target_final` | DOUBLE    | Final target (nullable).                          |
| `stop`         | DOUBLE    | Stop-loss level.                                  |
| `raw_message`  | STRING    | Raw Telegram message.                             |
| `source`       | SYMBOL    | Message origin (`forwarder`, etc.).               |
| `ingested_at`  | TIMESTAMP | Timestamp when persisted.                         |

### `tp_capital_signals_deleted`

-   Same columns as above plus `deleted_at TIMESTAMP`.

### `telegram_bots`

-   `id SYMBOL`, `username SYMBOL`, `token STRING`, `bot_type SYMBOL`, `description STRING`, `status SYMBOL`, `created_at TIMESTAMP`, `updated_at TIMESTAMP`.

### `telegram_channels`

-   `id SYMBOL`, `label SYMBOL`, `channel_id LONG`, `channel_type SYMBOL`, `description STRING`, `status SYMBOL`, `signal_count LONG`, `last_signal TIMESTAMP`, `created_at TIMESTAMP`, `updated_at TIMESTAMP`.

## Dashboard UX Requirements

-   Display latest 500 signals sorted by `ts` desc with filters for channel, type, search.
-   Show numeric fields formatted in `pt-BR` with two decimals.
-   Provide log table with level badges and collapsible JSON context.
-   `Connections` page must surface bot/channel counts, inline errors, and confirm destructive actions.
-   All user-facing copy in Portuguese; developer docs remain bilingual.

## Success Criteria

-   ✅ QuestDB populated with live TP Capital signals (verified by `/signals?limit=1`).
-   ✅ Dashboard renders data and updates within 1 second for standard queries.
-   ✅ CRUD operations for bots/channels reflected immediately (React Query refetch) and persisted to QuestDB.
-   ✅ Soft-delete API removes records, archives them, and UI handles removal gracefully.
-   ✅ Prometheus `/metrics` consumed by monitoring stack (alerts for QuestDB failures pending).

## Implementation Status (2025-10-11)

-   QuestDB schema created and automated retention pending scripting.
-   TP-Capital API deployed locally (port 4005) with health/metrics endpoints.
-   Dashboard pages (`Connections`, `TP CAPITAL | OPCOES`) consume production endpoints.
-   Backup/restore, data quality, retention runbooks updated in `backend/data/operations/`.
-   CSV export and audit logging remain backlog items.

## Risks & Mitigations

-   **QuestDB downtime**: Add alerting on `/health` failure; document manual restart/restore procedure.
-   **Secret storage**: Bot tokens currently stored in clear text; plan migration to secrets manager or encryption.
-   **Schema drift**: Enforce contract tests between ingestion service and frontend serialization.
-   **Telegram API limits**: Monitor rate limiting; add jitter/backoff to ingestion poller.

## Open Questions

1. Should we extend retention beyond 30 days (e.g., export to warehouse)?
2. Do we need CSV/Excel export directly from the dashboard or backend API?
3. How should we enforce RBAC for bot/channel CRUD operations?
4. Will we ingest additional Telegram vendors that require schema versioning?

## Appendix

-   **Sample Docker Compose**

    ```yaml
    version: "3.9"
    services:
        questdb:
            image: questdb/questdb:7.4
            ports: ["9000:9000", "8812:8812"]
            volumes: [questdb-data:/var/lib/questdb]

        tp-capital-signals:
            build: apps/tp-capital
            env_file: apps/tp-capital/.env
            ports: ["4005:4005"]
            depends_on: [questdb]
    volumes:
        questdb-data:
    ```

-   **Reference SQL**
    ```sql
    CREATE TABLE tp_capital_signals (
      ts TIMESTAMP,
      channel SYMBOL,
      signal_type SYMBOL,
      asset SYMBOL,
      buy_min DOUBLE,
      buy_max DOUBLE,
      target_1 DOUBLE,
      target_2 DOUBLE,
      target_final DOUBLE,
      stop DOUBLE,
      raw_message STRING,
      source SYMBOL,
      ingested_at TIMESTAMP
    ) TIMESTAMP(ts) PARTITION BY DAY;
    ```
-   **Prometheus Targets**
    -   `http://<host>:4005/metrics` (tp-capital-signals)
    -   `http://<host>:4005/health` (questdb status)

Maintain this PRD alongside the QuestDB schema and frontend specs to ensure end-to-end alignment as the feature evolves.
