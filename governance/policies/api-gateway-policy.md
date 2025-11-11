---
title: "API Gateway Policy"
policy_id: "POL-GATEWAY-001"
version: "1.0.0"
status: "active"
effective_date: "2025-11-11"
last_review: "2025-11-11"
next_review: "2026-02-11"
owner: "Infrastructure Team"
tags: [gateway, traefik, routing, security, policy]
domain: infrastructure
type: policy
---

# API Gateway Policy

## 1. Purpose

Define mandatory standards and best practices for all HTTP services routing through the Traefik API Gateway in the TradingSystem project.

## 2. Scope

This policy applies to:
- All HTTP/HTTPS services in the TradingSystem
- All microservices requiring external access
- All API endpoints exposed to clients
- All frontend applications

## 3. Policy Statements

### 3.1 Mandatory Gateway Usage

**POLICY:** All HTTP services MUST route through the Traefik API Gateway.

**Requirements:**
- Direct port exposure is PROHIBITED except for:
  - Database services (ports 7000-7999)
  - Internal-only services explicitly documented
  - Development/debugging scenarios with approval
- All services MUST use Docker labels for Traefik discovery
- Services MUST NOT bypass the gateway in production

**Rationale:** Centralized routing provides security, observability, and consistent access control.

### 3.2 Port Allocation

**POLICY:** Strict port ranges are enforced for all services.

| Range | Purpose | Examples |
|-------|---------|----------|
| 7000-7999 | Database services only | TimescaleDB, Qdrant, Redis |
| 9080 | API Gateway (HTTP) | Traefik entrypoint |
| 9081 | Gateway Dashboard | Traefik UI |
| 9443 | API Gateway (HTTPS - future) | Secure entrypoint |

**Requirements:**
- Services MUST NOT use ports in reserved ranges for other purposes
- Port conflicts MUST be resolved before deployment
- Port changes REQUIRE update to governance documentation

### 3.3 Router Configuration

**POLICY:** All routers MUST follow standardized naming and priority conventions.

**Naming Convention:**
```
{service-name}-{type}

Examples:
- workspace-api
- dashboard-ui
- docs-hub
- tp-capital-api
```

**Priority Ranges:**
```
1-10    : Catch-all routes (Dashboard UI, static content)
11-49   : Low priority routes
50-89   : Standard API routes
90-100  : High priority routes (specific path prefixes)
```

**Requirements:**
- Router names MUST be unique and descriptive
- PathPrefix rules MUST be as specific as possible
- Priorities MUST be set explicitly (no defaults)
- Conflicting routes MUST be documented and justified

### 3.4 Path Transformation

**POLICY:** Path transformation MUST be consistent and documented.

**Allowed Patterns:**

1. **Passthrough (no transformation)**
   ```yaml
   # Example: Dashboard UI
   rule: PathPrefix(`/`)
   # No middleware needed
   ```

2. **Simple Strip**
   ```yaml
   # Example: Docs Hub
   # /docs/guide → /guide
   rule: PathPrefix(`/docs`)
   middleware: stripprefix.prefixes=/docs
   ```

3. **Strip + Add (Path Rewrite)**
   ```yaml
   # Example: Workspace API
   # /api/workspace/items → /api/items
   rule: PathPrefix(`/api/workspace`)
   middleware: chain (strip /api/workspace + add /api)
   ```

**Requirements:**
- Path transformations MUST be documented in service compose file
- Backend expectations MUST be clearly commented
- Complex transformations REQUIRE approval and justification

### 3.5 Middleware Usage

**POLICY:** All API services MUST use the standard middleware chain.

**Standard Middleware Chain (`api-standard@file`):**
```yaml
middlewares:
  - cors-global          # CORS headers
  - security-headers     # Security headers (X-Frame-Options, etc.)
  - rate-limit-global    # 100 req/min per IP
  - compress             # gzip/brotli compression
  - circuit-breaker      # Opens at 20% error rate
```

**Requirements:**
- API services MUST use `api-standard@file` middleware
- Frontend apps SHOULD use `static-standard@file` middleware
- Custom middlewares REQUIRE documentation and approval
- Middleware bypass REQUIRES security review

**Exceptions:**
- Internal-only services (with approval)
- Services with specific performance requirements (documented)

### 3.6 Health Checks

**POLICY:** All services MUST implement standardized health checks.

**Requirements:**
```yaml
healthcheck:
  path: /health
  interval: 30s
  timeout: 5s
  retries: 5
  start_period: 10s
```

**Health Endpoint Response:**
```json
{
  "status": "healthy",
  "service": "service-name",
  "version": "1.0.0",
  "timestamp": "2025-11-11T12:00:00Z",
  "checks": {
    "database": {"status": "healthy"},
    "cache": {"status": "healthy"}
  }
}
```

**Requirements:**
- Health endpoints MUST return 200 for healthy, 503 for unhealthy
- Health checks MUST validate critical dependencies
- Health check failures MUST be logged and alerted

### 3.7 Network Segmentation

**POLICY:** Services MUST connect to appropriate Docker networks.

**Network Requirements:**

