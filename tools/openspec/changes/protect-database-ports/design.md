# Technical Design: Database Port Protection

**Change ID**: `protect-database-ports`  
**Created**: 2025-11-03  

---

## Context

The TradingSystem currently has 8 database containers and 6 database UI containers with ports scattered across multiple ranges (5xxx, 6xxx, 8xxx, 9xxx). Port conflicts occur during multi-service startup, causing container restarts and user anxiety about data loss (though data is actually protected by named volumes).

**Current Constraints**:
- Must maintain 100% data integrity (non-negotiable)
- Minimize service downtime (< 10 minutes acceptable)
- Centralized .env configuration (project standard)
- Docker Compose V2 orchestration
- WSL2 environment with port forwarding to Windows

**Stakeholders**:
- Development team (needs stable local environment)
- DevOps (manages infrastructure)
- End users (require reliable database access)

---

## Goals / Non-Goals

### Goals ✅

1. **Eliminate port conflicts** for database services
2. **Protect data integrity** during migration (100% requirement)
3. **Establish clear convention** for port allocation
4. **Enable future scaling** with reserved port range
5. **Improve troubleshooting** with predictable port patterns

### Non-Goals ❌

1. **NOT changing database engines** (TimescaleDB, QuestDB, etc. remain)
2. **NOT implementing clustering** (single-node databases OK for now)
3. **NOT optimizing query performance** (separate concern)
4. **NOT changing data models** (schemas unchanged)
5. **NOT implementing service mesh** (network topology unchanged)

---

## High-Level Design

### Port Range Allocation

```
┌─────────────────────────────────────────────────────────┐
│  TradingSystem Port Allocation Strategy                 │
├─────────────────────────────────────────────────────────┤
│  3000-3999: Frontend & APIs                             │
│  4000-4999: Services (Trading, Analytics, Ingestion)    │
│  7000-7999: DATABASES & DATA (PROTECTED RANGE) 🔒        │
│  8000-8999: Tools & Infrastructure                      │
│  9000-9999: Monitoring                                  │
└─────────────────────────────────────────────────────────┘

Detailed 7000-7999 Breakdown:
├─ 7000-7099: Primary Databases
│  ├─ 7000: TimescaleDB (main)
│  ├─ 7001: TimescaleDB Backup
│  ├─ 7002: PostgreSQL LangGraph
│  ├─ 7003: Kong DB
│  ├─ 7010: QuestDB HTTP
│  ├─ 7011: QuestDB ILP
│  ├─ 7012: QuestDB Influx
│  ├─ 7020: Qdrant HTTP
│  ├─ 7021: Qdrant gRPC
│  └─ 7030: Redis
│
├─ 7100-7199: Database UIs
│  ├─ 7100: PgAdmin
│  ├─ 7101: Adminer
│  └─ 7102: PgWeb
│
├─ 7200-7299: Exporters & Metrics
│  └─ 7200: TimescaleDB Exporter
│
└─ 7300-7999: Reserved (future expansion)
```

---

## Decisions

### Decision 1: Use Range 7000-7999 (vs 5000-5999 or 6000-6999)

**Rationale**:
- 7000-7999 has minimal collision with common services
- Provides 1000 ports (future-proof for scaling)
- Easy to remember (7 = databases/data)
- Not commonly used by standard services

**Alternatives Considered**:
1. **5000-5999**: Already heavily used by dev tools, npm, etc. (rejected)
2. **6000-6999**: Some overlap with X11, VNC services (rejected)
3. **10000-10999**: Too high, not intuitive (rejected)

**Trade-offs**:
- ✅ Pro: Clear separation, minimal conflicts
- ⚠️ Con: Requires one-time migration

---

### Decision 2: Named Volumes for Data Persistence

**Rationale**:
Already implemented ✅ (no change needed). Docker named volumes ensure data persists across container recreations.

