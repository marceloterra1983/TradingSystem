# Implementation Tasks: Unified Migration (TP Capital Split + Workspace Containerization)

**Change ID**: `unified-tp-capital-split-workspace-containerize`
**Total Estimated Effort**: 18-24 hours over 5-7 days
**Status**: Ready for Implementation

> **IMPORTANT**: Mark each task `[x]` only after completion AND validation passes.

---

## Phase 1: Pre-Migration Preparation (1 hour)

**Objective**: Secure backup of all data and validate current environment.

- [ ] 1.1 **Backup Telegram session files**
  ```bash
  tar -czf /backup/tp-capital-sessions-$(date +%Y%m%d-%H%M%S).tar.gz apps/tp-capital/.session
  ls -lh /backup/tp-capital-sessions-*
  ```
  **Validation**: Backup file exists and is > 0 bytes

- [ ] 1.2 **Backup TP Capital .env**
  ```bash
  cp apps/tp-capital/.env /backup/tp-capital.env.backup
  ```
  **Validation**: Backup contains TELEGRAM_* variables

- [ ] 1.3 **Backup Workspace LowDB data (if exists)**
  ```bash
  if [ -f backend/data/workspace/library.json ]; then
    cp backend/data/workspace/library.json /backup/library.json.backup-$(date +%Y%m%d-%H%M%S)
    echo "LowDB backup created"
  fi
  ```
  **Validation**: If file existed, backup created

- [ ] 1.4 **Export TimescaleDB data**
  ```bash
  pg_dump -h localhost -p 5433 -U timescale \
    -t tp_capital.tp_capital_signals \
    -t tp_capital.forwarded_messages \
    -t workspace.workspace_items \
    APPS-TPCAPITAL > /backup/timescale-$(date +%Y%m%d).sql
  ```
  **Validation**: SQL file created and is > 1KB

- [ ] 1.5 **Verify TP Capital is running**
  ```bash
  curl http://localhost:4005/health
  ```
  **Validation**: Returns 200 OK with health status

- [ ] 1.6 **Verify Workspace is running**
  ```bash
  curl http://localhost:3200/health
  curl http://localhost:3200/api/items | jq '.items | length'
  ```
  **Validation**: Returns 200 OK and item count

- [ ] 1.7 **Verify TimescaleDB accessibility**
  ```bash
  psql -h localhost -p 5433 -U timescale APPS-TPCAPITAL -c "SELECT COUNT(*) FROM tp_capital.tp_capital_signals"
  ```
  **Validation**: Query succeeds, returns signal count

- [ ] 1.8 **Document baseline metrics**
  ```bash
  echo "TP Capital signals: $(psql -h localhost -p 5433 -U timescale -t -c 'SELECT COUNT(*) FROM tp_capital.tp_capital_signals')" > /backup/baseline-metrics.txt
  echo "Workspace items: $(curl -s http://localhost:3200/api/items | jq '.items | length')" >> /backup/baseline-metrics.txt
  ```
  **Validation**: baseline-metrics.txt created with counts

---

## Phase 2: Split TP Capital (4-6 hours)

**Objective**: Separate TP Capital into Gateway (local) + API (container).

### 2.1 Directory Structure

- [ ] 2.1.1 **Create Gateway directories** (shared service)
  ```bash
  mkdir -p apps/telegram-gateway/{src,data,.session,scripts}
  ```

- [ ] 2.1.2 **Create API directories**
  ```bash
  mkdir -p apps/tp-capital/api/{src/routes,src/middleware,src/services}
  ```

### 2.2 Move Code to Gateway

- [ ] 2.2.1 **Copy Telegram integration files**
  ```bash
  cp apps/tp-capital/src/telegramIngestionManual.js apps/telegram-gateway/src/telegramIngestion.js
  cp apps/tp-capital/src/telegramUserForwarderPolling.js apps/telegram-gateway/src/telegramForwarder.js
  ```

- [ ] 2.2.2 **Move session files**
  ```bash
  cp -r apps/tp-capital/.session/* apps/telegram-gateway/.session/
  chmod 700 apps/telegram-gateway/.session
  chmod 600 apps/telegram-gateway/.session/*
  ```
  **Validation**: Session files have correct permissions (0600)

