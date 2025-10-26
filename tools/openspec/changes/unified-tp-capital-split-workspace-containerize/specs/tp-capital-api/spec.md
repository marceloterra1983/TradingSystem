---
capability-id: tp-capital-api
capability-type: NEW
status: proposal
domain: backend
tags: [api, telegram, signals, timescaledb, docker]
---

# Specification: TP Capital API

## Overview

The **TP Capital API** is a containerized Node.js/Express service responsible for receiving trading signals from the Telegram Gateway, validating them, storing them in TimescaleDB, and providing REST endpoints for signal queries and health monitoring.

**Key Characteristics**:
- Runs as Docker container (port 4005)
- Receives messages from Gateway via HTTP POST
- Stores signals in TimescaleDB (shared with Workspace)
- Provides idempotency checks (no duplicate signals)
- Exports Prometheus metrics for monitoring
- Supports hot-reload development (nodemon + volume mounts)

---

## ADDED Requirements

### Requirement: Gateway Ingestion Endpoint

The API SHALL provide HTTP endpoint for receiving messages from the Telegram Gateway with authentication.

#### Scenario: Receive message from Gateway successfully

- **WHEN** Gateway POSTs message to `POST http://localhost:4005/ingest`
- **AND** Request includes header `X-Gateway-Token: ${API_SECRET_TOKEN}`
- **AND** Request body contains valid JSON:
  ```json
  {
    "channelId": "-1001234567890",
    "messageId": 12345,
    "text": "COMPRA PETR4 @ R$ 32.50",
    "timestamp": "2025-10-25T12:00:00.000Z",
    "photos": ["https://t.me/..."]
  }
  ```
- **THEN** API validates message structure
- **AND** API checks idempotency (not duplicate)
- **AND** API stores signal in TimescaleDB
- **AND** API responds 200 OK with:
  ```json
  {
    "success": true,
    "messageId": 12345,
    "stored": true
  }
  ```

#### Scenario: Reject message with invalid token

- **WHEN** Gateway POSTs message to `/ingest`
- **AND** Request header `X-Gateway-Token` is missing or invalid
- **THEN** API responds 401 Unauthorized
- **AND** response body:
  ```json
  {
    "error": "Invalid or missing authentication token"
  }
  ```
- **AND** API logs "Unauthorized ingestion attempt" at warn level

#### Scenario: Reject malformed message payload

- **WHEN** Gateway POSTs message to `/ingest`
- **AND** Request body is missing required field `channelId`
- **THEN** API responds 400 Bad Request
- **AND** response body:
  ```json
  {
    "error": "Validation failed",
    "details": ["channelId is required"]
  }
  ```

---

### Requirement: Idempotency Checks

The API SHALL prevent duplicate signal storage using composite key validation.

#### Scenario: Detect duplicate message

- **WHEN** API receives message with (channelId, messageId, timestamp)
- **AND** TimescaleDB already contains row with same composite key
- **THEN** API skips storage (idempotent operation)
- **AND** API responds 200 OK with:
  ```json
  {
    "success": true,
    "messageId": 12345,
    "stored": false,
    "reason": "duplicate"
  }
  ```
- **AND** API increments `tpcapital_duplicate_messages_total`

#### Scenario: Store new unique message

- **WHEN** API receives message with (channelId, messageId, timestamp)
- **AND** TimescaleDB does NOT contain row with same composite key
- **THEN** API executes INSERT with `ON CONFLICT DO NOTHING` clause
- **AND** API verifies row was inserted (check affected rows)
- **AND** API responds with `stored: true`
- **AND** API increments `tpcapital_messages_stored_total`

---

### Requirement: Signal Validation

The API SHALL validate message structure and content before storage.

#### Scenario: Validate required fields present

- **WHEN** API receives message payload
- **THEN** API validates presence of:
  - `channelId` (string, format: "-100XXXXXXXXXX")
  - `messageId` (integer, positive)
  - `text` (string, non-empty)
  - `timestamp` (ISO 8601 datetime string)
- **AND** if any field missing, API rejects with 400 Bad Request

#### Scenario: Validate timestamp format

- **WHEN** API validates `timestamp` field
- **AND** field value is "2025-13-01T25:00:00.000Z" (invalid date)
- **THEN** API rejects with 400 Bad Request
- **AND** response body includes: `"timestamp must be valid ISO 8601 datetime"`

