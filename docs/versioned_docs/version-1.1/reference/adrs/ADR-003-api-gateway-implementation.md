---
title: "ADR-003: API Gateway Implementation for Centralized Authentication and Routing"
date: 2025-11-01
description: "Architecture Decision Record for implementing an API Gateway to centralize authentication, routing, and security policies across microservices"
status: proposed
tags: [architecture, security, infrastructure, api-gateway]
domain: infrastructure
type: adr
summary: "Architecture Decision Record for implementing an API Gateway to centralize authentication, routing, and security policies across microservices"
owner: ArchitectureGuild
lastReviewed: "2025-11-01"
last_review: 2025-11-01
---

# ADR-003: API Gateway Implementation for Centralized Authentication and Routing

## Status
**Proposed** - Under review for implementation in Q1 2026

## Context

### Current Situation

The TradingSystem currently operates with a direct service-to-client architecture:
- Frontend (Dashboard) connects directly to multiple backend services
- Each service implements its own CORS, rate limiting, and authentication
- No centralized point for request routing, logging, or security policy enforcement
- Services trust each other implicitly without verification

### Problems Identified

1. **Security Gaps:**
   - No inter-service authentication (services trust each other blindly)
   - Inconsistent security policies across services
   - JWT tokens validated individually in each service
   - No centralized audit logging for API calls

2. **Operational Complexity:**
   - CORS configuration duplicated across 6+ services
   - Rate limiting in-memory (resets on restart)
   - No centralized monitoring of API traffic
   - Difficult to enforce organization-wide policies

3. **Scalability Limitations:**
   - No service discovery mechanism
   - Static service endpoints hardcoded in frontend
   - Difficult to implement blue-green deployments
   - No load balancing across service instances

4. **Developer Experience:**
   - Frontend needs to know about all backend service locations
   - API versioning handled inconsistently
   - No unified API documentation portal

### Architecture Review Findings

