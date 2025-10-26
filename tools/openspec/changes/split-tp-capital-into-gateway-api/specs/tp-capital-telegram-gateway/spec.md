---
capability-id: tp-capital-telegram-gateway
capability-type: NEW
status: proposal
domain: backend
tags: [telegram, gateway, integration, real-time]
---

# Specification: TP Capital Telegram Gateway

## Overview

The **TP Capital Telegram Gateway** is a local Node.js service responsible for maintaining persistent connections with Telegram servers, receiving trading signals from monitored channels, and forwarding them to the containerized TP Capital API via HTTP POST. This service handles all Telegram-specific concerns including authentication (MTProto), session management, and message reception.

**Key Characteristics**:
- Runs as systemd service (Linux) or Windows Service
- Maintains single persistent Telegram session
- Stores session files (`.session`) locally on disk
- Publishes messages to API with retry logic
- Exports Prometheus metrics for monitoring

---

## ADDED Requirements

### Requirement: Telegram Authentication Management

The Gateway SHALL manage Telegram authentication using MTProto protocol and persist session tokens securely.

#### Scenario: Initial authentication with phone number and 2FA
- **WHEN** Gateway starts for the first time without existing session files
- **THEN** Gateway prompts for phone number
- **AND** Telegram sends verification code via SMS
- **AND** Gateway prompts for verification code
- **AND** Gateway prompts for 2FA password (if enabled)
- **AND** Gateway successfully connects to Telegram
- **AND** Gateway saves session string to `.session` file

#### Scenario: Subsequent authentication with existing session
- **WHEN** Gateway starts with valid `.session` file present
- **THEN** Gateway loads session from file
- **AND** Gateway connects to Telegram without prompting for credentials
- **AND** Connection establishes within 10 seconds

#### Scenario: Session expiration handling
- **WHEN** Telegram server rejects session as expired
- **THEN** Gateway logs session expiration error
- **AND** Gateway deletes invalid `.session` file
- **AND** Gateway prompts for reauthorization (phone + code)
- **AND** Gateway saves new session after successful reauth

---

### Requirement: Session File Persistence

The Gateway SHALL store Telegram session files locally on disk with appropriate security permissions.

#### Scenario: Session file creation with secure permissions
- **WHEN** Gateway creates new session file
- **THEN** Session file is created in `.session/` directory
- **AND** File has permissions `0600` (owner read/write only)
- **AND** Directory has permissions `0700` (owner access only)
- **AND** File contains encrypted session string

#### Scenario: Session file backup before updates
- **WHEN** Gateway receives updated session from Telegram
- **THEN** Gateway creates backup of existing session file (`.session.bak`)
- **AND** Gateway writes new session to `.session` file
- **AND** Gateway verifies write success before deleting backup

#### Scenario: Session file corruption detection
- **WHEN** Gateway attempts to load `.session` file
- **AND** File is corrupted or invalid format
- **THEN** Gateway logs corruption error
- **AND** Gateway renames corrupt file to `.session.corrupt.<timestamp>`
- **AND** Gateway initiates reauthorization flow

---

### Requirement: Message Reception and Forwarding

The Gateway SHALL receive messages from monitored Telegram channels and forward them to the API.

#### Scenario: Receive channel post message
- **WHEN** Monitored channel publishes new message
- **THEN** Gateway receives message via Telegraf bot callback
- **AND** Gateway extracts channel ID, message ID, text, timestamp
- **AND** Gateway extracts photos if present (download and store locally)
- **AND** Gateway constructs message payload with all extracted data

#### Scenario: Receive forwarded message from user account
- **WHEN** Monitored channel forwards message to destination channel
- **THEN** Gateway receives message via TelegramClient event
- **AND** Gateway extracts source channel ID and original message ID
- **AND** Gateway constructs forwarded message payload

#### Scenario: Filter duplicate messages in memory
- **WHEN** Gateway receives message
- **AND** Message ID already exists in in-memory cache (last 1000 messages)
- **THEN** Gateway skips processing
- **AND** Gateway logs "Duplicate message skipped (in-memory cache)"
- **AND** Gateway does NOT publish to API

