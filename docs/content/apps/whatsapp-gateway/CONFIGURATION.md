---
title: WhatsApp Gateway - Configuration Guide
description: Complete configuration reference for WhatsApp Gateway Stack
tags: [whatsapp, configuration, environment]
domain: apps
type: guide
summary: Environment variables and configuration options for WhatsApp Gateway
status: active
last_review: "2025-11-08"
---

# WhatsApp Gateway Configuration Guide

## Environment Variables Reference

Add these variables to your `.env` file in the project root.

### Database Configuration

```bash
# TimescaleDB settings
WHATSAPP_DB_USER=whatsapp              # PostgreSQL username
WHATSAPP_DB_PASSWORD=                  # PostgreSQL password (REQUIRED)
WHATSAPP_DB_PORT=5435                  # Host port for direct access
WHATSAPP_PGBOUNCER_PORT=6435           # Host port for PgBouncer
```

### WhatsApp Core (WAHA)

```bash
# Service settings
WHATSAPP_CORE_PORT=3311                              # HTTP port
WHATSAPP_CORE_IMAGE=devlikeapro/waha:latest-baileys  # Docker image

# Authentication
WHATSAPP_API_KEY=                      # API key (REQUIRED)
WHATSAPP_DASHBOARD_ENABLED=true        # Enable web dashboard
WHATSAPP_DASHBOARD_USERNAME=admin      # Dashboard username
WHATSAPP_DASHBOARD_PASSWORD=           # Dashboard password (REQUIRED)

# Behavior
WHATSAPP_LOG_LEVEL=info                # Log level (debug, info, warn, error)
WHATSAPP_PRINT_QR=false                # Print QR codes to console
WHATSAPP_TZ=America/Sao_Paulo          # Timezone
WHATSAPP_HOOK_EVENTS=message,message.ack,session.status  # Webhook events
```

### Gateway API

```bash
# Service settings
WHATSAPP_GATEWAY_API_PORT=4011         # HTTP port

# Authentication
WHATSAPP_GATEWAY_API_TOKEN=            # API token for client requests (REQUIRED)
WHATSAPP_WEBHOOK_TOKEN=                # Webhook token from WAHA (REQUIRED)
```

### Redis Cache

```bash
WHATSAPP_REDIS_PORT=6380               # Redis port
WHATSAPP_REDIS_ENABLED=true            # Enable Redis caching
```

### MinIO Storage

```bash
# Service settings
WHATSAPP_MINIO_API_PORT=9302           # S3 API port
WHATSAPP_MINIO_CONSOLE_PORT=9303       # Web console port

# Authentication
WHATSAPP_MINIO_ROOT_USER=whatsappadmin # MinIO admin user
WHATSAPP_MINIO_ROOT_PASSWORD=          # MinIO admin password (REQUIRED)

# Storage
WHATSAPP_MINIO_BUCKET=whatsapp-media   # S3 bucket name
WHATSAPP_MINIO_REGION=us-east-1        # S3 region
```

### Sync Service

```bash
WHATSAPP_SYNC_ENABLED=true             # Enable background sync
WHATSAPP_SYNC_INTERVAL_MS=300000       # Sync interval (5 minutes)
WHATSAPP_SYNC_BATCH_SIZE=100           # Messages per batch
WHATSAPP_SYNC_LOOKBACK_DAYS=7          # Days of history to sync
WHATSAPP_SYNC_CONCURRENT_CHATS=5       # Concurrent chat syncs
WHATSAPP_SYNC_MAX_RETRIES=3            # Max retry attempts
```

## Required Variables

The following variables **MUST** be set:

1. `WHATSAPP_DB_PASSWORD`
2. `WHATSAPP_API_KEY`
3. `WHATSAPP_DASHBOARD_PASSWORD`
4. `WHATSAPP_GATEWAY_API_TOKEN`
5. `WHATSAPP_WEBHOOK_TOKEN`
6. `WHATSAPP_MINIO_ROOT_PASSWORD`

## Security Best Practices

### Strong Passwords

Use strong, unique passwords for all services:

```bash
# Generate secure passwords
openssl rand -base64 32
```

### API Tokens

Use long, random tokens:

```bash
# Generate API token
openssl rand -hex 32
```

### Network Isolation

Bind services to localhost when not needed externally:

