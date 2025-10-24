## ADDED Requirements

### Requirement: External Tools Managed as Submodules
All third-party tool directories that mirror upstream repositories MUST be tracked as git submodules to keep provenance explicit and updates auditable.

#### Scenario: Firecrawl And Agent-MCP Use Submodules
- **GIVEN** the repository includes the `external/Agent-MCP` and `infrastructure/firecrawl` tools
- **WHEN** contributors clone or update the repository
- **THEN** those directories are git submodules referencing documented upstream URLs and commit hashes
- **AND** onboarding docs instruct developers to run `git submodule update --init --recursive`.

### Requirement: Dependency Artifacts Removed From History
Large dependency directories (e.g., `node_modules`) MUST be expunged from git history and ignored going forward to keep the repository size manageable.

#### Scenario: Node Modules Purge
- **GIVEN** the repository previously tracked `node_modules` directories
- **WHEN** the cleanup change is merged
- **THEN** `git filter-repo` (or equivalent) has removed historical blobs for `node_modules`
- **AND** `.gitignore` rules exist to prevent them from being recommitted.

### Requirement: Migration Guidance Provided
Force-push operations and structural repository changes MUST ship with a migration bulletin that allows contributors and CI to realign safely.

#### Scenario: Contributor Reset Instructions Published
- **GIVEN** the history rewrite modifies commit SHAs
- **WHEN** the change is ready for merge
- **THEN** documentation includes the reset commands (`git fetch --all`, `git reset --hard origin/<branch>`, submodule init)
- **AND** CI pipeline owners are notified to invalidate caches tied to old SHAs.
