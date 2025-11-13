# Dev Container Policy

**Status:** ✅ Active
**Version:** 1.0
**Last Updated:** 2025-11-12
**Owner:** DevOps Team
**Reviewers:** All Developers

---

## 🎯 Purpose

This policy establishes **mandatory use** of the Dev Container for all development work on the TradingSystem project, ensuring consistency, security, and reproducibility across all developer environments.

---

## 📋 Policy Statements

### 1. Mandatory Use

**POLICY:** All developers MUST use the Dev Container for all development activities.

**Rationale:**
- ✅ Ensures identical development environment for all team members
- ✅ Eliminates "works on my machine" issues
- ✅ Aligns development environment with CI/CD pipelines
- ✅ Enforces security controls and compliance

**Exceptions:**
- Emergency hotfixes (with explicit approval from Tech Lead)
- Infrastructure work that requires host-level access
- Documentation-only changes (markdown files)

**Approval Required:** Tech Lead or DevOps Lead

---

### 2. Configuration Modifications

**POLICY:** Modifications to Dev Container configuration files require approval via Pull Request.

**Files Requiring Approval:**
- `.devcontainer/devcontainer.json`
- `.devcontainer/Dockerfile`
- `.devcontainer/docker-compose.yml` (if exists)
- `.devcontainer/scripts/*`

**Approval Process:**
1. Create PR with proposed changes
2. Provide justification in PR description
3. Tag `@devops-team` for review
4. Minimum 1 approval from DevOps team
5. Test changes in isolated environment before merge

**Rationale:**
- Configuration changes affect ALL developers
- Breaking changes can block team productivity
- Security implications need review

---

### 3. Environment Variable Management

**POLICY:** Environment variables MUST follow the centralized `.env` pattern.

**Rules:**

#### ✅ ALLOWED:
```bash
# .env (project root)
WORKSPACE_PROXY_TARGET=http://workspace-api:3200
TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005
DATABASE_URL=postgresql://user:pass@host:5432/db

# .env.local (git-ignored, personal overrides)
MY_API_KEY=personal_key_here
```

#### ❌ FORBIDDEN:
```bash
# Service-specific .env files
backend/api/workspace/.env  # NO!
frontend/dashboard/.env     # NO!

# Hardcoded values in code
const apiKey = "hardcoded_key";  # NO!

# VITE_ prefix for proxy targets (exposes to browser)
VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200  # NO!
```

**Enforcement:**
- Pre-commit hook validates `.env` structure
- CI pipeline checks for hardcoded secrets
- ESLint rule blocks hardcoded URLs

**Validation:**
```bash
bash scripts/env/validate-env.sh
```

---

### 4. Secret Handling

**POLICY:** Secrets MUST NEVER be committed to version control.

**Rules:**

#### ✅ CORRECT:
```bash
# .env (git-ignored via .gitignore)
DATABASE_PASSWORD=secret_password
API_KEY=secret_key

# .env.example (committed - template only)
DATABASE_PASSWORD=your_password_here
API_KEY=your_api_key_here
```

#### ❌ FORBIDDEN:
```bash
# Committing .env file
git add .env  # NO!

# Hardcoding secrets
const password = "my_password";  # NO!

# Secrets in docker-compose
environment:
  - PASSWORD=hardcoded_password  # NO!
```

**Detection:**
- `secrets-scanner` runs on pre-commit
- CI pipeline scans all commits
- Pull requests rejected if secrets detected

**Remediation:**
If secret is committed:
1. Immediately rotate the exposed secret
2. Remove from git history: `git filter-branch` or BFG Repo-Cleaner
3. Notify security team
4. Document incident in `security/incidents/`

---

### 5. Version Pinning

**POLICY:** All runtime versions MUST be pinned in Dev Container configuration.

**Pinned Versions:**
```dockerfile
# .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/base:jammy

# Node.js - PINNED
RUN nvm install 20.11.0 && nvm use 20.11.0

# Python - PINNED
RUN pyenv install 3.12.1 && pyenv global 3.12.1

# Docker CLI - PINNED
RUN apt-get install docker-ce-cli=5:24.0.7-1~ubuntu.22.04~jammy
```

**Rationale:**
- Reproducible builds
- Avoid breaking changes from automatic updates
- CI/CD parity

**Update Process:**
1. Test new version in isolated branch
2. Update Dockerfile with new pinned version
3. Create PR with test results
4. Coordinate upgrade with team (announce in Slack)
5. Merge and notify team to rebuild containers

---

### 6. Pre-Commit Hooks

**POLICY:** Pre-commit hooks are MANDATORY and MUST NOT be bypassed.

**Enabled Hooks:**
- ESLint (JavaScript/TypeScript)
- Prettier (Code formatting)
- shellcheck (Bash scripts)
- secrets-scanner (Detect secrets)
- env-validator (Validate `.env` structure)
- docker-compose validator (Validate compose files)

**Enforcement:**
```bash
# Install hooks (automatic on first commit)
npx husky install

# Bypass is FORBIDDEN (except emergencies)
git commit --no-verify  # ❌ NEVER DO THIS
```

**Emergency Bypass:**
- Requires justification in commit message
- Automated Slack notification to `#dev-alerts`
- Subject to audit review

