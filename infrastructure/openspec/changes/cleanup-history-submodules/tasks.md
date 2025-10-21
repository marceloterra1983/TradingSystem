## 1. Verify Current State
- [ ] Diff `external/Agent-MCP` and `infrastructure/firecrawl` against their upstream repositories; archive or document any local-only changes before conversion.
- [ ] Enumerate tracked `node_modules` (and similar build artifacts) to confirm the cleanup target list and avoid accidental removals.

## 2. Submodule Conversion
- [ ] Record upstream repository URLs and commit hashes for `Agent-MCP` and `firecrawl`, then replace in-tree copies with submodules pinned to those commits.
- [ ] Update scripts/onboarding docs to include `git submodule update --init --recursive` and note any service-specific bootstrap steps.

## 3. History Rewrite
- [ ] Run `git filter-repo` (or equivalent) to purge `node_modules`/artifacts from history; verify the new repository size locally and ensure tags/branches remain intact.
- [ ] Prepare a migration bulletin covering the force-push window, contributor reset commands, CI cache invalidation, and how to re-initialize submodules.
- [ ] Dry-run CI pipelines against the rewritten history to ensure no jobs rely on removed artifacts or outdated paths.
