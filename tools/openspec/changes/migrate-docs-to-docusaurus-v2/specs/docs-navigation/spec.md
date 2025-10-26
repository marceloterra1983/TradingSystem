## MODIFIED Requirements

### Requirement: Provide Primary Navigation Tabs
The Docusaurus navbar MUST expose primary entry points that surface high-value areas (Docs, APIs, Prompts, Ops) for quick access.

#### Scenario: Default navbar render
- **WHEN** the upgraded Docusaurus v2 site loads
- **THEN** the navbar SHALL display tabs for `Docs` (landing), `APIs` (Redoc hub), `Prompts`, and `Ops`
- **AND** each tab SHALL route to the corresponding overview page inside `/docs/` without relying on legacy slugs

### Requirement: Highlight OpenSpec Workflow
The documentation MUST destacar o fluxo OpenSpec na rota `/openspec` incluindo comandos rápidos e links para specs.

#### Scenario: Spec landing visit
- **WHEN** um usuário acessa `/openspec` na nova navegação
- **THEN** a página exibe uma seção de acesso rápido com os principais comandos (`list`, `list --specs`, `validate`, `archive`) e orientações de colaboração
- **AND** inclui links diretos para `tools/openspec/AGENTS.md`, specs relevantes, e a mudança `migrate-docs-to-docusaurus-v2`

## ADDED Requirements

### Requirement: Sidebar Taxonomy Alignment
The upgraded documentation site SHALL implement a sidebar taxonomy that mirrors the domain hierarchy defined for `docs`.

#### Scenario: Sidebar structure
- **GIVEN** the site renders any docs page within `/docs/content`
- **WHEN** the sidebar is displayed
- **THEN** it SHALL show top-level categories for **Apps**, **API**, **Agents**, **MCP**, **Prompts**, **Database**, **Tools**, **Frontend**, **PRD**, **SDD**, **Reference**, **Changelog**, and **FAQ**
- **AND** each category SHALL contain an `overview` page positioned first within its section

### Requirement: Cross-domain Related Links
Key documentation pages SHALL surface crosslinks between related domains using the shared `Related` component.

#### Scenario: Related content block
- **WHEN** a reader reaches the bottom of a high-value page (e.g., `apps/order-manager/overview`)
- **THEN** the page SHALL render the `Related` component listing links to associated API Redoc pages, SDD specs, PRDs, and Frontend guidelines
- **AND** each link SHALL resolve to a live page within `docs` or `/redoc/<service>`
