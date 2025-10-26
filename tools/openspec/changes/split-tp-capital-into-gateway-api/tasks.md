# Implementation Tasks: Split TP Capital into Gateway + API

**Change ID**: `split-tp-capital-into-gateway-api`
**Status**: Pending Approval
**Estimated Effort**: 12-16 hours

---

## Phase 1: Pre-Migration (30 minutes)

### 1.1 Backup Current State
- [ ] 1.1.1 Backup Telegram session files
  ```bash
  tar -czf /backup/tp-capital-sessions-$(date +%Y%m%d).tar.gz \
    apps/tp-capital/.session
  ```
- [ ] 1.1.2 Backup current `.env` file
  ```bash
  cp apps/tp-capital/.env /backup/tp-capital.env.backup
  ```
- [ ] 1.1.3 Export TimescaleDB data
  ```bash
  pg_dump -h localhost -p 5433 -U timescale \
    -t tp_capital.tp_capital_signals \
    -t tp_capital.forwarded_messages \
    APPS-TPCAPITAL > /backup/tp-capital-db-$(date +%Y%m%d).sql
  ```
- [ ] 1.1.4 Verify all backups created successfully
  ```bash
  ls -lh /backup/tp-capital-*
  ```

### 1.2 Verify Current Environment
- [ ] 1.2.1 Check TP Capital is running: `curl http://localhost:4005/health`
- [ ] 1.2.2 Check TimescaleDB is accessible: `psql -h localhost -p 5433 -U timescale APPS-TPCAPITAL -c "SELECT 1"`
- [ ] 1.2.3 Test end-to-end flow: Send test message to Telegram, verify it appears in Dashboard
- [ ] 1.2.4 Document current signal count: `SELECT COUNT(*) FROM tp_capital.tp_capital_signals`

---

## Phase 2: Directory Structure (15 minutes)

### 2.1 Create Gateway Directory
- [ ] 2.1.1 Create Gateway source directories
  ```bash
  mkdir -p apps/tp-capital/telegram-gateway/src
  mkdir -p apps/tp-capital/telegram-gateway/data
  mkdir -p apps/tp-capital/telegram-gateway/.session
  ```
- [ ] 2.1.2 Create Gateway config files
  ```bash
  touch apps/tp-capital/telegram-gateway/package.json
  touch apps/tp-capital/telegram-gateway/.env
  touch apps/tp-capital/telegram-gateway/.env.example
  touch apps/tp-capital/telegram-gateway/.gitignore
  touch apps/tp-capital/telegram-gateway/README.md
  ```

### 2.2 Create API Directory
- [ ] 2.2.1 Create API source directories
  ```bash
  mkdir -p apps/tp-capital/api/src/routes
  mkdir -p apps/tp-capital/api/src/middleware
  mkdir -p apps/tp-capital/api/src/services
  ```
- [ ] 2.2.2 Create API config files
  ```bash
  touch apps/tp-capital/api/package.json
  touch apps/tp-capital/api/.env
  touch apps/tp-capital/api/.env.example
  touch apps/tp-capital/api/.dockerignore
  touch apps/tp-capital/api/Dockerfile
  touch apps/tp-capital/api/README.md
  ```

### 2.3 Create Shared Directory
- [ ] 2.3.1 Create shared utilities directory
  ```bash
  mkdir -p apps/tp-capital/shared
  touch apps/tp-capital/shared/types.js
  touch apps/tp-capital/shared/validators.js
  touch apps/tp-capital/shared/constants.js
  ```

---

## Phase 3: Code Migration (2-3 hours)

### 3.1 Move Telegram Code to Gateway
- [ ] 3.1.1 Copy Telegram integration files
  ```bash
  cp apps/tp-capital/src/telegramIngestionManual.js telegram-gateway/src/telegramIngestion.js
  cp apps/tp-capital/src/telegramUserForwarderPolling.js telegram-gateway/src/telegramForwarder.js
  ```
- [ ] 3.1.2 Move session files
  ```bash
  cp -r apps/tp-capital/.session/* telegram-gateway/.session/
  ```
- [ ] 3.1.3 Copy config and logger
  ```bash
  cp apps/tp-capital/src/config.js telegram-gateway/src/
  cp apps/tp-capital/src/logger.js telegram-gateway/src/
  ```
- [ ] 3.1.4 Update imports in Telegram files to remove DB dependencies

### 3.2 Create Gateway-Specific Files
- [ ] 3.2.1 Create `telegram-gateway/src/index.js` (entry point)
- [ ] 3.2.2 Create `telegram-gateway/src/httpPublisher.js` (publishes to API)
- [ ] 3.2.3 Create `telegram-gateway/src/retryQueue.js` (failure queue management)
- [ ] 3.2.4 Create `telegram-gateway/src/metrics.js` (Prometheus metrics)
- [ ] 3.2.5 Update `telegram-gateway/src/config.js` (Gateway-specific config)

