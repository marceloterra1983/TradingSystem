---
title: Pre-deployment Checklist
sidebar_position: 20
tags: [ops, deployment, checklist]
domain: ops
type: reference
summary: Validation steps before rolling out a new release
status: active
last_review: "2025-10-17"
---

# Pre-deployment Checklist

- [ ] Confirm build artifacts (dotnet publish, npm build, analytics packages).
- [ ] Ensure automated tests passed (unit/integration/end-to-end).
- [ ] Verify backups (LowDB JSON, Parquet, configs).
- [ ] Notify stakeholders about deployment window.
- [ ] Review monitoring dashboards and alert settings.
- [ ] Prepare rollback plan and responsible owners.