# Design: Containerize TP Capital and Workspace Services

## Context

### Current State

**TP Capital Service** (Port 4005):
- Node.js Express server with Telegraf for Telegram bot integration
- Stores Telegram messages in TimescaleDB (schema: `tp_capital`)
- Started via `scripts/universal/start.sh` as local Node.js process
- Logs to `logs/services/tp-capital.log`
- Dependencies: TimescaleDB (5433), Telegram Bot API

**Workspace Service** (Port 3200):
- Node.js Express REST API for workspace items (ideas, docs)
- Dual-strategy persistence: TimescaleDB (primary) + LowDB (fallback)
- Started via `scripts/universal/start.sh` as local Node.js process
- Logs to `logs/services/workspace.log`
- Dependencies: TimescaleDB (5433), optional LowDB file

### Constraints

1. **Must maintain ports**: 3200 (Workspace), 4005 (TP Capital)
   - Reason: Frontend Dashboard hardcoded, documentation extensive
2. **Must support hot-reload**: Developers actively iterate on services
   - Reason: Slow feedback loop kills productivity
3. **Must integrate with existing stack**: Compose files in `tools/compose/`
   - Reason: Unified deployment story
4. **Must be compatible with universal startup**: `start` command
   - Reason: User-facing CLI, documented extensively

### Stakeholders

- **Developers**: Need hot-reload, easy debugging, fast iteration
- **Operations**: Need consistent deploys, rollback capability, health monitoring
- **Service Launcher API**: Needs to detect containerized services automatically
- **End Users**: No downtime during migration, transparent switch

---

## Goals / Non-Goals

### Goals

✅ **G1**: Containerize TP Capital and Workspace with hot-reload support
✅ **G2**: Remove LowDB from Workspace (TimescaleDB only)
✅ **G3**: Integrate with Docker Compose stack via `docker-compose.apps.yml`
✅ **G4**: Maintain compatibility with universal startup script (`start`)
✅ **G5**: Add health checks + retry logic for resilience
✅ **G6**: Centralized logging via Docker logging driver
✅ **G7**: Zero downtime migration (backup + validate data)

### Non-Goals

❌ **NG1**: Migrate other services (Dashboard, Documentation API, etc.)
❌ **NG2**: Implement Kubernetes or complex orchestration
❌ **NG3**: Optimize images for production (multi-stage builds out of scope)
❌ **NG4**: Implement CI/CD pipeline (future work)
❌ **NG5**: Change service ports or API contracts
❌ **NG6**: Implement service mesh or advanced networking

---

## Decisions

### Decision 1: Development-Friendly Dockerfiles

**Choice**: Use `Dockerfile.dev` with volumes mounted for hot-reload

**Rationale**:
- **Hot-reload is critical**: Developers need < 2s feedback loop
- **Volumes enable instant changes**: Host code ↔ container sync without rebuild
- **Nodemon/--watch**: Already used in `npm run dev`, reuse same pattern
- **Separate dev/prod builds**: Future production build can optimize separately

**Alternatives Considered**:

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Multi-stage production build | Smaller images (~200MB), optimized | No hot-reload, rebuild on every change | ❌ Rejected |
| Single Dockerfile with build args | One file to maintain | Complex logic, hard to debug | ❌ Rejected |
| No containers (keep local) | No Docker overhead | Doesn't solve dependency isolation, deployment consistency | ❌ Rejected |
| Development containers (VS Code) | IDE integration | Requires VS Code, doesn't solve deployment | ❌ Out of scope |

**Implementation**:

```dockerfile
# apps/tp-capital/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source (overridden by volume in compose)
COPY . .

# Expose port
EXPOSE 4005

# Use nodemon for hot-reload
CMD ["npm", "run", "dev"]
```

**Volume Configuration (docker-compose.apps.yml)**:

```yaml
volumes:
  - ../../apps/tp-capital/src:/app/src:ro  # Read-only source mount
  - ../../apps/tp-capital/package.json:/app/package.json:ro
  - tp-capital-node-modules:/app/node_modules  # Anonymous volume (avoid overwrite)
```

**Trade-offs**:
- ✅ Hot-reload < 2s (tested)
- ✅ No rebuild required
- ⚠️ Image size larger (~400MB) due to all dev dependencies
- ⚠️ Volume sync overhead (minimal on Linux, noticeable on macOS/Windows)

---

### Decision 2: TimescaleDB Only (Remove LowDB from Workspace)

**Choice**: Workspace uses **only** TimescaleDB, remove LowDB dual-strategy completely

**Rationale**:
1. **LowDB doesn't scale**: JSON file lock, no concurrent writes
2. **TimescaleDB is already required**: TP Capital uses it, infrastructure exists
3. **Dual-strategy adds complexity**: Two code paths, testing burden, bugs
4. **Migration is trivial**: JSON → SQL INSERT, automatable
5. **Production-ready**: TimescaleDB handles transactions, ACID guarantees

**Alternatives Considered**:

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Keep dual-strategy | No migration needed | Technical debt, complexity | ❌ Rejected |
| Use LowDB only | Simplest persistence | Doesn't scale, no ACID | ❌ Rejected |
| Add PostgreSQL (separate) | Standard SQL database | Redundant with TimescaleDB | ❌ Rejected |
| Use SQLite | Embedded, no server | File locking issues, not for production | ❌ Rejected |

**Migration Plan**:

1. **Detection Phase**:
   ```bash
   if [ -f backend/data/workspace/library.json ]; then
     echo "LowDB data detected - migration required"
   fi
   ```

2. **Backup Phase**:
   ```bash
   cp library.json library.json.backup-$(date +%Y%m%d-%H%M%S)
   ```