### 3.3 Move API Code
- [ ] 3.3.1 Copy server and routes
  ```bash
  cp apps/tp-capital/src/server.js api/src/
  ```
- [ ] 3.3.2 Copy services to API
  ```bash
  cp apps/tp-capital/src/timescaleClient.js api/src/services/
  cp apps/tp-capital/src/parseSignal.js api/src/services/
  ```
- [ ] 3.3.3 Copy utilities
  ```bash
  cp apps/tp-capital/src/logger.js api/src/
  cp apps/tp-capital/src/config.js api/src/
  cp apps/tp-capital/src/timeUtils.js api/src/services/
  ```
- [ ] 3.3.4 Remove Telegram integration code from `api/src/server.js`

### 3.4 Create API-Specific Files
- [ ] 3.4.1 Create `api/src/routes/ingestion.js` (Gateway ingestion endpoint)
- [ ] 3.4.2 Create `api/src/routes/signals.js` (existing signals routes)
- [ ] 3.4.3 Create `api/src/routes/channels.js` (existing channels CRUD)
- [ ] 3.4.4 Create `api/src/routes/bots.js` (existing bots CRUD)
- [ ] 3.4.5 Create `api/src/routes/health.js` (health check endpoint)
- [ ] 3.4.6 Create `api/src/middleware/authGateway.js` (validates X-Gateway-Token)
- [ ] 3.4.7 Create `api/src/middleware/idempotency.js` (prevents duplicates)
- [ ] 3.4.8 Update `api/src/config.js` (API-specific config, remove Telegram vars)

### 3.5 Create Shared Code
- [ ] 3.5.1 Extract common types to `shared/types.js`
- [ ] 3.5.2 Extract validators to `shared/validators.js` (message validation)
- [ ] 3.5.3 Extract constants to `shared/constants.js` (signal types, status enums)

---

## Phase 4: Configuration (30 minutes)

### 4.1 Generate Secrets
- [ ] 4.1.1 Generate Gateway secret token: `openssl rand -hex 32 > .gateway-token`
- [ ] 4.1.2 Store token securely (password manager or encrypted file)

### 4.2 Configure Gateway
- [ ] 4.2.1 Create `telegram-gateway/.env` with Telegram credentials
  ```bash
  # Copy from backup
  cp /backup/tp-capital.env.backup telegram-gateway/.env
  # Add new variables
  echo "GATEWAY_PORT=4006" >> telegram-gateway/.env
  echo "API_ENDPOINT=http://localhost:4005/ingest" >> telegram-gateway/.env
  echo "API_SECRET_TOKEN=$(cat .gateway-token)" >> telegram-gateway/.env
  echo "MAX_RETRY_ATTEMPTS=3" >> telegram-gateway/.env
  echo "RETRY_DELAY_MS=5000" >> telegram-gateway/.env
  echo "FAILURE_QUEUE_PATH=./data/failure-queue.jsonl" >> telegram-gateway/.env
  ```
- [ ] 4.2.2 Create `telegram-gateway/.env.example` (without sensitive values)
- [ ] 4.2.3 Update `telegram-gateway/package.json` with correct dependencies
- [ ] 4.2.4 Create `telegram-gateway/.gitignore`
  ```
  node_modules/
  .env
  .session/
  data/
  *.log
  ```

### 4.3 Configure API
- [ ] 4.3.1 Create `api/.env` with database credentials
  ```bash
  cat > api/.env << EOF
  PORT=4005
  NODE_ENV=production
  TIMESCALEDB_HOST=localhost
  TIMESCALEDB_PORT=5433
  TIMESCALEDB_DATABASE=APPS-TPCAPITAL
  TIMESCALEDB_USER=timescale
  TIMESCALEDB_PASSWORD=change_me_password
  GATEWAY_SECRET_TOKEN=$(cat .gateway-token)
  CORS_ORIGIN=http://localhost:3103,http://localhost:3004
  RATE_LIMIT_WINDOW_MS=60000
  RATE_LIMIT_MAX=120
  EOF
  ```
- [ ] 4.3.2 Create `api/.env.example` (without sensitive values)
- [ ] 4.3.3 Update `api/package.json` with correct dependencies
- [ ] 4.3.4 Create `api/.gitignore`

### 4.4 Validate Configuration
- [ ] 4.4.1 Verify `GATEWAY_SECRET_TOKEN` matches in both `.env` files
  ```bash
  diff <(grep GATEWAY_SECRET_TOKEN telegram-gateway/.env) \
       <(grep GATEWAY_SECRET_TOKEN api/.env)
  ```
- [ ] 4.4.2 Validate `.env` files have all required variables
  ```bash
  scripts/validate-env.sh
  ```

---

## Phase 5: Database Migration (30 minutes)

### 5.1 Add message_id Column
- [ ] 5.1.1 Connect to TimescaleDB
  ```bash
  psql -h localhost -p 5433 -U timescale APPS-TPCAPITAL
  ```
