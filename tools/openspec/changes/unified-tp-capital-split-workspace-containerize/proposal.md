# Proposal: Split TP Capital + Containerize Workspace (Unified Migration)

**Change ID**: `unified-tp-capital-split-workspace-containerize`
**Status**: Proposal
**Created**: 2025-10-25
**Author**: Claude Code AI Agent
**Priority**: High (Architectural Foundation)

---

## Executive Summary

This proposal unifies two architectural changes into a single, coherent migration:

1. **Split TP Capital** into Gateway (local service) + API (containerized)
2. **Containerize Workspace** with TimescaleDB-only persistence

**Rationale**: TP Capital cannot be fully containerized due to Telegram session file security constraints. However, splitting the service enables independent deployment while Workspace can be safely containerized with hot-reload support.

---

## Why: Combined Motivation

### Problem 1: TP Capital Cannot Be Fully Containerized

**Current State**: TP Capital (port 4005) is a monolithic Node.js service combining:
- Telegram integration (MTProto, session files, bot polling)
- Business logic (signal parsing, validation)
- Data persistence (TimescaleDB inserts)
- REST API (endpoints for Dashboard)

**Blocker**: Telegram session files (`.session`) contain sensitive authentication tokens that:
- ❌ **Cannot be stored in Docker volumes** (security risk, permission complexity)
- ❌ **Cannot be regenerated easily** (requires phone + 2FA, 5-10min downtime)
- ❌ **Must persist across restarts** (re-authentication not acceptable)

**Consequence**: Any containerization attempt forces session files into volumes, creating security vulnerabilities and operational complexity.

---

### Problem 2: Workspace Uses Dual-Strategy (TimescaleDB + LowDB)

**Current State**: Workspace (port 3200) supports:
- **Primary**: TimescaleDB (production, ACID, scalable)
- **Fallback**: LowDB (development, JSON file, single-threaded)

**Issues**:
- Dual code paths increase complexity (2x testing burden)
- LowDB doesn't scale (file locking, no concurrency)
- Confusion about which strategy to use when
- Migration gap: LowDB data must be manually moved to production

**Consequence**: Technical debt, deployment inconsistency, data migration friction.

---

### Problem 3: Local Process Management is Brittle

**Current State**: Both services run as local Node.js processes via `scripts/universal/start.sh`.

**Issues**:
- Manual PID tracking (processes can orphan)
- No automatic restart on crash
- Difficult log aggregation (scattered files)
- Inconsistent deployment (dev vs staging vs prod)
- No health check integration
- Rollback requires manual process kill + restart

**Consequence**: Operational overhead, downtime risk, debugging difficulty.

---

## Solution: Two-Tier Architecture

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     TELEGRAM SERVERS                              │
│                  (api.telegram.org - MTProto)                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │ MTProto WebSocket (persistent)
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│     TP CAPITAL TELEGRAM GATEWAY (Local Process - systemd)        │
│     Port: 4006                                                    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Telegram Integration Layer                                │  │
│  │  - TelegramClient (MTProto session)                        │  │
│  │  - Telegraf bot (polling)                                  │  │
│  │  - Session files (.session) - LOCAL DISK ONLY             │  │
│  │  - Authentication (phone + 2FA)                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  HTTP Publisher                                            │  │
│  │  - Retry logic (3x, exponential backoff)                  │  │
│  │  - Failure queue (JSONL persistence)                      │  │
│  │  - Health check (/health)                                 │  │
│  │  - Prometheus metrics (/metrics)                          │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTP POST /ingest
                         │ X-Gateway-Token: <secret>
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              DOCKER COMPOSE STACK (Containers)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  TP CAPITAL API (Container)                                │ │
│  │  Port: 4005                                                │ │
│  │                                                            │ │
│  │  - REST API (Express + Helmet + CORS)                     │ │
│  │  - Authentication middleware (Gateway token)              │ │
│  │  - Idempotency checks (messageId dedup)                   │ │
│  │  - Signal parsing & validation                            │ │
│  │  - TimescaleDB persistence                                │ │
│  │  - Prometheus metrics (/metrics)                          │ │
│  │  - Hot-reload (dev mode via volumes)                      │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WORKSPACE API (Container)                                 │ │
│  │  Port: 3200                                                │ │
│  │                                                            │ │
│  │  - REST API (CRUD workspace items)                        │ │
│  │  - TimescaleDB ONLY (LowDB removed)                       │ │
│  │  - Migration script (LowDB → TimescaleDB)                 │ │
│  │  - Retry logic (5x, 2s delay)                             │ │
│  │  - Prometheus metrics (/metrics)                          │ │
│  │  - Hot-reload (dev mode via volumes)                      │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│                          ├───────────────────────────────────┐   │
│                          │                                   │   │
│  ┌───────────────────────▼───────────────────────────────────▼┐  │
│  │  TIMESCALEDB (Container)                                   │  │
│  │  Port: 5433                                                │  │
│  │                                                            │  │
│  │  Schemas:                                                  │  │
│  │  - tp_capital (signals, channels, bots, forwarded_msgs)   │  │
│  │  - workspace (workspace_items)                            │  │
│  │                                                            │  │
│  │  - Health checks + auto-restart                           │  │
│  │  - Connection pooling                                     │  │
│  │  - Prometheus metrics exporter                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## What Changes

