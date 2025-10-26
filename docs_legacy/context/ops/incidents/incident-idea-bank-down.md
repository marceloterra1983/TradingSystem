---
title: Incident - Idea Bank API Down
sidebar_position: 20
tags: [ops, incident, runbook]
domain: ops
type: runbook
summary: Recovery steps when the Idea Bank API is unavailable
status: active
last_review: "2025-10-17"
---

# Incident: Idea Bank API Down

1. Check service status (`Get-Service TradingSystem-IdeaBank` or running process).
2. Review logs for recent errors (console output or log files).
3. Restart service (`npm start` or Windows service wrapper).
4. Validate `/health` endpoint and perform CRUD smoke test.
5. If database is corrupted, restore backup (see backend/data/operations/backup-restore.md).
6. Record timeline and open follow-up tasks.