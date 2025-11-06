# 🚀 Sprint 2 Proposal - RAG Services HA & API Gateway

**Sprint Goal**: Deploy High Availability infrastructure for production-ready RAG Services

**Duration**: 5 days  
**Start Date**: 2025-11-03  
**End Date**: 2025-11-08

---

## 🎯 Sprint Objectives

1. **Qdrant High Availability** - 3-node cluster with replication
2. **Kong API Gateway** - Centralized authentication, rate limiting, routing
3. **Observability Enhancement** - Prometheus metrics + Grafana dashboards
4. **Load Testing** - K6 stress tests for circuit breakers

---

## 📋 Epic 1: Qdrant HA Cluster (3 days)

### Story 1.1: Qdrant Cluster Deployment
**Priority**: P0 (Critical)  
**Effort**: 8 points  
**Assignee**: AI Agent

**Acceptance Criteria:**
- ✅ 3-node Qdrant cluster (1 leader + 2 replicas)
- ✅ Automatic leader election on failure
- ✅ Data replication factor = 2 (no data loss)
- ✅ Health checks validate all nodes
- ✅ Read queries load-balanced across nodes

**Tasks:**
1. Create `docker-compose.qdrant-ha.yml` with 3 nodes
2. Configure Raft consensus for leader election
3. Set replication factor = 2 for `docs_index_mxbai` collection
4. Implement health check script (`test-qdrant-ha.sh`)
5. Update `RagProxyService.js` to use cluster endpoint
6. Documentation: `docs/content/tools/rag/qdrant-ha.mdx`

**Technical Design:**

```yaml
# docker-compose.qdrant-ha.yml
services:
  qdrant-node1:
    image: qdrant/qdrant:v1.7.4
    container_name: qdrant-node1
    ports:
      - "6333:6333"  # HTTP API
      - "6335:6335"  # Raft internal
    environment:
      - QDRANT__CLUSTER__ENABLED=true
      - QDRANT__CLUSTER__NODE_ID=1
      - QDRANT__CLUSTER__RAFT__BOOTSTRAP=qdrant-node1:6335,qdrant-node2:6335,qdrant-node3:6335
    volumes:
      - qdrant_node1_data:/qdrant/storage

  qdrant-node2:
    image: qdrant/qdrant:v1.7.4
    container_name: qdrant-node2
    ports:
      - "6336:6333"
      - "6337:6335"
    environment:
      - QDRANT__CLUSTER__ENABLED=true
      - QDRANT__CLUSTER__NODE_ID=2
      - QDRANT__CLUSTER__RAFT__BOOTSTRAP=qdrant-node1:6335,qdrant-node2:6335,qdrant-node3:6335
    volumes:
      - qdrant_node2_data:/qdrant/storage

  qdrant-node3:
    image: qdrant/qdrant:v1.7.4
    container_name: qdrant-node3
    ports:
      - "6338:6333"
      - "6339:6335"
    environment:
      - QDRANT__CLUSTER__ENABLED=true
      - QDRANT__CLUSTER__NODE_ID=3
      - QDRANT__CLUSTER__RAFT__BOOTSTRAP=qdrant-node1:6335,qdrant-node2:6335,qdrant-node3:6335
    volumes:
      - qdrant_node3_data:/qdrant/storage

  qdrant-lb:
    image: haproxy:2.8-alpine
    container_name: qdrant-lb
    ports:
      - "6333:6333"  # Load balancer endpoint
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    depends_on:
      - qdrant-node1
      - qdrant-node2
      - qdrant-node3
```

**HAProxy Config (`haproxy.cfg`):**

```
global
    maxconn 4096

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend qdrant_frontend
    bind *:6333
    default_backend qdrant_cluster

backend qdrant_cluster
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    server node1 qdrant-node1:6333 check inter 5s fall 3 rise 2
    server node2 qdrant-node2:6333 check inter 5s fall 3 rise 2
    server node3 qdrant-node3:6333 check inter 5s fall 3 rise 2
```

**Migration Script:**

```bash
#!/bin/bash
# Migrate existing collection to HA cluster with replication

# 1. Create collection with replication factor
curl -X PUT http://localhost:6333/collections/docs_index_mxbai \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    },
    "replication_factor": 2,
    "write_consistency_factor": 1
  }'

# 2. Re-index documents (trigger ingestion)
curl -X POST http://localhost:8201/reindex
```

---

## 📋 Epic 2: Kong API Gateway (2 days)

### Story 2.1: Kong Gateway Deployment
**Priority**: P0 (Critical)  
**Effort**: 8 points

**Acceptance Criteria:**
- ✅ Kong Gateway running with PostgreSQL backend
- ✅ Routes configured for RAG services (`/api/v1/rag/*`)
- ✅ JWT authentication plugin enabled
- ✅ Rate limiting: 100 req/min per IP
- ✅ Circuit breaker integration (upstream health checks)
- ✅ Centralized CORS configuration

