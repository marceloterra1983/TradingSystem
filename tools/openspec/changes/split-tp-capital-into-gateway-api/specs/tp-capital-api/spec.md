---
capability-id: tp-capital-api
capability-type: MODIFIED
status: proposal
domain: backend
tags: [api, rest, timescaledb, containerized]
---

# Specification: TP Capital API (Modified)

## Overview

The **TP Capital API** is a containerized Node.js REST API responsible for receiving trading signals from the Telegram Gateway, parsing signal data, persisting to TimescaleDB, and serving queries from the Dashboard. This service handles all business logic and data persistence concerns, decoupled from Telegram integration.

**Key Changes in This Proposal**:
- ✅ **NEW**: `/ingest` endpoint receives messages from Gateway
- ✅ **NEW**: Gateway authentication middleware (validates `X-Gateway-Token`)
- ✅ **NEW**: Idempotency checks prevent duplicate signals
- ✅ **MODIFIED**: Runs as Docker container (was local process)
- ✅ **REMOVED**: Direct Telegram integration (moved to Gateway)

---

## ADDED Requirements

### Requirement: Gateway Ingestion Endpoint

The API SHALL provide `/ingest` endpoint to receive messages from the Telegram Gateway.

#### Scenario: Accept valid message from Gateway
- **WHEN** Gateway POSTs message payload to `/ingest` endpoint
- **AND** Request includes valid `X-Gateway-Token` header
- **AND** Payload contains all required fields (channelId, messageId, text, timestamp)
- **THEN** API responds with 200 OK
- **AND** Response body contains: `{"status":"ok"}`
- **AND** API increments `api_ingestion_requests_total{status="success"}` counter

#### Scenario: Reject request with missing authentication header
- **WHEN** Gateway POSTs message without `X-Gateway-Token` header
- **THEN** API responds with 401 Unauthorized
- **AND** Response body contains: `{"error":"Missing X-Gateway-Token header"}`
- **AND** API logs warning with source IP address
- **AND** API increments `api_ingestion_requests_total{status="auth_error"}` counter

#### Scenario: Reject request with invalid authentication token
- **WHEN** Gateway POSTs message with incorrect `X-Gateway-Token` header
- **THEN** API responds with 401 Unauthorized
- **AND** Response body contains: `{"error":"Invalid gateway token"}`
- **AND** API logs warning with source IP and token prefix (first 8 chars)
- **AND** API increments `api_ingestion_requests_total{status="auth_error"}` counter

#### Scenario: Reject request with malformed payload
- **WHEN** Gateway POSTs message with missing required field (e.g., `messageId`)
- **THEN** API responds with 400 Bad Request
- **AND** Response body contains: `{"error":"Missing required field: messageId"}`
- **AND** API logs error with received payload (sanitized)
- **AND** API increments `api_ingestion_requests_total{status="validation_error"}` counter

---

### Requirement: Gateway Authentication Middleware

The API SHALL validate Gateway requests using shared secret token.

#### Scenario: Authentication middleware validates token
- **WHEN** Request enters authentication middleware
- **AND** Request includes `X-Gateway-Token: <valid_token>`
- **THEN** Middleware extracts token from header
- **AND** Middleware compares token with `process.env.GATEWAY_SECRET_TOKEN`
- **AND** If match, middleware calls `next()` (allow request)
- **AND** If no match, middleware returns 401 Unauthorized

#### Scenario: Authentication middleware handles missing configuration
- **WHEN** API starts
- **AND** `GATEWAY_SECRET_TOKEN` environment variable is not set
- **THEN** API logs "FATAL: GATEWAY_SECRET_TOKEN is required"
- **AND** API exits with code 1 (fail-fast validation)

#### Scenario: Authentication middleware logs suspicious activity
- **WHEN** Middleware receives 10+ invalid tokens from same IP within 1 minute
- **THEN** Middleware logs "SECURITY: Multiple failed auth attempts from IP X.X.X.X"
- **AND** Middleware continues blocking requests (does NOT rate-limit or ban)
- **AND** Operator alerted via Prometheus alert (if configured)

