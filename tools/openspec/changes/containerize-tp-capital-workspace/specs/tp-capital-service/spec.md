# Specification: TP Capital Service (Containerized)

## ADDED Requirements

### Requirement: Containerized TP Capital Service

The TP Capital service SHALL run as a Docker container with hot-reload support for development and resilient connectivity to TimescaleDB.

#### Scenario: Container startup with TimescaleDB healthy

- **GIVEN** TimescaleDB container is running and healthy
- **AND** environment variables are configured (TELEGRAM_INGESTION_BOT_TOKEN, TIMESCALEDB_HOST, TIMESCALEDB_PORT, TIMESCALEDB_PASSWORD)
- **WHEN** TP Capital container starts via `docker compose up -d tp-capital`
- **THEN** service connects to TimescaleDB within 10 seconds
- **AND** health endpoint `http://localhost:4005/health` returns 200 OK
- **AND** Prometheus metrics endpoint `http://localhost:4005/metrics` is accessible
- **AND** container logs show "TimescaleDB connected successfully"

#### Scenario: Container startup with TimescaleDB unavailable

- **GIVEN** TimescaleDB is not running or unreachable
- **WHEN** TP Capital container starts
- **THEN** service attempts connection retry 5 times with 2 second delay between attempts
- **AND** container logs show "TimescaleDB connection retry X/5" for each attempt
- **AND** if all retries fail, container logs "TimescaleDB unavailable after max retries" and exits with code 1
- **AND** health endpoint returns 503 Service Unavailable with message "Database connection not established"

#### Scenario: Hot-reload during development

- **GIVEN** TP Capital container is running with volumes mounted
- **AND** developer has source code mounted at `/app/src`
- **WHEN** developer edits source file `apps/tp-capital/src/server.js`
- **THEN** nodemon detects file change within 2 seconds
- **AND** service restarts automatically without manual intervention
- **AND** new code is reflected in subsequent HTTP requests
- **AND** container logs show "Restarting due to changes..."

#### Scenario: Container healthcheck passes

- **GIVEN** TP Capital container is running
- **AND** service is connected to TimescaleDB
- **WHEN** Docker executes healthcheck command `wget -q -O- http://localhost:4005/health`
- **THEN** healthcheck returns exit code 0 (success)
- **AND** container status shows "healthy" in `docker ps` output
- **AND** healthcheck executes every 30 seconds

#### Scenario: Container healthcheck fails

- **GIVEN** TP Capital container is running
- **AND** TimescaleDB becomes unreachable (network partition or container stopped)
- **WHEN** Docker executes healthcheck command
- **THEN** healthcheck returns non-zero exit code
- **AND** after 3 consecutive failures, container status shows "unhealthy"
- **AND** container logs show "Health check failed: database connection lost"

---

### Requirement: Telegram Ingestion in Container

The containerized TP Capital SHALL maintain full Telegram ingestion functionality without regression from local process deployment.

#### Scenario: Webhook receives Telegram message

- **GIVEN** TP Capital container is running
- **AND** Telegram bot is configured with webhook URL pointing to service
- **WHEN** Telegram webhook sends POST request to `http://localhost:4005/webhook/telegram`
- **AND** request body contains valid Telegram message JSON
- **THEN** service parses message successfully
- **AND** message is stored in TimescaleDB table `tp_capital.telegram_messages`
- **AND** response is 200 OK within 500ms
- **AND** response body contains `{"ok": true}`

#### Scenario: Polling mode receives Telegram updates

- **GIVEN** TP Capital container is running with `TELEGRAM_MODE=polling`
- **AND** Telegram bot token is valid
- **WHEN** service starts and initiates long polling
- **THEN** service connects to Telegram Bot API successfully
- **AND** new messages from configured channels are received
- **AND** messages are stored in TimescaleDB within 1 second of receipt
- **AND** container logs show "Telegram polling active for channels: [-1001234567890]"

#### Scenario: Telegram message persistence

- **GIVEN** TP Capital receives Telegram message with signal
- **AND** message contains text, sender info, and timestamp
- **WHEN** service processes message
- **THEN** message is inserted into `tp_capital.telegram_messages` table
- **AND** record includes columns: message_id, channel_id, user_id, text, timestamp, raw_data (JSONB)
- **AND** if message is duplicate (same message_id), INSERT is skipped via ON CONFLICT
- **AND** Prometheus counter `tp_capital_messages_received_total` increments by 1

---

### Requirement: Volume-Based Hot-Reload

The containerized TP Capital SHALL support instant code changes via volume mounts without requiring image rebuild.

#### Scenario: Source code volume mounted

- **GIVEN** Docker Compose configuration includes volume mount `../../apps/tp-capital/src:/app/src:ro`
- **WHEN** container is started
- **THEN** host directory `apps/tp-capital/src` is mounted inside container at `/app/src`
- **AND** files are readable inside container
- **AND** changes to host files are immediately visible inside container
- **AND** `node_modules` directory is NOT overwritten by host mount (uses anonymous volume)

#### Scenario: Nodemon detects file change

- **GIVEN** TP Capital container is running with `npm run dev` command
- **AND** nodemon is configured to watch `/app/src/**/*.js`
- **WHEN** developer saves changes to `apps/tp-capital/src/config.js`
- **THEN** nodemon detects change within 1 second
- **AND** nodemon restarts Node.js process
- **AND** new configuration is loaded
- **AND** reload completes within 2 seconds total (detection + restart)

#### Scenario: Package.json changes require rebuild

- **GIVEN** TP Capital container is running
- **WHEN** developer edits `apps/tp-capital/package.json` to add new dependency
- **THEN** container does NOT automatically install new dependency
- **AND** developer must run `docker compose build tp-capital` to rebuild image
- **AND** developer must run `docker compose up -d tp-capital` to restart with new dependencies

