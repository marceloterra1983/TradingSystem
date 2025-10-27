---
title: Troubleshooting Guide
description: Guia de troubleshooting para containers, databases e issues comuns
tags:
  - troubleshooting
  - support
owner: SupportOps
lastReviewed: '2025-10-27'
---

# TradingSystem Troubleshooting Guide

**Comprehensive troubleshooting for Docker containers, database connections, and common issues**

## 🔍 Quick Diagnostics

Run these commands first to gather information:

```bash
# Check all container status
docker ps -a | grep -E "tp-capital|workspace|timescaledb"

# Check container health
docker inspect tp-capital-api --format='{{.State.Health.Status}}'
docker inspect workspace-service --format='{{.State.Health.Status}}'

# Test API endpoints
curl http://localhost:4005/health
curl http://localhost:3200/health

# View recent logs
docker logs --tail 50 tp-capital-api
docker logs --tail 50 workspace-service
```

## 🚨 Common Issues & Solutions

### 1. Port Already in Use

**Symptoms**:
```
Error: failed to bind host port for 0.0.0.0:4005:4005/tcp: address already in use
```

**Diagnosis**:
```bash
# Find what's using the port
lsof -ti :4005
ps aux | grep $(lsof -ti :4005)
```

**Solution**:
```bash
# Option A: Kill the process
kill -9 $(lsof -ti :4005)

# Option B: Change the port in docker-compose.apps.yml
# Edit the ports section: "4006:4005" instead of "4005:4005"

# Then restart
docker compose -f tools/compose/docker-compose.apps.yml up -d
```

---

### 2. Database Connection Failed

**Symptoms**:
```
Error: getaddrinfo ENOTFOUND timescaledb
Error: password authentication failed for user "timescale"
```

**Diagnosis**:
```bash
# Check if TimescaleDB is running
docker ps | grep timescaledb

# Check network connectivity
docker network inspect tradingsystem_backend | grep timescaledb

# Test database connection
PGPASSWORD="pass_timescale" psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -c "SELECT 1"
```

**Solution A - Network Issue**:
```bash
# Ensure TimescaleDB is on the correct network
docker network connect --alias timescaledb tradingsystem_backend data-timescaledb

# Restart app containers
docker compose -f tools/compose/docker-compose.apps.yml restart
```

**Solution B - Password Mismatch**:
```bash
# Update database password
docker exec data-timescaledb psql -U timescale -d postgres -c "ALTER USER timescale WITH PASSWORD 'pass_timescale';"

# Update config/docker.env
sed -i 's/TIMESCALEDB_PASSWORD=.*/TIMESCALEDB_PASSWORD=pass_timescale/' config/docker.env

# Restart containers
docker compose -f tools/compose/docker-compose.apps.yml restart
```

**Solution C - Database Not Running**:
```bash
# Start TimescaleDB
docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb

# Wait for it to be healthy
sleep 10

# Now start app containers
docker compose -f tools/compose/docker-compose.apps.yml up -d
```

---

### 3. Container Keeps Restarting

**Symptoms**:
```
docker ps shows: Restarting (1) X seconds ago
```

**Diagnosis**:
```bash
# Check logs for the error
docker logs workspace-service 2>&1 | tail -50

# Check exit code
docker inspect workspace-service --format='{{.State.ExitCode}}'

# Common exit codes:
# 1 = General error (check logs)
# 137 = Killed by OOM (out of memory)
# 139 = Segmentation fault
# 143 = Terminated by SIGTERM
```

**Common Causes & Solutions**:

#### A. Module Not Found
```bash
# Error: Cannot find module '/shared/config/load-env.js'
# Solution: Comment out the import in src/config.js

# Edit the file
vim backend/api/workspace/src/config.js
# Change: import '../../../shared/config/load-env.js';
# To: // import '../../../shared/config/load-env.js'; // Not needed in Docker

# Restart container (hot-reload should pick it up)
docker restart workspace-service
```

#### B. Missing Environment Variables
```bash
# Check container environment
docker exec workspace-service printenv | grep TIMESCALEDB

# If missing, check .env file and restart with explicit env file:
docker compose -f tools/compose/docker-compose.apps.yml --env-file .env up -d
```