### 🆕 New Component: Telegram Gateway

**Type**: Local systemd service (Linux) or Windows Service
**Port**: 4006 (new)
**Location**: `apps/telegram-gateway/` (shared service, not TP Capital-specific)

**Responsibilities**:
- ✅ Telegram authentication (MTProto via TelegramClient)
- ✅ Bot ingestion (Telegraf with polling)
- ✅ User account forwarding (TelegramClient with session files)
- ✅ Session file management (`.session` stored locally, never in containers)
- ✅ HTTP publisher → POST to API `/ingest` endpoint
- ✅ Retry logic with exponential backoff (3 retries, 5s base delay)
- ✅ Failure queue (JSONL persistence for API downtime)
- ✅ Minimal Express server (`/health` and `/metrics` endpoints only)

**Security**:
- Session files permissions: `0600` (owner read/write only)
- Directory permissions: `0700` (owner access only)
- Credentials isolated to Gateway process only

**Files Created** (~15 files):
- `src/index.js` - Entry point
- `src/telegramIngestion.js` - Telegraf bot
- `src/telegramForwarder.js` - TelegramClient
- `src/httpPublisher.js` - Publishes to API
- `src/retryQueue.js` - Failure queue management
- `src/metrics.js` - Prometheus metrics
- `src/config.js`, `src/logger.js`
- `package.json`, `.env`, `.gitignore`
- `tp-capital-gateway.service` - systemd unit file

---

### 🔄 Modified Component: TP Capital API (Containerized)

**Type**: Docker container (Node.js 20 Alpine)
**Port**: 4005 (unchanged - maintains compatibility)
**Location**: `apps/tp-capital/api/`

**Responsibilities**:
- ✅ REST API (Express + Helmet + CORS + Rate Limiting)
- ✅ **NEW**: `/ingest` endpoint (receives from Gateway)
- ✅ Signal parsing and validation
- ✅ TimescaleDB persistence (inserts/queries)
- ✅ Prometheus metrics export (`/metrics`)
- ✅ CRUD endpoints (`/signals`, `/channels`, `/bots`, `/logs`)
- ✅ Health checks (`/health`)
- ✅ **NEW**: Gateway authentication (validates `X-Gateway-Token`)
- ✅ **NEW**: Idempotency checks (prevent duplicate signals)

**Removed**:
- ❌ Direct Telegram integration (moved to Gateway)
- ❌ Session file management (moved to Gateway)
- ❌ Telegram credentials (moved to Gateway `.env`)

**Files Created/Modified** (~20 files):
- `Dockerfile` - Multi-stage build
- `.dockerignore`
- `src/routes/ingestion.js` - NEW - Gateway ingestion
- `src/middleware/authGateway.js` - NEW - Token validation
- `src/middleware/idempotency.js` - NEW - Duplicate prevention
- `src/server.js` - MODIFIED - Remove Telegram code
- Existing files: `services/`, `config.js`, `logger.js`

**New Environment Variables**:
- `GATEWAY_SECRET_TOKEN` - Shared secret for authentication
- `TIMESCALEDB_*` - Database connection (no Telegram vars)

---

### 🔄 Modified Component: Workspace (Containerized)

**Type**: Docker container (Node.js 20 Alpine)
**Port**: 3200 (unchanged)
**Location**: `backend/api/workspace/`

