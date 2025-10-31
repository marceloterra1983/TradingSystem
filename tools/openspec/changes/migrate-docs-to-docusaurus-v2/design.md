## Design Notes — migrate-docs-to-docusaurus-v2

### Architecture Overview
- **Dual-site strategy**: Keep legacy `docs/` (Docusaurus v1) operational while building `docs/` in parallel to avoid downtime and allow incremental migration.
- **Workspace isolation**: Place Docusaurus engine, configs, dependencies, and build artifacts inside `docs/` to comply with `documentation-hosting` requirements and streamline backups.
- **Content taxonomy**: Adopt domain-first hierarchy (Apps, API, Agents, MCP, Prompts, Database, Tools, Frontend, PRD, SDD, Reference, Changelog, FAQ) to match governance and navigation specs. Each section includes `_category_.json`, `overview.mdx`, and crosslinks via `Related` component.

### Key Decisions
1. **Plugin Stack**
   - `@redocly/redocusaurus` for embedding OpenAPI specs from `backend/api/**`.
   - `@docusaurus/theme-mermaid` and PlantUML for diagrams.
   - `@easyops-cn/docusaurus-search-local` to provide offline search.
   - `@docusaurus/plugin-client-redirects` to keep legacy URLs functional.
   - Rationale: Minimal plugin set covering current needs while maintaining maintainability.

2. **Automation Pipeline**
   - All documentation generators reside in `scripts/docs/**` with targeted folders (e.g., `api/`, `reference/`, `tools/`).
   - `docs:auto` orchestrates generators (OpenAPI summaries, MCP registry, ports table, design tokens, PRD index).
   - `docs:check` enforces lint → automation → build sequence for CI/Husky gating.
   - Rationale: Prevent manual drift, guarantee reproducible artifacts, and support nightly reporting (stale report, broken links).

3. **Operational Integration**
   - Laucher/service scripts updated to run from `docs/` with Node 18 environment.
   - Provide shell wrappers (`build.sh`, `serve.sh`, `lint.sh`, `check-links.sh`) for Ops to interface uniformly.
   - Maintain fallback to legacy site until parity confirmed; cut-over plan includes rollback path.

4. **Versioning & Governance**
   - Enable Docusaurus docs versioning to snapshot released documentation (`current` labeled `next`).
   - Use OpenSpec artifacts (`proposal`, `tasks`, `spec` deltas) as source of truth for documentation architecture changes.
   - Introduce quarterly hygiene task and metrics badge (broken links/stale pages) for accountability.

### Alternatives Considered
- **In-place upgrade of `docs/`**: Rejected; mixing engine/assets with content perpetuates existing issues and complicates rollback.
- **Migrating to another framework (e.g., VitePress/MkDocs)**: Deferred; Docusaurus v2 already supported, richer ecosystem for React components and Redoc integration.
- **Static file generation without automation**: Declined; high risk of stale content and manual regression.

### Operational Risks & Mitigations
- **Dual maintenance load**: Keep migration board, focus on high-value sections first, and schedule review cadences.
- **Plugin incompatibilities**: Pin versions, add compatibility checks before upgrades.
- **CI performance**: Cache `node_modules`, consider splitting docs jobs if runtime exceeds thresholds.
- **Security**: Ensure `.env*` excluded, watch for embedded secrets in migrated content, review third-party plugin licenses.

### Open Questions / Follow-ups
- Confirm hosting path and port requirements with Ops (e.g., continue using port 3004 vs. new port).
- Determine whether analytics/telemetry (e.g., Matomo) needs integration in `docs`.
- Decide on adoption of visual regression tooling (Percy/Chromatic) once UI stabilizes.