---

### Requirement: Idempotency Checks

The API SHALL prevent duplicate signal inserts using composite key (channelId + messageId + timestamp).

#### Scenario: Idempotency check detects new message
- **WHEN** API receives message from Gateway
- **AND** Idempotency middleware queries TimescaleDB:
  ```sql
  SELECT * FROM tp_capital_signals
  WHERE channel_id = <channelId>
    AND message_id = <messageId>
    AND ingested_at BETWEEN (<timestamp> - 1s) AND (<timestamp> + 1s)
  LIMIT 1
  ```
- **AND** Query returns zero rows
- **THEN** Middleware calls `next()` (allow insert)

#### Scenario: Idempotency check detects duplicate message
- **WHEN** API receives message from Gateway
- **AND** Idempotency middleware queries TimescaleDB
- **AND** Query returns existing signal with same (channel_id, message_id)
- **THEN** Middleware responds with 200 OK
- **AND** Response body contains: `{"status":"ok","skipped":true}`
- **AND** Middleware logs "Duplicate message skipped (idempotent)" with messageId
- **AND** Middleware does NOT call `next()` (skip insert)
- **AND** API increments `api_ingestion_requests_total{status="duplicate"}` counter

#### Scenario: Idempotency check handles database unavailable
- **WHEN** API receives message from Gateway
- **AND** Idempotency middleware queries TimescaleDB
- **AND** Database connection fails (network timeout, server down)
- **THEN** Middleware responds with 503 Service Unavailable
- **AND** Response body contains: `{"error":"Database unavailable, please retry"}`
- **AND** Middleware logs error with database connection details
- **AND** Gateway will retry request (exponential backoff)

---

### Requirement: Database Unique Constraint

The API SHALL enforce database-level unique constraint on (channel_id, message_id) to guarantee idempotency.

#### Scenario: Unique constraint prevents duplicate insert
- **WHEN** API attempts to insert signal with existing (channel_id, message_id)
- **AND** Application-level idempotency check failed (race condition)
- **THEN** TimescaleDB unique constraint violation occurs
- **AND** API catches error: `duplicate key value violates unique constraint "uk_signal_message"`
- **AND** API logs "Duplicate signal caught by database constraint"
- **AND** API responds with 200 OK (treat as successful idempotent operation)
- **AND** API increments `api_ingestion_requests_total{status="duplicate_db"}` counter

---

## MODIFIED Requirements

### Requirement: Signal Parsing and Validation (MODIFIED)

The API SHALL parse trading signals from message text and validate all fields before persistence.

**Changes**:
- ✅ **Added**: Parse `messageId` from payload (for idempotency)
- ✅ **Added**: Validate timestamp format (ISO 8601)
- ✅ **Modified**: Extract text from Gateway payload (was: extract from Telegram event)

#### Scenario: Parse valid BUY signal with all fields
- **WHEN** API receives message text:
  ```
  🟢 COMPRA PETR4
  Entrada: R$ 30,50
  Stop Loss: R$ 29,80
  Alvo 1: R$ 31,20
  Alvo 2: R$ 31,80
  ```
- **THEN** Parser extracts:
  - `asset = "PETR4"`
  - `signal_type = "BUY"`
  - `price = 30.50`
  - `stop_loss = 29.80`
  - `take_profit = [31.20, 31.80]`
- **AND** Validator confirms all fields are valid
- **AND** API proceeds to insert signal

#### Scenario: Parse SELL signal with emoji indicators
- **WHEN** API receives message text:
  ```
  🔴 VENDA VALE3 @ R$ 68,75
  Stop: R$ 69,50
  ```
- **THEN** Parser extracts:
  - `asset = "VALE3"`
  - `signal_type = "SELL"`
  - `price = 68.75`
  - `stop_loss = 69.50`
  - `take_profit = null`