#### Scenario: Validate channelId format

- **WHEN** API validates `channelId` field
- **AND** field value does not start with "-100" (Telegram channel format)
- **THEN** API logs warning "Unusual channelId format" at warn level
- **AND** API stores message anyway (permissive validation)

---

### Requirement: TimescaleDB Persistence

The API SHALL store validated signals in TimescaleDB `tp_capital_signals` table with retry logic.

#### Scenario: Store signal successfully

- **WHEN** API validates message and passes idempotency check
- **THEN** API executes SQL INSERT:
  ```sql
  INSERT INTO tp_capital_signals (
    channel_id, message_id, text, timestamp, photos, received_at
  )
  VALUES ($1, $2, $3, $4, $5, NOW())
  ON CONFLICT (channel_id, message_id, timestamp) DO NOTHING
  ```
- **AND** API verifies `rowCount > 0` (insert succeeded)
- **AND** API logs "Signal stored successfully" at info level

#### Scenario: Retry on transient database error

- **WHEN** API attempts INSERT
- **AND** TimescaleDB connection fails (ECONNREFUSED)
- **THEN** API waits 2 seconds
- **AND** API retries INSERT (attempt 1 of 3)
- **AND** if still fails, waits 4 seconds (2^1 * 2s)
- **AND** API retries (attempt 2 of 3)
- **AND** if still fails, waits 8 seconds (2^2 * 2s)
- **AND** API retries (attempt 3 of 3)
- **AND** if all retries fail, API responds 503 Service Unavailable

#### Scenario: Handle constraint violation gracefully

- **WHEN** API executes INSERT with duplicate composite key
- **AND** Database returns constraint violation error
- **THEN** API catches error (does not crash)
- **AND** API responds 200 OK with `stored: false, reason: "duplicate"`

---

### Requirement: Health Check Endpoint

The API SHALL provide HTTP health check endpoint for Docker and monitoring integration.

#### Scenario: Health check when database connected

- **WHEN** client requests `GET http://localhost:4005/health`
- **AND** API can execute `SELECT 1` query on TimescaleDB
- **THEN** API responds 200 OK
- **AND** response body:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "uptime": 12345.67,
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

#### Scenario: Health check when database disconnected

- **WHEN** client requests `GET http://localhost:4005/health`
- **AND** API cannot connect to TimescaleDB (connection timeout)
- **THEN** API responds 503 Service Unavailable
- **AND** response body:
  ```json
  {
    "status": "unhealthy",
    "database": "disconnected",
    "error": "Connection timeout to TimescaleDB",
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

---

### Requirement: Prometheus Metrics Export

The API SHALL export Prometheus metrics for monitoring signal ingestion and database operations.

#### Scenario: Metrics endpoint exposes ingestion counters

- **WHEN** client requests `GET http://localhost:4005/metrics`
- **THEN** response includes:
  ```
  # HELP tpcapital_messages_received_total Total messages received from Gateway
  # TYPE tpcapital_messages_received_total counter
  tpcapital_messages_received_total 150

  # HELP tpcapital_messages_stored_total Total messages stored in database
  # TYPE tpcapital_messages_stored_total counter
  tpcapital_messages_stored_total 148

  # HELP tpcapital_duplicate_messages_total Total duplicate messages skipped
  # TYPE tpcapital_duplicate_messages_total counter
  tpcapital_duplicate_messages_total 2
  ```

#### Scenario: Metrics endpoint exposes database health gauge

- **WHEN** client requests `GET http://localhost:4005/metrics`
- **THEN** response includes:
  ```
  # HELP tpcapital_database_connection_status Database connection status (0=disconnected, 1=connected)
  # TYPE tpcapital_database_connection_status gauge
  tpcapital_database_connection_status 1
  ```

#### Scenario: Metrics endpoint exposes validation failure counter

- **WHEN** client requests `GET http://localhost:4005/metrics`
- **THEN** response includes:
  ```
  tpcapital_validation_failures_total{reason="missing_field"} 5
  tpcapital_validation_failures_total{reason="invalid_timestamp"} 2
  tpcapital_authentication_failures_total 3
  ```

---

