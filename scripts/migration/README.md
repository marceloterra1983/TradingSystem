# RAG Migration Scripts

**Purpose:** Scripts para migração do sistema RAG para Neon + Qdrant Cluster + Kong Gateway  
**Created:** 2025-11-03  
**Timeline:** 2-3 semanas

---

## Migration Overview

```
ANTES (Current):                    DEPOIS (Target):
- TimescaleDB (single, :7000)   →  Neon self-hosted (:5435)
- Qdrant (single, :6333)        →  Qdrant Cluster (3 nodes + LB :6333)
- No API Gateway                 →  Kong Gateway (:8000)
```

---

## Migration Scripts

| Script | Purpose | Duration | Risk |
|--------|---------|----------|------|
| `update-env-for-migration.sh` | Adicionar variáveis ao .env | 5 min | Low |
| `migrate-timescaledb-to-neon.sh` | Migrar schema + dados | 30 min | Medium |
| `migrate-qdrant-single-to-cluster.py` | Migrar vetores | 1-2 hours | Medium |

---

## Execution Order

### Step 1: Update Environment Variables

```bash
# Backup .env e adicionar novas variáveis
bash scripts/migration/update-env-for-migration.sh

# Review changes
cat .env | grep -E "NEON|QDRANT_CLUSTER|KONG"
```

**What it does:**
- Creates `.env.backup.TIMESTAMP`
- Adds Neon variables (DATABASE_URL, ports, etc.)
- Adds Qdrant Cluster variables (node ports, LB port)
- Adds Kong variables (ports, database config)
- Comments out old variables (prefixed with #OLD_)

---

### Step 2: Migrate Database (TimescaleDB → Neon)

```bash
# Full migration with verification
bash scripts/migration/migrate-timescaledb-to-neon.sh

# What it does:
# 1. Backup TimescaleDB schema + data
# 2. Import to Neon
# 3. Verify row counts match
# 4. Test queries on Neon
```

**Expected output:**
```
✅ TimescaleDB backup created
✅ Data imported to Neon
✅ Row counts verified:
   - collections: 3 rows
   - documents: 220 rows
   - chunks: 3,087 rows
   - ingestion_jobs: 42 rows
   - query_logs: 1,234 rows
✅ Query tests passed
```

**Backup location:** `data/migrations/timescale-to-neon/`

---

### Step 3: Migrate Vectors (Qdrant Single → Cluster)

```bash
# Install dependencies
pip install qdrant-client

# Run migration
python scripts/migration/migrate-qdrant-single-to-cluster.py

# What it does:
# 1. Connect to source (single instance)
# 2. Connect to destination (cluster via LB)
# 3. Create collections in cluster (same config)
# 4. Batch migrate all points (100 points/batch)
# 5. Verify point counts match
# 6. Test search accuracy
```

**Expected output:**
```
✅ Source Qdrant accessible (3 collections)
✅ Destination Qdrant Cluster accessible
✅ Collection 'docs_index_mxbai' created
   Migrating 3,087 points...
   ✅ 100/3087 (3.2%)
   ✅ 200/3087 (6.5%)
   ...
   ✅ 3,087/3,087 (100%)
✅ Verification passed: 3,087 points
✅ Search accuracy verified
```

**Duration:** 1-2 hours for 3,087 vectors

---

## Dry Run Mode

Test migration without actually moving data:

```bash
# Neon migration (dry run - just backup, no import)
DRY_RUN=true bash scripts/migration/migrate-timescaledb-to-neon.sh

# Qdrant migration (dry run - just count, no upload)
DRY_RUN=true python scripts/migration/migrate-qdrant-single-to-cluster.py
```

---

## Rollback Plan

### If migration fails, rollback in 15 minutes:

```bash
# 1. Stop new stack
docker compose -f tools/compose/docker-compose.neon.yml down
docker compose -f tools/compose/docker-compose.qdrant-cluster.yml down
docker compose -f tools/compose/docker-compose.kong.yml down

# 2. Restore old .env
cp .env.backup.TIMESTAMP .env

# 3. Restart old stack
docker compose -f tools/compose/docker-compose.database.yml up -d
docker compose -f tools/compose/docker-compose.rag.yml up -d

# 4. Verify services
bash scripts/maintenance/health-check-all.sh
```

---

## Verification Checklist

### After Migration

- [ ] Neon database accessible (`psql -h localhost -p 5435 -U postgres -d rag`)
- [ ] Row counts match TimescaleDB
- [ ] Qdrant cluster formed (3 nodes)
- [ ] Vector counts match single instance
- [ ] Search accuracy verified (> 95% recall)
- [ ] Kong Gateway routes configured
- [ ] Application code updated
- [ ] Integration tests passing
- [ ] Load tests passing (> 500 qps)
- [ ] Monitoring dashboards updated

---

## Troubleshooting

### Migration Too Slow

```bash
# Increase batch size for Qdrant migration
QDRANT_BATCH_SIZE=500 python scripts/migration/migrate-qdrant-single-to-cluster.py

# Parallelize across collections (run multiple terminals)
# Terminal 1:
python scripts/migration/migrate-qdrant-single-to-cluster.py --collection docs_index_mxbai

# Terminal 2:
python scripts/migration/migrate-qdrant-single-to-cluster.py --collection documentation
```

### Row Count Mismatch

```bash
# Check for errors in import
tail -100 /var/log/postgresql/postgresql-*.log

# Re-run import for specific table
psql -h localhost -p 5435 -U postgres -d rag \
  -c "TRUNCATE TABLE rag.documents CASCADE;"

psql -h localhost -p 5435 -U postgres -d rag \
  -f data/migrations/timescale-to-neon/rag_data_TIMESTAMP.sql
```

### Search Results Different

```bash
# This is normal if using different HNSW parameters
# Verify recall is still acceptable (> 90%)

# Compare HNSW configs
curl http://localhost:6333/collections/docs_index_mxbai | jq '.result.config.hnsw_config'
curl http://qdrant-lb:80/collections/docs_index_mxbai | jq '.result.config.hnsw_config'
```

---

## Monitoring During Migration

### Watch Migration Progress

```bash
# Neon import (run in separate terminal)
tail -f data/migrations/timescale-to-neon/migration.log

# Qdrant migration
tail -f qdrant_migration_TIMESTAMP.log

# Resource usage
watch -n 5 'docker stats --no-stream | grep -E "neon|qdrant"'
```

---

## Post-Migration Tasks

After successful migration and 1 week stable operation:

```bash
# 1. Remove old containers
docker compose -f tools/compose/docker-compose.database.yml down -v
docker rm data-timescale

# 2. Remove old Qdrant (single instance)
docker stop data-qdrant
docker rm data-qdrant

# 3. Archive backups
tar -czf backups/pre-migration-$(date +%Y%m%d).tar.gz \
  data/migrations/timescale-to-neon/ \
  .env.backup.*

# 4. Update documentation
# - Update CLAUDE.md with new ports
# - Update architecture diagrams
# - Update deployment guides
```

---

**Created By:** TradingSystem Migration Team  
**Support:** #infrastructure (Slack)  
**Last Updated:** 2025-11-03

