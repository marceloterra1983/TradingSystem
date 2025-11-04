# Protect Database Ports with Dedicated Range (7000-7999)

**Change ID**: `protect-database-ports`  
**Type**: Infrastructure Change  
**Priority**: P1 (High)  
**Status**: Proposal  
**Created**: 2025-11-03  
**Author**: AI Assistant (Claude) with user directive  

---

## Why

Port conflicts during multi-service startup cause database containers to restart unexpectedly, creating perceived risk of data loss and service interruptions. The current scattered port allocation (5432, 6333, 9001, etc.) makes conflict prevention difficult and troubleshooting time-consuming.

**User Pain Point**: "Quando tenho conflito de portas, perco todos os dados de banco de dados."

**Root Cause**: While data is actually protected by Docker named volumes, port conflicts force container restarts that disrupt service availability and create user anxiety about data integrity.

---

## What Changes

### Core Changes

1. **Reserved Port Range**: Allocate ports 7000-7999 exclusively for database and data-related services (1000 ports total)

2. **Port Convention**:
   - 7000-7099: Primary databases (TimescaleDB, QuestDB, Qdrant, Redis)
   - 7100-7199: Database admin UIs (PgAdmin, Adminer, PgWeb)
   - 7200-7299: Database exporters and metrics
   - 7300-7999: Reserved for future data services

3. **Port Mapping Updates**:
   - TimescaleDB: 5432 → 7000
   - QuestDB: 9001 → 7010
   - Qdrant: 6333 → 7020
   - Redis: 6380 → 7030
   - PgAdmin: 5051 → 7100
   - Adminer: 8082 → 7101
   - PgWeb: 8083 → 7102
   - (14 total port remappings)

4. **Enhanced Data Protection**:
   - Automated backup scripts
   - Port conflict detection tool
   - Claude agent for database port monitoring
   - Volume health checks

### Breaking Changes

- **BREAKING**: Database connection URLs change (old ports no longer work)
- **BREAKING**: Monitoring dashboards must update port references
- **BREAKING**: External tools connecting to databases must reconfigure

---

## Impact

### Affected Specs

- `infrastructure/database-layer` (MODIFIED)
- `infrastructure/port-conventions` (ADDED)
- `infrastructure/docker-compose-stacks` (MODIFIED)
- `monitoring/prometheus-targets` (MODIFIED)

### Affected Systems

**Direct Impact**:
- 8 database containers (TimescaleDB, QuestDB, Qdrant, Redis, etc.)
- Docker Compose files (database.yml)
- Environment configuration (.env)

**Indirect Impact**:
- 4 application services (Workspace, TP Capital, Docs API, Telegram API)
- 2 monitoring services (Prometheus, Grafana)
- Documentation and guides

### Affected Files

```
tools/compose/docker-compose.database.yml
.env
backend/api/workspace/src/config.js
backend/api/tp-capital/src/config.js
backend/api/documentation-api/src/config.js
backend/api/telegram-gateway/src/config.js
tools/monitoring/prometheus/prometheus.yml
docs/content/tools/ports-services/
```

---

## Integration with Claude Ecosystem

### Existing Agents

**`docker-health-optimizer.md`** (Enhanced):
- Add port range validation (7000-7999 reserved)
- Check for unauthorized usage of database ports
- Validate volume mount health
- Provide migration guidance

**New Agent**: `database-port-guardian.md`:
```markdown
Mission: Monitor and protect database port range
- Detect port conflicts in 7000-7999
- Alert on unauthorized port usage
- Validate database configurations
- Provide rollback assistance
```

### MCP Server Usage

**`docker-compose` MCP**:
- List database containers and port mappings
- Validate compose file syntax
- Check for port conflicts

**`fs-tradingsystem` MCP**:
- Read/update docker-compose.database.yml
- Update .env file
- Generate migration reports

**`postgres-frontend-apps` MCP**:
- Test database connections on new ports
- Validate schema integrity
- Verify data accessibility

### Custom Commands

**New Command**: `/protect-databases`
```markdown
Executes:
1. Validate current database status
2. Create comprehensive backup
3. Show migration plan
4. Optionally execute migration
```

**Integration with Existing**:
- `/architecture-review` - Include port convention analysis
- `/setup-docker-containers` - Use new port ranges
- `/debug-error` - Check database port conflicts first

---

## Dependencies

### Required Tools

- Docker 20.10+ ✅
- Docker Compose V2 ✅
- Bash 4.0+ ✅
- curl, jq ✅
- OpenSpec CLI ✅

