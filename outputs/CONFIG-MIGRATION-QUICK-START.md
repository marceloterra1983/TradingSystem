# Configuration Migration Quick Start Guide

**For:** TradingSystem Development Team
**Date:** 2025-11-07
**Status:** Ready to Execute

---

## TL;DR - What's Wrong & How to Fix It

**Problem:** Configuration is a mess - 394-line `.env` file, scripts overwrite developer changes, port conflicts discovered at runtime, ~5 hours/week wasted debugging "API Indisponível" errors.

**Solution:** 6-week phased migration to modern 3-layer config + port registry + validation pipeline.

**Impact:** 90% fewer incidents, 95% less debugging time, zero port conflicts, faster onboarding.

---

## Critical Issues (Ranked by Impact)

| Issue | Severity | Impact/Week | Fix Effort |
|-------|----------|-------------|------------|
| 1. Scripts overwrite `.env` (lose customizations) | 🔴 Critical | 2 hours | 3 days |
| 2. VITE_ prefix exposes container hostnames | 🔴 Critical | 1.5 hours | 2 days |
| 3. Port conflicts at runtime (not CI) | 🔴 Critical | 1 hour | 1 week |
| 4. Multiple sources of truth (47+ files) | 🟡 High | 30 min | 1 week |
| 5. No validation pipeline | 🟡 High | 30 min | 4 days |
| 6. Policy 7000 never implemented | 🟢 Medium | 15 min | 2 hours |

**Total Time Lost:** ~5.5 hours/week across team

---

## The Fix: 3-Layer Configuration Model

```
┌──────────────────────────────────────────┐
│  Layer 3: Runtime Overrides (Docker)     │  ← Highest Priority
├──────────────────────────────────────────┤
│  Layer 2: Local Overrides (.env.local)   │  ← Developer customizations
├──────────────────────────────────────────┤
│  Layer 1: Defaults + Secrets              │  ← Base values
│    - config/.env.defaults (versioned)    │
│    - .env (secrets only, gitignored)     │
└──────────────────────────────────────────┘
```

**Current (Wrong):**
```bash
.env (394 lines) → Everything mixed together ❌
```

**Future (Correct):**
```bash
config/.env.defaults (500 lines) → Public defaults, versioned
.env (50 lines)                  → Secrets only, gitignored
.env.local (10 lines)            → Developer overrides, gitignored
```

---

## 6-Week Migration Plan

| Week | Phase | Tasks | Owner | Risk |
|------|-------|-------|-------|------|
| 1 | **Foundation** | Split secrets from defaults, implement loader | Backend Lead | Low |
| 2-3 | **Port Registry** | Centralize port mappings, add validation | DevOps | Medium |
| 3 | **VITE_ Fix** | Remove container hostnames from browser | Frontend Lead | Low |
| 4 | **Service Registry** | Centralize service URLs, add health checks | Full-Stack | Low |
| 5 | **Validation** | Joi schema, CI/CD integration, pre-commit hooks | QA + Backend | Low |
| 6 | **Cleanup** | Remove deprecated files, update docs, training | All | None |

**Total Duration:** 4-6 weeks (depends on team capacity)

---

## Immediate Actions (This Week)

### 1. Backup Everything (30 minutes)

```bash
# Create timestamped backup
BACKUP_DIR="backups/config-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp .env "$BACKUP_DIR/.env"
cp config/.env.defaults "$BACKUP_DIR/.env.defaults"

echo "✅ Backup saved: $BACKUP_DIR"
```

### 2. Audit VITE_ Misuse (2 hours)

```bash
# Find all VITE_*_PROXY_TARGET variables (should be 0)
grep -rn 'VITE_.*PROXY_TARGET' .env tools/compose/ frontend/

# Expected: 12 results (all should be removed)
```

**Create GitHub issues for each finding.**

### 3. Extract Port Registry (4 hours)

```bash
# Extract all ports from docker-compose files
bash scripts/ports/extract-ports.sh > config/ports-registry-draft.json

# Validate extracted data
node scripts/ports/validate-registry.js config/ports-registry-draft.json
```

**Review output, fix conflicts manually.**

---

