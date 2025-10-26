---
capability-id: tp-capital-telegram-gateway
capability-type: NEW
status: proposal
domain: backend
tags: [telegram, gateway, integration, real-time]
---

# Specification: Telegram Gateway

## Overview

The **Telegram Gateway** is a local Node.js service (systemd/Windows Service) responsible for maintaining persistent connections with Telegram servers, receiving trading signals from monitored channels, and forwarding them to the containerized TP Capital API via HTTP POST.

**Key Responsibilities**:
- Telegram authentication (MTProto)
- Session management (`.session` files on local disk)
- Message reception (bot + user account)
- HTTP publishing to API with retry logic
- Failure queue persistence (JSONL)
- Prometheus metrics export

---

## ADDED Requirements

### Requirement: Telegram Authentication Management

The Gateway SHALL manage Telegram authentication using MTProto protocol and persist session tokens securely on local disk.

#### Scenario: Initial authentication with phone number and 2FA

- **WHEN** Gateway starts for the first time without existing session files
- **THEN** Gateway prompts for phone number via stdin
- **AND** Telegram sends verification code via SMS
- **AND** Gateway prompts for verification code via stdin
- **AND** if 2FA enabled, Gateway prompts for password
- **AND** Gateway successfully connects to Telegram
- **AND** Gateway saves session string to `.session/<session-name>.session` file
- **AND** session file has permissions `0600` (owner read/write only)

#### Scenario: Subsequent authentication with existing session

- **WHEN** Gateway starts with valid `.session` file present
- **THEN** Gateway loads session from file
- **AND** Gateway connects to Telegram without prompting for credentials
- **AND** connection establishes within 10 seconds
- **AND** Gateway logs "Telegram connected" at info level

#### Scenario: Session expiration handling

- **WHEN** Telegram server rejects session as expired or invalid
- **THEN** Gateway logs "Session expired" error
- **AND** Gateway renames invalid session to `.session.expired-<timestamp>`
- **AND** Gateway initiates reauthorization flow (prompts for phone + code)
- **AND** Gateway saves new session after successful reauth

---

### Requirement: Session File Security

The Gateway SHALL store Telegram session files locally on disk with strict security permissions, never in Docker volumes.

#### Scenario: Session file creation with secure permissions

- **WHEN** Gateway creates new session file
- **THEN** session file is created in `.session/` directory
- **AND** file has permissions `0600` (owner read/write only)
- **AND** directory has permissions `0700` (owner access only)
- **AND** file owner is Gateway process user (e.g., `trading`)

#### Scenario: Session file backup before updates

- **WHEN** Gateway receives updated session from Telegram
- **THEN** Gateway creates backup `.session/<name>.session.bak`
- **AND** Gateway writes new session to `.session/<name>.session`
- **AND** Gateway verifies write success before deleting backup

#### Scenario: Session file corruption detection

- **WHEN** Gateway attempts to load `.session` file
- **AND** file is corrupted or invalid format
- **THEN** Gateway logs "Session file corrupt" error
- **AND** Gateway renames corrupt file to `.session.corrupt-<timestamp>`
- **AND** Gateway initiates reauthorization flow

---

### Requirement: Message Reception and Forwarding

The Gateway SHALL receive messages from monitored Telegram channels via bot (Telegraf) and user account (TelegramClient) and forward them to API.

#### Scenario: Receive channel post via bot

- **WHEN** monitored channel publishes new message
- **THEN** Gateway receives message via Telegraf bot callback
- **AND** Gateway extracts: channelId, messageId, text, timestamp
- **AND** Gateway extracts photos if present (download URLs)
- **AND** Gateway constructs message payload JSON

#### Scenario: Receive forwarded message via user account

- **WHEN** monitored channel forwards message to destination channel
- **THEN** Gateway receives message via TelegramClient event
- **AND** Gateway extracts: source channelId, original messageId, forwarded timestamp
- **AND** Gateway constructs forwarded message payload

#### Scenario: Publish message to API successfully