---

### 7. CI/CD Alignment

**POLICY:** Dev Container environment MUST match CI/CD pipeline environment.

**Alignment Requirements:**

| Component | Dev Container | CI/CD Pipeline | Match |
|-----------|---------------|----------------|-------|
| Node.js version | 20.11.0 | 20.11.0 | ✅ |
| Python version | 3.12.1 | 3.12.1 | ✅ |
| Docker CLI | 24.0.7 | 24.0.7 | ✅ |
| npm version | latest | latest | ✅ |
| OS | Ubuntu 22.04 | Ubuntu 22.04 | ✅ |

**Validation:**
```bash
# Run CI checks locally (before push)
npm run ci

# Expected output:
# ✅ Linting passed
# ✅ Tests passed
# ✅ Build succeeded
```

**If CI fails but local passes:**
- Check version alignment
- Check environment variables
- Rebuild Dev Container
- Contact DevOps if issue persists

---

## 🔐 Security Controls

### 1. Docker Socket Access

**POLICY:** Docker socket access is granted but MUST be used responsibly.

**Permitted Uses:**
- ✅ Managing Docker Compose stacks
- ✅ Running `docker ps`, `docker logs`
- ✅ Starting/stopping containers for development

**Forbidden Uses:**
- ❌ Running untrusted Docker images
- ❌ Mounting host root filesystem (`-v /:/host`)
- ❌ Privileged containers (`--privileged`)
- ❌ Disabling security features (`--security-opt`)

**Monitoring:**
- Docker audit logs reviewed weekly
- Suspicious activity triggers alerts
- Violations subject to policy review

---

### 2. Network Isolation

**POLICY:** Dev Container MUST be connected to approved Docker networks only.

**Approved Networks:**
```json
// .devcontainer/devcontainer.json
{
  "runArgs": [
    "--network=tradingsystem_backend",
    "--network=tradingsystem_frontend"
  ]
}
```

**Forbidden:**
- ❌ `--network=host` (exposes all ports)
- ❌ Custom networks without approval
- ❌ Bridging to production networks

---

### 3. Volume Mounts

**POLICY:** Only approved volume mounts are permitted.

**Approved Mounts:**
```json
{
  "mounts": [
    "source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind",
    "source=tradingsystem-node-modules,target=/workspace/node_modules,type=volume",
    "source=tradingsystem-python-venv,target=/workspace/.venv,type=volume"
  ]
}
```

**Forbidden:**
- ❌ Host root mount: `source=/,target=/host`
- ❌ Sensitive directories: `/etc`, `/var/log`, `/root`
- ❌ Other users' home directories

---

## 📊 Compliance & Auditing

### Validation Checklist

Before committing code, ALL developers MUST run:

```bash
# 1. Environment validation
bash scripts/env/validate-env.sh

# 2. Pre-commit hooks
git commit  # (hooks run automatically)

# 3. Local CI checks
npm run ci

# 4. Security scan
npm audit --audit-level=moderate
```

### Audit Schedule

| Audit Type | Frequency | Owner |
|------------|-----------|-------|
| Dev Container config changes | Every PR | DevOps Team |
| Secret detection | Every commit | CI Pipeline |
| Docker audit logs | Weekly | Security Team |
| Environment variable compliance | Monthly | DevOps Team |
| Version alignment check | Monthly | DevOps Team |

---

## 🚨 Policy Violations

### Severity Levels

**Critical (Immediate Action):**
- Committing secrets to repository
- Bypassing pre-commit hooks without justification
- Running privileged containers

**High (Fix within 24h):**
- Modifying Dev Container config without approval
- Using unapproved Docker networks
- Hardcoded environment variables in code

**Medium (Fix within 1 week):**
- Service-specific `.env` files
- Using `VITE_` prefix for proxy targets
- Missing environment variable documentation

### Remediation Process

1. **Detection:** Automated scanner or manual review flags violation
2. **Notification:** Developer notified via Slack + email
3. **Fix:** Developer creates PR to resolve issue
4. **Review:** DevOps/Security team reviews fix
5. **Documentation:** Incident logged in `governance/evidence/violations/`

---

## 📖 References

**Documentation:**
- [Dev Container Overview](../../docs/content/tools/dev-container/overview.mdx)
- [Dev Container Architecture](../../docs/content/tools/dev-container/architecture.mdx)
- [Dev Container Security Guide](../controls/dev-container-security.md)

**Related Policies:**
- [API Gateway Policy](api-gateway-policy.md)
- [Environment Variables Policy](environment-variables-policy.md)
- [Secret Management Policy](secret-management-policy.md)

---

## 📝 Policy Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-12 | Initial policy creation | DevOps Team |

---

## ✅ Acknowledgment

By using the Dev Container, all developers acknowledge they have:
- ✅ Read and understood this policy
- ✅ Completed Dev Container onboarding
- ✅ Configured local environment according to standards
- ✅ Agree to comply with all policy requirements

**Questions?** Contact `@devops-team` in Slack or email devops@tradingsystem.local

---

**Policy Status:** ✅ Active
**Next Review:** 2026-02-12 (3 months)
