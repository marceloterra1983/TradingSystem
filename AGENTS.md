# Repository Guidelines

## Project Structure & Module Organization
Core source lives in `frontend/dashboard` (React + Vite UI) and `backend/api` (Express microservices such as `documentation-api` and `workspace`). Shared utilities sit in `frontend/shared` and `backend/shared`. Data contracts and database assets are kept in `backend/data`. Domain-specific agents and scripts reside under `apps/` (for vertical prototypes) and `scripts/` (automation, docs tooling). Infrastructure, Docker Compose files, and monitoring assets are under `tools/`, while project-wide configuration binaries stay in `config/` and `docs/` contains the Docusaurus v3 documentation hub with comprehensive guides, API specs, and governance documents.

## Build, Test, and Development Commands
- `npm run lint` / `npm run type-check` from the repo root delegate to the dashboard app and fail CI if lint or TypeScript errors exist.
- `cd frontend/dashboard && npm run dev` launches the UI at `http://localhost:3103` with live doc syncing; run `npm install` there first.
- `cd backend/api/documentation-api && npm run dev` (or `workspace`) starts an API service; use the matching Docker Compose file in `tools/compose` for database dependencies.
- `npm run validate-docs` ensures every entry in `docs/content/` has the required frontmatter before publishing (validates Docusaurus content structure).

## Coding Style & Naming Conventions
TypeScript and modern ES modules are the default across frontend and backend. Preserve 2-space indentation in `.ts/.tsx` and `.js` files, prefer named exports, and keep React components in PascalCase under `src/components`. Shared utilities live in `src/lib` or `shared/`, using lower camelCase functions and snake_case for SQL entities. ESLint (repo root and app-specific configs) is the source of truth—run `npm run lint:fix` locally to auto-resolve style issues. Tailwind tokens are centralized in `frontend/tokens`; import from there instead of redefining styles.

## Testing Guidelines
Vitest powers UI unit tests (`frontend/dashboard/src/__tests__`). Use `npm run test` for a focused run, `npm run test:watch` during feature work, and `npm run test:coverage` before PRs that touch core flows. Backend services rely on integration exercises; add scripts under each service’s `tests/` folder and document how to execute them in that service README. Always validate docs with `npm run validate-docs` when updating content consumed by the dashboard.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) as seen in recent history, keeping subjects imperative and under 72 characters. Group related changes per commit; avoid mixing dashboard and backend refactors unless tightly coupled. Pull requests must include: a concise summary, impact assessment (UI, API, data), screenshots or terminal output for user-facing changes, linked issues, and a checklist of executed commands (lint, type-check, tests, docs validation). Flag any new environment variables and update `.env.example` plus `docs/configuration` when applicable.
