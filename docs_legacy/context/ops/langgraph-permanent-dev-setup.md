---
title: LangGraph Development Environment - Permanent Setup
tags: [langgraph, development, docker, setup, studio]
domain: ops
type: guide
summary: Guide for running LangGraph development environment (port 8112) permanently alongside production
status: active
last_review: "2025-10-19"
sidebar_position: 1
---

# LangGraph Development Environment - Permanent Setup

**Version:** 1.0.0
**Last Updated:** 2025-10-19

---

## Overview

This guide explains how to run the **LangGraph development environment (port 8112)** permanently alongside the production environment (port 8111). The dev environment provides:

- **Isolated databases** (Redis, PostgreSQL)
- **LangSmith Studio integration** for visual workflow debugging
- **Separate port (8112)** to avoid conflicts with production
- **Full tracing** enabled by default

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              LANGGRAPH DUAL DEPLOYMENT                  │
└─────────────────────────────────────────────────────────┘
           │
           ├────────────────────┬────────────────────────┐
           ▼                    ▼                        ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │   PRODUCTION     │  │   DEVELOPMENT    │  │   CLI (Optional) │
  │   Port: 8111     │  │   Port: 8112     │  │   Port: 2024     │
  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
  │ Shared DBs:      │  │ Isolated DBs:    │  │ In-Memory        │
  │ - PostgreSQL     │  │ - PostgreSQL     │  │ - No persistence │
  │   (port 5432)    │  │   (port 5443)    │  │                  │
  │ - QuestDB        │  │ - Redis          │  │                  │
  │   (port 9000)    │  │   (port 6380)    │  │                  │
  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
  │ Studio: Optional │  │ Studio: Enabled  │  │ Studio: Basic    │
  │ Tracing: Off     │  │ Tracing: On      │  │ Tracing: On      │
  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Quick Start

### 1. Configure LangSmith API Key (Optional but Recommended)

To use **LangSmith Studio** for visual debugging:

```bash
# 1. Sign up at https://smith.langchain.com
# 2. Get API key from https://smith.langchain.com/settings
# 3. Add to .env:

# Open .env and add:
LANGSMITH_API_KEY=lsv2_your_api_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=langgraph-dev
```

**Note:** The dev environment works without API key, but Studio integration won't be available.

### 2. Start Development Environment

```bash
# Manual start (recommended for first time)
bash scripts/langgraph/start-dev.sh

# Or include in full stack startup
bash scripts/docker/start-stacks.sh --phase langgraph-dev

# Or start all stacks (includes dev environment)
bash scripts/docker/start-stacks.sh
```

### 3. Verify Services

```bash
# Check health
curl http://localhost:8112/health | jq

# Check containers
docker ps | grep -E "langgraph-dev|redis-dev|postgres-dev"

# View logs
docker logs infra-langgraph-dev -f
```

---

## Services & Ports

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| **LangGraph Dev** | `infra-langgraph-dev` | 8112 | Main API endpoint |
| **Redis Dev** | `infra-redis-dev` | 6380 | Pub/sub for Studio |
| **PostgreSQL Dev** | `infra-postgres-dev` | 5443 | State persistence |

### Production vs Development Ports

| Service | Production | Development |
|---------|-----------|-------------|
| LangGraph | 8111 | 8112 |
| PostgreSQL | 5432 (shared) | 5443 (isolated) |
| Redis | N/A | 6380 |

---

## Access URLs

### Development Environment (Port 8112)
- **API:** http://localhost:8112
- **Health:** http://localhost:8112/health
- **Metrics:** http://localhost:8112/metrics
- **Studio:** https://smith.langchain.com/studio (requires API key)

### Production Environment (Port 8111)
- **API:** http://localhost:8111
- **Health:** http://localhost:8111/health
- **Metrics:** http://localhost:8111/metrics

### Database Access (Dev Only)
- **Redis:** `redis://localhost:6380`
- **PostgreSQL:** `postgresql://langgraph:langgraph_dev_password@localhost:5443/langgraph_dev`

