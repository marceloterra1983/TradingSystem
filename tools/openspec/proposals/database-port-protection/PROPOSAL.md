# Database Port Protection & Convention

**Status**: Proposal  
**Author**: AI Assistant (Claude)  
**Created**: 2025-11-03  
**Type**: Infrastructure Change  
**Priority**: P1 (High)  
**Scope**: Database Layer, Infrastructure, Configuration  

---

## Summary

Implement a protected port range (7000-7999) exclusively for databases to prevent port conflicts and ensure data persistence. This proposal includes automated migration, comprehensive documentation, and integration with existing Claude agents and MCP servers.

---

## Problem Statement

### Current Issues

1. **Port Conflicts**: Database ports are scattered (5432, 6333, 9001) causing conflicts with other services
2. **Data Loss Risk**: Port conflicts force container restarts, creating perceived risk of data loss
3. **No Convention**: Lack of standardized port assignment makes conflict prevention difficult
4. **Management Overhead**: Difficult to identify which ports belong to databases vs applications

### Impact

- **Frequency**: Port conflicts occur during multi-service startup
- **Severity**: HIGH - Can cause database connection failures and service downtime
- **User Experience**: Confusing when services fail due to port conflicts
- **Data Integrity**: While volumes protect data, conflicts create unnecessary restarts

---

## Proposed Solution

### 1. Protected Port Range: 7000-7999

Reserve 1000 ports exclusively for database and data-related services:

```
7000-7099: Primary Databases
7100-7199: Database UIs
7200-7299: Exporters & Metrics
7300-7999: Reserved for future expansion
```

### 2. Port Mapping Convention

| Service | Current | New | Reason |
|---------|---------|-----|--------|
| TimescaleDB | 5432 | 7000 | Primary database |
| TimescaleDB Backup | 5437 | 7001 | Backup instance |
| PostgreSQL LangGraph | 5438 | 7002 | AI data storage |
| Kong DB | 5433 | 7003 | Gateway database |
| QuestDB | 9001 | 7010 | Time-series DB |
| QuestDB HTTP | 9010 | 7011 | Query API |
| QuestDB ILP | 8814 | 7012 | Ingestion |
| Qdrant | 6333 | 7020 | Vector database |
| Qdrant gRPC | 6334 | 7021 | gRPC API |
| Redis | 6380 | 7030 | Cache |
| PgAdmin | 5051 | 7100 | Admin UI |
| Adminer | 8082 | 7101 | Admin UI |
| PgWeb | 8083 | 7102 | Web UI |
| TS Exporter | 9188 | 7200 | Prometheus exporter |

### 3. Data Protection Strategy

**Already Implemented** ✅:
- Docker named volumes for all databases
- `restart: unless-stopped` policy
- Health checks with retries

**To Be Added**:
- Automated daily backups
- Volume backup scripts
- Port conflict detection

### 4. Integration with Claude Agents

Leverage existing `.claude/agents/docker-health-optimizer.md` agent:

**Enhanced Capabilities**:
```markdown
- Port conflict detection for database range (7000-7999)
- Volume health monitoring
- Automated backup verification
- Database connection testing
```

**New Agent**: `database-port-guardian.md`
```markdown
- Monitors port usage in protected range
- Alerts on unauthorized port usage
- Validates database configurations
- Provides migration guidance
```

### 5. MCP Server Integration

Use existing MCP servers:

**`docker-compose` MCP**:
- List database containers
- Check port mappings
- Validate volume mounts

**`fs-tradingsystem` MCP**:
- Read/update docker-compose files
- Update .env configurations
- Generate migration reports

**`postgres-frontend-apps` MCP**:
- Validate database connections
- Test new port configurations
- Verify data integrity

---

## Implementation Plan

### Phase 1: Preparation (Day 1)

**Tasks**:
1. Create comprehensive backup of all databases
2. Backup docker-compose files
3. Create rollback scripts
4. Update documentation

**Deliverables**:
- `backups/database-migration-YYYYMMDD/`
- Rollback procedure documented
- Migration checklist

**Agent Usage**:
```bash
/docker-health-check before-migration
```

### Phase 2: Port Migration (Day 1)

**Tasks**:
1. Update `docker-compose.database.yml` with new ports
2. Update `.env` with new port variables
3. Stop database containers
4. Start containers with new configuration
5. Verify data integrity

**Automation**:
```bash
bash scripts/database/migrate-to-protected-ports.sh
```

**Agent Validation**:
```bash
/docker-health-check after-migration
/database-port-guardian validate
```

