---
title: Production Environment Guide
description: Guia de configuração de ambiente para produção
tags:
  - reference
  - deployment
  - environment
owner: DocsOps
lastReviewed: '2025-10-27'
---

# Production Environment Configuration Guide

**TradingSystem - Production Deployment Environment Setup**

This guide covers environment configuration for production deployment of containerized services (TP Capital API + Workspace API + Telegram Gateway).

## 📋 Table of Contents

1. [Overview](#overview)
2. [Required Environment Variables](#required-environment-variables)
3. [Production vs Development](#production-vs-development)
4. [Security Best Practices](#security-best-practices)
5. [Configuration Steps](#configuration-steps)
6. [Validation](#validation)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**Production services** require specific environment configuration for:

- ✅ **Security** - Strong passwords, secret tokens, restricted CORS
- ✅ **Performance** - Optimized connection pools, resource limits
- ✅ **Reliability** - Proper logging, health checks, restart policies
- ✅ **Monitoring** - Prometheus metrics, structured logging

**Containerized services in production**:

1. **TP Capital API** (Port 4005) - Trading signals ingestion
2. **Workspace API** (Port 3200) - Ideas & documentation management
3. **Telegram Gateway** (Port 4006) - Shared Telegram service (systemd)

---

## Required Environment Variables

### 1. TimescaleDB Configuration

**CRITICAL:** Database password MUST be changed from development defaults.

```bash
# TimescaleDB Connection (REQUIRED)
TIMESCALEDB_HOST=timescaledb           # Container name or IP
TIMESCALEDB_PORT=5432                  # Default PostgreSQL port
TIMESCALEDB_DATABASE=APPS-TPCAPITAL    # Database name
TIMESCALEDB_USER=timescale             # Database user
TIMESCALEDB_PASSWORD="CHANGE_ME_STRONG_PASSWORD_32_CHARS"  # ⚠️ CHANGE THIS!
```

**Generate strong password**:

```bash
# Option 1: Using openssl
openssl rand -base64 32

# Option 2: Using /dev/urandom
tr -dc 'A-Za-z0-9!@#$%^&*()_+' < /dev/urandom | head -c 32

# Example result: "7Km9Pq3XnWv5YtR8Lz2Df6Hb0NsA4Jc1"
```

### 2. Gateway Authentication

**CRITICAL:** Secret token for Gateway → API authentication.

```bash
# Gateway Secret Token (REQUIRED)
GATEWAY_SECRET_TOKEN="CHANGE_ME_STRONG_SECRET_TOKEN"  # ⚠️ CHANGE THIS!
```

**Generate secret token**:

```bash
# Format: gw_secret_{random_40_chars}
echo "gw_secret_$(openssl rand -base64 30 | tr -d /=+ | head -c 40)"

# Example result: "gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA"
```

### 3. CORS Configuration

**CRITICAL:** Restrict CORS to production domain only.

```bash
# CORS Origins (PRODUCTION - Restrict!)
CORS_ORIGIN=https://yourdomain.com     # ⚠️ Set to your actual domain
SERVICE_LAUNCHER_CORS_ORIGIN=https://yourdomain.com
DOCS_API_CORS_ORIGIN=https://yourdomain.com

# ❌ NEVER use wildcard (*) in production!
# ❌ NEVER allow http:// in production (use HTTPS only)
```

### 4. Telegram Gateway (Optional)

**Only required if using Telegram integration:**

```bash
# Telegram Bot Configuration (OPTIONAL)
TELEGRAM_API_ID="your_api_id"          # From https://my.telegram.org/
TELEGRAM_API_HASH="your_api_hash"      # From https://my.telegram.org/
TELEGRAM_BOT_TOKEN="bot_token_here"    # From @BotFather
TELEGRAM_SOURCE_CHANNEL_IDS="-1001234567890"  # Comma-separated channel IDs
API_SECRET_TOKEN="your_secret_token"   # Same as GATEWAY_SECRET_TOKEN
```

### 5. Logging & Monitoring

```bash
# Logging Configuration (PRODUCTION)
LOG_LEVEL=warn                         # Production: warn or error only
NODE_ENV=production                    # REQUIRED for production mode

# Prometheus Metrics (Optional)
METRICS_ENABLED=true
METRICS_PORT=9090
```

### 6. Resource Limits (Docker)

**Set in docker-compose.apps.prod.yml** (already configured):

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'      # Max 1 CPU core
      memory: 512M     # Max 512MB RAM
    reservations:
      cpus: '0.5'      # Reserve 0.5 CPU
      memory: 256M     # Reserve 256MB RAM
```

---

## Production vs Development

| Configuration | Development | Production |
|---------------|-------------|------------|
| **NODE_ENV** | `development` | `production` |
| **LOG_LEVEL** | `debug` or `info` | `warn` or `error` |
| **CORS_ORIGIN** | `http://localhost:*` | `https://yourdomain.com` |
| **Passwords** | Weak (for testing) | Strong (32+ chars) |
| **Hot-reload** | ✅ Enabled (volume mounts) | ❌ Disabled (built-in code) |
| **Docker restart** | `unless-stopped` | `always` |
| **Health checks** | Every 30s | Every 60s |
| **Log size** | 10MB (3 files) | 50MB (5 files) |
| **Resource limits** | None | CPU + Memory limits |
| **Security** | Relaxed | Hardened (no root, restricted access) |

---

## Security Best Practices

### 1. Secrets Management

**✅ DO:**

- Generate unique, strong passwords (32+ characters)
- Use different passwords for each environment
- Rotate secrets every 90 days
- Store production `.env` in secure vault (e.g., HashiCorp Vault, AWS Secrets Manager)
- Use `.env.production` separate from `.env.development`

**❌ DON'T:**

- Commit `.env` to Git (already in `.gitignore`)
- Use default/example passwords in production
- Share passwords via email/Slack
- Reuse passwords across services
- Use weak passwords like "password123"

### 2. Network Security

```bash
# Production CORS - ONLY allow your domain
CORS_ORIGIN=https://yourdomain.com

# ❌ NEVER do this in production:
CORS_ORIGIN=*  # ❌ Allows any domain!
CORS_ORIGIN=http://localhost:*  # ❌ Development only!
```

### 3. Database Security

```bash
# Restrict database access to Docker network only
# Do NOT expose TimescaleDB port (5432) to internet

# In docker-compose.database.yml:
ports:
  # - "5433:5432"  # ✅ Comment out in production (internal only)
```

### 4. Container Security

**Already configured in production Dockerfiles:**

- ✅ Non-root user (`nodejs:1001`)
- ✅ Multi-stage builds (smaller images)
- ✅ Production-only dependencies
- ✅ Security hardening in systemd service

---

## Configuration Steps

### Step 1: Copy Environment Template

```bash
# Navigate to project root
cd /home/marce/Projetos/TradingSystem

# Create production .env from template
cp .env.example .env.production
```

### Step 2: Generate Secrets

```bash
# Generate TimescaleDB password
echo "TIMESCALEDB_PASSWORD=\"$(openssl rand -base64 32)\"" >> .env.production

# Generate Gateway secret token
echo "GATEWAY_SECRET_TOKEN=\"gw_secret_$(openssl rand -base64 30 | tr -d /=+ | head -c 40)\"" >> .env.production
```

### Step 3: Configure Production Values

**Edit `.env.production`:**

```bash
# Open in editor
vim .env.production

# Set production-specific values:
NODE_ENV=production
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com

# Database (use generated password from Step 2)
TIMESCALEDB_HOST=timescaledb
TIMESCALEDB_PORT=5432
TIMESCALEDB_DATABASE=APPS-TPCAPITAL
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD="<generated_password_from_step_2>"

# Gateway (use generated token from Step 2)
GATEWAY_SECRET_TOKEN="<generated_token_from_step_2>"

# Telegram (if using)
TELEGRAM_API_ID="your_api_id"
TELEGRAM_API_HASH="your_api_hash"
TELEGRAM_BOT_TOKEN="your_bot_token"
```

### Step 4: Update TimescaleDB Password

**IMPORTANT:** Update password in running database to match `.env.production`:

```bash
# Connect to TimescaleDB container
docker exec -it data-timescaledb psql -U timescale -d postgres

# Inside psql, update password:
ALTER USER timescale WITH PASSWORD 'your_new_production_password';
\q

# Restart containers to apply new password
docker compose -f tools/compose/docker-compose.apps.yml --env-file .env.production restart
```

### Step 5: Set Correct Permissions

```bash
# Restrict .env.production access (owner read-only)
chmod 600 .env.production

# Verify permissions
ls -la .env.production
# Should show: -rw------- (600)
```

---

## Validation

### 1. Validate Environment File

```bash
# Check all required variables are set
bash scripts/env/validate-env.sh .env.production

# Expected output:
# ✅ All required variables configured
```

### 2. Test Database Connection

```bash
# Use credentials from .env.production
PGPASSWORD="your_production_password" psql \
  -h localhost -p 5433 \
  -U timescale \
  -d APPS-TPCAPITAL \
  -c "SELECT 1"

# Expected output: 1 row returned
```

### 3. Test Container Startup

```bash
# Start containers with production config
docker compose -f tools/compose/docker-compose.apps.prod.yml \
  --env-file .env.production \
  up -d

# Wait 30 seconds for startup
sleep 30

# Check health
curl http://localhost:4005/health
curl http://localhost:3200/health

# Expected output: {"status":"healthy", ...}
```

### 4. Validate Security

```bash
# Check CORS headers (should only allow production domain)
curl -H "Origin: https://yourdomain.com" \
  -v http://localhost:4005/health 2>&1 | grep "Access-Control-Allow-Origin"

# Should return: Access-Control-Allow-Origin: https://yourdomain.com

# Test unauthorized origin (should fail)
curl -H "Origin: https://evil.com" \
  -v http://localhost:4005/health 2>&1 | grep "Access-Control-Allow-Origin"

# Should return: (nothing - CORS blocked)
```

---

## Troubleshooting

### Issue: "password authentication failed for user timescale"

**Cause:** Password mismatch between `.env.production` and database.

**Solution:**

```bash
# Check password in .env.production
grep TIMESCALEDB_PASSWORD .env.production

# Update database password to match
docker exec -it data-timescaledb psql -U timescale -d postgres \
  -c "ALTER USER timescale WITH PASSWORD 'password_from_env';"

# Restart containers
docker compose -f tools/compose/docker-compose.apps.prod.yml restart
```

### Issue: CORS errors in production

**Cause:** CORS_ORIGIN not set to production domain.

**Solution:**

```bash
# Update .env.production
CORS_ORIGIN=https://yourdomain.com

# Restart containers
docker compose -f tools/compose/docker-compose.apps.prod.yml restart
```

### Issue: Container health check failing

**Cause:** Service not ready or database connection failed.

**Solution:**

```bash
# Check container logs
docker logs tp-capital-api --tail 100
docker logs workspace-service --tail 100

# Look for:
# - Database connection errors → Fix TIMESCALEDB_PASSWORD
# - Port binding errors → Check if port is available
# - Module errors → Rebuild image
```

### Issue: Environment variables not loading

**Cause:** Wrong env file path or permissions.

**Solution:**

```bash
# Verify file exists
ls -la .env.production

# Verify permissions (should be 600)
chmod 600 .env.production

# Explicitly specify env file
docker compose -f tools/compose/docker-compose.apps.prod.yml \
  --env-file .env.production \
  up -d
```

---

## Next Steps

After configuring production environment:

1. ✅ **Deploy Containers** - See `PRODUCTION-DEPLOYMENT-CHECKLIST.md`
2. ✅ **Configure Telegram Gateway** - Run systemd installation script
3. ✅ **Set Up Monitoring** - Enable Prometheus/Grafana
4. ✅ **Configure Backups** - Set up TimescaleDB backup schedule
5. ✅ **Security Audit** - Review all credentials and access controls

---

**Last Updated**: 2025-10-25
**Migration Status**: Phase 9 - Production Deployment
**Related Docs**:

- `PRODUCTION-DEPLOYMENT-CHECKLIST.md`
- `DOCKER-QUICK-START.md` (development)
- `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`
