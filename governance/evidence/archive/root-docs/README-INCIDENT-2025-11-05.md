---
title: "Incident 2025-11-05: Governance Framework Response"
date: "2025-11-05"
type: "index"
status: "active"
tags: [governance, incident-response, documentation]
---

# Incident 2025-11-05: Comprehensive Governance Response

**Incident**: TP-Capital Connectivity Failure  
**Date**: November 5, 2025  
**Duration**: 2 hours (15:00 - 17:00 BRT)  
**Status**: ✅ Resolved + Governance Enhanced  

---

## 📚 Documentation Structure

This directory contains the **complete governance response** to the November 5, 2025 incident, including:

1. Incident report with root cause analysis
2. Policy addendums (new mandatory rules)
3. Operational controls (checklists, scripts)
4. Troubleshooting runbooks
5. Executive summary

---

## 🔍 Quick Navigation

### Start Here (New Team Members)

1. **Executive Summary** → [`GOVERNANCE-IMPROVEMENTS-2025-11-05.md`](/governance/GOVERNANCE-IMPROVEMENTS-2025-11-05.md)
2. **What Happened?** → [Incident Report](/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.md)
3. **What Changed?** → [Policy Addendums](#policy-addendums)
4. **How to Deploy Safely?** → [Pre-Deploy Checklist](/governance/controls/PRE-DEPLOY-CHECKLIST.md)

### For DevOps Engineers

- **Runbook**: [Troubleshooting Connectivity](/docs/content/apps/tp-capital/runbooks/troubleshooting-connectivity.mdx)
- **Validation Scripts**: [`scripts/validation/`](#validation-scripts)
- **Emergency Recovery**: [Section 6 of Incident Report](/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.md#emergency-recovery-procedures)

### For Developers

- **Port Mapping Rules**: [POL-0003 Addendum 001](#pol-0003-addendum-001-port-mapping)
- **Environment Variables**: [POL-0002 Addendum 001](#pol-0002-addendum-001-environment-validation)
- **Code Examples**: See policy addendums for ✅ CORRECT vs ❌ WRONG patterns

---

## 📋 New Governance Artifacts

### Incident Evidence

#### Incident Report
**File**: `governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.md`

**Contents**:
- Timeline (hourly breakdown)
- 7 Root causes identified
- Impact analysis
- Lessons learned
- Prevention measures

**Key Stats**:
- **Services Affected**: 3 (TP-Capital, Gateway API, Dashboard)
- **Root Causes**: 7 (chained failures)
- **Time to Resolve**: 2 hours
- **Data Loss**: None
- **Revenue Impact**: None (pre-production)

---

### Policy Addendums

#### POL-0003 Addendum 001: Port Mapping

**File**: `governance/policies/addendums/POL-0003-ADDENDUM-001-port-mapping-rules.md`

**Mandatory Rules**:

1. **Use Container Hostnames** (not `localhost` or `host.docker.internal`)
   ```yaml
   ✅ http://service-name:4005
   ❌ http://localhost:4008
   ❌ http://host.docker.internal:4010
   ```

2. **Use Internal Ports** for inter-container communication
   ```yaml
   ports: "4008:4005"  # External:Internal
   
   ✅ Inter-container: http://service:4005  (internal)
   ✅ Browser/Host:    http://localhost:4008  (external)
   ```

3. **Frontend: Use Vite Proxy Targets** (not direct URLs)
   ```yaml
   ✅ VITE_TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005
   ❌ VITE_TP_CAPITAL_API_URL=http://tp-capital-api:4005
   ```

**Compliance**: Mandatory (effective immediately)

---

#### POL-0002 Addendum 001: Environment Validation

**File**: `governance/policies/addendums/POL-0002-ADDENDUM-001-empty-value-validation.md`

**Mandatory Rules**:

1. **Classify all variables** (CRITICAL/REQUIRED/OPTIONAL)
   - CRITICAL: Fail deployment if empty
   - REQUIRED: Warn if empty
   - OPTIONAL: Use defaults

2. **Use Bash parameter expansion** for CRITICAL variables
   ```yaml
   ✅ ${TELEGRAM_DB_PASSWORD:?ERROR: not set}
   ❌ ${TELEGRAM_DB_PASSWORD}  (silent failure!)
   ```

3. **Export variables before docker compose**
   ```bash
   ✅ set -a && source .env && set +a && docker compose up
   ❌ docker compose up  (variables not exported!)
   ```

4. **Validate after container creation**
   ```bash
   docker inspect container | grep "DATABASES_PASSWORD"
   # Must NOT be empty
   ```

**Compliance**: Mandatory (effective immediately)

---

### Operational Controls

#### Pre-Deployment Checklist

**File**: `governance/controls/PRE-DEPLOY-CHECKLIST.md`

**7 Validation Phases** (all mandatory):

| Phase | Checks | Est. Time |
|-------|--------|-----------|
| 1. Environment | 10+ variable validations | 2 min |
| 2. Docker Compose | YAML syntax, port conflicts | 3 min |
| 3. Inter-Container Comm | Hostnames, ports, networks | 5 min |
| 4. Database | Schemas, connections, PgBouncer | 3 min |
| 5. Application Code | Filters, message handling | 2 min |
| 6. Startup & Health | Health checks, endpoint tests | 5 min |
| 7. Data | Real data vs checkpoints | 2 min |

**Total Time**: ~22 minutes  
**Sign-Off**: Required for production deployments

---

### Validation Scripts

#### Script 1: Environment Validation

**File**: `scripts/validation/validate-env.sh`

```bash
bash scripts/validation/validate-env.sh [--strict] [--ci-mode]

✅ Validates: 4 CRITICAL + 4 REQUIRED + 3 OPTIONAL variables
📊 Output: Colored console + summary
⏱️  Time: < 5 seconds
🚦 Exit Codes: 0 (pass), 1 (errors), 2 (warnings)
```

**Integration**:
- **Pre-commit hook**: Validates before commit
- **CI/CD**: Blocks deployment if critical errors
- **Manual**: Run before any docker compose command

---

#### Script 2: Network Validation

**File**: `scripts/validation/validate-network.sh`

```bash
bash scripts/validation/validate-network.sh [--test-all]

✅ Validates: Networks, containers, connectivity
📊 Tests: DNS resolution, HTTP endpoints, database connections
⏱️  Time: < 15 seconds
🚦 Exit Codes: 0 (pass), 1 (errors)
```

**Connectivity Tests**:
- TP-Capital → Gateway API (HTTP)
- TP-Capital → TimescaleDB (TCP via PgBouncer)
- Dashboard → TP-Capital API (HTTP)
- Host → All services (HTTP)

---

#### Script 3: Pre-Deploy Suite

**File**: `scripts/validation/pre-deploy-validation-suite.sh`

```bash
bash scripts/validation/pre-deploy-validation-suite.sh [--strict]

✅ Runs: validate-env.sh + validate-network.sh + compose validation
📊 Report: Auto-generated in reports/deployment/
⏱️  Time: < 30 seconds
🚦 Exit Codes: 0 (approved), 1 (blocked), 2 (caution)
```

**Output Example**:
```
╔═══════════════════════════════════════════════════════════════╗
║         PRE-DEPLOYMENT VALIDATION SUITE                      ║
╚═══════════════════════════════════════════════════════════════╝

Phase 1: Environment Variables ✅ PASSED (7 checks, 1 warning)
Phase 2: Network & Connectivity ✅ PASSED (14 checks)
Phase 3: Docker Compose ✅ PASSED (5 files validated)

FINAL SUMMARY:
  Passed:   26
  Warnings: 1
  Errors:   0

✅ DEPLOYMENT APPROVED
```

---

### Troubleshooting Runbook

**File**: `docs/content/apps/tp-capital/runbooks/troubleshooting-connectivity.mdx`

**6 Common Problems Covered**:

1. **Gateway API Unreachable** → PgBouncer password, hostname issues
2. **TP-Capital Cannot Reach Gateway** → host.docker.internal, wrong ports
3. **Dashboard Cannot Fetch** → API_URL vs PROXY_TARGET, port confusion
4. **Checkpoints Blocking Display** → SQL filter missing
5. **Messages Not Processing** → status='queued' not included
6. **Empty Photos Blocking Queue** → No content validation

**Features**:
- Quick diagnosis (jump to relevant section)
- Step-by-step diagnosis commands
- Copy-paste fix commands
- Verification steps
- Prevention tips

---

## Implementation Status

### ✅ Completed (November 5, 2025)

- [x] Incident report documented
- [x] Root causes identified (7)
- [x] Policy addendums created (2)
- [x] Pre-deploy checklist created
- [x] Validation scripts created (3)
- [x] Troubleshooting runbook created
- [x] Executive summary created
- [x] All scripts tested and working

### 🔄 In Progress

- [ ] CI/CD integration (GitHub Actions)
- [ ] Pre-commit hook installation
- [ ] Team training scheduled

### 📅 Planned (Next Sprint)

- [ ] Prometheus alerts for circuit breaker
- [ ] Automated message cleanup job
- [ ] Network topology diagram
- [ ] Disaster recovery playbook

---

## Feedback & Improvements

**Found an issue?** Create a GitHub issue with label `governance`

**Want to improve?** Submit a pull request with:
- Clear description of improvement
- Updated documentation
- Validation that rules still work

**Questions?** Ask in #devops or #governance channels

---

**Generated**: November 5, 2025 17:05 BRT  
**Version**: 1.0  
**Status**: Active  
**Owner**: Platform Engineering

