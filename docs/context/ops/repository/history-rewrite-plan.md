---
title: Git History Rewrite Plan
sidebar_position: 30
tags:
  - repository
  - git
  - maintenance
  - ops
domain: ops
type: runbook
summary: Execution plan for purging dependency artifacts and updating submodules without disrupting contributors
status: active
last_review: "2025-10-17"
---

## Objectives

- Remove historical `node_modules` blobs to reduce repository size and clone time.
- Finalize submodule baseline for `tools/Agent-MCP` and `tools/firecrawl/firecrawl-source`.
- Provide clear instructions for contributors and CI after the force-push.

## Timeline

Use `tools/scripts/rewrite-history.sh` during the maintenance window to automate the filter-repo steps.


1. **T-3 days**: Announce maintenance window on internal channels. Share summary of upcoming changes and link to this runbook.
2. **T-1 day**: Freeze merges to `main`. Ensure open branches are rebased or paused.
3. **Maintenance Window**:
   - Run `git filter-repo --path node_modules --invert-paths` plus any additional patterns discovered during audit.
   - Verify repository size via `git count-objects -v`.
   - Update submodule pointers and confirm `git submodule status`.
   - Force-push `main` and re-tag release tags if required.
4. **T+0**: Publish migration bulletin (see below). Monitor CI runs and developer sync for 24 hours.

## Contributor Reset Commands

```bash
git fetch --all --prune
git reset --hard origin/main
git submodule sync --recursive
git submodule update --init --recursive
```

Developers with local work should create patches before running the reset commands.

## CI Actions

- Invalidate caches that key off commit SHAs (Node/npm caches, Docker layers).
- Regenerate lockfiles if automation pipelines rely on pre-filter history.
- Ensure workflows call `git submodule update --init --recursive` before builds.

## Verification Checklist

- [ ] `git count-objects -v` shows expected size reduction.
- [ ] `git log --stat` spot-check verifies no production source files removed inadvertently.
- [ ] `Agent-MCP.local.patch` archived; regenerate Firecrawl patch before rewrite.
- [ ] Monitoring scripts updated to point to the new health endpoints (Agent-MCP).

## Rollback Plan

- Maintain copy of pre-filter repository (`git clone --mirror` before rewrite).
- If critical issues arise, force-push original mirror back to `main` and communicate rollback immediately.
