# Implementation Tasks: Enhance RAG Services Architecture

**Change ID**: `enhance-rag-services-architecture`  
**Total Effort**: 4-6 weeks (1-2 engineers)  
**Status**: Pending approval

---

## 1. Sprint 1: Critical Fixes (Week 1-2) - Priority 1

### 1.1 Circuit Breaker Pattern
- [ ] 1.1.1 Install `circuitbreaker` library (Python) and `opossum` (Node.js)
- [ ] 1.1.2 Create `tools/llamaindex/query_service/circuit_breaker.py` wrapper
- [ ] 1.1.3 Wrap Ollama embedding calls with circuit breaker
- [ ] 1.1.4 Wrap Qdrant search calls with circuit breaker
- [ ] 1.1.5 Add circuit breaker to Node.js `RagProxyService.js`
- [ ] 1.1.6 Configure thresholds (failure=5, timeout=30s, half-open=10s)
- [ ] 1.1.7 Add circuit breaker status to `/health` endpoint
- [ ] 1.1.8 Add Prometheus metrics for circuit breaker state
- [ ] 1.1.9 Write unit tests for circuit breaker behavior
- [ ] 1.1.10 Test manual failure injection (kill Ollama/Qdrant)

**Validation**:
- Circuit breaker opens after 5 consecutive failures
- Returns 503 with clear error message when open
- Automatically attempts recovery after 30s
- Health endpoint shows circuit breaker status

---

### 1.2 Inter-Service Authentication
- [ ] 1.2.1 Add `INTER_SERVICE_SECRET` to `.env` (generate secure 32-char secret)
- [ ] 1.2.2 Create `backend/shared/middleware/serviceAuth.js` middleware
- [ ] 1.2.3 Apply middleware to LlamaIndex Query Service (FastAPI dependency)
- [ ] 1.2.4 Apply middleware to RAG Collections Service internal routes
- [ ] 1.2.5 Apply middleware to Documentation API internal routes
- [ ] 1.2.6 Update `RagProxyService.js` to send `X-Service-Token` header
- [ ] 1.2.7 Update frontend `llamaIndexService.ts` (skip for user requests)
- [ ] 1.2.8 Add service auth check to `/internal/*` routes
- [ ] 1.2.9 Write unit tests for auth middleware (valid/invalid/missing token)
- [ ] 1.2.10 Test service-to-service calls with/without token

**Validation**:
- Requests without `X-Service-Token` return 403 Forbidden
- Requests with invalid token return 403 Forbidden
- Requests with valid token succeed (200/201/etc)
- User requests (no token) still work via API Gateway

---

### 1.3 API Versioning
- [ ] 1.3.1 Create `/api/v1` router prefix in Express services
- [ ] 1.3.2 Create `/api/v1` router prefix in FastAPI services
- [ ] 1.3.3 Update all route definitions to use `/api/v1` prefix
- [ ] 1.3.4 Add legacy routes with deprecation warnings (log only, no break)
- [ ] 1.3.5 Update OpenAPI specs with `/api/v1` base path
- [ ] 1.3.6 Update frontend clients to use `/api/v1` endpoints
- [ ] 1.3.7 Add API version header (`X-API-Version: v1`) to all responses
- [ ] 1.3.8 Create `/api/v2` namespace (empty, for future)
- [ ] 1.3.9 Update Vite proxy config for `/api/v1`
- [ ] 1.3.10 Test all endpoints via new versioned paths

**Validation**:
- All endpoints accessible via `/api/v1/*`
- Legacy endpoints show deprecation warning in logs
- Frontend works with new paths
- OpenAPI spec validates without errors

---

### 1.4 Comprehensive Testing Suite - Backend

#### 1.4.1 Unit Tests (Node.js - Jest)
- [ ] 1.4.1.1 Setup Jest config in `backend/api/documentation-api/`
- [ ] 1.4.1.2 Write tests for `RagProxyService.js` (15 test cases)
  - `_getBearerToken()` - caching behavior
  - `_validateQuery()` - validation rules
  - `_validateMaxResults()` - range clamping
  - `search()` - success/error cases
  - `query()` - success/error cases
  - `checkHealth()` - connectivity checks