**Current Implementation**:
```yaml
volumes:
  data-timescale-data:
    name: data-timescale-data
    driver: local
```

**Guarantees**:
- Data survives `docker compose down` + `up`
- Data survives port remapping
- Data only lost if volume explicitly deleted

**Alternatives Considered**:
1. **Bind mounts**: Less portable, permission issues (rejected)
2. **Volume plugins** (e.g., NFS): Unnecessary complexity for local dev (rejected)

**Trade-offs**:
- ✅ Pro: Simple, reliable, portable
- ⚠️ Con: Requires manual backup for disaster recovery

---

### Decision 3: Centralized .env Configuration

**Rationale**:
Already project standard ✅ (no change needed). All services must reference root `.env`, never local `.env` files.

**Implementation**:
```javascript
// backend/api/*/src/config.js
import dotenv from 'dotenv';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });
```

**Enforcement**:
- Pre-commit hook validates no local `.env` files
- Load-env.js module ensures consistent loading

**Trade-offs**:
- ✅ Pro: Single source of truth, easy updates
- ⚠️ Con: Requires discipline to not create local .env

---

### Decision 4: Gradual Rollout (vs Big Bang)

**Rationale**:
Migrate in phases to reduce risk:
1. Local dev (Day 1)
2. Staging (Day 3)
3. Production (Day 5)

**Alternatives Considered**:
1. **Big bang** (all at once): Higher risk, faster completion (rejected)
2. **Per-database migration**: Too granular, complex dependencies (rejected)

**Trade-offs**:
- ✅ Pro: Risk mitigation, easier rollback
- ⚠️ Con: Longer total timeline

---

### Decision 5: Automated Migration Script

**Rationale**:
Complex multi-step process benefits from automation and repeatability.

**Implementation**:
`scripts/database/migrate-to-protected-ports.sh` handles:
- Pre-flight validation
- Backup creation
- Port updates (docker-compose + .env)
- Container restart
- Post-migration validation

**Alternatives Considered**:
1. **Manual steps**: Error-prone, not repeatable (rejected)
2. **Ansible playbook**: Overkill for single migration (rejected)

**Trade-offs**:
- ✅ Pro: Repeatable, testable, less error-prone
- ⚠️ Con: Upfront effort to create script

---

## Migration Plan

### Pre-Migration Checklist

```bash
# 1. Verify current state
docker ps --filter "name=data-"
docker volume ls | grep "data-"

# 2. Check port range availability
for port in {7000..7200}; do
  lsof -i :$port 2>/dev/null && echo "⚠️  Port $port in use"
done

# 3. Create backups
bash scripts/database/backup-all-databases.sh

# 4. Test rollback procedure
bash scripts/database/test-rollback.sh
```

### Migration Steps

```bash
# 1. Execute migration
bash scripts/database/migrate-to-protected-ports.sh

# 2. Validate databases
docker ps --filter "name=data-"
curl http://localhost:7000  # TimescaleDB
curl http://localhost:7010  # QuestDB
curl http://localhost:7020/collections  # Qdrant

# 3. Validate apps
curl http://localhost:3201/health  # Workspace
curl http://localhost:4006/health  # TP Capital

# 4. Monitor for issues
docker stats --no-stream
docker logs <container-name>
```

### Rollback Procedure

```bash
# If migration fails:

# 1. Stop new configuration
docker compose -f tools/compose/docker-compose.database.yml down

# 2. Restore backups
cp .env.backup .env
cp tools/compose/docker-compose.database.yml.backup tools/compose/docker-compose.database.yml

# 3. Restart with old configuration
docker compose -f tools/compose/docker-compose.database.yml up -d

# 4. Verify
docker ps --filter "name=data-"
curl http://localhost:5432  # Old TimescaleDB port

# 5. Investigate failure
cat /tmp/migration-error.log
```

**Rollback SLA**: < 5 minutes

---

## Component Architecture

### Before Migration