### Phase 3: Application Updates (Day 2)

**Tasks**:
1. Update all apps connecting to databases
2. Update health check scripts
3. Update monitoring configurations
4. Test all database connections

**Files to Update**:
- `backend/api/workspace/src/config.js`
- `backend/api/tp-capital/src/config.js`
- `backend/api/documentation-api/src/config.js`
- `backend/api/telegram-gateway/src/config.js`
- `.env` (centralized config)

### Phase 4: Documentation & Tooling (Day 2)

**Tasks**:
1. Update all documentation
2. Create port conflict detection tool
3. Add database port tests to CI/CD
4. Create monitoring dashboards

**Deliverables**:
- `PORTS-CONVENTION.md` (updated)
- Port conflict checker script
- GitHub Actions workflow
- Grafana dashboard

### Phase 5: Monitoring & Validation (Ongoing)

**Tasks**:
1. Monitor for 7 days
2. Validate no conflicts occur
3. Verify backup automation
4. Document lessons learned

**Agent Schedule**:
```bash
# Daily health check
0 8 * * * /docker-health-check all

# Weekly port validation
0 0 * * 0 /database-port-guardian validate
```

---

## Technical Details

### Docker Compose Changes

**Before**:
```yaml
timescaledb:
  ports:
    - "5432:5432"
```

**After**:
```yaml
timescaledb:
  ports:
    - "${TIMESCALEDB_PORT:-7000}:5432"
```

### Environment Variables

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

### Volume Verification

```bash
# Verify volumes exist before migration
docker volume ls | grep "data-"

# Expected volumes:
# - data-timescale-data
# - data-questdb-data
# - data-qdrant-storage
# - data-postgres-langgraph
# - data-redis
```

### Rollback Procedure

```bash
# 1. Stop new configuration
docker compose -f tools/compose/docker-compose.database.yml down

# 2. Restore old configuration
cp tools/compose/docker-compose.database.yml.backup tools/compose/docker-compose.database.yml
cp .env.backup .env

# 3. Restart with old ports
docker compose -f tools/compose/docker-compose.database.yml up -d

# 4. Verify
curl http://localhost:5432  # Old TimescaleDB port
```

---

## Testing Strategy

### Pre-Migration Tests

```bash
# 1. Verify all databases are healthy
docker ps --filter "name=data-" --format "{{.Names}}: {{.Status}}"

# 2. Test all connections
curl http://localhost:5432  # TimescaleDB
curl http://localhost:9001  # QuestDB
curl http://localhost:6333/collections  # Qdrant

# 3. Verify data exists
docker exec data-timescale psql -U timescale -d APPS-WORKSPACE -c "SELECT COUNT(*) FROM workspace_items"
```

### Post-Migration Tests

```bash
# 1. Verify containers started
docker ps --filter "name=data-"

# 2. Test new ports
curl http://localhost:7000  # TimescaleDB (new)
curl http://localhost:7010  # QuestDB (new)
curl http://localhost:7020/collections  # Qdrant (new)

# 3. Verify data integrity
docker exec data-timescale psql -U timescale -d APPS-WORKSPACE -c "SELECT COUNT(*) FROM workspace_items"

# 4. Test application connections
curl http://localhost:3201/health  # Workspace
curl http://localhost:4006/health  # TP Capital
```

### Integration Tests

```bash
# Run full test suite
npm run test:integration

# Test database connections
npm run test:database

# Test API endpoints
npm run test:api
```

---

## Risk Analysis

### Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | LOW | CRITICAL | Named volumes + backups |
| Service downtime | MEDIUM | HIGH | Scheduled maintenance window |
| App connection failures | MEDIUM | MEDIUM | Update .env centrally |
| Port conflicts in new range | LOW | LOW | Validate range is free |
| Rollback required | LOW | MEDIUM | Documented rollback procedure |

### Failure Scenarios

**Scenario 1**: Migration fails, containers won't start
- **Response**: Execute rollback procedure
- **Time**: < 5 minutes
- **Data Impact**: None (volumes preserved)

**Scenario 2**: Apps can't connect to databases
- **Response**: Update .env, restart apps
- **Time**: < 10 minutes
- **Data Impact**: None

**Scenario 3**: Port 7000+ already in use
- **Response**: Use alternative range (7500-7999)
- **Time**: < 15 minutes
- **Data Impact**: None

---

## Success Criteria

### Must Have ✅

- [ ] All databases accessible on ports 7000-7999
- [ ] Zero data loss during migration
- [ ] All applications connecting successfully
- [ ] Documentation updated
- [ ] Rollback procedure tested

