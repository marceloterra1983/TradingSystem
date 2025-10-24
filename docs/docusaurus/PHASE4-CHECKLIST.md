---
title: "Phase 4: Validation Checklist"
sidebar_position: 1
tags: [documentation]
domain: shared
type: reference
summary: "Phase 4: Validation Checklist"
status: active
last_review: 2025-10-22
---

# Phase 4: Validation Checklist

**Purpose:** Quick reference for Phase 4 validation
**Date:** 2025-10-20
**Phase:** 4 of 4 (Validation & Documentation)

## Pre-Validation Checklist

Before starting:

- [ ] Phase 3 completed successfully
- [ ] Dependencies installed: `test -d node_modules`
- [ ] Production build exists: `test -d build`
- [ ] Phase 1 backup available: `ls -d ../.backup-docusaurus-*`
- [ ] Browser available for manual validation (Chrome/Firefox)
- [ ] Current directory: `/home/marce/projetos/TradingSystem/docs/docusaurus`

## Dev Server Validation

**Option A: Automated (Recommended)**

```bash
cd /home/marce/projetos/TradingSystem
bash scripts/docs/validate-dev-server.sh --verbose
```

**Option B: Manual**

```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus
npm run dev
```

**Validation Steps:**

- [ ] Server starts without errors
- [ ] Homepage loads: `curl http://localhost:3004/`
- [ ] Search page loads: `curl http://localhost:3004/search`
- [ ] Health page loads: `curl http://localhost:3004/health`
- [ ] Docs page loads: `curl http://localhost:3004/docs/intro`
- [ ] Spec page loads: `curl http://localhost:3004/spec`
- [ ] Process running: `ps aux | grep docusaurus`
- [ ] Port bound: `netstat -tlnp | grep :3004`
- [ ] No errors in terminal output
- [ ] Browser console clean (open DevTools, check Console tab)

## Theme Validation

**Option A: Automated (Recommended)**

```bash
bash scripts/docs/validate-theme-components.sh --interactive --verbose
```

**Option B: Manual**

Open http://localhost:3004 in browser and verify:

**Dark Mode (Default):**

