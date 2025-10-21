# Phase 3: Docusaurus Installation & Build Guide

**Purpose:** Install dependencies, verify plugins, and test production build
**Prerequisites:** Phase 2 cleanup completed successfully
**Estimated time:** 5-10 minutes (depending on network speed)
**Risk level:** LOW (backup available for rollback)

## Overview

What Phase 3 accomplishes:

- Installs all npm dependencies from package.json (35 packages)
- Generates package-lock.json with dependency tree
- Verifies plugin installation (PlantUML, Mermaid)
- Tests environment variable loading from root .env
- Captures environment variable snapshot to `env-test-{timestamp}.json`
- Executes production build (npm run build)
- Validates build output structure and completeness
- Generates comprehensive dependency report
- Prepares for Phase 4 (dev server validation)

## Prerequisites

Before starting Phase 3:

1. ✅ Phase 2 cleanup completed successfully
2. ✅ No artifacts present: node_modules, .docusaurus, build, package-lock.json (use `--force` to auto-clean if they remain)
3. ✅ Source files intact: src/, static/, scripts/, configuration files
4. ✅ Phase 1 backup available: Any `.backup-docusaurus-*` directory (script detects all backups regardless of date)
5. ✅ Node.js >= 20.0.0 installed: `node --version`
6. ✅ npm installed: `npm --version`
7. ✅ jq installed: `jq --version` (required for JSON parsing)
8. ✅ Disk space >= 1000 MB: `df -h`
9. ✅ Internet connection available (for npm install)

## Installation Methods

Two methods available:

### Method 1: Automated Script (Recommended)

Use the installation script from `scripts/docs/install-and-build-docusaurus.sh`:

```bash
cd /home/marce/projetos/TradingSystem
bash scripts/docs/install-and-build-docusaurus.sh --verbose
```

**Advantages:**

- ✅ Automated validation (pre/post installation)
- ✅ Comprehensive logging (install + build logs)
- ✅ Dependency verification (npm audit, plugin checks)
- ✅ Environment variable testing (snapshot saved to `env-test-{timestamp}.json`)
- ✅ Build output validation
- ✅ Detailed reports (markdown + JSON)
- ✅ Rollback instructions if errors occur

**Options:**

- `--verbose` - Show detailed output (recommended)
- `--skip-build` - Only install dependencies, skip build
- `--dry-run` - Simulate without actual installation
- `--force` (alias: `--auto-clean`) - Automatically remove leftover Phase 2 artifacts (node_modules, .docusaurus, build, package-lock.json) before installing

### Method 2: Manual Installation

Follow step-by-step commands:

```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus

# 1. Verify prerequisites
node --version  # Should be >= 20.0.0
npm --version
df -h  # Check disk space

# 2. Install dependencies
npm install

# 3. Verify installation
test -f package-lock.json && echo "✅ package-lock.json created"
test -d node_modules && echo "✅ node_modules created"
find node_modules -maxdepth 1 -type d | wc -l  # Count packages

# 4. Verify critical dependencies
test -d node_modules/@docusaurus/core && echo "✅ Docusaurus core"
test -d node_modules/@akebifiky/remark-simple-plantuml && echo "✅ PlantUML plugin"
test -d node_modules/@docusaurus/theme-mermaid && echo "✅ Mermaid theme"
test -d node_modules/react && echo "✅ React"
test -d node_modules/dotenv && echo "✅ dotenv"

# 5. Check versions
cat node_modules/react/package.json | jq -r '.version'  # Should be 18.2.0
cat node_modules/@docusaurus/core/package.json | jq -r '.version'  # Should be 3.9.1

# 6. Run security audit (non-zero exit codes are normal if vulnerabilities found)
npm audit
# Note: The automated script handles non-zero exit codes gracefully and creates
# a default JSON report if npm audit fails or produces invalid output

# 7. Test environment loading
node -e "const path = require('path'); const dotenv = require('dotenv'); dotenv.config({ path: path.join(__dirname, '../../.env') }); console.log('DOCS_SITE_URL:', process.env.DOCS_SITE_URL || 'http://localhost');"

# 8. Build production site
npm run build

# 9. Verify build output
test -d build && echo "✅ build/ directory created"
test -f build/index.html && echo "✅ index.html present"
du -sh build  # Check build size
find build -type f | wc -l  # Count generated files

# 10. Check TypeScript
npm run typecheck
```

