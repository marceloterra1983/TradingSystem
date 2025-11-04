# Implementation Tasks: protect-database-ports

**Change ID**: `protect-database-ports`  
**Status**: Awaiting Approval  

---

## 1. Preparation Phase

- [ ] 1.1 Create backup directory structure
- [ ] 1.2 Backup all databases (TimescaleDB, QuestDB, Qdrant)
- [ ] 1.3 Backup Docker volumes (`data-timescale-data`, `data-questdb-data`, etc.)
- [ ] 1.4 Backup configuration files (`.env`, `docker-compose.database.yml`)
- [ ] 1.5 Document current port mappings
- [ ] 1.6 Validate port range 7000-7999 is available
- [ ] 1.7 Create rollback script

**Validation**: All backups created successfully, checksums verified

---

## 2. Port Convention Documentation

- [ ] 2.1 Create `PORTS-CONVENTION.md` with complete mapping
- [ ] 2.2 Update `docs/content/tools/ports-services/` with new ranges
- [ ] 2.3 Add port range validation to pre-commit hooks
- [ ] 2.4 Create port conflict detection script
- [ ] 2.5 Update CLAUDE.md with new port references

**Validation**: Documentation complete and accurate

---

## 3. Docker Compose Migration

- [ ] 3.1 Update `tools/compose/docker-compose.database.yml`:
  - [ ] 3.1.1 TimescaleDB: 5432 → 7000
  - [ ] 3.1.2 TimescaleDB Backup: 5437 → 7001
  - [ ] 3.1.3 PostgreSQL LangGraph: 5438 → 7002
  - [ ] 3.1.4 QuestDB: 9001 → 7010, 9010 → 7011, 8814 → 7012
  - [ ] 3.1.5 Qdrant: 6333 → 7020, 6334 → 7021
  - [ ] 3.1.6 PgAdmin: 5051 → 7100
  - [ ] 3.1.7 Adminer: 8082 → 7101
  - [ ] 3.1.8 PgWeb: 8083 → 7102
  - [ ] 3.1.9 TimescaleDB Exporter: 9188 → 7200
- [ ] 3.2 Update `tools/compose/docker-compose.kong.yml` (Kong DB: 5433 → 7003)
- [ ] 3.3 Update `tools/compose/docker-compose.rag.yml` (Redis: 6380 → 7030)
- [ ] 3.4 Validate compose file syntax
- [ ] 3.5 Stop database containers
- [ ] 3.6 Start containers with new configuration
- [ ] 3.7 Verify all containers started successfully
- [ ] 3.8 Verify data integrity (row counts, schema validation)

**Validation**: `docker ps --filter "name=data-"` shows all healthy, data intact

---

## 4. Environment Configuration

- [ ] 4.1 Update `.env` with new port variables:
  ```bash
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
  PGADMIN_PORT=7100
  ADMINER_PORT=7101
  PGWEB_PORT=7102
  TIMESCALEDB_EXPORTER_PORT=7200
  ```
- [ ] 4.2 Validate .env syntax
- [ ] 4.3 Test .env loading in Node.js apps
- [ ] 4.4 Create `.env.example` template with new ports

**Validation**: All environment variables load correctly

---

## 5. Application Updates

- [ ] 5.1 Update `backend/api/workspace/src/config.js`
- [ ] 5.2 Update `backend/api/tp-capital/src/config.js`
- [ ] 5.3 Update `backend/api/documentation-api/src/config.js`
- [ ] 5.4 Update `backend/api/telegram-gateway/src/config.js`
- [ ] 5.5 Verify apps read from centralized .env
- [ ] 5.6 Restart application containers
- [ ] 5.7 Test database connections:
  - [ ] 5.7.1 Workspace → TimescaleDB (7000)
  - [ ] 5.7.2 TP Capital → TimescaleDB (7000)
  - [ ] 5.7.3 Docs API → Qdrant (7020), Redis (7030)
  - [ ] 5.7.4 Telegram API → TimescaleDB (7000)

**Validation**: All health checks pass, apps connect successfully

---

## 6. Monitoring & Observability

- [ ] 6.1 Update Prometheus targets:
  - [ ] 6.1.1 TimescaleDB exporter: 9188 → 7200
  - [ ] 6.1.2 QuestDB metrics: 7010
  - [ ] 6.1.3 Qdrant metrics: 7020
- [ ] 6.2 Update Grafana dashboards:
  - [ ] 6.2.1 Database overview dashboard
  - [ ] 6.2.2 Port usage visualization
- [ ] 6.3 Create alerts for:
  - [ ] 6.3.1 Unauthorized use of 7000-7999 range
  - [ ] 6.3.2 Database connection failures
  - [ ] 6.3.3 Port conflicts detected

**Validation**: Dashboards show correct data, alerts working

---

## 7. Tooling & Automation

- [ ] 7.1 Create automated migration script:
  - [ ] 7.1.1 `scripts/database/migrate-to-protected-ports.sh` ✅ (already created)
  - [ ] 7.1.2 Add pre-flight checks
  - [ ] 7.1.3 Add port availability validation
  - [ ] 7.1.4 Add progress indicators