- [ ] Background ultra dark (#0f1419)
- [ ] Sidebar darker (#0a0e17)
- [ ] Active item purple (#8e24aa)
- [ ] Primary color blue (#8ab4f8)
- [ ] Text light (#e8eaed)

**Light Mode:**

- [ ] Click theme toggle (sun icon)
- [ ] Background white (#ffffff)
- [ ] Primary color Google blue (#1a73e8)
- [ ] Active item blue
- [ ] Smooth transition

**Components:**

- [ ] Sidebar navigation works
- [ ] Active items highlighted purple (dark) or blue (light)
- [ ] Hover effects work
- [ ] Code blocks styled (dark background, purple inline code)
- [ ] Search bar visible (top right)
- [ ] Theme toggle works (smooth transition)

**Responsive Design:**

- [ ] Desktop (>996px): Sidebar + TOC visible
- [ ] Tablet (768-996px): Hamburger menu
- [ ] Mobile (<768px): Mobile-friendly layout

## Component Validation

**Custom Components (9 total):**

- [ ] ApiEndpoint: `test -d src/components/ApiEndpoint`
- [ ] CodeBlock: `test -f src/components/CodeBlock/index.tsx`
- [ ] CookiesBanner: `test -f src/components/CookiesBanner.tsx`
- [ ] CopyButton: `test -f src/components/CopyButton.tsx`
- [ ] FacetFilters: `test -d src/components/FacetFilters`
- [ ] HealthMetricsCard: `test -d src/components/HealthMetricsCard`
- [ ] HomepageFeatures: `test -d src/components/HomepageFeatures`
- [ ] SearchBar: `test -d src/components/SearchBar`
- [ ] Tabs: `test -f src/components/Tabs/index.tsx`

**Custom Pages (4 total):**

- [ ] Homepage: http://localhost:3004/ (200 OK)
- [ ] Search: http://localhost:3004/search (200 OK)
- [ ] Health: http://localhost:3004/health (200 OK)
- [ ] Spec: http://localhost:3004/spec (200 OK)

**Theme Overrides (2 total):**

- [ ] Layout: `test -f src/theme/Layout/index.tsx`
- [ ] SearchBar: `test -f src/theme/SearchBar/index.tsx`

## Integration Validation

**Option A: Automated (Recommended)**

```bash
bash scripts/docs/validate-integrations.sh --verbose
```

**Option B: Manual**

**Documentation API Check:**

```bash
# Check if API is running
curl http://localhost:3400/health

# If not running, start it:
cd backend/api/documentation-api
npm run dev
# Or via Docker:
docker compose -f tools/compose/docker-compose.docs.yml up -d
```

**Search Integration:**

- [ ] Open http://localhost:3004/search
- [ ] Type "dark mode" in search bar
- [ ] Results appear (12+ results expected)
- [ ] Apply filters (domain: frontend, type: guide)
- [ ] Results update
- [ ] No CORS errors in console

**Health Dashboard Integration:**

- [ ] Open http://localhost:3004/health
- [ ] Health score displays (Grade A-F)
- [ ] Link success rate shows
- [ ] Frontmatter compliance shows
- [ ] Content freshness shows
- [ ] Issue tables display
- [ ] Export options work (JSON, CSV)

**API Endpoints:**

- [ ] Search: `curl http://localhost:3400/api/v1/docs/search?q=dark+mode | jq`
- [ ] Facets: `curl http://localhost:3400/api/v1/docs/facets | jq`
- [ ] Health: `curl http://localhost:3400/api/v1/docs/health/summary | jq`

**Note:** If Documentation API is not running, search and health pages will show "API not available". This is expected and not a failure.

## Diagram Validation

**Option A: Automated (Recommended)**

```bash
bash scripts/docs/validate-diagrams.sh --verbose
```

**Option B: Manual**

**PlantUML:**

- [ ] Plugin installed: `test -d node_modules/@akebifiky/remark-simple-plantuml`
- [ ] Configured: `grep -q 'remarkSimplePlantuml' docusaurus.config.ts`
- [ ] Files found: `find ../../docs/context -name '*.puml' | wc -l` (expected: 33)
- [ ] Server accessible: `curl -I https://www.plantuml.com/plantuml/svg/~1UDfSKh30AmFp0tlF1hSYdDimW980W00`
- [ ] Navigate to: http://localhost:3004/docs/shared/diagrams/plantuml-guide
- [ ] Diagrams render as SVG images
- [ ] No broken image icons

**Mermaid:**

- [ ] Plugin installed: `test -d node_modules/@docusaurus/theme-mermaid`
- [ ] Configured: `grep -q 'mermaid: true' docusaurus.config.ts`
- [ ] Diagrams found: ` grep -r '```mermaid' ../../docs/context --include='*.md' | wc -l `
- [ ] If diagrams present, verify rendering

## Production Build Validation

**Option A: Automated (Recommended)**

```bash
bash scripts/docs/validate-production-build.sh --verbose
```

**Option B: Manual**

**Build:**

```bash
# Stop dev server first (Ctrl+C)
npm run build
```

**Validation:**

- [ ] Build completes without errors
- [ ] build/ directory created: `test -d build`
- [ ] index.html present: `test -f build/index.html`
- [ ] docs/ present: `test -d build/docs`
- [ ] search/ present: `test -d build/search`
- [ ] health/ present: `test -d build/health`
- [ ] assets/ present: `test -d build/assets`
- [ ] File count: `find build -type f | wc -l` (expected: 1500-2000)
- [ ] Build size: `du -sh build` (expected: 8-10 MB)
- [ ] JS bundles: `find build/assets -name '*.js' | wc -l` (expected: 40-50)
- [ ] CSS bundles: `find build/assets -name '*.css' | wc -l` (expected: 10-15)

**Serve:**

```bash
npm run serve
```

**Validation:**

- [ ] Server starts on port 3000
- [ ] Homepage: `curl http://localhost:3000/` (200 OK)
- [ ] Search: `curl http://localhost:3000/search` (200 OK)
- [ ] Health: `curl http://localhost:3000/health` (200 OK)
- [ ] Docs: `curl http://localhost:3000/docs/intro` (200 OK)
- [ ] SPA routing: `curl http://localhost:3000/non-existent` (200 OK, fallback works)

**Lighthouse (Optional):**

- [ ] Open http://localhost:3000 in Chrome
- [ ] Open DevTools (F12) → Lighthouse tab
- [ ] Run audit (Desktop, Performance)
- [ ] Performance > 90
- [ ] Accessibility > 95
- [ ] Best Practices > 90
- [ ] SEO > 90

## Report Generation

**Automated (Recommended):**

```bash
bash scripts/docs/generate-restoration-report.sh --format both --verbose
```

**Manual:**

- [ ] Review all validation reports:
  - DEV-SERVER-VALIDATION-\*.md
  - THEME-VALIDATION-\*.md
  - INTEGRATION-VALIDATION-\*.md
  - DIAGRAM-VALIDATION-\*.md
  - BUILD-VALIDATION-\*.md
- [ ] Document any issues or customizations
- [ ] Create summary report manually

## Validation Reports

- [ ] Dev server report: `ls DEV-SERVER-VALIDATION-*.md`
- [ ] Theme report: `ls THEME-VALIDATION-*.md`
- [ ] Integration report: `ls INTEGRATION-VALIDATION-*.md`
- [ ] Diagram report: `ls DIAGRAM-VALIDATION-*.md`
- [ ] Build report: `ls BUILD-VALIDATION-*.md`
- [ ] Final restoration report: `ls DOCUSAURUS-RESTORATION-REPORT-*.md`

## Success Criteria

Phase 4 is complete when:

- [ ] Dev server validated ✅
- [ ] Theme validated (dark/light modes) ✅
- [ ] All 9 components present ✅
- [ ] All 4 pages accessible ✅
- [ ] Search integration working (if API available) ✅
- [ ] Health dashboard working (if API available) ✅
- [ ] PlantUML diagrams validated (33 diagrams) ✅
- [ ] Mermaid diagrams validated (if present) ✅
- [ ] Production build successful ✅
- [ ] Production server serves pages ✅
- [ ] No critical errors ✅
- [ ] All reports generated ✅

## Quick Verification Commands

```bash
# All-in-one verification
test -d node_modules && \
test -d build && \
curl -s -o /dev/null -w "%{http_code}" http://localhost:3004/ | grep -q 200 && \
test -f DOCUSAURUS-RESTORATION-REPORT-*.md && \
echo "✅ Phase 4 completed successfully" || \
echo "❌ Phase 4 incomplete"

# Detailed check
echo "Dev server: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3004/)"
echo "Components: $(find src/components -maxdepth 1 -type d | wc -l) directories"
echo "Pages: $(find src/pages -name 'index.tsx' | wc -l) pages"
echo "PlantUML files: $(find ../../docs/context -name '*.puml' | wc -l)"
echo "Build size: $(du -sh build | cut -f1)"
echo "Build files: $(find build -type f | wc -l)"
```

## Troubleshooting Quick Fixes

**Dev server won't start:**

```bash
npm run dev:clean
```

**Theme not loading:**

```bash
# Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

**Search not working:**

```bash
# Start Documentation API
cd backend/api/documentation-api
npm run dev
```

**Diagrams not rendering:**

```bash
# Check PlantUML server
curl -I https://www.plantuml.com/plantuml/svg/~1UDfSKh30AmFp0tlF1hSYdDimW980W00
```

**Build fails with OOM:**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

## Next Steps

After Phase 4:

1. [ ] Review final restoration report: `cat DOCUSAURUS-RESTORATION-REPORT-*.md`
2. [ ] Archive Phase 1 backup (keep for 7 days)
3. [ ] Update project documentation
4. [ ] Share restoration report with team
5. [ ] Schedule follow-up review (1 week)

## Sign-off

If all checks pass:

- [ ] Phase 4 completed successfully ✅
- [ ] Dev server validated ✅
- [ ] Theme validated ✅
- [ ] Integrations validated ✅
- [ ] Diagrams validated ✅
- [ ] Production build validated ✅
- [ ] Reports generated ✅
- [ ] Ready for production ✅

Completed by: [Name]
Date: [Timestamp]
Final report: DOCUSAURUS-RESTORATION-REPORT-{timestamp}.md
