---
title: "Phase 3: Installation & Build Checklist"
sidebar_position: 1
tags: [documentation]
domain: shared
type: reference
summary: "Phase 3: Installation & Build Checklist"
status: active
last_review: 2025-10-22
---

# Phase 3: Installation & Build Checklist

**Purpose:** Quick reference for Phase 3 execution
**Date:** Current timestamp
**Phase:** 3 of 4 (Installation & Build)

## Pre-Installation Checklist

Before starting:

- [ ] Phase 2 cleanup completed successfully
- [ ] No artifacts present: `ls -la | grep -E 'node_modules|.docusaurus|build|package-lock.json'` (use `--force`/`--auto-clean` flag to auto-clean if needed)
- [ ] Source files intact: `test -d src && test -d static && test -d scripts`
- [ ] Phase 1 backup available: `ls -d ../.backup-docusaurus-*` (any backup detected, not date-specific)
- [ ] Node.js >= 20.0.0: `node --version`
- [ ] npm installed: `npm --version`
- [ ] jq installed: `jq --version` (required for JSON parsing)
- [ ] Disk space >= 1000 MB: `df -h`
- [ ] Internet connection: `ping -c 1 npmjs.org`
- [ ] Current directory: `/home/marce/projetos/TradingSystem/docs/docusaurus`

## Installation Steps

### Option A: Automated (Recommended)

```bash
cd /home/marce/projetos/TradingSystem
bash scripts/docs/install-and-build-docusaurus.sh --verbose
```

> Optional flags: add `--force` (alias `--auto-clean`) to auto-clean Phase 2 artifacts, `--skip-build` to skip the production build, or `--dry-run` to simulate the flow.

### Option B: Manual

```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus
npm install
npm run build
```

## Post-Installation Validation

### Dependencies

- [ ] package-lock.json created: `test -f package-lock.json`
- [ ] node_modules/ created: `test -d node_modules`
- [ ] Package count: `find node_modules -maxdepth 1 -type d | wc -l` (should be 1200+)
- [ ] Docusaurus core: `test -d node_modules/@docusaurus/core`
- [ ] React 18.2.0: `cat node_modules/react/package.json | jq -r '.version'`
- [ ] PlantUML plugin: `test -d node_modules/@akebifiky/remark-simple-plantuml`
- [ ] Mermaid theme: `test -d node_modules/@docusaurus/theme-mermaid`
- [ ] dotenv: `test -d node_modules/dotenv`

### Security

- [ ] Run audit: `npm audit` (non-zero exit code is normal if vulnerabilities found)
- [ ] No critical vulnerabilities: `npm audit --json | jq '.metadata.vulnerabilities.critical'` (should be 0)
- [ ] Review moderate/high: `npm audit --json | jq '.metadata.vulnerabilities'`
- [ ] Audit JSON generated: `ls npm-audit-*.json` (script creates default if audit fails)

### Plugins

- [ ] PlantUML configured: `grep -q 'remarkSimplePlantuml' docusaurus.config.ts`
- [ ] Mermaid enabled: `grep -q 'mermaid: true' docusaurus.config.ts`
- [ ] PlantUML files found: `find ../../docs/context -name '*.puml' | wc -l` (should be 33)

### Environment

- [ ] Root .env exists: `test -f ../../.env` (or using defaults from config/.env.defaults)
- [ ] Config defaults exist: `test -f ../../config/.env.defaults`
- [ ] dotenv.config() call verified: `grep -q 'dotenv.config(' docusaurus.config.ts`
- [ ] Root env path reference verified: `grep -q "path.join(projectRoot, '.env')" docusaurus.config.ts`
- [ ] Env snapshot saved: `ls env-test-*.json` (timestamped file)
- [ ] Snapshot parses: `jq '.' env-test-*.json >/dev/null`
- [ ] Snapshot referenced in reports: `grep -q env-test DEPENDENCY-REPORT-*.md`

