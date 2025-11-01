---
title: "Technical Debt Tracker - TradingSystem"
date: 2025-11-01
status: active
tags: [technical-debt, planning, architecture, quality]
domain: governance
type: planning
summary: "Comprehensive tracking of technical debt items with prioritization, effort estimates, and remediation plans"
last_review: 2025-11-01
---

# Technical Debt Tracker - TradingSystem

**Last Updated:** 2025-11-01
**Source:** [Architecture Review 2025-11-01](../reviews/architecture-2025-11-01/index.md)

---

## Overview

This document tracks all identified technical debt items across the TradingSystem project, with prioritization based on:
- **Business Impact** (High/Medium/Low)
- **Risk Level** (Critical/High/Medium/Low)
- **Effort Required** (Person-weeks)
- **Dependencies** (Blocking relationships)

## Debt Categories

1. **Code Debt** - Code quality, testing, refactoring
2. **Infrastructure Debt** - Architecture, deployment, scalability
3. **Documentation Debt** - Missing or outdated documentation
4. **Security Debt** - Vulnerabilities, compliance gaps

---

## Priority 1: Critical (Immediate Action Required)

### DEBT-001: Missing API Gateway
**Category:** Infrastructure Debt
**Status:** 🔴 Proposed
**Risk:** Critical
**Business Impact:** High
**Effort:** 2 weeks

**Problem:**
- No centralized authentication/routing for microservices
- Services trust each other without verification
- Inconsistent security policies across services
- Difficult to implement organization-wide policies

**Impact:**
- Security vulnerabilities (lateral movement attacks)
- Operational overhead (duplicate CORS, rate limiting)
- Scalability limitations (no service discovery)

**Solution:**
- Implement Kong Gateway for centralized routing
- Configure JWT authentication plugin
- Set up Redis-backed rate limiting
- Implement inter-service authentication

**ADR:** [ADR-003: API Gateway Implementation](../reference/adrs/ADR-003-api-gateway-implementation.md)

**Timeline:**
- Start: 2026-01-15
- Target: 2026-03-01 (6 weeks)

**Owner:** Backend Team Lead

**Blockers:** None

**Dependencies:**
- DEBT-003 (Inter-service auth depends on API Gateway)

---

### DEBT-002: Single Database Instance (TimescaleDB)
**Category:** Infrastructure Debt
**Status:** 🔴 Planned
**Risk:** Critical
**Business Impact:** High
**Effort:** 3 weeks

**Problem:**
- All services (workspace, tp-capital) share single TimescaleDB instance
- Single point of failure for entire system
- Connection pool exhaustion risk under high load
- No read/write separation for optimization

**Impact:**
- Cascading service failures if DB goes down
- Performance bottlenecks during peak load
- Inability to scale read operations independently

**Solution:**
- Configure TimescaleDB streaming replication (1 primary + 2 replicas)
- Implement PgBouncer for connection pooling
- Route read queries to replicas
- Set up automatic failover with patroni/etcd

**Timeline:**
- Start: 2026-02-01
- Target: 2026-02-22 (3 weeks)

**Owner:** DevOps Team

**Blockers:** None

**Dependencies:**
- DEBT-004 (CQRS pattern benefits from read replicas)

---

### DEBT-003: Missing Inter-Service Authentication
**Category:** Security Debt
**Status:** 🔴 Planned
**Risk:** Critical
**Business Impact:** High
**Effort:** 1 week

**Problem:**
- Services trust each other blindly (no verification)
- Any compromised service can access all internal APIs
- No audit trail for service-to-service calls

**Impact:**
- Lateral movement attacks possible
- Difficult to trace security incidents
- Compliance risk (no authentication logs)

**Solution:**
```javascript
// Implement shared secret verification
const INTER_SERVICE_SECRET = process.env.INTER_SERVICE_SECRET;

function verifyServiceAuth(req, res, next) {
  const serviceToken = req.headers['x-service-token'];
  if (serviceToken !== INTER_SERVICE_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.use('/internal/*', verifyServiceAuth);
```

**Timeline:**
- Start: 2026-03-01 (after API Gateway)
- Target: 2026-03-08 (1 week)

**Owner:** Security Team

**Blockers:** DEBT-001 (API Gateway must be deployed first)

---

### DEBT-004: Limited Test Coverage (~30%)
**Category:** Code Debt
**Status:** 🔴 In Progress
**Risk:** High
**Business Impact:** High
**Effort:** 4 weeks

**Problem:**
- Current test coverage ~30% (far below 80% target)
- Missing integration tests for critical paths
- No E2E tests for user workflows
- Manual testing required for regression checks

**Impact:**
- High risk of regressions in production
- Slow feature development (manual QA)
- Difficult to refactor with confidence

**Solution:**
1. **Unit Tests (2 weeks):**
   - Target 80% coverage for services
   - Use Vitest for frontend, Jest for backend
   - Mock external dependencies

