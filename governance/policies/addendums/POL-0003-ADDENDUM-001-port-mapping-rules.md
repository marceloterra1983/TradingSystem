---
title: "POL-0003 Addendum 001: Port Mapping and Inter-Container Communication Rules"
policy_id: POL-0003
addendum_number: "001"
date_issued: "2025-11-05"
effective_date: "2025-11-05"
owner: PlatformEngineering
status: active
triggered_by: "Incident 2025-11-05: TP-Capital Connectivity Failure"
tags: [policy, addendum, docker, networking, ports]
---

# POL-0003 Addendum 001: Port Mapping and Inter-Container Communication Rules

**Policy**: Container Infrastructure Policy (POL-0003)  
**Addendum**: 001  
**Issued**: November 5, 2025  
**Effective**: Immediately  
**Triggered By**: [Incident Report 2025-11-05](/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.md)

---

## Background

On November 5, 2025, the TP-Capital API became unavailable due to multiple configuration errors related to:

1. Confusion between **host-mapped ports** (external) and **container internal ports**
2. Incorrect use of `host.docker.internal` for inter-container communication
3. Frontend configured with direct URLs instead of Vite proxy targets

This addendum establishes **mandatory rules** to prevent these errors.

---

## Section 1: Port Mapping Nomenclature

### 1.1 MANDATORY Terminology

**All documentation, code comments, and configurations MUST use:**

| Term | Definition | Example |
|------|------------|---------|
| **Internal Port** | Port exposed INSIDE the container (where the app listens) | `4005` |
| **External Port** | Port mapped on the HOST for external access | `4008` |
| **Host Port** | Synonym for External Port | `4008` |
| **Container Port** | Synonym for Internal Port | `4005` |

### 1.2 Docker Compose Port Mapping Format

```yaml
services:
  tp-capital-api:
    ports:
      - "${TP_CAPITAL_API_PORT:-4008}:4005"
        #        ^                   ^
        #        |                   |
        #    External Port      Internal Port
        #    (host-mapped)      (container)
```

**Documentation MUST include:**
```yaml
# Port Mapping: HOST:CONTAINER
# - External (Host): 4008 - accessible from browser/host
# - Internal (Container): 4005 - used for inter-container communication
```

---

## Section 2: Inter-Container Communication Rules

### 2.1 RULE: Use Container Hostnames, NOT localhost

**❌ WRONG:**
```yaml
environment:
  - API_URL=http://localhost:4008  # localhost inside container != host
```

**✅ CORRECT:**
```yaml
environment:
  - API_URL=http://service-name:4005  # Use internal port + container hostname
```

### 2.2 RULE: Never Use `host.docker.internal` for Production

**When to use:**
- ✅ **Development only**: Accessing host services from containers
- ❌ **NEVER in production**: Use container-to-container communication

**Example:**
```yaml
# ❌ WRONG (production)
- TELEGRAM_GATEWAY_URL=http://host.docker.internal:4010

# ✅ CORRECT (production)
- TELEGRAM_GATEWAY_URL=http://telegram-gateway-api:4010
```

### 2.3 RULE: Document All Service Dependencies

**MANDATORY in every docker-compose.yml:**

```yaml
services:
  tp-capital-api:
    environment:
      # === DEPENDENCIES ===
      # Telegram Gateway Connection (container-to-container)
      # - Service: telegram-gateway-api
      # - Internal Port: 4010
      # - Network: telegram_backend (shared)
      # - Health Check: GET /health
      - TELEGRAM_GATEWAY_URL=http://telegram-gateway-api:4010
      
      # TimescaleDB Connection (via PgBouncer)
      # - Service: tp-capital-pgbouncer  
      # - Internal Port: 6432
      # - Network: tp_capital_backend (internal)
      - TP_CAPITAL_DB_HOST=tp-capital-pgbouncer
      - TP_CAPITAL_DB_PORT=6432
```

---

## Section 3: Frontend-Backend Communication

### 3.1 RULE: Use Vite Proxy for Containerized Frontends

