## 1. Mapping Criteria Definitions

- **Complete:** All required sections, frontmatter, recent review, no TODOs, links updated, diagrams present.
- **Draft:** Missing sections, placeholder frontmatter, contains TODOs, legacy links.
- **Gap:** No content or single-line placeholder.

## 2. Domain-to-Category Mapping

| Source Path | Target Path |
|-------------|-------------|
| backend/api/ | content/api/ + content/reference/sdd/api/ |
| backend/architecture/ | content/reference/adrs/ |
| backend/data/ | content/database/ |
| backend/guides/ | content/guides/backend/ |
| frontend/ | content/frontend/ |
| ops/ | content/ops/ |
| shared/product/prd/ | content/product/prd/ |
| shared/tools/templates/ | content/templates/ |
| shared/diagrams/ | content/assets/diagrams/ + content/diagrams/guide |
| shared/integrations/ | content/integrations/api-hub/ |
| docs/spec/ | content/reference/specs/openapi/ |
| docs/* (root) | content/meta/ |

## 3. File-Level Mapping Examples

### Backend API Documentation
- `docs/context/backend/api/README.md` → `docs/content/api/overview.mdx` (Complete, Priority 1, source: backend domain README).
- `docs/context/backend/api/specs/trading-engine.yaml` → `docs/content/reference/specs/openapi/trading-engine.yaml` (Draft until automation runs, Priority 1).
- `docs/context/backend/api/guides/authentication.md` → `docs/content/api/guides/authentication.mdx` (Draft, Priority 2).

### Backend Architecture & ADRs
- `docs/context/backend/architecture/overview.md` → `docs/content/reference/architecture/overview.mdx` (Complete, Priority 1).
- `docs/context/backend/architecture/decisions/2025-10-09-adr-0001-use-lowdb.md` → `docs/content/reference/adrs/2025-10-09-use-lowdb.mdx` (Complete, Priority 1).
- `docs/context/backend/architecture/service-map.md` → `docs/content/reference/architecture/service-map.mdx` (Draft, Priority 2).

### Backend Data & Migrations
- `docs/context/backend/data/schemas/README.md` → `docs/content/database/schemas/overview.mdx` (Draft, Priority 2).
- `docs/context/backend/data/migrations/plan-2025-10.md` → `docs/content/database/migrations/plan-2025-10.mdx` (Draft, Priority 2).
- `docs/context/backend/data/operations/backup-runbook.md` → `docs/content/database/operations/backup-runbook.mdx` (Draft, Priority 3).

### Frontend Design System & Tokens
- `docs/context/frontend/design-system/tokens.mdx` → `docs/content/frontend/design-system/tokens.mdx` (Complete, Priority 2).
- `docs/context/frontend/design-system/components.md` → `docs/content/frontend/design-system/components.mdx` (Draft, Priority 2).
- `docs/context/frontend/design-system/patterns.md` → `docs/content/frontend/design-system/patterns.mdx` (Draft, Priority 2).

### Frontend Features & Guides
- `docs/context/frontend/features/customizable-layout.md` → `docs/content/frontend/features/customizable-layout.mdx` (Draft, Priority 2).
- `docs/context/frontend/guides/dashboard-integration.md` → `docs/content/frontend/guides/dashboard-integration.mdx` (Draft, Priority 2).
- `docs/context/frontend/guides/testing-strategy.md` → `docs/content/frontend/guides/testing-strategy.mdx` (Gap, Priority 3).

### Operations Runbooks & Monitoring
- `docs/context/ops/onboarding/QUICK-START-GUIDE.md` → `docs/content/ops/onboarding/quick-start.mdx` (Complete, Priority 1).
- `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` → `docs/content/tools/security-config/overview.mdx` (Complete, Priority 1).
- `docs/context/ops/monitoring/prometheus-setup.md` → `docs/content/ops/monitoring/prometheus-setup.mdx` (Draft, Priority 3).
- `docs/context/ops/checklists/post-deploy.md` → `docs/content/ops/checklists/post-deploy.mdx` (Draft, Priority 3).

### Shared Templates & PRDs
- `docs/context/shared/tools/templates/adr-template.md` → `docs/content/templates/adr-template.mdx` (Complete, Priority 3).
- `docs/context/shared/product/prd/trading-platform.pt.md` → `docs/content/product/prd/trading-platform.pt.mdx` (Draft, Priority 3).
- `docs/context/shared/product/prd/trading-platform.en.md` → `docs/content/product/prd/trading-platform.en.mdx` (Draft, Priority 3).

### Diagrams
- `docs/context/shared/diagrams/system-overview.puml` → `docs/content/assets/diagrams/source/system-overview.puml` (Draft, Priority 3).
- `docs/context/shared/diagrams/system-overview.md` → `docs/content/diagrams/system-overview.mdx` (Draft, Priority 3).
- `docs/context/shared/diagrams/data-flow.puml` → `docs/content/assets/diagrams/source/data-flow.puml` (Draft, Priority 3).

### OpenAPI & Spec Documents
- `docs/context/backend/api/specs/order-router.yaml` → `docs/content/reference/specs/openapi/order-router.yaml` (Draft, Priority 1).
- `docs/context/backend/api/specs/risk-analytics.yaml` → `docs/content/reference/specs/openapi/risk-analytics.yaml` (Draft, Priority 1).
- `docs/context/backend/api/specs/workspace.yaml` → `docs/content/reference/specs/openapi/workspace.yaml` (Draft, Priority 1).

### Root Meta Documents
- `docs/DOCUMENTATION-STANDARD.md` → `docs/content/meta/documentation-standard.mdx` (Complete, Priority 1).
- `docs/DIRECTORY-STRUCTURE.md` → `docs/content/meta/directory-structure.mdx` (Complete, Priority 1).
- `docs/README.md` → `docs/content/meta/index.mdx` (Draft, Priority 1).

### Index and Navigation
- `docs/context/backend/README.md` → `docs/content/backend/overview.mdx` (Draft, Priority 2).
- `docs/context/frontend/README.md` → `docs/content/frontend/overview.mdx` (Draft, Priority 2).
- `docs/context/ops/README.md` → `docs/content/ops/overview.mdx` (Draft, Priority 2).
- `docs/context/shared/README.md` → `docs/content/shared/overview.mdx` (Draft, Priority 2).

## 4. Migration Rules

### Frontmatter Transformation
- Preserve: `title`, `tags`, `domain`, `type`, `summary`, `status`, `last_review`.
- Add: `id` (kebab-case slug), `slug` (canonical URL), `locale` (`pt` or `en`), `generated` (`true` or `false`).
- Transform: `sidebar_position` → weight or new sidebar metadata.
- Mark outdated: Add `migration_note` if `last_review` is older than SLA.

### File Naming Conventions
- Use kebab-case for filenames and slugs.
- Use `.mdx` for files with React components, `.md` otherwise.
- Language suffixes: `filename.pt.mdx` and `filename.en.mdx` or locale folders.
- Reserved names: `overview.mdx` for index pages.

### Directory Structure Decisions
- Top-level structure: `content/api/`, `content/frontend/`, `content/backend/`, `content/ops/`.
- Additional roots: `content/templates/`, `content/reference/specs/`, `content/reference/adrs/`.
- Diagrams: `content/assets/diagrams/source/` for PlantUML, `content/diagrams/` for MDX wrappers.
- Meta: `content/meta/` for documentation governance and directories.

### Content Splitting/Merging Decisions
- APIs: Split overview vs detailed reference pages.
- ADRs: One page per ADR.
- Guides: Split if over 2000 lines to maintain readability.
- Templates: Copy as-is with `template: true`.
- Runbooks: Create one page per runbook with index pages linking them.

### Cross-Reference Updates
- Replace relative links (`../backend/api/README.md`) with canonical slugs (`/api/overview/`).
- Maintain migration mapping file (CSV/JSON) for automated rewriting.
- Update in-page anchors to match new MDX heading IDs.
- Create redirects for legacy URLs to preserve backlinks.

## 5. Special Cases

### Multi-Language Content (PT/EN)
- Preserve PT as source of truth.
- Place EN in separate folder or use locale suffixes.
- Add `locale: pt|en` to frontmatter.
- Mark outdated translations with `status: translation-needed`.

### Diagrams (PlantUML, Mermaid)
- Copy PlantUML sources to `content/assets/diagrams/source/`.
- Create MDX pages in `content/diagrams/` that embed sources.
- Add diagram metadata: `diagram_source`, `renders`, `last_validation`.
- Keep Mermaid inline or in `.mmd` files.
- Move binary images to `docs/static/media/`.

### OpenAPI Specs
- Keep canonical YAML in `content/reference/specs/openapi/`.
- Generate human-readable MDX in `content/reference/generated/`.
- Mark generated MDX with `generated: true` and `source_path`.
- Preserve spectral/linting metadata for automation.

### Templates
- Copy to `content/templates/` with `template: true`.
- Add index page at `content/templates/_index.mdx`.

### Archives
- Move to `content/archives/<year>/` with `status: deprecated`.
- Add `archive_reason` and `archival_date` fields.

## 6. Validation Checklist

- Frontmatter complete and valid.
- Slug canonicalization verified.
- All internal links updated.
- External links preserved.
- Images and diagrams migrated and renderable.
- Code examples syntax-highlighted.
- OpenAPI references correct.
- Cross-references updated.
- Sidebar navigation added.
- File marked Complete/Draft/Gap.
- i18n locale set.
- Generated files marked.
- Migration note added if needed.
- Build passed locally.
- Link validator run.

### Additional Verification for Ops & Critical Content
- Onboarding guides tested end-to-end.
- Monitoring runbooks include port/service maps.
- ADRs have accurate dates and statuses.

## Appendix - File References

- Inventory built from `docs/context/backend/`, `docs/context/frontend/`, `docs/context/ops/`, `docs/context/shared/`.
- Root governance sourced from `docs/README.md`, `docs/DOCUMENTATION-STANDARD.md`, `docs/DIRECTORY-STRUCTURE.md`.
- Target scaffolding reviewed under `docs/content/`.

## Migration Plan Recommendations

1. Finalize automation for OpenAPI, MCP registry, and ports table generation.
2. Assign domain owners for Priority 1 and Priority 2 migrations.
3. Create migration tracking spreadsheet (source, target, status, owner, priority).
4. Schedule validation checkpoints using the checklist above.
5. Plan cut-over rehearsal once Priority 3 content reaches Complete state.

## Uncertainties

- Slug conventions within docs sidebars pending confirmation.
- Locale strategy (folder vs suffix) requires stakeholder alignment.
- Generated API reference location needs final decision.
- SLA for "recent" `last_review` date still under discussion.