### Requirement: Configuration via Environment Variables

The API SHALL load all configuration from environment variables.

#### Scenario: Required variables present

- **WHEN** API starts
- **AND** `.env` file contains all required variables:
  - `API_PORT`
  - `API_SECRET_TOKEN`
  - `TIMESCALEDB_HOST`
  - `TIMESCALEDB_PORT`
  - `TIMESCALEDB_USER`
  - `TIMESCALEDB_PASSWORD`
  - `TIMESCALEDB_DATABASE`
- **THEN** API loads configuration successfully
- **AND** API logs first 8 chars of `API_SECRET_TOKEN` for verification
- **AND** API starts HTTP server on `API_PORT`

#### Scenario: Required variable missing

- **WHEN** API starts
- **AND** `API_SECRET_TOKEN` is not set
- **THEN** API logs "FATAL: API_SECRET_TOKEN is required" at error level
- **AND** API exits with code 1 (fail-fast validation)

#### Scenario: Optional variable with default

- **WHEN** API starts
- **AND** `API_PORT` is not set
- **THEN** API defaults to port 4005
- **AND** API logs "Using default port 4005" at info level

---

### Requirement: Docker Integration with Hot-Reload

The API SHALL support development-friendly Docker workflow with automatic code reloading.

#### Scenario: Source code change triggers reload

- **WHEN** Developer edits `src/server.js` file on host machine
- **AND** file is mounted as volume in container
- **THEN** nodemon detects file change within 2 seconds
- **AND** nodemon restarts Express server
- **AND** API logs "Restarting due to changes..." at info level
- **AND** container remains running (no restart needed)

#### Scenario: Container starts with environment variables

- **WHEN** Docker Compose starts API container
- **AND** compose file includes:
  ```yaml
  environment:
    - NODE_ENV=development
    - API_PORT=4005
  env_file:
    - .env.api
  ```
- **THEN** container loads variables from `.env.api` file
- **AND** container overrides `NODE_ENV` and `API_PORT` with inline values
- **AND** API starts successfully on port 4005

#### Scenario: Health check succeeds during startup

- **WHEN** Docker Compose starts API container
- **AND** compose file includes:
  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:4005/health"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 30s
  ```
- **THEN** Docker waits 30 seconds (start_period)
- **AND** Docker executes health check every 10 seconds
- **AND** if health check passes, container status becomes "healthy"
- **AND** dependent services can start

---

### Requirement: Error Handling and Logging

The API SHALL handle errors gracefully and provide structured logging for debugging.

#### Scenario: Log successful ingestion at info level

- **WHEN** API successfully stores message in database
- **THEN** API logs JSON:
  ```json
  {
    "level": "info",
    "message": "Signal stored successfully",
    "channelId": "-1001234567890",
    "messageId": 12345,
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

#### Scenario: Log validation failure at warn level

- **WHEN** API rejects message due to missing `channelId`
- **THEN** API logs JSON:
  ```json
  {
    "level": "warn",
    "message": "Validation failed",
    "error": "channelId is required",
    "requestBody": {...}
  }
  ```

#### Scenario: Log database error at error level

- **WHEN** API fails to connect to TimescaleDB after 3 retries
- **THEN** API logs JSON:
  ```json
  {
    "level": "error",
    "message": "Database connection failed after retries",
    "error": "ECONNREFUSED",
    "retries": 3,
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

#### Scenario: Graceful shutdown on SIGTERM

- **WHEN** Docker Compose sends SIGTERM to container (during `docker compose down`)
- **THEN** API catches SIGTERM signal
- **AND** API closes HTTP server (stops accepting new connections)
- **AND** API closes database connection pool
- **AND** API logs "Graceful shutdown completed" at info level
- **AND** process exits with code 0

---

## Summary

This specification defines the TP Capital API as a containerized REST service responsible for:

1. **Secure ingestion** (shared secret token authentication)
2. **Idempotent storage** (composite key constraint)
3. **Resilient persistence** (retry logic for TimescaleDB)
4. **Observable operations** (Prometheus metrics + structured logs)
5. **Development-friendly workflow** (hot-reload support)
6. **Production-ready deployment** (health checks + graceful shutdown)

All scenarios are testable via tasks.md Phase 2 checklist.