- [ ] 1.4.1.3 Write tests for `CollectionService.js` (if exists)
- [ ] 1.4.1.4 Mock fetch/axios calls with `jest.mock()`
- [ ] 1.4.1.5 Target: 80% coverage for services layer
- [ ] 1.4.1.6 Run tests in CI/CD (GitHub Actions)

#### 1.4.2 Unit Tests (Python - Pytest)
- [ ] 1.4.2.1 Setup pytest config in `tools/llamaindex/query_service/`
- [ ] 1.4.2.2 Write tests for search endpoint (10 test cases)
- [ ] 1.4.2.3 Write tests for query endpoint (10 test cases)
- [ ] 1.4.2.4 Write tests for health endpoint (5 test cases)
- [ ] 1.4.2.5 Write tests for GPU coordination logic (8 test cases)
- [ ] 1.4.2.6 Mock Qdrant/Ollama clients with `unittest.mock`
- [ ] 1.4.2.7 Target: 75% coverage for main.py
- [ ] 1.4.2.8 Run tests in CI/CD

#### 1.4.3 Integration Tests
- [ ] 1.4.3.1 Setup Supertest for Express services
- [ ] 1.4.3.2 Setup FastAPI TestClient for Python services
- [ ] 1.4.3.3 Write integration tests for `/rag/search` endpoint (5 scenarios)
- [ ] 1.4.3.4 Write integration tests for `/rag/query` endpoint (5 scenarios)
- [ ] 1.4.3.5 Write integration tests for `/rag/collections` CRUD (10 scenarios)
- [ ] 1.4.3.6 Test with real Qdrant/Redis (testcontainers)
- [ ] 1.4.3.7 Target: 90% coverage for API routes

**Validation**:
- All tests pass locally
- Tests pass in CI/CD
- Coverage reports generated (HTML + JSON)
- No flaky tests (deterministic)

---

## 2. Sprint 2: High Priority (Week 3-4) - Priority 2

### 2.1 Qdrant High Availability
- [ ] 2.1.1 Update `docker-compose.rag.yml` with 3 Qdrant services
- [ ] 2.1.2 Configure primary node (port 6333, cluster enabled, node_id=primary)
- [ ] 2.1.3 Configure replica-1 (port 6334, p2p_peers=primary:6335)
- [ ] 2.1.4 Configure replica-2 (port 6335, p2p_peers=primary:6335)
- [ ] 2.1.5 Update client connection string to use all 3 nodes (round-robin)
- [ ] 2.1.6 Test cluster formation (verify replication works)
- [ ] 2.1.7 Test failover (kill primary, verify replica promotion)
- [ ] 2.1.8 Test write consistency (write to primary, verify replicas)
- [ ] 2.1.9 Add health checks for all 3 nodes
- [ ] 2.1.10 Update documentation with HA setup guide

**Validation**:
- Cluster forms successfully (all 3 nodes connected)
- Writes to primary replicate to replicas
- Reads distribute across all 3 nodes
- Failover works (< 5s downtime when primary dies)

---

### 2.2 API Gateway (Kong)
- [ ] 2.2.1 Create `tools/compose/docker-compose.kong.yml`
- [ ] 2.2.2 Configure Kong DB-less mode (declarative config)
- [ ] 2.2.3 Create `tools/kong/kong.yml` with service routes
- [ ] 2.2.4 Add rate-limiting plugin (100/min free, 1000/min pro)
- [ ] 2.2.5 Add JWT plugin for authentication
- [ ] 2.2.6 Add CORS plugin (allowed origins)
- [ ] 2.2.7 Add request-termination plugin for maintenance mode
- [ ] 2.2.8 Update frontend to use Kong URL (port 8000)
- [ ] 2.2.9 Test all services accessible via Kong
- [ ] 2.2.10 Add Kong health check to monitoring

**Validation**:
- All services accessible via Kong (port 8000)
- Rate limiting enforced (429 after limit)
- JWT validation works (401 on invalid token)
- CORS headers correct (no browser errors)

---