- [ ] 2.2.3 **Copy utilities**
  ```bash
  cp apps/tp-capital/src/config.js apps/telegram-gateway/src/
  cp apps/tp-capital/src/logger.js apps/telegram-gateway/src/
  ```

### 2.3 Create Gateway-Specific Files

- [ ] 2.3.1 **Create `apps/telegram-gateway/src/index.js`** (entry point)
- [ ] 2.3.2 **Create `apps/telegram-gateway/src/httpPublisher.js`** (HTTP POST to API)
- [ ] 2.3.3 **Create `apps/telegram-gateway/src/retryQueue.js`** (JSONL failure queue)
- [ ] 2.3.4 **Create `apps/telegram-gateway/src/metrics.js`** (Prometheus)
- [ ] 2.3.5 **Update `apps/telegram-gateway/src/config.js`** (remove DB config, add API endpoint)
- [ ] 2.3.6 **Create `apps/telegram-gateway/package.json`**
- [ ] 2.3.7 **Create `apps/telegram-gateway/.env.example`**
- [ ] 2.3.8 **Create `apps/telegram-gateway/.gitignore`** (session files, .env, data/)

### 2.4 Move Code to API

- [ ] 2.4.1 **Copy server and routes**
  ```bash
  cp apps/tp-capital/src/server.js api/src/
  ```

- [ ] 2.4.2 **Copy services**
  ```bash
  cp apps/tp-capital/src/timescaleClient.js api/src/services/
  cp apps/tp-capital/src/timeUtils.js api/src/services/
  ```

- [ ] 2.4.3 **Copy utilities**
  ```bash
  cp apps/tp-capital/src/logger.js api/src/
  cp apps/tp-capital/src/config.js api/src/
  ```

- [ ] 2.4.4 **Remove Telegram code from `api/src/server.js`**
  - Remove `telegramIngestion` imports
  - Remove bot initialization
  - Remove Telegram event listeners

### 2.5 Create API-Specific Files

- [ ] 2.5.1 **Create `api/src/routes/ingestion.js`** (POST /ingest endpoint)
- [ ] 2.5.2 **Create `api/src/middleware/authGateway.js`** (X-Gateway-Token validation)
- [ ] 2.5.3 **Create `api/src/middleware/idempotency.js`** (duplicate check)
- [ ] 2.5.4 **Update `api/src/config.js`** (remove Telegram vars, add GATEWAY_SECRET_TOKEN)
- [ ] 2.5.5 **Create `api/Dockerfile.dev`** (Node 20 Alpine + nodemon)
- [ ] 2.5.6 **Create `api/.dockerignore`** (node_modules, logs, .env)
- [ ] 2.5.7 **Create `api/package.json`** (no Telegram dependencies)
- [ ] 2.5.8 **Create `api/.env.example`**

### 2.6 Configuration

- [ ] 2.6.1 **Generate Gateway secret token**
  ```bash
  openssl rand -hex 32 > /tmp/gateway-token.txt
  cat /tmp/gateway-token.txt
  ```

- [ ] 2.6.2 **Create Gateway `.env`**
  ```bash
  # Copy Telegram creds from backup
  # Add:
  # GATEWAY_PORT=4006
  # API_ENDPOINT=http://localhost:4005/ingest
  # API_SECRET_TOKEN=<from /tmp/gateway-token.txt>
  # MAX_RETRY_ATTEMPTS=3
  # RETRY_DELAY_MS=5000
  ```

- [ ] 2.6.3 **Create API `.env`**
  ```bash
  # PORT=4005
  # TIMESCALEDB_*=...
  # GATEWAY_SECRET_TOKEN=<same as Gateway>
  # CORS_ORIGIN=http://localhost:3103
  ```

- [ ] 2.6.4 **Validate token matches**
  ```bash
  grep API_SECRET_TOKEN apps/telegram-gateway/.env
  grep GATEWAY_SECRET_TOKEN api/.env
  # Tokens must match!
  ```

### 2.7 Database Migration

- [ ] 2.7.1 **Add message_id column**
  ```sql
  ALTER TABLE tp_capital.tp_capital_signals ADD COLUMN message_id BIGINT;
  ```

- [ ] 2.7.2 **Create unique constraint**
  ```sql
  ALTER TABLE tp_capital.tp_capital_signals
  ADD CONSTRAINT uk_signal_message UNIQUE (channel_id, message_id);
  ```

