# Evolution API Stack - Management Scripts

This directory contains scripts for managing the Evolution API stack.

## 📁 Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `start-evolution-stack.sh` | Start Evolution API stack with correct environment | `bash start-evolution-stack.sh` |
| `restart-evolution-stack.sh` | Restart entire stack | `bash restart-evolution-stack.sh` |
| `test-evolution-api.sh` | Run comprehensive test suite | `bash test-evolution-api.sh` |

## 🚀 Quick Start

### First Time Setup

```bash
# 1. Ensure .env is configured
cd /workspace
grep EVOLUTION .env | head -10

# 2. Start the stack
bash scripts/evolution/start-evolution-stack.sh

# 3. Verify everything is working
bash scripts/evolution/test-evolution-api.sh
```

### Daily Usage

```bash
# Start stack
bash scripts/evolution/start-evolution-stack.sh

# Check status
docker ps --filter "label=com.tradingsystem.stack=evolution-api"

# View logs
docker logs -f evolution-api

# Stop stack
cd /workspace/tools/compose
docker compose -f docker-compose.5-2-evolution-api-stack.yml down
```

## 🔧 Troubleshooting

### Issue: Containers keep restarting

**Solution:**
```bash
# Check logs for specific container
docker logs evolution-api --tail 100

# Common issues:
# 1. PostgreSQL authentication - Fixed with POSTGRES_HOST_AUTH_METHOD=md5
# 2. Environment variables not loaded - Use start script
# 3. Port conflicts - Check with: netstat -tlnp | grep -E "4100|4203"
```

### Issue: Ports not accessible from Windows

**Solution:**
```bash
# Verify bindings are on 0.0.0.0
docker ps --filter "name=evolution" --format "{{.Names}}: {{.Ports}}"

# Should show: 0.0.0.0:4100->8080/tcp (NOT 127.0.0.1)

# If showing 127.0.0.1, restart with script:
bash scripts/evolution/start-evolution-stack.sh
```

### Issue: Database connection errors

**Solution:**
```bash
# Test PostgreSQL directly
docker exec evolution-postgres psql -U evolution -d evolution -c "SELECT 1"

# Reset database if needed
cd /workspace/tools/compose
docker compose -f docker-compose.5-2-evolution-api-stack.yml down -v
bash /workspace/scripts/evolution/start-evolution-stack.sh
```

### Issue: Environment variables not loading

**Solution:**
```bash
# Verify .env file exists
ls -la /workspace/.env

# Check specific variable
grep EVOLUTION_API_HOST_BIND /workspace/.env

# Always use the start script (it loads environment correctly)
bash scripts/evolution/start-evolution-stack.sh
```

## 📊 Service Endpoints

| Service | Port | Protocol | Access |
|---------|------|----------|--------|
| Evolution API | 4100 | HTTP | http://localhost:4100 |
| Evolution Manager | 4203 | HTTP | http://localhost:4203 |
| MinIO Console | 9311 | HTTP | http://localhost:9311 |
| PostgreSQL | 5437 | PostgreSQL | localhost:5437 |
| PgBouncer | 6436 | PostgreSQL | localhost:6436 |
| Redis | 6388 | Redis | localhost:6388 |

## 🔑 Authentication

### Evolution API

Uses Global API Key authentication:

```bash
# Get API key from environment
source /workspace/.env
echo $EVOLUTION_API_GLOBAL_KEY

# Use in API requests
curl -X GET 'http://localhost:4100/instance/fetchInstances' \
  -H "apikey: $EVOLUTION_API_GLOBAL_KEY"
```

### MinIO Console

- **Username**: evolution (from `EVOLUTION_MINIO_ROOT_USER`)
- **Password**: Check `.env` for `EVOLUTION_MINIO_ROOT_PASSWORD`

### PostgreSQL

- **Host**: localhost:5437
- **Database**: evolution
- **User**: evolution
- **Password**: Check `.env` for `EVOLUTION_DB_PASSWORD`

