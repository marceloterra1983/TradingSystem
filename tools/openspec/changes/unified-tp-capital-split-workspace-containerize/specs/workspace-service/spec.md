---
capability-id: workspace-service
capability-type: MODIFIED
status: proposal
domain: backend
tags: [api, workspace, timescaledb, docker, migration]
---

# Specification: Workspace Service

## Overview

The **Workspace Service** is a containerized Node.js/Express API responsible for managing workspace items (documentation backlog, ideas, tasks) with persistent storage in TimescaleDB. This service previously used dual-strategy persistence (LowDB + TimescaleDB) but will be migrated to TimescaleDB-only for consistency and reliability.

**Key Characteristics**:
- Runs as Docker container (port 3200)
- Single data source: TimescaleDB (LowDB removed)
- REST API for CRUD operations on workspace items
- Supports data migration from existing LowDB JSON file
- Exports Prometheus metrics for monitoring
- Supports hot-reload development (nodemon + volume mounts)

---

## ADDED Requirements

### Requirement: REST API Endpoints for Workspace Items

The Service SHALL provide HTTP endpoints for managing workspace items with full CRUD operations.

#### Scenario: List all workspace items

- **WHEN** client requests `GET http://localhost:3200/api/items`
- **AND** TimescaleDB contains 3 workspace items
- **THEN** Service responds 200 OK with JSON array:
  ```json
  [
    {
      "id": "abc-123",
      "title": "Implement dark mode",
      "description": "Add theme toggle to dashboard",
      "category": "feature",
      "priority": "high",
      "status": "pending",
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-20T10:00:00.000Z"
    },
    ...
  ]
  ```

#### Scenario: Create new workspace item

- **WHEN** client POSTs to `POST http://localhost:3200/api/items`
- **AND** Request body contains:
  ```json
  {
    "title": "Fix navigation bug",
    "description": "Menu not closing on mobile",
    "category": "bug",
    "priority": "high"
  }
  ```
- **THEN** Service validates required fields (title, category, priority)
- **AND** Service generates UUID for `id`
- **AND** Service sets `status = "pending"` (default)
- **AND** Service sets `created_at` and `updated_at` to current timestamp
- **AND** Service executes INSERT into `workspace_items` table
- **AND** Service responds 201 Created with created item JSON

#### Scenario: Update existing workspace item

- **WHEN** client PUTs to `PUT http://localhost:3200/api/items/:id`
- **AND** Request body contains:
  ```json
  {
    "status": "completed",
    "description": "Updated description"
  }
  ```
- **THEN** Service validates item exists (SELECT WHERE id = :id)
- **AND** Service updates only provided fields
- **AND** Service sets `updated_at` to current timestamp
- **AND** Service executes UPDATE query
- **AND** Service responds 200 OK with updated item JSON

#### Scenario: Delete workspace item

- **WHEN** client requests `DELETE http://localhost:3200/api/items/:id`
- **AND** item with id exists in database
- **THEN** Service executes DELETE query
- **AND** Service responds 204 No Content

#### Scenario: Get single workspace item by ID

- **WHEN** client requests `GET http://localhost:3200/api/items/:id`
- **AND** item with id exists
- **THEN** Service responds 200 OK with item JSON
- **AND** if item not found, Service responds 404 Not Found

---

### Requirement: TimescaleDB-Only Persistence

The Service SHALL use TimescaleDB as the single source of truth for workspace items, removing LowDB dependency.

#### Scenario: Store item in TimescaleDB successfully

- **WHEN** Service receives POST request to create item
- **THEN** Service executes SQL INSERT:
  ```sql
  INSERT INTO workspace_items (
    id, title, description, category, priority, status, created_at, updated_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
  RETURNING *
  ```
- **AND** Service verifies rowCount > 0 (insert succeeded)
- **AND** Service logs "Item created successfully" at info level
- **AND** Service increments `workspace_items_created_total`

#### Scenario: Query items from TimescaleDB

- **WHEN** Service receives GET request to list items
- **THEN** Service executes SQL query:
  ```sql
  SELECT * FROM workspace_items
  ORDER BY created_at DESC
  ```
- **AND** Service transforms rows to JSON array
- **AND** Service responds with array
- **AND** if query fails, Service responds 503 Service Unavailable

#### Scenario: Handle unique constraint violation

- **WHEN** Service attempts INSERT with duplicate `id`
- **AND** Database returns unique constraint violation error
- **THEN** Service catches error
- **AND** Service responds 409 Conflict with:
  ```json
  {
    "error": "Item with this ID already exists"
  }
  ```

---

### Requirement: Data Migration from LowDB

The Service SHALL provide migration script to transfer existing workspace items from LowDB JSON file to TimescaleDB.

#### Scenario: Migrate existing items successfully

- **WHEN** Operator runs `node scripts/migrate-lowdb-to-timescale.js`
- **AND** `data/library.json` file exists with 50 items
- **THEN** Script reads JSON file and parses array
- **AND** Script connects to TimescaleDB
- **AND** Script begins transaction
- **AND** Script executes batch INSERT for all items:
  ```sql
  INSERT INTO workspace_items (
    id, title, description, category, priority, status, created_at, updated_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (id) DO NOTHING
  ```
