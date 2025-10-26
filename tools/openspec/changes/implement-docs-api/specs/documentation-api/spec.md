# Documentation API Specification (Delta)

## ADDED Requirements

### Requirement: Centralized Logging

The DocsAPI SHALL provide a centralized logging utility that all modules can import to ensure consistent log format, timezone, and level configuration across the entire service.

#### Scenario: Logger module exists and is importable

- **GIVEN** a service module needs to log messages
- **WHEN** the module imports the logger from `src/utils/logger.js`
- **THEN** the import SHALL succeed without errors
- **AND** the logger SHALL be a Pino instance with configured transport

#### Scenario: Logger timezone is São Paulo

- **GIVEN** the logger is configured
- **WHEN** a log message is written
- **THEN** the timestamp SHALL be formatted in São Paulo timezone (UTC-3)
- **AND** the format SHALL be `HH:MM:ss` (e.g., "14:23:45")

#### Scenario: Log level respects environment variable

- **GIVEN** LOG_LEVEL environment variable is set to "debug"
- **WHEN** a debug message is logged
- **THEN** the message SHALL be visible in output
- **AND** when LOG_LEVEL is "error", debug messages SHALL be suppressed

---

### Requirement: Global Error Handling

The DocsAPI SHALL implement global error handling middleware to ensure all errors are caught, logged, and returned to clients in a consistent JSON format without exposing sensitive information in production.

#### Scenario: Unhandled route error is caught

- **GIVEN** a route throws an unexpected error
- **WHEN** the error propagates to the global error handler
- **THEN** the handler SHALL log the error with full context
- **AND** SHALL return HTTP 500 with JSON error response
- **AND** SHALL NOT expose stack trace in production mode

#### Scenario: Validation error returns 400

- **GIVEN** a request has invalid query parameters
- **WHEN** validation fails
- **THEN** the error handler SHALL return HTTP 400
- **AND** SHALL include validation details in JSON response
- **AND** SHALL log the validation error

#### Scenario: Not found routes return 404

- **GIVEN** a client requests a non-existent route
- **WHEN** the request reaches the 404 handler
- **THEN** SHALL return HTTP 404 with JSON error
- **AND** SHALL include requested route in error message

---

### Requirement: Container Health Check

The DocsAPI SHALL provide a health check endpoint that reports service status, indexing readiness, and can be used by Docker health checks to determine container health.

#### Scenario: Health endpoint returns 200 when healthy

- **GIVEN** the DocsAPI container is running
- **WHEN** a health check request is made to `/health`
- **THEN** SHALL return HTTP 200 OK
- **AND** SHALL return JSON with status "ok"
- **AND** SHALL include timestamp in ISO 8601 format
- **AND** SHALL include service name "documentation-api"

#### Scenario: Health endpoint reports indexing status

- **GIVEN** FlexSearch is still indexing documentation
- **WHEN** a health check request is made
- **THEN** SHALL return HTTP 200 OK
- **AND** SHALL include `search.ready: false` in response
- **AND** SHALL include `search.indexed_files` count

#### Scenario: Readiness endpoint blocks until index ready

- **GIVEN** a `/ready` endpoint exists for Kubernetes-style readiness
- **WHEN** FlexSearch index is not yet ready
- **THEN** SHALL return HTTP 503 Service Unavailable
- **AND** when index is ready, SHALL return HTTP 200 OK

---

### Requirement: Documentation Full-Text Search

The DocsAPI SHALL provide full-text search across all markdown documentation files using FlexSearch, with support for query parameters, faceting, and relevance ranking.

#### Scenario: Search returns matching documents

- **GIVEN** documentation is indexed in FlexSearch
- **WHEN** a client sends GET `/api/v1/docs/search?q=authentication`
- **THEN** SHALL return HTTP 200 OK
- **AND** SHALL return JSON with `results` array
- **AND** SHALL include `total` count of matches
- **AND** SHALL include `took_ms` for query execution time

#### Scenario: Search filters by domain facet

- **GIVEN** documentation files have `domain` frontmatter field
- **WHEN** a client sends GET `/api/v1/docs/search?q=api&domain=backend`
- **THEN** SHALL return only documents with `domain: backend`
- **AND** SHALL NOT return documents from other domains

#### Scenario: Search returns empty array for no matches

- **GIVEN** documentation is indexed
- **WHEN** a client searches for a non-existent term
- **THEN** SHALL return HTTP 200 OK
- **AND** SHALL return empty `results` array
- **AND** SHALL return `total: 0`

#### Scenario: Search query is sanitized

- **GIVEN** a client sends a search with HTML/script tags
- **WHEN** the query is processed
- **THEN** SHALL sanitize the query to prevent XSS
- **AND** SHALL NOT execute any code from query string

---

### Requirement: Search Facets

The DocsAPI SHALL provide a facets endpoint that returns all available filter values (domains, types, tags, status) from indexed documentation to enable faceted navigation in the Dashboard.

#### Scenario: Facets endpoint returns all categories