#### C. Package Installation Failed
```bash
# Rebuild the image
docker compose -f tools/compose/docker-compose.apps.yml build workspace

# Start with fresh image
docker compose -f tools/compose/docker-compose.apps.yml up -d workspace
```

---

### 4. Health Check Failing

**Symptoms**:
```
docker ps shows: Up X seconds (unhealthy)
```

**Diagnosis**:
```bash
# Test health endpoint manually
curl -v http://localhost:3200/health

# Check container logs
docker logs workspace-service | grep -E "ERROR|health"

# Inspect health check configuration
docker inspect workspace-service --format='{{json .State.Health}}' | jq '.'
```

**Solutions**:

#### A. Service Not Ready Yet
```bash
# Health checks start after 40 seconds (start_period)
# Wait longer and check again
sleep 45
docker ps | grep workspace-service
```

#### B. Health Endpoint Not Responding
```bash
# Check if process is running inside container
docker exec workspace-service ps aux

# Check if port is listening inside container
docker exec workspace-service netstat -tlnp | grep 3200

# If not, check application logs
docker logs workspace-service
```

#### C. Database Connection in Health Check
```bash
# Some health checks test database connection
# Ensure TimescaleDB is accessible
docker exec workspace-service ping -c 3 timescaledb

# If fails, reconnect to network:
docker network connect --alias timescaledb tradingsystem_backend data-timescaledb
docker restart workspace-service
```

---

### 5. Hot-Reload Not Working

**Symptoms**:
```
Code changes not reflected in running container
```

**Diagnosis**:
```bash
# Check volume mounts
docker inspect workspace-service --format='{{json .Mounts}}' | jq '.[] | select(.Destination=="/app/src")'

# Check if nodemon is running
docker exec workspace-service ps aux | grep nodemon
```

**Solutions**:

#### A. Volume Mount Issue
```bash
# Verify volume is mounted correctly
docker compose -f tools/compose/docker-compose.apps.yml config | grep -A 5 volumes

# Should show: - ../../backend/api/workspace/src:/app/src:ro

# If wrong, fix docker-compose.apps.yml and recreate:
docker compose -f tools/compose/docker-compose.apps.yml up -d --force-recreate
```

#### B. Nodemon Not Watching
```bash
# Check nodemon configuration in package.json
docker exec workspace-service cat /app/package.json | jq '.scripts.dev'

# Restart with logs to see if nodemon detects changes
docker logs -f workspace-service &
echo "// trigger change" >> backend/api/workspace/src/config.js
# Should see: [nodemon] restarting due to changes...
```

#### C. File Permissions
```bash
# On Linux, check file ownership
ls -la backend/api/workspace/src/

# If owned by root, fix it:
sudo chown -R $USER:$USER backend/api/workspace/src/
```

---

### 6. Docker Build Fails

**Symptoms**:
```
Error: npm ci can only install packages when package-lock.json exists
Error: Cannot find module 'package.json'
```

**Diagnosis**:
```bash
# Check .dockerignore
cat apps/tp-capital/api/.dockerignore | grep json

# Check if package.json exists
ls -la apps/tp-capital/api/package*.json
```

**Solutions**:

#### A. .dockerignore Blocking Files
```bash
# Edit .dockerignore to NOT exclude package*.json
vim apps/tp-capital/api/.dockerignore

# Change:
# *.json  # ❌ Blocks package.json

# To:
# data/**/*.json  # ✅ Only blocks data files

# Rebuild
docker compose -f tools/compose/docker-compose.apps.yml build --no-cache
```

#### B. Missing package-lock.json
```bash
# Generate it
cd apps/tp-capital/api
npm install

# Now rebuild
docker compose -f tools/compose/docker-compose.apps.yml build
```

---

### 7. Environment Variables Not Loading

**Symptoms**:
```
Config uses default values instead of .env values
Warnings: The "TIMESCALEDB_PASSWORD" variable is not set
```

**Diagnosis**:
```bash
# Check .env file exists
ls -la .env

# Check variable is in .env
grep TIMESCALEDB_PASSWORD .env

# Check container got the variable
docker exec workspace-service printenv TIMESCALEDB_PASSWORD
```