**Tasks:**
1. Create `docker-compose.kong.yml` with Kong + PostgreSQL
2. Configure Kong services/routes via declarative YAML
3. Enable JWT plugin with `JWT_SECRET_KEY`
4. Configure rate limiting (100 req/min)
5. Update Dashboard to use Kong endpoint (`http://localhost:8000`)
6. Documentation: `docs/content/tools/rag/kong-gateway.mdx`

**Technical Design:**

```yaml
# docker-compose.kong.yml
services:
  kong-db:
    image: postgres:15-alpine
    container_name: kong-db
    environment:
      - POSTGRES_DB=kong
      - POSTGRES_USER=kong
      - POSTGRES_PASSWORD=${KONG_PG_PASSWORD}
    volumes:
      - kong_db_data:/var/lib/postgresql/data

  kong-migrations:
    image: kong:3.5-alpine
    container_name: kong-migrations
    command: kong migrations bootstrap
    environment:
      - KONG_DATABASE=postgres
      - KONG_PG_HOST=kong-db
      - KONG_PG_USER=kong
      - KONG_PG_PASSWORD=${KONG_PG_PASSWORD}
    depends_on:
      - kong-db

  kong:
    image: kong:3.5-alpine
    container_name: kong-gateway
    ports:
      - "8000:8000"  # Proxy (HTTP)
      - "8443:8443"  # Proxy (HTTPS)
      - "8001:8001"  # Admin API
    environment:
      - KONG_DATABASE=postgres
      - KONG_PG_HOST=kong-db
      - KONG_PG_USER=kong
      - KONG_PG_PASSWORD=${KONG_PG_PASSWORD}
      - KONG_PROXY_ACCESS_LOG=/dev/stdout
      - KONG_ADMIN_ACCESS_LOG=/dev/stdout
      - KONG_PROXY_ERROR_LOG=/dev/stderr
      - KONG_ADMIN_ERROR_LOG=/dev/stderr
      - KONG_ADMIN_LISTEN=0.0.0.0:8001
    depends_on:
      - kong-migrations
```

**Kong Declarative Config (`kong.yml`):**

```yaml
_format_version: "3.0"

services:
  - name: rag-service
    url: http://rag-service:3000
    routes:
      - name: rag-api
        paths:
          - /api/v1/rag
    plugins:
      - name: jwt
        config:
          secret_is_base64: false
          key_claim_name: kid
      - name: rate-limiting
        config:
          minute: 100
          policy: local
      - name: cors
        config:
          origins:
            - http://localhost:3103
          methods:
            - GET
            - POST
          credentials: true
      - name: request-transformer
        config:
          add:
            headers:
              - X-Service-Token:${INTER_SERVICE_SECRET}
```

**Dashboard Integration:**

```typescript
// frontend/dashboard/src/config/api.ts
export const API_CONFIG = {
  ragService: {
    // Old: Direct access
    // baseUrl: 'http://localhost:3402'
    
    // New: Via Kong Gateway
    baseUrl: 'http://localhost:8000',
    
    endpoints: {
      search: '/api/v1/rag/search',
      query: '/api/v1/rag/query',
      collections: '/api/v1/rag/collections'
    }
  }
};
```

---

## 📋 Epic 3: Observability (1 day)

### Story 3.1: Prometheus Metrics Export
**Priority**: P1 (High)  
**Effort**: 5 points

**Acceptance Criteria:**
- ✅ Circuit breaker metrics exposed (`circuit_breaker_state`, `circuit_breaker_failures`)
- ✅ RAG query latency histogram (`rag_query_duration_seconds`)
- ✅ Qdrant cluster health metrics (`qdrant_cluster_nodes_up`)
- ✅ Kong request rate (`kong_http_requests_total`)

**Tasks:**
1. Add `prom-client` to Node.js services
2. Expose `/metrics` endpoint in RAG Service
3. Configure Prometheus scrape targets
4. Create Grafana dashboard (`RAG-Services-Overview.json`)

**Prometheus Config (`prometheus.yml`):**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'rag-service'
    static_configs:
      - targets: ['rag-service:3000']
  
  - job_name: 'llamaindex-query'
    static_configs:
      - targets: ['rag-llamaindex-query:8000']
  
  - job_name: 'kong'
    static_configs:
      - targets: ['kong-gateway:8001']
  
  - job_name: 'qdrant-cluster'
    static_configs:
      - targets:
        - 'qdrant-node1:6333'
        - 'qdrant-node2:6333'
        - 'qdrant-node3:6333'
