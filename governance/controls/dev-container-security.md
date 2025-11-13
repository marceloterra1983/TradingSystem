# Dev Container Security Guide

**Status:** ✅ Active
**Version:** 1.0
**Last Updated:** 2025-11-12
**Owner:** Security Team
**Reviewers:** DevOps Team, Development Team

---

## 🎯 Purpose

This guide establishes security controls, best practices, and procedures for the Dev Container environment to protect the TradingSystem codebase, infrastructure, and sensitive data.

---

## 🛡️ Security Principles

### Defense in Depth

The Dev Container implements multiple layers of security:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Host System Security                          │
│  ├─> OS hardening (Docker Desktop)                     │
│  ├─> Firewall rules                                    │
│  └─> Antivirus/EDR                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Container Isolation                           │
│  ├─> Non-root user (vscode)                            │
│  ├─> Resource limits                                   │
│  └─> Network segmentation                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Access Controls                               │
│  ├─> Docker socket (restricted)                        │
│  ├─> File permissions                                  │
│  └─> Secret management                                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Application Security                          │
│  ├─> Secret scanning                                   │
│  ├─> Dependency scanning                               │
│  └─> SAST/DAST                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ Security Risks

### 1. Docker Socket Access (Root Equivalent)

**Risk Level:** 🔴 **CRITICAL**

**Threat:**
Access to Docker socket (`/var/run/docker.sock`) is equivalent to **root access on the host**.

**Attack Scenario:**
```bash
# Inside Dev Container (with Docker socket)
docker run --rm -v /:/host -it alpine chroot /host /bin/bash
# Attacker now has root shell on HOST MACHINE!
```

**Mitigation:**

#### ✅ Technical Controls:
1. **Non-root user inside container**
   ```json
   // .devcontainer/devcontainer.json
   {
     "remoteUser": "vscode"  // UID 1000
   }
   ```

2. **Docker audit logging**
   ```bash
   # Enable audit logs (host)
   echo '--log-driver=json-file --log-opt max-size=10m' >> /etc/docker/daemon.json
   systemctl restart docker
   ```

3. **Network segmentation**
   ```yaml
   # Only approved networks
   networks:
     - tradingsystem_backend
     - tradingsystem_frontend
   ```

#### ✅ Process Controls:
1. Only trusted developers have access
2. Background checks for all team members
3. Audit Docker commands weekly
4. Immediate revocation on employee departure

#### ✅ Monitoring:
```bash
# Monitor suspicious Docker commands
docker events --filter 'event=create' --filter 'container' --format '{{.Actor.Attributes.image}} {{.Actor.Attributes.name}}'
```

**Forbidden Commands:**
```bash
# ❌ FORBIDDEN
docker run --privileged ...
docker run -v /:/host ...
docker run --security-opt apparmor=unconfined ...
docker run --cap-add=ALL ...
```

---

### 2. Container Escape

**Risk Level:** 🟠 **HIGH**

**Threat:**
Exploiting container vulnerabilities to escape to host system.

**Mitigation:**

#### ✅ Keep Base Image Updated:
```dockerfile
# .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/base:jammy  # Official Microsoft image

# Update packages regularly
RUN apt-get update && apt-get upgrade -y
```

#### ✅ Scan for Vulnerabilities:
```bash
# Scan base image
docker scan mcr.microsoft.com/devcontainers/base:jammy

# Scan built image
docker scan tradingsystem-dev-container
```

#### ✅ Limit Capabilities:
```json
// .devcontainer/devcontainer.json
{
  "capAdd": [],  // No additional capabilities
  "securityOpt": []  // No security overrides
}
```

---

### 3. Secret Exposure

**Risk Level:** 🔴 **CRITICAL**

**Threat:**
Secrets committed to git, exposed in environment variables, or leaked in logs.

**Common Vectors:**
1. Committing `.env` file
2. Hardcoded passwords in code
3. Environment variables in docker-compose
4. Secrets in build logs
5. Secrets in browser DevTools

**Mitigation:**

#### ✅ Pre-commit Secret Scanning:
```bash
# .husky/pre-commit
#!/bin/bash
npx secretlint '**/*'

# Blocks commit if secrets detected
```