**Responsibilities**:
- ✅ REST API (CRUD workspace items)
- ✅ **CHANGED**: TimescaleDB ONLY (LowDB removed)
- ✅ TimescaleDB connection with retry logic (5x, 2s)
- ✅ Prometheus metrics export
- ✅ Health checks
- ✅ Hot-reload development mode (volumes)

**Removed**:
- ❌ LowDB support (dual-strategy removed)
- ❌ `getLowDbClient()` function
- ❌ Conditional logic based on `DB_STRATEGY`

**Added**:
- ✅ Migration script: `scripts/database/migrate-lowdb-to-timescale.js`
- ✅ Data validation (COUNT check after migration)
- ✅ Backup preservation (library.json → library.json.migrated)

**Files Created/Modified**:
- `Dockerfile.dev` - Development container
- `.dockerignore`
- `src/db/index.js` - MODIFIED - Remove LowDB
- `src/db/timescaledb.js` - MODIFIED - Add retry logic
- `scripts/database/migrate-lowdb-to-timescale.js` - NEW

---

### 🔗 New: Docker Compose Integration

**New File**: `tools/compose/docker-compose.apps.yml`

**Services**:
1. `tp-capital-api` (port 4005)
2. `workspace` (port 3200)

**Configuration**:
- Networks: `tradingsystem_backend` (external, shared with TimescaleDB)
- Volumes: Source code mounts for hot-reload + anonymous node_modules volumes
- Health checks: `wget http://localhost:<port>/health` (30s interval)
- Depends on: `timescaledb` (condition: service_healthy)
- Restart policy: `unless-stopped`
- Logging: json-file driver with rotation (max 10MB, 3 files)

**Startup Sequence**:
```bash
# 1. Start infrastructure
docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb

# 2. Start Gateway (local)
sudo systemctl start tp-capital-gateway

# 3. Start containers (API + Workspace)
docker compose -f tools/compose/docker-compose.apps.yml up -d
```

---

### 🛠️ Scripts Updates

#### Universal Startup (`scripts/universal/start.sh`)
- ✅ Detect if Docker is running (`docker info`)
- ✅ Detect if `tp-capital-gateway` systemd service exists
- ✅ Start Gateway: `systemctl start tp-capital-gateway` (or direct `node` command if no systemd)
- ✅ Wait for Gateway health: `curl http://localhost:4006/health`
- ✅ Start containers: `docker compose -f tools/compose/docker-compose.apps.yml up -d`
- ✅ Wait for containers healthy: `docker inspect --format='{{.State.Health.Status}}' <container>`
- ✅ Report status: All 3 components (Gateway + 2 containers)

#### Universal Stop (`scripts/universal/stop.sh`)
- ✅ Stop containers: `docker compose -f tools/compose/docker-compose.apps.yml down`
- ✅ Stop Gateway: `systemctl stop tp-capital-gateway`
- ✅ Graceful shutdown (30s timeout)

#### Health Check (`scripts/maintenance/health-check-all.sh`)
- ✅ Check Gateway HTTP: `curl -s http://localhost:4006/health`
- ✅ Check Gateway systemd: `systemctl is-active tp-capital-gateway`
- ✅ Check API container: `docker inspect tp-capital-api --format='{{.State.Health.Status}}'`
- ✅ Check Workspace container: `docker inspect workspace --format='{{.State.Health.Status}}'`
- ✅ Check TimescaleDB connectivity: `psql -h localhost -p 5433 -c "SELECT 1"`
- ✅ Aggregate health score: All green = healthy, any red = degraded

---

## Impact

### 🔴 Breaking Changes

#### 1. **BREAKING**: TP Capital monolith split into 2 services
- **Before**: Single service at `apps/tp-capital/` on port 4005
- **After**: Gateway (port 4006) + API (port 4005)
- **Migration**: Follow migration guide, test end-to-end flow
- **Downtime**: ~30 minutes (backup + split + deploy + test)

#### 2. **BREAKING**: New port 4006 for Telegram Gateway
- **Before**: Only port 4005 used
- **After**: Port 4006 (Gateway) + port 4005 (API)
- **Impact**: Firewall rules may need updates if restrictive
- **Dashboard**: No changes needed (still uses port 4005)

