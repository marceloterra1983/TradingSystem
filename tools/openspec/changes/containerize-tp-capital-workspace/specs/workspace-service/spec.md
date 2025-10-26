# Specification: Workspace Service (Containerized)

## ADDED Requirements

### Requirement: Containerized Workspace Service

The Workspace service SHALL run as a Docker container using only TimescaleDB for persistence, with hot-reload support for development.

#### Scenario: Container startup with TimescaleDB available

- **GIVEN** TimescaleDB container is running and healthy
- **AND** database `APPS-WORKSPACE` exists with schema `workspace`
- **AND** table `workspace.workspace_items` is initialized
- **WHEN** Workspace container starts via `docker compose up -d workspace`
- **THEN** service connects to TimescaleDB within 10 seconds
- **AND** health endpoint `http://localhost:3200/health` returns 200 OK
- **AND** API endpoint `http://localhost:3200/api/items` returns existing items (if any)
- **AND** container logs show "TimescaleDB connected successfully"

#### Scenario: Container startup with empty database

- **GIVEN** TimescaleDB is running
- **AND** database `APPS-WORKSPACE` exists but table `workspace.workspace_items` does NOT exist
- **WHEN** Workspace container starts
- **THEN** service runs migration to create table `workspace.workspace_items`
- **AND** table has columns: id (UUID), title (TEXT), content (TEXT), category (VARCHAR), priority (VARCHAR), status (VARCHAR), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ)
- **AND** primary key is on `id` column
- **AND** health endpoint returns 200 OK after migration completes

#### Scenario: Container startup with TimescaleDB unavailable

- **GIVEN** TimescaleDB is not running or unreachable
- **WHEN** Workspace container starts
- **THEN** service attempts connection retry 5 times with 2 second delay between attempts
- **AND** container logs show "TimescaleDB connection retry X/5" for each attempt
- **AND** if all retries fail, container logs "TimescaleDB unavailable after max retries" and exits with code 1
- **AND** health endpoint returns 503 Service Unavailable

#### Scenario: Hot-reload during development

- **GIVEN** Workspace container is running with volumes mounted
- **AND** developer has source code mounted at `/app/src`
- **WHEN** developer edits source file `backend/api/workspace/src/routes/items.js`
- **THEN** nodemon detects file change within 2 seconds
- **AND** service restarts automatically without manual intervention
- **AND** new route logic is reflected in subsequent HTTP requests
- **AND** container logs show "Restarting due to changes..."

---

### Requirement: LowDB Removal (Breaking Change)

The Workspace service SHALL use **only** TimescaleDB for persistence, removing all LowDB dual-strategy code.

#### Scenario: LowDB strategy no longer supported

- **GIVEN** environment variable `LIBRARY_DB_STRATEGY=lowdb` is set in `.env`
- **WHEN** Workspace container starts
- **THEN** service logs warning "LowDB no longer supported - using TimescaleDB"
- **AND** service ignores `LIBRARY_DB_STRATEGY` variable and uses TimescaleDB regardless
- **AND** service does NOT attempt to load or write to `library.json` file
- **AND** all CRUD operations use TimescaleDB exclusively

#### Scenario: Code imports LowDB removed

- **GIVEN** Workspace source code in `src/db/index.js`
- **WHEN** developer inspects codebase
- **THEN** no imports of `lowdb` package exist
- **AND** function `getLowDbClient()` does NOT exist
- **AND** function `getDbClient()` returns only TimescaleDB client
- **AND** no conditional logic based on `config.dbStrategy` exists

#### Scenario: LowDB data file ignored

- **GIVEN** file `backend/data/workspace/library.json` exists with workspace items
- **WHEN** Workspace container starts
- **THEN** service does NOT read from `library.json`
- **AND** API returns items from TimescaleDB only
- **AND** `library.json` file is NOT deleted (preserved for manual migration)

---

### Requirement: Data Migration from LowDB

The Workspace deployment SHALL provide migration script to transfer data from LowDB JSON file to TimescaleDB.

#### Scenario: Migration script detects existing LowDB data

- **GIVEN** file `backend/data/workspace/library.json` exists
- **AND** file contains JSON object with `items` array of 10 workspace items
- **WHEN** administrator runs `node scripts/database/migrate-lowdb-to-timescale.js`
- **THEN** script parses JSON file successfully
- **AND** script logs "Found 10 items to migrate"
- **AND** script begins migration process

