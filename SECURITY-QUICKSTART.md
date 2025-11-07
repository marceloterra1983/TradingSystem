# TradingSystem Security Quick Start Guide

**Last Updated:** 2025-11-07
**Status:** 🔴 CRITICAL ACTIONS REQUIRED

---

## 🚨 IMMEDIATE ACTIONS (DO THIS TODAY)

### 1. Revoke Exposed GitHub Tokens (15 minutes)

**THESE TOKENS ARE COMPROMISED:**
```
REDACTED_GH_TOKEN_A
REDACTED_GH_TOKEN_B
```

**ACTION:**
1. Go to: https://github.com/settings/tokens
2. Find and DELETE both tokens above
3. Generate new token:
   - Name: `TradingSystem CI/CD`
   - Expiration: 90 days
   - Scopes: `repo`, `workflow`, `read:org`
4. Update `.env`:
   ```bash
   GITHUB_TOKEN=<your_new_token_here>
   ```
5. Add to GitHub Secrets:
   - Repository → Settings → Secrets → Actions
   - Name: `GH_TOKEN`
   - Value: Your new token

---

### 2. Rotate Exposed API Keys (30 minutes)

**THESE KEYS ARE EXPOSED:**

#### OpenAI
```bash
# Current (EXPOSED):
OPENAI_API_KEY=sk-sk-proj-i1mUuecAyXsev2nLWsZBDAx9YeFbEhz4fHCzn6UE...

# 1. Go to: https://platform.openai.com/api-keys
# 2. Delete old key
# 3. Create new key
# 4. Update .env with new value
```

#### Firecrawl
```bash
# Current (EXPOSED):
FIRECRAWL_API_KEY=fc-6219b4e35fd240048969fa768ad9a2cd

# 1. Log into Firecrawl dashboard
# 2. Revoke old key
# 3. Generate new key
# 4. Update .env
```

#### Sentry
```bash
# Current (EXPOSED):
SENTRY_AUTH_TOKEN=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

# 1. Log into Sentry
# 2. Settings → Auth Tokens → Delete old token
# 3. Generate new token
# 4. Update .env
```

---

### 3. Fix VITE_ Prefix Exposure (1 hour)

**PROBLEM:** 5 secrets exposed to browser bundle

**SOLUTION:**
```bash
# Automated fix
bash scripts/security/fix-vite-secrets.sh

# Manual verification
cd frontend/dashboard
npm run build
grep -r "VITE_.*TOKEN" dist/  # Should return no results
```

**BEFORE:**
```javascript
// ❌ BAD: Exposed in browser
const token = import.meta.env.VITE_GATEWAY_TOKEN;
fetch(`${API_URL}?token=${token}`);
```

**AFTER:**
```javascript
// ✅ GOOD: Proxied by Vite, auth added server-side
fetch('/api/workspace/items');
```

---

### 4. Fix File Permissions (5 minutes)

```bash
# Current: 644 (insecure - others can read)
# Target: 600 (secure - only owner)

chmod 600 .env

# Verify
ls -la .env
# Should show: -rw------- (600)
```

---

## 🛡️ SECURITY CHECKLIST

### Before Every Commit

- [ ] Run secret scan: `bash scripts/security/scan-secrets.sh`
- [ ] Verify no `.env` files staged: `git status | grep .env`
- [ ] Check for `VITE_` secrets: `grep "VITE_.*TOKEN" .env`
- [ ] Ensure permissions: `stat -c "%a" .env` returns `600`

### Before Every Deployment

- [ ] Rotate secrets if > 90 days old
- [ ] Test with rotated secrets in staging
- [ ] Verify frontend bundle: `grep -r TOKEN dist/` returns nothing
- [ ] Backup current `.env`: `cp .env .env.backup-$(date +%Y%m%d)`

---

## 🔧 VALIDATION COMMANDS

### Check for Exposed Secrets
```bash
# Quick scan
bash scripts/security/scan-secrets.sh

# Full TruffleHog scan (requires installation)
trufflehog git file://. --since-commit HEAD~100 --only-verified
```

### Verify Environment Sync
```bash
# Ensure .env and .env.defaults are in sync
node scripts/governance/validate-env-sync.mjs
```

### Check Git History for Secrets
```bash
# Search for potential secrets
git log --all --full-history -S "ghp_" --oneline
git log --all --full-history -S "sk-" --oneline
```

---

## 🚫 NEVER DO THIS

### ❌ DON'T
```bash
# Commit .env files
git add .env

# Use VITE_ for secrets
VITE_API_KEY=secret123

# Hardcode secrets in code
const apiKey = "sk-abc123...";

# Share secrets in Slack/Email
"Here's the OpenAI key: sk-..."

# Set weak permissions
chmod 644 .env
```

### ✅ DO
```bash
# Use .env.example as template
git add .env.example

# Use non-VITE_ for secrets (backend only)
OPENAI_API_KEY=secret123

# Load from environment
const apiKey = process.env.OPENAI_API_KEY;

# Share via secure channel
"Added new key to .env (check secure vault)"

# Set secure permissions
chmod 600 .env
```

---

## 📖 CRITICAL POLICIES

### POL-0002: Secrets Management

**KEY RULES:**
1. NEVER commit `.env` files with real secrets
2. NEVER use `VITE_` prefix for secrets (exposes to browser)
3. Rotate API keys every 90 days, passwords every 180 days
4. File permissions MUST be `600` for secret files
5. Use SOPS/age encryption for versioned secrets

**VIOLATIONS:**
- First offense: PR blocked, training required
- Second offense: Post-mortem, manager notification
- Third offense: Access review

### Secret Rotation Schedule

| Type | Frequency | Next Due |
|------|-----------|----------|
| API Keys | 90 days | 2026-02-05 |
| Database Passwords | 180 days | 2026-05-06 |
| JWT Secrets | 90 days | 2026-02-05 |
| Inter-Service Tokens | 90 days | 2026-02-05 |

---

## 🔗 QUICK LINKS

**Full Audit Report (32,000 words):**
- `governance/evidence/audits/secrets-security-audit-2025-11-07.md`

**Executive Summary:**
- `governance/evidence/audits/SECRETS-AUDIT-EXECUTIVE-SUMMARY.md`

**Policy Reference:**
- `governance/policies/secrets-env-policy.md`

**Rotation Procedures:**
- `governance/controls/secrets-rotation-sop.md`

**Validation Scripts:**
- `scripts/security/scan-secrets.sh`
- `scripts/security/fix-vite-secrets.sh`
- `scripts/governance/validate-env-sync.mjs`

---

## 💬 GET HELP

**Slack Channels:**
- `#security-team` - Security questions
- `#incident-response` - Security incidents (URGENT)
- `#devops` - CI/CD and secrets management

**Email:**
- security-engineering@tradingsystem.local

**Emergency:**
- Call: TBD
- On-call rotation: Check PagerDuty

---

## 📊 CURRENT STATUS

**Risk Score:** 8.5/10 (CRITICAL)

**Top Priorities:**
1. 🔴 Revoke GitHub tokens (CRITICAL)
2. 🔴 Rotate API keys (CRITICAL)
3. 🔴 Fix VITE_ exposure (CRITICAL)
4. 🟡 Delete local .env files (HIGH)
5. 🟡 Setup pre-commit hooks (HIGH)

**Estimated Time to Resolve Critical Issues:** 4-6 hours

---

**Generated:** 2025-11-07
**Classification:** INTERNAL - SECURITY SENSITIVE

**Questions?** Ask in #security-team on Slack
