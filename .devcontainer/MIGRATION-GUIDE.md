# 🔄 Dev Container Migration Guide

## Overview

The TradingSystem dev container has been updated to a **self-contained architecture** where ALL services run inside the dev container using the **EXISTING** Docker Compose stack files from `tools/compose/`.

## Why This Change?

### ❌ Old Approach (External Stacks)
- Services ran outside dev container
- Network isolation issues between containers
- Complex network configuration required
- Hard to debug connectivity problems

### ✅ New Approach (Self-Contained)
- All services run inside dev container
- Uses existing stack structure (0-gateway, 1-dashboard, 2-docs, etc.)
- No network isolation issues
- Simpler architecture
- Better debugging experience
- Everything in one place
- **Preserves existing stack organization**

## Migration Steps

### Step 1: Stop External Stacks

**On the HOST (outside dev container):**

```bash
cd /home/marce/Projetos/TradingSystem
bash .devcontainer/scripts/stop-external-stacks.sh
```

This stops:
- Gateway Stack (Traefik)
- Dashboard Stack
- Docs Stack
- Workspace Stack
- Database Stack

### Step 2: Rebuild Dev Container

**In VSCode:**

1. Open Command Palette (`Ctrl+Shift+P`)
2. Select: **"Dev Containers: Rebuild Container"**
3. Wait for rebuild to complete (~5 minutes)

**What happens during rebuild:**
- ✅ Dev container image is rebuilt
- ✅ Dependencies are installed
- ✅ `post-create.sh` runs (npm install, Python venv, etc.)
- ✅ `post-start.sh` runs (starts internal services)

### Step 3: Verify Services

**Inside dev container terminal:**

```bash
# Check all TradingSystem stacks are running
docker ps --filter "label=com.tradingsystem.stack"

# Expected output:
# CONTAINER ID   IMAGE              NAMES           STATUS      PORTS
# ...            traefik:v3.0       api-gateway     Up          9080->9080, 9081->9080
# ...            img-dashboard-ui   dashboard-ui    Up          8090->3103
# ...            img-docs-hub       docs-hub        Up          3404->80
# ...            img-workspace      workspace-api   Up          3200->3200
# ...            postgres:17        workspace-db    Up (healthy)

# Or use the helper command:
bash .devcontainer/scripts/start-all-stacks.sh
```

### Step 4: Test Access

**From your browser (host machine):**

1. API Gateway: http://localhost:9080
2. Traefik Dashboard: http://localhost:9081/dashboard/
3. **Dashboard UI: http://localhost:8090** (not 3103!)
4. Documentation: http://localhost:3404

**From dev container terminal:**

```bash
# Test API Gateway
curl http://localhost:9080

# Test Workspace API
curl http://localhost:3200/api/health

# Test Documentation
curl http://localhost:3404

# Test Dashboard
curl http://localhost:8090
```

## Architecture Comparison

### Before (External Stacks)

```
┌─────────────────────────────────────┐
│  Host Machine                       │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Dev Container                │ │
│  │  - VSCode Server              │ │
│  │  - Node.js, Python            │ │
│  │  - Development tools          │ │
│  └───────────────────────────────┘ │
│           │                         │
│           │ Network isolation! ❌   │
│           ▼                         │
│  ┌───────────────────────────────┐ │
│  │  External Docker Stacks       │ │
│  │  - Gateway (Traefik)          │ │
│  │  - Workspace API              │ │
│  │  - Dashboard UI               │ │
│  │  - Docs Hub                   │ │
│  │  - Databases                  │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### After (Self-Contained)

```
┌─────────────────────────────────────┐
│  Host Machine                       │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Dev Container                │ │
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │  Development Environment│ │ │
│  │  │  - VSCode Server        │ │ │
│  │  │  - Node.js, Python      │ │ │
│  │  │  - Development tools    │ │ │
│  │  └─────────────────────────┘ │ │
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │  TradingSystem Stacks   │ │ │
│  │  │  (Docker-in-Docker)     │ │ │
│  │  │                         │ │ │
│  │  │  tools/compose/:        │ │ │
│  │  │  - 0-gateway-stack ✅    │ │ │
│  │  │  - 1-dashboard-stack ✅  │ │ │
│  │  │  - 2-docs-stack ✅       │ │ │
│  │  │  - 4-3-workspace-stack ✅│ │ │
│  │  │  - 5-0-database-stack ✅ │ │ │
│  │  └─────────────────────────┘ │ │
│  └───────────────────────────────┘ │
│                                     │
│  Port Forwarding: 9080, 8090, etc. │
└─────────────────────────────────────┘
```

## Troubleshooting

### Services Not Starting

**Problem:** Services don't start after rebuild

**Solution:**
```bash
# Check Docker daemon
docker info