```bash
# Bind to localhost only
WHATSAPP_MINIO_HOST_BIND=127.0.0.1
WHATSAPP_POSTGRES_HOST_BIND=127.0.0.1
```

## Performance Tuning

### Database

Adjust based on available resources:

```bash
# PostgreSQL (via postgresql.conf)
shared_buffers = 512MB          # 25% of RAM
effective_cache_size = 1536MB   # 50-75% of RAM
work_mem = 4MB
max_connections = 100
```

### PgBouncer

Connection pooling settings:

```bash
# Default pool size
WHATSAPP_GATEWAY_DB_POOL_MAX=20

# Connection timeout
WHATSAPP_GATEWAY_DB_IDLE_TIMEOUT_MS=30000
```

### Sync Service

Optimize for your load:

```bash
# More frequent sync
WHATSAPP_SYNC_INTERVAL_MS=60000  # 1 minute

# Larger batches
WHATSAPP_SYNC_BATCH_SIZE=500

# More concurrent operations
WHATSAPP_SYNC_CONCURRENT_CHATS=10
```

### Redis

Memory limits:

```bash
# Redis maxmemory (in Docker Compose)
maxmemory 1gb
maxmemory-policy allkeys-lru
```

## Monitoring Configuration

### Health Check Intervals

Adjust Docker healthcheck intervals:

```yaml
healthcheck:
  interval: 30s      # How often to check
  timeout: 10s       # Max time for check
  retries: 3         # Failures before unhealthy
  start_period: 60s  # Grace period on startup
```

### Logging

Control log verbosity:

```bash
# Application logs
WHATSAPP_LOG_LEVEL=debug  # For troubleshooting
WHATSAPP_LOG_LEVEL=info   # For production

# Database logs
log_statement = 'all'     # Log all queries (debug)
log_min_duration_statement = 1000  # Log slow queries (>1s)
```

## Storage Configuration

### Data Retention

Control how long data is kept:

```sql
-- Adjust retention policy (default: 365 days)
SELECT remove_retention_policy('whatsapp_gateway.messages');
SELECT add_retention_policy('whatsapp_gateway.messages', INTERVAL '180 days');
```

### Disk Space

Monitor disk usage:

```bash
# Check database size
docker exec whatsapp-timescale psql -U whatsapp -d whatsapp_gateway \
  -c "SELECT pg_size_pretty(pg_database_size('whatsapp_gateway'));"

# Check MinIO usage
curl -u "$WHATSAPP_MINIO_ROOT_USER:$WHATSAPP_MINIO_ROOT_PASSWORD" \
  http://localhost:9302/minio/admin/v3/info
```

## Development vs Production

### Development

```bash
# Enable debugging
WHATSAPP_LOG_LEVEL=debug
WHATSAPP_PRINT_QR=true

# Faster sync
WHATSAPP_SYNC_INTERVAL_MS=60000

# Smaller batches for testing
WHATSAPP_SYNC_BATCH_SIZE=10
```

### Production

```bash
# Optimize for stability
WHATSAPP_LOG_LEVEL=info
WHATSAPP_PRINT_QR=false

# Standard sync
WHATSAPP_SYNC_INTERVAL_MS=300000

# Larger batches
WHATSAPP_SYNC_BATCH_SIZE=100

# Bind to localhost
WHATSAPP_MINIO_HOST_BIND=127.0.0.1
WHATSAPP_POSTGRES_HOST_BIND=127.0.0.1
```

## Troubleshooting

### Configuration Issues

Validate your configuration:

```bash
# Check required variables
bash scripts/whatsapp/start-stack.sh

# View current configuration
docker compose -f tools/compose/docker-compose.whatsapp.yml config
```

### Port Conflicts

If ports are already in use:

```bash
# Change ports in .env
WHATSAPP_DB_PORT=5436
WHATSAPP_GATEWAY_API_PORT=4012
# etc.
```

### Connection Issues

Test connectivity:

```bash
# Test database
psql -h localhost -p 5435 -U whatsapp -d whatsapp_gateway

# Test Redis
redis-cli -p 6380 ping

# Test MinIO
curl http://localhost:9302/minio/health/live
```

## See Also

- [README](./README.md) - Main documentation
- [API Reference](./API.md) - API endpoints
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues

