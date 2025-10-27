# Implementation Tasks: Adapt TP Capital to Consume from Gateway

## 1. Database Preparation

- [ ] 1.1 Grant TP Capital database user access to Gateway database
  ```sql
  GRANT CONNECT ON DATABASE telegram_gateway TO timescale;
  ```
- [ ] 1.2 Grant schema usage permissions
  ```sql
  \c telegram_gateway
  GRANT USAGE ON SCHEMA telegram_gateway TO timescale;
  ```
- [ ] 1.3 Grant table-level permissions (SELECT + UPDATE)
  ```sql
  GRANT SELECT, UPDATE ON TABLE telegram_gateway.telegram_messages TO timescale;
  ```
- [ ] 1.4 Test cross-database connectivity
  ```bash
  psql -h localhost -p 5433 -U timescale -d telegram_gateway \
    -c "SELECT COUNT(*) FROM telegram_gateway.telegram_messages LIMIT 1"
  ```
- [ ] 1.5 Verify Gateway has messages from signals channel
  ```sql
  SELECT COUNT(*) FROM telegram_gateway.telegram_messages
  WHERE channel_id = '-1001649127710' AND received_at > NOW() - INTERVAL '24 hours';
  ```
- [ ] 1.6 (Optional) Add unique constraint for idempotency
  ```sql
  ALTER TABLE tp_capital.tp_capital_signals
  ADD CONSTRAINT unique_signal_message UNIQUE (raw_message, channel, telegram_date);
  ```

## 2. Code Implementation

### 2.1 Gateway Database Client
- [ ] 2.1.1 Create `apps/tp-capital/src/gatewayDatabaseClient.js`
- [ ] 2.1.2 Implement connection pool factory with error handling
- [ ] 2.1.3 Add connection pool cleanup on shutdown
- [ ] 2.1.4 Add pool error event listener
- [ ] 2.1.5 Write unit tests for connection pool management

### 2.2 Polling Worker
- [ ] 2.2.1 Create `apps/tp-capital/src/gatewayPollingWorker.js`
- [ ] 2.2.2 Implement `GatewayPollingWorker` class with constructor
- [ ] 2.2.3 Implement `start()` method with polling loop
- [ ] 2.2.4 Implement `pollAndProcessBatch()` method
  - [ ] Query Gateway DB for unprocessed messages
  - [ ] Filter by `channel_id` and `status = 'received'`
  - [ ] Batch size limit (100 messages)
  - [ ] Order by `received_at ASC`
- [ ] 2.2.5 Implement `processMessage()` method
  - [ ] Parse signal using existing `parseSignal.js`
  - [ ] Check idempotency (duplicate detection)
  - [ ] Insert into `tp_capital_signals` table
  - [ ] Update Gateway message status to `'published'`
  - [ ] Add `processed_by` metadata
- [ ] 2.2.6 Implement error handling
  - [ ] Exponential backoff for DB errors
  - [ ] Mark as `failed` for parsing errors
  - [ ] Log all errors with context
- [ ] 2.2.7 Implement `stop()` method for graceful shutdown
- [ ] 2.2.8 Add `sleep()` utility for polling interval
- [ ] 2.2.9 Write unit tests for polling worker (with mocked DB)

### 2.3 Prometheus Metrics
- [ ] 2.3.1 Add counter: `tpcapital_gateway_messages_processed_total`
- [ ] 2.3.2 Add gauge: `tpcapital_gateway_polling_lag_seconds`
- [ ] 2.3.3 Add histogram: `tpcapital_gateway_processing_duration_seconds`
- [ ] 2.3.4 Add gauge: `tpcapital_gateway_messages_waiting`
- [ ] 2.3.5 Integrate metrics into polling worker
- [ ] 2.3.6 Expose metrics on `/metrics` endpoint (already exists)

### 2.4 Server Integration
- [ ] 2.4.1 Modify `apps/tp-capital/src/server.js`
  - [ ] Remove import of `telegramIngestion.js`
  - [ ] Remove Telegram bot initialization code
  - [ ] Add import of `gatewayPollingWorker.js`
  - [ ] Add import of `gatewayDatabaseClient.js`
  - [ ] Initialize Gateway database pool
  - [ ] Create polling worker instance
  - [ ] Start polling worker (non-blocking)
  - [ ] Add graceful shutdown handler (SIGTERM/SIGINT)
- [ ] 2.4.2 Test server startup without Telegram bot

### 2.5 Health Check Enhancement
- [ ] 2.5.1 Modify `apps/tp-capital/src/routes/health.js`
- [ ] 2.5.2 Add Gateway DB connectivity check
- [ ] 2.5.3 Add polling worker status check
- [ ] 2.5.4 Add `lastPollAt` and `lagSeconds` fields
- [ ] 2.5.5 Add `messagesWaiting` count
- [ ] 2.5.6 Test health endpoint returns correct status

