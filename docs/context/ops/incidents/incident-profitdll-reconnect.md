---
title: Incident - ProfitDLL Reconnect
sidebar_position: 40
tags: [ops, incident, runbook, profitdll]
domain: ops
type: runbook
summary: Runbook for reconnecting ProfitDLL when the data capture service loses the link
status: active
last_review: 2025-10-17
---

# Incident: ProfitDLL Reconnect

1. Verify ProfitDLL status (ProfitChart UI / Event Viewer).
2. Restart Data Capture service:
   ```powershell
   sc.exe stop TradingSystem-DataCapture
   sc.exe start TradingSystem-DataCapture
   ```
3. If DLL still fails, restart ProfitChart and re-authenticate.
4. Confirm ticks flowing (logs, monitoring).
5. Document incident and schedule postmortem using `ops/checklists/incident-review.md`.