```

**Grafana Dashboard Panels:**
1. Circuit Breaker States (Gauge)
2. RAG Query Latency P95 (Histogram)
3. Qdrant Cluster Status (Table)
4. Kong Request Rate (Graph)
5. Error Rate (Counter)

---

## 📋 Epic 4: Load Testing (0.5 day)

### Story 4.1: K6 Load Tests
**Priority**: P2 (Medium)  
**Effort**: 3 points

**Acceptance Criteria:**
- ✅ K6 test script simulates 50 concurrent users
- ✅ Circuit breaker opens at expected threshold (5 failures)
- ✅ Kong rate limiting triggers at 100 req/min
- ✅ Qdrant cluster maintains <200ms P95 latency under load

**Tasks:**
1. Create `scripts/testing/load-test-rag.js` (K6 script)
2. Run 5-minute load test (50 VUs)
3. Generate HTML report with metrics
4. Document performance baselines

**K6 Script:**

```javascript
// scripts/testing/load-test-rag.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp-up
    { duration: '3m', target: 50 },  // Peak load
    { duration: '1m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% < 500ms
    http_req_failed: ['rate<0.1'],     // < 10% failures
  },
};

export default function () {
  const url = 'http://localhost:8000/api/v1/rag/search';
  const params = {
    headers: {
      'Authorization': `Bearer ${__ENV.JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  
  const payload = JSON.stringify({
    query: 'How does circuit breaker work?',
    max_results: 5,
  });
  
  const res = http.post(url, payload, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

**Run Test:**

```bash
k6 run scripts/testing/load-test-rag.js --env JWT_TOKEN=$(curl -s http://localhost:3402/api/v1/auth/token | jq -r '.token')
```

---

## 📊 Success Metrics

### Sprint 1 Baseline (Current)
- ✅ Circuit breakers: 4 instances
- ✅ Qdrant: Single node (no HA)
- ⚠️ Auth: Per-service JWT minting
- ⚠️ Rate limiting: None
- ⚠️ Observability: Basic health checks only

### Sprint 2 Target
- ✅ **Qdrant HA**: 3-node cluster, RF=2, automatic failover
- ✅ **Kong Gateway**: Centralized auth, 100 req/min rate limit, CORS
- ✅ **Observability**: Prometheus metrics, Grafana dashboards
- ✅ **Load Testing**: P95 latency < 500ms with 50 concurrent users
- ✅ **Zero Downtime**: Rolling updates without service interruption

---

## 🚧 Risks & Mitigations

### Risk 1: Qdrant Cluster Split-Brain
**Impact**: High  
**Probability**: Low  
**Mitigation**: Use Raft consensus (3-node quorum), monitor `/cluster/status`

### Risk 2: Kong Learning Curve
**Impact**: Medium  
**Probability**: Medium  
**Mitigation**: Start with declarative config (YAML), use Kong docs extensively

### Risk 3: Performance Degradation
**Impact**: High  
**Probability**: Low  
**Mitigation**: Load testing before production, circuit breakers prevent cascading failures

---

## 📅 Sprint Timeline

**Day 1 (2025-11-03):**
- ✅ Sprint 1 deployment & validation
- 🚧 Qdrant HA: Docker Compose setup

**Day 2 (2025-11-04):**
- 🚧 Qdrant HA: Migration & testing
- 🚧 Kong: Gateway deployment

**Day 3 (2025-11-05):**
- 🚧 Kong: Route configuration & JWT plugin
- 🚧 Dashboard integration with Kong

**Day 4 (2025-11-06):**
- 🚧 Prometheus metrics implementation
- 🚧 Grafana dashboards

**Day 5 (2025-11-07):**
- 🚧 K6 load testing
- 🚧 Documentation & deployment guide

**Day 6 (2025-11-08):**
- ✅ Sprint Review
- ✅ Production deployment (if metrics pass)

---

## ✅ Definition of Done

- [ ] Qdrant 3-node cluster running with RF=2
- [ ] Kong Gateway proxying all `/api/v1/rag/*` requests
- [ ] JWT authentication centralized in Kong
- [ ] Rate limiting active (100 req/min)
- [ ] Circuit breaker metrics in Grafana
- [ ] K6 load test passes (P95 < 500ms)
- [ ] Documentation complete (`docs/content/tools/rag/`)
- [ ] Deployment guide created (`DEPLOY-SPRINT-2.md`)
- [ ] Zero known critical bugs

---

## 📚 References

- **Qdrant Clustering**: https://qdrant.tech/documentation/guides/distributed_deployment/
- **Kong Gateway**: https://docs.konghq.com/gateway/latest/
- **K6 Load Testing**: https://k6.io/docs/
- **HAProxy**: http://www.haproxy.org/#docs

---

**Last Updated**: 2025-11-03  
**Status**: Proposal - Pending Approval  
**Approved By**: Awaiting User Approval

---

## 🤔 Questions for Product Owner

1. **Qdrant HA Priority**: Should we prioritize Qdrant HA over Kong? (Both are critical but we can sequence them)
2. **Kong SSL/TLS**: Do we need HTTPS support in Sprint 2 or defer to Sprint 3?
3. **Load Testing Scope**: Should load tests include write operations (ingestion) or only read queries?
4. **Monitoring**: Do we have existing Prometheus/Grafana or need to deploy from scratch?

Please review and approve to proceed with Sprint 2! 🚀

