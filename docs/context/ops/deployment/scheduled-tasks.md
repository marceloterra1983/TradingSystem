---
title: Scheduled Tasks
sidebar_position: 20
tags: [ops, automation, tasks, runbook]
domain: ops
type: runbook
summary: Documentation for scheduled tasks used in TradingSystem operations
status: active
last_review: "2025-10-17"
---

# Scheduled Tasks

## Startup automation

- Script: `tools/scripts/register-trading-system-dev-startup.ps1`.
- Registers task TradingSystem Dev Startup that calls `start-trading-system-dev.ps1` at logon.

## Backup automation (planned)

- Task to snapshot LowDB JSON and Parquet directories daily.
- Implement using PowerShell script + Task Scheduler.

## Maintenance window (planned)

- Task to put system into maintenance mode before deployments (notify stakeholders, stop services).