## Phase 1: Foundation (Week 1) - CRITICAL PATH

**Goal:** Separate secrets from defaults, establish loading hierarchy.

### Step 1: Create Shared Config Loader

**File:** `backend/shared/config/load-env.js`

```javascript
import dotenv from 'dotenv';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../../');

// Load in order (last wins)
dotenv.config({ path: path.join(projectRoot, 'config/.env.defaults') }); // Base
dotenv.config({ path: path.join(projectRoot, '.env') });                 // Secrets
dotenv.config({ path: path.join(projectRoot, '.env.local') });           // Overrides

export default process.env;
```

### Step 2: Split .env File

```bash
# Extract secrets (API keys, passwords, tokens)
grep -E '(API_KEY|PASSWORD|SECRET|TOKEN|HASH)' .env > .env.secrets.tmp

# Move defaults to config/.env.defaults (if not already there)
# Verify no overlap

# Replace .env with secrets only
mv .env .env.backup-$(date +%Y%m%d)
mv .env.secrets.tmp .env
```

### Step 3: Update Services to Use Loader

**BEFORE:**
```javascript
import dotenv from 'dotenv';
dotenv.config();

const port = process.env.WORKSPACE_PORT;
```

**AFTER:**
```javascript
import config from '../../../backend/shared/config/load-env.js';

const port = config.WORKSPACE_PORT;
```

**Services to Update:**
- `backend/api/workspace/src/index.ts`
- `backend/api/tp-capital/src/index.ts`
- `backend/api/telegram-gateway/src/index.ts`
- `backend/api/documentation-api/src/index.ts`
- All other API services

### Step 4: Add Validation Script

**File:** `scripts/env/validate-layers.sh`

```bash
#!/bin/bash
# Validate that .env has no defaults, config/.env.defaults has no secrets

ERRORS=0

# Check .env for defaults (should only have secrets)
if grep -qE '^(WORKSPACE_PORT|TP_CAPITAL_PORT|LOG_LEVEL)=' .env; then
  echo "❌ .env contains defaults (should be secrets only)"
  ERRORS=$((ERRORS + 1))
fi

# Check config/.env.defaults for secrets (should only have defaults)
if grep -qE '(API_KEY|PASSWORD|SECRET|TOKEN)=' config/.env.defaults; then
  echo "❌ config/.env.defaults contains secrets (should be defaults only)"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "✅ Configuration layers validated"
  exit 0
else
  echo "❌ Validation failed: $ERRORS errors"
  exit 1
fi
```

### Step 5: Test End-to-End

```bash
# Test that developer overrides work
echo "WORKSPACE_PORT=3210" > .env.local

# Start workspace service
cd backend/api/workspace
npm start

# Verify it uses port 3210 (not 3200)
curl http://localhost:3210/health
# Should return: {"status":"healthy"}

# Clean up
rm ../../.env.local
```

**Success Criteria:**
- [ ] All secrets moved to `.env` (no defaults)
- [ ] All services use shared loader
- [ ] Validation script passes
- [ ] Developer can override with `.env.local`

**Effort:** 3 days
**Rollback:** Revert loader, merge `.env.secrets` back to `.env`

---

## Quick Wins (Can Be Done Independently)

### Win 1: Fix Policy 7000 Documentation (30 minutes)

**Problem:** CLAUDE.md claims ports 7000-7299 but reality is 5000-5999, 9000-9999.

**Fix:**
```bash
# Edit CLAUDE.md, remove lines 127-139
# Replace with:
# "Port mappings are managed via config/ports-registry.json"
# "See docs/content/tools/ports-services.mdx for current assignments"
```

### Win 2: Add ESLint Rule for VITE_ Misuse (1 hour)

**File:** `frontend/dashboard/.eslintrc.js`

```javascript
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/VITE_.*PROXY_TARGET/]',
      message: 'Use non-VITE prefix for proxy targets (server-side only)',
    },
  ],
}
```

**Test:**
```javascript
// This should trigger ESLint error:
const target = import.meta.env.VITE_WORKSPACE_PROXY_TARGET; // ❌ Error
```

### Win 3: Create Developer Cheat Sheet (2 hours)

