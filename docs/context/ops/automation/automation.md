---
title: Automation Playbooks
sidebar_position: 1
tags: [ops, automation, index]
domain: ops
type: index
summary: Index of operational automation scripts and recurring jobs
status: active
last_review: 2025-10-17
---

# Automation Playbooks

The automation folder documents PowerShell jobs that keep the platform healthy without manual intervention.

| Script | Purpose | Doc |
|--------|---------|-----|
| Scheduled backup job | Rotate JSONL/Parquet artifacts to off-box storage. | [backup-job.md](backup-job.md) |
| Startup task | Bootstrap dependencies when the workstation boots (ProfitDLL, services, dashboards). | [startup-task.md](startup-task.md) |

## Next Steps

- Document ProfitDLL recovery scripts once the retry strategy is finalized.
- Link automation scripts to the relevant incident runbooks for quick escalation.
