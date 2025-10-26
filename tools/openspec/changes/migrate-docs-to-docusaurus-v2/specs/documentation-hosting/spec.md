## MODIFIED Requirements

### Requirement: Documentation Directory Structure
The documentation system SHALL organize files separating the documentation engine from content files to enable independent management, backup, and potential migration of tools.

#### Scenario: Legacy Docusaurus Engine Files Location
- **GIVEN** the legacy documentation site is served from `/docs`
- **WHEN** a developer inspects the legacy Docusaurus workspace
- **THEN** all engine files (package.json, node_modules, docusaurus.config, sidebars, src/, static/, build/) SHALL remain in `/docs/docusaurus/`
- **AND** shared content (context/, architecture/, features/, README.md) SHALL stay in `/docs/`

#### Scenario: Docusaurus_v2 Workspace Layout
- **GIVEN** the upgraded documentation site is served from `docs/`
- **WHEN** a developer inspects the new workspace
- **THEN** all Docusaurus v2 engine files (package.json, docusaurus.config.js, sidebars.js, .markdownlint.json, .remarkrc.json, node_modules, src/, static/) SHALL reside directly under `/docs/`
- **AND** all authored content SHALL live under `/docs/content/` following the documented taxonomy
- **AND** automation outputs (generated pages, reports) SHALL be stored inside `/docs/` or `reports/` without modifying legacy directories

### Requirement: Service Integration Path Updates
The system's services and scripts that interact with documentation SHALL use updated paths pointing to the correct Docusaurus workspace for each site.

#### Scenario: Laucher Configuration
- **GIVEN** Laucher manages both legacy and new documentation services
- **WHEN** it starts the upgraded documentation hub
- **THEN** it SHALL execute `npm run docs:dev` (or configured start command) from the `/docs/` directory using Node 18+
- **AND** it SHALL retain the ability to start the legacy site from `/docs/docusaurus/` until decommissioned

#### Scenario: Infrastructure Scripts Execution
- **GIVEN** ops scripts (start-all-services.sh, status.sh, check-services.sh) manage documentation services
- **WHEN** these scripts start or check the upgraded documentation service
- **THEN** they SHALL operate within `/docs/` before invoking npm commands
- **AND** health checks SHALL verify accessibility on the agreed doc port (default 3004) without assuming legacy paths

### Requirement: Build Artifacts Isolation
The documentation build process SHALL create all build artifacts within the respective Docusaurus workspace to maintain clean separation.

#### Scenario: Build Output Location
- **GIVEN** `npm --prefix docs run docs:build` is executed
- **WHEN** the build completes successfully
- **THEN** all build artifacts SHALL be located in `/docs/build/`
- **AND** no artifacts SHALL be emitted to `/docs/` or other repository roots
- **AND** `.gitignore` SHALL exclude `/docs/build/` from version control

## ADDED Requirements

### Requirement: Documentation Automation Hub
The documentation platform SHALL centralize automation scripts for the upgraded site under `scripts/docusaurus/` to keep content synchronized.

#### Scenario: Automation Script Location
- **GIVEN** a developer needs to regenerate documentation assets (Redoc pages, ports table, MCP registry, tokens, PRD index)
- **WHEN** they inspect repository tooling
- **THEN** all automation entrypoints SHALL exist under `scripts/docusaurus/` (or subdirectories) and reference the `/docs/` workspace via relative paths
- **AND** executing `npm --prefix docs run docs:auto` SHALL orchestrate those scripts successfully

#### Scenario: CI Enforcement
- **GIVEN** the CI pipeline validates documentation
- **WHEN** `npm --prefix docs run docs:check` executes
- **THEN** it SHALL run linting, automation regeneration, and `docusaurus build` without accessing legacy directories
- **AND** the job SHALL fail if any automation output is stale or missing
