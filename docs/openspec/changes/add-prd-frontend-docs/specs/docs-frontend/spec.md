## ADDED Requirements

### Requirement: Frontend Content Structure
The documentation SHALL include a `frontend` domain with dedicated sections for design system, guidelines, and engineering practices.

#### Scenario: Navigating frontend documentation
- **GIVEN** the documentation sidebar
- **WHEN** a reader expands the Frontend category
- **THEN** it SHALL list overview, Design System, Guidelines, and Engineering groups
- **AND** each group SHALL reference the corresponding MDX files inside `docs/context/frontend/` (e.g., `design-system/tokens.mdx`, `guidelines/style-guide.mdx`, `engineering/conventions.mdx`).

### Requirement: Design Token Source of Truth
Design token documentation SHALL be generated from the canonical token JSON assets to prevent manual drift.

#### Scenario: Refreshing tokens documentation
- **GIVEN** token definitions stored in `frontend/tokens/*.json`
- **WHEN** `npm run docs:auto` executes
- **THEN** it SHALL invoke a generator that converts the JSON into tables within `docs/context/frontend/design-system/tokens.mdx`
- **AND** the resulting page SHALL note the source path and hash to help detect stale data.

### Requirement: Frontend Implementation Guidance
Frontend documentation SHALL surface engineering conventions and quality gates aligned with the TradingSystem frontend stack.

#### Scenario: Reviewing frontend engineering standards
- **GIVEN** `docs_v2/content/frontend/engineering/conventions.mdx`
- **WHEN** a contributor opens the document
- **THEN** it SHALL describe folder structure, import rules, shadcn/ui usage, Tailwind configuration, and testing expectations for the frontend codebase.