```
┌─────────────────────────────────────────────────────────┐
│  Current Port Layout (Scattered)                        │
├─────────────────────────────────────────────────────────┤
│  TimescaleDB:    5432 ┐                                 │
│  TS Backup:      5437 ├─ No clear pattern              │
│  Postgres Lang:  5438 ┘                                 │
│  QuestDB:        9001 ┐                                 │
│  QuestDB HTTP:   9010 ├─ Different range               │
│  QuestDB ILP:    8814 ┘                                 │
│  Qdrant:         6333 ← Another range                   │
│  Redis:          6380 ← Another range                   │
│  PgAdmin:        5051 ← Mixed with DBs                  │
│  Adminer:        8082 ← Another range                   │
│  PgWeb:          8083 ← Another range                   │
└─────────────────────────────────────────────────────────┘

❌ Problems:
- Ports spread across 5 different ranges
- Hard to identify what's a database
- Frequent conflicts with app services
- No room for expansion
```

### After Migration

```
┌─────────────────────────────────────────────────────────┐
│  New Port Layout (Protected Range 7000-7999) 🔒         │
├─────────────────────────────────────────────────────────┤
│  7000-7099: Databases                                   │
│  ├─ 7000: TimescaleDB                                   │
│  ├─ 7001: TimescaleDB Backup                            │
│  ├─ 7002: PostgreSQL LangGraph                          │
│  ├─ 7003: Kong DB                                       │
│  ├─ 7010: QuestDB HTTP                                  │
│  ├─ 7011: QuestDB ILP                                   │
│  ├─ 7012: QuestDB Influx                                │
│  ├─ 7020: Qdrant HTTP                                   │
│  ├─ 7021: Qdrant gRPC                                   │
│  └─ 7030: Redis                                         │
│                                                          │
│  7100-7199: Database UIs                                │
│  ├─ 7100: PgAdmin                                       │
│  ├─ 7101: Adminer                                       │
│  └─ 7102: PgWeb                                         │
│                                                          │
│  7200-7299: Exporters                                   │
│  └─ 7200: TimescaleDB Exporter                          │
│                                                          │
│  7300-7999: Reserved (future)                           │
└─────────────────────────────────────────────────────────┘

✅ Benefits:
- All databases in ONE predictable range
- Easy to enforce (7xxx = database)
- 1000 ports available (future-proof)
- Zero conflicts with apps
- Clear convention
```

---

## Data Flow

### Database Connection Pattern

```
Application Container
       ↓
   Read .env (TIMESCALEDB_PORT=7000)
       ↓
   Load config.js
       ↓
   Create pg.Pool({ host: 'localhost', port: 7000 })
       ↓
   WSL2 Port Forward (automatic)
       ↓
   Docker Network (tradingsystem_backend)
       ↓
   TimescaleDB Container (internal port 5432)
       ↓
   Named Volume (data-timescale-data)
```

**Key Points**:
- External port: 7000 (new convention)
- Internal port: 5432 (PostgreSQL default, unchanged)
- Volume: Persistent, survives container recreation
- Network: Isolated backend network

---

## Security Considerations

### Port Exposure

**Current**: All database ports exposed to localhost (WSL2 → Windows)
- ✅ Acceptable for local development
- ⚠️ Should add firewall rules for production

**Future Enhancement**:
```yaml
# Option: Limit to Docker network only (no host exposure)
# Remove port mappings, use container-to-container communication
# Apps would connect via service name instead of localhost
```

### Credentials

- ✅ Passwords in `.env` (gitignored)
- ✅ No hardcoded credentials
- ⚠️ Consider Vault integration for production

---

## Performance Considerations

### Port Change Impact

**Analysis**: Changing external port number has **ZERO performance impact**.
- Database internals unchanged
- Connection pooling unchanged
- Query performance unchanged
- Only configuration update needed

**Benchmark Plan**:
```bash
# Before migration
ab -n 1000 -c 10 http://localhost:3201/api/items  # Workspace API

# After migration  
ab -n 1000 -c 10 http://localhost:3201/api/items  # Should be identical
```

### Resource Allocation

**No changes to**:
- Memory limits
- CPU allocation
- Disk I/O limits
- Network bandwidth

---

## Risks / Trade-offs

### Risk 1: Service Downtime During Migration

**Likelihood**: HIGH  
**Impact**: MEDIUM (5-10 minutes)  
**Mitigation**:
- Schedule maintenance window
- Notify team in advance
- Prepare rollback procedure
- Monitor closely during migration

### Risk 2: Application Connection Failures

**Likelihood**: MEDIUM  
**Impact**: MEDIUM  
**Mitigation**:
- Centralized .env ensures all apps update simultaneously
- Test connection logic before migration
- Have rollback script ready

### Risk 3: Monitoring Dashboards Break

**Likelihood**: MEDIUM  
**Impact**: LOW (no data loss, just visibility)  
**Mitigation**:
- Update Prometheus configs in same deployment
- Update Grafana dashboards before migration
- Test dashboards in staging first

### Risk 4: Data Corruption

**Likelihood**: VERY LOW  
**Impact**: CRITICAL  
**Mitigation**:
- Named volumes ensure data persistence
- Full backup before migration
- Verify checksums post-migration
- Test data integrity with queries

---

## Implementation Details

### Docker Compose Changes

**File**: `tools/compose/docker-compose.database.yml`

**Before**:
```yaml
services:
  timescaledb:
    ports:
      - "5432:5432"
```

**After**:
```yaml
services:
  timescaledb:
    ports:
      - "${TIMESCALEDB_PORT:-7000}:5432"
```

**Pattern**: `${VAR:-default}:internal-port`
- External port from .env (or default)
- Internal port unchanged (database standard)

### Environment Variables

**File**: `.env`

**New Variables**:
```bash
# Database Ports (7000-7099)
TIMESCALEDB_PORT=7000
TIMESCALEDB_BACKUP_PORT=7001
POSTGRES_LANGGRAPH_PORT=7002
KONG_DB_PORT=7003
QUESTDB_HTTP_PORT=7010
QUESTDB_ILP_PORT=7011
QUESTDB_INFLUX_PORT=7012
QDRANT_HTTP_PORT=7020
QDRANT_GRPC_PORT=7021
REDIS_PORT=7030

# Database UI Ports (7100-7199)
PGADMIN_PORT=7100
ADMINER_PORT=7101
PGWEB_PORT=7102

# Exporter Ports (7200-7299)
TIMESCALEDB_EXPORTER_PORT=7200
```

### Application Config Updates

**Example**: `backend/api/workspace/src/config.js`

**Before**:
```javascript
const dbPort = process.env.TIMESCALEDB_PORT || 5432;
```

**After**:
```javascript
const dbPort = process.env.TIMESCALEDB_PORT || 7000;
```

**Note**: Falls back to new default if .env not loaded

---

## Testing Strategy

### Unit Tests

```javascript
// Test config loading
describe('Database Config', () => {
  it('should use TIMESCALEDB_PORT from .env', () => {
    expect(config.database.port).toBe(7000);
  });
  
  it('should connect to TimescaleDB on port 7000', async () => {
    const client = new pg.Client(config.database);
    await expect(client.connect()).resolves.not.toThrow();
  });
});
```

### Integration Tests

```bash
#!/bin/bash
# Test database connections on new ports

echo "Testing TimescaleDB (7000)..."
PGPASSWORD=pass_timescale psql -h localhost -p 7000 -U timescale -d trading -c "SELECT 1"

echo "Testing QuestDB (7010)..."
curl -s http://localhost:7010/exec?query=SELECT%201

echo "Testing Qdrant (7020)..."
curl -s http://localhost:7020/collections

echo "Testing Redis (7030)..."
redis-cli -h localhost -p 7030 PING
```