2. **Integration Tests (1 week):**
   - API contract testing (Supertest)
   - Database integration tests
   - WebSocket communication tests

3. **E2E Tests (1 week):**
   - Critical user workflows (Playwright, Cypress)
   - Cross-browser testing
   - Performance regression tests

**Timeline:**
- Start: 2026-01-15 (parallel with API Gateway)
- Target: 2026-02-12 (4 weeks)

**Owner:** QA Team + Backend Team

**Blockers:** None

---

### DEBT-005: No Circuit Breakers for Critical Paths
**Category:** Infrastructure Debt
**Status:** 🔴 Planned
**Risk:** High
**Business Impact:** Medium
**Effort:** 1 week

**Problem:**
- WebSocket connections lack fault tolerance
- ProfitDLL callbacks have no fallback mechanism
- External API calls can hang indefinitely

**Impact:**
- Cascading failures during outages
- Resource exhaustion (hanging connections)
- Poor user experience (long timeouts)

**Solution:**
```javascript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(callProfitDLL, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.fallback(() => ({ error: 'Service unavailable' }));
breaker.on('open', () => logger.error('Circuit breaker opened!'));
```

**Timeline:**
- Start: 2026-02-15
- Target: 2026-02-22 (1 week)

**Owner:** Backend Team

**Blockers:** None

---

## Priority 2: High (Next Sprint)

### DEBT-006: No API Versioning Strategy
**Category:** Infrastructure Debt
**Status:** 🟡 Planned
**Risk:** High
**Business Impact:** Medium
**Effort:** 1 week

**Problem:**
- No version management for breaking changes
- Clients break when API changes
- Difficult to deprecate old endpoints

**Solution:**
```javascript
// URL-based versioning (recommended)
app.use('/api/v1/orders', ordersRouterV1);
app.use('/api/v2/orders', ordersRouterV2);
```

**Timeline:**
- Start: 2026-03-08
- Target: 2026-03-15 (1 week)

**Owner:** Backend Team Lead

---

### DEBT-007: Large Frontend Bundle Size (~800KB)
**Category:** Code Debt
**Status:** 🟡 Planned
**Risk:** Medium
**Business Impact:** Medium
**Effort:** 1 week

**Problem:**
- Main bundle size ~800KB (uncompressed)
- Slow initial page load (3-4s)
- No code splitting for routes

**Solution:**
```typescript
// Route-based lazy loading
const LlamaIndexPage = lazy(() => import('./components/pages/LlamaIndexPage'));

<Route path="/llama" element={
  <Suspense fallback={<LoadingSpinner />}>
    <LlamaIndexPage />
  </Suspense>
} />
```

**Expected Reduction:** 50% (800KB → 400KB main bundle)

**Timeline:**
- Start: 2026-03-15
- Target: 2026-03-22 (1 week)

**Owner:** Frontend Team

---

### DEBT-008: In-Memory Rate Limiting
**Category:** Infrastructure Debt
**Status:** 🟡 Planned
**Risk:** Medium
**Business Impact:** Medium
**Effort:** 3 days

**Problem:**
- Rate limiter resets on service restart
- Not shared across service instances
- Ineffective for distributed deployment

**Solution:**
```javascript
import RedisStore from 'rate-limit-redis';

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  }),
  windowMs: 60000,
  max: 100,
});
```

**Timeline:**
- Start: 2026-03-08
- Target: 2026-03-11 (3 days)

**Owner:** Backend Team

---

### DEBT-009: Missing Error Boundaries (React)
**Category:** Code Debt
**Status:** 🟡 Planned
**Risk:** Medium
**Business Impact:** Low
**Effort:** 2 days

**Problem:**
- No runtime error handling in React
- Crashes show white screen to users
- Errors not captured in monitoring

**Solution:**
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logger.error({ error, errorInfo });
    // Send to Sentry
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

**Timeline:**
- Start: 2026-03-22
- Target: 2026-03-24 (2 days)

**Owner:** Frontend Team

---

### DEBT-010: Circular Dependencies
**Category:** Code Debt
**Status:** 🟡 Identified
**Risk:** Medium
**Business Impact:** Low
**Effort:** 2 weeks

**Problem:**
- `backend/shared/middleware` ↔ `backend/shared/logger`
- `frontend/contexts` ↔ `frontend/store`
- Risk of initialization deadlock and re-render loops

**Solution:**
- Break circular imports with dependency injection
- Use event-driven communication instead of direct imports
- Apply Interface Segregation Principle (ISP)

**Timeline:**
- Start: 2026-04-01
- Target: 2026-04-15 (2 weeks)

**Owner:** Backend Team + Frontend Team

---

## Priority 3: Medium (Future Iterations)

### DEBT-011: No CQRS Pattern for Read/Write Separation
**Category:** Architecture Debt
**Status:** 🟢 Backlog
**Risk:** Low
**Business Impact:** Medium
**Effort:** 3 weeks

**Problem:**
- Shared database creates read/write bottlenecks
- Complex queries slow down write operations
- Difficult to scale reads independently

