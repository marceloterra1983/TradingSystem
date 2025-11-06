# TP-Capital Autonomous Stack - Deployment Guide

**Version:** 2.0.0  
**Date:** 2025-11-04  
**Status:** Production Ready

---

## 📋 Pre-Deployment Checklist

- [ ] Telegram Gateway API running on port 4010
- [ ] Environment variables configured in root `.env`
- [ ] Docker and Docker Compose installed
- [ ] Networks created (`tradingsystem_backend`, `telegram_backend`)
- [ ] Ports available: 5440, 6435, 6381, 6382, 4008

---

## 🚀 Deployment Steps

### Step 1: Configure Environment

```bash
# Run setup script to generate passwords
bash scripts/setup/add-tp-capital-env-vars.sh

# Verify variables
grep "TP_CAPITAL" .env
```

Expected variables:
- `TP_CAPITAL_DB_PASSWORD` - Auto-generated secure password
- `TP_CAPITAL_DB_USER=tp_capital`
- `TP_CAPITAL_DB_NAME=tp_capital_db`
- `TP_CAPITAL_DB_PORT=5437`
- `TP_CAPITAL_DB_STRATEGY=timescale`

### Step 2: Start the Stack

```bash
# Method 1: Using startup script (recommended)
bash scripts/docker/start-tp-capital-stack.sh

# Method 2: Docker Compose directly  
docker compose -f tools/compose/docker-compose.tp-capital-stack.yml up -d
```

### Step 3: Verify Deployment

```bash
# 1. Check container status
docker compose -f tools/compose/docker-compose.tp-capital-stack.yml ps

# Expected: All 5 containers "healthy"

# 2. Test API health
curl http://localhost:4008/health | jq '.status'

# Expected: "healthy"

# 3. Verify database connection
docker exec tp-capital-timescale sh -c \
  "PGPASSWORD=\$TP_CAPITAL_DB_PASSWORD psql -U tp_capital -d tp_capital_db -c 'SELECT COUNT(*) FROM signals.tp_capital_signals'"

# Expected: Row count (may be 1 if only checkpoint exists)

# 4. Check historical sync ran
curl http://localhost:4008/signals?limit=5 | jq '.data[] | select(.signal_type == "historical_sync")'

# Expected: Checkpoint entry with totalSynced > 0
```

### Step 4: Monitor Polling

```bash
# Watch logs for polling activity
docker logs -f tp-capital-api 2>&1 | grep -E "(Processing batch|Circuit|polling)"

# Expected:
# - "Gateway polling worker started"
# - "Processing batch of messages" (every ~5s)
# - No "Circuit breaker OPEN" errors
```

---

## 🏗️ Stack Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Dashboard (3103)                   │
│                 HTTP GET /signals                   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│            TP-Capital API (4008)                    │
│  ┌───────────────────────────────────────────────┐  │
│  │  Polling Worker (5s)                          │  │
│  │    ↓                                          │  │
│  │  GatewayHttpClient (Circuit Breaker)          │  │
│  │    ↓                                          │  │
│  │  Telegram Gateway API (HTTP)                  │  │
│  └───────────────────────────────────────────────┘  │
│                       │                             │
│                       ▼                             │
│  ┌───────────────────────────────────────────────┐  │
│  │  TimescaleDB (via PgBouncer)                  │  │
│  │  Schema: signals.tp_capital_signals          │  │
│  └───────────────────────────────────────────────┘  │
│                       │                             │
│                       ▼                             │
│  ┌───────────────────────────────────────────────┐  │
│  │  Redis Master → Redis Replica                 │  │
│  │  (Cache layer for performance)                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Operational Tasks

### Restart Stack

```bash
docker compose -f tools/compose/docker-compose.tp-capital-stack.yml restart
```

### Stop Stack

```bash
docker compose -f tools/compose/docker-compose.tp-capital-stack.yml down
```

### View Logs

```bash
# All services
docker compose -f tools/compose/docker-compose.tp-capital-stack.yml logs -f

# Specific service
docker logs -f tp-capital-api
docker logs -f tp-capital-timescale
docker logs -f tp-capital-pgbouncer
```

### Manual Sync

```bash
# Trigger sync via API (requires API key)
curl -X POST http://localhost:4008/sync-messages \
  -H "X-API-Key: $TP_CAPITAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 500}' | jq '.'
```

### Database Queries

```bash
# Connect to database via PgBouncer
docker exec -it tp-capital-pgbouncer psql \
  -h localhost -p 6432 -U tp_capital -d tp_capital_db

# Direct TimescaleDB connection
docker exec -it tp-capital-timescale sh -c \
  "PGPASSWORD=\$TP_CAPITAL_DB_PASSWORD psql -U tp_capital -d tp_capital_db"

# Query signals
psql> SELECT asset, signal_type, buy_min, buy_max, ingested_at 
      FROM signals.tp_capital_signals 
      WHERE signal_type != 'historical_sync'
      ORDER BY ingested_at DESC 
      LIMIT 10;
```

---

## 🎯 Performance Tuning

### Database

```bash
# Check connection pool usage
docker exec tp-capital-pgbouncer psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS"

# Expected: Most connections in "idle" state (efficient pooling)
```

### Cache

```bash
# Check Redis stats
docker exec tp-capital-redis-master redis-cli INFO stats

# Expected:
# - keyspace_hits > keyspace_misses (>50% hit rate)
# - evicted_keys: 0 (no memory pressure)
```

### API

```bash
# Check Prometheus metrics
curl http://localhost:4008/metrics | grep tpcapital_signals_total

# Monitor query latency
curl http://localhost:4008/metrics | grep http_request_duration
```

---

## ⚠️ Troubleshooting