### Health Checks

```bash
# Run comprehensive health check
bash scripts/maintenance/health-check-all.sh

# Expected output:
# ✅ TimescaleDB (7000): healthy
# ✅ QuestDB (7010): healthy
# ✅ Qdrant (7020): healthy
# ✅ Redis (7030): healthy
```

---

## Monitoring & Observability

### Metrics to Track

**Before Migration**:
- Database connection success rate
- Container uptime
- Port conflict frequency
- Service restart count

**After Migration**:
- Same metrics (should improve)
- Port range utilization (7000-7999)
- Migration success rate

### Dashboards

**Grafana Dashboard**: "Database Port Health"
- Panel 1: Port range usage (7000-7999)
- Panel 2: Database connection status
- Panel 3: Container uptime
- Panel 4: Port conflict events (should be zero)

### Alerts

```yaml
# Prometheus Alert Rules
groups:
  - name: database_ports
    interval: 30s
    rules:
      - alert: UnauthorizedPortUsage
        expr: port_in_use{port >= 7000, port <= 7999, service != "database"}
        for: 5m
        annotations:
          summary: "Unauthorized use of protected database port range"
      
      - alert: DatabasePortConflict
        expr: database_connection_failures > 5
        for: 2m
        annotations:
          summary: "Database experiencing connection failures"
```

---

## Rollback Strategy

### Trigger Conditions

Execute rollback if:
1. Migration fails at any step
2. Data integrity check fails
3. > 50% of apps can't connect
4. Critical production issue detected

### Rollback Procedure

```bash
#!/bin/bash
# scripts/database/rollback-port-migration.sh

echo "🔄 Rolling back to previous port configuration..."

# 1. Stop containers
docker compose -f tools/compose/docker-compose.database.yml down

# 2. Restore configurations
cp .env.backup .env
cp tools/compose/docker-compose.database.yml.backup tools/compose/docker-compose.database.yml

# 3. Restart with old configuration
docker compose -f tools/compose/docker-compose.database.yml up -d

# 4. Verify
docker ps --filter "name=data-"

# 5. Test connections
curl http://localhost:5432  # Old TimescaleDB port

echo "✅ Rollback complete"
```

**SLA**: < 5 minutes

---

## Future Enhancements

### Phase 2 (Future)

1. **Database Clustering**:
   - TimescaleDB: Multi-node with replication
   - Qdrant: Distributed cluster (already planned)
   - Redis: Sentinel for HA

2. **Network Isolation**:
   - Remove host port exposure
   - Use Docker DNS for service discovery
   - Apps connect via service names

3. **Dynamic Port Allocation**:
   - Service registry (Consul/etcd)
   - Automatic conflict resolution
   - Health-based routing

4. **Advanced Monitoring**:
   - Port usage heatmap
   - Predictive conflict detection
   - Automated remediation

---

## Open Questions

1. **Q**: Should we also standardize non-database service ports?
   **A**: Future work, outside scope of this change

2. **Q**: What about production deployment with different infrastructure?
   **A**: Same principles apply, adjust port range if needed

3. **Q**: Should we implement blue-green deployment for zero downtime?
   **A**: Future enhancement, current <10 min downtime acceptable

4. **Q**: How to handle external tools (e.g., DBeaver) connecting to databases?
   **A**: Update connection strings manually, document in migration guide

---

## Validation Criteria

### Pre-Deployment

- [ ] All tests pass
- [ ] Backup successfully created
- [ ] Rollback tested in staging
- [ ] Documentation complete
- [ ] Team trained on new ports

### Post-Deployment

- [ ] Zero data loss verified
- [ ] All health checks pass
- [ ] Apps connecting successfully
- [ ] Monitoring dashboards working
- [ ] No port conflicts detected for 7 days

---

**Design Version**: 1.0  
**Last Updated**: 2025-11-03  
**Status**: Ready for Implementation  