---

## Management Commands

### Start/Stop

```bash
# Start development environment
bash scripts/langgraph/start-dev.sh

# Stop development environment
bash scripts/langgraph/stop-dev.sh

# Restart (clean)
bash scripts/langgraph/stop-dev.sh
bash scripts/langgraph/start-dev.sh

# Remove volumes (data loss!)
docker compose -f tools/compose/docker-compose.langgraph-dev.yml down -v
```

### Logs & Monitoring

```bash
# View logs (all services)
docker logs infra-langgraph-dev -f
docker logs infra-redis-dev -f
docker logs infra-postgres-dev -f

# Check resource usage
docker stats infra-langgraph-dev infra-redis-dev infra-postgres-dev

# Inspect network
docker network inspect tradingsystem_langgraph_dev
```

### Database Operations

```bash
# Connect to PostgreSQL dev
psql -h localhost -p 5443 -U langgraph -d langgraph_dev

# Connect to Redis dev
redis-cli -p 6380

# Backup dev database
docker exec infra-postgres-dev pg_dump -U langgraph langgraph_dev > langgraph_dev_backup.sql

# Restore dev database
cat langgraph_dev_backup.sql | docker exec -i infra-postgres-dev psql -U langgraph langgraph_dev
```

---

## Integration with Startup Scripts

The dev environment is now integrated into the main startup script:

### Start with All Stacks

```bash
# Starts everything including dev environment
bash scripts/docker/start-stacks.sh

# Output will include:
# 📦 Stack 8/9: LangGraph Development (Port 8112)...
# ✓ LangGraph dev started on port 8112
#   Access: http://localhost:8112
#   Studio: https://smith.langchain.com/studio
```

### Start Only Dev Environment

```bash
# Start only the dev stack
bash scripts/docker/start-stacks.sh --phase langgraph-dev
```

### List Available Phases

```bash
bash scripts/docker/start-stacks.sh --list

# Output:
# Available phases:
#   - infra-core (Infrastructure Core)
#   - data (Data)
#   - timescale (TimescaleDB)
#   - frontend-apps (Frontend Apps DB)
#   - monitoring (Monitoring)
#   - docs (Documentation)
#   - infra (Infrastructure Services)
#   - langgraph-dev (LangGraph Development (Port 8112))  ← NEW!
#   - firecrawl (Firecrawl)
```

---

## LangSmith Studio Usage

### Setup

1. **Get API Key**: https://smith.langchain.com/settings
2. **Add to .env**: `LANGSMITH_API_KEY=lsv2_...`
3. **Restart dev**: `bash scripts/langgraph/start-dev.sh`

### Access Studio

1. **Navigate**: https://smith.langchain.com/studio
2. **Select Project**: `langgraph-dev`
3. **View Traces**: Real-time workflow execution
4. **Debug**: Step through nodes, inspect state

### Example: Execute Workflow and View in Studio

```bash
# Execute trading workflow
curl -X POST http://localhost:8112/workflows/trading/execute \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "WINZ25",
    "mode": "paper",
    "strategy": "default"
  }'

# View trace in Studio:
# 1. Open https://smith.langchain.com/studio
# 2. Select project: langgraph-dev
# 3. See real-time workflow execution
# 4. Click on trace to inspect nodes and state
```

---

## Troubleshooting

### Port 8112 Not Responding

**Symptoms:** `ERR_CONNECTION_REFUSED` when accessing localhost:8112

**Solutions:**

```bash
# Check if container is running
docker ps | grep langgraph-dev

# Check logs
docker logs infra-langgraph-dev --tail 50

# Restart stack
bash scripts/langgraph/start-dev.sh
```

### Studio Not Showing Traces

**Symptoms:** No traces appear in LangSmith Studio

**Solutions:**