- [ ] 2.7.3 **Create idempotency index**
  ```sql
  CREATE INDEX idx_tp_capital_signals_idempotency
  ON tp_capital.tp_capital_signals (channel_id, message_id, ingested_at);
  ```

### 2.8 systemd Service (Gateway)

- [ ] 2.8.1 **Create `apps/telegram-gateway/tp-capital-gateway.service`**
- [ ] 2.8.2 **Install systemd service**
  ```bash
  sudo cp apps/telegram-gateway/tp-capital-gateway.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable tp-capital-gateway
  ```
  **Validation**: `systemctl status tp-capital-gateway` shows "loaded"

### 2.9 Testing (TP Capital Split)

- [ ] 2.9.1 **Test Gateway standalone**
  ```bash
  cd telegram-gateway
  npm install
  node src/index.js
  # Should connect to Telegram, start HTTP server on 4006
  ```
  **Validation**: Logs show "Telegram connected", `curl http://localhost:4006/health` returns 200

- [ ] 2.9.2 **Test API container build**
  ```bash
  cd api
  docker build -f Dockerfile.dev -t tp-capital-api:dev .
  ```
  **Validation**: Build succeeds, image size < 500MB

- [ ] 2.9.3 **Test API container run**
  ```bash
  docker run --rm -p 4005:4005 --env-file .env --network host tp-capital-api:dev
  # Should connect to TimescaleDB
  ```
  **Validation**: `curl http://localhost:4005/health` returns 200

- [ ] 2.9.4 **Test Gateway → API communication**
  ```bash
  # Send test message to Telegram channel
  # Check Gateway logs: "Message published successfully"
  # Check API logs: "Ingestion request received"
  # Check DB: SELECT * FROM tp_capital_signals ORDER BY ingested_at DESC LIMIT 1
  ```
  **Validation**: Message flows end-to-end (Telegram → Gateway → API → DB)

---

## Phase 3: Containerize Workspace (3-4 hours)

**Objective**: Create Docker container for Workspace with TimescaleDB-only persistence.

### 3.1 Create Dockerfile

- [ ] 3.1.1 **Create `backend/api/workspace/Dockerfile.dev`**
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  EXPOSE 3200
  CMD ["npm", "run", "dev"]
  ```

- [ ] 3.1.2 **Create `backend/api/workspace/.dockerignore`**
  ```
  node_modules
  npm-debug.log
  .env
  .env.*
  logs/
  tests/tmp/
  coverage/
  ```

### 3.2 Remove LowDB Code

- [ ] 3.2.1 **Remove LowDB from `src/db/index.js`**
  - Delete `getLowDbClient()` function
  - Update `getDbClient()` to return only TimescaleDB client
  - Add deprecation warning if `LIBRARY_DB_STRATEGY=lowdb`

- [ ] 3.2.2 **Remove LowDB package**
  ```bash
  npm uninstall lowdb
  ```

- [ ] 3.2.3 **Update tests to remove LowDB**
  - Remove `DB_PATH=./tests/tmp/ideas.test.json`
  - Use TimescaleDB for all tests

### 3.3 Add Retry Logic

- [ ] 3.3.1 **Add retry logic to `src/db/timescaledb.js`**
  ```javascript
  async function connectWithRetry(maxRetries = 5, delay = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await pool.connect();
        logger.info('TimescaleDB connected');
        return pool;
      } catch (err) {
        logger.warn(`Retry ${i+1}/${maxRetries}: ${err.message}`);
        if (i < maxRetries - 1) await sleep(delay);
      }
    }
    throw new Error('TimescaleDB unavailable after retries');
  }
  ```

### 3.4 Data Migration Script

- [ ] 3.4.1 **Create `scripts/database/migrate-lowdb-to-timescale.js`**
- [ ] 3.4.2 **Test migration script with sample data**
  ```bash
  echo '{"items":[{"id":"test-1","title":"Test"}]}' > test-library.json
  node scripts/database/migrate-lowdb-to-timescale.js test-library.json
  ```
  **Validation**: COUNT(*) FROM workspace_items WHERE id='test-1' returns 1

### 3.5 Testing (Workspace)

- [ ] 3.5.1 **Test container build**
  ```bash
  cd backend/api/workspace
  docker build -f Dockerfile.dev -t workspace:dev .
  ```
  **Validation**: Build succeeds, image size < 400MB

- [ ] 3.5.2 **Test container run**
  ```bash
  docker run --rm -p 3200:3200 --env-file ../../../.env --network host workspace:dev
  ```
  **Validation**: `curl http://localhost:3200/health` returns 200