- [ ] 5.1.2 Run migration SQL
  ```sql
  -- Add message_id column
  ALTER TABLE tp_capital.tp_capital_signals
  ADD COLUMN message_id BIGINT;

  -- Create unique constraint
  ALTER TABLE tp_capital.tp_capital_signals
  ADD CONSTRAINT uk_signal_message
  UNIQUE (channel_id, message_id);

  -- Create index for idempotency checks
  CREATE INDEX idx_tp_capital_signals_idempotency
  ON tp_capital.tp_capital_signals (channel_id, message_id, ingested_at);
  ```
- [ ] 5.1.3 Verify migration
  ```sql
  \d tp_capital.tp_capital_signals
  -- Should show message_id column and uk_signal_message constraint
  ```

### 5.2 Test Idempotency
- [ ] 5.2.1 Insert test signal
  ```sql
  INSERT INTO tp_capital.tp_capital_signals
    (channel, channel_id, message_id, asset, signal_type, price, raw_message, ingested_at)
  VALUES
    ('Test Channel', -1001234567890, 99999, 'PETR4', 'BUY', 30.50, 'Test message', NOW());
  ```
- [ ] 5.2.2 Attempt duplicate insert (should fail)
  ```sql
  INSERT INTO tp_capital.tp_capital_signals
    (channel, channel_id, message_id, asset, signal_type, price, raw_message, ingested_at)
  VALUES
    ('Test Channel', -1001234567890, 99999, 'PETR4', 'BUY', 30.50, 'Test message', NOW());
  -- Should error: duplicate key value violates unique constraint "uk_signal_message"
  ```
- [ ] 5.2.3 Clean up test data
  ```sql
  DELETE FROM tp_capital.tp_capital_signals WHERE message_id = 99999;
  ```

---

## Phase 6: Docker Containerization (1 hour)

### 6.1 Create API Dockerfile
- [ ] 6.1.1 Create `api/Dockerfile` (multi-stage build)
- [ ] 6.1.2 Create `api/.dockerignore`
  ```
  node_modules/
  .env
  .env.local
  *.log
  npm-debug.log*
  .DS_Store
  coverage/
  .vscode/
  ```
- [ ] 6.1.3 Test Dockerfile locally
  ```bash
  cd apps/tp-capital/api
  docker build -t tp-capital-api:test .
  ```
- [ ] 6.1.4 Verify image size < 200MB
  ```bash
  docker images tp-capital-api:test
  ```

### 6.2 Create Docker Compose File
- [ ] 6.2.1 Create `tools/compose/docker-compose.tp-capital.yml`
- [ ] 6.2.2 Configure networks (connect to existing `tradingsystem` network)
- [ ] 6.2.3 Configure volumes (if needed for logs)
- [ ] 6.2.4 Configure environment variables (use `.env` file)
- [ ] 6.2.5 Configure health checks
- [ ] 6.2.6 Configure restart policy: `unless-stopped`

### 6.3 Test Container Locally
- [ ] 6.3.1 Build and start container
  ```bash
  docker compose -f tools/compose/docker-compose.tp-capital.yml build
  docker compose -f tools/compose/docker-compose.tp-capital.yml up
  ```
- [ ] 6.3.2 Check container health
  ```bash
  docker inspect tp-capital-api --format='{{.State.Health.Status}}'
  # Should output: healthy
  ```
- [ ] 6.3.3 Test API endpoint
  ```bash
  curl http://localhost:4005/health
  # Should return: {"status":"ok","timescale":true}
  ```
- [ ] 6.3.4 Check logs
  ```bash
  docker logs tp-capital-api
  # Should show successful startup and TimescaleDB connection
  ```
- [ ] 6.3.5 Stop container
  ```bash
  docker compose -f tools/compose/docker-compose.tp-capital.yml down
  ```

---

## Phase 7: Gateway systemd Service (30 minutes)

### 7.1 Create systemd Unit File
- [ ] 7.1.1 Create `telegram-gateway/tp-capital-gateway.service`
- [ ] 7.1.2 Configure user/group (use `trading` user or current user)
- [ ] 7.1.3 Configure working directory
- [ ] 7.1.4 Configure restart policy: `on-failure`, `RestartSec=10s`
- [ ] 7.1.5 Configure resource limits: `MemoryMax=500M`, `CPUQuota=50%`
- [ ] 7.1.6 Configure security: `NoNewPrivileges=true`, `PrivateTmp=true`

### 7.2 Install systemd Service
- [ ] 7.2.1 Copy service file
  ```bash
  sudo cp telegram-gateway/tp-capital-gateway.service /etc/systemd/system/
  ```
- [ ] 7.2.2 Reload systemd daemon
  ```bash
  sudo systemctl daemon-reload
  ```
- [ ] 7.2.3 Enable auto-start on boot
  ```bash
  sudo systemctl enable tp-capital-gateway
  ```