### 2.3 Frontend Code Splitting
- [ ] 2.3.1 Identify large components (LlamaIndexPage, WorkspacePage, ChartsPage)
- [ ] 2.3.2 Convert to lazy imports (`React.lazy()`)
- [ ] 2.3.3 Add `<Suspense>` boundaries with loading spinners
- [ ] 2.3.4 Configure Vite for code splitting (manual chunks)
- [ ] 2.3.5 Analyze bundle size before/after (Vite bundle visualizer)
- [ ] 2.3.6 Test lazy loading (verify chunks load on demand)
- [ ] 2.3.7 Optimize Tailwind CSS (purge unused classes)
- [ ] 2.3.8 Add route-based prefetching (on hover)
- [ ] 2.3.9 Run Lighthouse audit (target score > 90)
- [ ] 2.3.10 Update documentation with bundle size metrics

**Validation**:
- Initial bundle < 300KB (gzipped)
- Time to Interactive < 700ms
- Lighthouse Performance score > 90
- No UI flicker on lazy load transitions

---

### 2.4 Database Schema Migration
- [ ] 2.4.1 Deploy schema to development environment
  - Run `psql -f backend/data/timescaledb/rag/00_rag_schema_master.sql`
- [ ] 2.4.2 Verify all 6 tables created
- [ ] 2.4.3 Verify 2 hypertables active (ingestion_jobs, query_logs)
- [ ] 2.4.4 Verify 3 continuous aggregates active
- [ ] 2.4.5 Test sample queries (collections, documents, chunks)
- [ ] 2.4.6 Create migration script: JSON config → TimescaleDB
  - `scripts/migration/migrate-collections-to-db.js`
- [ ] 2.4.7 Run migration for existing collections (3 collections)
- [ ] 2.4.8 Verify data integrity (compare JSON vs DB)
- [ ] 2.4.9 Update RAG Collections Service to load from DB
  - Update `collectionManager.ts` to query TimescaleDB
- [ ] 2.4.10 Test hybrid mode (DB + JSON fallback)

**Validation**:
- All collections migrated successfully
- Service loads collections from DB
- Fallback to JSON works if DB unavailable
- No data loss during migration

---

### 2.5 E2E Tests (Playwright)
- [ ] 2.5.1 Setup Playwright in `tests/e2e/`
- [ ] 2.5.2 Write test: RAG search workflow (navigate, search, verify results)
- [ ] 2.5.3 Write test: Q&A workflow (ask question, verify answer)
- [ ] 2.5.4 Write test: Collection stats (view stats, verify display)
- [ ] 2.5.5 Write test: Health check (verify indicators)
- [ ] 2.5.6 Write test: Fallback behavior (primary fails, fallback succeeds)
- [ ] 2.5.7 Run tests locally (headless + headed)
- [ ] 2.5.8 Run tests in CI/CD (GitHub Actions)
- [ ] 2.5.9 Generate test reports (HTML + screenshots on failure)
- [ ] 2.5.10 Add to PR checks (required before merge)

**Validation**:
- All E2E tests pass locally
- Tests pass in CI/CD
- Coverage: critical user paths (search, query, view stats)
- Test execution time < 3 minutes

---

## 3. Sprint 3: Operational Excellence (Week 5-6) - Priority 3

### 3.1 Automated Qdrant Backups
- [ ] 3.1.1 Create `scripts/backup/qdrant-backup.sh` script
- [ ] 3.1.2 Implement snapshot creation for all collections
- [ ] 3.1.3 Implement snapshot download and storage
- [ ] 3.1.4 Implement old backup cleanup (7-day retention)
- [ ] 3.1.5 Add backup logging to `/var/log/qdrant-backup.log`
- [ ] 3.1.6 Setup cron job (daily at 2 AM)
- [ ] 3.1.7 Test backup script manually
- [ ] 3.1.8 Test restore from backup
- [ ] 3.1.9 Add monitoring alert (backup failure notification)
- [ ] 3.1.10 Document backup/restore procedures

**Validation**:
- Backups run daily without errors
- Restore works (verified with test collection)
- Old backups cleaned up automatically
- Alert sent on backup failure

---

### 3.2 Redis Hybrid Persistence
- [ ] 3.2.1 Update `docker-compose.rag.yml` Redis command
- [ ] 3.2.2 Add AOF config (appendfsync everysec)
- [ ] 3.2.3 Add RDB snapshots (900/1, 300/10, 60/10000)
- [ ] 3.2.4 Test Redis crash recovery (verify data persists)
- [ ] 3.2.5 Monitor RDB file size and AOF file size
- [ ] 3.2.6 Configure AOF rewrite threshold (auto-optimize)
- [ ] 3.2.7 Add backup script for RDB/AOF files
- [ ] 3.2.8 Test restore from RDB snapshot
- [ ] 3.2.9 Test restore from AOF log
- [ ] 3.2.10 Document Redis persistence strategy