- [ ] 3.5.3 **Test CRUD operations**
  ```bash
  # GET all items
  curl http://localhost:3200/api/items

  # POST new item
  curl -X POST http://localhost:3200/api/items \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Item","category":"test","priority":"high","status":"todo"}'

  # Verify in DB
  psql -h localhost -p 5433 -U timescale -c "SELECT * FROM workspace.workspace_items"
  ```
  **Validation**: All CRUD operations succeed

---

## Phase 4: Docker Compose Integration (2 hours)

**Objective**: Integrate both containers into unified Docker Compose stack.

- [ ] 4.1 **Create `tools/compose/docker-compose.apps.yml`**
  - Define `tp-capital-api` service (port 4005)
  - Define `workspace` service (port 3200)
  - Configure networks: `tradingsystem_backend` (external)
  - Configure volumes for hot-reload
  - Configure healthchecks (30s interval)
  - Configure `depends_on: timescaledb: condition: service_healthy`
  - Configure logging (json-file, 10MB max, 3 files)

- [ ] 4.2 **Create external network if not exists**
  ```bash
  docker network create tradingsystem_backend || true
  ```
  **Validation**: `docker network ls | grep tradingsystem_backend`

- [ ] 4.3 **Test compose file syntax**
  ```bash
  docker compose -f tools/compose/docker-compose.apps.yml config
  ```
  **Validation**: No syntax errors

- [ ] 4.4 **Test startup sequence**
  ```bash
  # Start TimescaleDB first
  docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb
  # Wait for healthy
  docker compose -f tools/compose/docker-compose.database.yml ps timescaledb
  # Start apps
  docker compose -f tools/compose/docker-compose.apps.yml up -d
  ```
  **Validation**: Both containers running and healthy

- [ ] 4.5 **Test hot-reload**
  ```bash
  # Edit source file
  echo "// Test change" >> apps/tp-capital/api/src/server.js
  # Watch logs for reload
  docker compose -f tools/compose/docker-compose.apps.yml logs -f tp-capital-api | grep -i "restart"
  # Revert change
  git checkout apps/tp-capital/api/src/server.js
  ```
  **Validation**: Service restarts within 2 seconds

---

## Phase 5: Scripts & Automation (2 hours)

**Objective**: Update universal scripts to manage Gateway + containers.

- [ ] 5.1 **Update `scripts/universal/start.sh`**
  - Check if Docker is running (`docker info`)
  - Check if systemd is available (`which systemctl`)
  - Start Gateway: `systemctl start tp-capital-gateway` (or direct node if no systemd)
  - Wait for Gateway health: `curl http://localhost:4006/health` (retry 5x, 2s)
  - Start containers: `docker compose -f tools/compose/docker-compose.apps.yml up -d`
  - Wait for containers healthy (check Docker health status)
  - Report overall status

- [ ] 5.2 **Update `scripts/universal/stop.sh`**
  - Stop containers: `docker compose -f tools/compose/docker-compose.apps.yml down`
  - Stop Gateway: `systemctl stop tp-capital-gateway`
  - Wait for graceful shutdown (30s timeout)

- [ ] 5.3 **Update `scripts/maintenance/health-check-all.sh`**
  - Add Gateway HTTP check: `curl -s http://localhost:4006/health`
  - Add Gateway systemd check: `systemctl is-active tp-capital-gateway`
  - Add API container check: `docker inspect tp-capital-api --format='{{.State.Health.Status}}'`
  - Add Workspace container check: `docker inspect workspace --format='{{.State.Health.Status}}'`
  - Aggregate health score (all green = healthy, any red = degraded)

- [ ] 5.4 **Test universal commands**
  ```bash
  # Stop everything first
  bash scripts/universal/stop.sh

  # Start everything
  bash scripts/universal/start.sh

  # Check status
  bash scripts/maintenance/health-check-all.sh
  ```
  **Validation**: All 3 components (Gateway + 2 containers) detected and healthy

---

## Phase 6: Data Migration (1 hour)

**Objective**: Migrate existing LowDB data to TimescaleDB (if exists).