#### Scenario: Migration script transfers items to TimescaleDB

- **GIVEN** LowDB JSON file contains items with fields: id, title, content, category, priority, status, createdAt, updatedAt
- **WHEN** migration script executes
- **THEN** for each item, script executes INSERT query with ON CONFLICT (id) DO NOTHING
- **AND** items are inserted into `workspace.workspace_items` table
- **AND** all fields are mapped correctly (createdAt → created_at, updatedAt → updated_at)
- **AND** migration is idempotent (can be run multiple times without duplicates)

#### Scenario: Migration validation

- **GIVEN** LowDB JSON file contained 10 items
- **WHEN** migration script completes
- **THEN** script executes `SELECT COUNT(*) FROM workspace.workspace_items`
- **AND** count equals 10 (or more if items already existed)
- **AND** script logs "Migration complete: 10 items in TimescaleDB"
- **AND** original JSON file is moved to `library.json.migrated-YYYYMMDD` (not deleted)
- **AND** backup file `library.json.backup-YYYYMMDD` exists

#### Scenario: Migration failure handling

- **GIVEN** TimescaleDB is unreachable during migration
- **WHEN** migration script attempts to connect
- **THEN** script fails with clear error "TimescaleDB connection failed: [error details]"
- **AND** script exits with code 1
- **AND** original JSON file is NOT moved or deleted
- **AND** administrator can retry after fixing database connectivity

---

### Requirement: REST API Functionality

The containerized Workspace SHALL maintain full REST API functionality for workspace items without regression.

#### Scenario: GET all items

- **GIVEN** Workspace container is running
- **AND** TimescaleDB contains 5 workspace items
- **WHEN** client requests `GET http://localhost:3200/api/items`
- **THEN** response is 200 OK
- **AND** response body is JSON array containing 5 items
- **AND** each item has fields: id, title, content, category, priority, status, createdAt, updatedAt
- **AND** response time is < 100ms

#### Scenario: POST create new item

- **GIVEN** Workspace container is running
- **WHEN** client requests `POST http://localhost:3200/api/items` with JSON body:
  ```json
  {
    "title": "Implement feature X",
    "content": "Description of feature X",
    "category": "feature",
    "priority": "high",
    "status": "todo"
  }
  ```
- **THEN** response is 201 Created
- **AND** response body contains created item with generated UUID `id`
- **AND** item is persisted in TimescaleDB `workspace.workspace_items` table
- **AND** `created_at` and `updated_at` timestamps are set to current time

#### Scenario: PUT update existing item

- **GIVEN** Workspace contains item with id `123e4567-e89b-12d3-a456-426614174000`
- **WHEN** client requests `PUT http://localhost:3200/api/items/123e4567-e89b-12d3-a456-426614174000` with JSON body:
  ```json
  {
    "title": "Updated title",
    "status": "in_progress"
  }
  ```
- **THEN** response is 200 OK
- **AND** item in TimescaleDB is updated with new title and status
- **AND** `updated_at` timestamp is updated to current time
- **AND** other fields (content, category, priority) remain unchanged

#### Scenario: DELETE item

- **GIVEN** Workspace contains item with id `123e4567-e89b-12d3-a456-426614174000`
- **WHEN** client requests `DELETE http://localhost:3200/api/items/123e4567-e89b-12d3-a456-426614174000`
- **THEN** response is 204 No Content
- **AND** item is deleted from TimescaleDB
- **AND** subsequent GET request for same item returns 404 Not Found

---

### Requirement: Volume-Based Hot-Reload

The containerized Workspace SHALL support instant code changes via volume mounts without requiring image rebuild.

#### Scenario: Source code volume mounted

- **GIVEN** Docker Compose configuration includes volume mount `../../backend/api/workspace/src:/app/src:ro`
- **WHEN** container is started
- **THEN** host directory `backend/api/workspace/src` is mounted inside container at `/app/src`
- **AND** files are readable inside container
- **AND** changes to host files are immediately visible inside container
- **AND** `node_modules` directory is NOT overwritten by host mount (uses anonymous volume)

#### Scenario: Nodemon detects file change

