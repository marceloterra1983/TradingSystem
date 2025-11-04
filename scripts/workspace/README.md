# Workspace Scripts - Neon Deployment Automation

Automated scripts for deploying and managing Workspace stack with Neon PostgreSQL.

---

## 📁 Scripts Overview

### 🚀 Main Deployment

#### `deploy-full-stack.sh`
**Complete automated deployment** from scratch to production-ready.

```bash
# Full deployment (build + start + init + verify)
bash scripts/workspace/deploy-full-stack.sh

# Skip Neon build (if already built)
bash scripts/workspace/deploy-full-stack.sh --skip-build

# Non-interactive (CI/CD)
bash scripts/workspace/deploy-full-stack.sh --force
```

**What it does**:
1. ✅ Configure environment (add Neon vars to .env)
2. ✅ Build Neon image (30 min first time)
3. ✅ Start 4 containers (pageserver, safekeeper, compute, API)
4. ✅ Initialize database (schema, tables, indexes)
5. ✅ Verify installation (10 tests + health checks)

**Time**: ~35 minutes (first run) or ~5 minutes (with --skip-build)

---

### ⚙️ Configuration

#### `setup-neon-env.sh`
**Add Neon environment variables** to root `.env` file.

```bash
bash scripts/workspace/setup-neon-env.sh
```

**What it does**:
- Checks if `.env` exists
- Backs up existing `.env` (if Neon vars already present)
- Appends Neon configuration block
- Displays summary

**Variables added**:
- `LIBRARY_DB_STRATEGY=neon`
- `NEON_HOST`, `NEON_PORT`, `NEON_DATABASE`
- Connection pool settings
- API configuration (port, CORS, rate limiting)

**Manual alternative**: Copy from `backend/api/workspace/config/neon-env-vars.txt`

---

## 🔗 Related Scripts (Other Directories)

### Database Scripts (`scripts/database/`)

#### `build-neon-from-source.sh`
Build Neon PostgreSQL from official repository.

```bash
bash scripts/database/build-neon-from-source.sh

# Options
--no-cache       # Force rebuild without cache
--version TAG    # Build specific version
--help           # Show help
```

**Time**: ~30 minutes (first build), ~5 minutes (with cache)

---

#### `init-neon-workspace.sh`
Initialize workspace schema and tables in Neon.

```bash
bash scripts/database/init-neon-workspace.sh
```

**What it creates**:
- Schema: `workspace`
- Tables: `workspace_items`, `workspace_categories`
- Indexes: B-tree (category, status, priority) + GIN (tags, metadata)
- Data: 6 default categories

---

#### `test-neon-connection.sh`
Run automated connection tests (10 tests).

```bash
bash scripts/database/test-neon-connection.sh
```

**Tests**:
1. Basic connection
2. Schema exists
3. Tables exist
4. Insert operation
5. Select operation
6. Update operation
7. Delete operation
8. Indexes exist
9. Categories seeded
10. Connection pool working

---

#### `migrate-workspace-to-neon.sh`
Migrate data from TimescaleDB to Neon.

```bash
# With automatic backup
bash scripts/database/migrate-workspace-to-neon.sh --backup

# Dry-run (preview only)
bash scripts/database/migrate-workspace-to-neon.sh --dry-run
```

**Process**:
1. Backup TimescaleDB data
2. Export categories + items (CSV)
3. Import into Neon
4. Verify record counts
5. Generate migration report

---

### Docker Scripts (`scripts/docker/`)

#### `start-workspace-stack.sh`
Start Workspace stack containers.

```bash
bash scripts/docker/start-workspace-stack.sh
```

**What it starts**:
- workspace-db-pageserver (storage)
- workspace-db-safekeeper (WAL)
- workspace-db-compute (PostgreSQL 17)
- workspace-api (Express)

**Wait time**: ~60 seconds for all to be healthy

---

#### `stop-workspace-stack.sh`
Stop Workspace stack containers.

```bash
# Graceful stop (preserves data)
bash scripts/docker/stop-workspace-stack.sh

# Force stop and remove volumes (⚠️ DELETES DATA!)
bash scripts/docker/stop-workspace-stack.sh --remove-volumes
```

---

## 📋 Typical Workflows

### First-Time Setup

```bash
# 1. One-command deploy (recommended)
bash scripts/workspace/deploy-full-stack.sh

# OR manual step-by-step:

# 2a. Configure environment
bash scripts/workspace/setup-neon-env.sh

# 2b. Build Neon
bash scripts/database/build-neon-from-source.sh

# 2c. Start stack
bash scripts/docker/start-workspace-stack.sh

# 2d. Initialize database
bash scripts/database/init-neon-workspace.sh

# 2e. Verify
bash scripts/database/test-neon-connection.sh
curl http://localhost:3200/health | jq .
```

---

### Daily Development