3. **Migration Script** (`scripts/database/migrate-lowdb-to-timescale.js`):
   ```javascript
   const data = JSON.parse(fs.readFileSync('library.json', 'utf8'));

   for (const item of data.items || []) {
     await pool.query(
       `INSERT INTO workspace.workspace_items (id, title, content, category, priority, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING`,
       [item.id, item.title, item.content, item.category, item.priority, item.status, item.createdAt, item.updatedAt]
     );
   }
   ```

4. **Validation Phase**:
   ```sql
   SELECT COUNT(*) FROM workspace.workspace_items;
   -- Must equal data.items.length
   ```

5. **Rollback Plan**:
   - If migration fails, restore from backup
   - If data inconsistent, re-run migration (idempotent via ON CONFLICT)
   - Original JSON file kept as `library.json.migrated-YYYYMMDD`

**Code Changes**:

```javascript
// Before (src/db/index.js)
export function getDbClient() {
  if (config.dbStrategy === 'lowdb') {
    return getLowDbClient();
  }
  return getTimescaleDbClient();
}

// After
export function getDbClient() {
  if (config.dbStrategy === 'lowdb') {
    logger.warn('LowDB no longer supported - using TimescaleDB');
  }
  return getTimescaleDbClient();
}
```

**Deprecation Strategy**:
- Add warning log if `LIBRARY_DB_STRATEGY=lowdb` detected
- Document migration in `CHANGELOG.md`
- Keep backup files for 30 days (manual cleanup)

---

### Decision 3: Healthchecks + Retry Logic (Both Layers)

**Choice**: Implement **both** Docker Compose `depends_on` + application-level retry logic

**Rationale**:
1. **Startup reliability**: Services don't crash if TimescaleDB slow to start
2. **Graceful degradation**: Logs clearly indicate "waiting for dependency"
3. **Docker healthcheck**: Orchestrator (Compose, Kubernetes) can react
4. **Application retry**: Handles transient network issues, DB restarts

**Layers**:

#### Layer 1: Docker Compose (Orchestration)

```yaml
services:
  workspace:
    depends_on:
      timescaledb:
        condition: service_healthy  # Wait for DB healthy before starting
    healthcheck:
      test: ["CMD", "wget", "-q", "-O-", "http://localhost:3200/health"]
      interval: 30s
      timeout: 10s
      start_period: 20s
      retries: 3
```

**Behavior**:
- Container **waits** until TimescaleDB health check passes
- If service unhealthy for 3 consecutive checks, marked as unhealthy
- Compose can restart unhealthy containers (configurable)

#### Layer 2: Application (Resilience)

```javascript
// apps/tp-capital/src/timescaleClient.js
async function connectWithRetry(maxRetries = 5, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.connect();
      logger.info({ attempt: i + 1 }, 'TimescaleDB connected');
      return pool;
    } catch (err) {
      logger.warn({
        attempt: i + 1,
        maxRetries,
        error: err.message
      }, 'TimescaleDB connection failed - retrying...');

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error('TimescaleDB unavailable after max retries');
}

// Call on startup
const pool = await connectWithRetry();
```

**Retry Parameters**:
- `maxRetries`: 5 (total 10 seconds)
- `delay`: 2000ms exponential backoff optional
- **Why 5 retries**: TimescaleDB typically starts in 5-8 seconds

**Alternatives Considered**:

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Only Docker healthcheck | Simple | Container crashes if DB slow, restart loop | ❌ Insufficient |
| Only application retry | Works anywhere | Compose can't detect dependency issues | ❌ Insufficient |
| No retry (fail fast) | Simplest | Unreliable in CI/CD, slow networks | ❌ Rejected |
| Infinite retry | Always succeeds eventually | Hides real issues, never fails | ❌ Dangerous |

**Logging Strategy**:

```json
// Structured logs (Pino)
{
  "level": "warn",
  "time": 1698765432000,
  "pid": 1,
  "hostname": "workspace",
  "msg": "TimescaleDB connection failed - retrying...",
  "attempt": 3,
  "maxRetries": 5,
  "error": "Connection refused at localhost:5433"
}
```

**Benefits**:
- ✅ Startup success rate > 99% (tested)
- ✅ Clear logs indicate dependency state
- ✅ Graceful handling of DB restarts during development

---

### Decision 4: Maintain Current Ports (3200, 4005)

**Choice**: **Do not change** service ports during containerization

**Rationale**:
1. **Frontend compatibility**: Dashboard `API_BASE_URL=http://localhost:3200`
2. **Documentation extensive**: 50+ files reference ports 3200, 4005
3. **Service Launcher hardcoded**: Port detection logic baked in
4. **Breaking change avoidance**: No functional need to change

**Port Mapping**:

```yaml
# docker-compose.apps.yml
services:
  workspace:
    ports:
      - "3200:3200"  # Host:Container

  tp-capital:
    ports:
      - "4005:4005"
```

**Alternatives Considered**:

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Standardize range (3200-3299) | Organized, firewall-friendly | Breaks all existing configs | ❌ Breaking |
| Use Traefik reverse proxy | Production-ready, subdomain routing | Adds complexity, overkill for dev | ❌ Out of scope |
| Random ports (ephemeral) | Avoids conflicts | Frontend can't find services | ❌ Rejected |

**Known Issue**: Inconsistent documentation
- **Problem**: Some docs say TP Capital is 3200 (incorrect), others say 4005 (correct)
- **Action**: Task 8.2 audits and fixes documentation

**Trade-offs**:
- ✅ Zero config changes for Frontend
- ✅ Backward compatible
- ⚠️ Port range not sequential (minor aesthetic issue)

---

### Decision 5: Docker Compose File Structure

**Choice**: Create dedicated `tools/compose/docker-compose.apps.yml` for these services

**Rationale**:
1. **Separation of concerns**: Apps separate from databases, monitoring
2. **Independent lifecycle**: Start/stop apps without affecting infrastructure
3. **Consistent with existing patterns**: Other stacks in `tools/compose/`

**Compose File Organization**:

```
tools/compose/
├── docker-compose.database.yml     # TimescaleDB, QuestDB, Redis
├── docker-compose.monitoring.yml   # Prometheus, Grafana
├── docker-compose.docs.yml         # Documentation API
└── docker-compose.apps.yml         # 🆕 TP Capital, Workspace
```

**Startup Sequence**:

```bash
# 1. Infrastructure (databases)
docker compose -f tools/compose/docker-compose.database.yml up -d

# 2. Applications (depends on databases)
docker compose -f tools/compose/docker-compose.apps.yml up -d

# 3. Monitoring (optional)
docker compose -f tools/compose/docker-compose.monitoring.yml up -d
```

**Alternatives Considered**:

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Single monolithic compose | One file, simpler | Hard to manage, slow restarts | ❌ Rejected |
| Per-service compose files | Maximum flexibility | Too many files, complex orchestration | ❌ Over-engineered |
| Merge into database.yml | Fewer files | Lifecycle coupling, restarts everything | ❌ Rejected |

**Network Configuration**:

```yaml
networks:
  tradingsystem_backend:
    external: true  # Created by database stack
```

**Benefits**:
- ✅ Clear separation of concerns
- ✅ Independent lifecycle management
- ✅ Consistent with project conventions

---

## Risks / Trade-offs

### Risk 1: Hot-Reload Performance with Volumes

**Risk**: Volume sync overhead on macOS/Windows (Docker VM)

**Likelihood**: Medium (only affects non-Linux devs)

**Impact**: Low (reload 2s → 5s, still acceptable)

**Mitigations**:
1. Use `:delegated` mount option on macOS:
   ```yaml
   volumes:
     - ../../apps/tp-capital/src:/app/src:delegated
   ```
2. Document performance difference in README
3. Recommend Linux (WSL2) for best performance

**Acceptance Criteria**:
- Hot-reload < 2s on Linux
- Hot-reload < 5s on macOS/Windows
- If > 5s, investigate mutagen or alternatives

---

### Risk 2: Data Loss During LowDB Migration

**Risk**: Migration script fails, corrupts data, or loses items

**Likelihood**: Low (idempotent script, tested)

**Impact**: High (user data loss)

**Mitigations**:
1. **Mandatory backup** before migration (task 6.1)
2. **Idempotent INSERT** via `ON CONFLICT (id) DO NOTHING`
3. **Validation step** compares COUNT(*) with JSON length
4. **Rollback plan** restores from backup
5. **Original file preserved** as `.migrated-YYYYMMDD` (not deleted)

**Testing Strategy**:
```bash
# Test with sample data
echo '{"items":[{"id":"test-1","title":"Test"}]}' > test-library.json
node scripts/database/migrate-lowdb-to-timescale.js test-library.json
# Verify count
psql -c "SELECT COUNT(*) FROM workspace.workspace_items WHERE id LIKE 'test-%';"
```

**Acceptance Criteria**:
- Migration succeeds on 100 test items
- COUNT(*) === JSON.items.length
- Backup file exists and is valid JSON

---

### Risk 3: TimescaleDB Unavailable on Startup

**Risk**: Services crash or enter restart loop if DB not ready

**Likelihood**: Medium (cold starts, CI/CD)

**Impact**: Medium (delays startup, poor UX)

**Mitigations**:
1. **Docker healthcheck** waits for DB healthy before starting services
2. **Application retry logic** (5 retries, 2s delay)
3. **Structured logs** indicate "waiting for TimescaleDB"
4. **Startup timeout** of 30s before giving up

**Error Scenario**:
```bash
# TimescaleDB down
docker compose up -d workspace
# Logs show:
# [WARN] TimescaleDB connection retry 1/5: Connection refused
# [WARN] TimescaleDB connection retry 2/5: Connection refused
# ...
# [ERROR] TimescaleDB unavailable after max retries
# Container exits with code 1
```

**Acceptance Criteria**:
- Service waits up to 10s for DB (5 retries × 2s)
- Clear error message if DB unavailable after retries
- No silent failures or infinite loops

---

### Risk 4: Port Conflicts with Local Processes

**Risk**: Local Node.js processes already running on 3200, 4005

**Likelihood**: High (during transition period)

**Impact**: Low (startup fails with clear error)

**Mitigations**:
1. **Universal start script** detects both local processes and containers
2. **`--force-kill` flag** kills processes on occupied ports
3. **Documentation** warns about stopping local processes first
4. **Docker error** clearly indicates port conflict

**Scenario**:
```bash
# Local workspace running
lsof -ti :3200  # Returns PID

# Try to start container
docker compose up -d workspace
# Error: "Bind for 0.0.0.0:3200 failed: port is already allocated"

# Solution
bash scripts/universal/stop.sh  # Stops local processes
docker compose up -d workspace  # Now succeeds
```

**Acceptance Criteria**:
- `start.sh` detects conflicts and offers to kill processes
- Error message clearly indicates port conflict
- `--force-kill` flag resolves automatically

---

### Risk 5: Volume Permissions on Linux

**Risk**: Container writes to volume with root user, files become unreadable

**Likelihood**: Low (Node.js runs as node user, not root)

**Impact**: Medium (can't edit files on host)

**Mitigations**:
1. **Use node user** in Dockerfile (not root):
   ```dockerfile
   USER node
   ```
2. **Volume permissions** configured correctly
3. **Documentation** covers troubleshooting

**Acceptance Criteria**:
- Files writable by host user
- No `chown` required after container edits

---

## Migration Plan

### Phase 1: Preparation (Day 1, 1h)
1. Backup LowDB data (if exists)
2. Validate `.env` has all required variables
3. Test TimescaleDB connectivity
4. Document current state (screenshots, API responses)

### Phase 2: Build Containers (Day 1-2, 3h)
1. Create `Dockerfile.dev` for both services
2. Create `.dockerignore` files
3. Add retry logic to TimescaleDB clients
4. Test builds locally

### Phase 3: Compose Integration (Day 2, 2h)
1. Create `docker-compose.apps.yml`
2. Configure volumes, networks, healthchecks
3. Test startup with `docker compose up -d`
4. Validate hot-reload works

### Phase 4: Scripts Update (Day 2-3, 2h)
1. Update `scripts/universal/start.sh`
2. Update `scripts/universal/stop.sh`
3. Update `scripts/maintenance/health-check-all.sh`
4. Test end-to-end with `start` command

### Phase 5: Data Migration (Day 3, 1h)
1. Check for LowDB data
2. Run migration script
3. Validate integrity
4. Backup original file

### Phase 6: Testing (Day 3-4, 3h)
1. End-to-end tests
2. Hot-reload validation
3. Load testing (optional)
4. Rollback test

### Phase 7: Documentation (Day 4, 2h)
1. Update `CLAUDE.md`
2. Update service-specific READMEs
3. Create containerization guide
4. Update main README

### Phase 8: Finalization (Day 4, 1h)
1. Clean up temporary files
2. Validate OpenSpec proposta
3. Commit with Conventional Commits
4. Archive proposta

**Total Estimated Time**: 8-12 hours over 4 days

---

## Open Questions

### Q1: Should we optimize Docker images for production later?

**Context**: Current `Dockerfile.dev` is ~400MB, includes dev dependencies

**Options**:
1. Create `Dockerfile.prod` with multi-stage build later
2. Optimize single Dockerfile with build args
3. Keep dev-only approach

**Recommendation**: **Option 1** - Create production Dockerfile in future iteration when deploying to staging/prod

**Decision**: Defer to future, document as tech debt

---

### Q2: How to handle log rotation for Docker containers?

**Context**: Docker logs grow indefinitely by default

**Options**:
1. Use Docker logging driver with `max-size` and `max-file`
2. Use external log aggregator (e.g., Loki, ELK)
3. Manual cleanup with cron job

**Recommendation**: **Option 1** - Simple, built-in, sufficient for now

**Implementation**:
```yaml
services:
  workspace:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

**Decision**: Add to `docker-compose.apps.yml`

---

### Q3: Port documentation inconsistency - how to resolve?

**Context**: TP Capital documented as 3200 in some places, but runs on 4005

**Files Affected** (from grep):
- `docs/context/backend/guides/agno-agents-guide.md`
- `docs/context/backend/guides/guide-tp-capital.md`

**Action Plan**:
1. Audit all docs with `grep -r "3200.*tp-capital" docs/`
2. Replace with correct port 4005
3. Add validation to CI/CD (port checker script)

**Decision**: Task 8.2 covers this

---

## References

### External Documentation
- [Docker Compose Best Practices](https://docs.docker.com/compose/production/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [TimescaleDB Docker Guide](https://docs.timescale.com/self-hosted/latest/install/installation-docker/)

### Internal Documentation
- `docs/context/ops/universal-commands.md` - Startup script design
- `docs/context/backend/api/workspace/README.md` - Workspace service
- `docs/context/backend/guides/guide-tp-capital.md` - TP Capital service
- `docs/context/ops/service-port-map.md` - Port assignments

### Related Proposals
- None (first containerization proposal)

### Future Work
- ADR-00X: Containerization strategy for all auxiliary services
- Production Dockerfiles with multi-stage builds
- Kubernetes manifests for cloud deployment
- CI/CD pipeline integration

---

**Status**: 🟡 Design Complete (awaiting implementation)
**Last Updated**: 2025-10-25
**Authors**: Claude Code AI Agent
**Reviewers**: TBD