- **GIVEN** Workspace container is running with `npm run dev` command
- **AND** nodemon is configured to watch `/app/src/**/*.js`
- **WHEN** developer saves changes to `backend/api/workspace/src/routes/items.js`
- **THEN** nodemon detects change within 1 second
- **AND** nodemon restarts Node.js process
- **AND** new route logic is loaded
- **AND** reload completes within 2 seconds total (detection + restart)

#### Scenario: Multiple file changes batched

- **GIVEN** Workspace container is running
- **WHEN** developer saves changes to 3 files within 500ms (items.js, config.js, db.js)
- **THEN** nodemon detects changes and waits 1 second for batch
- **AND** nodemon restarts process once (not 3 times)
- **AND** container logs show "Restarting due to changes..." once

---

### Requirement: Logging and Observability

The containerized Workspace SHALL provide structured logging and metrics for monitoring and debugging.

#### Scenario: Structured JSON logs

- **GIVEN** Workspace container is running
- **WHEN** service logs messages via Pino logger
- **THEN** logs are output in JSON format to stdout
- **AND** each log entry includes fields: level, time, pid, hostname, msg
- **AND** logs are captured by Docker logging driver (json-file)
- **AND** logs are accessible via `docker compose logs -f workspace`

#### Scenario: HTTP request logging

- **GIVEN** Workspace container is running
- **WHEN** client requests `GET http://localhost:3200/api/items`
- **THEN** service logs request with fields: method, url, statusCode, responseTime
- **AND** log level is "info" for 2xx responses
- **AND** log level is "warn" for 4xx responses
- **AND** log level is "error" for 5xx responses

#### Scenario: Prometheus metrics exposed

- **GIVEN** Workspace container is running
- **WHEN** client requests `http://localhost:3200/metrics`
- **THEN** response contains Prometheus-formatted metrics
- **AND** metrics include `tradingsystem_http_requests_total` (counter with labels: method, route, status)
- **AND** metrics include `tradingsystem_http_request_duration_seconds` (histogram)
- **AND** metrics include `process_cpu_seconds_total` (default Node.js metrics)

---

### Requirement: Dependency Management

The containerized Workspace SHALL correctly manage TimescaleDB dependency during startup and runtime.

#### Scenario: Docker Compose depends_on configuration

- **GIVEN** Docker Compose file includes `depends_on: timescaledb: condition: service_healthy`
- **WHEN** developer runs `docker compose up -d workspace`
- **THEN** Docker Compose waits for TimescaleDB container to be healthy before starting Workspace
- **AND** if TimescaleDB health check fails, Workspace container does not start
- **AND** Docker Compose logs show "Waiting for timescaledb to be healthy..."

#### Scenario: Application-level connection retry

- **GIVEN** TimescaleDB is starting and not yet accepting connections
- **AND** Workspace container has already started (past depends_on check)
- **WHEN** service attempts initial database connection
- **THEN** connection fails with "connection refused" error
- **AND** service retries connection after 2 second delay
- **AND** service logs "TimescaleDB connection retry 1/5"
- **AND** when TimescaleDB becomes available, subsequent retry succeeds
- **AND** service continues normal operation

#### Scenario: Database connection pool exhaustion

- **GIVEN** Workspace is running with connection pool max=20
- **WHEN** 20 concurrent requests are made to API
- **AND** all connections are in use
- **AND** 21st request arrives
- **THEN** request waits for connection to become available (up to 2s timeout)
- **AND** if connection becomes available, request proceeds normally
- **AND** if timeout expires, request fails with 503 Service Unavailable
- **AND** response body contains `{"error": "Database connection pool exhausted"}`

---

### Requirement: Configuration via Environment Variables

The containerized Workspace SHALL load all configuration from environment variables provided by Docker Compose.

#### Scenario: Environment variables loaded from .env file

- **GIVEN** Docker Compose configuration includes `env_file: ../../.env`
- **AND** `.env` file contains `WORKSPACE_PORT=3200`
- **AND** `.env` file contains `TIMESCALEDB_HOST=timescaledb`
- **WHEN** Workspace container starts
- **THEN** environment variables are available inside container
- **AND** service reads port from `process.env.WORKSPACE_PORT`
- **AND** service reads database host from `process.env.TIMESCALEDB_HOST`

#### Scenario: Environment variables override defaults