#### ✅ Git Ignore:
```bash
# .gitignore
.env
.env.local
*.key
*.pem
credentials.json
```

#### ✅ Environment Variable Hygiene:
```bash
# ✅ GOOD (.env - git-ignored)
DATABASE_PASSWORD=secret_password
API_KEY=secret_key

# ❌ BAD (hardcoded)
const password = "my_password";  # NO!
```

#### ✅ Browser Exposure Prevention:
```bash
# ❌ WRONG - Exposed to browser
VITE_API_KEY=secret_key  # BAD!

# ✅ CORRECT - Server-side only
API_KEY=secret_key  # GOOD!
```

#### ✅ Secret Rotation:
- Database passwords: Every 90 days
- API keys: Every 180 days
- SSH keys: Every 365 days
- Immediately on compromise

---

### 4. Dependency Vulnerabilities

**Risk Level:** 🟠 **HIGH**

**Threat:**
Vulnerable npm/pip packages introducing security holes.

**Mitigation:**

#### ✅ Automated Scanning:
```bash
# npm audit (runs on pre-commit)
npm audit --audit-level=moderate

# pip audit
pip-audit

# Snyk scan
snyk test
```

#### ✅ Dependency Review:
```bash
# Review new dependencies
npx depcheck

# Check for outdated
npm outdated
```

#### ✅ Lock Files:
```bash
# Commit lock files (reproducible builds)
git add package-lock.json
git add requirements.txt
```

---

### 5. Network Exposure

**Risk Level:** 🟡 **MEDIUM**

**Threat:**
Unauthorized access to internal services via exposed ports.

**Mitigation:**

#### ✅ Port Mapping Strategy:
```yaml
# ✅ GOOD - Internal access only
services:
  workspace-api:
    networks:
      - tradingsystem_backend
    # No ports exposed to host

# ⚠️ ACCEPTABLE - Debug access only
services:
  workspace-api:
    ports:
      - "127.0.0.1:3210:3200"  # Localhost only
```

#### ✅ Firewall Rules:
```bash
# Host firewall (ufw example)
sudo ufw default deny incoming
sudo ufw allow from 172.17.0.0/16  # Docker network only
```

---

## 🔐 Security Controls Checklist

### Pre-Development

- [ ] Read and acknowledge Dev Container Policy
- [ ] Complete security training
- [ ] Configure MFA on GitHub account
- [ ] Install approved VS Code extensions only
- [ ] Verify base image signature

### Daily Development

- [ ] Pull latest changes before starting work
- [ ] Run `npm audit` before installing new packages
- [ ] Use relative paths (no hardcoded URLs)
- [ ] No `VITE_` prefix for proxy targets
- [ ] Secrets only in `.env` (git-ignored)

### Pre-Commit

- [ ] `bash scripts/env/validate-env.sh` passes
- [ ] No secrets detected by scanner
- [ ] ESLint/Prettier passes
- [ ] Tests pass
- [ ] No hardcoded credentials

### Pre-Deploy

- [ ] All pre-commit checks pass
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Dependency audit clean
- [ ] No critical/high vulnerabilities

---

## 🚨 Incident Response

### Security Incident Severity

| Severity | Example | Response Time |
|----------|---------|---------------|
| **P0 - Critical** | Secret committed to public repo | Immediate |
| **P1 - High** | Vulnerable dependency exploited | <1 hour |
| **P2 - Medium** | Unauthorized Docker command | <4 hours |
| **P3 - Low** | Policy violation (non-security) | <24 hours |

### Response Procedures

#### P0 - Critical (Secret Exposure)

**Immediate Actions (0-15 minutes):**
1. Rotate exposed secret immediately
2. Revoke access using exposed secret
3. Notify Security Team (Slack: `#security-incidents`)
4. Scan for unauthorized access using secret

**Short-term Actions (15-60 minutes):**
5. Remove secret from git history:
   ```bash
   # Using BFG Repo-Cleaner
   bfg --replace-text passwords.txt repo.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```
6. Force all developers to pull latest
7. Document incident in `governance/evidence/incidents/`

**Long-term Actions (1-7 days):**
8. Root cause analysis
9. Update training materials
10. Improve secret scanning
11. Policy review