### Container Won't Start

**Problem:** Port conflict (5440, 6435, 6381, 6382, 4008)

**Solution:**
```bash
# Find conflicting process
lsof -ti:4008

# Stop conflicting container
docker stop <container-name>

# Or modify port in .env
echo "TP_CAPITAL_EXTERNAL_PORT=4009" >> .env
```

### Circuit Breaker Always Open

**Problem:** Cannot connect to Gateway API

**Diagnosis:**
```bash
# Test from container
docker exec tp-capital-api node -e \
  "fetch('http://host.docker.internal:4010/health')\
  .then(r => r.json())\
  .then(d => console.log(d))\
  .catch(e => console.error(e.message))"
```

**Solutions:**
1. Verify Gateway API is running: `curl http://localhost:4010/health`
2. Check API key: `docker exec tp-capital-api env | grep TELEGRAM_GATEWAY_API_KEY`
3. Restart Gateway API if hot-reload failed

### Database Connection Timeout

**Problem:** Health check fails for TimescaleDB

**Diagnosis:**
```bash
# Test PgBouncer → TimescaleDB
docker exec tp-capital-pgbouncer nc -zv tp-capital-timescaledb 5432

# Test API → PgBouncer
docker exec tp-capital-api node -e \
  "const pg = require('pg'); \
   const pool = new pg.Pool({host:'tp-capital-pgbouncer', port:6432, database:'tp_capital_db', user:'tp_capital', password:process.env.TP_CAPITAL_DB_PASSWORD}); \
   pool.query('SELECT 1').then(() => console.log('✓ Connected')).catch(e => console.error('✗ Error:', e.message))"
```

**Solutions:**
1. Check TimescaleDB is healthy: `docker ps | grep tp-capital-timescale`
2. Verify password: `docker exec tp-capital-api env | grep TP_CAPITAL_DB_PASSWORD`
3. Check network: `docker network inspect tp_capital_backend`

### No Messages Being Processed

**Problem:** Polling worker active but no messages

**Diagnosis:**
```bash
# Check unprocessed messages in Gateway
curl "http://localhost:4010/api/messages/unprocessed?channel=-1001649127710&limit=5" | jq '.count'

# Check TP-Capital logs
docker logs tp-capital-api 2>&1 | grep -E "(Processing batch|parse_failed|ignored)"
```

**Possible Causes:**
1. No new messages in Telegram channel
2. All messages already processed (check `processed_by` metadata)
3. Messages don't match signal format (incomplete signals)

---

## 📈 Metrics & Monitoring

### Health Dashboard

```bash
# Overall health
curl http://localhost:4008/health | jq '{status: .status, checks: .checks}'

# Expected: All checks "healthy"
```

### Prometheus Metrics

```bash
# Signals ingested
curl http://localhost:4008/metrics | grep "tpcapital_signals_total"

# Messages processed
curl http://localhost:4008/metrics | grep "tpcapital_messages_processed"

# Circuit breaker state
docker logs tp-capital-api 2>&1 | grep -E "(Circuit breaker)" | tail -5
```

### Database Statistics

```bash
# Table size
docker exec tp-capital-timescale sh -c "PGPASSWORD=\$TP_CAPITAL_DB_PASSWORD psql -U tp_capital -d tp_capital_db -c \"SELECT pg_size_pretty(pg_total_relation_size('signals.tp_capital_signals'))\""

# Row count
docker exec tp-capital-timescale sh -c "PGPASSWORD=\$TP_CAPITAL_DB_PASSWORD psql -U tp_capital -d tp_capital_db -c \"SELECT COUNT(*) FROM signals.tp_capital_signals\""

# Hypertable stats
docker exec tp-capital-timescale sh -c "PGPASSWORD=\$TP_CAPITAL_DB_PASSWORD psql -U tp_capital -d tp_capital_db -c \"SELECT * FROM timescaledb_information.hypertables WHERE hypertable_schema='signals'\""
```

---

## 🔄 Rollback Plan

If critical issues occur:

```bash
# 1. Stop new stack
docker compose -f tools/compose/docker-compose.tp-capital-stack.yml down

# 2. Restore legacy service (comment out '# ' prefix)
vim tools/compose/docker-compose.apps.yml
# Uncomment tp-capital service block

# 3. Start legacy service
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital

# 4. Verify
curl http://localhost:4006/health
```

Backups: Automatic backup created before migration in `backups/tp-capital-migration-*/`

---

## 📚 Related Documentation

- **Implementation Plan:** `tp-capital-autonomous-stack.plan.md`
- **Architecture Review:** `ARCHITECTURE-REVIEW-TP-CAPITAL-2025-11-04.md`
- **ADR:** `docs/content/reference/adrs/008-tp-capital-autonomous-stack.md`
- **API Documentation:** `docs/content/apps/tp-capital/`
- **README:** `apps/tp-capital/README.md`

---

## 📞 Support

### Common Issues

1. **Circuit breaker open** → Check Gateway API connectivity
2. **Database timeout** → Verify PgBouncer and TimescaleDB connection
3. **No signals appearing** → Check message format and parsing logs
4. **Port conflicts** → Modify ports in `.env` and restart stack

### Logs Location

- **Stack logs:** `docker logs <container-name>`
- **Gateway API logs:** `/home/marce/Projetos/TradingSystem/logs/telegram-gateway-api.log`

### Health Checks

```bash
# Quick health check
curl http://localhost:4008/health | jq '{status, uptime, checks}'

# Detailed status
docker compose -f tools/compose/docker-compose.tp-capital-stack.yml ps
```

---

**Deployed:** 2025-11-04  
**Next Review:** 2025-11-11 (remove legacy service)