```bash
# 1. Verify API key is set
grep LANGSMITH_API_KEY .env

# 2. Check tracing is enabled
docker exec infra-langgraph-dev env | grep LANGSMITH

# 3. View logs for errors
docker logs infra-langgraph-dev -f | grep -i langsmith

# 4. Restart with fresh environment
docker compose -f tools/compose/docker-compose.langgraph-dev.yml down
bash scripts/langgraph/start-dev.sh
```

### Database Connection Errors

**Symptoms:** PostgreSQL or Redis connection failures

**Solutions:**

```bash
# Check database health
docker ps | grep -E "postgres-dev|redis-dev"

# Check PostgreSQL logs
docker logs infra-postgres-dev --tail 30

# Check Redis logs
docker logs infra-redis-dev --tail 30

# Verify network
docker network inspect tradingsystem_langgraph_dev

# Recreate with fresh volumes
docker compose -f tools/compose/docker-compose.langgraph-dev.yml down -v
bash scripts/langgraph/start-dev.sh
```

### Port Conflicts

**Symptoms:** `port is already allocated`

**Check what's using the ports:**

```bash
# Check ports
ss -tuln | grep -E '8112|6380|5443'

# Find process
lsof -i :8112
lsof -i :6380
lsof -i :5443

# Stop conflicting services or use different ports
```

---

## Performance Considerations

### Resource Usage

| Service | CPU (Typical) | Memory (Typical) | Disk |
|---------|---------------|------------------|------|
| LangGraph Dev | 1-5% | 200-500 MB | 1 GB |
| PostgreSQL Dev | 1-3% | 50-100 MB | 500 MB |
| Redis Dev | 0.5-2% | 50-100 MB | 100 MB |
| **Total** | ~2-10% | ~300-700 MB | ~1.6 GB |

### When to Use Dev vs Production

**Use Development (8112):**
- Workflow debugging with Studio
- Testing new workflows
- Inspecting state transitions
- Development and prototyping

**Use Production (8111):**
- Production workloads
- Performance testing
- Integration with other services
- 24/7 operations

---

## Configuration Files

### Docker Compose
- **File**: [tools/compose/docker-compose.langgraph-dev.yml](../../../tools/compose/docker-compose.langgraph-dev.yml)
- **Network**: `tradingsystem_langgraph_dev` (isolated)
- **Volumes**: `langgraph_postgres_dev_data` (persistent)

### Environment Variables
- **Source**: `.env` (project root)
- **Required**: None (works without LANGSMITH_API_KEY)
- **Recommended**: `LANGSMITH_API_KEY` for Studio integration

### Database Schemas
- **PostgreSQL**: [backend/data/postgresql/schemas/langgraph_checkpoints.sql](../../../backend/data/postgresql/schemas/langgraph_checkpoints.sql)
- **Auto-initialized**: Yes (on first start)

---

## Security Notes

### API Key Protection
- **Never commit** `.env` with real API keys
- **Use**: `.env.example` as template
- **Rotate**: API keys regularly

### Network Isolation
- **Dev network**: `tradingsystem_langgraph_dev` (isolated from production)
- **Production network**: `tradingsystem_backend` (shared services)
- **No cross-talk**: Dev and production are fully separated

### Database Access
- **Dev database**: Different credentials from production
- **Port binding**: Only exposed to localhost (not 0.0.0.0)
- **Data isolation**: Separate volumes

---

## Related Documentation

- **[LangGraph README](../../../tools/langgraph/README.md)** - Complete service documentation
- **[LangSmith Studio Guide](../backend/guides/langgraph-studio-guide.md)** - Studio integration details
- **[Development Guide](../../../tools/langgraph/DEVELOPMENT.md)** - Development vs production comparison
- **[Docker Startup Script](../../../scripts/docker/start-stacks.sh)** - Main orchestration script

---

## Changelog

### v1.0.0 (2025-10-19)
- ✅ Initial documentation
- ✅ Integration with start-stacks.sh
- ✅ PostgreSQL 16 compatibility fix
- ✅ Permanent deployment guide

---

**Maintainer:** Marcelo Terra
**Last Updated:** 2025-10-19