### 7.3 Test systemd Service
- [ ] 7.3.1 Start service
  ```bash
  sudo systemctl start tp-capital-gateway
  ```
- [ ] 7.3.2 Check status
  ```bash
  sudo systemctl status tp-capital-gateway
  # Should show: Active: active (running)
  ```
- [ ] 7.3.3 View logs
  ```bash
  sudo journalctl -u tp-capital-gateway -n 50
  # Should show successful startup and Telegram connection
  ```
- [ ] 7.3.4 Test health endpoint
  ```bash
  curl http://localhost:4006/health
  # Should return: {"status":"ok"}
  ```
- [ ] 7.3.5 Stop service for now (will restart in Phase 9)
  ```bash
  sudo systemctl stop tp-capital-gateway
  ```

---

## Phase 8: Integration Testing (1-2 hours)

### 8.1 Unit Tests
- [ ] 8.1.1 Test Gateway: `httpPublisher.js`
  - [ ] Test successful publish (mock API returns 200)
  - [ ] Test retry logic (mock API returns 500, then 200)
  - [ ] Test max retries exceeded (mock API always returns 500)
  - [ ] Test failure queue append
- [ ] 8.1.2 Test Gateway: `retryQueue.js`
  - [ ] Test append to JSONL
  - [ ] Test readAll (iterate through queue)
  - [ ] Test clear (truncate file)
- [ ] 8.1.3 Test API: `middleware/authGateway.js`
  - [ ] Test valid token (should call next())
  - [ ] Test missing token (should return 401)
  - [ ] Test invalid token (should return 401)
- [ ] 8.1.4 Test API: `middleware/idempotency.js`
  - [ ] Test new message (should call next())
  - [ ] Test duplicate message (should return 200 with skipped=true)
- [ ] 8.1.5 Test API: `services/parseSignal.js`
  - [ ] Test valid BUY signal
  - [ ] Test valid SELL signal
  - [ ] Test invalid signal (should handle gracefully)

### 8.2 Integration Tests (Local)
- [ ] 8.2.1 Start TimescaleDB (if not running)
  ```bash
  docker compose -f tools/compose/docker-compose.timescale.yml up -d
  ```
- [ ] 8.2.2 Start API container
  ```bash
  docker compose -f tools/compose/docker-compose.tp-capital.yml up -d
  ```
- [ ] 8.2.3 Start Gateway locally (NOT systemd yet)
  ```bash
  cd apps/tp-capital/telegram-gateway
  node src/index.js
  ```
- [ ] 8.2.4 **Test 1: End-to-end message flow**
  - [ ] Send test message to monitored Telegram channel
  - [ ] Check Gateway logs: `tail -f telegram-gateway/logs/gateway.log`
  - [ ] Check API logs: `docker logs -f tp-capital-api`
  - [ ] Verify signal in TimescaleDB:
    ```sql
    SELECT * FROM tp_capital.tp_capital_signals ORDER BY ingested_at DESC LIMIT 10;
    ```
  - [ ] Verify signal appears in Dashboard: `http://localhost:3103/#/tp-capital/signals`
- [ ] 8.2.5 **Test 2: API restart (Gateway continues)**
  - [ ] Restart API container:
    ```bash
    docker restart tp-capital-api
    ```
  - [ ] Send test message to Telegram
  - [ ] Verify Gateway logs show retry attempts
  - [ ] Wait for API to be healthy (30s)
  - [ ] Verify message eventually persists to DB
- [ ] 8.2.6 **Test 3: Idempotency check**
  - [ ] Send same message twice to Telegram (or replay from failure queue)
  - [ ] Verify only 1 signal in DB (no duplicates)
  - [ ] Check API logs for "Duplicate message skipped" log
- [ ] 8.2.7 **Test 4: Failure queue**
  - [ ] Stop API container:
    ```bash
    docker stop tp-capital-api
    ```
  - [ ] Send test message to Telegram
  - [ ] Verify message saved to failure queue:
    ```bash
    cat telegram-gateway/data/failure-queue.jsonl
    ```
  - [ ] Start API container:
    ```bash
    docker start tp-capital-api
    ```
  - [ ] Run recovery script:
    ```bash
    node scripts/recover-failure-queue.js
    ```
  - [ ] Verify message persisted to DB
  - [ ] Verify failure queue cleared
- [ ] 8.2.8 **Test 5: Authentication failure**
  - [ ] Temporarily change `GATEWAY_SECRET_TOKEN` in Gateway `.env`
  - [ ] Restart Gateway
  - [ ] Send test message
  - [ ] Verify API logs show 401 Unauthorized
  - [ ] Restore correct token, restart Gateway
  - [ ] Verify message now persists
- [ ] 8.2.9 **Test 6: Health checks**
  - [ ] Check Gateway health: `curl http://localhost:4006/health`
  - [ ] Check API health: `curl http://localhost:4005/health`
  - [ ] Check TimescaleDB connection in API health response
