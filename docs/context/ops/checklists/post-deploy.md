---
title: Post-deployment Checklist
sidebar_position: 30
tags: [ops, deployment, checklist]
domain: ops
type: reference
summary: Smoke tests and checks after deployment
status: active
last_review: 2025-10-17
---

# Post-deployment Checklist

- [ ] Check service status (`sc query`, `/health` endpoints, dashboard).
- [ ] Run smoke tests (Idea Bank CRUD, Documentation file upload).
- [ ] Monitor logs for errors/warnings.
- [ ] Verify metrics in Prometheus/Grafana (when available).
- [ ] Notify stakeholders of completion and update release notes.