#### Scenario: Handle media-only messages
- **WHEN** Gateway receives message with photos but no text caption
- **THEN** Gateway extracts photo URLs
- **AND** Gateway sets text field to empty string
- **AND** Gateway publishes message payload with photos array populated

---

### Requirement: HTTP Message Publishing

The Gateway SHALL publish received messages to the API via HTTP POST with authentication and retry logic.

#### Scenario: Successful message publish
- **WHEN** Gateway publishes message payload to API `/ingest` endpoint
- **AND** API responds with 200 OK
- **THEN** Gateway logs "Message published successfully"
- **AND** Gateway increments `telegram_messages_published_total` counter
- **AND** Gateway removes message from in-memory cache after 5 minutes

#### Scenario: API returns 401 Unauthorized
- **WHEN** Gateway publishes message with invalid or missing `X-Gateway-Token` header
- **AND** API responds with 401 Unauthorized
- **THEN** Gateway logs "Authentication failed - check GATEWAY_SECRET_TOKEN"
- **AND** Gateway increments `telegram_publish_failures_total{reason="auth"}` counter
- **AND** Gateway does NOT retry (authentication failure is not transient)
- **AND** Gateway appends message to failure queue

#### Scenario: API returns 500 Internal Server Error (transient)
- **WHEN** Gateway publishes message
- **AND** API responds with 500 Internal Server Error
- **THEN** Gateway logs "API error, retrying..." with attempt number
- **AND** Gateway waits 5 seconds (exponential backoff: 5s, 10s, 20s)
- **AND** Gateway retries up to 3 times
- **AND** If all retries fail, Gateway appends message to failure queue
- **AND** Gateway increments `telegram_publish_failures_total{reason="server_error"}` counter

#### Scenario: Network timeout during publish
- **WHEN** Gateway publishes message
- **AND** API does not respond within 10 seconds
- **THEN** Gateway logs "API timeout, retrying..."
- **AND** Gateway applies same retry logic as 500 error
- **AND** Gateway increments `telegram_publish_failures_total{reason="timeout"}` counter

---

### Requirement: Failure Queue Management

The Gateway SHALL persist failed messages to a JSONL failure queue for manual recovery.

#### Scenario: Append message to failure queue
- **WHEN** Gateway exhausts all retry attempts for a message
- **THEN** Gateway appends message payload to `data/failure-queue.jsonl` as single-line JSON
- **AND** Each line contains: `messageData` + `failedAt` timestamp + `reason` (auth, timeout, server_error)
- **AND** Gateway logs "Message saved to failure queue" with messageId
- **AND** Gateway increments `telegram_failure_queue_size` gauge

#### Scenario: Read all messages from failure queue
- **WHEN** Recovery script requests all queued messages
- **THEN** Gateway reads `data/failure-queue.jsonl` file
- **AND** Gateway parses each line as JSON
- **AND** Gateway yields messages as async generator (one at a time)

#### Scenario: Clear failure queue after successful recovery
- **WHEN** Recovery script successfully republishes all queued messages
- **THEN** Recovery script requests queue clear
- **AND** Gateway truncates `data/failure-queue.jsonl` to zero bytes
- **AND** Gateway sets `telegram_failure_queue_size` gauge to 0
- **AND** Gateway logs "Failure queue cleared"

#### Scenario: Failure queue size exceeds threshold
- **WHEN** Failure queue file size exceeds 100MB
- **THEN** Gateway logs critical alert "Failure queue size exceeded 100MB"
- **AND** Gateway stops accepting new messages to queue
- **AND** Gateway logs all new failures but does not persist
- **AND** Manual intervention required (operator must run recovery or clear queue)

---

### Requirement: Connection State Monitoring

The Gateway SHALL monitor Telegram connection status and export metrics for observability.

#### Scenario: Connection established successfully
- **WHEN** Gateway connects to Telegram after authentication
- **THEN** Gateway logs "Telegram connected" with connection details
- **AND** Gateway sets `telegram_connection_status` gauge to 1
- **AND** Gateway starts monitoring channels for new messages