From the [Architecture Review 2025-11-01](https://github.com/marceloterra1983/TradingSystem/blob/main/governance/reviews/architecture-2025-11-01/index.md):
- **Security Grade:** B+ (needs improvement)
- **Critical Issue:** Missing API Gateway identified as Priority 1
- **Impact:** High coupling, security vulnerabilities, operational overhead

## Decision

We will implement an **API Gateway** using one of the following options (evaluation required):

### Option A: Kong Gateway (Recommended)
**Pros:**
- Open-source, enterprise-grade
- Rich plugin ecosystem (JWT, rate limiting, logging, ACL)
- Built-in service discovery
- GUI (Kong Manager) for configuration
- Excellent performance (OpenResty/Nginx)
- Extensive monitoring and analytics
- Declarative configuration support

**Cons:**
- Heavier resource footprint
- PostgreSQL/Cassandra dependency
- Steeper learning curve

### Option B: Traefik
**Pros:**
- Lightweight, cloud-native
- Built for Docker/Kubernetes
- Automatic service discovery (Docker labels)
- Let's Encrypt integration
- Simple configuration (YAML/TOML)
- Good observability (Prometheus, Jaeger)

**Cons:**
- Fewer built-in plugins
- Less mature enterprise features
- Limited GUI options

### Option C: Nginx + Custom Middleware (Not Recommended)
**Pros:**
- Already using Nginx for reverse proxy
- Full control over implementation
- Lightweight

**Cons:**
- Requires custom development for advanced features
- No built-in service discovery
- Manual configuration management
- Higher maintenance burden

## Recommended Solution: Kong Gateway

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Internet / Clients                   │
└────────────────────┬────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │   Firewall  │ (Optional: WAF)
              └──────┬──────┘
                     │
         ┌───────────▼───────────┐
         │   Kong API Gateway    │
         │  (Port 8000/8443)     │
         │                       │
         │  Plugins:             │
         │  - JWT Auth           │
         │  - Rate Limiting      │
         │  - CORS               │
         │  - Request Logging    │
         │  - IP Restriction     │
         │  - Response Transform │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌─────▼─────┐
    │ Frontend │          │  Backend  │
    │ Services │          │  Services │
    │          │          │           │
    │ - Dashboard (3103) │ - Workspace (3200)
    │ - Docs (3400)      │ - TP Capital (4005)
    │                    │ - Documentation API (3401)
    │                    │ - RAG Services (8201, 8202)
    └──────────┘          └───────────┘
```

### Implementation Plan

#### Phase 1: Infrastructure Setup (Week 1)
1. Deploy Kong Gateway via Docker Compose
2. Configure PostgreSQL database for Kong
3. Set up Kong Manager (Admin GUI)
4. Configure basic routing for one service (testing)

#### Phase 2: Service Migration (Week 2)
1. Configure routes for all existing services
2. Implement JWT authentication plugin
3. Configure rate limiting (Redis-backed)
4. Set up CORS policies
5. Configure request/response logging

#### Phase 3: Advanced Features (Week 3-4)
1. Implement inter-service authentication
2. Configure API versioning strategy
3. Set up monitoring (Prometheus + Grafana)
4. Configure request/response transformations
5. Implement circuit breaker patterns
6. Add IP whitelisting for internal services

#### Phase 4: Production Hardening (Week 5-6)
1. Load testing and performance tuning
2. Configure failover and high availability
3. Set up automated backups for Kong DB
4. Create runbooks for common operations
5. Security audit and penetration testing
6. Documentation and team training

### Configuration Example

**Docker Compose Service:**
```yaml
services:
  kong-database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kong
      POSTGRES_USER: kong
      POSTGRES_PASSWORD: ${KONG_PG_PASSWORD}
    volumes:
      - kong_data:/var/lib/postgresql/data
    networks:
      - tradingsystem_backend

  kong:
    image: kong:3.4-alpine
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: ${KONG_PG_PASSWORD}
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    ports:
      - "8000:8000"  # Proxy HTTP
      - "8443:8443"  # Proxy HTTPS
      - "8001:8001"  # Admin API
    depends_on:
      - kong-database
    networks:
      - tradingsystem_backend
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**Service Route Configuration (Declarative):**
```yaml
_format_version: "3.0"

services:
  - name: workspace-api
    url: http://apps-workspace:3200
    routes:
      - name: workspace-route
        paths:
          - /api/workspace
        strip_path: true
    plugins:
      - name: jwt
        config:
          key_claim_name: kid
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
          redis_host: rag-redis
          redis_port: 6379
      - name: cors
        config:
          origins:
            - http://localhost:3103
            - http://tradingsystem.local
          credentials: true
```

**JWT Authentication Plugin:**
```bash
# Create JWT credential for frontend
curl -X POST http://localhost:8001/consumers/dashboard/jwt \
  -H "Content-Type: application/json" \
  -d '{
    "key": "dashboard-app",
    "algorithm": "HS256",
    "secret": "<JWT_SECRET_FROM_ENV>"
  }'
```

## Consequences

### Positive

1. **Security:**
   ✅ Centralized JWT validation
   ✅ Consistent rate limiting across all services
   ✅ Inter-service authentication with API keys
   ✅ Centralized audit logging
   ✅ IP whitelisting for internal services

2. **Scalability:**
   ✅ Service discovery and load balancing
   ✅ Easy blue-green deployments
   ✅ Horizontal scaling of backend services
   ✅ Circuit breaker patterns

3. **Operations:**
   ✅ Single point for monitoring API traffic
   ✅ Simplified CORS management
   ✅ Centralized configuration
   ✅ Better observability (Prometheus, Jaeger)

4. **Developer Experience:**
   ✅ Unified API documentation portal
   ✅ Consistent API versioning
   ✅ Easier integration testing
   ✅ Simplified frontend configuration

### Negative

1. **Complexity:**
   ⚠️ Additional infrastructure component to manage
   ⚠️ Learning curve for team
   ⚠️ Extra hop in request path (minimal latency ~5-10ms)

2. **Operations:**
   ⚠️ Single point of failure (mitigated with HA setup)
   ⚠️ Additional monitoring/maintenance overhead
   ⚠️ PostgreSQL dependency for Kong

3. **Migration:**
   ⚠️ Services need configuration updates
   ⚠️ Frontend needs endpoint changes
   ⚠️ Requires phased rollout strategy

### Mitigation Strategies

**Single Point of Failure:**
- Deploy Kong in HA mode (2+ instances behind load balancer)
- Configure automatic failover
- Implement health checks and circuit breakers

**Performance Impact:**
- Use Redis for rate limiting (fast, distributed)
- Enable response caching where appropriate
- Monitor latency metrics (target: `under 10ms` overhead)

**Operational Overhead:**
- Automate Kong configuration with declarative config files
- Use Infrastructure as Code (Terraform/Ansible)
- Set up automated backups and disaster recovery

## Implementation Checklist

- [ ] **Week 1:** Deploy Kong + PostgreSQL via Docker Compose
- [ ] **Week 1:** Configure Kong Admin API and Kong Manager
- [ ] **Week 1:** Create test route for one service (workspace-api)
- [ ] **Week 2:** Migrate all service routes to Kong
- [ ] **Week 2:** Implement JWT authentication plugin
- [ ] **Week 2:** Configure Redis-backed rate limiting
- [ ] **Week 3:** Set up inter-service authentication (API keys)
- [ ] **Week 3:** Configure API versioning strategy
- [ ] **Week 3:** Implement monitoring (Prometheus + Grafana dashboards)
- [ ] **Week 4:** Load testing (target: 1000 req/s with `under 100ms` latency)
- [ ] **Week 4:** Configure circuit breakers for external services
- [ ] **Week 5:** Security audit and penetration testing
- [ ] **Week 5:** Create operational runbooks
- [ ] **Week 6:** Team training and documentation
- [ ] **Week 6:** Production deployment with gradual rollout

## Metrics for Success

| Metric | Before | After (Target) | Measurement |
|--------|--------|----------------|-------------|
| API Response Time (P95) | 200ms | `under 210ms` | Prometheus |
| Security Score | B+ | A | Manual audit |
| MTTR (Mean Time to Repair) | 30min | 15min | Incident logs |
| API Error Rate | 2% | `under 1%` | Kong Analytics |
| Developer Onboarding Time | 2 days | 4 hours | Survey |

## References

- [Architecture Review 2025-11-01](https://github.com/marceloterra1983/TradingSystem/blob/main/governance/reviews/architecture-2025-11-01/index.md)
- [Kong Gateway Documentation](https://docs.konghq.com/gateway/latest/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [API Gateway Pattern (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/gateway)
- [ADR-002: File Watcher Auto-Ingestion](./rag-services/ADR-002-file-watcher-auto-ingestion.md)
- [ADR-001: Redis Caching Strategy](./rag-services/ADR-001-redis-caching-strategy.md)

## Alternatives Considered

### Alternative 1: Nginx + OpenResty
**Why Rejected:** Requires significant custom development for features that Kong provides out-of-the-box.

### Alternative 2: AWS API Gateway
**Why Rejected:** Project requirement is 100% on-premise, no cloud dependencies.

### Alternative 3: Envoy Proxy
**Why Rejected:** Steeper learning curve, better suited for Kubernetes environments.

## Decision Makers

- **Architecture Review Team:** Claude Code Architecture Reviewer
- **Approval Required:** Project Lead, DevOps Team, Security Team
- **Implementation Owner:** Backend Team Lead

## Timeline

**Proposed Start:** 2026-01-15
**Target Completion:** 2026-03-01 (6 weeks)
**Review Date:** 2026-02-01 (mid-implementation review)

---

**Document Version:** 1.0
**Next Review:** 2026-02-01
