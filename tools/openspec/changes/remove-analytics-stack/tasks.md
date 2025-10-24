---
title: Tasks
sidebar_position: 1
tags:
  - documentation
domain: ops
type: guide
summary: '-   1.1 Confirm no active product requirement depends on Analytics check
  PRDs/ADRs.'
status: active
last_review: '2025-10-23'
---

## 1. Planning & Validation
- [ ] 1.1 Confirm no active product requirement depends on Analytics (check PRDs/ADRs).
- [ ] 1.2 Execute repository-wide search for `analytics` to build removal checklist.
- [ ] 1.3 Draft/update spec deltas (dashboard + ops infra) and run `openspec validate remove-analytics-stack --strict`.

## 2. Frontend Cleanup (`frontend/dashboard`)
- [ ] 2.1 Remove Analytics pages/components under `src/components/pages/analytics/`.
- [ ] 2.2 Update `src/data/navigation.tsx`, stores, hooks, and services to drop Analytics references.
- [ ] 2.3 Prune analytics-specific assets/tests and adjust API config/env examples.
- [ ] 2.4 Run `npm run type-check && npm run build` to ensure dashboard compiles.

## 3. Backend & Infrastructure
- [ ] 3.1 Delete `backend/services/analytics-pipeline/` (code, Docker/Dockerfile, scripts, requirements).
- [ ] 3.2 Remove compose services, env vars, and monitoring artefacts referencing Analytics (`infrastructure/compose`, `scripts/`, `monitoring/`).
- [ ] 3.3 Update automation scripts (`start-all-services.sh`, `status.sh`, GitHub workflows) to reflect the smaller stack.
- [ ] 3.4 Validate infrastructure builds (compose lint, affected CI jobs, `npm run build` for docs if applicable).

## 4. Documentation & Specs
- [ ] 4.1 Update Docusaurus pages, onboarding docs, and diagrams to remove Analytics.
- [ ] 4.2 Adjust OpenSpec specs (`infrastructure/openspec/specs/...`) to match the new architecture.
- [ ] 4.3 Run `openspec validate remove-analytics-stack --strict` and fix any outstanding deltas.
- [ ] 4.4 Capture changelog/README updates summarizing the removal.

## 5. Verification & Archive
- [ ] 5.1 Execute repository CI pipeline locally (lint/tests/builds) to confirm clean state.
- [ ] 5.2 Ensure no `analytics` string remains in the repo except historical notes/archives.
- [ ] 5.3 Submit change for review and archive with `openspec archive remove-analytics-stack --root infrastructure/openspec` after merge/deploy.