**❌ WRONG:**
```yaml
# Dashboard container trying to access backend directly
environment:
  - VITE_TP_CAPITAL_API_URL=http://tp-capital-api:4005  # Browser can't resolve!
```

**✅ CORRECT:**
```yaml
# Use proxy targets - Vite server proxies requests
environment:
  - VITE_TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005
```

**How it works:**
```
Browser → /api/tp-capital/signals
         ↓
Vite Proxy (inside dashboard container) → http://tp-capital-api:4005/signals
         ↓
TP-Capital API responds
         ↓
Browser receives JSON
```

### 3.2 RULE: Never Set VITE_*_API_URL in .env for Containerized Setups

**Rationale**: 
- `VITE_*_API_URL` is for **native/local development** (non-Docker)
- `VITE_*_PROXY_TARGET` is for **containerized development** (Docker)

**In `.env`:**
```bash
# ❌ REMOVE these for containerized frontends
#VITE_TP_CAPITAL_API_URL=http://localhost:4008

# ✅ SET these only if running frontend locally (npm run dev outside Docker)
# VITE_TP_CAPITAL_API_URL=http://localhost:4008  # OK for local dev
```

**In `docker-compose.yml`:**
```yaml
environment:
  # ✅ Use proxy targets for container-to-container
  - VITE_TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005
```

---

## Section 4: Environment Variable Validation

### 4.1 RULE: Validate Required Variables Before Container Start

**MANDATORY validation script:**

```bash
#!/bin/bash
# scripts/validation/validate-env-before-start.sh

# Check if critical variables are defined and non-empty
required_vars=(
  "TELEGRAM_DB_PASSWORD"
  "TP_CAPITAL_DB_PASSWORD"
  "TELEGRAM_GATEWAY_API_KEY"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ ERROR: $var is not set or empty!"
    exit 1
  fi
done

echo "✅ All required environment variables are set"
```

**Integration with Docker Compose:**
```yaml
services:
  telegram-pgbouncer:
    # Fail fast if password is empty
    environment:
      - DATABASES_PASSWORD=${TELEGRAM_DB_PASSWORD:?ERROR: TELEGRAM_DB_PASSWORD not set}
```

### 4.2 RULE: Inspect Environment Variables After Container Creation

**ALWAYS verify after deployment:**
```bash
# Check if password was loaded correctly
docker inspect telegram-pgbouncer | grep "DATABASES_PASSWORD"

# Expected: "DATABASES_PASSWORD=NYMBgrENUZP8FqUHN1Yo8sdzSfs3kLhp"
# WRONG:    "DATABASES_PASSWORD="  (empty!)
```

---

## Section 5: Health Check Requirements

### 5.1 RULE: Health Checks MUST Include Dependency Checks

**❌ INSUFFICIENT:**
```javascript
// Only checks if server is running
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});
```

**✅ COMPLETE:**
```javascript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    gatewayApi: await checkGatewayApi(),  // Check dependencies!
    redis: await checkRedis(),
  };
  
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
  });
});
```

### 5.2 RULE: Circuit Breakers for External Dependencies

**MANDATORY for all HTTP calls to other services:**

```javascript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(callGatewayApi, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => {
  logger.warn('Circuit breaker OPEN, returning fallback');
  return { data: [] };  // Graceful degradation
});
```

---

## Section 6: Message Processing Queue Management

### 6.1 RULE: Always Validate Message Content Before Processing

**❌ WRONG:**
```javascript
const signal = parseSignal(message.text);  // Fails if text is empty!
```

**✅ CORRECT:**
```javascript
const messageContent = message.text || message.caption || '';

if (!messageContent || messageContent.trim().length === 0) {
  logger.debug('Empty message (photo without text), skipping');
  await markMessageAsFailed(message.id, new Error('Empty message'));
  return;
}

const signal = parseSignal(messageContent);
```

### 6.2 RULE: Filter Internal/System Records in Production Queries