- [ ] 6.1 **Check for LowDB data**
  ```bash
  if [ -f backend/data/workspace/library.json ]; then
    echo "LowDB data found - migration required"
    wc -l backend/data/workspace/library.json
  else
    echo "No LowDB data - skipping migration"
  fi
  ```

- [ ] 6.2 **Run migration script (if LowDB exists)**
  ```bash
  node scripts/database/migrate-lowdb-to-timescale.js
  ```

- [ ] 6.3 **Validate data integrity**
  ```bash
  # Get count from JSON
  JSON_COUNT=$(jq '.items | length' backend/data/workspace/library.json)
  # Get count from DB
  DB_COUNT=$(psql -h localhost -p 5433 -U timescale -t -c "SELECT COUNT(*) FROM workspace.workspace_items")
  # Compare
  if [ "$JSON_COUNT" -eq "$DB_COUNT" ]; then
    echo "✅ Migration successful: $DB_COUNT items"
  else
    echo "❌ Migration failed: JSON=$JSON_COUNT, DB=$DB_COUNT"
  fi
  ```
  **Validation**: Counts match

- [ ] 6.4 **Backup migrated JSON**
  ```bash
  mv backend/data/workspace/library.json backend/data/workspace/library.json.migrated-$(date +%Y%m%d)
  ```
  **Validation**: Original file moved, not deleted

---

## Phase 7: End-to-End Testing (3-4 hours)

**Objective**: Comprehensive testing of entire system.

- [ ] 7.1 **Test Telegram → Dashboard flow**
  - Send test message to monitored Telegram channel
  - Check Gateway logs: "Message received" → "Published successfully"
  - Check API logs: "Ingestion request" → "Signal inserted"
  - Check Dashboard: Signal appears within 5 seconds
  **Validation**: End-to-end latency < 100ms

- [ ] 7.2 **Test Workspace CRUD**
  - Create item via POST /api/items
  - Read item via GET /api/items/:id
  - Update item via PUT /api/items/:id
  - Delete item via DELETE /api/items/:id
  **Validation**: All operations succeed, data persists

- [ ] 7.3 **Test hot-reload (API)**
  ```bash
  echo "// API change" >> apps/tp-capital/api/src/routes/ingestion.js
  docker logs -f tp-capital-api | grep -i "restart"
  git checkout apps/tp-capital/api/src/routes/ingestion.js
  ```
  **Validation**: Reload within 2 seconds

- [ ] 7.4 **Test hot-reload (Workspace)**
  ```bash
  echo "// Workspace change" >> backend/api/workspace/src/routes/items.js
  docker logs -f workspace | grep -i "restart"
  git checkout backend/api/workspace/src/routes/items.js
  ```
  **Validation**: Reload within 2 seconds

- [ ] 7.5 **Test retry logic (Gateway → API)**
  ```bash
  # Stop API
  docker compose -f tools/compose/docker-compose.apps.yml stop tp-capital-api
  # Send Telegram message
  # Check Gateway logs: "Retry 1/3" → "Retry 2/3" → "Retry 3/3" → "Saved to failure queue"
  # Restart API
  docker compose -f tools/compose/docker-compose.apps.yml start tp-capital-api
  # Run recovery script
  node apps/telegram-gateway/scripts/recover-queue.js
  ```
  **Validation**: Message recovered from queue and persisted

- [ ] 7.6 **Test idempotency (API)**
  ```bash
  # Send same message twice (same channelId + messageId)
  curl -X POST http://localhost:4005/ingest \
    -H "X-Gateway-Token: $GATEWAY_SECRET_TOKEN" \
    -d '{"channelId":-1001234,"messageId":12345,"text":"Test","timestamp":"2025-01-01T00:00:00Z"}'
  # Second call should return: {"status":"ok","skipped":true}
  ```
  **Validation**: Second call skips insert, returns skipped=true

- [ ] 7.7 **Test health checks**
  ```bash
  curl http://localhost:4006/health  # Gateway
  curl http://localhost:4005/health  # API
  curl http://localhost:3200/health  # Workspace
  docker inspect tp-capital-api --format='{{.State.Health.Status}}'
  docker inspect workspace --format='{{.State.Health.Status}}'
  ```
  **Validation**: All return healthy

