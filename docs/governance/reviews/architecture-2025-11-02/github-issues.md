# GitHub Issues - P1 Architecture Improvements

**Created:** 2025-11-02
**Source:** Architecture Review 2025-11-02

---

## Issue #1: Implement API Gateway (Kong) - Priority 1

**Title:** [P1][Infrastructure] Implement Kong API Gateway for Centralized Auth & Routing

**Labels:** `priority-1`, `infrastructure`, `security`, `enhancement`

**Estimated Effort:** 2 weeks

### Description

Implement Kong API Gateway to centralize authentication, routing, rate limiting, and security policies across all microservices. This addresses critical security gaps identified in the Architecture Review 2025-11-02.

**Current State:**
- Services communicate directly with frontend without gateway
- No inter-service authentication
- Inconsistent security policies across services
- High coupling between frontend and backend services

**Desired State:**
- Kong Gateway as single entry point for all API traffic
- Centralized JWT validation
- Redis-backed rate limiting
- Service discovery and load balancing
- Unified monitoring and logging

### Related Documentation
- [ADR-003: API Gateway Implementation](../../../content/reference/adrs/ADR-003-api-gateway-implementation.md)
- [Architecture Review 2025-11-02](./ARCHITECTURE-REVIEW-2025-11-02.md)

### Acceptance Criteria

- [ ] Kong Gateway deployed via Docker Compose with PostgreSQL backend
- [ ] Kong Manager (Admin GUI) accessible and configured
- [ ] All existing services migrated to route through Kong:
  - [ ] Workspace API (Port 3200)
  - [ ] TP Capital (Port 4005)
  - [ ] Documentation API (Port 3401)
  - [ ] RAG Services (Ports 8201-8202)
- [ ] JWT authentication plugin configured and tested
- [ ] Redis-backed rate limiting implemented (100 req/min per user)
- [ ] CORS policies centralized in Kong
- [ ] Prometheus metrics exposed for monitoring
- [ ] Health checks configured for all services
- [ ] Load testing confirms <10ms latency overhead (target: 1000 req/s)
- [ ] Documentation updated with new API gateway architecture
- [ ] Runbook created for Kong operations (restart, backup, failover)

### Implementation Plan

**Phase 1: Infrastructure (Days 1-3)**
1. Create `docker-compose.kong.yml` with Kong + PostgreSQL
2. Configure Kong database and run migrations
3. Deploy Kong Manager for admin operations
4. Test basic routing with one service (workspace-api)

**Phase 2: Service Migration (Days 4-7)**
1. Create declarative config for all service routes
2. Configure JWT authentication plugin
3. Set up Redis-backed rate limiting
4. Migrate CORS policies to Kong
5. Update frontend to use gateway endpoints (`/api/workspace`, `/api/rag`, etc.)

**Phase 3: Advanced Features (Days 8-10)**
1. Implement inter-service authentication (API keys)
2. Configure request/response logging
3. Set up Prometheus metrics exporter
4. Create Grafana dashboards for API monitoring
5. Implement circuit breaker patterns

**Phase 4: Testing & Documentation (Days 11-14)**
1. Load testing (JMeter/k6) - target: 1000 req/s
2. Security testing (OWASP ZAP, Burp Suite)
3. Create operational runbooks
4. Update architecture documentation
5. Team training session

### Configuration Checklist

**Docker Compose:**
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

  kong:
    image: kong:3.4-alpine
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    ports:
      - "8000:8000"   # Proxy HTTP
      - "8443:8443"   # Proxy HTTPS
      - "8001:8001"   # Admin API
    depends_on:
      - kong-database
