# GitHub Issues Template - RAG Architecture Review

**Generated:** 2025-11-03  
**Review:** RAG System Architecture Review  
**Total Issues:** 13

---

## Critical Priority (P1) - 4 Issues

### Issue #1: Deploy Qdrant High Availability Cluster

```markdown
## Description
Deploy Qdrant in HA mode (3-node cluster) to prevent data loss and achieve 99.99% availability.

## Context
- **Current:** Single Qdrant instance (SPOF - single point of failure)
- **Risk:** Data loss if container crashes (~20% annual probability)
- **Impact:** $50,000 estimated cost per incident

## Acceptance Criteria
- [ ] 3-node Qdrant cluster deployed via Docker Compose
- [ ] Raft consensus configured (automatic leader election)
- [ ] NGINX load balancer distributes traffic across nodes
- [ ] Data replication verified (3x copies across nodes)
- [ ] Automatic failover tested (< 1 second recovery)
- [ ] Backup strategy updated for clustered setup
- [ ] Documentation updated (`docs/content/tools/rag/qdrant-ha.mdx`)

## Implementation Guide
- **File:** `tools/compose/docker-compose.qdrant-ha.yml`
- **Reference:** See architecture review section 9.1.1
- **Dependencies:** None

## Testing
- [ ] Failover test: Kill leader node, verify automatic recovery
- [ ] Data consistency test: Write to cluster, verify replication
- [ ] Performance test: Compare latency vs single instance

## Rollback Plan
1. Stop clustered Qdrant services
2. Restart single-instance Qdrant
3. Restore from latest snapshot

## Effort
- **Estimate:** 1 week (5 days)
- **Team:** Backend + DevOps
- **Priority:** P1 (Critical)

## Labels
- `priority: critical`
- `area: infrastructure`
- `component: qdrant`
- `type: enhancement`
- `architecture-review`
```

---

### Issue #2: Implement Inter-Service Authentication

