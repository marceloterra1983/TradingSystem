## ADDED Requirements

### Requirement: Shared Tooling Hub
JavaScript/TypeScript services MUST consume linting, formatting, and TypeScript configuration from a centralized hub under `config/shared/` to avoid drift.

#### Scenario: Dashboard Extends Shared Config
- **GIVEN** the dashboard frontend relies on ESLint, Prettier, and TypeScript
- **WHEN** the refactor is applied
- **THEN** the dashboard configuration extends the shared presets in `config/shared/`
- **AND** linting/build commands succeed using the shared definitions without local overrides.

### Requirement: Machine-Readable Service Manifest
Operational scripts and CI workflows MUST source service metadata (path, port, start command) from a single manifest to prevent hard-coded duplication.

#### Scenario: Start Script Reads Manifest
- **GIVEN** `scripts/start-services.sh` previously embedded service paths/ports
- **WHEN** the manifest is introduced
- **THEN** the script reads service definitions from the manifest at runtime
- **AND** GitHub workflows reuse the same manifest or wrapper command to locate services.

### Requirement: Workspace-Compatible Commands
Repository tooling MUST expose npm workspace commands so contributors can install, build, test, and start all JavaScript/TypeScript projects from the root.

#### Scenario: Root Scripts Drive Services
- **GIVEN** multiple API and frontend packages exist
- **WHEN** a contributor runs `npm install` or `npm run dev` at the repository root
- **THEN** npm workspaces install shared dependencies once
- **AND** root-level scripts fan out to individual services using workspace-aware commands.