```

**Service Routes (`kong.yml`):**
```yaml
services:
  - name: workspace-api
    url: http://apps-workspace:3200
    routes:
      - name: workspace-route
        paths: ["/api/workspace"]
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
```

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Single point of failure | High | Deploy 2+ Kong instances in HA mode |
| Performance degradation | Medium | Load testing, Redis caching, monitoring |
| Configuration complexity | Medium | Declarative config, IaC, version control |
| Service downtime during migration | Low | Blue-green deployment, gradual rollout |

### Success Metrics

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| API Response Time (P95) | 200ms | <210ms | Prometheus |
| Security Score | B+ | A | Manual audit |
| MTTR | 30min | 15min | Incident logs |
| API Error Rate | 2% | <1% | Kong Analytics |

### Dependencies
- Redis (for rate limiting) - Already deployed
- PostgreSQL 15 (for Kong state) - New
- Updated frontend configuration (API base URL)

### Follow-up Issues
- #2: Implement Inter-Service Authentication
- #3: Create API Gateway Monitoring Dashboards
- #4: Configure Kong High Availability

---

## Issue #2: Implement Inter-Service Authentication - Priority 1

**Title:** [P1][Security] Add Inter-Service Authentication with API Keys

**Labels:** `priority-1`, `security`, `enhancement`

**Estimated Effort:** 1 week

### Description

Implement authentication mechanism for service-to-service communication to prevent lateral movement and unauthorized access between microservices.

**Current State:**
- Services trust each other implicitly
- No verification for internal API calls
- TP Capital → Telegram Gateway: unauthenticated
- Documentation API → RAG Services: unauthenticated

**Desired State:**
- Shared secret (X-Service-Token header) for internal calls
- Kong key-auth plugin for service-to-service routes
- Automatic token rotation mechanism
- Audit logging for all internal requests

### Security Risk

**Severity:** High
**CVSS Score:** 7.5 (High)

If an attacker compromises one service, they can:
1. Access all other services without authentication
2. Exfiltrate data from internal APIs
3. Manipulate data in other services
4. Perform privilege escalation

### Acceptance Criteria

- [ ] Generate secure `INTER_SERVICE_SECRET` (32+ characters)
- [ ] Add secret to root `.env` file
- [ ] Update all internal service calls to include `X-Service-Token` header
- [ ] Create middleware to validate inter-service tokens:
  - [ ] Workspace API
  - [ ] TP Capital
  - [ ] Documentation API
  - [ ] RAG Collections Service
- [ ] Configure Kong key-auth plugin for internal routes
- [ ] Implement token rotation mechanism (monthly)
- [ ] Add audit logging for failed authentication attempts
- [ ] Update service discovery to include authentication
- [ ] Security testing with invalid/missing tokens
- [ ] Documentation: Inter-Service Auth Guide

### Implementation Details

**1. Generate Shared Secret**
```bash
# Generate cryptographically secure secret
openssl rand -base64 32 > .inter-service-secret

# Add to root .env
echo "INTER_SERVICE_SECRET=$(cat .inter-service-secret)" >> .env
```

**2. Middleware Implementation**
```javascript
// backend/shared/middleware/interServiceAuth.js
export function verifyServiceAuth(req, res, next) {
  const serviceToken = req.headers['x-service-token'];
  const expectedToken = process.env.INTER_SERVICE_SECRET;

  if (!serviceToken || serviceToken !== expectedToken) {
    logger.warn({
      ip: req.ip,
      path: req.path,
      service: req.headers['x-service-name']
    }, 'Unauthorized inter-service request');

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or missing service token'
    });
  }

  next();
}

// Usage in service
app.use('/internal/*', verifyServiceAuth);
```

**3. Client Implementation**
```javascript
// backend/shared/clients/serviceClient.js
export async function callInternalService(url, options = {}) {
  const headers = {
    ...options.headers,
    'X-Service-Token': process.env.INTER_SERVICE_SECRET,
    'X-Service-Name': process.env.SERVICE_NAME || 'unknown',
  };

  return fetch(url, { ...options, headers });
}
```

**4. Kong Configuration**
```yaml
# kong.yml - Internal routes with key-auth
services:
  - name: workspace-internal
    url: http://apps-workspace:3200
    routes:
      - name: workspace-internal-route
        paths: ["/internal/workspace"]
    plugins:
      - name: key-auth
        config:
          key_names: ["X-Service-Token"]
          hide_credentials: true
