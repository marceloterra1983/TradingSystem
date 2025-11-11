# 📚 Documentation Health Report

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Analyzed Directory:** docs/content

## 📊 Summary Statistics


| Metric | Count | Status |
|--------|-------|--------|
| **Total Files** | 308 | ✅ |
| **With Frontmatter** | 308 | ✅ |
| **Without Frontmatter** | 0 | ✅ |
| **TODO/FIXME Items** | 176 | ⚠️ |
| **Total Directories** | 101 | ✅ |

## 📁 Top-Level Categories

| Category | Files |
|----------|-------|
| reports | 2 |
| database | 6 |
| api | 14 |
| archive | 2 |
| mcp | 4 |
| diagrams | 2 |
| prd | 10 |
| assets | 0 |
| apps | 62 |
| frontend | 19 |
| troubleshooting | 5 |
| development | 3 |
| sdd | 15 |
| agents | 1 |
| governance | 38 |
| reference | 27 |
| tools | 91 |
| prompts | 4 |

## ⚠️ Issues Found

### Files Without Frontmatter

✅ No issues found

### TODO/FIXME Items

- `api/data-capture.mdx:59`: - ⚠️ **TODO**: OpenAPI spec not yet published
- `api/data-capture.mdx:78`: - TODO: Link official ProfitDLL PDF manual once added to repo
- `api/order-manager.mdx:51`: - ⚠️ **TODO**: OpenAPI spec not yet published
- `mcp/permissions.mdx:33`: - `TodoWrite`: Create TODO items
- `mcp/registry.mdx:34`: - `scripts/docs/mcp-registry-sync.ts` - Generate MCP registry from configuration files **(TODO - blocked)**
- `mcp/registry.mdx:39`: **Current State**: ⚠️ **TODO** - Automation blocked (MCP config files external to repository)
- `mcp/registry.mdx:245`: - TodoWrite: Create TODO items
- `mcp/registry.mdx:299`: - `scripts/docs/mcp-registry-sync.ts` - Generate MCP registry from configuration files **(TODO - blocked)**
- `mcp/registry.mdx:304`: **Current State**: ⚠️ **TODO** - Automation blocked (MCP config files external to repository)
- `prd/archive/deprecated-features.mdx:18`: ## TODO
- `prd/products/trading-app/feature-order-manager.mdx:196`: - Redoc: `/redoc/order-manager` (TODO - automated build pending)
- `apps/tp-capital/config.mdx:60`: - Validate configuration with `npm run dev -- --check-config` (TODO automation) and CI env validation script.
- `apps/order-manager/api.mdx:16`: - Redoc: Order Manager (TODO once published)
- `apps/telegram-gateway/runbook.mdx:48`: 3. Once downstream restored, run recovery script (TODO: `node scripts/recover-queue.js`).
- `apps/data-capture/api.mdx:16`: - Redoc: Data Capture (TODO once published)
- `frontend/engineering/conventions.mdx:30`: - Reference ADRs for structural changes (TODO: link to frontend ADRs once migrated).
- `frontend/engineering/architecture.mdx:11`: This page highlights the core architectural principles for TradingSystem frontends. For the detailed breakdown, see the frontend architecture overview (TODO: link once `/frontend/architecture/overview` is migrated).
- `frontend/guidelines/style-guide.mdx:25`: - Follow the typography and color tokens captured in the Gemini CLI theme summary (TODO: link to docs content once published).
- `sdd/api/order-manager/v1/spec.mdx:13`: - ⚠️ **OpenAPI Spec**: `/apis/order-manager/v1/openapi.yaml` (TODO - not yet published)
- `sdd/api/order-manager/v1/spec.mdx:14`: - ⚠️ **Redoc**: `/redoc/order-manager` (TODO - automated build pending)

## 💡 Recommendations

### High Priority

1. **Add Frontmatter** - Add YAML frontmatter to all documentation files
   ```yaml
   ---
   title: Page Title
   sidebar_position: 1
   tags: [tag1, tag2]
   ---
   ```

2. **Resolve TODO Items** - Address pending TODO/FIXME items
3. **Validate Links** - Run `npm run docs:links` for comprehensive link checking

### Medium Priority

1. **Organize Categories** - Ensure logical grouping of documentation
2. **Update Outdated Docs** - Review and update docs with old dates
3. **Add Missing Docs** - Fill documentation gaps

### Low Priority

1. **Improve Navigation** - Add category index pages
2. **Add Examples** - Include code examples and screenshots
3. **Cross-Reference** - Add links between related docs

## 🔄 Next Steps

1. Review this report
2. Create issues for high-priority items
3. Run `npm run docs:check` for comprehensive validation
4. Run `npm run docs:links` for link checking

---

**Report Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Script:** scripts/docs/analyze-docs-health.sh