## Build Validation

### Build Execution

- [ ] Build completed: `npm run build`
- [ ] Exit code 0: `echo $?`
- [ ] No fatal errors in output

### Build Output

- [ ] build/ directory: `test -d build`
- [ ] index.html: `test -f build/index.html`
- [ ] docs/ directory: `test -d build/docs`
- [ ] search/ directory: `test -d build/search`
- [ ] health/ directory: `test -d build/health`
- [ ] assets/ directory: `test -d build/assets`
- [ ] JS bundles: `find build/assets -name '*.js' | wc -l` (should be 40+)
- [ ] CSS bundles: `find build/assets -name '*.css' | wc -l` (should be 10+)
- [ ] Build size: `du -sh build` (should be 8-10 MB)
- [ ] File count: `find build -type f | wc -l` (should be 1500+)

### Generated Assets

- [ ] static/spec/ created: `test -d static/spec`
- [ ] OpenAPI spec: `test -f static/spec/openapi.yaml` (optional)

### TypeScript

- [ ] No compilation errors: `npm run typecheck`

## Reports Generated

- [ ] Installation log: `ls INSTALL-LOG-*.md`
- [ ] Build log: `ls BUILD-LOG-*.md`
- [ ] Dependency report: `ls DEPENDENCY-REPORT-*.md`
- [ ] Dependency JSON: `ls DEPENDENCY-REPORT-*.json` (with valid JSON for build.completed)
- [ ] Audit report: `ls npm-audit-*.json` (auto-generated even on audit failure)
- [ ] Environment snapshot: `ls env-test-*.json` (timestamped, referenced in reports)

## Quick Verification Commands

```bash
# All-in-one verification
test -f package-lock.json && \
test -d node_modules && \
test -d build && \
test -f build/index.html && \
echo "✅ Phase 3 completed successfully" || \
echo "❌ Phase 3 incomplete"

# Detailed check
echo "Dependencies: $(find node_modules -maxdepth 1 -type d | wc -l) packages"
echo "Build size: $(du -sh build | cut -f1)"
echo "Build files: $(find build -type f | wc -l)"
echo "React version: $(cat node_modules/react/package.json | jq -r '.version')"
echo "Docusaurus version: $(cat node_modules/@docusaurus/core/package.json | jq -r '.version')"
```

## Troubleshooting Quick Fixes

### npm install fails

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Build fails with OOM

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### TypeScript errors

```bash
rm -rf node_modules package-lock.json
npm install
npm run typecheck
```

### Rollback to Phase 2

```bash
rm -rf node_modules .docusaurus build package-lock.json
```

## Success Criteria

Phase 3 is complete when:

- ✅ All dependencies installed (1200+ packages)
- ✅ No critical security vulnerabilities (audit JSON generated)
- ✅ Plugins verified (PlantUML, Mermaid)
- ✅ Environment loading verified (dotenv config + runtime test + snapshot saved)
- ✅ Build completed successfully
- ✅ Build output valid (8-10 MB, 1500+ files)
- ✅ No TypeScript errors
- ✅ All reports generated (install, build, dependency, audit, env snapshot)

## Next Steps

After Phase 3:

1. [ ] Review reports: `cat DEPENDENCY-REPORT-*.md`
2. [ ] Check security: `cat npm-audit-*.json | jq '.metadata.vulnerabilities'`
3. [ ] Proceed to Phase 4: `npm run dev`
4. [ ] Keep Phase 1 backup until Phase 4 verified

## Sign-off

If all checks pass:

- [ ] Phase 3 completed successfully ✅
- [ ] Dependencies installed ✅
- [ ] Build successful ✅
- [ ] Ready for Phase 4 ✅

**Completed by:** [Name]
**Date:** [Timestamp]
**Installation log:** INSTALL-LOG-{timestamp}.md
**Build log:** BUILD-LOG-{timestamp}.md

