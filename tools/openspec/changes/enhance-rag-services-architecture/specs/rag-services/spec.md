# Spec Delta: RAG Services

**Capability**: `rag-services`  
**Change**: `enhance-rag-services-architecture`

---

## ADDED Requirements

### Requirement: Circuit Breaker Protection

The RAG Services SHALL implement circuit breaker pattern to protect against cascading failures when calling external dependencies (Ollama, Qdrant).

**Components**:
- LlamaIndex Query Service (Python): Protect Ollama embedding and Qdrant search calls
- RAG Proxy Service (Node.js): Protect upstream LlamaIndex calls

**Configuration**:
- `failure_threshold`: 5 consecutive failures
- `recovery_timeout`: 30 seconds
- `half_open_max_calls`: 1 (test recovery with single request)

**Behavior**:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Fast-fail, return 503 Service Unavailable
- **HALF-OPEN**: Test recovery after timeout

#### Scenario: Circuit opens after failures

- **GIVEN** Ollama service is down
- **WHEN** 5 consecutive embedding requests fail
- **THEN** circuit breaker opens
- **AND** subsequent requests return 503 immediately (no timeout wait)
- **AND** response includes header `X-Circuit-Breaker-State: open`

#### Scenario: Circuit recovers automatically

- **GIVEN** circuit breaker is open (after failures)
- **WHEN** 30 seconds have elapsed (recovery_timeout)
- **THEN** circuit breaker enters HALF-OPEN state
- **AND** next request is allowed through (test recovery)
- **AND** if request succeeds, circuit closes (back to normal)

#### Scenario: Circuit stays open on continued failures

- **GIVEN** circuit breaker is HALF-OPEN (testing recovery)
- **WHEN** test request fails
- **THEN** circuit breaker returns to OPEN state
- **AND** recovery_timeout resets (wait another 30s)

#### Scenario: Health endpoint reports circuit state

- **GIVEN** circuit breaker is open
- **WHEN** GET /health is called
- **THEN** response includes circuit breaker status
- **AND** status shows: `{ "ollama_circuit": "open", "qdrant_circuit": "closed" }`

---

### Requirement: Inter-Service Authentication

The RAG Services SHALL authenticate service-to-service requests using shared secret token to prevent unauthorized lateral movement.

**Scope**:
- All internal endpoints (`/internal/*`)
- Service-to-service communication only
- User requests exempt (validated by API Gateway)

**Implementation**:
- Header: `X-Service-Token`
- Secret: `INTER_SERVICE_SECRET` environment variable (32-char random)
- Middleware: `verifyServiceAuth()` applied to internal routes

#### Scenario: Valid service token succeeds

- **GIVEN** service A needs to call service B
- **WHEN** request includes header `X-Service-Token: <valid_secret>`
- **THEN** request is allowed (200/201/etc)
- **AND** service logic executes normally

#### Scenario: Invalid service token fails

- **GIVEN** attacker tries to call internal endpoint
- **WHEN** request includes invalid or missing `X-Service-Token`
- **THEN** request is rejected with 403 Forbidden
- **AND** error message: `"Forbidden: Invalid or missing service token"`
- **AND** audit log records unauthorized attempt

#### Scenario: User requests bypass service auth

- **GIVEN** user makes request via API Gateway (Kong)
- **WHEN** request routed to service (no X-Service-Token)
- **THEN** service auth middleware skips validation (Gateway already validated)
- **AND** request succeeds normally

---

### Requirement: API Versioning

The RAG Services SHALL support multiple API versions simultaneously using URL-based versioning to enable backward-compatible evolution.

**Versioning Scheme**:
- **Current**: `/api/v1` (stable, production)
- **Future**: `/api/v2` (breaking changes allowed)
- **Legacy**: Root paths (deprecated, 6-month support)

**Deprecation Cycle**:
1. Announce deprecation (6 months notice)
2. Log warnings on legacy endpoint usage
3. Return deprecation header: `X-API-Deprecated: true, use /api/v1/search`
4. Remove legacy endpoints after 6 months

#### Scenario: New endpoint uses versioned path

- **GIVEN** new search endpoint is being created
- **WHEN** endpoint is registered
- **THEN** path MUST be `/api/v1/rag/search` (not `/rag/search`)
- **AND** OpenAPI spec reflects versioned path

#### Scenario: Legacy endpoint shows deprecation warning

