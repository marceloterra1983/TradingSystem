## ADDED Requirements

### Requirement: Docs Automation Coverage
The `docs:auto` workflow SHALL regenerate PRD indices and design token documentation alongside existing automations.

#### Scenario: Running docs:auto locally
- **GIVEN** a developer runs `npm run docs:auto` from the repository root
- **WHEN** the command completes
- **THEN** it SHALL execute `scripts/docs/prd-index.ts` and `scripts/docs/frontend-sync-tokens.ts` after the existing generators
- **AND** the command SHALL exit non-zero if either generator fails to update the target MDX file.

### Requirement: Scaffold Support for New Domains
The `docs:new` helper SHALL scaffold PRD and Frontend pages using the new templates.

#### Scenario: Creating a frontend guideline page
- **GIVEN** the command `npm run docs:new -- --type frontend --path frontend/guidelines/performance`
- **WHEN** it finishes
- **THEN** it SHALL materialize `docs/context/frontend/guidelines/performance.mdx` based on the frontend template
- **AND** the template SHALL pre-populate shared frontmatter fields and a section outline tailored to the guideline domain.

### Requirement: Governance & CI Enforcement
Repository governance SHALL ensure PRD and Frontend documentation stay in sync with code changes.

#### Scenario: Submitting a frontend pull request
- **GIVEN** a pull request touches `apps/**` or `frontend/**`
- **WHEN** the PR template renders
- **THEN** it SHALL prompt for “PRD Impact” and “Frontend Impact” notes
- **AND** CI pipelines SHALL fail if `npm run docs:auto` produces uncommitted changes or if required documentation updates are missing.