- [ ] 7.2 Create port conflict detection script:
  - [ ] 7.2.1 `scripts/database/detect-port-conflicts.sh`
  - [ ] 7.2.2 Check 7000-7999 range
  - [ ] 7.2.3 Report violations
- [ ] 7.3 Create daily backup automation:
  - [ ] 7.3.1 `scripts/database/backup-all-databases.sh`
  - [ ] 7.3.2 Add to cron or systemd timer
- [ ] 7.4 Update `scripts/start.sh` to validate port ranges
- [ ] 7.5 Update `scripts/stop.sh` for graceful database shutdown

**Validation**: All scripts tested and working

---

## 8. Claude Agent Creation

- [ ] 8.1 Create `.claude/agents/database-port-guardian.md`:
  - [ ] 8.1.1 Define agent responsibilities
  - [ ] 8.1.2 Add port monitoring logic
  - [ ] 8.1.3 Add conflict detection
  - [ ] 8.1.4 Add migration assistance
- [ ] 8.2 Update `.claude/agents/docker-health-optimizer.md`:
  - [ ] 8.2.1 Add database port range validation
  - [ ] 8.2.2 Add volume health checks
- [ ] 8.3 Create custom command `/protect-databases`:
  - [ ] 8.3.1 Scaffold command in `.claude/commands/`
  - [ ] 8.3.2 Integrate with MCP servers
  - [ ] 8.3.3 Test command execution

**Validation**: Agents work as expected, commands functional

---

## 9. Testing

- [ ] 9.1 Unit tests for config loading
- [ ] 9.2 Integration tests for database connections
- [ ] 9.3 Health check tests for all databases
- [ ] 9.4 Rollback procedure test
- [ ] 9.5 Full system test (all services)
- [ ] 9.6 Load test to verify no performance degradation
- [ ] 9.7 Chaos test (simulate port conflicts)

**Validation**: All tests pass, no regressions

---

## 10. Documentation

- [ ] 10.1 Create migration guide:
  - [ ] 10.1.1 `docs/content/tools/database/port-migration-guide.mdx`
  - [ ] 10.1.2 Include step-by-step instructions
  - [ ] 10.1.3 Add troubleshooting section
- [ ] 10.2 Update main documentation:
  - [ ] 10.2.1 `CLAUDE.md` - Update port references
  - [ ] 10.2.2 `AGENTS.md` - Add new agent
  - [ ] 10.2.3 `README.md` - Update access URLs
  - [ ] 10.2.4 `docs/content/tools/ports-services/` - Complete port map
- [ ] 10.3 Create ADR (Architecture Decision Record):
  - [ ] 10.3.1 `docs/content/reference/adrs/008-database-port-protection.mdx`
  - [ ] 10.3.2 Include rationale and alternatives
- [ ] 10.4 Update quick start guides with new ports

**Validation**: Documentation accurate and complete

---

## 11. Deployment

- [ ] 11.1 Schedule maintenance window (1 hour)
- [ ] 11.2 Notify team of downtime
- [ ] 11.3 Execute migration in production
- [ ] 11.4 Monitor for 24 hours post-migration
- [ ] 11.5 Collect feedback from team
- [ ] 11.6 Update runbook with lessons learned

**Validation**: Production stable, zero incidents

---

## 12. Post-Deployment

- [ ] 12.1 Monitor for 7 days
- [ ] 12.2 Validate no port conflicts occurred
- [ ] 12.3 Verify backup automation working
- [ ] 12.4 Collect metrics on database uptime
- [ ] 12.5 Archive old backup files (keep 30 days)
- [ ] 12.6 Update this change to archive/

**Validation**: System stable, convention adopted

---

## Estimated Effort

| Phase | Time | Assignee |
|-------|------|----------|
| Preparation | 2h | DevOps |
| Migration | 1h | DevOps |
| App Updates | 3h | Backend |
| Documentation | 2h | Tech Writer |
| Testing | 4h | QA |
| Monitoring | Ongoing | DevOps |

**Total**: ~12 hours active work + 7 days monitoring

---

## Dependencies Between Tasks

```
1. Preparation → 3. Migration
3. Migration → 4. Env Config
4. Env Config → 5. App Updates
5. App Updates → 6. Monitoring
7. Tooling (parallel with all)
8. Agents (parallel with all)
9. Testing (after 5)
10. Documentation (parallel with 1-9)
11. Deployment (after all above)
12. Post-Deployment (after 11)
```

---

## Notes

- **Data Safety**: Named volumes ensure 100% data persistence
- **Rollback Window**: < 5 minutes with prepared scripts
- **Zero Downtime Option**: Blue-green deployment possible (advanced)
- **Port Validation**: Add to CI/CD to prevent future conflicts

---

**Tasks Created**: 2025-11-03  
**Last Updated**: 2025-11-03  
**Status**: Ready for Implementation (pending approval)  

