# Documentation Hosting Specification

## MODIFIED Requirements

### Requirement: Documentation Directory Structure

The documentation system SHALL organize files separating the documentation engine from content files to enable independent management, backup, and potential migration of tools.

#### Scenario: Docusaurus Engine Files Location

- **GIVEN** the project has Docusaurus installed as documentation engine
- **WHEN** a developer navigates to the documentation root at `/docs`
- **THEN** all Docusaurus-specific files (package.json, node_modules, docusaurus.config.ts, sidebars.ts, tsconfig.json, src/, static/, build/) SHALL be located in `/docs/docusaurus/` subdirectory
- **AND** documentation content files (context/, architecture/, features/, README.md, etc.) SHALL remain at `/docs/` root level

#### Scenario: Documentation Content Accessibility

- **GIVEN** Docusaurus engine is located at `/docs/docusaurus/`
- **WHEN** Docusaurus builds or serves documentation
- **THEN** it SHALL access content files from parent directory using relative paths (e.g., `../context/`)
- **AND** all content SHALL render correctly without requiring file duplication

#### Scenario: Backward Compatibility for Port and URLs

- **GIVEN** Docusaurus has been relocated to `/docs/docusaurus/`
- **WHEN** documentation server is started
- **THEN** it SHALL continue to serve on port 3004
- **AND** all existing URLs SHALL remain accessible without changes
- **AND** external services SHALL continue to access documentation without modification

### Requirement: NPM Commands Path Update

The documentation system SHALL require updated working directory paths for all npm commands to reflect the new Docusaurus location.

#### Scenario: Starting Documentation Server

- **GIVEN** a developer wants to start the documentation server
- **WHEN** they execute the start command
- **THEN** they SHALL use `cd docs/docusaurus && npm run start -- --port 3004` instead of `cd docs && npm run start -- --port 3004`
- **AND** the server SHALL start successfully on port 3004

#### Scenario: Building Documentation

- **GIVEN** a developer or CI/CD pipeline wants to build documentation
- **WHEN** they execute the build command  
- **THEN** they SHALL use `cd docs/docusaurus && npm run build` instead of `cd docs && npm run build`
- **AND** build artifacts SHALL be created in `/docs/docusaurus/build/`

#### Scenario: Installing Dependencies

- **GIVEN** a developer needs to install documentation dependencies
- **WHEN** they execute npm install
- **THEN** they SHALL navigate to `cd docs/docusaurus` before running `npm install`
- **AND** node_modules SHALL be created at `/docs/docusaurus/node_modules/`

### Requirement: Service Integration Path Updates

The system's services and scripts that interact with documentation SHALL use updated paths pointing to `/docs/docusaurus/` for Docusaurus operations.

#### Scenario: Laucher Configuration

- **GIVEN** Laucher manages the Documentation Hub service
- **WHEN** Laucher attempts to start the documentation service
- **THEN** it SHALL use `/docs/docusaurus/` as the working directory path
- **AND** it SHALL execute `npm run start -- --port 3004` in that directory
- **AND** the service SHALL start successfully

#### Scenario: Infrastructure Scripts Execution

- **GIVEN** infrastructure scripts (start-all-services.sh, status.sh, check-services.sh) manage documentation service
- **WHEN** these scripts start or check documentation service
- **THEN** they SHALL navigate to `/docs/docusaurus/` before executing npm commands
- **AND** health checks SHALL verify documentation is accessible on port 3004

#### Scenario: Dashboard Documentation Links

- **GIVEN** Dashboard components (DocsPage, EscopoPage) provide documentation guidance
- **WHEN** displaying instructions for starting documentation locally
- **THEN** they SHALL show updated command `cd docs/docusaurus && npm run start -- --port 3004`
- **AND** documentation URLs SHALL continue to point to `http://localhost:3004`

## ADDED Requirements

### Requirement: Documentation Content Independence

The documentation content SHALL be organized independently from the documentation rendering tool to facilitate backup, migration, and tool replacement.

#### Scenario: Selective Backup of Content

- **GIVEN** administrator wants to backup documentation content only
- **WHEN** they create a backup excluding tool-specific files
- **THEN** they SHALL be able to backup `/docs/context/`, `/docs/architecture/`, `/docs/features/`, `/docs/README.md` without including `/docs/docusaurus/`
- **AND** backed up content SHALL be portable to any documentation rendering tool

#### Scenario: Documentation Tool Migration

- **GIVEN** team decides to migrate from Docusaurus to another documentation tool (e.g., MkDocs, Vitepress)
- **WHEN** migration is performed
- **THEN** only files in `/docs/docusaurus/` SHALL need to be replaced
- **AND** content files in `/docs/context/`, `/docs/architecture/`, etc. SHALL remain unchanged
- **AND** minimal path updates SHALL be required

### Requirement: Build Artifacts Isolation

The documentation build process SHALL create all build artifacts within the Docusaurus directory to maintain clean separation.

#### Scenario: Build Output Location

- **GIVEN** documentation is built using `npm run build`
- **WHEN** build completes successfully
- **THEN** all build artifacts SHALL be located in `/docs/docusaurus/build/`
- **AND** no build artifacts SHALL be created in `/docs/` root
- **AND** `.gitignore` SHALL exclude `/docs/docusaurus/build/` from version control

#### Scenario: Development Server Artifacts

- **GIVEN** development server is running
- **WHEN** Docusaurus generates temporary files or caches
- **THEN** all temporary files SHALL be contained within `/docs/docusaurus/` directory
- **AND** no temporary files SHALL pollute content directories

