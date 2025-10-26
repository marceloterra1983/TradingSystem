---
title: Repository Cleanup Prep Notes
sidebar_position: 40
tags:
  - repository
  - maintenance
  - submodules
  - ops
domain: ops
type: reference
summary: Captures prerequisites for history cleanup and submodule conversion, including local deltas and upstream references
status: active
last_review: "2025-10-17"
---

## Agent-MCP Local Delta

- Upstream: `https://github.com/rinadelph/Agent-MCP.git`
- Current HEAD: `13d98b2c9e770a97a77521e605e7e41db024852d`
- Local changes captured in `Agent-MCP.local.patch`
  - Adds health-check routes, environment loading safeguards, and documentation notes.
  - Introduces helper docs (`HEALTH-CHECK-IMPLEMENTATION.md`, `SETUP.md`) and backup `.env` file.
- Repository state: branch `main` with uncommitted modifications (`.env.example`, `README.md`, multiple Python modules) and untracked files.

## Firecrawl Local Delta

- Upstream: `https://github.com/mendableai/firecrawl.git`
- Current HEAD: `fb3aa8374aa0a4f1225bcb7bfc3e4f22cdd4cca3` (cloned via submodule; previously local fork was 7b91737953148563a67e8f29d015af5d7f7295c9)
- Local changes previously diverged from upstream (internal deployment flow removed several Dockerfiles, tweaked API integration utilities, and adjusted the root Compose definition).
- Action item: recreate `firecrawl.local.patch` from the archived fork before finalizing the rewrite.
- Repository state: branch `main` with tracked modifications (`README.md`, `apps/api/src/utils/integration.ts`, `docker-compose.yaml`, others deleted).

## Node Modules Inventory

- `find . -type d -name node_modules | wc -l` → 275 directories present.
- `git ls-files | grep 'node_modules/'` → no tracked files (current index clean), history still needs purge via `git filter-repo`.

## Next Steps Checklist

- Back up local deltas (Agent-MCP ✅ via `Agent-MCP.local.patch`; firecrawl patch pending recreation).
- Confirm whether untracked helper docs should move into primary repository documentation prior to conversion.
- Schedule repository maintenance window and communicate contributor reset commands ahead of the history rewrite.

## Tooling

- Script: `tools/scripts/rewrite-history.sh` automates the filter-repo process (see history rewrite plan).
