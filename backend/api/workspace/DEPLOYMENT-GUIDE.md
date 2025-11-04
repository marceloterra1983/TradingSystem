# Workspace Stack - Deployment Guide (Neon PostgreSQL)

**Status**: ✅ Ready for Deployment  
**Last Updated**: 2025-11-04  
**Database**: Neon PostgreSQL (Autonomous Stack)  

---

## 🎯 Quick Start (Automated Deployment)

### Option A: One-Command Deploy (Recommended)

```bash
# Full deployment (build + start + init + verify)
bash scripts/workspace/deploy-full-stack.sh

# If Neon image already built:
bash scripts/workspace/deploy-full-stack.sh --skip-build

# Skip confirmations (CI/CD):
bash scripts/workspace/deploy-full-stack.sh --force
```

**Time**: ~35 minutes (first time) or ~5 minutes (skip build)

---

### Option B: Step-by-Step Deploy

```bash
# Step 1: Configure environment (2 minutes)
bash scripts/workspace/setup-neon-env.sh

# Step 2: Build Neon image (30 minutes - once)
bash scripts/database/build-neon-from-source.sh

# Step 3: Start stack (2 minutes)
bash scripts/docker/start-workspace-stack.sh

# Step 4: Initialize database (1 minute)
bash scripts/database/init-neon-workspace.sh

# Step 5: Verify (1 minute)
bash scripts/database/test-neon-connection.sh
curl http://localhost:3200/health | jq .
```

---

## 📋 Prerequisites

### Required
- **Docker** 20.10+ (`docker --version`)
- **Docker Compose** 2.0+ (`docker compose version`)
- **Bash** 4.0+ (Linux/WSL2/macOS)
- **curl** (HTTP testing)

### Optional
- **jq** (JSON formatting) - `sudo apt install jq`
- **openssl** (JWT secret generation)

### System Requirements
- **RAM**: 4GB+ available (Neon stack uses ~2GB)
- **Disk**: 10GB+ free space (Neon build + volumes)
- **CPU**: 2+ cores recommended

---

## 🏗️ Stack Architecture

### Containers (4 Total)

```
┌─────────────────────────────────────────────────┐
│ WORKSPACE AUTONOMOUS STACK                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ 1. workspace-api (Port 3200)                    │
│    ├─ Express + Node.js 20                      │
│    ├─ NeonClient (database driver)              │
│    └─ Prometheus metrics                        │
│                                                 │
│ 2. workspace-db-compute (Port 5433)             │
│    ├─ PostgreSQL 17                             │
│    ├─ Schema: workspace                         │
│    └─ Tables: items, categories                 │
│                                                 │
│ 3. workspace-db-pageserver (Port 6400, 9898)    │
│    ├─ Neon storage layer                        │
│    └─ Database branching support                │
│                                                 │
│ 4. workspace-db-safekeeper (Port 5454, 7676)    │
│    ├─ Write-Ahead Log service                   │
│    └─ Durability & replication                  │
│                                                 │
└─────────────────────────────────────────────────┘

Networks:
├─ workspace_network (172.25.0.0/16) - Internal
└─ tradingsystem_backend - Bridge to Dashboard
```

### Resource Allocation

| Container | RAM | CPU | Disk |
|-----------|-----|-----|------|
| workspace-api | ~200MB | ~5% | - |
| workspace-db-compute | ~600MB | ~15% | - |
| workspace-db-pageserver | ~500MB | ~20% | 5GB |
| workspace-db-safekeeper | ~200MB | ~10% | 2GB |
| **TOTAL** | **~1.5GB** | **~50%** | **~7GB** |

---

## 🔧 Configuration

### Environment Variables

All configuration is in **root `.env` file**:

```bash
# Database Strategy (CRITICAL)
LIBRARY_DB_STRATEGY=neon

# Neon Connection
NEON_HOST=workspace-db-compute
NEON_PORT=55432
NEON_DATABASE=workspace
NEON_USER=postgres
NEON_PASSWORD=neon_secure_pass
NEON_SCHEMA=workspace

# Connection Pool
NEON_POOL_MAX=50
NEON_POOL_MIN=2

# Workspace API
WORKSPACE_PORT=3200
WORKSPACE_EXTERNAL_PORT=3200

# CORS
CORS_ORIGIN=http://localhost:3103,http://localhost:3400
```

**See**: `backend/api/workspace/config/neon-env-vars.txt` for complete list.