#### Scenario: Handle unparseable message gracefully
- **WHEN** API receives message text that doesn't match any signal pattern
- **THEN** Parser returns `null` for all fields
- **AND** API logs "Unable to parse signal" with message text (truncated to 100 chars)
- **AND** API inserts raw message to database with `signal_type = "UNKNOWN"`
- **AND** API responds with 200 OK (accept all messages, parse best-effort)

---

### Requirement: TimescaleDB Persistence (MODIFIED)

The API SHALL persist parsed signals to TimescaleDB with retry logic on transient failures.

**Changes**:
- ✅ **Added**: Insert `message_id` field (for idempotency)
- ✅ **Added**: Retry logic for transient database errors (connection timeout, deadlock)

#### Scenario: Successful signal insert
- **WHEN** API persists parsed signal to TimescaleDB
- **THEN** API executes INSERT query:
  ```sql
  INSERT INTO tp_capital.tp_capital_signals
    (channel, channel_id, message_id, asset, signal_type, price,
     stop_loss, take_profit, raw_message, ingested_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING id
  ```
- **AND** Database responds with inserted row ID
- **AND** API logs "Signal inserted successfully" with ID and asset
- **AND** API increments `api_signals_inserted_total{signal_type="BUY"}` counter
- **AND** API responds to Gateway with 200 OK

#### Scenario: Retry on transient database error (connection timeout)
- **WHEN** API attempts to insert signal
- **AND** Database connection times out (network issue)
- **THEN** API catches error code `ECONNREFUSED` or `ETIMEDOUT`
- **AND** API logs "Database connection error, retrying..." with attempt number
- **AND** API waits 2 seconds
- **AND** API retries INSERT (up to 3 attempts total)
- **AND** If retry succeeds, API responds with 200 OK
- **AND** If all retries fail, API responds with 503 Service Unavailable

#### Scenario: Retry on database deadlock
- **WHEN** API attempts to insert signal
- **AND** Database returns deadlock error (`40P01`)
- **THEN** API logs "Database deadlock detected, retrying..."
- **AND** API waits 1 second
- **AND** API retries INSERT (up to 5 attempts)
- **AND** If retry succeeds, API responds with 200 OK

---

### Requirement: REST API Endpoints (MODIFIED)

The API SHALL expose REST endpoints for querying signals, channels, bots, and logs.

**Changes**:
- ✅ **Added**: `/ingest` endpoint (Gateway ingestion)
- ✅ **Modified**: All endpoints now support CORS from Dashboard origin
- ✅ **Modified**: Rate limiting applies to all endpoints except `/health`

#### Scenario: Query latest signals with filters
- **WHEN** Dashboard requests `GET /signals?limit=50&channel=-1001234567890&type=BUY`
- **THEN** API queries TimescaleDB:
  ```sql
  SELECT * FROM tp_capital.tp_capital_signals
  WHERE channel_id = -1001234567890
    AND signal_type = 'BUY'
  ORDER BY ingested_at DESC
  LIMIT 50
  ```
- **AND** API responds with 200 OK
- **AND** Response body contains array of signals with all fields

#### Scenario: Delete signal by ingested_at timestamp
- **WHEN** Dashboard POSTs to `DELETE /signals` with body: `{"ingestedAt":"2025-01-15T10:30:00.000Z"}`
- **THEN** API executes DELETE query:
  ```sql
  DELETE FROM tp_capital.tp_capital_signals
  WHERE ingested_at = '2025-01-15T10:30:00.000Z'
  ```
- **AND** API responds with 200 OK
- **AND** Response body contains: `{"status":"ok"}`

#### Scenario: CRUD operations on telegram_channels table
- **WHEN** Dashboard creates new channel: `POST /telegram/channels`
- **THEN** API validates required fields (label, channel_id)
- **AND** API inserts into `tp_capital.telegram_channels` table
- **AND** API responds with 201 Created
- **WHEN** Dashboard updates channel: `PUT /telegram/channels/:id`
- **THEN** API updates matching row
- **WHEN** Dashboard deletes channel: `DELETE /telegram/channels/:id`
- **THEN** API soft-deletes row (sets `status = 'deleted'`)