# Manually start all stacks
cd /workspace
bash .devcontainer/scripts/start-all-stacks.sh

# Check individual stack logs
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml logs
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml logs
# etc.

# Check specific container
docker logs api-gateway
docker logs dashboard-ui
```

### Port Already in Use

**Problem:** Port 9080/8090/etc. already in use

**Solution:**
```bash
# Stop all stacks
bash .devcontainer/scripts/stop-all-stacks.sh

# Or find and kill process using port
lsof -i :9080
kill -9 <PID>

# Restart with clean state
bash .devcontainer/scripts/start-all-stacks.sh
```

### Cannot Access Services

**Problem:** http://localhost:9080 not responding

**Check:**
1. Are services running inside dev container?
   ```bash
   docker ps --filter "label=com.tradingsystem.stack"
   ```

2. Is VSCode port forwarding active?
   - VSCode → Ports panel
   - Should show: 9080, 9081, 8090, 3200, 3404

3. Test from inside dev container:
   ```bash
   curl http://localhost:9080
   curl http://localhost:8090
   ```

4. Check individual stack status:
   ```bash
   docker compose -f tools/compose/docker-compose.0-gateway-stack.yml ps
   docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml ps
   ```

### Docker-in-Docker Issues

**Problem:** Cannot run `docker` commands inside dev container

**Solution:**
```bash
# Check Docker socket
ls -la /var/run/docker.sock

# Check Docker daemon
docker info

# Restart dev container
# VSCode → Dev Containers: Rebuild Container
```

## Management Commands

### Start All Stacks
```bash
bash .devcontainer/scripts/start-all-stacks.sh
```

### Stop All Stacks
```bash
bash .devcontainer/scripts/stop-all-stacks.sh
```

### Check Stack Status
```bash
docker ps --filter "label=com.tradingsystem.stack"
```

### View Logs
```bash
# All stacks
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml logs -f
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml logs -f

# Specific container
docker logs -f api-gateway
docker logs -f dashboard-ui
```

### Restart Individual Stack
```bash
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml restart
```

## Benefits of New Approach

### For Development
- ✅ Faster startup (no network setup needed)
- ✅ Better debugging (all logs in one place)
- ✅ Simpler architecture (easier to understand)
- ✅ No network isolation issues

### For Onboarding
- ✅ One-step setup (just open in dev container)
- ✅ No manual Docker stack management
- ✅ Consistent environment for all developers

### For Testing
- ✅ Full stack testing inside container
- ✅ Easier integration tests
- ✅ Reproducible environment

## Next Steps

After migration is complete:

1. ✅ Verify all stacks start successfully inside dev container
2. ✅ Test service accessibility via browser (9080, 8090, 3404, etc.)
3. ✅ Run application functionality tests
4. ✅ Update team documentation
5. ✅ **Keep existing stack files in tools/compose/** - DO NOT remove them!

## Key Differences from Previous Approach

### ✅ What Changed
- Services now run INSIDE dev container (not externally)
- Automatic startup via `post-start.sh`
- Simplified port management with VSCode forwarding

### ❌ What DID NOT Change
- **Stack file locations**: Still in `tools/compose/`
- **Stack naming**: Still numbered (0-gateway, 1-dashboard, etc.)
- **Container names**: Still same (api-gateway, dashboard-ui, etc.)
- **Service ports**: Mostly same (Dashboard changed to 8090)

## Support

If you encounter issues:

1. Check troubleshooting section above
2. Review dev container logs: VSCode → Output → Dev Containers
3. Check service logs: `bash .devcontainer/scripts/start-all-stacks.sh`
4. Verify network connectivity: `docker network ls`
5. Ask in team chat/Slack

---

**Last Updated:** 2025-11-12
**Migration Status:** ✅ Using existing stack files from tools/compose/
