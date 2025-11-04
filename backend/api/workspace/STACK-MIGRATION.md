# Workspace Stack Migration Guide

**From**: Workspace in `docker-compose.apps.yml` (shared TimescaleDB)  
**To**: Workspace Stack in `docker-compose.workspace-stack.yml` (dedicated Neon)

**Migration Date**: 2025-11-03  
**Estimated Downtime**: ~5 minutes

---

## Migration Checklist

### Pre-Migration

- [ ] Backup current workspace data from TimescaleDB
- [ ] Build Neon image (`bash scripts/database/build-neon-from-source.sh`)
- [ ] Review ADR 007 (`docs/content/reference/adrs/007-workspace-neon-migration.md`)
- [ ] Notify team of scheduled maintenance
- [ ] Verify ports 5433, 6400, 9898, 5454, 7676 are available

### Migration Steps

- [ ] Stop old workspace service
- [ ] Start Workspace Stack
- [ ] Initialize Neon database
- [ ] Migrate data from TimescaleDB
- [ ] Verify data integrity
- [ ] Test API endpoints
- [ ] Update monitoring dashboards

### Post-Migration

- [ ] Monitor for 24 hours
- [ ] Run performance benchmarks
- [ ] Test database branching feature
- [ ] Update team documentation
- [ ] Schedule go/no-go review (Day 7)

---

## Detailed Steps

### 1. Backup Existing Data

```bash
# Export from TimescaleDB
docker exec data-timescale pg_dump \
  -U timescale \
  -d APPS-WORKSPACE \
  --schema=workspace \
  > backup-workspace-$(date +%Y%m%d).sql

# Verify backup
grep -c "INSERT INTO" backup-workspace-*.sql
```

### 2. Stop Old Workspace Service

```bash
# If running in docker-compose.apps.yml
docker compose -f tools/compose/docker-compose.apps.yml stop workspace

# Or if running standalone
docker stop apps-workspace
```

### 3. Start Workspace Stack

```bash
# Using helper script
bash scripts/docker/start-workspace-stack.sh

# Wait for all containers to be healthy
sleep 30

# Verify
docker compose -f tools/compose/docker-compose.workspace-stack.yml ps
```

### 4. Initialize Neon Database

```bash
# Create schema and tables
bash scripts/database/init-neon-workspace.sh

# Expected output: "✓ Initialization complete!"
```

### 5. Migrate Data

```bash
# Run migration script
bash scripts/database/migrate-workspace-to-neon.sh --backup

# Verify counts match
# Script will display comparison automatically
```

### 6. Verify Migration

```bash
# Test connection
bash scripts/database/test-neon-connection.sh

# Test API
curl http://localhost:3200/api/items | jq '.count'

# Compare with TimescaleDB count
docker exec data-timescale psql -U timescale -d APPS-WORKSPACE -tAc \
  "SELECT COUNT(*) FROM workspace.workspace_items"
```

### 7. Update Dashboard

```bash
# Dashboard should automatically connect to new API
# Verify in browser: http://localhost:3103/#/workspace

# Check browser console for errors
# Check API logs for requests
docker logs workspace-api -f
```

---

## Rollback Procedure

### If Migration Fails

```bash
# 1. Stop Workspace Stack
bash scripts/docker/stop-workspace-stack.sh

# 2. Restore backup to TimescaleDB (if needed)
docker exec -i data-timescale psql -U timescale -d APPS-WORKSPACE \
  < backup-workspace-20251103.sql

# 3. Start old workspace service
export LIBRARY_DB_STRATEGY=timescaledb
docker compose -f tools/compose/docker-compose.apps.yml up -d workspace

# 4. Verify
curl http://localhost:3201/health  # Note: port 3201 in apps.yml
```

### Data Restoration

If data was lost:

```bash
# Option A: Restore from backup
bash scripts/database/restore-neon-backup.sh backup-workspace-20251103.sql

# Option B: Re-run migration
bash scripts/database/migrate-workspace-to-neon.sh --force
```

---

## Configuration Changes

### Before (docker-compose.apps.yml)

