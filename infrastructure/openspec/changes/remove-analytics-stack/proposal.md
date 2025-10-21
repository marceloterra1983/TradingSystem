## Why
The Analytics stack (frontend dashboards, Python service `analytics-pipeline`, monitoring artefacts, and related docs) never progressed past prototype status and is now a source of dead weight. It pulls outdated dependencies, introduces broken navigation entries, and complicates local setup (unused containers, ports, env vars, Grafana dashboards). We need to decommission it entirely so the repository reflects the active product scope and reduces maintenance overhead.

## What Changes
- Remove the **Analytics** section from the dashboard (navigation, React pages under `src/components/pages/analytics/`, supporting hooks/stores/services, Tailwind assets, tests).
- Delete the backend **analytics-pipeline** service (code, Dockerfile, compose, scripts, requirements, virtualenv artefacts).
- Prune infrastructure assets: compose stacks, monitoring dashboards/pipelines, CI helpers, scripts (`start-all-*/status`), env samples referring to Analytics.
- Update documentation (Docusaurus, READMEs, onboarding, specs) to drop references, diagrams, and instructions tied to Analytics.
- Refresh specs so dashboard/service inventories no longer list Analytics components.

## Impact
- **Frontend** (`frontend/apps/dashboard`): affects navigation config, lazy imports, contextual pages, API config, type definitions, potential shared UI primitives.
- **Backend/Infra** (`backend/services/analytics-pipeline`, `infrastructure/compose`, `scripts/`): removal of containers, compose services, monitoring/observability pipelines.
- **Documentation** (`docs/context/...`, `infrastructure/openspec/specs/...`): specs, diagrams, and guides that still cite Analytics must be cleaned or rewritten.
- Operational tooling (status scripts, Grafana dashboards, validation checklists) will change to avoid referencing a missing service.

## Success Criteria
- Repository has **zero references** to the Analytics stack (code, docs, scripts, env vars).
- Docusaurus and dashboard build/test pipelines pass without referencing Analytics identifiers.
- `openspec validate remove-analytics-stack --strict` succeeds after spec updates.
- Local dev scripts (`start-all-services.sh`, `status.sh`, etc.) run without errors or placeholders from the old stack.

## Risks / Mitigations
- **Hidden dependencies** (e.g., other services expecting Analytics endpoints): mitigate with global search (`rg`), review API config usage, and regression tests.
- **Docs drift**: mitigate by pairing code removal with documentation updates and running Docusaurus build/validation.
- **CI/tooling surprise**: run the full code-quality pipeline plus `openspec validate` before merge to confirm removal is complete.