- [ ] 8.2.10 **Test 7: Prometheus metrics**
  - [ ] Check Gateway metrics: `curl http://localhost:4006/metrics | grep telegram_`
  - [ ] Check API metrics: `curl http://localhost:4005/metrics | grep api_`
  - [ ] Verify counters increment after sending test message

### 8.3 Performance Tests
- [ ] 8.3.1 **Test latency**: Send 10 messages, measure time to appear in DB
  - [ ] Target: < 2 seconds (Telegram → Dashboard)
- [ ] 8.3.2 **Test throughput**: Send 100 messages in 1 minute
  - [ ] Verify all 100 persisted to DB
  - [ ] Check Gateway memory usage: < 200MB
  - [ ] Check API memory usage: < 200MB
- [ ] 8.3.3 **Test retry overhead**: Simulate API failures
  - [ ] Stop API, send 50 messages
  - [ ] Start API after 1 minute
  - [ ] Verify all 50 eventually persisted
  - [ ] Check retry metrics: `telegram_retry_attempts_total`

---

## Phase 9: Production Deployment (30 minutes)

### 9.1 Stop Old Monolith
- [ ] 9.1.1 Verify backups are complete (Phase 1)
- [ ] 9.1.2 Stop old TP Capital process
  ```bash
  # Find PID
  lsof -i :4005
  # Kill process
  pkill -f "node.*tp-capital"
  ```
- [ ] 9.1.3 Verify port 4005 is free
  ```bash
  lsof -i :4005
  # Should return nothing
  ```
- [ ] 9.1.4 Verify port 4006 is free
  ```bash
  lsof -i :4006
  # Should return nothing
  ```

### 9.2 Deploy Gateway (systemd)
- [ ] 9.2.1 Start Gateway service
  ```bash
  sudo systemctl start tp-capital-gateway
  ```
- [ ] 9.2.2 Verify service is running
  ```bash
  sudo systemctl status tp-capital-gateway
  ```
- [ ] 9.2.3 Check logs for errors
  ```bash
  sudo journalctl -u tp-capital-gateway -n 100 --no-pager
  ```
- [ ] 9.2.4 Test health endpoint
  ```bash
  curl http://localhost:4006/health
  ```
- [ ] 9.2.5 Verify Telegram connection status in logs
  ```bash
  sudo journalctl -u tp-capital-gateway | grep "Telegram connected"
  ```

### 9.3 Deploy API (Docker)
- [ ] 9.3.1 Start API container
  ```bash
  docker compose -f tools/compose/docker-compose.tp-capital.yml up -d
  ```
- [ ] 9.3.2 Verify container is running
  ```bash
  docker ps | grep tp-capital-api
  ```
- [ ] 9.3.3 Check container health
  ```bash
  docker inspect tp-capital-api --format='{{.State.Health.Status}}'
  # Should output: healthy
  ```
- [ ] 9.3.4 Check logs for errors
  ```bash
  docker logs tp-capital-api --tail 100
  ```
- [ ] 9.3.5 Test health endpoint
  ```bash
  curl http://localhost:4005/health
  ```
- [ ] 9.3.6 Verify TimescaleDB connection in health response

### 9.4 Smoke Test
- [ ] 9.4.1 Send test message to Telegram channel
- [ ] 9.4.2 Verify Gateway receives message (check logs)
  ```bash
  sudo journalctl -u tp-capital-gateway -f | grep "Message received"
  ```
- [ ] 9.4.3 Verify Gateway publishes to API (check logs)
  ```bash
  sudo journalctl -u tp-capital-gateway -f | grep "Message published"
  ```
- [ ] 9.4.4 Verify API persists to DB (check logs)
  ```bash
  docker logs -f tp-capital-api | grep "Signal inserted"
  ```
- [ ] 9.4.5 Verify signal appears in Dashboard
  ```bash
  # Open browser: http://localhost:3103/#/tp-capital/signals
  # Verify latest signal is visible
  ```
- [ ] 9.4.6 Verify end-to-end latency < 5 seconds

---

## Phase 10: Script Updates (1 hour)

### 10.1 Update Universal Startup Script
- [ ] 10.1.1 Edit `scripts/universal/start.sh`
- [ ] 10.1.2 Add detection for `tp-capital-api` container
  ```bash
  # Check if container exists
  if docker ps -a | grep -q tp-capital-api; then
    echo "Starting TP Capital API container..."
    docker compose -f tools/compose/docker-compose.tp-capital.yml up -d
  fi
  ```
- [ ] 10.1.3 Add detection for Gateway systemd service
  ```bash
  # Check if systemd service exists
  if systemctl list-unit-files | grep -q tp-capital-gateway; then
    echo "Starting TP Capital Gateway..."
    sudo systemctl start tp-capital-gateway
  fi
  ```
- [ ] 10.1.4 Test startup script
  ```bash
  bash scripts/universal/start.sh
  # Verify both Gateway and API start successfully
  ```

