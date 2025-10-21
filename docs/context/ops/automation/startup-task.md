---
title: Automation - Startup Task
sidebar_position: 10
tags: [ops, automation, runbook]
domain: ops
type: runbook
summary: Details for the login startup automation script
status: active
last_review: 2025-10-17
---

# Automation - Startup Task

- Script: `infrastructure/scripts/register-trading-system-dev-startup.ps1`.
- Registers scheduled task TradingSystem Dev Startup (requires admin).
- On logon, launches `start-trading-system-dev.ps1` which spins Idea Bank, Documentation API, and Dashboard with dependency auto-install.
- Use `-Remove` flag to unregister.