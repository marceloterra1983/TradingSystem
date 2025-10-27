# TP Capital API Specification

## ADDED Requirements

### Requirement: Gateway Database Polling
The TP Capital service SHALL poll the Telegram Gateway database for new messages from the signals channel at configurable intervals.

#### Scenario: Successful polling cycle
- **WHEN** the polling worker executes a poll cycle
- **THEN** it queries `telegram_gateway.telegram_messages` table
- **AND** filters for `channel_id = -1001649127710` and `status = 'received'`
- **AND** orders results by `received_at ASC`
- **AND** limits batch size to 100 messages

#### Scenario: Empty poll result
- **WHEN** no unprocessed messages exist in Gateway database
- **THEN** the worker logs debug message "No new messages to process"
- **AND** waits for next polling interval
- **AND** does not make any database writes

#### Scenario: Database connection failure during poll
- **WHEN** Gateway database connection fails
- **THEN** the worker logs error with connection details
- **AND** retries with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- **AND** continues polling loop when connection recovers
- **AND** emits Prometheus metric `polling_errors_total{type="connection"}`

---

### Requirement: Signal Message Processing
The polling worker SHALL process each message from the Gateway database by parsing, validating, and storing as a signal in the TP Capital database.

#### Scenario: Valid signal message processing
- **WHEN** a message with valid signal format is polled
- **THEN** the worker parses the message using `parseSignal()`
- **AND** checks for duplicate signals by `raw_message` + `channel` + `telegram_date`
- **AND** inserts new signal into `tp_capital.tp_capital_signals` table
- **AND** updates Gateway message to `status = 'published'`
- **AND** adds `processed_by: 'tp-capital'` to Gateway message metadata
- **AND** adds `processed_at` timestamp to Gateway message metadata
- **AND** emits Prometheus metric `messages_processed_total{status="published"}`

#### Scenario: Duplicate signal detection
- **WHEN** a message is processed that already exists in `tp_capital_signals` table
- **THEN** the worker skips signal insertion
- **AND** updates Gateway message to `status = 'published'` (idempotency)
- **AND** logs debug message "Signal already processed, skipping"
- **AND** emits Prometheus metric `messages_processed_total{status="duplicate"}`

#### Scenario: Invalid signal format
- **WHEN** a message cannot be parsed as a valid signal
- **THEN** the worker catches parsing error
- **AND** updates Gateway message to `status = 'failed'`
- **AND** adds error details to Gateway message metadata
- **AND** logs warning with parsing error details
- **AND** emits Prometheus metric `messages_processed_total{status="failed"}`
- **AND** continues processing next message in batch

#### Scenario: Database error during signal insertion
- **WHEN** signal insertion into TP Capital database fails
- **THEN** the worker logs error with signal and error details
- **AND** does NOT update Gateway message status (allows retry on next poll)
- **AND** throws error to trigger polling loop retry logic
- **AND** emits Prometheus metric `processing_errors_total{type="database"}`

---

### Requirement: Idempotent Message Processing
The polling worker SHALL ensure each Gateway message is processed exactly once, preventing duplicate signals even if the worker restarts mid-batch.

#### Scenario: Worker restart during batch processing
- **WHEN** the worker crashes after inserting a signal but before updating Gateway message status
- **THEN** on restart, the worker repolls the same message
- **AND** the idempotency check detects existing signal
- **AND** the worker updates Gateway message status without inserting duplicate
- **AND** processing continues normally

#### Scenario: Concurrent worker instances
- **WHEN** multiple TP Capital instances poll simultaneously (misconfiguration)
- **THEN** each worker performs idempotency check before insertion
- **AND** only the first worker successfully inserts signal (database unique constraint)
- **AND** other workers skip as duplicate
- **AND** all workers update Gateway message status to `published`
- **AND** no duplicate signals exist in `tp_capital_signals` table

---

### Requirement: Gateway Database Client
The TP Capital service SHALL maintain a separate connection pool to the Gateway database with resource limits and error handling.

#### Scenario: Gateway database pool initialization
- **WHEN** the TP Capital service starts
- **THEN** it creates a connection pool to `telegram_gateway` database
- **AND** configures max pool size of 5 connections
- **AND** uses same TimescaleDB host as TP Capital database
- **AND** attaches error event listener
- **AND** validates connectivity on startup
- **AND** fails fast with clear error if Gateway database is inaccessible

#### Scenario: Connection pool error event
- **WHEN** a database client error occurs in the Gateway pool
- **THEN** the error event listener logs error details
- **AND** emits Prometheus metric `gateway_db_connection_errors_total`
- **AND** allows polling worker to retry with backoff

#### Scenario: Graceful shutdown
- **WHEN** the service receives SIGTERM or SIGINT
- **THEN** it closes the Gateway database connection pool
- **AND** waits for current batch to complete (max 30s timeout)
- **AND** closes TP Capital database connection pool
- **AND** exits with code 0

---

### Requirement: Observability Metrics
The polling worker SHALL export Prometheus metrics for monitoring health, performance, and errors.

#### Scenario: Messages processed counter
- **WHEN** a message is successfully processed
- **THEN** the worker increments `tpcapital_gateway_messages_processed_total{status="published"}`
- **WHEN** a duplicate is detected
- **THEN** the worker increments `tpcapital_gateway_messages_processed_total{status="duplicate"}`
- **WHEN** parsing fails
- **THEN** the worker increments `tpcapital_gateway_messages_processed_total{status="failed"}`