**Validation**:
- Redis survives crashes without data loss
- RDB snapshots created at configured intervals
- AOF logs written continuously
- Restore time < 10 seconds

---

### 3.3 Grafana Dashboards
- [ ] 3.3.1 Create dashboard: RAG Services Overview
  - Total collections, documents, chunks
  - Query rate (RPS), error rate
  - Cache hit rate
  - Ingestion jobs (queued, running, completed, failed)
- [ ] 3.3.2 Create dashboard: Query Performance
  - p50/p95/p99 latency
  - Slow queries (> 1s)
  - GPU wait time distribution
  - Cache effectiveness
- [ ] 3.3.3 Create dashboard: Qdrant Cluster Health
  - Node status (primary, replica-1, replica-2)
  - Replication lag
  - Vector count per collection
  - Storage usage
- [ ] 3.3.4 Create dashboard: Ingestion Monitoring
  - Job queue depth
  - Processing throughput (docs/sec)
  - Error rate
  - Average job duration
- [ ] 3.3.5 Import dashboards to Grafana
- [ ] 3.3.6 Configure alerts (slow queries, failed jobs, circuit breaker open)
- [ ] 3.3.7 Test dashboard queries (verify data sources)
- [ ] 3.3.8 Export dashboards as JSON (version control)
- [ ] 3.3.9 Document dashboard usage
- [ ] 3.3.10 Share dashboards with team

**Validation**:
- All dashboards render correctly
- Metrics update in real-time
- Alerts trigger on threshold violations
- Team can access and use dashboards

---

### 3.4 Load Testing (K6)
- [ ] 3.4.1 Create `tests/performance/rag-search.k6.js`
- [ ] 3.4.2 Create `tests/performance/rag-query.k6.js`
- [ ] 3.4.3 Create `tests/performance/rag-collections.k6.js`
- [ ] 3.4.4 Define thresholds (p95 < 500ms, error rate < 1%)
- [ ] 3.4.5 Configure stages (ramp-up, sustain, spike, ramp-down)
- [ ] 3.4.6 Run baseline tests (record current performance)
- [ ] 3.4.7 Run tests after optimizations (compare results)
- [ ] 3.4.8 Add K6 to CI/CD (run on PRs targeting main)
- [ ] 3.4.9 Generate HTML reports (k6-reporter-html)
- [ ] 3.4.10 Document load testing procedures

**Validation**:
- Sustain 1000 RPS for 3 minutes (search endpoint)
- Sustain 100 RPS for 3 minutes (query endpoint)
- p95 latency < 500ms
- Error rate < 1%

---

### 3.5 Documentation Updates
- [ ] 3.5.1 Update `docs/content/tools/rag/architecture.mdx` with new components
- [ ] 3.5.2 Add circuit breaker documentation
- [ ] 3.5.3 Add inter-service auth documentation
- [ ] 3.5.4 Add Qdrant HA setup guide
- [ ] 3.5.5 Add Kong gateway configuration guide
- [ ] 3.5.6 Update API documentation with /api/v1 paths
- [ ] 3.5.7 Add testing documentation (unit/integration/E2E/load)
- [ ] 3.5.8 Update architecture diagrams (PlantUML)
- [ ] 3.5.9 Create runbook for common operations
- [ ] 3.5.10 Update README files

**Validation**:
- All documentation builds without errors
- Links work (internal + external)
- Code examples tested
- Diagrams render correctly

---

### 3.6 Monitoring & Alerting
- [ ] 3.6.1 Add Prometheus metrics for circuit breaker state
- [ ] 3.6.2 Add metrics for inter-service auth (success/failure)
- [ ] 3.6.3 Add metrics for API version usage (v1 vs legacy)
- [ ] 3.6.4 Configure alerts in Grafana
  - Circuit breaker open (critical)
  - Slow queries > 1s (warning)
  - Failed ingestion jobs (warning)
  - High error rate (critical)