### 2.6 Cleanup
- [ ] 2.6.1 Delete `apps/tp-capital/src/telegramIngestion.js`
- [ ] 2.6.2 Remove unused Telegram bot imports from other files
- [ ] 2.6.3 Update JSDoc comments in modified files

## 3. Configuration

- [ ] 3.1 Update `apps/tp-capital/.env.example`
  - [ ] Remove `TELEGRAM_INGESTION_BOT_TOKEN`
  - [ ] Add `GATEWAY_DATABASE_NAME` (default: `telegram_gateway`)
  - [ ] Add `GATEWAY_DATABASE_SCHEMA` (default: `telegram_gateway`)
  - [ ] Add `GATEWAY_POLLING_INTERVAL_MS` (default: `5000`)
  - [ ] Add `SIGNALS_CHANNEL_ID` (default: `-1001649127710`)
- [ ] 3.2 Update `apps/tp-capital/.env` (production)
  - [ ] Remove `TELEGRAM_INGESTION_BOT_TOKEN`
  - [ ] Add new environment variables
- [ ] 3.3 Document environment variables in `apps/tp-capital/README.md`

## 4. Testing

### 4.1 Unit Tests
- [ ] 4.1.1 Test `gatewayDatabaseClient.js`
  - [ ] Connection pool creation
  - [ ] Connection pool closure
  - [ ] Error handling
- [ ] 4.1.2 Test `gatewayPollingWorker.js`
  - [ ] Mock Gateway database queries
  - [ ] Test message processing flow
  - [ ] Test idempotency logic
  - [ ] Test error handling paths
  - [ ] Test graceful shutdown
- [ ] 4.1.3 Run all unit tests: `npm test`

### 4.2 Integration Tests
- [ ] 4.2.1 Seed Gateway database with test messages
  ```sql
  INSERT INTO telegram_gateway.telegram_messages
    (channel_id, message_id, text, telegram_date, status, received_at)
  VALUES
    ('-1001649127710', 123456, 'BUY PETR4 8.50-8.55 / T1 8.70 T2 8.85 TF 9.00 / S 8.30',
     '2025-10-26 12:00:00', 'received', '2025-10-26 12:00:00');
  ```
- [ ] 4.2.2 Start TP Capital service
- [ ] 4.2.3 Verify polling worker starts (check logs)
- [ ] 4.2.4 Verify test message processed within 5s
- [ ] 4.2.5 Verify signal inserted into `tp_capital_signals` table
- [ ] 4.2.6 Verify Gateway message updated to `status = 'published'`
- [ ] 4.2.7 Verify `metadata.processed_by = 'tp-capital'`

### 4.3 Idempotency Tests
- [ ] 4.3.1 Insert same test message twice in Gateway DB
- [ ] 4.3.2 Verify only one signal created in TP Capital DB
- [ ] 4.3.3 Verify both Gateway messages marked as `published`

### 4.4 Error Handling Tests
- [ ] 4.4.1 Insert invalid signal format message
- [ ] 4.4.2 Verify marked as `failed` in Gateway DB
- [ ] 4.4.3 Verify no signal inserted in TP Capital DB
- [ ] 4.4.4 Test Gateway DB connection failure
  - [ ] Stop TimescaleDB
  - [ ] Verify polling worker retries with exponential backoff
  - [ ] Restart TimescaleDB
  - [ ] Verify polling worker recovers automatically

### 4.5 Performance Tests
- [ ] 4.5.1 Seed Gateway DB with 100 test messages
- [ ] 4.5.2 Measure processing time (target: <10s for 100 messages)
- [ ] 4.5.3 Verify memory usage stable (target: <200MB)
- [ ] 4.5.4 Verify no connection pool exhaustion

### 4.6 End-to-End Tests
- [ ] 4.6.1 Send real message to Telegram channel `-1001649127710`
- [ ] 4.6.2 Verify Gateway receives message (check `telegram_messages`)
- [ ] 4.6.3 Verify TP Capital processes within 5s (check `tp_capital_signals`)
- [ ] 4.6.4 Verify signal appears in Dashboard
- [ ] 4.6.5 Verify Prometheus metrics updated

## 5. Monitoring & Observability

- [ ] 5.1 Add Grafana dashboard for polling worker metrics
  - [ ] Panel: Messages processed per minute
  - [ ] Panel: Polling lag over time
  - [ ] Panel: Processing duration histogram
  - [ ] Panel: Messages waiting to be processed
- [ ] 5.2 Add Prometheus alert rules
  - [ ] Alert: Polling lag > 10 seconds
  - [ ] Alert: Failed messages > 10% of total
  - [ ] Alert: Gateway DB connection errors > 5/min
  - [ ] Alert: Messages stuck in `received` > 1 hour
- [ ] 5.3 Test alerting (trigger alerts manually)

## 6. Documentation