```

### Testing Checklist

- [ ] Test valid token → 200 OK
- [ ] Test invalid token → 403 Forbidden
- [ ] Test missing token → 403 Forbidden
- [ ] Test token in wrong header → 403 Forbidden
- [ ] Test expired token (after rotation) → 403 Forbidden
- [ ] Audit logs contain failed attempts
- [ ] Performance impact < 5ms per request
- [ ] Token rotation works without downtime

### Token Rotation Plan

**Frequency:** Monthly
**Process:**
1. Generate new secret: `NEW_INTER_SERVICE_SECRET`
2. Add to .env alongside old secret (grace period: 24 hours)
3. Update middleware to accept both tokens
4. Deploy changes to all services
5. Remove old secret after grace period
6. Monitor audit logs for failures

### Success Metrics

| Metric | Target |
|--------|--------|
| Failed auth attempts logged | 100% |
| Performance overhead | <5ms |
| Unauthorized access incidents | 0 |
| Token rotation success rate | 100% |

### Dependencies
- Kong Gateway (Issue #1) - Can implement without Kong initially
- Centralized logging system (nice-to-have)
- Secret rotation automation (follow-up)

---

## Issue #3: Increase Test Coverage to 30% - Priority 1

**Title:** [P1][Testing] Increase Test Coverage from 5.8% to 30%

**Labels:** `priority-1`, `testing`, `quality`, `enhancement`

**Estimated Effort:** 4 weeks

### Description

Systematically increase test coverage across backend and frontend to establish quality baseline and prevent regressions.

**Current State:**
- Total test coverage: 5.8% (2,505 tests / 43,536 files)
- Backend coverage: ~2%
- Frontend coverage: ~1%
- No integration tests
- No E2E tests

**Desired State:**
- Overall coverage: 30%
- Backend: 40% (focus on critical paths)
- Frontend: 25% (focus on business logic)
- 50+ integration tests
- 20+ E2E tests for critical flows

### Test Coverage Roadmap

See detailed roadmap: [Test Coverage Roadmap](./test-coverage-roadmap.md)

### Acceptance Criteria

#### Phase 1: Backend Unit Tests (Week 1-2)
- [ ] Backend coverage: 20% → 40%
- [ ] Test all service layer methods:
  - [ ] RagProxyService: 100% coverage
  - [ ] CollectionService: 100% coverage
  - [ ] SearchService: 80% coverage
- [ ] Test all repository methods:
  - [ ] TimescaleDB repositories: 80% coverage
  - [ ] Qdrant repositories: 80% coverage
- [ ] Test all middleware:
  - [ ] Authentication: 100% coverage
  - [ ] Rate limiting: 100% coverage
  - [ ] Error handling: 100% coverage
- [ ] Mock external dependencies (Ollama, LlamaIndex)

#### Phase 2: Frontend Unit Tests (Week 2-3)
- [ ] Frontend coverage: 1% → 25%
- [ ] Test all Zustand stores: 100% coverage
- [ ] Test custom hooks:
  - [ ] useWorkspace: 100%
  - [ ] useRagQuery: 100%
  - [ ] useServiceAutoRecovery: 100%
- [ ] Test critical components:
  - [ ] WorkspacePage: 80%
  - [ ] DocsHybridSearchPage: 80%
  - [ ] LlamaIndexPage: 80%
- [ ] Mock API calls with MSW (Mock Service Worker)

#### Phase 3: Integration Tests (Week 3)
- [ ] Create 50+ integration tests
- [ ] Test API endpoints end-to-end:
  - [ ] Workspace CRUD operations
  - [ ] RAG search & query flows
  - [ ] Collection management
  - [ ] Telegram message ingestion
- [ ] Use Testcontainers for:
  - [ ] TimescaleDB
  - [ ] Qdrant
  - [ ] Redis
- [ ] Test inter-service communication
- [ ] Test error scenarios (timeouts, service down)

#### Phase 4: E2E Tests (Week 4)
- [ ] Create 20+ E2E tests with Playwright
- [ ] Critical user flows:
  - [ ] User creates workspace item
  - [ ] User searches documentation
  - [ ] User queries RAG system
  - [ ] User manages collections
  - [ ] User views TP Capital signals
- [ ] Cross-browser testing (Chrome, Firefox)
- [ ] Mobile viewport testing

### Testing Infrastructure

**Backend:**
```json
{
  "framework": "Vitest",
  "coverage": "@vitest/coverage-v8",
  "mocking": "vitest/mocks",
  "integration": "supertest",
  "containers": "testcontainers"
}
```

**Frontend:**
```json
{
  "framework": "Vitest",
  "dom": "@testing-library/react",
  "mocking": "msw",
  "e2e": "@playwright/test"
}
```

### Test Examples

**Backend Unit Test:**
```javascript
// backend/api/documentation-api/src/services/__tests__/RagProxyService.test.js
import { describe, it, expect, vi } from 'vitest';
import { RagProxyService } from '../RagProxyService.js';