- **GIVEN** user calls legacy endpoint `/search`
- **WHEN** request is processed
- **THEN** response includes header `X-API-Deprecated: true`
- **AND** response includes header `X-API-Deprecated-Use: /api/v1/search`
- **AND** warning logged: `"Legacy endpoint /search used, deprecated, use /api/v1/search"`

#### Scenario: Breaking change uses v2

- **GIVEN** breaking change needed (e.g., change response format)
- **WHEN** new version implemented
- **THEN** endpoint path is `/api/v2/search`
- **AND** `/api/v1/search` continues to work (unchanged)
- **AND** clients can migrate gradually

---

### Requirement: Comprehensive Test Coverage

The RAG Services SHALL maintain minimum 80% test coverage for backend services and 70% for frontend to ensure quality and catch regressions.

**Test Layers**:
- **Unit Tests**: Services, middleware, utilities (Jest, Pytest)
- **Integration Tests**: API endpoints (Supertest, FastAPI TestClient)
- **E2E Tests**: User workflows (Playwright)
- **Load Tests**: Performance validation (K6)

**Coverage Targets**:
- Backend (Node.js): 80%
- Backend (Python): 75%
- Frontend (React): 70%
- Critical paths (E2E): 100%

#### Scenario: Unit test validates service logic

- **GIVEN** `RagProxyService._validateQuery()` method
- **WHEN** unit test passes empty query
- **THEN** method throws `ValidationError`
- **AND** error message is `"Query cannot be empty"`

#### Scenario: Integration test validates API contract

- **GIVEN** GET /api/v1/rag/search endpoint
- **WHEN** integration test sends request with valid query
- **THEN** response status is 200 OK
- **AND** response body matches OpenAPI schema
- **AND** response includes required fields (results, query, total_results)

#### Scenario: E2E test validates user workflow

- **GIVEN** user on Dashboard LlamaIndex page
- **WHEN** user enters query "RAG architecture" and clicks Search
- **THEN** results appear within 5 seconds
- **AND** at least 1 result is displayed
- **AND** results show content, relevance, and source

#### Scenario: Load test validates performance

- **GIVEN** RAG search endpoint under load
- **WHEN** K6 sends 1000 requests/second for 3 minutes
- **THEN** p95 latency remains < 500ms
- **AND** error rate remains < 1%
- **AND** no circuit breakers open

---

### Requirement: Qdrant High Availability

The RAG Services SHALL deploy Qdrant in a 3-node cluster configuration to provide high availability (99.99% uptime) and read scaling.

**Topology**:
- 1 primary node (port 6333) - accepts writes
- 2 replica nodes (ports 6334, 6335) - read-only
- P2P replication (automatic, asynchronous)

**Failover**:
- Automatic replica promotion if primary fails
- Target RTO (Recovery Time Objective): < 5 seconds
- Target RPO (Recovery Point Objective): < 1 second (replication lag)

#### Scenario: Cluster forms successfully

- **GIVEN** 3 Qdrant nodes configured in docker-compose
- **WHEN** services start
- **THEN** all 3 nodes join cluster within 30 seconds
- **AND** health check shows all nodes connected
- **AND** GET /collections returns same data from all nodes

#### Scenario: Write replicates to replicas

- **GIVEN** Qdrant cluster is healthy (all 3 nodes up)
- **WHEN** write operation sent to primary (insert vector)
- **THEN** write succeeds on primary
- **AND** write replicates to replica-1 and replica-2 within 1 second
- **AND** GET query to replica returns newly inserted vector

#### Scenario: Primary failure triggers failover

- **GIVEN** Qdrant cluster is healthy
- **WHEN** primary node crashes (docker stop qdrant-primary)
- **THEN** replica-1 or replica-2 promoted to primary within 5 seconds
- **AND** writes redirect to new primary automatically
- **AND** no data loss (all replicated data available)
- **AND** service availability maintained (< 5s downtime)

#### Scenario: Read load distributes across replicas

- **GIVEN** Qdrant cluster with 100 concurrent read requests
- **WHEN** requests sent to cluster
- **THEN** requests distribute across all 3 nodes (round-robin)
- **AND** primary handles ~33% reads
- **AND** replica-1 handles ~33% reads
- **AND** replica-2 handles ~33% reads

---

### Requirement: Database Schema for Metadata

The RAG Services SHALL store collection metadata, document tracking, and analytics in TimescaleDB for data integrity and advanced analytics.

**Schema**: `rag`