- **WHEN** Gateway receives message from Telegram
- **THEN** Gateway POSTs payload to `${API_ENDPOINT}` (http://localhost:4005/ingest)
- **AND** Gateway includes header `X-Gateway-Token: ${API_SECRET_TOKEN}`
- **AND** Gateway sets timeout 10 seconds
- **AND** API responds 200 OK
- **AND** Gateway logs "Message published successfully" at info level
- **AND** Gateway increments Prometheus counter `telegram_messages_published_total`

---

### Requirement: Retry Logic with Exponential Backoff

The Gateway SHALL retry failed API publish attempts with exponential backoff before saving to failure queue.

#### Scenario: Retry on API unavailable

- **WHEN** Gateway POSTs message to API
- **AND** API is unreachable (connection refused)
- **THEN** Gateway waits 5 seconds (2^0 * 5s)
- **AND** Gateway retries (attempt 1 of 3)
- **AND** if still fails, waits 10 seconds (2^1 * 5s)
- **AND** Gateway retries (attempt 2 of 3)
- **AND** if still fails, waits 20 seconds (2^2 * 5s)
- **AND** Gateway retries (attempt 3 of 3)
- **AND** if all retries fail, Gateway saves message to failure queue

#### Scenario: Save to failure queue on max retries exceeded

- **WHEN** Gateway exhausts all retry attempts (3 failures)
- **THEN** Gateway appends message JSON to `${FAILURE_QUEUE_PATH}` (JSONL format)
- **AND** message includes original data + `failedAt` timestamp
- **AND** Gateway logs "Max retries exceeded, saved to queue" at error level
- **AND** Gateway increments `telegram_publish_failures_total{reason="max_retries"}`

#### Scenario: Successful retry after temporary failure

- **WHEN** Gateway retries message after 5s delay
- **AND** API is now available
- **THEN** API responds 200 OK
- **AND** Gateway logs "Message published after retry" at warn level
- **AND** Gateway increments `telegram_retry_attempts_total{attempt_number="1"}`

---

### Requirement: Failure Queue Management

The Gateway SHALL persist failed messages to JSONL file for manual recovery when API is unavailable for extended periods.

#### Scenario: Append to failure queue

- **WHEN** Gateway saves message to failure queue
- **THEN** Gateway appends JSON line to `${FAILURE_QUEUE_PATH}`
- **AND** line format: `{"channelId":...,"messageId":...,"text":"...","timestamp":"...","failedAt":"..."}\n`
- **AND** file is created if not exists
- **AND** append is atomic (no partial writes)

#### Scenario: Recover messages from queue

- **WHEN** operator runs `node scripts/recover-queue.js`
- **THEN** script reads all lines from `${FAILURE_QUEUE_PATH}`
- **AND** script re-publishes each message to API
- **AND** if all messages succeed, script clears queue file
- **AND** if any fail, script preserves queue and logs count

#### Scenario: Queue size monitoring

- **WHEN** Gateway runs periodic check (every 60 seconds)
- **THEN** Gateway counts lines in `${FAILURE_QUEUE_PATH}`
- **AND** Gateway updates gauge `telegram_failure_queue_size` with count
- **AND** if size > 100, Gateway logs warning "Failure queue growing"

---

### Requirement: Health Check Endpoint

The Gateway SHALL provide HTTP health check endpoint for systemd and monitoring integration.

#### Scenario: Health check when Telegram connected

- **WHEN** client requests `GET http://localhost:4006/health`
- **AND** Gateway is connected to Telegram
- **THEN** Gateway responds 200 OK
- **AND** response body:
  ```json
  {
    "status": "healthy",
    "telegram": "connected",
    "uptime": 12345.67,
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

#### Scenario: Health check when Telegram disconnected

- **WHEN** client requests `GET http://localhost:4006/health`
- **AND** Gateway is disconnected from Telegram
- **THEN** Gateway responds 503 Service Unavailable
- **AND** response body:
  ```json
  {
    "status": "unhealthy",
    "telegram": "disconnected",
    "error": "Connection lost to Telegram servers",
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
  ```

---

### Requirement: Prometheus Metrics Export

The Gateway SHALL export Prometheus metrics for monitoring connection status, message throughput, and failures.

#### Scenario: Metrics endpoint exposes connection status

- **WHEN** client requests `GET http://localhost:4006/metrics`
- **THEN** response includes:
  ```
  # HELP telegram_connection_status Telegram connection status (0=disconnected, 1=connected)
  # TYPE telegram_connection_status gauge
  telegram_connection_status 1
  ```

#### Scenario: Metrics endpoint exposes message counters

- **WHEN** client requests `GET http://localhost:4006/metrics`
- **THEN** response includes:
  ```
  telegram_messages_received_total{channel_id="-1001234567890"} 150
  telegram_messages_published_total 148
  telegram_publish_failures_total{reason="timeout"} 2
  telegram_retry_attempts_total{attempt_number="1"} 5
  telegram_failure_queue_size 2
  ```

---

### Requirement: Configuration via Environment Variables

The Gateway SHALL load all configuration from environment variables (`.env` file).

#### Scenario: Required variables present

- **WHEN** Gateway starts
- **AND** `.env` file contains all required variables:
  - `TELEGRAM_API_ID`
  - `TELEGRAM_API_HASH`
  - `TELEGRAM_PHONE_NUMBER` (or `TELEGRAM_SESSION` for reauth)
  - `TELEGRAM_INGESTION_BOT_TOKEN`
  - `GATEWAY_PORT`
  - `API_ENDPOINT`
  - `API_SECRET_TOKEN`
- **THEN** Gateway loads configuration successfully
- **AND** Gateway logs first 8 chars of `API_SECRET_TOKEN` for verification

#### Scenario: Required variable missing

- **WHEN** Gateway starts
- **AND** `API_SECRET_TOKEN` is not set
- **THEN** Gateway logs "FATAL: API_SECRET_TOKEN is required" at error level
- **AND** Gateway exits with code 1 (fail-fast validation)

---

### Requirement: systemd Integration (Linux)

The Gateway SHALL run as systemd service with auto-restart and resource limits.

#### Scenario: Service starts on system boot

- **WHEN** Linux system boots
- **AND** Gateway service is enabled (`systemctl enable tp-capital-gateway`)
- **THEN** systemd starts Gateway after network-online.target
- **AND** Gateway connects to Telegram
- **AND** systemd reports status "active (running)"

#### Scenario: Service restarts on crash

- **WHEN** Gateway process crashes (exit code != 0)
- **THEN** systemd waits 10 seconds (`RestartSec=10s`)
- **AND** systemd restarts Gateway
- **AND** Gateway reconnects to Telegram using existing session
- **AND** systemd logs restart in journal

#### Scenario: Resource limits enforced

- **WHEN** Gateway process consumes > 500MB memory
- **THEN** systemd kills process (`MemoryMax=500M`)
- **AND** systemd restarts Gateway
- **AND** operator alerted via systemd logs

---

## Summary

This specification defines the Telegram Gateway as a standalone local service responsible for:

1. **Secure session management** (local disk, never Docker)
2. **Reliable message reception** (bot + user account)
3. **Resilient API publishing** (retry logic + failure queue)
4. **Observable operations** (health checks + Prometheus)
5. **Production-ready deployment** (systemd integration + auto-restart)

All scenarios are testable via tasks.md Phase 2 checklist.