**Solution:**
- Separate read (queries) and write (commands) models
- Use event sourcing for state changes
- Implement read replicas for queries

**Timeline:** TBD (Q2 2026)

---

### DEBT-012: No Distributed Tracing (OpenTelemetry)
**Category:** Infrastructure Debt
**Status:** 🟢 Backlog
**Risk:** Low
**Business Impact:** Medium
**Effort:** 2 weeks

**Problem:**
- Limited visibility into request flows across services
- Difficult to debug latency issues
- No correlation between logs and traces

**Solution:**
- Instrument services with OpenTelemetry SDK
- Export traces to Jaeger/Zipkin
- Correlate logs + traces + metrics

**Timeline:** TBD (Q2 2026)

---

### DEBT-013: RAG Query Latency (3-5s)
**Category:** Performance Debt
**Status:** 🟢 Backlog
**Risk:** Low
**Business Impact:** Medium
**Effort:** 2 weeks

**Problem:**
- Ollama LLM inference takes 3-5s per query
- No query result caching
- Poor user experience for documentation search

**Solution:**
- Semantic cache with sentence embeddings
- Re-ranking with ColBERT
- Hybrid search (BM25 + vector)
- Stream responses (Server-Sent Events)

**Expected Improvement:** 80% latency reduction (3-5s → <1s)

**Timeline:** TBD (Q2 2026)

---

### DEBT-014: Code Duplication Across Services
**Category:** Code Debt
**Status:** 🟢 Backlog
**Risk:** Low
**Business Impact:** Low
**Effort:** 2 weeks

**Problem:**
- CORS configuration duplicated in 6+ services
- Logging setup duplicated
- Authentication middleware duplicated

**Solution:**
- Extract common middleware to `backend/shared/`
- Create npm workspace for shared packages
- Establish code reuse guidelines

**Timeline:** TBD (Q3 2026)

---

### DEBT-015: Hardcoded Configurations
**Category:** Code Debt
**Status:** 🟢 Backlog
**Risk:** Low
**Business Impact:** Low
**Effort:** 1 week

**Problem:**
- Port numbers hardcoded in frontend
- API endpoints hardcoded
- Timeouts and limits hardcoded

**Solution:**
- Move all configs to `.env` file
- Use environment-specific config files
- Implement configuration validation

**Timeline:** TBD (Q3 2026)

---

## Summary Dashboard

### Debt by Priority

| Priority | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| P1 | 5 | 0 | 0 | 0 | 5 |
| P2 | 0 | 5 | 0 | 0 | 5 |
| P3 | 0 | 0 | 3 | 2 | 5 |
| **Total** | **5** | **5** | **3** | **2** | **15** |

### Debt by Category

| Category | Items | Total Effort |
|----------|-------|--------------|
| Infrastructure Debt | 7 | 12 weeks |
| Code Debt | 5 | 8 weeks |
| Security Debt | 1 | 1 week |
| Documentation Debt | 2 | 2 weeks |
| **Total** | **15** | **23 weeks** |

### Effort Distribution

```
Priority 1 (Critical):  12 weeks  ████████████░░░░░░░░░░░░ (52%)
Priority 2 (High):       6 weeks  ██████░░░░░░░░░░░░░░░░░░ (26%)
Priority 3 (Medium):     5 weeks  █████░░░░░░░░░░░░░░░░░░░ (22%)
```

### Timeline (Next 6 Months)

```
2026-Q1 (Jan-Mar):
├─ DEBT-001: API Gateway (2 weeks)
├─ DEBT-004: Test Coverage (4 weeks, parallel)
├─ DEBT-002: Database Replicas (3 weeks)
├─ DEBT-003: Inter-Service Auth (1 week)
└─ DEBT-005: Circuit Breakers (1 week)

2026-Q2 (Apr-Jun):
├─ DEBT-006: API Versioning (1 week)
├─ DEBT-007: Bundle Optimization (1 week)
├─ DEBT-008: Distributed Rate Limiting (3 days)
├─ DEBT-009: Error Boundaries (2 days)
├─ DEBT-010: Circular Dependencies (2 weeks)
└─ DEBT-011-013: Medium priority items

2026-Q3 (Jul-Sep):
└─ DEBT-014-015: Low priority cleanup
```

---

## Progress Tracking

**Completed:** 0 / 15 (0%)
**In Progress:** 1 / 15 (7%)
**Planned:** 9 / 15 (60%)
**Backlog:** 5 / 15 (33%)

---

## Related Documents

- [Architecture Review 2025-11-01](../reviews/architecture-2025-11-01/index.md)
- [ADR-003: API Gateway Implementation](../reference/adrs/ADR-003-api-gateway-implementation.md)
- [CLAUDE.md - Architecture Guidelines](../../../CLAUDE.md#architecture--quality-guidelines)

---

**Document Version:** 1.0
**Next Review:** 2026-02-01
**Owner:** Architecture Review Team
