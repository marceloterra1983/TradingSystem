## Why
- The repository has grown to 4.5 GB with many `node_modules` directories committed, inflating clone size and slowing all git operations.
- Large third-party tool directories (`external/Agent-MCP`, `infrastructure/firecrawl`) are vendored directly in-tree even though they track upstream projects, making updates brittle and complicating license management.
- History rewrite and submodule conversion require a dedicated change so the force-push and contributor reset steps can be coordinated safely.

## What Changes
- Convert `external/Agent-MCP` and `infrastructure/firecrawl` into git submodules pinned to their upstream commits, after archiving or documenting any local deltas.
- Excise committed `node_modules` and other bulky build artifacts from history using `git filter-repo`, then add guardrails (`.gitignore`, documentation) to keep them out.
- Draft an operations playbook covering the rewrite window, contributor reset instructions, and submodule initialization workflow (including CI cache invalidation).

## Impact
- Repository history shrinks dramatically (target ≈90% reduction), accelerating clone/fetch/push operations.
- External dependencies become explicit submodules, easing future updates while keeping local changes auditable.
- Requires tightly coordinated communication; developers must reset local branches, and CI credentials relying on commit hashes should be reviewed post-rewrite.