## 📚 Documentation

- **Architecture Review**: `/workspace/docs/EVOLUTION-API-ARCHITECTURE-REVIEW.md`
- **Original Deployment Note**: `/workspace/docs/archive/session-summaries/EVOLUTION-API-ACCESS-NOTE.md`
- **Docker Compose File**: `/workspace/tools/compose/docker-compose.5-2-evolution-api-stack.yml`
- **Official Docs**: https://doc.evolution-api.com/

## 🎯 Health Checks

### Quick Health Check

```bash
# Check all containers
docker ps --filter "label=com.tradingsystem.stack=evolution-api" \
  --format "table {{.Names}}\t{{.Status}}"

# Expected output: All containers should show "Up X seconds (healthy)"
```

### Comprehensive Test

```bash
# Run full test suite
bash scripts/evolution/test-evolution-api.sh

# Expected: All tests should pass
```

### Individual Service Tests

```bash
# Test Evolution API
curl -s http://localhost:4100/ | jq .

# Test Evolution Manager
curl -I http://localhost:4203/

# Test MinIO
curl -s http://localhost:9311/

# Test PostgreSQL
docker exec evolution-postgres psql -U evolution -d evolution -c "SELECT version();"

# Test Redis
docker exec evolution-redis redis-cli ping
```

## 🔄 Common Operations

### Restart Single Service

```bash
cd /workspace/tools/compose
docker compose -f docker-compose.5-2-evolution-api-stack.yml restart evolution-api
```

### View Logs

```bash
# All services
docker compose -f /workspace/tools/compose/docker-compose.5-2-evolution-api-stack.yml logs -f

# Specific service
docker logs -f evolution-api
docker logs -f evolution-manager
docker logs -f evolution-postgres
```

### Update Image

```bash
cd /workspace/tools/compose
docker compose -f docker-compose.5-2-evolution-api-stack.yml pull
bash /workspace/scripts/evolution/restart-evolution-stack.sh
```

### Backup Data

```bash
# PostgreSQL backup
docker exec evolution-postgres pg_dump -U evolution evolution > backup-$(date +%Y%m%d).sql

# MinIO backup (if using Docker volumes)
docker run --rm -v 5-2-evolution-api-stack_evolution-minio-data:/data \
  -v $(pwd):/backup alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz /data
```

## 🐛 Debug Mode

### Enable Verbose Logging

```bash
# Edit .env
EVOLUTION_LOG_LEVEL=DEBUG,INFO,WARN,ERROR,LOG
EVOLUTION_LOG_BAILEYS=debug

# Restart stack
bash scripts/evolution/restart-evolution-stack.sh
```

### Access Container Shell

```bash
# Evolution API
docker exec -it evolution-api /bin/bash

# PostgreSQL
docker exec -it evolution-postgres psql -U evolution -d evolution

# Redis
docker exec -it evolution-redis redis-cli
```

## 🚨 Emergency Recovery

### Complete Reset

```bash
# WARNING: This will delete all data!
cd /workspace/tools/compose
docker compose -f docker-compose.5-2-evolution-api-stack.yml down -v

# Start fresh
bash /workspace/scripts/evolution/start-evolution-stack.sh
```

### Partial Reset (Keep Data)

```bash
cd /workspace/tools/compose
docker compose -f docker-compose.5-2-evolution-api-stack.yml down
bash /workspace/scripts/evolution/start-evolution-stack.sh
```

## 📞 Support

For issues or questions:

1. Check logs: `docker logs evolution-api --tail 100`
2. Run tests: `bash scripts/evolution/test-evolution-api.sh`
3. Review documentation: `/workspace/docs/EVOLUTION-API-ARCHITECTURE-REVIEW.md`
4. Official documentation: https://doc.evolution-api.com/

---

**Last Updated:** 2025-11-15
**Maintainer:** TradingSystem Team