```yaml
workspace:
  container_name: apps-workspace
  ports:
    - "3201:3200"
  environment:
    - LIBRARY_DB_STRATEGY=timescaledb
    - TIMESCALEDB_HOST=data-timescale
  networks:
    - tradingsystem_backend
```

### After (docker-compose.workspace-stack.yml)

```yaml
workspace-stack:
  # 4 containers total
  workspace-api:
    container_name: workspace-api
    ports:
      - "3200:3200"  # Back to port 3200
    environment:
      - LIBRARY_DB_STRATEGY=neon
      - NEON_HOST=workspace-db-compute
    depends_on:
      - workspace-db-compute
    networks:
      - workspace_network
      - tradingsystem_backend
```

---

## Port Changes

| Service | Old Port | New Port | Notes |
|---------|----------|----------|-------|
| Workspace API | 3201 | 3200 | Reverted to standard port |
| Database | 5432 (shared) | 5433 (dedicated) | Dedicated Neon instance |

**Update your bookmarks/configs:**
- Old API: `http://localhost:3201`
- New API: `http://localhost:3200`

---

## Testing Checklist

### Functional Tests

- [ ] List items: `curl http://localhost:3200/api/items`
- [ ] Create item: `curl -X POST http://localhost:3200/api/items -d '{...}'`
- [ ] Update item: `curl -X PUT http://localhost:3200/api/items/:id -d '{...}'`
- [ ] Delete item: `curl -X DELETE http://localhost:3200/api/items/:id`
- [ ] Dashboard loads: `http://localhost:3103/#/workspace`
- [ ] Kanban drag & drop works
- [ ] Categories dropdown populated

### Performance Tests

- [ ] GET /api/items responds in < 200ms
- [ ] POST /api/items responds in < 100ms
- [ ] No errors in logs after 1 hour
- [ ] Resource usage acceptable (< 2GB RAM)

### Neon-Specific Tests

- [ ] Database branching works
- [ ] Metrics endpoints respond (9898, 7676)
- [ ] Health checks pass
- [ ] Graceful shutdown works

---

## Monitoring Post-Migration

### Key Metrics

```bash
# API response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3200/api/items

# Database connections
docker exec workspace-db-compute psql -U postgres -d workspace -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='workspace';"

# Error rate
docker logs workspace-api --since 1h 2>&1 | grep -i error | wc -l

# Resource usage
docker stats --no-stream | grep workspace
```

### Alerting

Set up alerts for:
- API response time > 500ms
- Error rate > 5/minute
- Container restarts
- Disk usage > 80%
- Connection pool exhaustion

---

## Timeline

| Day | Activity | Success Criteria |
|-----|----------|------------------|
| **Day 0** | Migration | All tests pass, zero data loss |
| **Day 1** | Monitoring | No P1 incidents, performance OK |
| **Day 3** | Review | API latency ≤ 200ms, team comfortable |
| **Day 7** | Decision Point | Go/no-go decision |
| **Day 14** | Final Review | Approve migration, decommission TimescaleDB backup |

---

## Support

### Documentation

- **Setup Guide**: `docs/content/database/neon-setup.mdx`
- **Stack Guide**: `tools/compose/WORKSPACE-STACK.md`
- **Quick Start**: `WORKSPACE-STACK-QUICKSTART.md`
- **ADR**: `docs/content/reference/adrs/007-workspace-neon-migration.md`

### Troubleshooting

1. Check logs: `docker compose -f tools/compose/docker-compose.workspace-stack.yml logs`
2. Run diagnostics: `bash scripts/database/test-neon-connection.sh`
3. Review ADR for rollback procedure
4. Contact DevOps team

---

## Success Criteria

✅ **Technical**:
- All 4 containers running and healthy
- API response time ≤ 200ms
- Zero data loss
- Database branching functional

✅ **Operational**:
- Team can start/stop stack independently
- Monitoring integrated
- Documentation complete
- Rollback tested

✅ **Business**:
- No user-facing downtime
- All features working
- Performance maintained or improved

---

**Migration Status**: ✅ Ready to execute  
**Risk Level**: Low (rollback available)  
**Approval**: Pending team review