- **GIVEN** documentation is indexed with various frontmatter fields
- **WHEN** a client requests GET `/api/v1/docs/facets`
- **THEN** SHALL return HTTP 200 OK
- **AND** SHALL return JSON with `domains`, `types`, `tags`, `statuses` arrays
- **AND** each facet SHALL include count of documents

#### Scenario: Facets reflect current index

- **GIVEN** documentation is reindexed with new files
- **WHEN** facets are requested
- **THEN** SHALL return updated facet counts
- **AND** SHALL include new values if added

---

### Requirement: API Specification Validation

The DocsAPI SHALL validate OpenAPI and AsyncAPI specification files to ensure they conform to their respective standards and report validation errors.

#### Scenario: Valid OpenAPI spec returns success

- **GIVEN** a valid OpenAPI 3.0 YAML file exists
- **WHEN** the spec is validated via `/api/v1/docs` endpoint
- **THEN** SHALL return HTTP 200 OK
- **AND** SHALL include validation status "valid"

#### Scenario: Invalid spec returns validation errors

- **GIVEN** an OpenAPI spec with schema errors
- **WHEN** the spec is validated
- **THEN** SHALL return HTTP 400 Bad Request
- **AND** SHALL include array of validation errors
- **AND** each error SHALL include location and message

---

### Requirement: Prometheus Metrics

The DocsAPI SHALL export Prometheus-compatible metrics including HTTP request counts, durations, search performance, and custom application metrics.

#### Scenario: Metrics endpoint returns Prometheus format

- **GIVEN** the DocsAPI is running
- **WHEN** a client requests GET `/metrics`
- **THEN** SHALL return HTTP 200 OK
- **AND** SHALL return Content-Type `text/plain; version=0.0.4`
- **AND** SHALL include standard Node.js metrics (memory, CPU, GC)
- **AND** SHALL include custom metrics (search_requests_total, etc.)

#### Scenario: Search metrics are tracked

- **GIVEN** multiple search requests are made
- **WHEN** metrics endpoint is queried
- **THEN** SHALL include `search_requests_total` counter
- **AND** SHALL include `search_duration_seconds` histogram
- **AND** metrics SHALL be labeled by status code

---

### Requirement: Background Indexing

The DocsAPI SHALL index markdown documentation in the background on startup to avoid blocking container health checks, and SHALL provide status visibility via health endpoints.

#### Scenario: Container starts before indexing completes

- **GIVEN** the DocsAPI container is starting
- **WHEN** FlexSearch begins indexing 1000+ files
- **THEN** the HTTP server SHALL start immediately (not wait for indexing)
- **AND** `/health` endpoint SHALL be available
- **AND** `/health` SHALL report `search.ready: false` until indexing completes

#### Scenario: Indexing completes and updates status

- **GIVEN** background indexing is in progress
- **WHEN** indexing finishes successfully
- **THEN** SHALL log "Documentation indexed" with file count
- **AND** `/health` SHALL report `search.ready: true`
- **AND** `/ready` endpoint SHALL return 200 OK

#### Scenario: Indexing failure is logged but container remains healthy

- **GIVEN** indexing encounters an error (e.g., file read error)
- **WHEN** the error occurs
- **THEN** SHALL log error with details
- **AND** container SHALL remain running (not crash)
- **AND** `/health` SHALL report error in search status

---

### Requirement: Rate Limiting

The DocsAPI SHALL implement rate limiting to prevent abuse and ensure fair resource allocation across clients, with configurable limits per IP address.

#### Scenario: Rate limit not exceeded allows request

- **GIVEN** a client has made 50 requests in 15 minutes
- **WHEN** the client makes another request
- **THEN** SHALL process the request normally
- **AND** SHALL return HTTP 200 OK (if request valid)

#### Scenario: Rate limit exceeded returns 429

- **GIVEN** a client has made 100 requests in 15 minutes (limit reached)
- **WHEN** the client makes another request
- **THEN** SHALL return HTTP 429 Too Many Requests
- **AND** SHALL include `Retry-After` header
- **AND** SHALL NOT process the request

#### Scenario: Rate limit configuration via environment

- **GIVEN** RATE_LIMIT_MAX environment variable is set to 200
- **WHEN** the service starts
- **THEN** SHALL configure rate limiter with max 200 requests
- **AND** SHALL use RATE_LIMIT_WINDOW_MS for window duration

---

### Requirement: CORS Configuration

The DocsAPI SHALL support CORS (Cross-Origin Resource Sharing) to allow Dashboard and other frontends to make API requests, with configurable allowed origins.

#### Scenario: CORS allows configured origins

- **GIVEN** CORS_ORIGIN is set to "http://localhost:3103"
- **WHEN** a request comes from http://localhost:3103
- **THEN** SHALL include Access-Control-Allow-Origin header
- **AND** SHALL allow the request to proceed

#### Scenario: CORS blocks unconfigured origins

- **GIVEN** CORS_ORIGIN does not include http://evil.com
- **WHEN** a request comes from http://evil.com
- **THEN** SHALL NOT include Access-Control-Allow-Origin header
- **AND** browser SHALL block the response

#### Scenario: CORS can be disabled for unified domain