#### 3. **BREAKING**: Separate environment files for TP Capital
- **Before**: Single `.env` in `apps/tp-capital/`
- **After**:
  - `telegram-gateway/.env` (Telegram credentials)
  - `api/.env` (Database credentials, optional - compose takes precedence)
- **Migration**: Split credentials into appropriate files, generate `GATEWAY_SECRET_TOKEN`

#### 4. **BREAKING**: Workspace removes LowDB support
- **Before**: Dual-strategy (TimescaleDB + LowDB fallback)
- **After**: TimescaleDB only
- **Migration**: Run `node scripts/database/migrate-lowdb-to-timescale.js` before deploying
- **Rollback**: Keep `library.json.backup` for 30 days

#### 5. **BREAKING**: Services no longer start via `npm run dev` directly
- **Before**: `cd apps/tp-capital && npm run dev`
- **After**:
  - Gateway: `systemctl start tp-capital-gateway`
  - API: `docker compose -f tools/compose/docker-compose.apps.yml up tp-capital-api`
  - Workspace: `docker compose -f tools/compose/docker-compose.apps.yml up workspace`
- **Workaround**: Universal `start` command handles all services automatically

#### 6. **BREAKING**: Session files location moved
- **Before**: `apps/tp-capital/.session`
- **After**: `apps/telegram-gateway/.session`
- **Migration**: Move session files before first Gateway startup
- **Backup**: Mandatory backup before migration

---

### 📊 Affected Components

| Component | Type | Impact | Action Required |
|-----------|------|--------|-----------------|
| **TP Capital (monolith)** | Split → Gateway + API | Split codebase, test communication | Follow migration guide Phase 2-3 |
| **Telegram Gateway** | NEW | systemd service | Install service, configure .env, start |
| **TP Capital API** | Container | Build Docker image | Create Dockerfile, test in container |
| **Workspace** | Container + LowDB removal | Migrate data, remove code | Run migration script, test CRUD |
| **Docker Compose** | New file | Add apps stack | Create `docker-compose.apps.yml` |
| **Universal Scripts** | Detection logic | Detect systemd + containers | Update start/stop/status scripts |
| **Health Check** | 3 components | Check Gateway + 2 containers | Update health check script |
| **Dashboard** | API calls | No changes (port 4005 maintained) | Verify endpoints still work |
| **Prometheus** | 3 scrape targets | Add Gateway + Workspace metrics | Update prometheus.yml |
| **Documentation** | Architecture | Update diagrams, READMEs, ADRs | Phase 8 tasks |

---

### ✨ Benefits

#### 🔒 Security Improvements
- ✅ **Session files never leave local filesystem** (zero Docker volume exposure)
- ✅ **Telegram credentials isolated to Gateway only** (API has zero access)
- ✅ **Separate secrets management** (Gateway .env ≠ API .env)
- ✅ **Gateway authentication** via rotatable shared token

#### 🚀 Operational Excellence
- ✅ **Independent deployments**: Update API/Workspace without Telegram disconnect
- ✅ **Scalability unlocked**: API/Workspace can scale horizontally (multiple replicas)
- ✅ **Graceful degradation**: Container restarts don't break Gateway message reception
- ✅ **Rollback trivial**: Docker tag rollback, Gateway unaffected
- ✅ **Health checks native**: Docker healthchecks + systemd monitoring

#### 🧪 Development Velocity
- ✅ **Isolated testing**: Test API/Workspace endpoints without Telegram mocks
- ✅ **Faster iteration**: API/Workspace changes don't require Telegram reauth
- ✅ **Hot-reload maintained**: < 2s feedback loop for containers
- ✅ **Clear boundaries**: Three services with single responsibilities
- ✅ **Parallel development**: Teams can work independently (Gateway vs API vs Workspace)

#### 📊 Monitoring & Observability
- ✅ **Separate metrics**: Gateway connection status vs API performance vs Workspace queries
- ✅ **Failure isolation**: Identify if issue is Telegram, API, Workspace, or DB related
- ✅ **Granular health checks**: Three independent `/health` endpoints
- ✅ **Retry visibility**: Track Gateway→API failures and retries
- ✅ **Logs centralized**: journalctl (Gateway) + docker logs (API, Workspace)

---

