---
title: Database Migration Checklist
sidebar_position: 20
tags: [data, migration, backend, checklist]
domain: backend
type: reference
summary: Pre/post steps to execute database migrations safely
status: active
last_review: 2025-10-17
---

# Database Migration Checklist

## Before deployment

- [ ] Review ADR and approved PRD/RFC.
- [ ] Confirm backups of LowDB/Parquet and configuration files.
- [ ] Validate migration scripts in staging (unit/integration tests).
- [ ] Communicate downtime or degraded service window (if any).

## During deployment

- [ ] Enable maintenance mode (if applicable).
- [ ] Run migration scripts (`prisma migrate deploy` / custom ETL).
- [ ] Monitor logs for errors.

## After deployment

- [ ] Run smoke tests (`GET /api/items`, CRUD flow).
- [ ] Verify data integrity (counts, sample rows).
- [ ] Update monitoring thresholds and alerts.
- [ ] Close maintenance mode and notify stakeholders.