#### Scenario: Connection lost (network issue)
- **WHEN** Telegram connection drops due to network failure
- **THEN** Gateway logs "Telegram connection lost, reconnecting..."
- **AND** Gateway sets `telegram_connection_status` gauge to 0
- **AND** Gateway attempts reconnection every 5 seconds (up to 10 attempts)
- **AND** If reconnection succeeds, Gateway resumes message monitoring

#### Scenario: Rate limit exceeded (Telegram API)
- **WHEN** Gateway exceeds Telegram API rate limits
- **AND** Telegram server returns FLOOD_WAIT error
- **THEN** Gateway logs "Rate limit exceeded, waiting X seconds"
- **AND** Gateway pauses polling for duration specified by Telegram
- **AND** Gateway does NOT disconnect (connection remains active)
- **AND** After wait period, Gateway resumes normal operation

---

### Requirement: Health Check Endpoint

The Gateway SHALL expose HTTP health check endpoint for monitoring tools.

#### Scenario: Health check returns healthy status
- **WHEN** Monitoring tool requests `GET /health`
- **AND** Gateway has active Telegram connection
- **AND** Gateway is processing messages normally
- **THEN** Gateway responds with 200 OK
- **AND** Response body contains: `{"status":"ok","telegram_connected":true,"uptime_seconds":X}`

#### Scenario: Health check returns degraded status
- **WHEN** Monitoring tool requests `GET /health`
- **AND** Telegram connection is lost but reconnecting
- **THEN** Gateway responds with 200 OK
- **AND** Response body contains: `{"status":"degraded","telegram_connected":false,"reconnecting":true}`

#### Scenario: Health check returns unhealthy status
- **WHEN** Monitoring tool requests `GET /health`
- **AND** Gateway failed to reconnect after 10 attempts
- **THEN** Gateway responds with 503 Service Unavailable
- **AND** Response body contains: `{"status":"error","telegram_connected":false,"error":"Connection failed after 10 attempts"}`

---

### Requirement: Prometheus Metrics Export

The Gateway SHALL export Prometheus-compatible metrics for observability and alerting.

#### Scenario: Metrics endpoint returns valid Prometheus format
- **WHEN** Prometheus scraper requests `GET /metrics`
- **THEN** Gateway responds with 200 OK
- **AND** Response body contains metrics in Prometheus text format
- **AND** All metrics include `# HELP` and `# TYPE` comments

#### Scenario: Connection status metric reflects current state
- **WHEN** Telegram connection is active
- **THEN** `telegram_connection_status` gauge value is 1
- **WHEN** Telegram connection is lost
- **THEN** `telegram_connection_status` gauge value is 0

#### Scenario: Message counters increment correctly
- **WHEN** Gateway receives 10 messages from Telegram
- **THEN** `telegram_messages_received_total` counter increments by 10
- **WHEN** Gateway successfully publishes 8 messages to API
- **THEN** `telegram_messages_published_total` counter increments by 8
- **WHEN** Gateway fails to publish 2 messages (both timeout)
- **THEN** `telegram_publish_failures_total{reason="timeout"}` counter increments by 2

#### Scenario: Retry metrics track attempt distribution
- **WHEN** Gateway retries message publish 3 times before success
- **THEN** `telegram_retry_attempts_total{attempt_number="1"}` increments by 1
- **AND** `telegram_retry_attempts_total{attempt_number="2"}` increments by 1
- **AND** `telegram_retry_attempts_total{attempt_number="3"}` increments by 1

#### Scenario: Failure queue size reflects current state
- **WHEN** Failure queue contains 25 messages
- **THEN** `telegram_failure_queue_size` gauge value is 25
- **WHEN** Recovery script clears queue
- **THEN** `telegram_failure_queue_size` gauge value is 0

---

### Requirement: Configuration Management

The Gateway SHALL load configuration from environment variables and validate required settings on startup.