#### Scenario: Polling lag gauge
- **WHEN** a polling cycle completes
- **THEN** the worker updates `tpcapital_gateway_polling_lag_seconds` gauge
- **AND** the value represents seconds since last successful poll

#### Scenario: Processing duration histogram
- **WHEN** a message is processed (successful or failed)
- **THEN** the worker records processing time in `tpcapital_gateway_processing_duration_seconds`
- **AND** histogram buckets cover 10ms to 5s range

#### Scenario: Messages waiting gauge
- **WHEN** a polling cycle starts
- **THEN** the worker queries count of messages with `status = 'received'`
- **AND** updates `tpcapital_gateway_messages_waiting` gauge

---

### Requirement: Health Check Integration
The TP Capital health check endpoint SHALL include Gateway database connectivity and polling worker status.

#### Scenario: Healthy state
- **WHEN** GET /health is called and all systems are operational
- **THEN** response status is 200 OK
- **AND** response body includes `"gatewayDb": "connected"`
- **AND** response body includes `"pollingWorker": { "running": true }`
- **AND** response body includes `"lastPollAt"` timestamp
- **AND** response body includes `"lagSeconds"` (time since last poll)
- **AND** response body includes `"messagesWaiting"` count

#### Scenario: Gateway database disconnected
- **WHEN** GET /health is called and Gateway database is unreachable
- **THEN** response status is 503 Service Unavailable
- **AND** response body includes `"gatewayDb": "disconnected"`
- **AND** response body includes error details

#### Scenario: Polling worker stopped
- **WHEN** GET /health is called and polling worker is not running
- **THEN** response status is 503 Service Unavailable
- **AND** response body includes `"pollingWorker": { "running": false }`

---

### Requirement: Configurable Polling Parameters
The polling worker SHALL support configuration via environment variables for polling interval and target channel.

#### Scenario: Custom polling interval
- **WHEN** environment variable `GATEWAY_POLLING_INTERVAL_MS=1000` is set
- **THEN** the worker polls every 1 second
- **AND** logs startup message with configured interval

#### Scenario: Custom signals channel
- **WHEN** environment variable `SIGNALS_CHANNEL_ID=-1001234567890` is set
- **THEN** the worker filters for messages from that channel only
- **AND** ignores messages from other channels

#### Scenario: Default configuration
- **WHEN** no custom environment variables are set
- **THEN** the worker uses default polling interval of 5000ms
- **AND** uses default signals channel `-1001649127710`

---

## REMOVED Requirements

### Requirement: Direct Telegram Bot Connection
**Reason**: TP Capital no longer maintains its own Telegram bot. The Telegram Gateway service is now responsible for all Telegram API communication.

**Migration**: Remove `telegramIngestion.js`, remove Telegraf bot initialization from `server.js`, remove `TELEGRAM_INGESTION_BOT_TOKEN` from environment configuration.

**Impact**: TP Capital will no longer connect directly to Telegram API. All message ingestion now comes from Gateway database polling.

---

### Requirement: Telegram Bot Token Configuration
**Reason**: Without direct Telegram bot connection, TP Capital does not need Telegram API credentials.

**Migration**: Delete `TELEGRAM_INGESTION_BOT_TOKEN` from `.env` and `.env.example` files. Document removal in README.

**Impact**: One less credential to manage and rotate. Reduces security surface area.

---

### Requirement: Real-time Message Reception
**Reason**: Polling pattern introduces 0-5s delay (configurable) vs instant Telegram bot callback.

**Migration**: Accept latency trade-off for architectural simplicity. Can reduce polling interval to 1s if needed.

**Impact**: Signals appear in Dashboard 0-5 seconds after Telegram message (previously <100ms). Acceptable for use case.

---

## MODIFIED Requirements

### Requirement: Signal Parsing and Validation
The service SHALL parse incoming signal messages using the existing `parseSignal()` function and validate signal format.

**Previous Implementation**: Parsing triggered by Telegram bot callback
**New Implementation**: Parsing triggered by polling worker processing Gateway messages

#### Scenario: Signal parsing from Gateway message
- **WHEN** a Gateway message text is provided to `parseSignal()`
- **THEN** the parser extracts signal fields (asset, buy_min, buy_max, targets, stop)
- **AND** validates required fields are present
- **AND** returns structured signal object
- **WHEN** parsing fails
- **THEN** the parser throws error with details
- **AND** the error is caught by polling worker

**Note**: Parsing logic itself is unchanged, only the trigger mechanism changes from bot callback to polling worker.

---

### Requirement: Signal Storage in TimescaleDB
The service SHALL store parsed signals in `tp_capital.tp_capital_signals` table with all required fields.

**Previous Implementation**: Stored directly after Telegram bot callback
**New Implementation**: Stored by polling worker after Gateway message processing

#### Scenario: Signal insertion
- **WHEN** a valid signal is parsed from Gateway message
- **THEN** the worker inserts row into `tp_capital.tp_capital_signals` table
- **AND** includes all fields: `channel`, `signal_type`, `asset`, `buy_min`, `buy_max`, `target_1`, `target_2`, `target_final`, `stop`, `raw_message`, `source`, `ingested_at`, `ts`
- **AND** sets `source = 'telegram-gateway'` (previously `'telegram'`)

**Note**: Table schema unchanged, only `source` field value changes to reflect new ingestion path.
