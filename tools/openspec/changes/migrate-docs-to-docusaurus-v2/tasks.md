## Phase 0 – Governance & Discovery
- [ ] 0.1 Review specs `documentation-hosting`, `docs-navigation`, and legacy `docs/` structure
- [ ] 0.2 Interview Docs/Ops/API stakeholders for scope alignment and launch constraints
- [ ] 0.3 Draft `proposal.md`, `tasks.md`, and (if needed) `design.md` for migration architecture
- [ ] 0.4 Author spec deltas for hosting/navigation capabilities
- [ ] 0.5 Run `openspec validate migrate-docs-to-docusaurus-v2 --strict` and iterate until clean approval

## Phase 1 – Workspace & Tooling Foundation
- [x] 1.1 Scaffold `docs/` directory with `package.json`, configs, `src/`, `static/`, `content/`
- [x] 1.2 Install Docusaurus v2 and required plugins (`@redocly/redocusaurus`, search, mermaid, redirects)
- [x] 1.3 Configure `docusaurus.config.js` and `sidebars.js` baseline, enabling strict link policies
- [x] 1.4 Add lint configs (`.markdownlint.json`, `.remarkrc.json`) and shared CSS/components stubs
- [x] 1.5 Verify `npm --prefix docs run docs:dev` starts successfully and document setup steps

## Phase 2 – Information Architecture & Scaffolding
- [x] 2.1 Create taxonomy directories with `_category_.json` and `overview.mdx` placeholders
  - Apps (Data Capture, Order Manager), API, Agents, MCP, Prompts, Database, Tools, Frontend, PRD, SDD, Diagrams, Reference, Changelog, FAQ
- [x] 2.2 Implement homepage (`content/index.mdx`) with quick links and frontmatter template
- [x] 2.3 Build shared React components (`Related`, `AdmonitionWrap`, `CodeTabs`) and integrate sample usage
- [x] 2.4 Finalize `sidebars.js` ordering for all sections and validate navigation
- [x] 2.5 Enforce mandatory frontmatter via lint rules and sample metadata across placeholders

## Phase 3 – Automation & Integrations
- [ ] 3.1 Implement automation scripts (`docs:auto`) for Redoc summaries, ports table, MCP registry, PRD index, design tokens sync
  - Scaffolding in place (`scripts/docs/docs-auto.mjs`) with placeholder generation.
- [x] 3.2 Add shell helpers (`build.sh`, `serve.sh`, `lint.sh`, `check-links.sh`) with consistent path handling
  - Shell wrappers live under `scripts/docs/`; `check-links.sh` rebuilds and runs Linkinator with skip controls.
- [x] 3.3 Wire npm scripts (`docs:dev`, `docs:build`, `docs:serve`, `docs:lint`, `docs:auto`, `docs:check`, `docs:new`)
  - `docs/package.json` now exposes `docs:auto`, enhanced `docs:check`, `docs:links`, `docs:new`, and `docs:test`.
- [x] 3.4 Integrate Husky hooks: `pre-commit` → lint, `pre-push` → `docs:check`
  - Hooks respect `SKIP_DOCS_HOOKS=1` for escape hatches.
- [x] 3.5 Add unit tests for automation utilities and ensure `npm --prefix docs run docs:auto` / `docs:check` succeed locally
  - `docs/tests/docs-auto.test.mjs` verifies scaffolding idempotency; `docs:check` now runs lint, typecheck, tests, and build.

## Phase 4 – Content Migration & Enhancements
- [ ] 4.1 Migrate Frontend documentation (design tokens, components, guidelines, engineering)
- [ ] 4.2 Migrate Tools (ProfitDLL, Docusaurus, Redocusaurus, security-config, ports-services) with diagrams
- [ ] 4.3 Populate PRD/SDD sections with templates, product artifacts, and spec-driven flows
- [ ] 4.4 Document Agents/MCP domain including generated registry and permissions
- [ ] 4.5 Build Reference pages (env vars, ports, CLI, migrations, templates) leveraging automation outputs
- [ ] 4.6 Ensure diagrams (PlantUML/Mermaid) render and Redoc pages map to latest OpenAPI specs
- [ ] 4.7 Obtain SME review for each migrated section and resolve feedback

## Phase 5 – Operational Integration & Rollout Prep
- [ ] 5.1 Update Laucher configuration, ops scripts, and dashboard messaging to use `docs`
- [ ] 5.2 Harden `.gitignore` for `docs/build/` and verify no `.env*` artifacts tracked
- [ ] 5.3 Produce cut-over runbook with owners, verification checklist, and rollback plan
- [ ] 5.4 Dry-run `scripts/docs/check-links.sh` and `stale-report.ts`, publishing artifacts
- [ ] 5.5 Communicate rollout timeline via release notes, README updates, and internal channels

## Phase 6 – Cut-over & Post-launch Hygiene
- [ ] 6.1 Execute launch window tasks; switch production orchestration to `docs`
- [ ] 6.2 Monitor metrics (broken links, stale report, build status, Redoc health) and address issues
- [ ] 6.3 Gather user feedback, triage follow-ups, and schedule quarter hygiene tasks
- [ ] 6.4 Archive change with `openspec archive migrate-docs-to-docusaurus-v2 --yes` after stabilization
- [ ] 6.5 Update specs/runbooks to reflect final state and close out project documentation
