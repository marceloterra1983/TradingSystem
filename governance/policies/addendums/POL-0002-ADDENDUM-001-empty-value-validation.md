---
title: "POL-0002 Addendum 001: Empty Value Validation for Critical Environment Variables"
policy_id: POL-0002
addendum_number: "001"
date_issued: "2025-11-05"
effective_date: "2025-11-05"
owner: SecurityEngineering
status: active
triggered_by: "Incident 2025-11-05: PgBouncer Password Empty String"
tags: [policy, addendum, security, environment-variables, validation]
---

# POL-0002 Addendum 001: Empty Value Validation for Critical Environment Variables

**Policy**: Secrets & Environment Variables Policy (POL-0002)  
**Addendum**: 001  
**Issued**: November 5, 2025  
**Effective**: Immediately  
**Triggered By**: [Incident 2025-11-05](/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.md)

---

## Background

On November 5, 2025, the **Telegram Gateway API failed to start** because PgBouncer had an **empty password** (`DATABASES_PASSWORD=""`).

**Root Cause**: Docker Compose substituted `${TELEGRAM_DB_PASSWORD}` with an empty string because the variable was **not exported** when running `docker compose`.

This addendum establishes **mandatory validation** for critical environment variables.

---

## Section 1: Critical Variable Classification

### 1.1 MANDATORY Classification

**All environment variables MUST be classified as:**

| Class | Definition | Validation Level | Example |
|-------|------------|------------------|---------|
| **CRITICAL** | Service fails if empty/missing | Strict (fail deployment) | `TELEGRAM_DB_PASSWORD` |
| **REQUIRED** | Service starts but degrades | Warn (log error) | `REDIS_HOST` |
| **OPTIONAL** | Service has sensible defaults | None | `LOG_LEVEL` |

### 1.2 List of CRITICAL Variables

**Database Passwords:**
- `TELEGRAM_DB_PASSWORD` - Telegram TimescaleDB authentication
- `TP_CAPITAL_DB_PASSWORD` - TP-Capital TimescaleDB authentication  
- `WORKSPACE_DB_PASSWORD` - Workspace database authentication
- `POSTGRES_PASSWORD` - PostgreSQL root password

**API Keys:**
- `TELEGRAM_GATEWAY_API_KEY` - Gateway API authentication
- `TP_CAPITAL_API_KEY` - TP-Capital API authentication

**Service URLs (when not using defaults):**
- `TELEGRAM_GATEWAY_URL` - Gateway API endpoint
- `TELEGRAM_GATEWAY_DB_URL` - Gateway database connection string

---

## Section 2: Validation Requirements

### 2.1 RULE: Use Bash Parameter Expansion for CRITICAL Variables

**❌ WRONG (Silent failure):**
```yaml
environment:
  - DATABASES_PASSWORD=${TELEGRAM_DB_PASSWORD}  # Empty string if not set!
```

**✅ CORRECT (Fail fast):**
```yaml
environment:
  - DATABASES_PASSWORD=${TELEGRAM_DB_PASSWORD:?ERROR: TELEGRAM_DB_PASSWORD not set or empty}
```

**Behavior:**
- If `TELEGRAM_DB_PASSWORD` is **not set** or **empty**, Docker Compose will **fail immediately** with clear error message
- Prevents silent failures and hard-to-debug issues

### 2.2 RULE: Export Variables Before Docker Compose

**MANDATORY wrapper pattern:**

```bash
#!/bin/bash
# tools/compose/run-telegram-compose.sh

# Load and EXPORT variables from .env
set -a                    # Auto-export all variables
source ../../.env
set +a

# Now run docker compose
docker compose -f docker-compose.4-2-telegram-stack.yml "$@"
```

**Or inline:**
```bash
set -a && source .env && set +a
docker compose -f docker-compose.yml up -d
```

### 2.3 RULE: Validate After Container Creation

**MANDATORY post-deployment validation:**

```bash
# Verify password was loaded (not empty)
password=$(docker inspect telegram-pgbouncer | grep "DATABASES_PASSWORD" | cut -d'"' -f4)

if [ -z "$password" ]; then
  echo "❌ CRITICAL: DATABASES_PASSWORD is empty!"
  docker compose down
  exit 1
fi

echo "✅ DATABASES_PASSWORD loaded correctly"
```

---

## Section 3: Pre-Deployment Validation Script

### 3.1 MANDATORY Script: `validate-env.sh`

**Location**: `scripts/validation/validate-env.sh`

**Requirements:**

