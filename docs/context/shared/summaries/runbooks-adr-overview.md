---
title: Runbooks & ADR Overview
sidebar_position: 40
tags: [runbooks, adr, docs, shared]
domain: shared
type: reference
summary: Landing page with quick links to operational runbooks and Architecture Decision Records (ADR)
status: active
last_review: 2025-10-17
slug: /runbooks-adr-overview
---

# Runbooks & ADR Overview

Use this page as a hub for operational playbooks and architecture documentation.

## Runbooks (Operations)
- [Pre-Deploy Checklist](../../ops/checklists/pre-deploy.md) — validation steps before shipping a release.
- [Post-Deploy Checklist](../../ops/checklists/post-deploy.md) — verification and communications after deployment.
- [Prometheus Setup](../../ops/monitoring/prometheus-setup.md) — how to bootstrap and maintain the monitoring stack.
- [Linux Setup Checklist](../../ops/checklists/linux-setup.md) — baseline configuration for Linux environments.
- [Rollback Playbook](../../ops/deployment/rollback-playbook.md) — quick response steps for regressions.

> See `docs/context/shared/runbooks/` for the full runbook catalog.

## Architecture Decision Records (ADRs)
- [Frontend ADR Index](../../frontend/architecture/decisions/README.md) — recent UI decisions (Zustand, shadcn/ui, etc.).
- [Backend ADRs](../../backend/architecture/decisions/README.md) — collection of backend architecture decisions.
- Ops ADRs *(coming soon).* 

> New ADRs should follow the template in `docs/context/shared/tools/templates/template-adr.md`.

## Maintenance
1. Add new runbooks or ADRs to this page whenever they are published.
2. Update the `last_review` field after every revision.
3. Provide a one-line summary so incident responders can triage faster.
