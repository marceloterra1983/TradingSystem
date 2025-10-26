---
title: Deployment Playbook Overview
sidebar_position: 1
tags: [ops, deployment, overview, index]
domain: ops
type: index
summary: High-level guidance for deploying and rolling back the TradingSystem platform
status: active
last_review: "2025-10-17"
---

# Deployment Playbook Overview

The TradingSystem platform now supports both Windows-native and Linux/WSL workstations. Use this overview to pick the right runbook for your scenario.

| Doc | Scenario |
|-----|----------|
| [../linux-migration-guide.md](../linux-migration-guide.md) | End-to-end migration from Windows to Linux/WSL, including workstation bootstrap scripts. |
| [windows-native.md](windows-native.md) | Full deployment of core services as Windows Services (required for ProfitDLL). |
| [scheduled-tasks.md](scheduled-tasks.md) | Coordinating scheduled maintenance tasks so they do not clash with trading hours. |
| [rollback-playbook.md](rollback-playbook.md) | Fast rollback procedure when a release degrades latency, accuracy, or stability. |

## Preparation Checklist

- Confirm latest binaries and Python wheels are published before scheduling downtime.
- Align with the risk team on trading lockdown windows pre- and post-deploy.
- Review monitoring alerts (`ops/monitoring/`) to ensure signal coverage for new components.