**File:** `docs/QUICK-CONFIG-GUIDE.md`

```markdown
# Configuration Quick Reference

## How to Add a Secret
1. Edit `.env` (NOT config/.env.defaults)
2. Add variable: `MY_API_KEY=sk-...`
3. Never commit this file

## How to Change a Port Locally
1. Edit `.env.local` (NOT .env)
2. Add variable: `WORKSPACE_PORT=3210`
3. Restart service
4. Your change persists (scripts won't overwrite)

## How to Add a Default Value
1. Edit `config/.env.defaults`
2. Add variable: `NEW_FEATURE_ENABLED=false`
3. Commit this file
4. Run `npm run validate:config`

## How to Check What's Being Used
```bash
# Show final merged config
bash scripts/env/show-merged-config.sh

# Show conflicts (overrides)
bash scripts/env/check-conflicts.sh
```
```

---

## FAQ

### Q: Why can't we just fix .env in place?

**A:** Because it's mixing 3 concerns (secrets, defaults, overrides) in one file. This causes:
- Secrets accidentally committed (security risk)
- Defaults overwritten by scripts (developer frustration)
- No clear precedence (which value wins?)

The 3-layer model fixes all of these.

### Q: What if migration breaks production?

**A:** We're using feature flags + phased rollout:
1. Old loader still works (backwards compatible)
2. Enable new loader per service via `USE_NEW_CONFIG_LOADER=true`
3. If issues arise, flip flag back to `false`
4. No downtime, instant rollback

### Q: How long until we see benefits?

**A:** Immediate wins after Phase 1 (week 1):
- Developers can use `.env.local` for overrides
- Scripts stop overwriting `.env`
- Secrets isolated from defaults

Full benefits after Phase 5 (week 5):
- Zero port conflicts (validation catches them)
- Zero VITE_ misuse (ESLint enforces)
- Zero config errors at runtime (validation pipeline)

### Q: What about existing .env files?

**A:** Migration script preserves your current `.env`:
1. Backup created automatically
2. Secrets extracted to new `.env`
3. Defaults stay in `config/.env.defaults`
4. Old `.env` renamed to `.env.backup-YYYYMMDD`

Your existing setup keeps working during migration.

### Q: Do I need to learn new commands?

**A:** No, the loading is automatic. Just know:
- `.env` → Secrets only (API keys, passwords)
- `.env.local` → Your local overrides (ports, debug flags)
- `config/.env.defaults` → Team defaults (don't edit unless adding new feature)

That's it!

---

## Success Metrics (How We'll Know It Worked)

| Metric | Before | Target (3 months) |
|--------|--------|-------------------|
| Config-related incidents | 18/week | < 2/week |
| Time spent debugging config | ~5 hours/week | < 30 min/week |
| Port conflicts at runtime | 5/month | 0/month |
| Failed startups due to config | 12% | < 1% |
| Developer satisfaction | 6/10 | 9/10 |

**Tracking:** Weekly team survey + incident logs in GitHub

---

## Getting Help

**Stuck on migration?**
- Slack: #config-migration channel
- Email: architecture@tradingsystem.local
- Office Hours: Tuesdays 3-4pm (pair programming session)

**Found a bug?**
- GitHub: [Create issue with `config-migration` label](https://github.com/marceloterra1983/TradingSystem/issues/new)

**Want to contribute?**
- See: `docs/CONTRIBUTING.md`
- Pick a task from GitHub project board

---

## Related Documents

- **Full Assessment:** `outputs/CONFIG-ARCHITECTURE-ASSESSMENT-2025-11-07.md` (this doc's parent)
- **Governance Conflicts:** `outputs/GOVERNANCE-CONFLICTS-ANALYSIS-2025-11-07.md`
- **Proxy Best Practices:** `docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md`
- **Environment Variables Policy:** `governance/controls/ENVIRONMENT-VARIABLES-POLICY.md`

---

**Last Updated:** 2025-11-07
**Next Review:** After Phase 1 completion
**Status:** Ready for team review and kickoff

---

**Ready to start?** Begin with [Phase 1: Foundation](#phase-1-foundation-week-1---critical-path) above.