```markdown
## Description
Add X-Service-Token authentication to all internal service-to-service calls.

## Context
- **Current:** Services trust each other without verification
- **Risk:** Lateral movement attacks if one service is compromised
- **Impact:** Security compliance failure, potential data breach

## Acceptance Criteria
- [ ] `INTER_SERVICE_SECRET` configured in `.env` (min 32 chars)
- [ ] `serviceAuth.js` middleware applied to all internal endpoints
- [ ] Python services use `serviceAuth.py` dependency
- [ ] Failed authentication attempts logged (audit trail)
- [ ] Secret rotation script created (`scripts/security/rotate-inter-service-secret.sh`)
- [ ] Documentation updated with security best practices

## Implementation Guide
- **Files:**
  - `backend/shared/middleware/serviceAuth.js` (already exists)
  - `backend/shared/auth/serviceAuth.py` (already exists)
  - `scripts/security/rotate-inter-service-secret.sh` (new)
- **Reference:** See architecture review section 6.1

## Protected Endpoints
- [ ] Collections Service → Ingestion Service
- [ ] Documentation API → LlamaIndex Query
- [ ] Documentation API → Collections Service
- [ ] All `/admin/*` routes

## Testing
- [ ] Integration test: Valid token → 200 OK
- [ ] Integration test: Missing token → 403 Forbidden
- [ ] Integration test: Invalid token → 403 Forbidden
- [ ] Integration test: Token rotation → No downtime

## Security Checklist
- [ ] Secret stored in `.env` (not committed to git)
- [ ] Audit logging enabled for failed attempts
- [ ] Rotation documented in runbook
- [ ] Compliance team notified

## Effort
- **Estimate:** 3 days
- **Team:** Backend + Security
- **Priority:** P1 (Critical)

## Labels
- `priority: critical`
- `area: security`
- `type: security`
- `architecture-review`
```

---

### Issue #3: Increase Test Coverage - Phase 1 (RagProxyService)

```markdown
## Description
Achieve 80% test coverage for RagProxyService with unit + integration tests.

## Context
- **Current:** 5% overall test coverage, high regression risk
- **Target:** 80% coverage (industry standard)
- **Impact:** Reduced debugging time, faster feature development

## Acceptance Criteria
- [ ] RagProxyService unit tests: 80% line coverage
- [ ] Circuit breaker behavior: 100% coverage
- [ ] Cache invalidation: 100% coverage
- [ ] Error scenarios: 80% coverage
- [ ] Integration tests: End-to-end flows tested
- [ ] CI/CD pipeline enforces coverage threshold
- [ ] Coverage report published to PR comments

## Test Files to Create
```
backend/api/documentation-api/src/services/__tests__/
├── RagProxyService.unit.test.js          (40 tests)
├── RagProxyService.integration.test.js    (25 tests)
├── circuitBreaker.test.js                 (15 tests)
├── threeTierCache.test.js                 (20 tests)
└── errorHandling.test.js                  (10 tests)
                                           -----------
Total: 110 tests
```

## Test Scenarios
### Circuit Breaker
- [ ] Opens after 5 consecutive failures
- [ ] Recovers after 30s timeout (half-open state)
- [ ] Fails fast when open (< 100ms)
- [ ] Closes on successful recovery

### Cache Invalidation
- [ ] Invalidates after document ingestion
- [ ] Invalidates after collection update
- [ ] TTL expiration works correctly
- [ ] Multi-tier consistency maintained

### Error Handling
- [ ] Upstream timeout → ServiceUnavailableError
- [ ] Invalid JWT → UnauthorizedError
- [ ] Empty query → ValidationError
- [ ] Qdrant down → Circuit breaker opens

## Effort
- **Estimate:** 1 week (5 days)
- **Team:** Backend
- **Priority:** P1 (Critical)

## Labels
- `priority: critical`
- `area: testing`
- `type: enhancement`
- `architecture-review`
```

---

### Issue #4: Deploy API Gateway (Kong)

```markdown
## Description
Deploy Kong Gateway to centralize authentication, rate limiting, and routing.

## Context
- **Current:** Direct service-to-service communication, distributed auth
- **Problem:** Service coupling, no centralized observability
- **Benefit:** Single entry point, unified auth, better monitoring

## Acceptance Criteria
- [ ] Kong Gateway deployed via Docker Compose
- [ ] PostgreSQL database for Kong configuration
- [ ] Konga admin UI accessible at http://localhost:1337
- [ ] All RAG endpoints routed through Kong
- [ ] JWT authentication plugin configured
- [ ] Rate limiting plugin configured (100 req/min)
- [ ] CORS plugin configured
- [ ] Analytics and logging enabled
- [ ] Documentation updated (`docs/content/tools/api-gateway/kong.mdx`)

## Routes to Configure
- [ ] `GET /api/v1/rag/search` → LlamaIndex Query
- [ ] `POST /api/v1/rag/query` → LlamaIndex Query
- [ ] `GET /api/v1/rag/collections` → Collections Service
- [ ] `POST /api/v1/rag/collections/ingest` → Collections Service
- [ ] `GET /api/v1/rag/status/health` → Documentation API

## Implementation Guide
- **File:** `tools/compose/docker-compose.kong.yml`
- **Config:** `tools/kong/kong-config.yml`
- **Reference:** See architecture review section 9.3

## Testing
- [ ] Smoke test: All routes respond 200 OK
- [ ] Auth test: Invalid JWT → 401 Unauthorized
- [ ] Rate limit test: 101st request → 429 Too Many Requests
- [ ] CORS test: Cross-origin request allowed
- [ ] Failover test: Kong restart → No downtime

## Migration Strategy
1. Deploy Kong in parallel (port 8000)
2. Test all routes with both paths (old + new)
3. Update frontend to use Kong URLs
4. Monitor traffic for 1 week
5. Deprecate direct service URLs

## Effort
- **Estimate:** 1 week (5 days)
- **Team:** Backend + DevOps
- **Priority:** P1 (Critical)

## Labels
- `priority: critical`
- `area: infrastructure`
- `component: api-gateway`
- `type: enhancement`
- `architecture-review`
```

---

## High Priority (P2) - 5 Issues

### Issue #5: Implement Batch Embedding Processing

```markdown
## Description
Process document chunks in batches (10 chunks/batch) for 4-5x faster ingestion.

## Context
- **Current:** Sequential processing (60ms/chunk, 1.2s for 20 chunks)
- **Target:** Batch processing (120ms/batch, 240ms for 20 chunks)
- **Impact:** 4-5x speedup, better user experience

## Acceptance Criteria
- [ ] `BatchEmbeddingProcessor` class created
- [ ] Batch size configurable via `.env` (default: 10)
- [ ] Ollama batch API integrated (`/api/embeddings/batch`)
- [ ] Fallback to sequential on batch API failure
- [ ] Performance metrics logged (before/after comparison)
- [ ] Integration tests validate correctness

## Implementation Guide
- **File:** `tools/llamaindex/ingestion_service/batch_processor.py`
- **Reference:** See architecture review section 9.2.1

## Testing
- [ ] Unit test: Batch size 10 → 10 embeddings returned
- [ ] Integration test: 20 chunks → 2 batches sent
- [ ] Performance test: 4-5x speedup verified
- [ ] Error test: Batch failure → Falls back to sequential

## Effort
- **Estimate:** 2 days
- **Team:** Backend (Python)
- **Priority:** P2 (High)

## Labels
- `priority: high`
- `area: performance`
- `component: ingestion`
- `type: enhancement`
- `architecture-review`
```

---

### Issue #6: Optimize Qdrant HNSW Index

```markdown
## Description
Tune Qdrant HNSW index parameters for 20-30% faster search.

## Context
- **Current:** Default HNSW parameters (m=16, ef_construct=100)
- **Target:** Optimized parameters (m=32, ef_construct=200)
- **Impact:** 20-30% faster search (8-10ms → 6-8ms)

## Acceptance Criteria
- [ ] `create_optimized_collection()` function created
- [ ] New collections use optimized parameters
- [ ] Existing collections migrated (snapshot + recreate)
- [ ] A/B test validates performance improvement
- [ ] Documentation updated with tuning guide

## Implementation Guide
- **File:** `tools/llamaindex/ingestion_service/qdrant_config.py`
- **Reference:** See architecture review section 9.2.2

## Testing
- [ ] Benchmark: Search 1000 queries (before/after)
- [ ] Recall test: Verify accuracy maintained (> 95%)
- [ ] Load test: Simulate 100 concurrent searches

## Migration Plan
1. Create new collection with optimized params
2. Re-index all documents (batch ingestion)
3. A/B test: 50% traffic to new collection
4. Monitor metrics for 1 week
5. Switch 100% traffic to new collection
6. Delete old collection

## Effort
- **Estimate:** 1 day
- **Team:** Backend (Python)
- **Priority:** P2 (High)

## Labels
- `priority: high`
- `area: performance`
- `component: qdrant`
- `type: enhancement`
- `architecture-review`
```

---

### Issue #7: Deploy Redis Cluster

```markdown
## Description
Deploy Redis Cluster (3 nodes) for horizontal scaling and HA.

## Context
- **Current:** Single Redis instance (SPOF)
- **Target:** Redis Cluster with automatic sharding
- **Impact:** 3x capacity, automatic failover

## Acceptance Criteria
- [ ] Redis Cluster deployed via Docker Compose (3 nodes)
- [ ] Automatic sharding configured
- [ ] Client libraries updated (ioredis cluster mode)
- [ ] Failover tested (node restart < 1s recovery)
- [ ] Performance validated (no regression)
- [ ] Documentation updated

## Implementation Guide
- **File:** `tools/compose/docker-compose.redis-cluster.yml`
- **Reference:** See architecture review section 9.2.3

## Testing
- [ ] Sharding test: Keys distributed across nodes
- [ ] Failover test: Kill node, verify recovery
- [ ] Performance test: Compare latency vs single instance

## Effort
- **Estimate:** 2 days
- **Team:** Backend + DevOps
- **Priority:** P2 (High)

## Labels
- `priority: high`
- `area: infrastructure`
- `component: redis`
- `type: enhancement`
- `architecture-review`
```

---

### Issue #8: Deploy Prometheus + Grafana Monitoring

```markdown
## Description
Deploy Prometheus for metrics collection and Grafana for visualization.

## Context
- **Current:** Health checks only, no metrics/alerts
- **Target:** Real-time metrics, Grafana dashboards
- **Impact:** Proactive issue detection, better observability

## Acceptance Criteria
- [ ] Prometheus deployed (scrapes /metrics endpoints)
- [ ] Grafana deployed with pre-built dashboards
- [ ] Metrics instrumented in all services
- [ ] Alerts configured (circuit breaker open, high latency)
- [ ] Documentation updated with dashboards guide

## Implementation Guide
- **File:** `tools/compose/docker-compose.monitoring.yml`
- **Dashboards:** `tools/monitoring/grafana-dashboards/`
- **Reference:** See architecture review section 9.4.1

## Metrics to Instrument
- [ ] HTTP request duration (histogram)
- [ ] Circuit breaker state (gauge)
- [ ] Cache hit rate (counter)
- [ ] Resource utilization (CPU, memory)

## Grafana Dashboards
1. RAG System Overview (RPS, latency, errors)
2. Cache Performance (hit rate, size, evictions)
3. Resource Utilization (CPU, memory, disk)

## Effort
- **Estimate:** 3 days
- **Team:** Backend + DevOps
- **Priority:** P2 (High)

## Labels
- `priority: high`
- `area: observability`
- `component: monitoring`
- `type: enhancement`
- `architecture-review`
```

---

### Issue #9: Implement Distributed Tracing (Jaeger)

```markdown
## Description
Deploy Jaeger for distributed tracing across RAG services.

## Context
- **Current:** No tracing, difficult to debug timeouts
- **Target:** End-to-end request visibility
- **Impact:** Faster debugging, bottleneck identification

## Acceptance Criteria
- [ ] Jaeger deployed (agent + collector + UI)
- [ ] Tracing instrumented in all services
- [ ] Spans correlated across service boundaries
- [ ] UI accessible at http://localhost:16686
- [ ] Documentation updated with tracing guide

## Implementation Guide
- **File:** `tools/compose/docker-compose.tracing.yml`
- **Middleware:** `backend/api/documentation-api/src/middleware/tracing.js`
- **Reference:** See architecture review section 9.4.2

## Testing
- [ ] Trace a query end-to-end (dashboard → Qdrant)
- [ ] Verify span correlation (parent-child relationships)
- [ ] Test error propagation (error tags visible)

## Effort
- **Estimate:** 2 days
- **Team:** Backend
- **Priority:** P2 (High)

## Labels
- `priority: high`
- `area: observability`
- `component: tracing`
- `type: enhancement`
- `architecture-review`
```

---

## Medium Priority (P3) - 4 Issues

### Issue #10: Refactor RagProxyService (Reduce from 576 lines)

```markdown
## Description
Refactor RagProxyService into smaller, focused service classes.

## Context
- **Current:** 576-line "God Object" with 7+ responsibilities
- **Target:** < 200 lines/class, single responsibility
- **Impact:** Better testability, maintainability

## Acceptance Criteria
- [ ] `JwtTokenService` extracted (token management)
- [ ] `CircuitBreakerManager` extracted (breaker orchestration)
- [ ] `CacheService` extracted (3-tier cache logic)
- [ ] `RagProxyService` reduced to < 200 lines
- [ ] Tests updated (dependency injection)
- [ ] No regressions (integration tests pass)

## Effort
- **Estimate:** 2 weeks
- **Team:** Backend
- **Priority:** P3 (Medium)

## Labels
- `priority: medium`
- `area: refactoring`
- `type: tech-debt`
- `architecture-review`
```

---

### Issue #11: Implement Service Discovery (Consul)

```markdown
## Description
Replace hardcoded service URLs with dynamic service discovery.

## Context
- **Current:** Hardcoded URLs in `.env` file
- **Target:** Consul service registry
- **Impact:** Dynamic scaling, automatic failover

## Acceptance Criteria
- [ ] Consul deployed via Docker Compose
- [ ] Services register on startup
- [ ] Health checks integrated
- [ ] Client libraries use Consul DNS
- [ ] Documentation updated

## Effort
- **Estimate:** 1 week
- **Team:** Backend + DevOps
- **Priority:** P3 (Medium)

## Labels
- `priority: medium`
- `area: infrastructure`
- `type: enhancement`
- `architecture-review`
```

---

### Issue #12: Add Configuration Validation (Joi)

```markdown
## Description
Validate `.env` configuration on service startup.

## Context
- **Current:** Invalid configs silently fail
- **Target:** Fail-fast validation with clear errors
- **Impact:** Reduced debugging time

## Acceptance Criteria
- [ ] `validateConfig()` function created (Joi schema)
- [ ] Called on service startup
- [ ] Invalid config → Process exits with clear error message
- [ ] Documentation updated

## Effort
- **Estimate:** 3 days
- **Team:** Backend
- **Priority:** P3 (Medium)

## Labels
- `priority: medium`
- `area: configuration`
- `type: enhancement`
- `architecture-review`
```

---

### Issue #13: Implement API Versioning Strategy

```markdown
## Description
Add URL-based API versioning (`/api/v1/`, `/api/v2/`) for breaking changes.

## Context
- **Current:** No versioning, breaking changes affect all clients
- **Target:** Versioned endpoints with deprecation warnings
- **Impact:** Gradual migration, no downtime

## Acceptance Criteria
- [ ] All endpoints prefixed with `/api/v1/`
- [ ] Legacy endpoints deprecated (warning header)
- [ ] Version negotiation documented
- [ ] OpenAPI specs updated

## Effort
- **Estimate:** 1 week
- **Team:** Backend
- **Priority:** P3 (Medium)

## Labels
- `priority: medium`
- `area: api`
- `type: enhancement`
- `architecture-review`
```

---

## Summary

**Total Issues:** 13
- **Critical (P1):** 4 issues (3 weeks effort)
- **High (P2):** 5 issues (2 weeks effort)
- **Medium (P3):** 4 issues (5 weeks effort)

**Total Effort:** 10 weeks (can be parallelized with 2 engineers → 5 weeks calendar time)

**Next Step:** Create these issues in GitHub with labels, milestones, and assignments.

---

**Generated By:** Claude Code Architecture Reviewer  
**Date:** 2025-11-03  
**Template Version:** 1.0.0