**Advantages:**

- ✅ Full control over each step
- ✅ Can inspect results after each command
- ✅ Good for learning the process

**Disadvantages:**

- ⚠️ Manual validation required
- ⚠️ No automatic logging
- ⚠️ More error-prone

## What Gets Installed

### Core Dependencies (9 packages)

1. **@docusaurus/core** (3.9.1) - Core Docusaurus framework
2. **@docusaurus/preset-classic** (3.9.1) - Classic theme preset
3. **@docusaurus/theme-mermaid** (^3.9.1) - Mermaid diagram support
4. **@akebifiky/remark-simple-plantuml** (^1.0.2) - PlantUML rendering
5. **@mdx-js/react** (^3.0.0) - MDX support
6. **react** (18.2.0) - React library (pinned for plugin compatibility)
7. **react-dom** (18.2.0) - React DOM (pinned for plugin compatibility)
8. **dotenv** (^16.4.5) - Environment variable loading
9. **gray-matter** (^4.0.3) - Frontmatter parsing

### Supporting Dependencies (26 packages)

- clsx, prism-react-renderer, lucide-react, etc.
- Total: 35 direct dependencies
- With transitive dependencies: 1,200+ packages in node_modules

### Why React 18.2.0 is Pinned

- React 19 support in community plugins is still stabilizing
- Pinning to 18.2.0 ensures compatibility with PlantUML and Mermaid plugins
- See README.md line 3 for details
- Can be upgraded after testing all plugins with React 19

## Environment Variables

### How Environment Loading Works

1. `docusaurus.config.ts` loads root `.env` using dotenv (lines 8-10)
2. Path: `../../.env` (relative to docs/docusaurus/)
3. Defaults in `config/.env.defaults` are used if .env is empty
4. All `process.env.*` references resolve from root .env

### Environment Configuration Verification

The installation script verifies the dotenv configuration in `docusaurus.config.ts`:

1. ✅ Checks for `dotenv.config()` call presence
2. ✅ Verifies `path.join(projectRoot, '.env')` reference
3. ✅ Tests runtime loading with Node.js script
4. ✅ Captures environment snapshot to `env-test-{timestamp}.json`

This multi-layered validation ensures the centralized `.env` file is correctly loaded.

### Required Variables (all have defaults)