**Tables**:
- `rag.collections` - Collection configurations
- `rag.documents` - Document metadata with file hash tracking
- `rag.chunks` - Text chunks mapped to Qdrant point IDs
- `rag.ingestion_jobs` (hypertable) - Job history with performance metrics
- `rag.query_logs` (hypertable) - Query analytics with time-series data
- `rag.embedding_models` - Available embedding models catalog

**Migration**: Gradual migration from JSON config to database (hybrid support)

#### Scenario: Collection loaded from database

- **GIVEN** collection exists in `rag.collections` table
- **WHEN** RAG Collections Service starts
- **THEN** collections loaded from database (not JSON)
- **AND** all fields populated (name, directory, embedding_model, etc.)
- **AND** enabled collections only (WHERE enabled = TRUE)

#### Scenario: Document change detection via file hash

- **GIVEN** document exists in `rag.documents` with file_hash
- **WHEN** source file is modified (content changes)
- **THEN** new file_hash calculated on next sync
- **AND** document marked for re-indexing (index_status = 'pending')
- **AND** ingestion job triggered automatically (if auto_update = TRUE)

#### Scenario: Query logged to hypertable

- **GIVEN** user performs semantic search
- **WHEN** query completes
- **THEN** entry inserted into `rag.query_logs` hypertable
- **AND** includes: query_text, duration_ms, results_count, cache_hit
- **AND** includes: GPU metrics (wait_time, processing_time)
- **AND** continuous aggregate updated (hourly stats)

#### Scenario: Analytics query uses continuous aggregate

- **GIVEN** user requests query statistics for last 24 hours
- **WHEN** GET /api/v1/rag/analytics/queries called
- **THEN** query uses `rag.query_logs_hourly_stats` (continuous aggregate)
- **AND** response time < 100ms (pre-computed)
- **AND** data includes: avg_duration_ms, cache_hit_rate, total_queries

---

### Requirement: API Gateway Integration

The RAG Services SHALL route all external traffic through Kong API Gateway for centralized authentication, rate limiting, and observability.

**Features**:
- **Authentication**: JWT validation (HS256)
- **Rate Limiting**: 100 req/min (free), 1000 req/min (pro)
- **CORS**: Configurable allowed origins
- **SSL Termination**: HTTPS support (port 8443)
- **Request Logging**: All requests logged with correlation ID

**Routing**:
- Kong (8000) → LlamaIndex Query (8202)
- Kong (8000) → RAG Collections Service (3403)
- Kong (8000) → Documentation API (3402)

#### Scenario: Request routed through Kong

- **GIVEN** user makes request to http://localhost:8000/api/v1/rag/search
- **WHEN** Kong receives request
- **THEN** Kong validates JWT token (Authorization header)
- **AND** Kong checks rate limit (100/min)
- **AND** Kong adds correlation ID header (X-Correlation-ID)
- **AND** Kong forwards request to LlamaIndex Query Service
- **AND** response includes CORS headers

#### Scenario: Rate limit enforced by Kong

- **GIVEN** user has made 100 requests in last minute
- **WHEN** user makes 101st request
- **THEN** Kong returns 429 Too Many Requests
- **AND** response includes header `X-RateLimit-Limit: 100`
- **AND** response includes header `X-RateLimit-Remaining: 0`
- **AND** response includes header `Retry-After: 45` (seconds)

#### Scenario: Kong logs all requests

- **GIVEN** Kong is processing requests
- **WHEN** any request passes through Kong
- **THEN** request logged with timestamp, path, method, status, duration
- **AND** correlation ID included in log
- **AND** logs accessible via Kong Admin API (port 8001)

---

### Requirement: Frontend Code Splitting

The RAG Services frontend client SHALL use route-based lazy loading to reduce initial bundle size from 800KB to < 300KB.

**Strategy**: React.lazy() + Suspense for heavy components

**Target Components**:
- LlamaIndexPage (largest, ~200KB)
- WorkspacePage (~150KB)
- ChartsPage (~120KB)

**Expected Impact**:
- Bundle size: 800KB → 300KB (-63%)
- Initial load: 1.2s → 0.6s (-50%)

#### Scenario: Lazy load component on route

- **GIVEN** user on Dashboard home page
- **WHEN** user clicks "LlamaIndex" navigation
- **THEN** LlamaIndexPage chunk loads on demand (not in initial bundle)
- **AND** loading spinner shows during chunk load (< 500ms)
- **AND** component renders after chunk loaded

#### Scenario: Initial bundle excludes lazy components

