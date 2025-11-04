---
name: protect-databases
description: Validate database port protection, check for conflicts in the 7000-7999 range, and optionally execute migration to protected ports. This command integrates with the database-port-guardian agent.
category: Infrastructure
tags: [database, ports, docker, protection]
---

## Overview

This command helps you protect database services by:
1. Validating the protected port range (7000-7999)
2. Detecting port conflicts
3. Checking database configurations
4. Creating backups
5. Optionally executing migration to protected ports

## Usage

```bash
/protect-databases [action]
```

### Actions

- `validate` (default) - Check current status and port compliance
- `migrate` - Execute full migration to protected ports
- `backup` - Create comprehensive backup of all databases
- `rollback` - Revert to previous port configuration

## Examples

### Check Current Status

```bash
/protect-databases validate
```

**Output**:
```
🔍 Database Port Protection Status
========================================

✅ Protected Range: 7000-7999
✅ Conflicts Found: 0
⚠️  Databases Not in Range: 5

Databases in Protected Range:
  (none yet - migration not executed)

Databases Outside Range:
  • TimescaleDB: 5432 → Should be 7000
  • QuestDB: 9001 → Should be 7010
  • Qdrant: 6333 → Should be 7020
  • Redis: 6380 → Should be 7030
  • PgAdmin: 5051 → Should be 7100

Recommendation: Execute migration
  bash scripts/database/migrate-to-protected-ports.sh
```

### Execute Migration

```bash
/protect-databases migrate
```

**What it does**:
1. Invoke `database-port-guardian` agent
2. Create comprehensive backups
3. Validate port range availability
4. Execute `scripts/database/migrate-to-protected-ports.sh`
5. Verify post-migration status
6. Update documentation

### Create Backup

```bash
/protect-databases backup
```

**What it does**:
1. Create timestamped backup directory
2. Dump all databases (pg_dumpall, tar archives)
3. Backup Docker volumes
4. Backup configuration files (.env, docker-compose)
5. Verify backup integrity
6. Report backup location and size

### Rollback Migration

```bash
/protect-databases rollback
```

**What it does**:
1. Stop database containers
2. Restore `.env.backup` and `docker-compose.database.yml.backup`
3. Restart containers with old ports
4. Verify all services accessible
5. Report rollback status

## Prerequisites

- Docker and Docker Compose V2 installed
- WSL2 or Linux environment
- Bash 4.0+
- curl, jq installed
- Adequate disk space for backups

## Safety Features

**Automatic Checks**:
- ✅ Verifies named volumes exist before migration
- ✅ Creates backup before any changes
- ✅ Validates port range availability
- ✅ Tests connections post-migration
- ✅ Provides rollback if migration fails

**User Confirmations**:
- Migration requires explicit confirmation
- Backup location shown before proceeding
- Rollback procedure explained upfront

## Integration

### With Agents

- `database-port-guardian` - Port monitoring and validation
- `docker-health-optimizer` - Overall Docker health
- `devops-engineer` - Infrastructure guidance

### With MCP Servers

- `docker-compose` - Container management
- `fs-tradingsystem` - File operations
- `postgres-frontend-apps` - Database testing

### With Scripts

- `scripts/database/migrate-to-protected-ports.sh`
- `scripts/database/detect-port-conflicts.sh`
- `scripts/database/backup-all-databases.sh`
- `scripts/database/rollback-port-migration.sh`

## Output Format

### Validate Output

```
🔍 Database Port Protection Status
========================================

Protected Range: 7000-7999
Databases Found: 8
Compliant: 8/8 ✅
Conflicts: 0 ✅

Port Assignments:
  ✅ TimescaleDB:          7000
  ✅ TimescaleDB Backup:   7001
  ✅ PostgreSQL LangGraph: 7002
  ✅ Kong DB:              7003
  ✅ QuestDB HTTP:         7010
  ✅ Qdrant:               7020
  ✅ Redis:                7030
  ✅ PgAdmin:              7100

Data Protection:
  ✅ Named volumes: 8/8
  ✅ Restart policies: unless-stopped
  ✅ Health checks: configured
  ✅ Backups: automated

Overall Status: ✅ PROTECTED
```

### Migrate Output

```
🛡️  Database Port Migration
========================================

Phase 1: Backup
  ✅ Database dumps created
  ✅ Volumes backed up
  ✅ Config files backed up
  📁 Location: backups/database-migration-20251103/

Phase 2: Validation
  ✅ Port range 7000-7999 available
  ✅ All services stopped

Phase 3: Migration
  ✅ docker-compose.database.yml updated
  ✅ .env updated
  ✅ Containers restarted

Phase 4: Verification
  ✅ All databases accessible on new ports
  ✅ Applications connected successfully
  ✅ Data integrity verified

Migration Status: ✅ COMPLETE
Time: 4m 32s
Data Loss: NONE ✅

New Access URLs:
  TimescaleDB: http://localhost:7000
  QuestDB:     http://localhost:7010
  Qdrant:      http://localhost:7020
  PgAdmin:     http://localhost:7100
```

## Error Handling

### Port Already in Use

```
❌ Port Conflict Detected!

Port 7000 is already in use by process [PID]
Process: [process-name]

Options:
  A) Kill process: sudo kill [PID]
  B) Use alternative port: 7500
  C) Cancel migration

Choose option:
```

### Backup Failed

```
❌ Backup Failed!

Database: TimescaleDB
Error: pg_dumpall command failed

Cannot proceed with migration without valid backup.

Troubleshooting:
  1. Check database is running: docker ps | grep timescale
  2. Verify credentials: TIMESCALEDB_PASSWORD in .env
  3. Check disk space: df -h

Retry backup? (y/n)
```

### Migration Failed

```
❌ Migration Failed!

Step: Restarting containers
Error: Container data-timescale failed health check

Automatic Rollback Initiated...
  ✅ Restored .env.backup
  ✅ Restored docker-compose.database.yml.backup
  ✅ Restarted containers on old ports
  ✅ Verified all services accessible

System Status: ✅ ROLLED BACK
All databases accessible on original ports.

Check logs: docker logs data-timescale
```

## Best Practices

1. **Always validate before migrate**: Run `/protect-databases validate` first
2. **Backup everything**: Automated but verify backup success
3. **Test rollback**: In staging before production migration
4. **Monitor closely**: Watch for 24h post-migration
5. **Document deviations**: If using alternative ports, update PORTS-CONVENTION.md

## Related Documentation

- `DATABASE-PORT-PROTECTION-PLAN.md` - Complete protection strategy
- `PORTS-CONVENTION.md` - Full port allocation map
- `tools/openspec/changes/protect-database-ports/` - OpenSpec proposal
- `docs/content/tools/database/port-migration-guide.mdx` - Migration guide

---

**Command Version**: 1.0  
**Created**: 2025-11-03  
**Agent**: database-port-guardian  
**Status**: Active  