#### Scenario: Load configuration from .env file
- **WHEN** Gateway starts
- **THEN** Gateway loads `.env` file from working directory
- **AND** Gateway parses environment variables
- **AND** Gateway validates all required variables are present

#### Scenario: Missing required configuration (Telegram API ID)
- **WHEN** Gateway starts
- **AND** `TELEGRAM_API_ID` environment variable is not set
- **THEN** Gateway logs "FATAL: TELEGRAM_API_ID is required"
- **AND** Gateway exits with code 1

#### Scenario: Missing required configuration (Gateway secret token)
- **WHEN** Gateway starts
- **AND** `API_SECRET_TOKEN` environment variable is not set
- **THEN** Gateway logs "FATAL: API_SECRET_TOKEN is required"
- **AND** Gateway exits with code 1

#### Scenario: Configuration validation success
- **WHEN** Gateway starts
- **AND** All required environment variables are present
- **THEN** Gateway logs "Configuration loaded successfully"
- **AND** Gateway logs token prefix (first 8 characters) for verification
- **AND** Gateway proceeds to Telegram authentication

---

### Requirement: Graceful Shutdown

The Gateway SHALL handle shutdown signals gracefully and cleanup resources.

#### Scenario: Graceful shutdown on SIGTERM
- **WHEN** Gateway receives SIGTERM signal (e.g., `systemctl stop`)
- **THEN** Gateway logs "Shutting down gracefully..."
- **AND** Gateway stops accepting new messages from Telegram
- **AND** Gateway waits up to 30 seconds for in-flight HTTP publishes to complete
- **AND** Gateway disconnects from Telegram (preserves session)
- **AND** Gateway closes HTTP server
- **AND** Gateway exits with code 0

#### Scenario: Graceful shutdown on SIGINT (Ctrl+C)
- **WHEN** Gateway receives SIGINT signal (user presses Ctrl+C)
- **THEN** Gateway applies same graceful shutdown as SIGTERM

#### Scenario: Force shutdown after timeout
- **WHEN** Gateway receives shutdown signal
- **AND** In-flight HTTP publishes do not complete within 30 seconds
- **THEN** Gateway logs "Force shutdown after timeout"
- **AND** Gateway forcibly closes all connections
- **AND** Gateway exits with code 1

---

## Metrics Reference

### Gauges
- `telegram_connection_status` - Connection status (0=disconnected, 1=connected)
- `telegram_failure_queue_size` - Number of messages in failure queue

### Counters
- `telegram_messages_received_total` - Total messages received from Telegram
  - Labels: `channel_id`, `channel_name`
- `telegram_messages_published_total` - Total messages successfully published to API
- `telegram_publish_failures_total` - Total failed publish attempts
  - Labels: `reason` (auth, timeout, server_error)
- `telegram_retry_attempts_total` - Total retry attempts
  - Labels: `attempt_number` (1, 2, 3)

### Default Metrics (from `prom-client`)
- `process_cpu_seconds_total`
- `process_resident_memory_bytes`
- `nodejs_eventloop_lag_seconds`
- `nodejs_active_handles_total`

---

## Configuration Variables