### ⚠️ Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| **Message loss during API downtime** | Medium | High | Gateway retry logic (3x) + JSONL failure queue |
| **Network latency Gateway→API** | Low | Low | Localhost communication (<10ms overhead) |
| **Duplicate messages on retry** | Medium | Low | API idempotency checks (messageId + timestamp) |
| **Gateway crash loses buffer** | Low | Medium | Persist to failure queue BEFORE processing |
| **Session file corruption** | Low | High | Daily backup cron, session validation on load |
| **Workspace data loss in migration** | Low | High | Mandatory backup + validation (COUNT check) |
| **Port conflicts (4006, 4005, 3200)** | Medium | Low | Universal start script detects and offers --force-kill |
| **Hot-reload performance degradation** | Low | Low | Use `:delegated` on macOS, test reload speed < 2s |
| **TimescaleDB unavailable on startup** | Medium | Medium | Retry logic (5x) + clear logs + health check 503 |

---

## Compatibility

### ✅ Backward Compatible
- ✅ **Ports maintained**: 4005 (API), 3200 (Workspace) - Dashboard unchanged
- ✅ **API endpoints identical**: `/signals`, `/channels`, `/bots` - zero changes
- ✅ **Database schema**: tp_capital schema unchanged (only new `message_id` column)
- ✅ **Universal commands**: `start`, `stop`, `status` work seamlessly
- ✅ **Docker Compose networks**: Integrates with existing `tradingsystem_backend`

### ⚠️ Breaking Changes
- ⚠️ **Direct Telegram integration removed from API**: Must use Gateway
- ⚠️ **New port 4006**: Gateway requires firewall rule if restricted
- ⚠️ **Two .env files for TP Capital**: Separate secrets management
- ⚠️ **systemd service required**: Gateway needs service installation (Linux)
- ⚠️ **Session files moved**: Update backup scripts if automated
- ⚠️ **LowDB removed from Workspace**: Migration required if data exists
- ⚠️ **Services start via Docker Compose**: No more `npm run dev` directly

---

## Migration Path (High-Level)

### Phase 1: Pre-Migration (1h)
1. Backup session files, .env, LowDB data, TimescaleDB
2. Validate current environment (ports, connectivity, signal count)
3. Document current state (screenshots, API responses)

### Phase 2: Split TP Capital (4-6h)
1. Create directory structure (Gateway + API + shared)
2. Move Telegram code → Gateway
3. Move business logic → API
4. Implement HTTP Publisher + Retry Queue
5. Implement /ingest endpoint + auth + idempotency
6. Create Dockerfile for API
7. Create systemd service for Gateway
8. Test Gateway→API communication

### Phase 3: Containerize Workspace (3-4h)
1. Create Dockerfile.dev
2. Remove LowDB code
3. Add TimescaleDB retry logic
4. Create migration script
5. Test container locally

### Phase 4: Docker Compose Integration (2h)
1. Create `docker-compose.apps.yml`
2. Configure networks, volumes, healthchecks
3. Test startup sequence (TimescaleDB → Gateway → Containers)

### Phase 5: Scripts & Automation (2h)
1. Update `start.sh` (detect systemd + containers)
2. Update `stop.sh` (graceful shutdown)
3. Update `health-check-all.sh` (3 components)
4. Test universal commands

### Phase 6: Data Migration (1h)
1. Run LowDB → TimescaleDB migration (if exists)
2. Validate data integrity (COUNT check)
3. Backup migrated files

### Phase 7: Testing End-to-End (3-4h)
1. Test Telegram → Gateway → API → DB → Dashboard flow
2. Test Workspace CRUD operations
3. Test hot-reload (< 2s)
4. Test retry logic and failure recovery
5. Test health checks (all 3 components)
6. Test startup/stop universal commands

### Phase 8: Documentation (2-3h)
1. Update CLAUDE.md (new architecture)
2. Update service-port-map.md (3 services)
3. Create containerization-guide.md
4. Update individual READMEs

### Phase 9: Production Deploy (1h)
1. Stop TP Capital monolith
2. Start Gateway systemd service
3. Start containers (API + Workspace)
4. Verify end-to-end flow
5. Monitor for 24 hours

**Total Estimated Time**: 18-24 hours (including testing and documentation)

---

## Success Metrics

