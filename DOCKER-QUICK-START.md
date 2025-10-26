# Docker Quick Start Guide

**TradingSystem - Containerized Services Setup**

This guide helps you quickly start the TradingSystem containerized services (TP Capital API + Workspace API).

## 📋 Prerequisites

- **Docker** installed and running
- **Docker Compose** V2 (comes with Docker Desktop)
- **TimescaleDB** container running (or will be started automatically)
- **Git** (to clone the repository)

### Check Prerequisites

```bash
# Check Docker
docker --version
# Should show: Docker version 20.x or higher

# Check Docker is running
docker ps
# Should list running containers (or be empty)

# Check Docker Compose
docker compose version
# Should show: Docker Compose version v2.x
```

## 🚀 Quick Start (3 Steps)

### Step 1: Clone & Configure

```bash
# Clone repository (if not already)
git clone <repository-url>
cd TradingSystem

# Verify .env file exists with correct passwords
cat .env | grep TIMESCALEDB_PASSWORD
# Should show: TIMESCALEDB_PASSWORD="pass_timescale"
```

### Step 2: Start Database (if not running)

```bash
# Check if TimescaleDB is running
docker ps | grep timescaledb

# If not running, start it:
docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb

# Wait for database to be ready (~10 seconds)
sleep 10

# Verify it's healthy
docker ps | grep timescaledb
# Should show: Up X seconds (healthy)
```

### Step 3: Start Application Containers

```bash
# Start TP Capital API + Workspace Service
docker compose -f tools/compose/docker-compose.apps.yml --env-file .env up -d

# Wait for containers to be healthy (~15 seconds)
sleep 15

# Verify containers are running
docker ps --filter "name=tp-capital-api|workspace-service"
# Should show both containers as "Up" with "(healthy)" status
```

## ✅ Verify Everything Works

```bash
# Test TP Capital API
curl http://localhost:4005/health
# Expected: {"status":"healthy","service":"tp-capital-api",...}

# Test Workspace API
curl http://localhost:3200/health
# Expected: {"status":"healthy","service":"workspace-api",...}

# Test Workspace data
curl http://localhost:3200/api/items
# Expected: {"success":true,"count":N,"data":[...]}
```

## 📊 Service Endpoints

Once started, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **TP Capital API** | http://localhost:4005 | Trading signals API |
| **TP Capital Health** | http://localhost:4005/health | Health check |
| **Workspace API** | http://localhost:3200 | Ideas & documentation API |
| **Workspace Health** | http://localhost:3200/health | Health check |
| **Workspace Items** | http://localhost:3200/api/items | CRUD endpoints |

## 🔍 Monitoring & Logs

### View Container Status

```bash
# List all app containers
docker ps --filter "name=tp-capital-api|workspace-service"

# Check health status
docker inspect tp-capital-api --format='{{.State.Health.Status}}'
docker inspect workspace-service --format='{{.State.Health.Status}}'
```

### View Logs

```bash
# Follow TP Capital API logs
docker logs -f tp-capital-api

# Follow Workspace logs
docker logs -f workspace-service

# View last 50 lines
docker logs --tail 50 tp-capital-api
docker logs --tail 50 workspace-service

# View logs from both services together
docker compose -f tools/compose/docker-compose.apps.yml logs -f
```

## 🛑 Stop Services

```bash
# Stop containers (but keep them for restart)
docker compose -f tools/compose/docker-compose.apps.yml stop

# Stop and remove containers
docker compose -f tools/compose/docker-compose.apps.yml down

# Stop and remove containers + volumes (⚠️ DELETES DATA)
docker compose -f tools/compose/docker-compose.apps.yml down -v
```

## 🔄 Restart Services

```bash
# Restart after code changes (hot-reload should work, but if not:)
docker compose -f tools/compose/docker-compose.apps.yml restart

# Or restart individual services
docker restart tp-capital-api
docker restart workspace-service
```

## 🔧 Development Workflow

### Hot-Reload

The containers are configured with **nodemon** and **volume mounts**, so code changes are automatically detected:

```bash
# Edit source code
vim backend/api/workspace/src/config.js

# Changes are automatically picked up (check logs)
docker logs -f workspace-service
# Should show: [nodemon] restarting due to changes...
```

### Rebuild After Dependency Changes

If you modify `package.json`:

```bash
# Rebuild images
docker compose -f tools/compose/docker-compose.apps.yml build

# Restart with new images
docker compose -f tools/compose/docker-compose.apps.yml up -d
```

## 🐛 Troubleshooting

### Issue: Containers won't start - "port already in use"

**Solution**: Kill processes on the conflicting ports

```bash
# Find process using port 4005
lsof -ti :4005

# Kill it
kill -9 $(lsof -ti :4005)

# Same for port 3200
kill -9 $(lsof -ti :3200)

# Now retry starting containers
docker compose -f tools/compose/docker-compose.apps.yml up -d
```

### Issue: "ENOTFOUND timescaledb"

**Solution**: Ensure TimescaleDB is on the correct network

```bash
# Connect TimescaleDB to backend network with alias
docker network connect --alias timescaledb tradingsystem_backend data-timescaledb

# Restart app containers
docker compose -f tools/compose/docker-compose.apps.yml restart
```

### Issue: "password authentication failed for user timescale"

**Solution**: Ensure database password matches .env

```bash
# Check password in .env
grep TIMESCALEDB_PASSWORD .env

# Update database password (if needed)
docker exec data-timescaledb psql -U timescale -d postgres -c "ALTER USER timescale WITH PASSWORD 'pass_timescale';"

# Restart containers
docker compose -f tools/compose/docker-compose.apps.yml restart
```

### Issue: Container keeps restarting

**Solution**: Check container logs for errors

```bash
# View logs
docker logs workspace-service

# Check for common errors:
# - Missing environment variables
# - Database connection failures
# - Module not found errors

# Inspect container exit code
docker inspect workspace-service --format='{{.State.ExitCode}}'
```

### Issue: Health check failing

**Solution**: Wait longer or check endpoint manually

```bash
# Some containers take up to 40 seconds to be healthy
# Wait a bit more, then check:
docker ps | grep workspace-service

# Test health endpoint manually
curl -v http://localhost:3200/health

# Check container logs for startup errors
docker logs workspace-service | grep ERROR
```

## 📚 Additional Resources

- **Main Documentation**: See `/docs/` directory
- **Architecture**: See `/docs/architecture/technical-specification.md`
- **API Documentation**: See service-specific READMEs:
  - TP Capital: `/apps/tp-capital/api/README.md`
  - Workspace: `/backend/api/workspace/README.md`
- **Troubleshooting**: See `TROUBLESHOOTING.md` (created separately)

## 🎯 Next Steps

1. **Configure Telegram Gateway** (optional)
   - Add Telegram API credentials to `.env`
   - Start Gateway: `cd apps/telegram-gateway && npm start`

2. **Set Up Dashboard** (frontend)
   - `cd frontend/dashboard && npm install && npm run dev`
   - Access at `http://localhost:3103`

3. **Enable Monitoring** (optional)
   - Start Prometheus: See `/tools/monitoring/`
   - Start Grafana: See `/tools/monitoring/`

## 📞 Need Help?

- **Issues**: Open a GitHub issue
- **Logs**: Always include container logs when reporting problems
- **Health Status**: Share output of health endpoints

---

**Last Updated**: 2025-10-25
**Migration Status**: Phase 7 Complete (78%)
