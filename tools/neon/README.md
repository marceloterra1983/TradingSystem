# Neon Self-Hosted Configuration

**Version:** 2.0.0  
**Database:** Neon (PostgreSQL 15 + storage-compute separation)  
**Purpose:** RAG Services metadata and analytics  
**Last Updated:** 2025-11-03

---

## Overview

Neon is a serverless Postgres platform with storage-compute separation, branching, and point-in-time recovery (PITR). This directory contains the self-hosted deployment configuration for TradingSystem RAG services.

### Why Neon?

- ✅ **Branching:** Git-like workflow for dev/staging/prod databases
- ✅ **PITR:** Point-in-time recovery (30 days retention)
- ✅ **Storage Efficiency:** Copy-on-write, layer-based compaction
- ✅ **Connection Pooling:** Built-in pooler (no pgBouncer needed)
- ✅ **Auto-vacuum:** Optimized for Neon's architecture

---

## Architecture

```
┌─────────────────┐
│ Neon Compute    │  Port 5435 (PostgreSQL wire protocol)
│ (PostgreSQL 15) │  - Handles SQL queries
└────────┬────────┘  - Manages connections
         │            - Executes transactions
         ↓
┌─────────────────┐
│ Neon Pageserver │  Port 6400 (Internal HTTP API)
│ (Storage Layer) │  - Stores pages (copy-on-write)
└────────┬────────┘  - Compaction engine
         │            - Layer management
         ↓
┌─────────────────┐
│ Neon Safekeeper │  Port 7676 (WAL service)
│ (WAL Durability)│  - WAL archiving
└─────────────────┘  - PITR support
                     - Crash recovery
```

---

## Quick Start

### 1. Deploy Stack

```bash
# Run setup script (automated)
bash scripts/neon/setup-neon-local.sh

# Or manual deployment
docker compose -f tools/compose/docker-compose.neon.yml up -d

# Wait for services to be healthy
docker compose -f tools/compose/docker-compose.neon.yml ps
```

### 2. Verify Installation

```bash
# Check Neon Compute
docker exec neon-compute pg_isready -U postgres -d rag

# Check Pageserver
curl http://localhost:6400/v1/status

# Check Safekeeper
curl http://localhost:7677/v1/status
```

### 3. Connect to Database

```bash
# Via docker exec
docker exec -it neon-compute psql -U postgres -d rag

# Via psql (local)
psql postgresql://postgres:neon_password@localhost:5435/rag

# Connection string (for applications)
NEON_DATABASE_URL=postgresql://postgres:neon_password@neon-compute:5432/rag
```

---

## Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `docker-compose.neon.yml` | Docker Compose stack definition | `tools/compose/` |
| `neon.conf` | PostgreSQL configuration (custom) | `tools/neon/` |
| `01-create-extensions.sql` | Install extensions (UUID, pgvector, etc.) | `backend/data/neon/init/` |
| `02-create-rag-schema.sql` | RAG schema creation | `backend/data/neon/init/` |

---

## Ports

| Service | Internal Port | External Port | Protocol |
|---------|--------------|---------------|----------|
| Neon Compute | 5432 | 5435 | PostgreSQL |
| Neon Pageserver | 6400 | 6400 | HTTP |
| Neon Safekeeper (PG) | 7676 | 7676 | PostgreSQL |
| Neon Safekeeper (HTTP) | 7677 | 7677 | HTTP |

---

## Resources

| Service | RAM | CPU | Storage |
|---------|-----|-----|---------|
| Neon Compute | 4GB | 2 cores | 50GB |
| Neon Pageserver | 2GB | 1 core | 100GB |
| Neon Safekeeper | 1GB | 0.5 core | 30GB |
| **Total** | **7GB** | **3.5 cores** | **180GB** |

---

## Maintenance

### Backup

```bash
# Backup via pg_dump
docker exec neon-compute pg_dump -U postgres -d rag -F custom -f /tmp/rag_backup.dump

# Copy backup to host
docker cp neon-compute:/tmp/rag_backup.dump ./backups/neon_rag_$(date +%Y%m%d).dump
```

### Restore

```bash
# Restore from backup
docker exec neon-compute pg_restore -U postgres -d rag -c /tmp/rag_backup.dump
```

### Point-in-Time Recovery (PITR)

```bash
# List available recovery points (via Safekeeper)
curl http://localhost:7677/v1/wal/list

# Recovery to specific timestamp (requires Neon CLI tools)
# neon-ctl recover --target-time "2025-11-03 10:00:00"
```

### Refresh Materialized Views

```bash
# Manual refresh (run hourly via cron)
docker exec neon-compute psql -U postgres -d rag -c "SELECT rag.refresh_all_aggregates();"

# Or add to crontab
# 0 * * * * docker exec neon-compute psql -U postgres -d rag -c "SELECT rag.refresh_all_aggregates();"
```

---

## Monitoring

### Health Checks

```bash
# Check all services
docker compose -f tools/compose/docker-compose.neon.yml ps

# Compute health
docker exec neon-compute pg_isready -U postgres

# Pageserver status
curl http://localhost:6400/v1/status | jq

# Safekeeper status
curl http://localhost:7677/v1/status | jq
```

### Performance Queries

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'rag';

-- Slow queries (> 100ms)
SELECT 
    query,
    calls,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'rag'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Troubleshooting

### Issue: Services not starting

```bash
# Check logs
docker compose -f tools/compose/docker-compose.neon.yml logs -f

# Check specific service
docker logs neon-compute
docker logs neon-pageserver
docker logs neon-safekeeper
```

### Issue: Cannot connect to Compute

```bash
# Verify service is running
docker ps | grep neon-compute

# Check PostgreSQL logs
docker logs neon-compute --tail 100

# Test connection from inside container
docker exec neon-compute psql -U postgres -l
```

### Issue: Pageserver not responding

```bash
# Check Pageserver logs
docker logs neon-pageserver --tail 100

# Verify Pageserver port
curl -v http://localhost:6400/v1/status
```

---

## Migration from TimescaleDB

See: `scripts/migration/migrate-timescaledb-to-neon.sh`

**Steps:**
1. Export data from TimescaleDB: `pg_dump --schema=rag`
2. Import to Neon: `psql -f rag_export.sql`
3. Update application connection strings
4. Verify data integrity

**Note:** TimescaleDB-specific features (hypertables, continuous aggregates) are replaced with native PostgreSQL partitioning and materialized views.

---

## References

- [Neon GitHub](https://github.com/neondatabase/neon)
- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL 15 Docs](https://www.postgresql.org/docs/15/)
- [pgvector Extension](https://github.com/pgvector/pgvector)

---

**Maintained By:** TradingSystem Database Team  
**Support:** #database-architecture (Slack)  
**Last Review:** 2025-11-03


