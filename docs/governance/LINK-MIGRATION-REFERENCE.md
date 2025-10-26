# Link Migration Reference

**Purpose**: Authoritative mapping of legacy documentation paths to docs paths for link updates.

**Usage**: Consult this reference when updating links in code, documentation, or configuration files.

## Path Mapping Table

### Documentation URLs

| Legacy Path | docs Path | Notes |
|-------------|--------------|-------|
| `http://localhost:3004` | `http://localhost:3205` | Port change (legacy Docusaurus v2 → docs) |
| `http://localhost:3004/docs` | `http://localhost:3205` | docs served at root |
| `http://tradingsystem.local/docs` | `http://tradingsystem.local/docs` | Unified domain (nginx routes to docs) |

### File Paths (Legacy → docs)

**Apps Documentation**

| Legacy | docs |
|--------|---------|
| `docs/context/backend/guides/guide-tp-capital.md` | `/apps/tp-capital/overview` |
| `docs/context/backend/guides/guide-idea-bank-api.md` | `/apps/workspace/overview` |
| — | `/apps/order-manager/overview` |
| — | `/apps/data-capture/overview` |

**API Documentation**

| Legacy | docs |
|--------|---------|
| `docs/context/backend/api/README.md` | `/api/overview` |
| `docs/context/backend/api/specs/workspace.openapi.yaml` | `/reference/specs/openapi/workspace` |
| — | `/api/order-manager` |
| — | `/api/data-capture` |

**Frontend Documentation**

| Legacy | docs |
|--------|---------|
| `docs/context/frontend/design-system/tokens.mdx` | `/frontend/design-system/tokens` |
| `docs/context/frontend/design-system/components.mdx` | `/frontend/design-system/components` |
| `docs/context/frontend/guidelines/style-guide.mdx` | `/frontend/guidelines/style-guide` |
| `docs/context/frontend/engineering/architecture.mdx` | `/frontend/engineering/architecture` |

**Database Documentation**

| Legacy | docs |
|--------|---------|
| `docs/context/backend/data/schemas/README.md` | `/database/schema` |
| `docs/context/backend/data/migrations/strategy.md` | `/database/migrations` |
| `docs/context/backend/data/operations/backup-restore.md` | `/database/retention-backup` |

**Tools Documentation**

| Legacy | docs |
|--------|---------|
| `docs/context/ops/service-port-map.md` | `/tools/ports-services/overview` |
| `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` | `/tools/security-config/env` |
| `docs/context/shared/tools/templates/template-guide.md` | `/reference/templates/guide` |

**PRD Documentation**

| Legacy | docs |
|--------|---------|
| `docs/context/shared/product/prd/en/idea-bank-prd.md` | `/prd/products/trading-app/feature-idea-bank` |
| `docs/context/shared/product/prd/pt/banco-ideias-prd.md` | `/prd/products/trading-app/feature-idea-bank.pt` |
| `docs/context/prd/templates/prd-template.mdx` | `/prd/templates/prd-template` |

**SDD Documentation**

| Legacy | docs |
|--------|---------|
| — | `/sdd/domain/schemas/v1/order` |
| — | `/sdd/domain/schemas/v1/risk-rule` |
| — | `/sdd/events/v1/order-created` |
| — | `/sdd/flows/v1/place-order` |
| — | `/sdd/api/order-manager/v1/spec` |

**Diagrams**

| Legacy | docs |
|--------|---------|
| `docs/context/shared/diagrams/README.md` | `/diagrams/diagrams` |
| `docs/context/shared/diagrams/*.puml` | `/assets/diagrams/source/{domain}/*.puml` |

**Reference & Templates**

| Legacy | docs |
|--------|---------|
| `docs/context/shared/tools/templates/template-runbook.md` | `/reference/templates/runbook` |
| `docs/context/shared/tools/templates/template-adr.md` | `/reference/templates/adr` |

### External Files (Not in docs/context/)

| File | Status | Recommendation |
|------|--------|----------------|
| `docs/architecture/technical-specification.md` | External | Migrate to `/reference/architecture/technical-specification` |
| `docs/architecture/ADR-001-clean-architecture.md` | External | Migrate to `/reference/adrs/adr-001-clean-architecture` |
| `config/ENV-CONFIGURATION-RULES.md` | Config file | Keep in `config/`, reference from docs |
| `config/services-manifest.json` | Config file | Keep in `config/`, reference from docs |

## Link Update Patterns

### Relative Links (within docs)

Use relative paths from the current document:

- `./architecture`
- `../sdd/api/order-manager/v1/spec`
- `../../tools/ports-services/overview`

### Absolute Links (HTTP URLs)

Use for external references or when linking from code:

- Backend README → `http://localhost:3205/database/overview`
- Dashboard components → `apiConfig.docsUrl`
- CI workflows → `http://localhost:3400/health`

### Markdown Conventions

- Internal: `[Architecture](./architecture)`
- Absolute: `[Docs Hub](http://localhost:3205)`
- Legacy (temporary): `[Legacy Guide](../../docs/context/backend/data/guides/database-ui-tools.md) (archived)`

## Validation

1. Run link validator:

   ```bash
   cd docs
   npm run docs:links
   ```

2. Test links in browser.
3. Execute full validation:

   ```bash
   npm run docs:check
   ```

## Common Mistakes

- ❌ Using file extensions in Docusaurus links (`overview.mdx`)
- ❌ Mixing legacy and docs paths in the same document
- ❌ Hardcoding localhost URLs in production code

- ✅ Use relative paths within docs
- ✅ Omit extensions (`/apps/workspace/overview`)
- ✅ Use configuration for URLs in code (`apiConfig.docsUrl`)
- ✅ Add migration notes for external references

## Related Documentation

- [Migration Mapping](../migration/MIGRATION-MAPPING.md)
- [Validation Guide](./VALIDATION-GUIDE.md)
- [Cut-over Plan](./CUTOVER-PLAN.md)