- [ ] 6.1 Update `apps/tp-capital/README.md`
  - [ ] Remove Telegram bot configuration section
  - [ ] Add Gateway polling worker section
  - [ ] Document new environment variables
  - [ ] Add architecture diagram (Telegram → Gateway → TP Capital)
  - [ ] Add troubleshooting section
- [ ] 6.2 Update `apps/telegram-gateway/README.md`
  - [ ] Add "Consumers" section mentioning TP Capital
  - [ ] Document `processed_by` metadata convention
- [ ] 6.3 Update `CLAUDE.md`
  - [ ] Update TP Capital architecture section
  - [ ] Update data flow diagram
- [ ] 6.4 Update `INVENTARIO-SERVICOS.md`
  - [ ] Update TP Capital entry (remove "Telegram bot")
- [ ] 6.5 Update `API-INTEGRATION-STATUS.md`
  - [ ] Update TP Capital status
- [ ] 6.6 Create ADR (Architecture Decision Record)
  - [ ] File: `docs/architecture/decisions/2025-10-26-adr-000X-gateway-polling-pattern.md`
  - [ ] Document decision to use polling vs HTTP push

## 7. Deployment

### 7.1 Pre-Deployment
- [ ] 7.1.1 Backup TP Capital `.env` file
- [ ] 7.1.2 Export current signals table
  ```bash
  pg_dump -h localhost -p 5433 -t tp_capital.tp_capital_signals > backup_signals.sql
  ```
- [ ] 7.1.3 Verify Telegram Gateway is running and healthy
- [ ] 7.1.4 Verify Gateway has recent messages
- [ ] 7.1.5 Create Git branch: `feat/adapt-tp-capital-consume-gateway`

### 7.2 Deployment
- [ ] 7.2.1 Stop TP Capital service
  ```bash
  pkill -f "node.*tp-capital"
  ```
- [ ] 7.2.2 Pull latest code
  ```bash
  git checkout feat/adapt-tp-capital-consume-gateway
  git pull
  ```
- [ ] 7.2.3 Install dependencies (if any new)
  ```bash
  cd apps/tp-capital && npm install
  ```
- [ ] 7.2.4 Update `.env` with new variables
- [ ] 7.2.5 Start TP Capital service
  ```bash
  npm run start
  ```
- [ ] 7.2.6 Monitor logs for startup
  ```bash
  tail -f logs/combined.log
  ```

### 7.3 Post-Deployment Validation
- [ ] 7.3.1 Verify polling worker started (check logs)
- [ ] 7.3.2 Verify Gateway DB connection (check health endpoint)
- [ ] 7.3.3 Send test signal to Telegram channel
- [ ] 7.3.4 Verify signal processed within 5s
- [ ] 7.3.5 Verify signal appears in Dashboard
- [ ] 7.3.6 Monitor for 30 minutes (no errors)
- [ ] 7.3.7 Check Prometheus metrics

### 7.4 Rollback Plan
- [ ] 7.4.1 Document rollback steps
  ```bash
  # Stop TP Capital
  pkill -f "node.*tp-capital"

  # Restore .env backup
  cp apps/tp-capital/.env.backup apps/tp-capital/.env

  # Checkout previous working commit
  git checkout <previous-commit-hash>

  # Restart TP Capital
  cd apps/tp-capital && npm run start
  ```
- [ ] 7.4.2 Test rollback procedure in staging (if available)

## 8. Post-Implementation

- [ ] 8.1 Monitor production for 7 days
  - [ ] Daily check: Polling lag metrics
  - [ ] Daily check: Failed messages count
  - [ ] Daily check: Gateway DB connection stability
- [ ] 8.2 Collect performance metrics
  - [ ] Average processing time per message
  - [ ] Polling lag p50, p95, p99
  - [ ] Messages processed per day
- [ ] 8.3 Create post-mortem document (if any issues)
- [ ] 8.4 Archive OpenSpec proposal
  ```bash
  openspec archive adapt-tp-capital-consume-gateway
  ```
- [ ] 8.5 Update specs with changes
  ```bash
  # specs/tp-capital-api/spec.md will be updated by archiver
  ```

## 9. Future Enhancements (Optional)

- [ ] 9.1 Implement configurable historical message backfill
  - [ ] Add `PROCESS_MESSAGES_SINCE` environment variable
  - [ ] Add backfill CLI command
- [ ] 9.2 Add HTTP push endpoint for real-time processing
  - [ ] Create `/ingest` endpoint in TP Capital
  - [ ] Configure Gateway to POST to TP Capital
  - [ ] Keep polling as fallback
- [ ] 9.3 Add multi-channel support
  - [ ] Configurable channel list
  - [ ] Channel-specific parsing rules
- [ ] 9.4 Implement parallel batch processing
  - [ ] Use `Promise.all()` for batch
  - [ ] Connection pool size tuning