---

### Requirement: Prometheus Metrics Export (MODIFIED)

The API SHALL export Prometheus-compatible metrics including Gateway-specific metrics.

**Changes**:
- ✅ **Added**: `api_ingestion_requests_total` (Gateway ingestion)
- ✅ **Added**: `api_signals_inserted_total` (successful inserts)

#### Scenario: Ingestion metrics track Gateway requests
- **WHEN** Prometheus scrapes `GET /metrics`
- **THEN** Response includes ingestion metrics:
  ```
  # HELP api_ingestion_requests_total Total ingestion requests from Gateway
  # TYPE api_ingestion_requests_total counter
  api_ingestion_requests_total{status="success"} 1523
  api_ingestion_requests_total{status="duplicate"} 87
  api_ingestion_requests_total{status="auth_error"} 3
  api_ingestion_requests_total{status="validation_error"} 12
  ```

#### Scenario: Signal insert metrics track by signal type
- **WHEN** Prometheus scrapes `GET /metrics`
- **THEN** Response includes insert metrics:
  ```
  # HELP api_signals_inserted_total Total signals successfully inserted
  # TYPE api_signals_inserted_total counter
  api_signals_inserted_total{signal_type="BUY"} 823
  api_signals_inserted_total{signal_type="SELL"} 687
  api_signals_inserted_total{signal_type="UNKNOWN"} 45
  ```

---

### Requirement: Health Check Endpoint (MODIFIED)

The API SHALL expose health check endpoint validating database connectivity.

**Changes**:
- ✅ **Modified**: Health check now validates TimescaleDB only (no Telegram check)

#### Scenario: Health check returns healthy with database connected
- **WHEN** Monitoring tool requests `GET /health`
- **AND** API successfully connects to TimescaleDB
- **THEN** API responds with 200 OK
- **AND** Response body contains:
  ```json
  {
    "status": "ok",
    "timescale": true,
    "uptime_seconds": 12345
  }
  ```

#### Scenario: Health check returns unhealthy with database disconnected
- **WHEN** Monitoring tool requests `GET /health`
- **AND** API fails to connect to TimescaleDB (3 retry attempts)
- **THEN** API responds with 503 Service Unavailable
- **AND** Response body contains:
  ```json
  {
    "status": "error",
    "timescale": false,
    "error": "Database connection failed after 3 attempts"
  }
  ```

---

### Requirement: CORS Configuration (MODIFIED)

The API SHALL configure CORS headers to allow requests from Dashboard and Docusaurus.

**Changes**:
- ✅ **Modified**: CORS origins loaded from `CORS_ORIGIN` environment variable (was: hardcoded)

#### Scenario: Allow CORS preflight from Dashboard
- **WHEN** Browser sends OPTIONS request from `http://localhost:3103`
- **AND** `CORS_ORIGIN` environment variable includes `http://localhost:3103`
- **THEN** API responds with 204 No Content
- **AND** Response includes headers:
  ```
  Access-Control-Allow-Origin: http://localhost:3103
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, X-Gateway-Token
  Access-Control-Allow-Credentials: true
  ```

#### Scenario: Reject CORS request from unauthorized origin
- **WHEN** Browser sends request from `http://malicious-site.com`
- **AND** `CORS_ORIGIN` does NOT include `http://malicious-site.com`
- **THEN** API processes request but does NOT include `Access-Control-Allow-Origin` header
- **AND** Browser blocks response (CORS policy violation)

---

## REMOVED Requirements

### Requirement: Direct Telegram Integration (REMOVED)

**Reason**: Telegram integration moved to Telegram Gateway service.

**Before**: API had direct integration with Telegraf bot and TelegramClient for message reception.