- **GIVEN** CORS_DISABLE environment variable is true
- **WHEN** the service starts
- **THEN** SHALL NOT register CORS middleware
- **AND** SHALL log "CORS disabled - Using unified domain mode"

---

### Requirement: Development Hot-Reload

The DocsAPI SHALL support hot-reload in development mode via `--watch` flag to enable fast feedback loop when source files change, without requiring manual restarts.

#### Scenario: Server restarts on file change

- **GIVEN** DocsAPI is running in dev mode with `npm run dev`
- **WHEN** a source file is modified and saved
- **THEN** Node.js SHALL automatically restart the server
- **AND** SHALL reload all modules with changes
- **AND** restart SHALL complete in < 2 seconds

#### Scenario: Hot-reload preserves FlexSearch index

- **GIVEN** documentation is indexed
- **WHEN** server restarts due to file change
- **THEN** SHALL re-index documentation from /app/docs
- **AND** previous index SHALL be discarded
- **AND** new index SHALL be available after restart

---

### Requirement: Container Resource Limits

The DocsAPI container SHALL operate within defined resource limits to ensure predictable performance and prevent resource exhaustion on the host system.

#### Scenario: Memory usage stays under limit

- **GIVEN** the DocsAPI container is configured with 512MB memory limit
- **WHEN** the container is running and serving requests
- **THEN** memory usage SHALL remain below 512MB
- **AND** SHALL NOT be killed by Docker OOM (Out of Memory)

#### Scenario: Container exports resource metrics

- **GIVEN** the container is running
- **WHEN** Prometheus scrapes `/metrics` endpoint
- **THEN** SHALL include `process_resident_memory_bytes` metric
- **AND** SHALL include `process_cpu_seconds_total` metric
- **AND** metrics SHALL reflect actual resource usage

---

### Requirement: Graceful Shutdown

The DocsAPI SHALL handle SIGTERM and SIGINT signals gracefully by closing active connections, finishing in-flight requests, and cleaning up resources before exiting.

#### Scenario: SIGTERM closes server gracefully

- **GIVEN** the DocsAPI is running with active requests
- **WHEN** Docker sends SIGTERM signal (docker stop)
- **THEN** SHALL stop accepting new requests
- **AND** SHALL wait for in-flight requests to complete (up to 30s)
- **AND** SHALL close HTTP server
- **AND** SHALL exit with code 0

#### Scenario: SIGINT in development mode

- **GIVEN** DocsAPI is running in dev mode
- **WHEN** developer presses Ctrl+C
- **THEN** SHALL log "Shutting down gracefully"
- **AND** SHALL close server
- **AND** SHALL exit cleanly

---

### Requirement: Static File Serving

The DocsAPI SHALL serve static files including OpenAPI/AsyncAPI specifications and documentation HTML files to support API documentation rendering.

#### Scenario: OpenAPI spec is accessible

- **GIVEN** an OpenAPI spec exists at `/app/docs/spec/openapi.yaml`
- **WHEN** a client requests GET `/spec/openapi.yaml`
- **THEN** SHALL return HTTP 200 OK
- **AND** SHALL return the YAML file content
- **AND** SHALL set Content-Type header to `text/yaml`

#### Scenario: Non-existent static file returns 404

- **GIVEN** a client requests a non-existent static file
- **WHEN** GET `/spec/nonexistent.yaml` is requested
- **THEN** SHALL return HTTP 404 Not Found
- **AND** SHALL include 404 error page or JSON error

---

### Requirement: Request Logging

The DocsAPI SHALL log all HTTP requests including method, URL, status code, and duration to enable debugging, monitoring, and performance analysis.

#### Scenario: Successful request is logged

- **GIVEN** a client makes a successful request
- **WHEN** GET `/health` returns 200 OK in 15ms
- **THEN** SHALL log request with fields:
  - `method: "GET"`
  - `url: "/health"`
  - `status: 200`
  - `duration: "15ms"`

#### Scenario: Failed request is logged with error

- **GIVEN** a request fails with 500 error
- **WHEN** the error occurs
- **THEN** SHALL log request with error details
- **AND** SHALL include error message
- **AND** SHALL NOT include sensitive data (passwords, tokens)

---

### Requirement: Environment-Based Configuration

The DocsAPI SHALL load configuration from environment variables to enable deployment across different environments (development, staging, production) without code changes.

#### Scenario: Port configuration via environment

- **GIVEN** PORT environment variable is set to 3401
- **WHEN** the server starts
- **THEN** SHALL listen on port 3401
- **AND** SHALL log "Documentation API running on http://localhost:3401"

#### Scenario: Missing required environment variable

- **GIVEN** a required environment variable is not set
- **WHEN** the server attempts to start
- **THEN** SHALL log error with missing variable name
- **AND** SHALL exit with non-zero code (fail-fast)
- **AND** SHALL NOT start server in invalid state

#### Scenario: Development vs Production mode

- **GIVEN** NODE_ENV is set to "production"
- **WHEN** the server starts
- **THEN** SHALL disable verbose logging
- **AND** SHALL NOT expose stack traces in errors
- **AND** SHALL use JSON log format (not pretty-print)