### Required
- `TELEGRAM_API_ID` - Telegram API ID (integer)
- `TELEGRAM_API_HASH` - Telegram API hash (string)
- `TELEGRAM_PHONE_NUMBER` - Phone number for authentication (+5511999999999)
- `TELEGRAM_INGESTION_BOT_TOKEN` - Bot token for receiving messages
- `API_ENDPOINT` - TP Capital API ingestion endpoint (http://localhost:4005/ingest)
- `API_SECRET_TOKEN` - Shared secret for API authentication

### Optional
- `TELEGRAM_SESSION` - Pre-existing session string (empty = new auth)
- `TELEGRAM_DESTINATION_CHANNEL_ID` - Channel for forwarding messages (integer)
- `GATEWAY_PORT` - HTTP server port (default: 4006)
- `MAX_RETRY_ATTEMPTS` - Max retry attempts for API publish (default: 3)
- `RETRY_DELAY_MS` - Base delay between retries in milliseconds (default: 5000)
- `FAILURE_QUEUE_PATH` - Path to failure queue file (default: ./data/failure-queue.jsonl)
- `LOG_LEVEL` - Logging level (default: info, options: debug, info, warn, error)
- `NODE_ENV` - Node environment (default: production)

---

## Dependencies

### Runtime
- **Node.js** 20.x LTS
- **telegraf** ^4.15.0 (Telegram Bot API wrapper)
- **telegram** ^2.22.2 (MTProto client for user account)
- **express** ^4.18.2 (HTTP server for health check)
- **prom-client** ^15.1.3 (Prometheus metrics export)
- **pino** ^9.4.0 (Structured logging)
- **dotenv** ^16.3.1 (Environment variable loading)

### System
- **systemd** (Linux) or **Windows Service Manager**
- **Filesystem** with read/write permissions for session files
- **Network** access to `api.telegram.org` (ports 443, 80)
- **Network** access to TP Capital API (localhost:4005 or custom)

---

## Security Considerations

### Session File Security
- ✅ Session files contain authentication tokens equivalent to passwords
- ✅ Files MUST have permissions `0600` (owner read/write only)
- ✅ Directory MUST have permissions `0700` (owner access only)
- ✅ Session files MUST NOT be committed to version control
- ✅ Backups MUST be encrypted or stored in secure location

### API Authentication
- ✅ `API_SECRET_TOKEN` MUST be minimum 32 characters (256 bits entropy)
- ✅ Token MUST be transmitted via HTTPS in production
- ✅ Token MUST be stored in `.env` file (not hardcoded)
- ✅ Token MUST be rotated quarterly or after security incident

### Telegram Credentials
- ✅ `TELEGRAM_API_HASH` MUST be kept secret (equivalent to password)
- ✅ `TELEGRAM_PHONE_NUMBER` MUST be kept confidential
- ✅ `TELEGRAM_SESSION` string MUST NOT be shared (session hijacking risk)

---

## Performance Requirements

### Resource Limits
- Memory usage SHALL NOT exceed 200MB under normal load (< 500 messages/hour)
- CPU usage SHALL average < 10% on modern hardware (Intel i5 or equivalent)
- Disk I/O SHALL be minimal (< 100KB/s for logs and failure queue)

### Latency Requirements
- Message reception latency SHALL be < 1 second from Telegram to Gateway
- HTTP publish latency SHALL be < 50ms for successful requests (localhost)
- Retry backoff SHALL not exceed 35 seconds total (5s + 10s + 20s)

### Throughput Requirements
- Gateway SHALL handle up to 1000 messages/hour without degradation
- Gateway SHALL maintain connection for 24+ hours without restart
- Failure queue SHALL support up to 10,000 messages without performance loss

---

## Failure Modes

### Telegram Connection Loss
- **Detection**: Connection timeout or explicit disconnect event
- **Recovery**: Automatic reconnection every 5 seconds (up to 10 attempts)
- **Monitoring**: `telegram_connection_status` gauge = 0
- **Impact**: Messages buffered by Telegram, delivered on reconnect

### API Unavailable
- **Detection**: HTTP 500, 503, or network timeout
- **Recovery**: Retry with exponential backoff (3 attempts)
- **Fallback**: Append to failure queue after max retries
- **Monitoring**: `telegram_publish_failures_total{reason="server_error"}`
- **Impact**: Messages delayed but not lost (recoverable via queue)

### Disk Full
- **Detection**: ENOSPC error on failure queue write
- **Recovery**: Alert operator, stop queuing new messages
- **Monitoring**: `telegram_failure_queue_size` + disk space alerts
- **Impact**: New failures not persisted (operator intervention required)

### Session Expiration
- **Detection**: AUTH_KEY_UNREGISTERED error from Telegram
- **Recovery**: Delete invalid session, initiate reauthorization
- **Monitoring**: `telegram_connection_status` gauge = 0 for > 5 minutes
- **Impact**: Manual intervention required (phone + 2FA)

---

**Status**: Proposal
**Last Updated**: 2025-10-25
**Change ID**: split-tp-capital-into-gateway-api