### Implementation Success
- ✅ Gateway connects to Telegram and maintains session without reauth
- ✅ API container receives messages from Gateway and persists to TimescaleDB
- ✅ Workspace container serves CRUD operations without LowDB references
- ✅ End-to-end flow: Telegram → Gateway → API → DB → Dashboard (< 100ms)
- ✅ Hot-reload < 2s for both containers (API + Workspace)
- ✅ Health checks passing for all 3 components (Gateway + 2 containers)
- ✅ Universal commands work: `start`, `stop`, `status` detect all services
- ✅ Zero message loss during 24h test period
- ✅ Zero data loss in Workspace migration (if LowDB data existed)

### Performance Benchmarks
- ✅ Gateway process memory < 150MB
- ✅ API container memory < 200MB
- ✅ Workspace container memory < 200MB
- ✅ Message latency (Telegram → DB) < 100ms
- ✅ Gateway → API HTTP call < 10ms (localhost)
- ✅ Workspace API response time < 50ms (p95)
- ✅ TimescaleDB connection pool utilization < 50%

### Post-Deploy Monitoring (7 days)
- Container restarts < 1/day per service
- Gateway systemd uptime > 99.9%
- TimescaleDB connection errors = 0
- Gateway → API publish failures < 0.1% (with retries)
- Dashboard signal freshness < 5 seconds
- Workspace API error rate < 0.01%

---

## Open Questions

### Question 1: Should Gateway have high availability (active-passive)?
**Context**: Single Gateway instance is single point of failure for Telegram ingestion.

**Options**:
- **Single instance** (current proposal) - Simple, Telegram buffers messages during downtime
- **Active-Passive** - Standby Gateway with session file sync
- **Not needed** - Gateway crash is recoverable, systemd auto-restarts in <10s

**Recommendation**: **Single instance** for MVP. Active-passive adds complexity without significant benefit given Telegram's 24h message buffering.

---

### Question 2: Should failure queue have size limit?
**Context**: Unbounded JSONL file could grow to GB if API is down for extended period.

**Options**:
- **No limit** - Trust manual intervention if API is down >24h
- **Size limit (100MB)** - Rotate at 100MB (circular buffer)
- **Time limit (48h)** - Discard messages older than 48h

**Recommendation**: **Size limit (100MB)** - Balance between recovery window and disk usage. Alert if queue > 50MB.

---

### Question 3: Should Workspace support read-only LowDB fallback?
**Context**: Complete removal of LowDB forces migration, but read-only access could help recovery.

**Options**:
- **No LowDB** (current proposal) - Clean break, forces migration
- **Read-only LowDB** - Fallback for data recovery if TimescaleDB fails
- **Temporary LowDB** - Keep for 30 days post-migration, then remove

**Recommendation**: **No LowDB** (clean break). Migration script provides safe path, backup preserved for manual recovery.

---

## References

### Related Specs
- **NEW**: `specs/tp-capital-telegram-gateway/spec.md` (this proposal)
- **MODIFIED**: `specs/tp-capital-api/spec.md` (this proposal)
- **MODIFIED**: `specs/workspace-service/spec.md` (this proposal)
- **EXISTING**: `specs/status/spec.md` (affected - health check updates)

### Affected Documentation
- `CLAUDE.md` - Update TP Capital + Workspace architecture sections
- `docs/context/ops/service-port-map.md` - Add Gateway (4006), mark API/Workspace as containerized
- `docs/context/backend/guides/guide-tp-capital.md` - Complete rewrite for split architecture
- `docs/context/backend/api/workspace/README.md` - Update for containerization + LowDB removal
- `docs/context/ops/service-startup-guide.md` - Add Gateway systemd service
- `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` - Document separate .env files
- `docs/context/ops/containerization-guide.md` - NEW - Comprehensive containerization guide

### Related Proposals
- `split-tp-capital-into-gateway-api` - Original split proposal (integrated here)
- `containerize-tp-capital-workspace` - Original containerization proposal (partially integrated)

### Future ADRs
- **ADR-00X**: Two-tier architecture pattern for services with persistent connections
- **ADR-00Y**: systemd vs Docker for session-based services
- **ADR-00Z**: TimescaleDB-only strategy for persistence layer

---

**Status**: 🟡 Proposal Stage (awaiting approval)
**Approval Required**: Architecture team, DevOps, Security
**Next Steps**: Review proposal → Approve → Begin implementation Phase 1
**Timeline**: 18-24 hours total effort over 5-7 days (with testing windows)