- [ ] 3.6.5 Test alerts (trigger manually, verify notification)
- [ ] 3.6.6 Create on-call runbook
- [ ] 3.6.7 Document alert response procedures
- [ ] 3.6.8 Setup alert routing (Slack, email, PagerDuty)
- [ ] 3.6.9 Test end-to-end alert workflow
- [ ] 3.6.10 Review alerts with team

**Validation**:
- Alerts trigger correctly
- Notifications delivered (< 1 minute)
- Runbook covers common scenarios
- Team trained on alert response

---

## 4. Deployment & Rollout

### 4.1 Staging Deployment
- [ ] 4.1.1 Deploy all changes to staging environment
- [ ] 4.1.2 Run smoke tests (verify basic functionality)
- [ ] 4.1.3 Run full test suite (unit + integration + E2E + load)
- [ ] 4.1.4 Monitor for 48 hours (check logs, metrics, alerts)
- [ ] 4.1.5 Fix any issues discovered
- [ ] 4.1.6 Get stakeholder sign-off

### 4.2 Production Deployment
- [ ] 4.2.1 Create deployment plan with rollback steps
- [ ] 4.2.2 Schedule maintenance window (if needed)
- [ ] 4.2.3 Deploy database schema (run migrations)
- [ ] 4.2.4 Deploy backend services (rolling update)
- [ ] 4.2.5 Deploy frontend (blue-green deployment)
- [ ] 4.2.6 Deploy infrastructure (Qdrant cluster, Kong gateway)
- [ ] 4.2.7 Verify all services healthy
- [ ] 4.2.8 Monitor for 24 hours (check metrics, logs, alerts)
- [ ] 4.2.9 Announce to users (changelog, release notes)
- [ ] 4.2.10 Post-deployment review

**Validation**:
- Zero downtime (or within SLA)
- No critical incidents
- All metrics within normal range
- User feedback positive

---

## 5. Post-Implementation

### 5.1 Verification
- [ ] 5.1.1 Run `npm run openspec -- validate enhance-rag-services-architecture --strict`
- [ ] 5.1.2 Verify all acceptance criteria met
- [ ] 5.1.3 Update architecture review scorecard (A- → A)
- [ ] 5.1.4 Generate before/after metrics comparison
- [ ] 5.1.5 Document lessons learned

### 5.2 Knowledge Transfer
- [ ] 5.2.1 Conduct team training (circuit breakers, Kong, tests)
- [ ] 5.2.2 Update onboarding documentation
- [ ] 5.2.3 Create video walkthrough (optional)
- [ ] 5.2.4 Share with broader team (demo day)

### 5.3 Archive
- [ ] 5.3.1 Move `changes/enhance-rag-services-architecture/` → `changes/archive/2025-12-20-enhance-rag-services-architecture/`
- [ ] 5.3.2 Update `specs/rag-services/spec.md` with implemented requirements
- [ ] 5.3.3 Run `npm run openspec -- archive enhance-rag-services-architecture --yes`

---

## Dependencies

### External Dependencies
- [ ] `circuitbreaker` (Python) - Circuit breaker library
- [ ] `opossum` (Node.js) - Circuit breaker library
- [ ] `@playwright/test` - E2E testing
- [ ] `k6` - Load testing
- [ ] Kong API Gateway (Docker image)

### Internal Dependencies
- [ ] TimescaleDB with hypertable support
- [ ] Qdrant cluster mode support
- [ ] Redis persistence configuration
- [ ] Prometheus + Grafana stack

### Blocking Issues
- None currently identified

---

## Rollback Plan

### If Issues Arise

**Circuit Breaker Rollback**:
```bash
# Disable circuit breaker via env var
CIRCUIT_BREAKER_ENABLED=false
# Restart services
docker-compose restart rag-llamaindex-query
```

**API Versioning Rollback**:
- Legacy endpoints still work (no break)
- Remove `/api/v1` prefix if needed
- Update frontend to use legacy paths

**Qdrant Cluster Rollback**:
- Revert to single instance
- Data safe (primary node has all data)
- No data loss

**Kong Gateway Rollback**:
- Route traffic directly to services (skip Kong)
- Frontend uses service URLs directly
- No service interruption

---

**Total Tasks**: ~140 tasks  
**Estimated Effort**: 4-6 weeks (1-2 engineers)  
**Risk Level**: Low-Medium (phased rollout mitigates risk)

