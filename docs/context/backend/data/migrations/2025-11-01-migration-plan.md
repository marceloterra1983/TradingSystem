---
title: 2025-11-01 Migration Plan
sidebar_position: 40
tags: [data, migration, backend, postgresql]
domain: backend
type: guide
summary: Migration plan for moving Idea Bank data to PostgreSQL and aligning QuestDB exports
status: draft
last_review: 2025-10-17
---

# 2025-11-01 Migration Plan

## Scope

- Move Idea Bank and Documentation data from LowDB to PostgreSQL/Timescale.
- Introduce Prisma ORM in both Node APIs.
- Keep QuestDB as the source of truth for TP Capital signals and expose nightly exports to PostgreSQL reporting tables.

## Timeline (tentative)

| Phase | Date | Notes |
|-------|------|-------|
| Planning | 2025-10-15 | Finalise schema + ADR; map QuestDB → PostgreSQL integration points. |
| Development | 2025-10-20 – 2025-10-31 | Build migrations, ETL scripts, Prisma integration, QuestDB export job. |
| Staging rehearsal | 2025-10-28 | Dry-run migration in staging; verify dashboard continues reading QuestDB. |
| Production rollout | 2025-11-01 | Execute checklist, monitor; backfill PostgreSQL reporting tables from QuestDB. |

## Rollback Plan

- Restore LowDB JSON backups.
- Disable PostgreSQL code paths via feature flag (return to LowDB).
- Validate Idea Bank API functionality.
- Remove QuestDB export job from scheduler if introduced.

## Owners

- Data Team: TBD
- Backend Team: TBD

> Update this file as the project progresses.