### 10.2 Update Universal Stop Script
- [ ] 10.2.1 Edit `scripts/universal/stop.sh`
- [ ] 10.2.2 Add stop logic for API container
  ```bash
  if docker ps | grep -q tp-capital-api; then
    echo "Stopping TP Capital API container..."
    docker compose -f tools/compose/docker-compose.tp-capital.yml down
  fi
  ```
- [ ] 10.2.3 Add stop logic for Gateway service
  ```bash
  if systemctl is-active --quiet tp-capital-gateway; then
    echo "Stopping TP Capital Gateway..."
    sudo systemctl stop tp-capital-gateway
  fi
  ```
- [ ] 10.2.4 Test stop script
  ```bash
  bash scripts/universal/stop.sh
  # Verify both Gateway and API stop successfully
  ```

### 10.3 Update Status Script
- [ ] 10.3.1 Edit `scripts/universal/status.sh`
- [ ] 10.3.2 Add status check for Gateway
  ```bash
  echo -n "TP Capital Gateway (4006): "
  if systemctl is-active --quiet tp-capital-gateway; then
    echo "✅ Running"
  else
    echo "❌ Not Running"
  fi
  ```
- [ ] 10.3.3 Add status check for API
  ```bash
  echo -n "TP Capital API (4005): "
  if docker ps | grep -q tp-capital-api; then
    echo "✅ Running"
  else
    echo "❌ Not Running"
  fi
  ```
- [ ] 10.3.4 Test status script
  ```bash
  bash scripts/universal/status.sh
  ```

### 10.4 Update Health Check Script
- [ ] 10.4.1 Edit `scripts/maintenance/health-check-all.sh`
- [ ] 10.4.2 Add Gateway health check
  ```bash
  check_service "TP Capital Gateway" "http://localhost:4006/health"
  ```
- [ ] 10.4.3 Update API health check (new container-based)
  ```bash
  # Check container health first
  if docker inspect tp-capital-api --format='{{.State.Health.Status}}' 2>/dev/null | grep -q healthy; then
    check_service "TP Capital API" "http://localhost:4005/health"
  else
    echo "❌ TP Capital API container unhealthy"
  fi
  ```
- [ ] 10.4.4 Test health check script
  ```bash
  bash scripts/maintenance/health-check-all.sh
  ```

### 10.5 Create Recovery Script
- [ ] 10.5.1 Create `scripts/recover-failure-queue.js`
- [ ] 10.5.2 Implement queue reading and replay logic
- [ ] 10.5.3 Add logging and error handling
- [ ] 10.5.4 Test with mock failure queue
  ```bash
  # Create test queue
  echo '{"messageId":123,"text":"Test"}' > telegram-gateway/data/failure-queue.jsonl
  # Run recovery
  node scripts/recover-failure-queue.js
  # Verify queue cleared
  cat telegram-gateway/data/failure-queue.jsonl
  # Should be empty
  ```

---

## Phase 11: Documentation (2-3 hours)

### 11.1 Update Core Documentation
- [ ] 11.1.1 Update `CLAUDE.md`
  - [ ] Remove monolith reference (port 4005 = single service)
  - [ ] Add Gateway (port 4006) and API (port 4005) entries
  - [ ] Update architecture diagram
  - [ ] Update startup instructions
- [ ] 11.1.2 Update `INVENTARIO-SERVICOS.md`
  - [ ] Add Gateway entry (Local Services section)
  - [ ] Modify API entry (change from local to container)
  - [ ] Update port mapping table

### 11.2 Create Service-Specific Guides
- [ ] 11.2.1 Create `apps/tp-capital/telegram-gateway/README.md`
  - [ ] Service overview
  - [ ] Installation steps (systemd)
  - [ ] Configuration (`.env` variables)
  - [ ] Troubleshooting guide
  - [ ] Reauthorization process (phone + 2FA)
- [ ] 11.2.2 Create `apps/tp-capital/api/README.md`
  - [ ] Service overview
  - [ ] Build and run instructions
  - [ ] Environment variables
  - [ ] API endpoints documentation
  - [ ] Health checks and monitoring

### 11.3 Update Operational Guides
- [ ] 11.3.1 Update `docs/context/ops/service-startup-guide.md`
  - [ ] Add Gateway startup section
  - [ ] Update TP Capital startup (now 2 services)
  - [ ] Add troubleshooting for Gateway ↔ API communication
- [ ] 11.3.2 Update `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`
  - [ ] Document separate `.env` files
  - [ ] Explain `GATEWAY_SECRET_TOKEN` synchronization
  - [ ] Add token rotation guide

### 11.4 Create Runbooks
- [ ] 11.4.1 Create `docs/context/ops/runbooks/tp-capital-gateway-reauth.md`
  - [ ] Steps for Telegram reauthorization
  - [ ] When to reauthorize (session expired, new device)
  - [ ] Phone number + 2FA code process
  - [ ] Backup session files procedure
