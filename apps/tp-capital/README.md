---
title: TP Capital Ingestion
sidebar_position: 1
tags: [api, autonomous-stack]
domain: backend
type: index
summary: Autonomous stack with dedicated TimescaleDB for TP Capital signal ingestion from Telegram Gateway via HTTP API.
status: active
last_review: "2025-11-04"
---

# TP Capital Ingestion

**Version:** 2.0.0 (Autonomous Stack)  
**Port:** 4008 (dedicated stack)

Autonomous microservice stack that ingests TP Capital trading signals from Telegram Gateway, processes and validates them, and stores in dedicated TimescaleDB.

## Architecture (v2.0 - Updated 2025-11-04)

**Autonomous Stack (5 containers):**
- **TimescaleDB** (5440) - Dedicated time-series database
- **PgBouncer** (6435) - Connection pooling
- **Redis Master** (6381) - Primary cache
- **Redis Replica** (6382) - Read scaling
- **TP Capital API** (4008) - REST API & polling worker

**Integration:**
- 🔌 HTTP API with Telegram Gateway (decoupled from database)
- 🔄 Automatic historical sync (backfill on startup)
- ⚡ Circuit breaker for resilience
- 🎯 HYBRID Architecture: Push (Redis Pub/Sub) + Pull (Polling 60s fallback)
- 📅 Date range filtering support

## Features
- ✅ **Autonomous stack** with dedicated database (isolated from Gateway)
- ✅ **HTTP API integration** (no direct database access to Gateway)
- ✅ **Automatic historical sync** on startup (one-time backfill)
- ✅ **HYBRID Architecture** - Push (Redis < 100ms) + Pull (Polling 60s fallback)
- ✅ **Real-time signal ingestion** with dual-path reliability
- ✅ **Signal parsing** (extracts asset, buy range, targets, stop)
- ✅ **Date range filtering** (frontend and backend support)
- ✅ **Cache layer** (Redis master-replica for performance)
- ✅ **Connection pooling** (PgBouncer for database efficiency)
- ✅ **Health monitoring** (comprehensive health checks)
- ✅ **Prometheus metrics** for observability

## Quick Start (Autonomous Stack)

### Prerequisites
- Telegram Gateway API running on port 4010
- Environment variables configured (see Configuration section)

### Startup

```bash
# Method 1: Using helper script (recommended)
bash scripts/docker/start-tp-capital-stack.sh

# Method 2: Docker Compose directly
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d
```

### Verify Stack Health

```bash
# Check all containers
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml ps

# Test API health
curl http://localhost:4008/health | jq '.checks'

# Expected: All checks green (timescaledb, gatewayApi, pollingWorker)
```

### View Logs

```bash
# All containers
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml logs -f

# Specific container
docker logs -f tp-capital-api
```

## Configuration

### Required Environment Variables (.env)

```bash
# Database (Dedicated Stack)
TP_CAPITAL_DB_PASSWORD=<generated>
TP_CAPITAL_DB_USER=tp_capital
TP_CAPITAL_DB_NAME=tp_capital_db
TP_CAPITAL_DB_PORT=5440
TP_CAPITAL_DB_STRATEGY=timescale  # or 'neon'

# Gateway Integration (HTTP API)
TELEGRAM_GATEWAY_URL=http://host.docker.internal:4010
TELEGRAM_GATEWAY_API_KEY=<your-api-key>
TP_CAPITAL_SIGNALS_CHANNEL_ID=-1001649127710

# API
TP_CAPITAL_API_KEY=<your-api-key>
```

Run setup script to generate passwords:
```bash
bash scripts/setup/add-tp-capital-env-vars.sh
```

## Deployment

A GitHub Actions workflow (`.github/workflows/tp-capital.yml`) builds the Docker image and pushes it to GHCR on every push to `main`.

To run the production stack on a server:

```bash
cd apps/tp-capital
docker compose build
docker compose push
```

TimescaleDB data is persisted via the `tp-capital-timescaledb-data` volume.