| Network | Purpose | Who Should Join |
|---------|---------|-----------------|
| tradingsystem_backend | Backend APIs | All API services, Gateway |
| tradingsystem_frontend | Frontend apps | Dashboard, Docs, Gateway |
| tp_capital_backend | TP Capital isolated | TP Capital services, Gateway |
| telegram_backend | Telegram isolated | Telegram services, Gateway |

**Requirements:**
- Gateway MUST be member of all networks
- Services SHOULD use dedicated networks for isolation
- Cross-network communication MUST go through gateway
- Network changes REQUIRE infrastructure review

### 3.8 Service Discovery Labels

**POLICY:** All services MUST use standardized Traefik labels.

**Mandatory Labels:**
```yaml
labels:
  # Enable Traefik
  - "traefik.enable=true"

  # Router Configuration
  - "traefik.http.routers.{service-name}.rule=PathPrefix(`/path`)"
  - "traefik.http.routers.{service-name}.entrypoints=web"
  - "traefik.http.routers.{service-name}.service={service-name}"
  - "traefik.http.routers.{service-name}.priority={number}"

  # Service Configuration
  - "traefik.http.services.{service-name}.loadbalancer.server.port={port}"

  # Middlewares
  - "traefik.http.routers.{service-name}.middlewares={middleware-chain}"

  # Health Check
  - "traefik.http.services.{service-name}.loadbalancer.healthcheck.path=/health"
  - "traefik.http.services.{service-name}.loadbalancer.healthcheck.interval=30s"
```

**Requirements:**
- Labels MUST be complete and valid
- Service names MUST match container names
- Ports MUST match internal container ports
- Labels MUST be tested before merge

### 3.9 Security Requirements

**POLICY:** All gateway-routed services MUST meet security standards.

**Mandatory Security Controls:**
1. **CORS:** Properly configured allowed origins
2. **Security Headers:** X-Frame-Options, X-Content-Type-Options, etc.
3. **Rate Limiting:** Minimum 100 req/min per IP
4. **Circuit Breaker:** Enabled for all external-facing APIs
5. **TLS (future):** HTTPS with valid certificates

**Requirements:**
- Services MUST NOT disable security middlewares without approval
- Sensitive endpoints MUST have additional authentication
- Rate limits CAN be increased with justification
- Security configurations MUST be documented

### 3.10 Observability

**POLICY:** All services MUST support comprehensive observability.

**Requirements:**
1. **Access Logs:** JSON format, stored in `/var/log/traefik/`
2. **Metrics:** Prometheus format at `/metrics`
3. **Tracing (future):** OpenTelemetry compatible
4. **Dashboard:** Traefik dashboard enabled at port 9081

**Monitored Metrics:**
- Request count per service
- Response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- Circuit breaker state changes
- Rate limit violations

## 4. Compliance and Enforcement

### 4.1 Pre-Deployment Checklist

Before deploying a new service:

- [ ] Traefik labels configured correctly
- [ ] Health check endpoint implemented
- [ ] Middleware chain applied
- [ ] Priority set appropriately
- [ ] Path transformation tested
- [ ] Network membership verified
- [ ] Documentation updated
- [ ] Validation script passes

### 4.2 Validation

**Automated Validation:**
```bash
bash scripts/gateway/validate-traefik.sh --verbose
```

**Manual Validation:**
```bash
# 1. Check router status
curl http://localhost:9080/api/http/routers/{service-name}@docker

# 2. Check service backend
curl http://localhost:9080/api/http/services/{service-name}@docker

# 3. Test health endpoint
curl http://localhost:9080/{path}/health

# 4. Test actual endpoint
curl http://localhost:9080/{path}/{endpoint}
```

### 4.3 Non-Compliance

**Consequences:**
- Services not complying will be REJECTED in PR review
- Deployed non-compliant services will be DISABLED
- Repeated violations require architecture review

## 5. Exceptions Process

### 5.1 Request Exception

To request an exception to this policy:

1. Document the specific requirement
2. Justify why standard approach doesn't work
3. Propose alternative solution
4. Submit for infrastructure team review
5. Document approved exception

### 5.2 Temporary Exceptions

- Maximum duration: 30 days
- Requires explicit approval
- Must include remediation plan
- Logged in governance tracking

## 6. Change Management

### 6.1 Policy Updates

This policy is reviewed quarterly and updated as needed.

**Change Process:**
1. Propose change with justification
2. Infrastructure team review
3. Impact assessment
4. Documentation update
5. Communication to teams
6. Grace period for compliance

### 6.2 Breaking Changes

Breaking changes to gateway configuration:

- MUST be communicated 2 weeks in advance
- MUST include migration guide
- MUST maintain backward compatibility during transition
- SHOULD provide automated migration script

## 7. References

- [Traefik Migration Guide](../docs/TRAEFIK-GATEWAY-MIGRATION.md)
- [Validation Script](../scripts/gateway/validate-traefik.sh)
- [Docker Compose - Gateway](../tools/compose/docker-compose.0-gateway-stack.yml)
- [Middleware Configuration](../tools/traefik/dynamic/middlewares.yml)

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-11 | Claude Code | Initial policy creation |

## 9. Approval

**Approved by:** Infrastructure Team
**Date:** 2025-11-11
**Next Review:** 2026-02-11

---

**Classification:** Internal Use
**Status:** Active
**Enforcement:** Mandatory
