# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the TradingSystem project.

## 📋 Workflow Overview

### 🎯 Active Workflows

| Workflow | Trigger | Purpose | Status Badge |
|----------|---------|---------|--------------|
| **Bundle Size Check** | PR to main/develop | Validates bundle sizes against budgets | ![Bundle Size](https://github.com/YOUR_USERNAME/TradingSystem/workflows/Bundle%20Size%20Check/badge.svg) |
| **Bundle Monitoring** | Weekly (Mon 9 AM) | Tracks bundle size trends | ![Bundle Monitoring](https://github.com/YOUR_USERNAME/TradingSystem/workflows/Bundle%20Monitoring/badge.svg) |
| **Code Quality** | PR, Push to main/dev | Linting, TypeScript, formatting | ![Code Quality](https://github.com/YOUR_USERNAME/TradingSystem/workflows/Code%20Quality/badge.svg) |
| **Automated Tests** | PR, Push to main/dev | Unit, integration, E2E tests | ![Tests](https://github.com/YOUR_USERNAME/TradingSystem/workflows/Automated%20Tests/badge.svg) |
| **Docker Build** | PR, Push (Docker files) | Build & security scan | ![Docker](https://github.com/YOUR_USERNAME/TradingSystem/workflows/Docker%20Build%20%26%20Security/badge.svg) |
| **Security Audit** | Weekly (Mon 2 AM), PR (deps) | Vulnerability scanning | ![Security](https://github.com/YOUR_USERNAME/TradingSystem/workflows/Security%20Audit/badge.svg) |
| **Documentation** | PR, Push (docs/) | Docusaurus build, validation | ![Docs](https://github.com/YOUR_USERNAME/TradingSystem/workflows/Documentation%20Validation/badge.svg) |
| **Health Check** | Every 6 hours, Manual | Infrastructure validation | ![Health](https://github.com/YOUR_USERNAME/TradingSystem/workflows/Infrastructure%20Health%20Check/badge.svg) |
| **Environment** | PR (env files) | .env validation | ![Env](https://github.com/YOUR_USERNAME/TradingSystem/workflows/Environment%20Validation/badge.svg) |

---

## 📚 Workflow Details

### 1. Bundle Size Check (`bundle-size-check.yml`)

**Trigger:** Pull requests to `main`/`develop`

**Purpose:** Prevent bundle size regressions

**What it does:**
- Builds production bundle
- Validates against budgets in `scripts/bundle-size-budgets.json`
- Compares with base branch
- Posts detailed comment on PR
- Uploads bundle analysis artifacts
- **Fails CI** if any chunk exceeds budget

**Budget Limits:**
- Total bundle: < 1 MB
- react-vendor: < 150 KB
- vendor: < 650 KB
- charts-vendor: < 280 KB

**Local testing:**
```bash
cd frontend/dashboard
npm run build
npm run check:bundle:size
```

---

### 2. Bundle Monitoring (`bundle-monitoring.yml`)

**Trigger:** Weekly (Mondays at 9 AM UTC) + Manual

**Purpose:** Track bundle size trends over time

**What it does:**
- Builds production bundle weekly
- Stores metrics in `.github/bundle-metrics.json`
- Generates trend reports
- Creates GitHub issue if bundle > 1.5 MB
- Uploads weekly reports as artifacts

**Metrics tracked:**
- Total bundle size
- JavaScript size
- CSS size
- Gzipped size
- Chunk count

---

### 3. Code Quality (`code-quality.yml`)

**Trigger:** PR, Push to `main`/`develop`

**Purpose:** Enforce code quality standards

**What it does:**
- **Frontend:** ESLint, TypeScript check, Prettier
- **Backend (Workspace):** ESLint
- **Backend (TP Capital):** ESLint
- **Documentation:** Linting

**Fix issues locally:**
```bash
# Frontend
cd frontend/dashboard
npm run lint -- --fix
npm run format

# Backend
cd backend/api/workspace
npm run lint -- --fix
```

---

### 4. Automated Tests (`test.yml`)

**Trigger:** PR, Push to `main`/`develop`

**Purpose:** Ensure code correctness

**What it does:**
- **Frontend:** Unit tests with coverage
- **Backend (Workspace):** API tests with TimescaleDB
- **Backend (TP Capital):** API tests
- **Python (RAG):** pytest with coverage
- Uploads coverage to Codecov

**Run tests locally:**
```bash
# Frontend
cd frontend/dashboard
npm run test

# Backend (Workspace)
cd backend/api/workspace
npm run test

# Python (RAG)
cd tools/llamaindex
pytest --cov
```

---

### 5. Docker Build & Security (`docker-build.yml`)

**Trigger:** PR/Push affecting Docker files

**Purpose:** Validate Docker images and scan for vulnerabilities

**What it does:**
- Builds all Docker images (workspace, tp-capital, dashboard, rag)
- Runs Trivy security scanner
- Uploads results to GitHub Security
- **Fails on CRITICAL vulnerabilities**
- Validates all docker-compose files
- Checks for hardcoded secrets

**Services scanned:**
- workspace-api
- tp-capital
- dashboard
- llamaindex-query

---

### 6. Security Audit (`security-audit.yml`)

**Trigger:** Weekly (Mondays 2 AM) + PR affecting dependencies

**Purpose:** Detect security vulnerabilities

**What it does:**
- **NPM Audit:** Scans all Node.js projects
- **Python Safety:** Scans Python dependencies
- **TruffleHog:** Detects leaked secrets
- **Dependency Review:** Analyzes new dependencies in PRs
- Uploads audit reports as artifacts

**Fix vulnerabilities:**
```bash
# NPM
npm audit fix

# Python
pip install safety
safety check
```

---

### 7. Documentation Validation (`docs-validation.yml`)

**Trigger:** PR/Push affecting `docs/` or `governance/`

**Purpose:** Ensure documentation quality

**What it does:**
- **Docusaurus Build:** Validates build succeeds
- **Frontmatter:** Checks required fields
- **Governance:** Validates JSON snapshot
- **PlantUML:** Validates diagram syntax
- **Markdown Links:** Checks for broken links
- **OpenAPI:** Validates API specs

**Fix documentation issues:**
```bash
# Build Docusaurus
cd docs
npm run build

# Validate frontmatter
bash scripts/governance/validate-frontmatter.sh

# Regenerate governance snapshot
node governance/automation/governance-metrics.mjs
```

---

### 8. Health Check (`health-check.yml`)

**Trigger:** Every 6 hours + Manual + PR affecting infrastructure

**Purpose:** Validate infrastructure health

**What it does:**
- Starts Docker infrastructure
- Verifies service health (TimescaleDB, QuestDB, Redis, Qdrant)
- Runs comprehensive health check script
- Validates all docker-compose files
- Checks for port conflicts
- Exports Prometheus metrics

**Run locally:**
```bash
bash scripts/maintenance/health-check-all.sh
```

---

### 9. Environment Validation (`env-validation.yml`)

**Trigger:** PR affecting `.env` files or Vite config

**Purpose:** Prevent environment configuration errors

**What it does:**
- Validates environment files with `scripts/env/validate-env.sh`
- **Checks for hardcoded secrets** (fails on detection)
- **Validates proxy configuration** (prevents VITE_ prefix on targets)
- **Checks for localhost URLs** in frontend code
- Validates `.env.example` completeness
- Checks Docker env_file references
- **Fails on local .env files** (all must use root .env)

**Critical checks:**
- ❌ `VITE_WORKSPACE_PROXY_TARGET` - Exposes container names!
- ✅ `WORKSPACE_PROXY_TARGET` - Correct (server-side only)
- ❌ `http://localhost:3200/api` - Use relative paths!
- ✅ `/api/workspace/items` - Correct (Vite proxy)

**Validate locally:**
```bash
bash scripts/env/validate-env.sh
```

---

## 🚨 Common Failures & Fixes

### Bundle Size Exceeded
```bash
cd frontend/dashboard
npm run build
npm run check:bundle:size

# If failed, identify large chunks
npm run analyze:bundle

# Apply optimizations (lazy loading, code splitting)
```

### Linting Errors
```bash
cd frontend/dashboard
npm run lint -- --fix
npm run format
```

### Test Failures
```bash
cd frontend/dashboard
npm run test -- --verbose
```

### Security Vulnerabilities
```bash
npm audit fix
# or
npm audit fix --force  # For breaking changes
```

### Docker Build Failure
```bash
docker build -t test-image -f backend/api/workspace/Dockerfile backend/api/workspace/
```

### Documentation Build Failure
```bash
cd docs
npm run build
# Check output for errors
```

### Environment Configuration Error
```bash
# Never use VITE_ prefix for proxy targets
# ❌ WRONG
VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200

# ✅ CORRECT
WORKSPACE_PROXY_TARGET=http://workspace-api:3200

# See: docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md
```

---

## 🔧 Workflow Configuration

### Secrets Required

Add these secrets in **Settings → Secrets and variables → Actions**:

| Secret | Purpose | Required By |
|--------|---------|-------------|
| `CODECOV_TOKEN` | Code coverage reporting | test.yml |

### Branch Protection Rules

**Recommended settings for `main` branch:**
- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass:
  - Code Quality
  - Automated Tests
  - Bundle Size Check
  - Docker Build & Security
  - Environment Validation
- ✅ Require branches to be up to date
- ✅ Require conversation resolution
- ✅ Include administrators

---

## 📊 Monitoring & Reports

### Artifacts Retention

| Workflow | Artifact | Retention |
|----------|----------|-----------|
| Bundle Size Check | `bundle-stats.html` | 7 days |
| Bundle Monitoring | `bundle-report-{date}` | 90 days |
| Automated Tests | `coverage-{service}` | 30 days |
| Security Audit | `audit-report-{service}` | 30 days |
| Health Check | `health-report-{run}` | 30 days |

### Weekly Reports

- **Bundle Monitoring:** Every Monday - Check `.github/bundle-metrics.json`
- **Security Audit:** Every Monday - Review artifacts for vulnerabilities

---

## 🎯 Best Practices

### For Developers

1. **Before committing:**
   ```bash
   npm run lint
   npm run test
   npm run build
   npm run check:bundle:size
   ```

2. **For environment changes:**
   ```bash
   bash scripts/env/validate-env.sh
   ```

3. **For Docker changes:**
   ```bash
   docker compose config
   ```

### For Reviewers

1. Check workflow status before approving PR
2. Review bundle size changes (< 1 MB total)
3. Ensure test coverage doesn't decrease
4. Verify no new security vulnerabilities
5. Check documentation builds successfully

---

## 🆘 Troubleshooting

### Workflow fails but passes locally

**Cause:** Different Node.js/npm versions

**Fix:**
```bash
# Use the same version as CI
nvm install 20
nvm use 20
```

### Cache issues

**Solution:** Re-run workflow or clear cache via Actions UI

### Secrets not available

**Solution:** Ensure secrets are set in repository settings

### Docker build timeout

**Solution:** Optimize Dockerfile with multi-stage builds and layer caching

---

## 📚 References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Bundle Optimization Guide](../frontend/dashboard/BUNDLE-OPTIMIZATION.md)
- [Proxy Best Practices](../docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md)
- [Health Check Guide](../scripts/maintenance/README.md)
- [Environment Setup](../docs/content/tools/security-config/env.mdx)

---

**Last Updated:** 2025-11-08
**Maintained By:** Development Team