### Should Have 🎯

- [ ] Automated migration script working
- [ ] Claude agents updated with new logic
- [ ] Port conflict detection tool created
- [ ] Monitoring dashboards updated

### Nice to Have 💡

- [ ] Automated daily backups implemented
- [ ] GitHub Actions CI/CD updated
- [ ] Performance benchmarks showing no degradation
- [ ] Blog post documenting the migration

---

## Dependencies

### Required

- Docker 20.10+
- Docker Compose V2
- Bash 4.0+
- curl, jq (for testing)

### Services Affected

- **Direct**: All database containers (8 services)
- **Indirect**: All apps connecting to databases (4 services)
- **Related**: Monitoring (Prometheus, Grafana)

### Files Modified

```
tools/compose/docker-compose.database.yml
.env
backend/api/workspace/src/config.js
backend/api/tp-capital/src/config.js
backend/api/documentation-api/src/config.js
backend/api/telegram-gateway/src/config.js
scripts/start.sh
docs/content/tools/ports-services/
PORTS-CONVENTION.md
```

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Preparation | 2 hours | Day 1 AM | Day 1 AM |
| Migration | 1 hour | Day 1 PM | Day 1 PM |
| App Updates | 3 hours | Day 2 AM | Day 2 PM |
| Documentation | 2 hours | Day 2 PM | Day 2 PM |
| Monitoring | 7 days | Day 3 | Day 10 |

**Total Estimated Time**: 2 days active work + 7 days monitoring

---

## Alternatives Considered

### Option 1: Keep Current Ports (Rejected)

**Pros**:
- No migration needed
- Zero risk

**Cons**:
- Conflicts continue
- No organization
- Difficult to scale

### Option 2: Use Port 5000-5999 (Rejected)

**Pros**:
- Common database range

**Cons**:
- Already heavily used by applications
- Doesn't solve conflict problem

### Option 3: Dynamic Port Allocation (Rejected)

**Pros**:
- Automatic conflict avoidance

**Cons**:
- Complex to implement
- Harder to document
- Service discovery needed

---

## Rollout Strategy

### Environments

1. **Local Development** (Day 1)
   - Test migration on dev machine
   - Validate all scripts work

2. **Staging** (Day 3)
   - Apply to staging environment
   - Run full test suite
   - Monitor for 2 days

3. **Production** (Day 5)
   - Scheduled maintenance window
   - Apply migration
   - Monitor closely for 7 days

### Monitoring

**Metrics to Track**:
- Database connection errors
- Port conflict occurrences
- Service uptime
- Query performance
- Backup success rate

**Alerts**:
- Database down
- Port conflict detected
- Connection pool exhausted
- Backup failed

---

## Documentation

### New Documents

- `DATABASE-PORT-PROTECTION-PLAN.md` ✅
- `PORTS-CONVENTION.md` ✅
- `scripts/database/migrate-to-protected-ports.sh` ✅
- `.claude/agents/database-port-guardian.md` (to create)
- `docs/content/tools/database/port-migration-guide.mdx` (to create)

### Updated Documents

- `AGENTS.md` - Add new agent
- `CLAUDE.md` - Reference new convention
- `docs/content/tools/ports-services/` - Update port map
- `README.md` - Update access URLs

---

## Questions & Answers

**Q: Will existing data be preserved?**  
A: Yes, 100%. Named volumes ensure data persists across container recreations.

**Q: How long will services be down?**  
A: < 5 minutes for database restart, < 10 minutes for full migration.

**Q: Can we rollback if something goes wrong?**  
A: Yes, rollback procedure takes < 5 minutes and is fully documented.

**Q: What if ports 7000+ are already in use?**  
A: Migration script checks ports before starting. Alternative range can be used.

**Q: Will performance be affected?**  
A: No, port changes don't affect performance. Only configuration changes.

---

## Approval

### Stakeholders

- **Technical Lead**: Review implementation details
- **DevOps**: Validate docker-compose changes
- **Backend Team**: Confirm app connection updates
- **QA**: Test migration in staging

### Sign-off Required

- [ ] Technical Lead
- [ ] DevOps Engineer
- [ ] Backend Team Lead

---

## Next Steps

1. Review this proposal
2. Schedule migration date
3. Create database-port-guardian agent
4. Test migration script in isolated environment
5. Schedule team review meeting

---

**Proposal Created**: 2025-11-03  
**Last Updated**: 2025-11-03  
**Version**: 1.0  
**Status**: Awaiting Approval  