- **AND** Script commits transaction
- **AND** Script validates COUNT(*) = 50 in database
- **AND** Script renames JSON file to `library.json.migrated-20251025`
- **AND** Script logs "Migration completed: 50 items"

#### Scenario: Skip migration if JSON file not found

- **WHEN** Operator runs migration script
- **AND** `data/library.json` file does not exist
- **THEN** Script logs "No LowDB file found, skipping migration" at info level
- **AND** Script exits with code 0 (success, no action needed)

#### Scenario: Rollback migration on error

- **WHEN** Migration script encounters database error during batch INSERT
- **THEN** Script executes ROLLBACK transaction
- **AND** Script logs error details at error level
- **AND** Script does NOT rename JSON file (preserves backup)
- **AND** Script exits with code 1 (failure)

---

### Requirement: Retry Logic for Database Connections

The Service SHALL retry database connection on startup and transient failures with exponential backoff.

#### Scenario: Retry connection on startup

- **WHEN** Service starts
- **AND** TimescaleDB is not yet available (connection refused)
- **THEN** Service waits 2 seconds
- **AND** Service retries connection (attempt 1 of 5)
- **AND** if still fails, waits 4 seconds (2^1 * 2s)
- **AND** Service retries (attempt 2 of 5)
- **AND** continues exponential backoff up to 32 seconds (2^4 * 2s)
- **AND** if all retries fail, Service logs fatal error and exits with code 1

#### Scenario: Successful connection after retry

- **WHEN** Service retries connection (attempt 2)
- **AND** TimescaleDB is now available
- **THEN** Service establishes connection
- **AND** Service executes test query `SELECT 1`
- **AND** Service logs "Database connected after 2 retries" at info level
- **AND** Service starts HTTP server

#### Scenario: Retry transient query failures

- **WHEN** Service executes SELECT query
- **AND** Database returns transient error (e.g., connection timeout)
- **THEN** Service waits 1 second
- **AND** Service retries query (up to 3 attempts)
- **AND** if successful, Service returns results
- **AND** if all retries fail, Service responds 503 Service Unavailable

---

### Requirement: Health Check Endpoint

The Service SHALL provide HTTP health check endpoint for Docker and monitoring integration.

#### Scenario: Health check when database connected

- **WHEN** client requests `GET http://localhost:3200/health`
- **AND** Service can execute `SELECT 1` query on TimescaleDB
- **THEN** Service responds 200 OK
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

- **WHEN** client requests `GET http://localhost:3200/health`
- **AND** Service cannot connect to TimescaleDB (connection timeout)
- **THEN** Service responds 503 Service Unavailable
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

The Service SHALL export Prometheus metrics for monitoring workspace operations and database health.

#### Scenario: Metrics endpoint exposes CRUD operation counters

- **WHEN** client requests `GET http://localhost:3200/metrics`
- **THEN** response includes:
  ```
  # HELP workspace_items_created_total Total items created
  # TYPE workspace_items_created_total counter
  workspace_items_created_total 25

  # HELP workspace_items_updated_total Total items updated
  # TYPE workspace_items_updated_total counter
  workspace_items_updated_total 10

  # HELP workspace_items_deleted_total Total items deleted
  # TYPE workspace_items_deleted_total counter
  workspace_items_deleted_total 5

  # HELP workspace_items_total Current total items in database
  # TYPE workspace_items_total gauge
  workspace_items_total 20
  ```

#### Scenario: Metrics endpoint exposes database health

- **WHEN** client requests `GET http://localhost:3200/metrics`
- **THEN** response includes:
  ```
  # HELP workspace_database_connection_status Database connection status (0=disconnected, 1=connected)
  # TYPE workspace_database_connection_status gauge
  workspace_database_connection_status 1
  ```

#### Scenario: Metrics endpoint exposes query latency histogram

- **WHEN** client requests `GET http://localhost:3200/metrics`
- **THEN** response includes:
  ```
  workspace_query_duration_seconds_bucket{operation="list",le="0.01"} 150
  workspace_query_duration_seconds_bucket{operation="list",le="0.05"} 200
  workspace_query_duration_seconds_bucket{operation="list",le="0.1"} 220
  workspace_query_duration_seconds_sum{operation="list"} 12.5
  workspace_query_duration_seconds_count{operation="list"} 220
  ```

---

### Requirement: Configuration via Environment Variables

The Service SHALL load all configuration from environment variables.

#### Scenario: Required variables present

- **WHEN** Service starts
- **AND** `.env` file contains all required variables:
  - `WORKSPACE_PORT`
  - `TIMESCALEDB_HOST`
  - `TIMESCALEDB_PORT`
  - `TIMESCALEDB_USER`
  - `TIMESCALEDB_PASSWORD`
  - `TIMESCALEDB_DATABASE`
- **THEN** Service loads configuration successfully
- **AND** Service starts HTTP server on `WORKSPACE_PORT`

