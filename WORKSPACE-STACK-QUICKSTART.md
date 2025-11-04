# Workspace Stack - Quick Start Guide

**🎯 Goal**: Get Workspace running with Neon database in **< 45 minutes**

---

## Prerequisites

- ✅ Docker & Docker Compose installed
- ✅ 10GB+ free disk space
- ✅ Ports available: 3200, 5433, 6400, 9898, 5454, 7676
- ✅ Internet connection (for build)

---

## Step-by-Step Setup

### Step 1: Build Neon Image (~30 minutes - first time only)

```bash
cd /home/marce/Projetos/TradingSystem

# Build Neon from source
bash scripts/database/build-neon-from-source.sh
```

**What happens**:
- Clones Neon repository
- Compiles Rust components
- Builds PostgreSQL 17
- Creates `neon-local:latest` image

**Expected**: "Build completed in ~30m" message

---

### Step 2: Start Workspace Stack (~2 minutes)

```bash
# Start all 4 containers
bash scripts/docker/start-workspace-stack.sh
```

**What starts**:
1. workspace-db-pageserver (storage)
2. workspace-db-safekeeper (WAL)
3. workspace-db-compute (PostgreSQL)
4. workspace-api (Express API)

**Expected**: All 4 containers running and healthy

---

### Step 3: Initialize Database (~1 minute)

```bash
# Create workspace database and schema
bash scripts/database/init-neon-workspace.sh
```

**What's created**:
- Database: `workspace`
- Schema: `workspace`
- Tables: `workspace_items`, `workspace_categories`
- Indexes: 8 indexes (B-tree + GIN)
- Seed data: 6 default categories

**Expected**: "✓ Initialization complete!" message

---

### Step 4: Verify Everything Works (~1 minute)

```bash
# Run comprehensive test suite
bash scripts/database/test-neon-connection.sh
```

**Expected**: 10/10 tests pass ✅

---

### Step 5: Access Workspace (~30 seconds)

```bash
# Test API endpoint
curl http://localhost:3200/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "workspace-api",
#   "dbStrategy": "neon",
#   ...
# }

# Access from Dashboard
# Open: http://localhost:3103/#/workspace
```

---

## Quick Commands

### Daily Usage

```bash
# Start
bash scripts/docker/start-workspace-stack.sh

# Stop (preserves data)
bash scripts/docker/stop-workspace-stack.sh

# Restart
docker compose -f tools/compose/docker-compose.workspace-stack.yml restart

# Logs
docker compose -f tools/compose/docker-compose.workspace-stack.yml logs -f
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it workspace-db-compute psql -U postgres -d workspace

# Or from host (if psql installed)
PGPASSWORD=neon_secure_pass psql -h localhost -p 5433 -U postgres -d workspace
```

### Troubleshooting

```bash
# Check status
docker compose -f tools/compose/docker-compose.workspace-stack.yml ps

# View specific logs
docker logs workspace-api -f
docker logs workspace-db-compute -f

# Restart specific service
docker compose -f tools/compose/docker-compose.workspace-stack.yml restart workspace-api
```

---

## Total Time Estimate

| Step | Time (First Run) | Time (Subsequent) |
|------|------------------|-------------------|
| Build Neon | ~30 min | 0 min (cached) |
| Start Stack | ~2 min | ~1 min |
| Initialize DB | ~1 min | ~30s |
| Verify | ~1 min | ~30s |
| **TOTAL** | **~35 min** | **~2-3 min** |

---

## What You Get

- ✅ **Isolated Neon Database** for Workspace (no sharing with TP Capital)
- ✅ **Database Branching** capability (Git-like branches for testing)
- ✅ **Modern Architecture** (separated storage and compute)
- ✅ **4 Containers** managed as single unit
- ✅ **Zero Code Changes** (PostgreSQL-compatible)
- ✅ **Production-Ready** scripts and documentation

---

## Rollback Plan

If something goes wrong:

```bash
# Option A: Restart stack
bash scripts/docker/stop-workspace-stack.sh
bash scripts/docker/start-workspace-stack.sh

# Option B: Use TimescaleDB (fallback)
export LIBRARY_DB_STRATEGY=timescaledb
docker compose -f tools/compose/docker-compose.apps.yml up -d workspace
```

---

## Next Steps

After setup is complete:

1. ✅ **Migrate data** (if have existing workspace items):
   ```bash
   bash scripts/database/migrate-workspace-to-neon.sh --backup
   ```

2. ✅ **Test database branching**:
   ```sql
   SELECT neon.create_branch('workspace', 'test-branch');
   ```

3. ✅ **Integrate with Dashboard**:
   - Dashboard already configured to use port 3200
   - Open: http://localhost:3103/#/workspace

4. ✅ **Setup monitoring**:
   - Prometheus metrics: http://localhost:3200/metrics
   - Neon metrics: http://localhost:9898/metrics

---

## Support

- **Documentation**: `docs/content/database/neon-setup.mdx`
- **Architecture**: `docs/content/diagrams/database/workspace-neon-architecture.puml`
- **Troubleshooting**: `tools/compose/WORKSPACE-STACK.md`
- **ADR**: `docs/content/reference/adrs/007-workspace-neon-migration.md`

---

**Status**: ✅ Ready to deploy!  
**Complexity**: Medium (first build takes time)  
**Recommendation**: Build during low-traffic hours