#### P1 - High (Vulnerability Exploitation)

1. Isolate affected systems
2. Assess scope of compromise
3. Apply security patches
4. Rebuild containers
5. Verify no persistence mechanisms
6. Document and review

---

## 📊 Security Monitoring

### Audit Logs

**Docker Audit Log:**
```bash
# Enable audit logging (host)
sudo auditctl -w /var/run/docker.sock -k docker

# Review logs
sudo ausearch -k docker | tail -100
```

**Git Audit Log:**
```bash
# Commits by user
git log --author="developer@example.com" --pretty=format:"%h %ad %s" --date=short

# Large files committed
git rev-list --all --objects | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print $3,$2,$4}' | sort -nr | head -20
```

**Secret Scanner Results:**
```bash
# Weekly scan report
bash scripts/security/weekly-secret-scan.sh > reports/secrets-$(date +%Y%m%d).txt
```

### Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Secrets committed | 0 | 0 | ✅ |
| Critical vulnerabilities | 0 | 0 | ✅ |
| High vulnerabilities | <5 | 2 | ⚠️ |
| Policy violations | <2/month | 1 | ✅ |
| Mean time to patch | <24h | 18h | ✅ |

---

## 🔍 Security Scanning Tools

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/bash

# Secret scanning
npx secretlint '**/*' || exit 1

# Dependency audit
npm audit --audit-level=moderate || exit 1

# ESLint security rules
npm run lint:security || exit 1

# shellcheck for bash scripts
find scripts -name "*.sh" -exec shellcheck {} \; || exit 1
```

### CI/CD Security Checks

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Secret Scanning
        uses: trufflesecurity/trufflehog@main

      - name: Dependency Scanning
        run: npm audit --audit-level=moderate

      - name: SAST
        uses: github/codeql-action/analyze@v2

      - name: Container Scanning
        run: docker scan tradingsystem-dev-container
```

---

## 📖 Security Training

### Required Training

**All Developers MUST complete:**

1. **OWASP Top 10 (2021)**
   - Injection attacks
   - Broken authentication
   - Sensitive data exposure
   - Security misconfiguration
   - Etc.

2. **Container Security Best Practices**
   - Docker socket risks
   - Container escape techniques
   - Image vulnerability scanning
   - Network isolation

3. **Secret Management**
   - What qualifies as a secret
   - How to detect secret exposure
   - Incident response procedures
   - Rotation policies

**Training Platform:** Security Team provides materials
**Frequency:** Annual refresher, immediate for new hires
**Validation:** Quiz with 80% passing score

---

## 📋 Security Checklist Template

```markdown
## Security Review Checklist

**PR:** #123
**Author:** @developer
**Reviewer:** @security-team
**Date:** 2025-11-12

### Code Security
- [ ] No hardcoded secrets
- [ ] No hardcoded URLs
- [ ] Input validation implemented
- [ ] Output encoding implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized output)

### Dependency Security
- [ ] `npm audit` clean
- [ ] No critical/high vulnerabilities
- [ ] Dependencies reviewed
- [ ] Lock file updated

### Configuration Security
- [ ] No `.env` committed
- [ ] No secrets in docker-compose
- [ ] VITE_ prefix used correctly
- [ ] Network configuration approved

### Container Security
- [ ] No privileged containers
- [ ] No host mounts
- [ ] Non-root user
- [ ] Resource limits set

### Compliance
- [ ] Policy compliance validated
- [ ] Audit trail maintained
- [ ] Documentation updated

**Approved by:** @security-lead
**Date:** 2025-11-12
```

---

## 📖 References

**Documentation:**
- [Dev Container Overview](../../docs/content/tools/dev-container/overview.mdx)
- [Dev Container Policy](../policies/dev-container-policy.md)
- [Secret Management Guide](secret-management-guide.md)

**External Resources:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Docker Benchmarks](https://www.cisecurity.org/benchmark/docker)
- [Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

---

## 📝 Security Control Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-12 | Initial security guide | Security Team |

---

**Guide Status:** ✅ Active
**Next Review:** 2026-02-12 (3 months)
**Owner:** Security Team
**Contact:** security@tradingsystem.local
