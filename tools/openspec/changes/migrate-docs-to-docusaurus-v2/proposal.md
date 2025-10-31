## Change Proposal — migrate-docs-to-docusaurus-v2

### Why
- Legacy `docs/` tree mixes engine assets and content, making automation, backups, and migrations difficult.
- OpenSpec specs (`documentation-hosting`, `docs-navigation`) require a structured documentation platform that surfaces API and workflow information consistently.
- Docusaurus v2 features (Redoc integration, local search, diagram support) unlock richer documentation but are not available in the current setup.
- Teams need automated synchronization (tokens, ports, MCP registry) and governance tooling to keep documentation current.

### What Changes
- Introduce a dedicated `docs/` Docusaurus workspace with strict content taxonomy and automation hooks.
- Centralize documentation scripts under `scripts/docs/**`, adding generators for Redoc summaries, design tokens, MCP registry, PRD index, stale report, and link checking.
- Scaffold comprehensive content structure (Apps, API, Agents, MCP, Prompts, Database, Tools, Frontend, PRD, SDD, Reference, Changelog, FAQ) with mandatory frontmatter and shared components.
- Update operations workflows (Laucher, dashboards, scripts) to reference the new workspace without disrupting the legacy `docs/` site during transition.
- Extend OpenSpec specs to cover the new workspace layout and navigation taxonomy.

### Impact
- **Code/Repo**: Adds `docs/`, new scripts under `scripts/docs/`, Husky hooks, CI pipeline updates, content scaffolding, and diagrams/static assets directories. Legacy `docs/` remains unchanged for parity.
- **Tooling**: Requires Node 18+, Docusaurus plugins (`@redocly/redocusaurus`, `@easyops-cn/docusaurus-search-local`, `@docusaurus/theme-mermaid`, `@docusaurus/plugin-client-redirects`), markdown linting dependencies, and Husky integration.
- **Operations**: Laucher and automation scripts need new working directory paths; adds nightly jobs for stale/broken link reports.
- **Risks**: Content drift if automation not enforced, dual-site complexity during migration, plugin incompatibilities, potential CI runtime increase.
- **Mitigations**: Enforce `docs:auto` and `docs:check` in CI/Husky, maintain dual-hosting with rollback plan, pin plugin versions, monitor build times.

### Timeline (Estimate ~6 weeks)
1. **Phase 0 – Governance & Discovery (0.5 wk)**: Gather requirements, scaffold OpenSpec artifacts, validate change.
2. **Phase 1 – Workspace & Tooling Foundation (1 wk)**: Create `docs/`, configure Docusaurus, install dependencies.
3. **Phase 2 – IA & Content Scaffolding (1.5 wk)**: Build taxonomy, sidebars, shared components, lint rules.
4. **Phase 3 – Automation & Integrations (1 wk)**: Implement scripts, Husky hooks, CI wiring.
5. **Phase 4 – Content Migration & Enhancements (2+ wk)**: Port priority sections, wire diagrams, Redoc pages.
6. **Phase 5 – Ops Integration & Rollout Prep (0.5 wk)**: Update Laucher/scripts, finalize cut-over plan.
7. **Phase 6 – Cut-over & Post-launch Hygiene (0.5 wk + ongoing)**: Launch, monitor, archive change.

### Success Measures
- `npm run lint`, `npm run type-check`, `npm --prefix docs run docs:check` all green in CI.
- `openspec validate migrate-docs-to-docusaurus-v2 --strict` passes before implementation and prior to archive.
- New documentation site serves complete priority sections with zero broken links and stale report below 10% aged pages.
- Automation scripts generate artifacts without manual edits; Husky/CI prevent drift.
- Ops runbooks updated and Laucher successfully manages the new docs service.