describe('RagProxyService', () => {
  it('should validate query parameters', async () => {
    const service = new RagProxyService();

    await expect(
      service.search('', 5)
    ).rejects.toThrow('Query cannot be empty');
  });

  it('should handle upstream timeout', async () => {
    const service = new RagProxyService({ timeout: 100 });

    // Mock fetch to timeout
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('ETIMEDOUT')), 200)
      )
    );

    await expect(
      service.search('test query', 5)
    ).rejects.toThrow('Request timeout');
  });
});
```

**Frontend Component Test:**
```typescript
// frontend/dashboard/src/components/pages/__tests__/WorkspacePage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspacePageNew } from '../WorkspacePageNew';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

describe('WorkspacePageNew', () => {
  it('should create new workspace item', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <WorkspacePageNew />
      </QueryClientProvider>
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'New Item' }
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    // Verify API call
    await waitFor(() => {
      expect(screen.getByText('Item created successfully')).toBeInTheDocument();
    });
  });
});
```

**Integration Test:**
```javascript
// backend/api/workspace/__tests__/integration/items.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { GenericContainer } from 'testcontainers';
import app from '../../src/server.js';

describe('Workspace Items API', () => {
  let timescaleContainer;

  beforeAll(async () => {
    // Start TimescaleDB container
    timescaleContainer = await new GenericContainer('timescale/timescaledb:latest-pg15')
      .withExposedPorts(5432)
      .start();

    process.env.TIMESCALEDB_HOST = timescaleContainer.getHost();
    process.env.TIMESCALEDB_PORT = timescaleContainer.getMappedPort(5432);
  });

  afterAll(async () => {
    await timescaleContainer.stop();
  });

  it('POST /api/items should create item', async () => {
    const response = await request(app)
      .post('/api/items')
      .send({ title: 'Test Item', content: 'Content' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Item');
  });
});
```

### Coverage Reports

**CI/CD Integration:**
```yaml
# .github/workflows/test.yml
name: Test Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Run Backend Tests
        run: |
          cd backend/api/documentation-api
          npm test -- --coverage

      - name: Run Frontend Tests
        run: |
          cd frontend/dashboard
          npm test -- --coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
```

### Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| **Phase 1** | Backend coverage | 40% |
| **Phase 2** | Frontend coverage | 25% |
| **Phase 3** | Integration tests | 50+ tests |
| **Phase 4** | E2E tests | 20+ tests |
| **Overall** | Total coverage | 30% |
| **Quality** | Test execution time | <5 minutes |
| **Stability** | Flaky test rate | <2% |

### Dependencies
- Testcontainers for Docker-based integration tests
- MSW (Mock Service Worker) for frontend API mocking
- Playwright for E2E testing
- GitHub Actions for CI/CD

### Follow-up Issues
- #5: Implement Mutation Testing (Stryker)
- #6: Add Visual Regression Testing (Percy/Chromatic)
- #7: Create Test Data Factory Pattern

---

## Issue #4: Implement TimescaleDB High Availability - Priority 1

**Title:** [P1][Infrastructure] Deploy TimescaleDB Read Replicas & PgBouncer Pooling

**Labels:** `priority-1`, `infrastructure`, `reliability`, `database`

**Estimated Effort:** 3 weeks

### Description

Eliminate single point of failure by deploying TimescaleDB with read replicas, connection pooling (PgBouncer), and automated failover.

**Current State:**
- Single TimescaleDB primary instance
- All services connect directly to primary
- No read replicas
- No connection pooling (each service has own pool)
- Manual failover required
- Recovery Time Objective (RTO): 30+ minutes

**Desired State:**
- 1 primary + 2 read replicas
- PgBouncer connection pooling (transaction mode)
- Automatic failover with Patroni
- Load balancing for read queries
- RTO: <5 minutes
- RPO (Recovery Point Objective): <1 minute

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│         Application Services            │
│  (Workspace, TP Capital, Docs API)      │
└───────────────┬─────────────────────────┘
                │
        ┌───────▼────────┐
        │   PgBouncer    │  (Connection Pooler)
        │  Port: 6432    │  Max 100 connections
        └───────┬────────┘
                │
    ┌───────────┴──────────────┐
    │                           │
┌───▼────────┐          ┌──────▼──────┐
│  Primary   │          │   Replicas  │
│ (Read+Write)│ ◄───────┤ (Read-only) │
│ Port: 5432 │ Streaming│  Port: 5433 │
└────────────┘ Replication  Port: 5434 │
                         └─────────────┘
       │
   ┌───▼────┐
   │ Patroni│  (HA Manager)
   │ + etcd │  (Distributed Config)
   └────────┘
```

### Acceptance Criteria

#### Phase 1: PgBouncer Setup (Week 1)
- [ ] Deploy PgBouncer via Docker Compose
- [ ] Configure transaction-mode pooling
- [ ] Set connection limits (max 100, default 20 per user)
- [ ] Update all services to connect via PgBouncer (port 6432)
- [ ] Configure authentication (md5/scram-sha-256)
- [ ] Test connection pooling under load
- [ ] Monitor connection metrics with Prometheus
- [ ] Documentation: PgBouncer Configuration Guide

#### Phase 2: Read Replicas (Week 2)
- [ ] Deploy 2 TimescaleDB replica instances
- [ ] Configure streaming replication from primary
- [ ] Verify replication lag < 1 second
- [ ] Configure PgBouncer read/write routing
- [ ] Update application code to use read replicas for queries:
  - [ ] Workspace: Read queries → replica
  - [ ] TP Capital: Read queries → replica
  - [ ] Documentation API: Read queries → replica
- [ ] Test replica failover (promote replica to primary)
- [ ] Configure continuous archiving (WAL shipping to S3/MinIO)

#### Phase 3: Automated Failover (Week 3)
- [ ] Deploy Patroni for HA management
- [ ] Deploy etcd for distributed consensus
- [ ] Configure automatic failover rules
- [ ] Test failover scenarios:
  - [ ] Primary crash → automatic promotion
  - [ ] Network partition → split-brain prevention
  - [ ] Planned maintenance → controlled switchover
- [ ] Configure monitoring alerts (PagerDuty/Slack)
- [ ] Create runbook for manual failover
- [ ] Load testing with failover scenarios

### Implementation Details

**1. PgBouncer Configuration**
```ini
# docker/pgbouncer/pgbouncer.ini
[databases]
tradingsystem = host=data-timescale port=5432 dbname=tradingsystem
tradingsystem_replica = host=data-timescale-replica-1 port=5432 dbname=tradingsystem

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Connection pooling
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
reserve_pool_size = 5
reserve_pool_timeout = 3

# Timeouts
server_idle_timeout = 600
server_lifetime = 3600
query_timeout = 0

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

**2. Docker Compose Services**
```yaml
# tools/compose/docker-compose.database-ha.yml
services:
  pgbouncer:
    image: edoburu/pgbouncer:1.20
    container_name: data-pgbouncer
    environment:
      - DATABASES_HOST=data-timescale
      - DATABASES_PORT=5432
      - DATABASES_DBNAME=tradingsystem
      - DATABASES_USER=timescale
      - DATABASES_PASSWORD=${TIMESCALEDB_PASSWORD}
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
      - DEFAULT_POOL_SIZE=20
    ports:
      - "6432:6432"
    networks:
      - tradingsystem_backend
    depends_on:
      - timescale-primary

  timescale-primary:
    image: timescale/timescaledb:latest-pg15
    container_name: data-timescale
    environment:
      POSTGRES_DB: tradingsystem
      POSTGRES_USER: timescale
      POSTGRES_PASSWORD: ${TIMESCALEDB_PASSWORD}
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPLICATOR_PASSWORD}
    volumes:
      - timescale_primary_data:/var/lib/postgresql/data
      - ./init-replication.sh:/docker-entrypoint-initdb.d/init-replication.sh
    command:
      - postgres
      - -c
      - wal_level=replica
      - -c
      - max_wal_senders=10
      - -c
      - max_replication_slots=10
      - -c
      - hot_standby=on
    ports:
      - "5432:5432"
    networks:
      - tradingsystem_backend

  timescale-replica-1:
    image: timescale/timescaledb:latest-pg15
    container_name: data-timescale-replica-1
    environment:
      POSTGRES_USER: replicator
      POSTGRES_PASSWORD: ${REPLICATOR_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - timescale_replica1_data:/var/lib/postgresql/data
    command:
      - bash
      - -c
      - |
        until pg_basebackup -h data-timescale -D /var/lib/postgresql/data/pgdata -U replicator -vP -W; do
          echo "Waiting for primary to be ready..."
          sleep 5
        done
        echo "standby_mode = 'on'" > /var/lib/postgresql/data/pgdata/recovery.conf
        echo "primary_conninfo = 'host=data-timescale port=5432 user=replicator password=${REPLICATOR_PASSWORD}'" >> /var/lib/postgresql/data/pgdata/recovery.conf
        exec postgres
    ports:
      - "5433:5432"
    networks:
      - tradingsystem_backend
    depends_on:
      - timescale-primary

  timescale-replica-2:
    image: timescale/timescaledb:latest-pg15
    container_name: data-timescale-replica-2
    # ... similar to replica-1 ...
    ports:
      - "5434:5432"

  # Patroni for HA (optional, advanced)
  patroni:
    image: patroni/patroni:3.1
    container_name: data-patroni
    environment:
      - PATRONI_NAME=timescale-primary
      - PATRONI_SCOPE=tradingsystem-cluster
      - PATRONI_POSTGRESQL_DATA_DIR=/var/lib/postgresql/data
      - PATRONI_ETCD_HOSTS=etcd:2379
    # ... see full config in implementation
```

**3. Service Configuration Updates**
```javascript
// backend/api/workspace/src/config.js
export const dbConfig = {
  // Primary for writes
  primary: {
    host: process.env.PGBOUNCER_HOST || 'data-pgbouncer',
    port: process.env.PGBOUNCER_PORT || 6432,
    database: process.env.TIMESCALEDB_DATABASE,
    user: process.env.TIMESCALEDB_USER,
    password: process.env.TIMESCALEDB_PASSWORD,
    max: 20, // PgBouncer manages actual pool
  },

  // Replicas for reads
  replicas: [
    {
      host: process.env.PGBOUNCER_HOST || 'data-pgbouncer',
      port: 6432,
      database: 'tradingsystem_replica',
      user: process.env.TIMESCALEDB_USER,
      password: process.env.TIMESCALEDB_PASSWORD,
      max: 20,
    },
  ],
};

// Usage
import { Pool } from 'pg';

const primaryPool = new Pool(dbConfig.primary);
const replicaPool = new Pool(dbConfig.replicas[0]);

// Write query
export async function createItem(item) {
  return primaryPool.query('INSERT INTO items ...', [item]);
}

// Read query
export async function getItems() {
  return replicaPool.query('SELECT * FROM items');
}
```

### Testing Scenarios

#### Load Testing
```bash
# Target: 1000 concurrent connections
# Tool: pgbench

pgbench -h localhost -p 6432 -U timescale -d tradingsystem \
  -c 1000 -j 10 -T 60 -S  # 60s read-only test

# Expected results:
# - No connection refused errors
# - Latency < 50ms (p95)
# - Throughput > 10,000 TPS
```

#### Failover Testing
```bash
# 1. Simulate primary failure
docker stop data-timescale

# Expected: Patroni promotes replica within 30s
# Monitor: Application should reconnect automatically

# 2. Simulate network partition
docker network disconnect tradingsystem_backend data-timescale

# Expected: etcd consensus prevents split-brain

# 3. Simulate replication lag
# Insert 10,000 rows on primary, measure lag on replica
```

### Monitoring & Alerts

**Prometheus Metrics:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'pgbouncer'
    static_configs:
      - targets: ['data-pgbouncer:9127']

  - job_name: 'postgres'
    static_configs:
      - targets: ['data-timescale:9187']
```

**Key Metrics:**
- `pgbouncer_active_clients` - Active client connections
- `pgbouncer_waiting_clients` - Queued connections
- `pg_replication_lag` - Replication lag in seconds
- `pg_up` - Database availability

**Alerts:**
```yaml
# alertmanager.yml
groups:
  - name: database
    rules:
      - alert: HighReplicationLag
        expr: pg_replication_lag > 5
        for: 5m
        annotations:
          summary: "Replication lag > 5 seconds"

      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        annotations:
          summary: "TimescaleDB instance is down"

      - alert: ConnectionPoolExhausted
        expr: pgbouncer_waiting_clients > 50
        for: 2m
        annotations:
          summary: "PgBouncer connection pool exhausted"
```

### Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| RTO (Recovery Time) | 30+ min | <5 min | Failover tests |
| RPO (Data Loss) | 5+ min | <1 min | Replication lag |
| Connection Efficiency | ~50 conns | 1000+ conns | PgBouncer pooling |
| Read Throughput | 1000 TPS | 10,000 TPS | pgbench |
| Failover Success Rate | N/A | 99.9% | Automated tests |

### Rollback Plan

If issues arise during deployment:
1. Point services back to primary (bypass PgBouncer)
2. Stop replica containers
3. Remove PgBouncer from docker-compose
4. Restore from backup if data corruption
5. Post-mortem analysis

### Dependencies
- Docker Compose setup
- Backup/restore procedures in place
- Monitoring infrastructure (Prometheus + Grafana)
- Runbooks for manual failover

### Follow-up Issues
- #8: Implement Automated Backups (WAL-G)
- #9: Configure Point-in-Time Recovery (PITR)
- #10: Add Database Performance Monitoring (pg_stat_statements)

---

## Summary

**Total Effort:** 10 weeks (2 + 1 + 4 + 3)

**Priority Order:**
1. Issue #1: API Gateway (2 weeks) - **Critical for security**
2. Issue #2: Inter-Service Auth (1 week) - **Critical for security**
3. Issue #3: Test Coverage (4 weeks) - **Critical for quality**
4. Issue #4: Database HA (3 weeks) - **Critical for reliability**

**Dependencies:**
- Issues #1 and #2 should be done together
- Issue #3 can be done in parallel
- Issue #4 can be done after Issue #1

**Next Steps:**
1. Review and approve these issues with the team
2. Create actual GitHub issues with these descriptions
3. Assign owners to each issue
4. Start with Issue #1 (API Gateway) in Q1 2026

---

**Document Version:** 1.0
**Created:** 2025-11-02
**Next Review:** 2026-01-15