**After**: API receives pre-processed messages from Gateway via `/ingest` endpoint.

**Migration**: All Telegram-related code (authentication, session management, bot setup) removed from API codebase.

---

### Requirement: Telegram Session Management (REMOVED)

**Reason**: Session files (.session) now managed exclusively by Telegram Gateway.

**Before**: API stored and loaded Telegram session files from disk.

**After**: API has zero knowledge of Telegram sessions.

**Migration**: Session files moved from `apps/tp-capital/.session` to `apps/tp-capital/telegram-gateway/.session`.

---

### Requirement: Telegram Connection State Monitoring (REMOVED)

**Reason**: Connection monitoring now handled by Gateway, exposed via Gateway `/health` endpoint.

**Before**: API exported `telegram_connection_status` Prometheus metric.

**After**: Metric removed from API. Use Gateway `/metrics` endpoint instead.

**Migration**: Update Prometheus scrape config to add Gateway target. Update Grafana dashboard to query Gateway metrics.

---

## Configuration Variables

### Required
- `PORT` - HTTP server port (default: 4005)
- `TIMESCALEDB_HOST` - TimescaleDB hostname (default: localhost)
- `TIMESCALEDB_PORT` - TimescaleDB port (default: 5433)
- `TIMESCALEDB_DATABASE` - Database name (default: APPS-TPCAPITAL)
- `TIMESCALEDB_USER` - Database username
- `TIMESCALEDB_PASSWORD` - Database password (sensitive)
- `GATEWAY_SECRET_TOKEN` - Shared secret for Gateway authentication (256-bit minimum)

### Optional
- `TIMESCALEDB_SCHEMA` - Schema name (default: tp_capital)
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated, default: http://localhost:3103,http://localhost:3004)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds (default: 60000)
- `RATE_LIMIT_MAX` - Max requests per window (default: 120)
- `LOG_LEVEL` - Logging level (default: info)
- `NODE_ENV` - Node environment (default: production)

---

## Dependencies

### Runtime
- **Node.js** 20.x LTS
- **express** ^4.18.2 (HTTP server)
- **pg** ^8.16.3 (PostgreSQL/TimescaleDB client)
- **prom-client** ^15.1.3 (Prometheus metrics)
- **pino** ^9.4.0 (Structured logging)
- **helmet** ^7.0.0 (Security headers)
- **cors** ^2.8.5 (CORS middleware)
- **express-rate-limit** ^7.5.1 (Rate limiting)
- **dotenv** ^16.3.1 (Environment variables)

### System
- **Docker** (containerized deployment)
- **TimescaleDB** 16+ (via container, accessible on port 5433)

---

## Security Considerations

