---
title: Operational Checklists
sidebar_position: 1
tags: [ops, process, checklists, index]
domain: ops
type: index
summary: Entry point for checklists executed before, during, and after deployments
status: active
last_review: "2025-10-17"
---

# Operational Checklists

These checklists codify the minimum steps required to execute safe deploys and post-mortems.

| Checklist | When to run | Doc |
|-----------|-------------|-----|
| Linux / WSL workstation setup | After cloning the repo on a new Linux/WSL machine. | [linux-setup.md](linux-setup.md) |
| Pre-deploy | Before promoting a new build to production. | [pre-deploy.md](pre-deploy.md) |
| Post-deploy | Immediately after a rollout to confirm stability. | [post-deploy.md](post-deploy.md) |
| Incident review | Within 48h of a major incident to capture learnings and action items. | [incident-review.md](incident-review.md) |

## Maintenance Tips

- Keep checklists short and actionable; link to runbooks for deeper guidance.
- Update action owners whenever team responsibilities shift.