---

## ✅ Verification Checklist

### After Deployment

- [ ] All 4 containers running (`docker ps | grep workspace`)
- [ ] All containers healthy (`docker compose ps`)
- [ ] Database initialized (10/10 tests pass)
- [ ] API health check returns "neon connected"
- [ ] CRUD operations working
- [ ] Dashboard loads workspace page

### Quick Verification Commands

```bash
# 1. Container status
docker compose -f tools/compose/docker-compose.workspace-stack.yml ps

# Expected: All "Up (healthy)"

# 2. API health
curl http://localhost:3200/health | jq '.checks.database'

# Expected: "neon connected"

# 3. Database connection
docker exec workspace-db-compute psql -U postgres -d workspace -c "SELECT COUNT(*) FROM workspace.workspace_items;"

# Expected: Count (0 if new, >0 if migrated)

# 4. Test CRUD
curl -X POST http://localhost:3200/api/items \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test","category":"documentacao","priority":"high"}' | jq .

# Expected: {"success":true,"data":{...}}
```

---

## 🐛 Troubleshooting

### Problem: "Neon image not found"

**Solution**:
```bash
# Build image
bash scripts/database/build-neon-from-source.sh

# Verify
docker images | grep neon-local
```

---

### Problem: "Container workspace-db-compute is unhealthy"

**Solution**:
```bash
# Check logs
docker logs workspace-db-compute

# Common causes:
# - Pageserver/Safekeeper not ready (wait 60s)
# - Port conflict (check port 5433)

# Restart
docker compose -f tools/compose/docker-compose.workspace-stack.yml restart workspace-db-compute
```

---

### Problem: "API returns 'timescaledb connected' instead of 'neon'"

**Solution**:
```bash
# Check environment variable
docker exec workspace-api env | grep LIBRARY_DB_STRATEGY

# Should be: LIBRARY_DB_STRATEGY=neon

# If wrong, fix .env and restart
echo "LIBRARY_DB_STRATEGY=neon" >> .env
docker compose -f tools/compose/docker-compose.workspace-stack.yml restart workspace-api
```

---

### Problem: "Connection refused to localhost:5433"

**Solution**:
```bash
# From HOST: Use 5433
psql -h localhost -p 5433 -U postgres -d workspace

# From DOCKER NETWORK: Use 55432
docker exec workspace-api psql -h workspace-db-compute -p 55432 -U postgres -d workspace
```

---

### Problem: "Tables already exist"

**Solution** (if you need to recreate):
```bash
# Drop schema (WARNING: deletes all data!)
docker exec workspace-db-compute psql -U postgres -d workspace -c "DROP SCHEMA workspace CASCADE;"

# Re-initialize
bash scripts/database/init-neon-workspace.sh
```

---

## 🔄 Operations

### Start Stack

```bash
# Using helper script
bash scripts/docker/start-workspace-stack.sh

# Or manually
docker compose -f tools/compose/docker-compose.workspace-stack.yml up -d
```

### Stop Stack

```bash
# Graceful stop (preserves data)
bash scripts/docker/stop-workspace-stack.sh

# Or manually
docker compose -f tools/compose/docker-compose.workspace-stack.yml down
```

### Restart Stack

```bash
# Restart all containers
docker compose -f tools/compose/docker-compose.workspace-stack.yml restart

# Restart specific service
docker compose -f tools/compose/docker-compose.workspace-stack.yml restart workspace-api
```

### View Logs

```bash
# All services
docker compose -f tools/compose/docker-compose.workspace-stack.yml logs -f

# Specific service
docker logs workspace-api -f
docker logs workspace-db-compute -f
```

### Health Monitoring

```bash
# API health
curl http://localhost:3200/health | jq .

# Prometheus metrics
curl http://localhost:3200/metrics | grep workspace_

# Neon internal metrics
curl http://localhost:9898/v1/status | jq .  # Pageserver
curl http://localhost:7676/v1/status | jq .  # Safekeeper
```

---

## 📊 Database Operations

### Connect to Database

```bash
# Via compute container
docker exec -it workspace-db-compute psql -U postgres -d workspace

# From host (if port exposed)
psql -h localhost -p 5433 -U postgres -d workspace
```

### Common Queries