```bash
# Start stack
bash scripts/docker/start-workspace-stack.sh

# Verify
curl http://localhost:3200/health | jq '.checks.database'
# Should return: "neon connected"

# Work on code...

# Stop stack (end of day)
bash scripts/docker/stop-workspace-stack.sh
```

---

### Rebuild & Redeploy

```bash
# Full rebuild (if Neon updated or corrupted)
bash scripts/database/build-neon-from-source.sh --no-cache

# Redeploy
bash scripts/workspace/deploy-full-stack.sh
```

---

### Migration from TimescaleDB

```bash
# 1. Backup current data
bash scripts/database/migrate-workspace-to-neon.sh --backup

# 2. Verify migration
docker exec workspace-db-compute psql -U postgres -d workspace -c "SELECT COUNT(*) FROM workspace.workspace_items;"

# 3. Compare counts
# TimescaleDB: docker exec data-timescale psql ...
# Neon: (output from step 2)

# 4. If successful, switch environment
echo "LIBRARY_DB_STRATEGY=neon" >> .env
docker compose restart workspace-api
```

---

## 🐛 Troubleshooting Scripts

### Check Environment

```bash
# Verify Neon variables in .env
grep "LIBRARY_DB_STRATEGY" .env
grep "NEON_HOST" .env
grep "NEON_DATABASE" .env
```

### Check Container Status

```bash
# All containers
docker compose -f tools/compose/docker-compose.workspace-stack.yml ps

# Specific container
docker ps | grep workspace
```

### Check Logs

```bash
# All logs
docker compose -f tools/compose/docker-compose.workspace-stack.yml logs -f

# Specific service
docker logs workspace-api -f
docker logs workspace-db-compute -f
```

### Verify Database Strategy

```bash
# Check API is using Neon
docker exec workspace-api env | grep LIBRARY_DB_STRATEGY

# Should output: LIBRARY_DB_STRATEGY=neon
```

### Test API Health

```bash
# Basic health check
curl http://localhost:3200/health

# With jq formatting
curl http://localhost:3200/health | jq .

# Check database connection specifically
curl http://localhost:3200/health | jq '.checks.database'

# Should return: "neon connected"
```

---

## 📊 Performance & Monitoring

### Connection Pool Metrics

```bash
# View connection pool stats
curl http://localhost:3200/metrics | grep workspace_connection_pool
```

### API Performance

```bash
# Request duration (P95)
curl http://localhost:3200/metrics | grep workspace_api_request_duration_seconds | grep 0.95

# Request count by endpoint
curl http://localhost:3200/metrics | grep workspace_api_requests_total
```

### Neon Internal Metrics

```bash
# Pageserver status
curl http://localhost:9898/v1/status | jq .

# Safekeeper status
curl http://localhost:7676/v1/status | jq .
```

---

## 🔐 Security Notes

### Current State (Development)

- ❌ No authentication (all endpoints public)
- ✅ CORS restricted (Dashboard + Docs only)
- ✅ Rate limiting (120 req/min)
- ✅ Helmet security headers
- ✅ Input validation

### Before Production

**CRITICAL (P0)**: Implement JWT authentication before production use!

See: `docs/content/reference/architecture-reviews/workspace-neon-autonomous-stack-2025-11-04.md`

---

## 📚 Documentation

- **Deployment Guide**: `backend/api/workspace/DEPLOYMENT-GUIDE.md`
- **Architecture Review**: `docs/content/reference/architecture-reviews/workspace-neon-autonomous-stack-2025-11-04.md`
- **Stack Guide**: `tools/compose/WORKSPACE-STACK.md`
- **Migration Guide**: `backend/api/workspace/STACK-MIGRATION.md`
- **ADR 007**: `docs/content/reference/adrs/007-workspace-neon-migration.md`

---

## 🆘 Getting Help

### Common Issues

1. **"Image neon-local:latest not found"**
   ```bash
   bash scripts/database/build-neon-from-source.sh
   ```

2. **"Container unhealthy"**
   ```bash
   # Wait 60s, then check logs
   docker logs workspace-db-compute
   ```

3. **"Connection refused"**
   ```bash
   # Verify .env has LIBRARY_DB_STRATEGY=neon
   grep LIBRARY_DB_STRATEGY .env
   ```

4. **"API returns 'timescaledb connected'"**
   ```bash
   # Fix .env and restart
   echo "LIBRARY_DB_STRATEGY=neon" >> .env
   docker compose restart workspace-api
   ```

### Debug Mode

```bash
# Run scripts with set -x for verbose output
bash -x scripts/workspace/deploy-full-stack.sh
```

---

## 🔄 Update Scripts

### Pull Latest Scripts

```bash
git pull origin main

# Re-run deployment if needed
bash scripts/workspace/deploy-full-stack.sh --skip-build
```

---

**Last Updated**: 2025-11-04  
**Maintainer**: Architecture Team  
**Status**: ✅ Production-Ready (with P0 security fixes)