- **GIVEN** frontend build process runs
- **WHEN** bundle analysis performed (vite-bundle-visualizer)
- **THEN** initial bundle (index.js) size < 300KB (gzipped)
- **AND** LlamaIndexPage chunk separate (llama-index-page.chunk.js)
- **AND** WorkspacePage chunk separate (workspace-page.chunk.js)
- **AND** total chunks < 10 (avoid fragmentation)

#### Scenario: Prefetch on hover

- **GIVEN** user hovering over "LlamaIndex" link
- **WHEN** mouse hovers for > 200ms
- **THEN** LlamaIndexPage chunk prefetched in background
- **AND** navigation instant when clicked (chunk already loaded)

---

### Requirement: Automated Backups

The RAG Services SHALL perform automated daily backups of Qdrant collections with 7-day retention for disaster recovery.

**Scope**: All enabled collections (documentation__nomic, documentation__mxbai, tradingsystem_v2)

**Schedule**: Daily at 2:00 AM (low traffic period)

**Retention**: 7 days (older backups auto-deleted)

**Storage**: `/backups/qdrant/YYYYMMDD_HHMMSS_{collection}.snapshot`

#### Scenario: Daily backup runs successfully

- **GIVEN** cron job configured for 2:00 AM daily
- **WHEN** cron executes backup script
- **THEN** snapshot created for each collection
- **AND** snapshots saved to `/backups/qdrant/` with timestamp
- **AND** log entry created in `/var/log/qdrant-backup.log`
- **AND** backup completes within 5 minutes

#### Scenario: Old backups cleaned up

- **GIVEN** backup has run for 10 days
- **WHEN** cleanup task runs (part of backup script)
- **THEN** backups older than 7 days are deleted
- **AND** disk space freed
- **AND** log records: `"Deleted 3 old backups (> 7 days)"`

#### Scenario: Restore from backup

- **GIVEN** Qdrant collection corrupted or lost
- **WHEN** administrator runs restore script
- **THEN** latest backup loaded into Qdrant
- **AND** collection recreated with all vectors
- **AND** services reconnect and resume normal operation

#### Scenario: Backup failure alert

- **GIVEN** backup script execution
- **WHEN** backup fails (disk full, Qdrant unreachable)
- **THEN** error logged to `/var/log/qdrant-backup.log`
- **AND** alert sent to monitoring system (Grafana)
- **AND** on-call engineer notified

---

## MODIFIED Requirements

### Requirement: Query Logging and Analytics

The RAG Services SHALL log all user queries with performance metrics **AND** store logs in TimescaleDB hypertable for advanced analytics (previously: no database logging).

**MODIFIED**: Previously logged to application logs only. Now also stored in `rag.query_logs` hypertable.

**Fields**:
- query_text, query_type, executed_at (PARTITION KEY)
- duration_ms, cache_hit, results_count
- GPU metrics (wait_time, processing_time)
- Relevance scores (top, average)

**Retention**: 90 days (compressed after 7 days)

**Analytics**: Continuous aggregates for hourly/daily statistics

#### Scenario: Query logged to database

- **GIVEN** user performs semantic search
- **WHEN** query completes successfully
- **THEN** entry inserted into `rag.query_logs` hypertable
- **AND** includes all performance metrics (duration, GPU time, cache hit)
- **AND** includes top_relevance_score and avg_relevance_score
- **AND** partitioned by executed_at timestamp (hourly chunk)

#### Scenario: Hourly statistics computed automatically

- **GIVEN** continuous aggregate `query_logs_hourly_stats` configured
- **WHEN** queries logged throughout the hour
- **THEN** aggregate refreshes every 15 minutes
- **AND** includes: query_count, avg_duration_ms, p95_duration_ms, cache_hit_rate
- **AND** analytics endpoint queries aggregate (< 100ms response)

#### Scenario: Old logs compressed automatically

- **GIVEN** query_logs hypertable with compression policy (7 days)
- **WHEN** chunk is older than 7 days
- **THEN** chunk compressed automatically (columnar storage)
- **AND** storage reduced by ~10x
- **AND** queries still work (transparent decompression)

---

## REMOVED Requirements

_(None - All changes are additive or modifications)_

---

## RENAMED Requirements

_(None - No requirement names changed)_

---

**Total Requirements**:
- ADDED: 6
- MODIFIED: 1
- REMOVED: 0
- RENAMED: 0

**Status**: Ready for validation  
**Next Step**: Run `npm run openspec -- validate enhance-rag-services-architecture --strict`