### Gateway Authentication
- ✅ `GATEWAY_SECRET_TOKEN` MUST be minimum 32 characters (256 bits)
- ✅ Token MUST match between Gateway and API (validation on startup)
- ✅ Failed authentication attempts MUST be logged with IP address
- ✅ No rate limiting or IP blocking (rely on Gateway's controlled access)

### Database Credentials
- ✅ `TIMESCALEDB_PASSWORD` MUST NOT be committed to version control
- ✅ Credentials MUST be passed via Docker Compose environment variables
- ✅ Connection string MUST NOT be logged (sanitize logs)

### CORS Configuration
- ✅ `CORS_ORIGIN` MUST be explicitly configured (no wildcard `*` in production)
- ✅ Credentials flag MUST be true for authenticated requests
- ✅ Allowed headers MUST include `X-Gateway-Token` for Gateway requests

---

## Performance Requirements

### Resource Limits (Docker Container)
- Memory limit SHALL be 512MB (soft limit 256MB)
- CPU limit SHALL be 1.0 CPU (100% of single core)
- Disk I/O SHALL be minimal (logs to stdout, no file writes)

### Latency Requirements
- `/ingest` endpoint SHALL respond < 50ms (p95) for successful inserts
- `/health` endpoint SHALL respond < 100ms (p95)
- Query endpoints SHALL respond < 200ms (p95) for typical queries (limit=100)

### Throughput Requirements
- API SHALL handle 1000 ingestion requests/hour without degradation
- API SHALL maintain < 5 concurrent database connections under normal load
- API SHALL support up to 10 concurrent Dashboard query requests

---

## Failure Modes

### TimescaleDB Unavailable
- **Detection**: Connection timeout or query error
- **Recovery**: Retry INSERT 3 times with 2s delay
- **Fallback**: Respond with 503, Gateway will retry with exponential backoff
- **Monitoring**: `api_timescaledb_errors_total{error_type="connection"}`
- **Impact**: Temporary message delay, no data loss (Gateway queues)

### Database Deadlock
- **Detection**: Error code `40P01` from TimescaleDB
- **Recovery**: Retry INSERT 5 times with 1s delay (deadlocks auto-resolve)
- **Monitoring**: `api_timescaledb_errors_total{error_type="deadlock"}`
- **Impact**: Minimal latency increase, transparent to Gateway

### Duplicate Key Constraint Violation
- **Detection**: Error code `23505` from TimescaleDB
- **Recovery**: Treat as successful idempotent operation (return 200 OK)
- **Monitoring**: `api_ingestion_requests_total{status="duplicate_db"}`
- **Impact**: None (expected behavior for retried messages)

### Container OOM Kill
- **Detection**: Docker logs show OOM kill signal
- **Recovery**: Docker restart policy automatically restarts container
- **Monitoring**: `container_memory_usage_bytes` (Prometheus)
- **Impact**: 5-10 seconds downtime, Gateway queues messages during restart

---

## Database Schema

### Modified Table: `tp_capital.tp_capital_signals`

**Added Column**:
```sql
ALTER TABLE tp_capital.tp_capital_signals
ADD COLUMN message_id BIGINT;
```

**Added Constraint**:
```sql
ALTER TABLE tp_capital.tp_capital_signals
ADD CONSTRAINT uk_signal_message
UNIQUE (channel_id, message_id);
```

**Added Index**:
```sql
CREATE INDEX idx_tp_capital_signals_idempotency
ON tp_capital.tp_capital_signals (channel_id, message_id, ingested_at);
```

---

## Metrics Reference

### Counters
- `api_ingestion_requests_total` - Total Gateway ingestion requests
  - Labels: `status` (success, duplicate, duplicate_db, auth_error, validation_error, db_error)
- `api_signals_inserted_total` - Total signals successfully inserted
  - Labels: `signal_type` (BUY, SELL, UNKNOWN)
- `api_timescaledb_errors_total` - Total database errors
  - Labels: `error_type` (connection, query, deadlock, constraint)

### Histograms
- `api_http_request_duration_seconds` - HTTP request latency
  - Labels: `method` (GET, POST, PUT, DELETE), `route` (/signals, /ingest, /health), `status_code` (200, 400, 401, 500, 503)
  - Buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]

### Default Metrics
- `process_cpu_seconds_total`
- `process_resident_memory_bytes`
- `nodejs_eventloop_lag_seconds`

---

## Docker Configuration

### Dockerfile
- **Base Image**: `node:20-alpine` (minimal footprint)
- **Multi-stage Build**: Builder stage (npm install) + Runtime stage (copy files)
- **Non-root User**: Runs as user `nodejs` (UID 1001)
- **Health Check**: Built-in Docker health check via `/health` endpoint

### Docker Compose
- **Network**: Connects to `tradingsystem` network (shared with TimescaleDB)
- **Restart Policy**: `unless-stopped`
- **Health Check**: Interval 30s, timeout 10s, retries 3, start period 40s
- **Depends On**: `timescaledb` container must be healthy before starting

---

**Status**: Proposal
**Last Updated**: 2025-10-25
**Change ID**: split-tp-capital-into-gateway-api