- [ ] 11.4.2 Create `docs/context/ops/runbooks/tp-capital-failure-recovery.md`
  - [ ] Failure queue recovery process
  - [ ] When to run recovery script
  - [ ] Monitoring failure queue size
- [ ] 11.4.3 Update `docs/context/ops/runbooks/tp-capital-restart.md`
  - [ ] New restart procedure (Gateway + API)
  - [ ] Graceful shutdown steps
  - [ ] Verification checklist

### 11.5 Update Architecture Documentation
- [ ] 11.5.1 Update `docs/context/backend/guides/guide-tp-capital.md`
  - [ ] Rewrite with new architecture
  - [ ] Add Gateway ↔ API communication flow diagram
  - [ ] Update deployment section
  - [ ] Add troubleshooting section
- [ ] 11.5.2 Update `docs/context/backend/architecture/overview.md`
  - [ ] Add Gateway as new component
  - [ ] Update TP Capital API description (containerized)
  - [ ] Update architecture diagram

### 11.6 Create ADR (Architecture Decision Record)
- [ ] 11.6.1 Create `docs/context/backend/architecture/decisions/2025-10-25-adr-00X-split-tp-capital.md`
  - [ ] Context: Why split was needed
  - [ ] Decision: Two-layer architecture
  - [ ] Consequences: Benefits and trade-offs
  - [ ] Alternatives considered
  - [ ] PlantUML diagram showing before/after

---

## Phase 12: Monitoring Setup (1 hour)

### 12.1 Prometheus Configuration
- [ ] 12.1.1 Add Gateway scrape target to `tools/monitoring/prometheus/prometheus.yml`
  ```yaml
  - job_name: 'tp-capital-gateway'
    static_configs:
      - targets: ['localhost:4006']
        labels:
          service: 'tp-capital-gateway'
  ```
- [ ] 12.1.2 Verify API scrape target exists
  ```yaml
  - job_name: 'tp-capital-api'
    static_configs:
      - targets: ['localhost:4005']
        labels:
          service: 'tp-capital-api'
  ```
- [ ] 12.1.3 Restart Prometheus
  ```bash
  docker compose -f tools/compose/docker-compose.monitoring.yml restart prometheus
  ```
- [ ] 12.1.4 Verify targets in Prometheus UI
  ```bash
  # Open: http://localhost:9090/targets
  # Verify both tp-capital-gateway and tp-capital-api are UP
  ```

### 12.2 Grafana Dashboard
- [ ] 12.2.1 Create new dashboard: "TP Capital - Gateway & API"
- [ ] 12.2.2 Add panels:
  - [ ] Connection Status (gauge): `telegram_connection_status`
  - [ ] Message Throughput (graph): `rate(telegram_messages_received_total[5m])`
  - [ ] Publish Success Rate (graph): `rate(telegram_messages_published_total[5m]) / rate(telegram_messages_received_total[5m])`
  - [ ] Retry Attempts (stacked graph): `telegram_retry_attempts_total` by `attempt_number`
  - [ ] Failure Queue Size (gauge): `telegram_failure_queue_size`
  - [ ] API Latency (heatmap): `histogram_quantile(0.95, api_http_request_duration_seconds)`
  - [ ] Database Errors (counter): `api_timescaledb_errors_total`
- [ ] 12.2.3 Save dashboard JSON to `tools/monitoring/grafana/dashboards/tp-capital.json`
- [ ] 12.2.4 Import dashboard into Grafana: `http://localhost:3000/dashboards`

### 12.3 Alerting Rules
- [ ] 12.3.1 Create alerting rules file: `tools/monitoring/prometheus/rules/tp-capital.yml`
- [ ] 12.3.2 Add alerts:
  ```yaml
  groups:
    - name: tp_capital
      interval: 30s
      rules:
        - alert: TelegramGatewayDown
          expr: up{job="tp-capital-gateway"} == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "TP Capital Gateway is down"

        - alert: TelegramConnectionLost
          expr: telegram_connection_status == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Telegram connection lost"

        - alert: HighPublishFailureRate
          expr: rate(telegram_publish_failures_total[5m]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High Gateway → API publish failure rate"

        - alert: FailureQueueGrowing
          expr: telegram_failure_queue_size > 100
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Failure queue has over 100 messages"

        - alert: APIHighErrorRate
          expr: rate(api_timescaledb_errors_total[5m]) > 0.05
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "TP Capital API experiencing high database error rate"
  ```
- [ ] 12.3.3 Reload Prometheus rules
  ```bash
  docker compose -f tools/compose/docker-compose.monitoring.yml exec prometheus kill -HUP 1
  ```
- [ ] 12.3.4 Verify alerts in Prometheus UI: `http://localhost:9090/alerts`

---

## Phase 13: Validation & Cleanup (30 minutes)

### 13.1 Final Smoke Tests
- [ ] 13.1.1 Restart Gateway and API (simulate deploy)
  ```bash
  sudo systemctl restart tp-capital-gateway
  docker compose -f tools/compose/docker-compose.tp-capital.yml restart
  ```