#### Scenario: Required variable missing

- **WHEN** Service starts
- **AND** `TIMESCALEDB_DATABASE` is not set
- **THEN** Service logs "FATAL: TIMESCALEDB_DATABASE is required" at error level
- **AND** Service exits with code 1 (fail-fast validation)

#### Scenario: Optional variable with default

- **WHEN** Service starts
- **AND** `WORKSPACE_PORT` is not set
- **THEN** Service defaults to port 3200
- **AND** Service logs "Using default port 3200" at info level

---

### Requirement: Docker Integration with Hot-Reload

The Service SHALL support development-friendly Docker workflow with automatic code reloading.

#### Scenario: Source code change triggers reload

- **WHEN** Developer edits `src/server.js` file on host machine
- **AND** file is mounted as volume in container
- **THEN** nodemon detects file change within 2 seconds
- **AND** nodemon restarts Express server
- **AND** Service logs "Restarting due to changes..." at info level
- **AND** container remains running (no restart needed)

#### Scenario: Container starts with environment variables

- **WHEN** Docker Compose starts Workspace container
- **AND** compose file includes:
  ```yaml
  environment:
    - NODE_ENV=development
    - WORKSPACE_PORT=3200
  env_file:
    - .env.workspace
  ```
- **THEN** container loads variables from `.env.workspace` file
- **AND** container overrides `NODE_ENV` and `WORKSPACE_PORT` with inline values
- **AND** Service starts successfully on port 3200

#### Scenario: Health check succeeds during startup

- **WHEN** Docker Compose starts Workspace container
- **AND** compose file includes:
  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3200/health"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 40s
  ```
- **THEN** Docker waits 40 seconds (start_period for DB connection retries)
- **AND** Docker executes health check every 10 seconds
- **AND** if health check passes, container status becomes "healthy"

---

### Requirement: Error Handling and Logging

The Service SHALL handle errors gracefully and provide structured logging for debugging.

#### Scenario: Log successful item creation at info level

- **WHEN** Service successfully creates item in database
- **THEN** Service logs JSON:
  ```json
  {
    "level": "info",
    "message": "Item created successfully",
    "itemId": "abc-123",
    "title": "Implement dark mode",
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

#### Scenario: Log validation failure at warn level

- **WHEN** Service rejects POST request due to missing `title` field
- **THEN** Service logs JSON:
  ```json
  {
    "level": "warn",
    "message": "Validation failed",
    "error": "title is required",
    "requestBody": {...}
  }
  ```

#### Scenario: Log database error at error level

- **WHEN** Service fails to connect to TimescaleDB after 5 retries
- **THEN** Service logs JSON:
  ```json
  {
    "level": "error",
    "message": "Database connection failed after retries",
    "error": "ECONNREFUSED",
    "retries": 5,
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

#### Scenario: Graceful shutdown on SIGTERM

- **WHEN** Docker Compose sends SIGTERM to container (during `docker compose down`)
- **THEN** Service catches SIGTERM signal
- **AND** Service closes HTTP server (stops accepting new connections)
- **AND** Service closes database connection pool
- **AND** Service logs "Graceful shutdown completed" at info level
- **AND** process exits with code 0

---

### Requirement: Input Validation

The Service SHALL validate all input data before processing to prevent invalid state.

#### Scenario: Validate required fields on create

- **WHEN** Service receives POST request with missing `title` field
- **THEN** Service responds 400 Bad Request
- **AND** response body:
  ```json
  {
    "error": "Validation failed",
    "details": ["title is required"]
  }
  ```

#### Scenario: Validate enum values for category

- **WHEN** Service receives POST request with `category = "invalid"`
- **AND** valid categories are: ["feature", "bug", "task", "idea"]
- **THEN** Service responds 400 Bad Request
- **AND** response body includes: `"category must be one of: feature, bug, task, idea"`

#### Scenario: Validate priority values

- **WHEN** Service receives POST request with `priority = "urgent"`
- **AND** valid priorities are: ["low", "medium", "high"]
- **THEN** Service responds 400 Bad Request
- **AND** response body includes: `"priority must be one of: low, medium, high"`

#### Scenario: Sanitize text fields to prevent SQL injection

- **WHEN** Service receives POST request with `title` containing SQL syntax
- **THEN** Service uses parameterized query (PreparedStatement)
- **AND** SQL injection is prevented by PostgreSQL driver
- **AND** Item is stored safely with literal text

---

## Summary

This specification defines the Workspace Service as a containerized REST API responsible for:

1. **CRUD operations** for workspace items (documentation backlog management)
2. **Single data source** (TimescaleDB only, LowDB removed)
3. **Data migration** (LowDB JSON → TimescaleDB with idempotency)
4. **Resilient persistence** (retry logic for database connections)
5. **Observable operations** (Prometheus metrics + structured logs)
6. **Development-friendly workflow** (hot-reload support)
7. **Production-ready deployment** (health checks + graceful shutdown)

All scenarios are testable via tasks.md Phase 3 checklist.