**❌ WRONG:**
```sql
SELECT * FROM signals.tp_capital_signals
ORDER BY ts DESC
LIMIT 10;
-- May return __checkpoint__ records!
```

**✅ CORRECT:**
```sql
SELECT * FROM signals.tp_capital_signals
WHERE asset != '__checkpoint__'  -- Filter internal records
  AND asset != '__test__'
ORDER BY ts DESC
LIMIT 10;
```

### 6.3 RULE: Support All Valid Message Statuses

**❌ WRONG:**
```javascript
// Only fetches 'received' status
const messages = await getMessages({ status: 'received' });
```

**✅ CORRECT:**
```javascript
// Support lifecycle: queued → received → published
const messages = await getMessages({ 
  status: 'received,queued'  // Include both
});
```

---

## Section 7: Deployment Validation Checklist

### 7.1 MANDATORY Pre-Deployment Checks

**Before starting any Docker Compose stack:**

```bash
# 1. Validate environment variables
bash scripts/validation/validate-env.sh

# 2. Check network connectivity
bash scripts/validation/validate-network.sh

# 3. Verify database schemas
bash scripts/validation/validate-schemas.sh

# 4. Test API routes
bash scripts/validation/validate-api-routes.sh
```

### 7.2 MANDATORY Post-Deployment Checks

**After starting containers:**

```bash
# 1. Verify all containers are healthy
docker ps --filter "health=unhealthy"  # Should return 0 containers

# 2. Check environment variables loaded correctly
docker inspect <container> | grep "DATABASES_PASSWORD"  # Should NOT be empty

# 3. Test inter-container connectivity
docker exec tp-capital-api wget -qO- http://telegram-gateway-api:4010/health

# 4. Test API endpoints
curl http://localhost:4008/health  # Should return 200 OK
```

---

## Section 8: Enforcement

### 8.1 Pre-Commit Hook

**MANDATORY validation before commit:**

```bash
# .git/hooks/pre-commit
if git diff --cached --name-only | grep -q "docker-compose.*\.yml"; then
  echo "Validating Docker Compose configurations..."
  bash scripts/validation/validate-compose-files.sh || exit 1
fi
```

### 8.2 CI/CD Pipeline

**MANDATORY validation in GitHub Actions:**

```yaml
- name: Validate Environment Configuration
  run: |
    bash scripts/validation/validate-env.sh --ci-mode
    bash scripts/validation/validate-compose-files.sh
```

---

## Compliance

**Effective Date**: November 5, 2025  
**Review Frequency**: Quarterly (every 90 days)  
**Next Review**: February 3, 2026  

**Violations**:
- **First Offense**: Warning + documentation requirement
- **Second Offense**: Pull request rejected
- **Third Offense**: Access review

---

## Appendix A: Quick Reference Table

| Scenario | Use This | NOT This |
|----------|----------|----------|
| Container A calls Container B | `http://container-b:PORT_INTERNAL` | `http://localhost:PORT_EXTERNAL` |
| Browser calls API via proxy | `/api/service` | `http://container:PORT` |
| Frontend env var (containerized) | `VITE_*_PROXY_TARGET` | `VITE_*_API_URL` |
| Frontend env var (local dev) | `VITE_*_API_URL=http://localhost:PORT_EXTERNAL` | N/A |
| PgBouncer password | `${TELEGRAM_DB_PASSWORD:?ERROR}` | `${TELEGRAM_DB_PASSWORD}` (no validation) |
| SQL query filtering | `WHERE asset != '__checkpoint__'` | No filter (shows internal records) |

---

## References

- Main Policy: [POL-0003: Container Infrastructure Policy](/governance/policies/container-infrastructure-policy.md)
- Incident Report: [2025-11-05 TP-Capital Connectivity Failure](/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.md)
- Validation Script: `/scripts/validation/validate-env.sh`
- Docker Networking Best Practices: `/docs/content/tools/docker/networking-guide.mdx`

---

**Approved By**: Platform Engineering  
**Next Review**: February 3, 2026