```bash
#!/bin/bash
# Validate all CRITICAL environment variables

set -e

# Load .env
if [ ! -f .env ]; then
  echo "❌ ERROR: .env file not found!"
  exit 1
fi

set -a
source .env
set +a

# CRITICAL variables (MUST be non-empty)
CRITICAL_VARS=(
  "TELEGRAM_DB_PASSWORD"
  "TP_CAPITAL_DB_PASSWORD"
  "TELEGRAM_GATEWAY_API_KEY"
  "TP_CAPITAL_API_KEY"
)

# REQUIRED variables (warn if missing)
REQUIRED_VARS=(
  "TELEGRAM_GATEWAY_URL"
  "REDIS_HOST"
  "NODE_ENV"
)

errors=0
warnings=0

# Check CRITICAL
for var in "${CRITICAL_VARS[@]}"; do
  value="${!var}"
  if [ -z "$value" ]; then
    echo "❌ CRITICAL: $var is not set or empty!"
    ((errors++))
  else
    echo "✅ $var is set (length: ${#value})"
  fi
done

# Check REQUIRED
for var in "${REQUIRED_VARS[@]}"; do
  value="${!var}"
  if [ -z "$value" ]; then
    echo "⚠️  WARNING: $var is not set"
    ((warnings++))
  fi
done

# Summary
echo ""
echo "Validation Summary:"
echo "  Errors: $errors"
echo "  Warnings: $warnings"

if [ $errors -gt 0 ]; then
  echo ""
  echo "❌ VALIDATION FAILED: Fix errors before deployment"
  exit 1
fi

echo ""
echo "✅ VALIDATION PASSED"
exit 0
```

### 3.2 Integration with Deployment Scripts

**MANDATORY in all start scripts:**

```bash
#!/bin/bash
# start-telegram-stack.sh

# 1. Validate environment FIRST
bash scripts/validation/validate-env.sh || exit 1

# 2. Start containers
cd tools/compose
bash run-telegram-compose.sh up -d

# 3. Verify containers are healthy
bash scripts/validation/validate-containers-health.sh
```

---

## Section 4: Docker Compose Best Practices

### 4.1 RULE: Always Use Wrapper Scripts

**❌ WRONG (variables not exported):**
```bash
docker compose -f docker-compose.4-2-telegram-stack.yml up -d
# TELEGRAM_DB_PASSWORD will be empty!
```

**✅ CORRECT (use wrapper):**
```bash
bash tools/compose/run-telegram-compose.sh up -d
# Wrapper exports variables correctly
```

### 4.2 RULE: Document Variable Source in Compose Files

**MANDATORY comment header:**

```yaml
services:
  telegram-pgbouncer:
    environment:
      # === CRITICAL: Loaded from .env ===
      # Variable: TELEGRAM_DB_PASSWORD
      # Required: YES (CRITICAL)
      # Validation: Must be non-empty (use :? syntax)
      # Source: Root .env file
      # Fallback: None (deployment fails if missing)
      - DATABASES_PASSWORD=${TELEGRAM_DB_PASSWORD:?ERROR: TELEGRAM_DB_PASSWORD not set}
```

---

## Section 5: Monitoring & Alerting

### 5.1 RULE: Alert on Environment Variable Issues

**MANDATORY Prometheus alert:**

```yaml
- alert: EnvironmentVariableEmpty
  expr: |
    env_validation_failed{severity="critical"} > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Critical environment variable is empty"
    description: "Service {{ $labels.service }} has empty {{ $labels.variable }}"
```

### 5.2 RULE: Log Variable Validation at Startup

**MANDATORY in application startup:**

```javascript
// Validate and log at startup
const requiredVars = {
  TELEGRAM_GATEWAY_URL: process.env.TELEGRAM_GATEWAY_URL,
  TELEGRAM_DB_PASSWORD: process.env.TELEGRAM_DB_PASSWORD,
  TP_CAPITAL_API_KEY: process.env.TP_CAPITAL_API_KEY,
};

for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    logger.error({ variable: key }, 'CRITICAL: Required environment variable is empty');
    process.exit(1);  // Fail fast
  }
  logger.info({ variable: key, length: value.length }, 'Environment variable loaded');
}
```

---

## Compliance & Review

**Effective Date**: November 5, 2025  
**Mandatory Compliance**: Immediately  
**Review Frequency**: Quarterly (90 days)  
**Next Review**: February 3, 2026  

**Non-Compliance Consequences**:
- Pull requests with empty CRITICAL variables will be **rejected**
- Deployments without validation scripts will **fail in CI**
- Services failing environment checks will **not start**

---

## References

- Main Policy: [POL-0002: Secrets & Environment Variables](/governance/policies/secrets-env-policy.md)
- Incident Report: [2025-11-05 TP-Capital Connectivity Failure](/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.md)
- Validation Script: `/scripts/validation/validate-env.sh` (to be created)
- Docker Compose Best Practices: `/governance/policies/addendums/POL-0003-ADDENDUM-001-port-mapping-rules.md`

---

**Approved By**: Security Engineering  
**Last Updated**: November 5, 2025 16:45 BRT