- [ ] 7.8 **Test startup/stop via universal commands**
  ```bash
  stop  # Universal stop
  # Wait 10s
  start  # Universal start
  # Check all services running
  status  # Should show 3 components
  ```
  **Validation**: Commands work seamlessly

---

## Phase 8: Documentation (2-3 hours)

**Objective**: Update all documentation to reflect new architecture.

- [ ] 8.1 **Update `CLAUDE.md`**
  - Update "Active Services & Ports" section (add Gateway 4006)
  - Update architecture overview (3 services now)
  - Update development commands (systemd + docker compose)
  - Remove references to TP Capital monolith

- [ ] 8.2 **Update `docs/context/ops/service-port-map.md`**
  - Add Gateway (4006, systemd)
  - Mark API and Workspace as "containerized"
  - Add Docker Compose file reference

- [ ] 8.3 **Update `docs/context/backend/guides/guide-tp-capital.md`**
  - Complete rewrite for split architecture
  - Document Gateway setup (systemd)
  - Document API container deployment
  - Add troubleshooting section

- [ ] 8.4 **Update `backend/api/workspace/README.md`**
  - Add "Running with Docker" section
  - Document LowDB removal
  - Document migration procedure

- [ ] 8.5 **Create `docs/context/ops/containerization-guide.md`**
  - Document containerization strategy
  - Hot-reload configuration
  - Volume management
  - Common issues & solutions

- [ ] 8.6 **Update main `README.md`**
  - Update quickstart (mention systemd + containers)
  - Update development commands
  - Add Docker prerequisites

---

## Phase 9: Production Deploy (1 hour)

**Objective**: Deploy to production environment.

- [ ] 9.1 **Stop TP Capital monolith**
  ```bash
  pkill -f "node.*tp-capital/src/server.js"
  # Verify stopped
  lsof -ti :4005
  ```

- [ ] 9.2 **Start Gateway**
  ```bash
  sudo systemctl start tp-capital-gateway
  sudo systemctl status tp-capital-gateway
  # Check logs
  sudo journalctl -u tp-capital-gateway -f
  ```
  **Validation**: Logs show "Telegram connected", systemd status "active (running)"

- [ ] 9.3 **Start containers**
  ```bash
  docker compose -f tools/compose/docker-compose.apps.yml up -d
  docker compose -f tools/compose/docker-compose.apps.yml ps
  ```
  **Validation**: Both containers healthy

- [ ] 9.4 **Verify end-to-end flow**
  - Send test Telegram message
  - Verify appears in Dashboard within 5 seconds
  - Create Workspace item via Dashboard
  - Verify persists across container restart

- [ ] 9.5 **Monitor for 1 hour**
  ```bash
  # Watch Gateway logs
  sudo journalctl -u tp-capital-gateway -f &
  # Watch container logs
  docker compose -f tools/compose/docker-compose.apps.yml logs -f &
  # Watch TimescaleDB connections
  watch -n 5 'psql -h localhost -p 5433 -U timescale -c "SELECT COUNT(*) FROM pg_stat_activity"'
  ```
  **Validation**: No errors, no restarts, messages flowing

- [ ] 9.6 **Update monitoring**
  - Add Gateway metrics to Prometheus (`http://localhost:4006/metrics`)
  - Add Workspace metrics to Prometheus (`http://localhost:3200/metrics`)
  - Update Grafana dashboards (3 services)

---

## Validation Checklist (Final)

- [ ] ✅ Gateway connects to Telegram without reauth
- [ ] ✅ API container receives messages from Gateway
- [ ] ✅ Workspace container serves CRUD operations
- [ ] ✅ End-to-end flow (Telegram → DB → Dashboard) < 100ms
- [ ] ✅ Hot-reload < 2s for both containers
- [ ] ✅ Health checks passing (systemd + 2 containers)
- [ ] ✅ Universal commands work (`start`, `stop`, `status`)
- [ ] ✅ Zero message loss during 24h test
- [ ] ✅ Zero data loss in Workspace migration
- [ ] ✅ All tests passing (unit + integration)
- [ ] ✅ All documentation updated
- [ ] ✅ Baseline metrics maintained (signal count, item count)

---

**Completion Criteria**: All 65+ tasks marked `[x]` and validation passing.

**Rollback Plan**: If critical issues arise, restore from backups (Phase 1) and restart TP Capital monolith.

**Post-Deploy**: Monitor for 7 days, then archive old monolith code.
