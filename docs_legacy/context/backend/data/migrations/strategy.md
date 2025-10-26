---
title: Database Migration Strategy
sidebar_position: 10
tags: [data, migration, backend, strategy]
domain: backend
type: guide
summary: Strategy for evolving data stores (LowDB to PostgreSQL) and recording changes
status: active
last_review: "2025-10-17"
---

# Database Migration Strategy

## Current state

- LowDB covers the MVP for Idea Bank / Documentation (single-user, < 500 records).
- TP-Capital run on QuestDB with append-only tables for `tp_capital_signals`, `tp_capital_signals_deleted`, `telegram_bots`, and `telegram_channels`.
- No concurrency or transaction guarantees for LowDB (risk increases as more users join).

## Target strategy

1. **Planning**
   - Define the relational schema (see `schemas/overview.md`).
   - Write an ADR comparing TimescaleDB vs. vanilla PostgreSQL for Idea Bank / Documentation (QuestDB already selected for TP Capital ingestion).
   - Produce PRD/RFC describing migration scope.
2. **Infrastructure**
   - Provision PostgreSQL 14+ (Windows or dedicated server).
   - Configure secure access (SSL, credentials, backups).
3. **Data migration**
   - ETL script: read LowDB JSON files -> insert into SQL tables.
   - Produce audit logs and backups before/after.
4. **Applications**
   - Update Idea Bank / Documentation APIs to use an ORM (Prisma/Knex) or native drivers.
   - Implement versioned migrations (Prisma Migrate, Flyway, etc.).
5. **QuestDB alignment**
   - Formalise retention automation (30-day rolling window) and export pipeline feeding the analytics warehouse.
   - Document cross-database joins (QuestDB → PostgreSQL exports) required by the dashboard.
6. **Testing and validation**
   - Unit/integration tests covering CRUD and validation rules.
   - Load/concurrency testing.
7. **Deployment**
   - Roll out in stages with feature flag fallback to LowDB while validating.

## Migration log

| Date | Change | Rollback | Owner |
|------|--------|----------|-------|
| -- | -- | -- | -- |

> For every relevant migration, create a detailed file (example: `2025-11-01-migrate-idea-bank-to-postgres.md`).