**Solutions**:

#### A. Missing .env File
```bash
# Copy from example
cp .env.example .env

# Edit with actual values
vim .env
```

#### B. .env Not Being Loaded
```bash
# Explicitly pass env file
docker compose -f tools/compose/docker-compose.apps.yml --env-file .env up -d

# Or set in docker-compose.apps.yml:
# env_file:
#   - ../../.env
```

#### C. Variable Name Mismatch
```bash
# Check docker-compose.apps.yml uses correct variable names
grep TIMESCALEDB_PASSWORD tools/compose/docker-compose.apps.yml

# Should match .env:
# - TIMESCALEDB_PASSWORD=${TIMESCALEDB_PASSWORD}
```

---

### 8. High Memory/CPU Usage

**Symptoms**:
```
Container using 100% CPU or excessive memory
System becomes slow
```

**Diagnosis**:
```bash
# Check container stats
docker stats tp-capital-api workspace-service

# Check processes inside container
docker exec workspace-service ps aux

# Check for memory leaks
docker exec workspace-service cat /proc/meminfo
```

**Solutions**:

#### A. Limit Container Resources
```bash
# Edit docker-compose.apps.yml, add resource limits:
services:
  workspace:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M

# Restart
docker compose -f tools/compose/docker-compose.apps.yml up -d
```

#### B. Too Many Logs
```bash
# Logs can fill disk
docker system df

# Clean up logs
docker compose -f tools/compose/docker-compose.apps.yml logs --tail 0 -f &
docker system prune -f

# Or configure log rotation in docker-compose.apps.yml (already done)
```

---

## 🛠️ Advanced Diagnostics

### Full Container Inspection

```bash
# Get all container details
docker inspect tp-capital-api | jq '.'

# Specific sections:
docker inspect tp-capital-api --format='{{json .State}}' | jq '.'
docker inspect tp-capital-api --format='{{json .NetworkSettings}}' | jq '.'
docker inspect tp-capital-api --format='{{json .Config.Env}}' | jq '.[]'
```

### Interactive Debugging

```bash
# Get a shell inside the container
docker exec -it workspace-service sh

# Inside container:
ps aux              # Check processes
netstat -tlnp       # Check listening ports
env | grep TIME     # Check env vars
ls -la /app/src     # Check mounted files
npm run dev         # Run manually to see output
exit
```

### Network Debugging

```bash
# List all networks
docker network ls

# Inspect backend network
docker network inspect tradingsystem_backend

# Test connectivity between containers
docker exec workspace-service ping -c 3 timescaledb
docker exec workspace-service nc -zv timescaledb 5432
```

### Database Debugging

```bash
# Connect to database from container
docker exec -it workspace-service sh -c '
  apk add --no-cache postgresql-client
  PGPASSWORD=$TIMESCALEDB_PASSWORD psql -h timescaledb -U timescale -d APPS-TPCAPITAL
'

# Inside psql:
\l              # List databases
\c APPS-TPCAPITAL   # Connect to database
\dn             # List schemas
\dt workspace.* # List tables in workspace schema
SELECT COUNT(*) FROM workspace.workspace_items;
\q              # Quit
```

---

## 📞 Getting Help

If you're still stuck:

1. **Collect Information**:
   ```bash
   # Save logs
   docker logs tp-capital-api > tp-capital.log 2>&1
   docker logs workspace-service > workspace.log 2>&1

   # Save container config
   docker inspect tp-capital-api > tp-capital-inspect.json
   docker inspect workspace-service > workspace-inspect.json

   # Save system info
   docker version > system-info.txt
   docker ps -a >> system-info.txt
   ```

2. **Check Documentation**:
   - `DOCKER-QUICK-START.md` - Basic setup
   - `docs/` - Architecture and design docs
   - Service READMEs - Service-specific docs

3. **Report Issue**:
   - Include logs from step 1
   - Describe what you were trying to do
   - Describe what happened instead
   - Include output of diagnostic commands

---

**Last Updated**: 2025-10-25
**Covers**: Post-migration architecture (Phases 2-7 complete)