### Required MCP Servers

- `docker-compose` ✅
- `fs-tradingsystem` ✅
- `postgres-frontend-apps` ✅

### Prerequisites

- All databases must use named volumes ✅ (already implemented)
- Centralized .env configuration ✅ (already enforced)
- Health check scripts ✅ (already exist)

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | **LOW** | CRITICAL | Named volumes + comprehensive backup |
| Service downtime (5-10 min) | **HIGH** | MEDIUM | Scheduled maintenance window |
| App connection failures | **MEDIUM** | MEDIUM | Centralized .env update, gradual rollout |
| Monitoring dashboards break | **MEDIUM** | LOW | Update Prometheus configs simultaneously |
| Rollback complexity | **LOW** | MEDIUM | Automated rollback script + backup restore |

### Failure Scenarios

1. **Migration fails midway**
   - Rollback: Restore `.env.backup` and `docker-compose.database.yml.backup`
   - Time: < 5 minutes
   - Data: Preserved in volumes

2. **Apps can't connect to new ports**
   - Fix: Verify .env propagation, restart apps
   - Time: < 10 minutes
   - Data: Unaffected

3. **Port 7000+ already occupied**
   - Alternative: Use range 7500-7999 or 6000-6999
   - Time: < 15 minutes for reconfiguration
   - Data: Unaffected

---

## Alternatives Considered

### Option 1: Keep Current Ports (Rejected)
- **Pro**: No migration needed
- **Con**: Conflicts continue, no organization, doesn't solve problem

### Option 2: Use Port Range 5000-5999 (Rejected)
- **Pro**: Common for databases
- **Con**: Heavily used by apps, doesn't prevent conflicts

### Option 3: Dynamic Port Allocation (Rejected)
- **Pro**: Automatic conflict avoidance
- **Con**: Complex, requires service discovery, harder to document

### Option 4: **Protected Range 7000-7999** (Selected ✅)
- **Pro**: Clear separation, 1000 ports, easy to enforce, future-proof
- **Con**: Requires migration (one-time cost)

---

## Success Criteria

### Must Have ✅

- [ ] All databases accessible on ports 7000-7999
- [ ] Zero data loss during migration
- [ ] All applications connecting successfully to new ports
- [ ] Comprehensive backups created before migration
- [ ] Rollback procedure documented and tested
- [ ] All documentation updated

### Should Have 🎯

- [ ] Automated migration script (`migrate-to-protected-ports.sh`)
- [ ] Port conflict detection tool
- [ ] Claude agent `database-port-guardian.md` created
- [ ] Monitoring dashboards updated with new ports
- [ ] CI/CD updated to validate port ranges

### Nice to Have 💡

- [ ] Automated daily backups implemented
- [ ] Grafana dashboard showing database port usage
- [ ] GitHub Actions workflow for port validation
- [ ] Performance benchmarks before/after

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Preparation** | 2 hours | Backups, validation, testing |
| **Migration** | 1 hour | Port updates, restart containers |
| **App Updates** | 3 hours | Update configs, test connections |
| **Documentation** | 2 hours | Update all docs and guides |
| **Monitoring** | 7 days | Validate stability, no conflicts |

**Total Active Work**: 8 hours (1 day)  
**Total with Monitoring**: 8 days  

---

## Rollout Strategy

### Phase 1: Local Development (Day 1)
- Run migration on dev machine
- Validate all services work
- Test rollback procedure

### Phase 2: Staging (Day 3)
- Apply migration to staging
- Run full integration test suite
- Monitor for 48 hours

### Phase 3: Production (Day 5)
- Scheduled maintenance window
- Execute migration with team on standby
- Monitor closely for 7 days

---

## Approval Required

**Stakeholders**:
- [ ] Technical Lead
- [ ] DevOps Engineer
- [ ] Backend Team

**Review Points**:
1. Port mapping convention acceptable?
2. Migration timeline realistic?
3. Rollback procedure adequate?
4. Data protection strategy sufficient?

---

## Next Steps

1. **Review this proposal** with team
2. **Schedule migration** date and maintenance window
3. **Create `database-port-guardian.md`** agent
4. **Test migration script** in isolated environment
5. **Get approval** from stakeholders
6. **Execute migration** following tasks.md checklist
7. **Monitor** for 7 days post-migration
8. **Archive** change after successful validation

---

**Proposal Version**: 1.0  
**Last Updated**: 2025-11-03  
**Awaiting**: Team review and approval  