- **GIVEN** service code defines default `PORT=3200`
- **AND** `.env` file contains `WORKSPACE_PORT=3300`
- **WHEN** Workspace container starts
- **THEN** service uses port 3300 instead of default 3200
- **AND** health endpoint is accessible at `http://localhost:3300/health`

#### Scenario: Database schema configuration

- **GIVEN** `.env` file contains `WORKSPACE_DATABASE_SCHEMA=workspace_dev`
- **WHEN** Workspace container starts
- **THEN** service queries `workspace_dev.workspace_items` table instead of `workspace.workspace_items`
- **AND** migrations run in `workspace_dev` schema

---

### Requirement: Network Isolation

The containerized Workspace SHALL communicate with TimescaleDB via dedicated Docker network.

#### Scenario: Container joins tradingsystem_backend network

- **GIVEN** Docker Compose configuration includes `networks: tradingsystem_backend: external: true`
- **AND** network `tradingsystem_backend` exists (created by database stack)
- **WHEN** Workspace container starts
- **THEN** container is attached to `tradingsystem_backend` network
- **AND** container can resolve `timescaledb` hostname via Docker DNS
- **AND** container can connect to TimescaleDB via `postgres://timescaledb:5432`

#### Scenario: Container accessible from host

- **GIVEN** Docker Compose configuration includes `ports: "3200:3200"`
- **WHEN** Workspace container is running
- **THEN** service is accessible from host machine via `http://localhost:3200`
- **AND** Dashboard running on host can make API calls to Workspace
- **AND** CORS is configured to allow requests from Dashboard origin

---

### Requirement: Health Check Integration

The containerized Workspace SHALL provide health check endpoint compatible with Docker healthcheck and Service Launcher API.

#### Scenario: Health endpoint indicates healthy state

- **GIVEN** Workspace container is running
- **AND** service is connected to TimescaleDB
- **WHEN** client requests `GET http://localhost:3200/health`
- **THEN** response is 200 OK
- **AND** response body is JSON:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "uptime": 123.45,
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

#### Scenario: Health endpoint indicates unhealthy state

- **GIVEN** Workspace container is running
- **AND** TimescaleDB connection is lost
- **WHEN** client requests `GET http://localhost:3200/health`
- **THEN** response is 503 Service Unavailable
- **AND** response body is JSON:
  ```json
  {
    "status": "unhealthy",
    "database": "disconnected",
    "error": "Connection to TimescaleDB lost",
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

#### Scenario: Docker healthcheck uses health endpoint

- **GIVEN** Docker Compose healthcheck configured with `test: ["CMD", "wget", "-q", "-O-", "http://localhost:3200/health"]`
- **WHEN** Docker executes healthcheck command
- **THEN** if health endpoint returns 200, healthcheck passes (exit code 0)
- **AND** if health endpoint returns 503, healthcheck fails (exit code 1)
- **AND** if service is not responding, healthcheck fails (timeout)
- **AND** after 3 consecutive failures, container status shows "unhealthy"

---

### Requirement: Testing Compatibility

The containerized Workspace SHALL support automated testing with TimescaleDB test database.

#### Scenario: Tests run with TimescaleDB

- **GIVEN** test suite in `backend/api/workspace/tests/`
- **AND** test environment variable `NODE_ENV=test`
- **WHEN** developer runs `npm test`
- **THEN** tests connect to TimescaleDB test database (separate from dev database)
- **AND** tests run migrations to create test schema
- **AND** tests insert/update/delete data in test database
- **AND** tests clean up data after each test (teardown)
- **AND** all tests pass successfully

#### Scenario: Tests no longer use LowDB

- **GIVEN** test suite previously used LowDB for in-memory testing
- **WHEN** developer inspects test files
- **THEN** no references to LowDB or `DB_PATH=./tests/tmp/ideas.test.json` exist
- **AND** all tests use TimescaleDB client
- **AND** tests use Testcontainers or Docker Compose for test database

---

## Summary

This specification defines the requirements for the containerized Workspace service, ensuring:

1. **TimescaleDB-only persistence** (LowDB removed, migration provided)
2. **Resilient startup** with retry logic and health checks
3. **Development-friendly** hot-reload via volume mounts
4. **Production-ready** logging, metrics, and observability
5. **Reliable** dependency management with Docker Compose
6. **Backward-compatible** REST API (no breaking changes to API contract)
7. **Testable** with automated test suite

All scenarios are testable and verifiable during implementation (tasks.md).