---

### Requirement: Logging and Observability

The containerized TP Capital SHALL provide structured logging and metrics for monitoring and debugging.

#### Scenario: Structured JSON logs

- **GIVEN** TP Capital container is running
- **WHEN** service logs messages via Pino logger
- **THEN** logs are output in JSON format to stdout
- **AND** each log entry includes fields: level, time, pid, hostname, msg
- **AND** logs are captured by Docker logging driver (json-file)
- **AND** logs are accessible via `docker compose logs -f tp-capital`

#### Scenario: Log rotation configured

- **GIVEN** Docker Compose configuration includes logging options
- **WHEN** container generates logs exceeding 10MB
- **THEN** Docker rotates log file automatically
- **AND** max 3 log files are retained (30MB total)
- **AND** oldest log file is deleted when creating 4th file

#### Scenario: Prometheus metrics exposed

- **GIVEN** TP Capital container is running
- **WHEN** client requests `http://localhost:4005/metrics`
- **THEN** response contains Prometheus-formatted metrics
- **AND** metrics include `tp_capital_messages_received_total` (counter)
- **AND** metrics include `tp_capital_db_connection_status` (gauge, 0=down, 1=up)
- **AND** metrics include `process_cpu_seconds_total` (default Node.js metrics)
- **AND** Service Launcher API can scrape metrics for health dashboard

---

### Requirement: Dependency Management

The containerized TP Capital SHALL correctly manage TimescaleDB dependency during startup and runtime.

#### Scenario: Docker Compose depends_on configuration

- **GIVEN** Docker Compose file includes `depends_on: timescaledb: condition: service_healthy`
- **WHEN** developer runs `docker compose up -d tp-capital`
- **THEN** Docker Compose waits for TimescaleDB container to be healthy before starting TP Capital
- **AND** if TimescaleDB health check fails, TP Capital container does not start
- **AND** Docker Compose logs show "Waiting for timescaledb to be healthy..."

#### Scenario: Application-level connection retry

- **GIVEN** TimescaleDB is starting and not yet accepting connections
- **AND** TP Capital container has already started (past depends_on check)
- **WHEN** service attempts initial database connection
- **THEN** connection fails with "connection refused" error
- **AND** service retries connection after 2 second delay
- **AND** service logs "TimescaleDB connection retry 1/5"
- **AND** when TimescaleDB becomes available, subsequent retry succeeds
- **AND** service continues normal operation

#### Scenario: Database connection lost during runtime

- **GIVEN** TP Capital is running and connected to TimescaleDB
- **WHEN** TimescaleDB container is stopped or restarted
- **THEN** TP Capital detects connection loss on next query
- **AND** health endpoint returns 503 Service Unavailable
- **AND** service attempts to reconnect using exponential backoff
- **AND** when TimescaleDB is available again, service reconnects automatically
- **AND** health endpoint returns 200 OK after reconnection

---

### Requirement: Configuration via Environment Variables

The containerized TP Capital SHALL load all configuration from environment variables provided by Docker Compose.

#### Scenario: Environment variables loaded from .env file

- **GIVEN** Docker Compose configuration includes `env_file: ../../.env`
- **AND** `.env` file contains `TELEGRAM_INGESTION_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
- **WHEN** TP Capital container starts
- **THEN** environment variable is available inside container
- **AND** service reads token from `process.env.TELEGRAM_INGESTION_BOT_TOKEN`
- **AND** no hardcoded values are used

#### Scenario: Required environment variables missing

- **GIVEN** `.env` file does NOT contain `TIMESCALEDB_PASSWORD`
- **WHEN** TP Capital container starts
- **THEN** service detects missing variable during configuration validation
- **AND** service logs "ERROR: Required environment variable TIMESCALEDB_PASSWORD is not set"
- **AND** container exits with code 1
- **AND** Docker Compose shows container in "Exited (1)" state

#### Scenario: Environment variables override defaults

- **GIVEN** service code defines default `PORT=4005`
- **AND** `.env` file contains `PORT=5000`
- **WHEN** TP Capital container starts
- **THEN** service uses port 5000 instead of default 4005
- **AND** health endpoint is accessible at `http://localhost:5000/health`

---

### Requirement: Network Isolation

The containerized TP Capital SHALL communicate with TimescaleDB via dedicated Docker network.

#### Scenario: Container joins tradingsystem_backend network

- **GIVEN** Docker Compose configuration includes `networks: tradingsystem_backend: external: true`
- **AND** network `tradingsystem_backend` exists (created by database stack)
- **WHEN** TP Capital container starts
- **THEN** container is attached to `tradingsystem_backend` network
- **AND** container can resolve `timescaledb` hostname via Docker DNS
- **AND** container can connect to TimescaleDB via `postgres://timescaledb:5432`

#### Scenario: External network not found

- **GIVEN** network `tradingsystem_backend` does NOT exist
- **WHEN** developer runs `docker compose up -d tp-capital`
- **THEN** Docker Compose fails with error "network tradingsystem_backend not found"
- **AND** container does not start
- **AND** developer must create network via `docker network create tradingsystem_backend`

---

## Summary

This specification defines the requirements for the containerized TP Capital service, ensuring:

1. **Resilient startup** with retry logic and health checks
2. **Development-friendly** hot-reload via volume mounts
3. **Production-ready** logging, metrics, and observability
4. **Reliable** dependency management with Docker Compose
5. **Secure** configuration via environment variables
6. **Isolated** networking for service communication

All scenarios are testable and verifiable during implementation (tasks.md).
