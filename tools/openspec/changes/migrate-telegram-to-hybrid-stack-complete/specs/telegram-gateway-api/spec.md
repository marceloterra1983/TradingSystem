---
capability-id: telegram-gateway-api
capability-type: EXISTING
status: proposal
domain: backend
tags: [telegram, api, rest, containers]
---

# Specification: Telegram Gateway REST API (Modified for Hybrid Stack)

## MODIFIED Requirements

### Requirement: Database Connection via PgBouncer

The Gateway API SHALL connect to TimescaleDB exclusively through PgBouncer connection pooler instead of direct database connection.

#### Scenario: Database client initialization with pooling

- **WHEN** Gateway API container starts
- **THEN** it SHALL initialize PostgreSQL client with connection string:
  `postgresql://telegram:${TELEGRAM_DB_PASSWORD}@telegram-pgbouncer:5432/telegram_gateway`
- **AND** connection SHALL go through PgBouncer (not direct to TimescaleDB)
- **AND** benefit from transaction-mode connection pooling
- **AND** connection overhead SHALL be <5ms (vs 50ms direct)

#### Scenario: Query execution via pooled connection

- **WHEN** API executes query `GET /api/messages`
- **THEN** PgBouncer SHALL allocate connection from pool
- **AND** execute query on TimescaleDB
- **AND** return results to API
- **AND** release connection back to pool after transaction completes
- **AND** query latency SHALL be reduced by ~45ms due to pooling

---

### Requirement: Redis Cache Integration for API Responses

The Gateway API SHALL optionally cache API responses in Redis to reduce database load for frequently accessed data.

#### Scenario: API response caching

- **WHEN** client queries `GET /api/messages?channelId=-1001649127710&limit=50`
- **THEN** API SHALL check Redis cache with key `api:messages:{channelId}:limit{limit}`
- **AND** return cached response if found (TTL: 30 seconds)
- **AND** skip database query if cache hit
- **AND** increment metric `api_cache_hits_total`

#### Scenario: Cache miss fallback to database

- **WHEN** Redis cache does not contain requested data
- **THEN** API SHALL query TimescaleDB via PgBouncer
- **AND** cache response in Redis with 30-second TTL
- **AND** return results to client
- **AND** increment metric `api_cache_misses_total`

---

### Requirement: Container Resource Limits

The Gateway API container SHALL have defined resource limits to prevent resource exhaustion.

#### Scenario: Container deployment with limits

- **WHEN** Gateway API container is deployed
- **THEN** Docker SHALL enforce resource limits:
  - CPU limit: 0.5 cores
  - Memory limit: 256MB
  - CPU reservation: 0.25 cores
  - Memory reservation: 128MB
- **AND** container SHALL be killed if memory exceeds limit
- **AND** Prometheus SHALL alert if CPU usage >80% for 5 minutes

---

### Requirement: Health Check Endpoint

The Gateway API SHALL expose health check endpoint reporting status of all dependencies.

#### Scenario: Health check with all dependencies healthy

- **WHEN** client requests `GET /health`
- **THEN** API SHALL check:
  - TimescaleDB connection (via PgBouncer)
  - Redis connection (if enabled)
  - Native Gateway service (via HTTP to localhost:4006)
- **AND** return `200 OK` with JSON body:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "cache": "connected",
    "gatewayService": "connected",
    "uptime": 12345
  }
  ```

#### Scenario: Health check with degraded state

- **WHEN** Redis is unavailable but database is healthy
- **THEN** API SHALL return `200 OK` with status `degraded`
- **AND** include details: `cache: "unavailable"`
- **AND** API SHALL continue functioning (database-only mode)