- [ ] 13.1.2 Wait 1 minute for services to stabilize
- [ ] 13.1.3 Send 5 test messages to Telegram channel
- [ ] 13.1.4 Verify all 5 signals appear in Dashboard within 10 seconds
- [ ] 13.1.5 Verify no errors in logs
  ```bash
  sudo journalctl -u tp-capital-gateway --since "5 minutes ago" | grep -i error
  docker logs tp-capital-api --since 5m | grep -i error
  ```

### 13.2 Performance Validation
- [ ] 13.2.1 Check Gateway memory usage
  ```bash
  systemctl status tp-capital-gateway | grep Memory
  # Should be < 200MB
  ```
- [ ] 13.2.2 Check API memory usage
  ```bash
  docker stats tp-capital-api --no-stream
  # Should be < 200MB
  ```
- [ ] 13.2.3 Check end-to-end latency (Telegram → Dashboard)
  - [ ] Send message with timestamp
  - [ ] Measure time until visible in Dashboard
  - [ ] Target: < 5 seconds

### 13.3 Cleanup Old Monolith
- [ ] 13.3.1 Verify old TP Capital directory is not being used
  ```bash
  lsof | grep "apps/tp-capital/src"
  # Should return nothing (no processes using old files)
  ```
- [ ] 13.3.2 Archive old monolith code
  ```bash
  tar -czf /backup/tp-capital-monolith-$(date +%Y%m%d).tar.gz \
    apps/tp-capital/src/
  ```
- [ ] 13.3.3 Remove old monolith code (ONLY after confirming new system works)
  ```bash
  # ⚠️ ONLY run after 7 days of successful operation
  # rm -rf apps/tp-capital/src/
  ```

### 13.4 Update Project Inventory
- [ ] 13.4.1 Update `INVENTARIO-SERVICOS.md` with final status
- [ ] 13.4.2 Update `API-INTEGRATION-STATUS.md` with new architecture
- [ ] 13.4.3 Update `README.md` if it references TP Capital

---

## Post-Deployment Monitoring (7 days)

### Week 1: Daily Checks
- [ ] Day 1: Monitor Gateway/API logs hourly for first 24h
  ```bash
  sudo journalctl -u tp-capital-gateway -f &
  docker logs -f tp-capital-api &
  ```
- [ ] Day 1: Check Grafana dashboard every 2 hours
- [ ] Day 2-7: Check Grafana dashboard daily
- [ ] Day 2-7: Check failure queue size daily
  ```bash
  wc -l < apps/tp-capital/telegram-gateway/data/failure-queue.jsonl
  # Should be 0 (empty)
  ```
- [ ] Day 7: Review Prometheus alerts history
  ```bash
  # Check if any alerts fired: http://localhost:9090/alerts
  ```

### Week 1: Metrics to Track
- [ ] Container restart count (API)
  ```bash
  docker inspect tp-capital-api --format='{{.RestartCount}}'
  # Target: 0 restarts
  ```
- [ ] Gateway uptime
  ```bash
  systemctl show tp-capital-gateway --property=ActiveEnterTimestamp
  # Should match deployment timestamp (no restarts)
  ```
- [ ] Message processing rate
  ```bash
  # Query Prometheus: rate(telegram_messages_received_total[1d])
  # Should match expected channel volume
  ```
- [ ] API response time (p95)
  ```bash
  # Query Prometheus: histogram_quantile(0.95, api_http_request_duration_seconds)
  # Target: < 100ms
  ```
- [ ] Database connection errors
  ```bash
  # Query Prometheus: api_timescaledb_errors_total
  # Target: 0 errors
  ```

---

## Success Criteria

### Implementation Success
- ✅ Both Gateway and API start successfully via universal commands
- ✅ End-to-end message flow working: Telegram → Gateway → API → DB → Dashboard
- ✅ Retry logic working: API restarts don't lose messages
- ✅ Idempotency working: Duplicate messages are skipped
- ✅ Health checks passing: Both `/health` endpoints return 200
- ✅ Prometheus metrics visible for both services
- ✅ Zero data loss during migration (signal count matches pre-migration)

### Performance Success
- ✅ Gateway memory usage < 200MB
- ✅ API memory usage < 200MB
- ✅ End-to-end latency < 5 seconds (p95)
- ✅ API response time < 100ms (p95)
- ✅ Zero container restarts in first 7 days
- ✅ Gateway uptime > 99.9% in first 7 days

### Operational Success
- ✅ Universal commands (`start`, `stop`, `status`) work correctly
- ✅ Health check script detects both services
- ✅ Grafana dashboard shows accurate metrics
- ✅ Prometheus alerts configured and tested
- ✅ Documentation complete and accurate
- ✅ Runbooks tested and validated

---

**Last Updated**: 2025-10-25
**Status**: Ready for implementation
**Next Step**: Phase 1 - Pre-Migration