- `DOCS_SITE_URL` - Full site URL (default: http://localhost)
- `DOCS_BASE_URL` - Base path (default: /)
- `SEARCH_API_URL` - Documentation API for search (default: http://localhost:3400/api/v1/docs)
- `HEALTH_API_URL` - Health metrics API (default: http://localhost:3400/api/v1/docs/health)
- `GRAFANA_URL` - Grafana dashboard link (default: http://localhost:3000/d/docs-health)
- `PLANTUML_BASE_URL` - PlantUML server (default: https://www.plantuml.com/plantuml/svg)
- `CORS_ORIGIN` - Allowed origins (default: http://localhost:3103,http://localhost:3004)

### Testing Environment Loading

```bash
# Quick test
node -e "const path = require('path'); const dotenv = require('dotenv'); dotenv.config({ path: path.join(__dirname, '../../.env') }); console.log(JSON.stringify({ DOCS_SITE_URL: process.env.DOCS_SITE_URL || 'http://localhost', DOCS_BASE_URL: process.env.DOCS_BASE_URL || '/', SEARCH_API_URL: process.env.SEARCH_API_URL || 'http://localhost:3400/api/v1/docs' }, null, 2));"
```

> The automated script captures this output automatically in `env-test-{timestamp}.json`, which is referenced in the final reports.

## Plugin Verification

### PlantUML Plugin

- **Package:** @akebifiky/remark-simple-plantuml
- **Version:** 1.0.2
- **Configuration:** docusaurus.config.ts lines 91-98
- **Usage:** Code blocks with `plantuml` language tag
- **Server:** Configurable via PLANTUML_BASE_URL
- **Files:** 33 .puml files in docs/context/shared/diagrams/
- **Example:** See docs/context/shared/diagrams/plantuml-guide.md

**Verification Commands:**

```bash
# Check package installed
test -d node_modules/@akebifiky/remark-simple-plantuml && echo "✅ PlantUML plugin installed"

# Check version
cat node_modules/@akebifiky/remark-simple-plantuml/package.json | jq -r '.version'

# Check configuration
grep -q 'remarkSimplePlantuml' docusaurus.config.ts && echo "✅ PlantUML configured"

# Count PlantUML files
find ../../docs/context -name '*.puml' | wc -l
```

### Mermaid Plugin

- **Package:** @docusaurus/theme-mermaid
- **Version:** 3.9.1
- **Configuration:** docusaurus.config.ts lines 25-28
- **Usage:** Code blocks with `mermaid` language tag
- **Built-in:** Part of Docusaurus 3.x
- **Example:** See Docusaurus documentation

**Verification Commands:**

```bash
# Check package installed
test -d node_modules/@docusaurus/theme-mermaid && echo "✅ Mermaid theme installed"

# Check version
cat node_modules/@docusaurus/theme-mermaid/package.json | jq -r '.version'

# Check configuration
grep -q 'mermaid: true' docusaurus.config.ts && echo "✅ Mermaid enabled"
grep -q '@docusaurus/theme-mermaid' docusaurus.config.ts && echo "✅ Mermaid theme loaded"
```

## Build Process

**Build Command:** `npm run build`

### Build Steps

1. **prebuild**: Runs `scripts/sync-spec.js` (line 11 in package.json)
   - Syncs docs/spec/ to static/spec/
   - Copies openapi.yaml, asyncapi.yaml, portal.html
   - Warns if source not found (non-fatal)
2. **build**: Runs `docusaurus build` (line 12)
   - Compiles TypeScript
   - Processes MDX files
   - Renders PlantUML diagrams
   - Generates static HTML/CSS/JS
   - Optimizes assets
   - Creates build/ directory

### Build Output Structure

```
build/
├── index.html              # Main entry point
├── docs/                   # Documentation pages
│   ├── backend/
│   ├── frontend/
│   ├── ops/
│   └── shared/
├── search/                 # Search page
│   └── index.html
├── health/                 # Health dashboard
│   └── index.html
├── assets/                 # JS/CSS bundles (hashed)
│   ├── css/
│   │   ├── styles.*.css
│   │   └── ...
│   └── js/
│       ├── main.*.js
│       ├── runtime~main.*.js
│       └── ...
└── img/                    # Images and icons
    ├── logo.svg
    ├── logo-dark.svg
    └── ...
```

### Expected Build Results

- Build size: 8-10 MB
- Files generated: 1,500-2,000 files
- JS bundles: 40-50 files
- CSS bundles: 10-15 files
- Build time: 60-90 seconds (depends on CPU)

### Memory Requirements

- Minimum: 2048 MB
- Recommended: 4096 MB (configured in dev script)
- If build fails with OOM: Increase NODE_OPTIONS="--max-old-space-size=4096"

## Validation Checklist

### Post-Installation Validation

- [ ] package-lock.json created and valid JSON
- [ ] node_modules/ directory created
- [ ] 1,200+ packages installed in node_modules
- [ ] @docusaurus/core 3.9.1 present
- [ ] react 18.2.0 present (pinned version)
- [ ] @akebifiky/remark-simple-plantuml present
- [ ] @docusaurus/theme-mermaid present
- [ ] dotenv present
- [ ] npm audit shows no critical vulnerabilities

### Post-Build Validation

- [ ] build/ directory created
- [ ] build/index.html exists
- [ ] build/docs/ directory exists
- [ ] build/search/ directory exists
- [ ] build/health/ directory exists
- [ ] build/assets/ directory exists with JS/CSS
- [ ] build/img/ directory exists with images
- [ ] static/spec/ generated by sync-spec.js
- [ ] Build size reasonable (8-10 MB)
- [ ] No TypeScript compilation errors

### Environment Validation

- [ ] Root .env file exists (or using defaults)
- [ ] docusaurus.config.ts loads root .env
- [ ] All environment variables have values (defaults OK)
- [ ] CORS_ORIGIN includes http://localhost:3004

### Plugin Validation

- [ ] PlantUML plugin installed and configured
- [ ] Mermaid theme installed and configured
- [ ] 33 .puml files found in docs/context

## Troubleshooting

### Problem: npm install fails with network error

**Solution:**

1. Check internet connection: `ping npmjs.org`
2. Try with different registry: `npm install --registry https://registry.npmjs.org`
3. Clear npm cache: `npm cache clean --force`
4. Retry: `npm install`
5. If behind proxy, configure: `npm config set proxy http://proxy:port`

### Problem: npm install fails with EACCES permission error

**Solution:**

1. Don't use sudo with npm install
2. Fix npm permissions: `sudo chown -R $USER ~/.npm`
3. Retry: `npm install`
4. If still fails, use nvm to manage Node.js versions

### Problem: React version mismatch warning

**Solution:**

1. This is expected - React is pinned to 18.2.0
2. Check installed version: `cat node_modules/react/package.json | jq -r '.version'`
3. Should be exactly 18.2.0 (not 18.2.x or 18.3.x)
4. If wrong version, delete node_modules and package-lock.json, retry npm install

### Problem: npm run build fails with out of memory

**Solution:**

1. Check available memory: `free -m`
2. Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run build`
3. Close other applications to free memory
4. If still fails, increase to 6144 or 8192 MB
5. Consider using npm run dev instead (incremental builds)

### Problem: sync-spec.js fails with ENOENT

**Solution:**

1. This is non-fatal - sync-spec.js warns but continues
2. Check if docs/spec/ exists: `test -d ../../docs/spec && echo "exists" || echo "missing"`
3. If missing, create it: `mkdir -p ../../docs/spec`
4. Or ignore - static/spec/ is optional
5. Build will succeed without it

### Problem: PlantUML diagrams not rendering

**Solution:**

1. Check plugin installed: `test -d node_modules/@akebifiky/remark-simple-plantuml`
2. Check configuration: `grep 'remarkSimplePlantuml' docusaurus.config.ts`
3. Verify PLANTUML_BASE_URL is accessible: `curl -I https://www.plantuml.com/plantuml/svg`
4. If offline, set up local PlantUML server
5. Update PLANTUML_BASE_URL in root .env

### Problem: Build succeeds but files missing in build/

**Solution:**

1. Check build log for warnings
2. Verify source files exist in docs/context/
3. Check sidebars.ts configuration
4. Run clean build: `npm run clear && npm run build`
5. Check for broken links in markdown files

### Problem: TypeScript compilation errors

**Solution:**

1. Check TypeScript version: `cat node_modules/typescript/package.json | jq -r '.version'`
2. Should be ~5.6.2
3. Run typecheck: `npm run typecheck`
4. Fix errors in src/ files
5. If errors in node_modules, delete and reinstall

## Rollback Procedure

If Phase 3 fails and cannot be fixed:

```bash
# 1. Stop all processes
pkill -f docusaurus
pkill -f npm

# 2. Remove failed installation
cd /home/marce/projetos/TradingSystem/docs/docusaurus
rm -rf node_modules
rm -rf .docusaurus
rm -rf build
rm -f package-lock.json

# 3. Restore from Phase 1 backup (if needed)
cd /home/marce/projetos/TradingSystem
rsync -av .backup-docusaurus-{timestamp}/docusaurus/ docs/docusaurus/

# 4. Verify restoration
cd docs/docusaurus
test -f package.json && echo "✅ package.json restored"
test -d src && echo "✅ src/ restored"
find src -type f | wc -l  # Should be 24

# 5. Review error logs
cat INSTALL-LOG-*.md
cat BUILD-LOG-*.md

# 6. Fix issues and retry Phase 3
```

## Next Steps

After successful Phase 3:

1. ✅ Review installation reports:

   - `cat INSTALL-LOG-{timestamp}.md`
   - `cat BUILD-LOG-{timestamp}.md`
   - `cat DEPENDENCY-REPORT-{timestamp}.md`

2. ✅ Verify build output:

   - `ls -la build/`
   - `du -sh build/`
   - `find build -type f | wc -l`

3. ✅ Check security audit:

   - `cat npm-audit-{timestamp}.json | jq '.metadata.vulnerabilities'`
   - If critical vulnerabilities: `npm audit fix`

4. ✅ Proceed to Phase 4:

   - Start dev server: `npm run dev` (port 3004)
   - Validate functionality (search, health, diagrams)
   - Test theme (dark/light mode, sidebar)
   - Verify API integrations

5. ✅ Keep Phase 1 backup until Phase 4 verified

6. ✅ Document any issues or customizations

## Success Criteria

Phase 3 is successful when:

- ✅ npm install completed without errors
- ✅ All 35 dependencies installed
- ✅ package-lock.json generated
- ✅ No critical security vulnerabilities
- ✅ PlantUML and Mermaid plugins verified
- ✅ Environment variables loading correctly
- ✅ npm run build completed successfully
- ✅ build/ directory contains expected structure
- ✅ Build size reasonable (8-10 MB)
- ✅ No TypeScript compilation errors
- ✅ Reports generated (install, build, dependency)
- ✅ Ready for Phase 4 (dev server validation)

## Reports Generated

Phase 3 generates the following reports:

1. **INSTALL-LOG-{timestamp}.md**

   - npm install output
   - Dependency installation details
   - Warnings and errors

2. **BUILD-LOG-{timestamp}.md**

   - npm run build output
   - Build process details
   - Compilation warnings

3. **DEPENDENCY-REPORT-{timestamp}.md**

   - Comprehensive dependency analysis
   - Installed packages with versions
   - Security audit summary
   - Plugin verification results
   - Environment variable status
   - Build output summary

4. **DEPENDENCY-REPORT-{timestamp}.json**

   - Machine-readable dependency report
   - For automation and CI/CD

5. **npm-audit-{timestamp}.json**

   - Security audit results
   - Vulnerability details
   - Remediation suggestions
   - Automatically generated even if npm audit returns non-zero exit code

6. **env-test-{timestamp}.json**
   - Environment variable snapshot
   - Captured during runtime loading test
   - Referenced in dependency reports
   - Validates centralized .env configuration

All reports are saved in `/home/marce/projetos/TradingSystem/docs/docusaurus/`

## Time Estimates

- Pre-installation validation: 30 seconds
- npm install: 2-5 minutes (depends on network)
- Dependency verification: 30 seconds
- Security audit: 10 seconds
- Plugin verification: 10 seconds
- Environment testing: 10 seconds
- npm run build: 60-90 seconds
- Build verification: 20 seconds
- Report generation: 10 seconds
- **Total: 5-10 minutes**

## Safety Notes

⚠️ **IMPORTANT:**

- Always verify Phase 2 cleanup completed before Phase 3
- Keep Phase 1 backup until Phase 4 verified
- Review security audit results before production
- Test environment variable loading before deployment
- Validate build output structure before serving
- Document any dependency version changes
- Keep installation logs for troubleshooting

✅ **SAFE TO PROCEED:**

- npm install is idempotent (can retry safely)
- Build process doesn't modify source files
- All artifacts can be regenerated
- Backup available for rollback
- Comprehensive validation at each step

