---
title: Rollback Playbook
sidebar_position: 30
tags: [ops, rollback, deployment, runbook]
domain: ops
type: runbook
summary: Checklist for rolling back TradingSystem deployments safely
status: active
last_review: "2025-10-17"
---

# Rollback Playbook

1. Notify stakeholders and confirm downtime window.
2. Stop services (Data Capture, Order Manager, Node APIs).
3. Restore previous binaries/configuration from backup.
4. Restore data (LowDB, Parquet) if migration occurred.
5. Start services and run smoke tests (`/health`, Idea Bank CRUD).
6. Monitor metrics/logs and document incident.
