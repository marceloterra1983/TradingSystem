## ADDED Requirements

### Requirement: PRD Content Structure
The documentation site SHALL expose a dedicated `prd` content area with curated navigation for product requirements.

#### Scenario: Browsing PRD landing page
- **GIVEN** the docs workspace `docs/context/`
- **WHEN** a contributor inspects the filesystem
- **THEN** they SHALL find a `prd/` directory containing `_category_.json`, `overview.mdx`, `templates/`, `products/`, and `archive/`
- **AND** the sidebar configuration SHALL surface the PRD category with an overview entry, product subsections, and an archive link.

### Requirement: PRD Templates
Product teams SHALL author new PRDs using standardized MDX templates that enforce the shared frontmatter contract.

#### Scenario: Scaffolding a PRD feature document
- **GIVEN** the command `npm run docs:new -- --type prd --path prd/products/trading-app/feature-order-manager`
- **WHEN** the script succeeds
- **THEN** it SHALL create `docs/context/prd/products/trading-app/feature-order-manager.mdx`
- **AND** the file SHALL include frontmatter fields `id`, `title`, `description`, `tags`, and `last_update`
- **AND** the body SHALL follow the PRD sections (Summary, Goals, Non-Goals, Background, User Stories, Acceptance Criteria, Dependencies, UX/UI References, Metrics, Open Questions).

### Requirement: PRD Crosslinks
PRD content SHALL link to adjacent specifications so downstream teams can trace requirements.

#### Scenario: Linking PRD dependencies
- **GIVEN** a PRD feature page produced by the template
- **WHEN** the Dependencies section renders
- **THEN** it SHALL include placeholders or live links to system design docs (`/sdd/...`), API references (`/redoc/<id>`), and relevant frontend components (`/frontend/...`).