```sql
-- List tables
\dt workspace.*

-- Count items
SELECT COUNT(*) FROM workspace.workspace_items;

-- Items by category
SELECT category, COUNT(*) 
FROM workspace.workspace_items 
GROUP BY category;

-- Recent items
SELECT title, created_at 
FROM workspace.workspace_items 
ORDER BY created_at DESC 
LIMIT 10;
```

### Backup & Restore

```bash
# Backup
docker exec workspace-db-compute pg_dump -U postgres -d workspace > workspace-backup-$(date +%Y%m%d).sql

# Restore
docker exec -i workspace-db-compute psql -U postgres -d workspace < workspace-backup-20251104.sql
```

---

## 🔄 Data Migration

### From TimescaleDB to Neon

```bash
# Automated migration with backup
bash scripts/database/migrate-workspace-to-neon.sh --backup

# Dry-run (preview only)
bash scripts/database/migrate-workspace-to-neon.sh --dry-run

# What happens:
# 1. Backup TimescaleDB data
# 2. Export categories + items
# 3. Import into Neon
# 4. Verify record counts
# 5. Generate migration report
```

**Rollback Plan**: See `STACK-MIGRATION.md` section "Rollback Procedure".

---

## 📈 Performance Monitoring

### Key Metrics

```bash
# Connection pool usage
curl -s http://localhost:3200/metrics | grep workspace_connection_pool

# API request duration (P95)
curl -s http://localhost:3200/metrics | grep workspace_api_request_duration_seconds

# Request count by endpoint
curl -s http://localhost:3200/metrics | grep workspace_api_requests_total
```

### Grafana Dashboard

**Import**: `tools/monitoring/grafana/dashboards/workspace-neon-stack.json`

**Panels**:
- API Response Time (P50, P95, P99)
- Connection Pool Usage
- Request Rate
- Error Rate
- Database Query Duration

---

## 🔐 Security

### Current State (Development)

- ❌ **No Authentication** - All endpoints public (MUST FIX for production)
- ✅ **CORS** - Restricted to Dashboard + Docs
- ✅ **Rate Limiting** - 120 req/min per IP
- ✅ **Helmet** - Security headers configured
- ✅ **Input Validation** - express-validator on all endpoints

### Production Requirements (P0 - Critical)

1. **Implement JWT Authentication** (1 day)
   - See: `docs/content/reference/architecture-reviews/workspace-neon-autonomous-stack-2025-11-04.md`
   - Section: "Security Architecture Assessment"

2. **Add RBAC** (4 hours)
   - Roles: admin, moderator, viewer
   - Protect DELETE/UPDATE endpoints

3. **Enable Audit Logging** (1 day)
   - Track who did what when
   - Table: `workspace_audit_logs`

---

## 🚀 Next Steps (Post-Deployment)

### Critical (P0) - Before Production

- [ ] Implement JWT authentication (1 day)
- [ ] Configure Prometheus alerts (2 hours)
- [ ] Add connection pool monitoring (4 hours)

### High Priority (P1) - Within 2 Weeks

- [ ] Redis caching layer (1 day)
- [ ] Service layer refactor (2 days)
- [ ] API versioning (4 hours)

### Medium Priority (P2) - Within 1 Month

- [ ] Input sanitization (DOMPurify) (4 hours)
- [ ] RBAC implementation (1 day)
- [ ] Audit logging (1 day)
- [ ] WebSocket real-time sync (2 days)

---

## 📚 References

- **Architecture Review**: `docs/content/reference/architecture-reviews/workspace-neon-autonomous-stack-2025-11-04.md`
- **ADR 007**: `docs/content/reference/adrs/007-workspace-neon-migration.md`
- **Stack Guide**: `tools/compose/WORKSPACE-STACK.md`
- **Migration Guide**: `backend/api/workspace/STACK-MIGRATION.md`

---

## 📞 Support

### Common Issues

1. **Build fails**: Check Docker disk space (need 10GB+)
2. **Containers unhealthy**: Wait 60s for dependencies
3. **Connection refused**: Check `LIBRARY_DB_STRATEGY=neon` in .env
4. **API errors**: Check logs with `docker logs workspace-api`

### Logs Location

- **API Logs**: `docker logs workspace-api`
- **Database Logs**: `docker logs workspace-db-compute`
- **Storage Logs**: `docker logs workspace-db-pageserver`
- **WAL Logs**: `docker logs workspace-db-safekeeper`

---

**Last Updated**: 2025-11-04  
**Deployment Status**: ✅ Ready for Production (with P0 security fixes)  
**Maintainer**: Architecture Team

