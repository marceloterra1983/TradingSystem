# Production Deployment Checklist

**TradingSystem - Containerized Services Production Deployment**

Complete this checklist before deploying to production. Mark each item as completed (`[x]`) when done.

## 📋 Overview

**Services to Deploy**:
- TP Capital API (Container - Port 4005)
- Workspace API (Container - Port 3200)
- Telegram Gateway (systemd service - Port 4006)
- TimescaleDB (Container - Port 5432 internal only)

**Deployment Duration**: ~30-45 minutes

---

## Phase 1: Pre-Deployment Preparation

### 1.1 System Requirements

- [ ] **Server meets minimum requirements**
  - OS: Ubuntu 20.04+ / Debian 11+ / RHEL 8+
  - RAM: 4GB minimum (8GB recommended)
  - Disk: 20GB free space minimum
  - CPU: 2 cores minimum (4 cores recommended)

- [ ] **Docker installed and running**
  ```bash
  docker --version  # Should be 20.x or higher
  docker compose version  # Should be v2.x
  docker ps  # Should run without errors
  ```

- [ ] **Node.js installed** (for Telegram Gateway)
  ```bash
  node --version  # Should be v18+ (v20 recommended)
  npm --version   # Should be v9+
  ```

- [ ] **Required ports available**
  ```bash
  # Check ports are not in use
  lsof -ti :4005  # Should be empty (TP Capital API)
  lsof -ti :3200  # Should be empty (Workspace API)
  lsof -ti :4006  # Should be empty (Telegram Gateway)
  lsof -ti :5433  # Should be empty (TimescaleDB external port - optional)
  ```

### 1.2 Code & Configuration

- [ ] **Latest code deployed to server**
  ```bash
  cd /path/to/TradingSystem
  git pull origin main
  git status  # Should show "working tree clean"
  git log -1  # Verify latest commit
  ```

- [ ] **Production environment file configured**
  ```bash
  # Copy and configure production .env
  cp .env.example .env.production
  vim .env.production  # Configure all variables

  # Verify required variables
  grep TIMESCALEDB_PASSWORD .env.production
  grep GATEWAY_SECRET_TOKEN .env.production
  grep CORS_ORIGIN .env.production
  ```
  **See**: `PRODUCTION-ENV-GUIDE.md` for detailed configuration

- [ ] **Secrets generated and stored securely**
  ```bash
  # Generate and document in password manager:
  # - TIMESCALEDB_PASSWORD (32+ chars)
  # - GATEWAY_SECRET_TOKEN (40+ chars)
  # - TELEGRAM_BOT_TOKEN (if using Telegram)
  ```

- [ ] **Production .env file permissions set**
  ```bash
  chmod 600 .env.production
  ls -la .env.production  # Should show -rw-------
  ```

### 1.3 Docker Images

- [ ] **Build production images**
  ```bash
  # Build TP Capital API
  docker build -f apps/tp-capital/api/Dockerfile \
    -t tp-capital-api:production \
    apps/tp-capital/api/

  # Build Workspace API
  docker build -f backend/api/workspace/Dockerfile \
    -t workspace-service:production \
    backend/api/workspace/

  # Verify images
  docker images | grep -E "tp-capital-api|workspace-service"
  ```

- [ ] **Images scanned for vulnerabilities** (optional but recommended)
  ```bash
  docker scan tp-capital-api:production
  docker scan workspace-service:production
  ```

---

## Phase 2: Infrastructure Deployment

### 2.1 Docker Networks

- [ ] **Create backend network**
  ```bash
  docker network create tradingsystem_backend 2>/dev/null || echo "Network exists"
  docker network inspect tradingsystem_backend
  ```

### 2.2 TimescaleDB Deployment

- [ ] **Deploy TimescaleDB container**
  ```bash
  docker compose -f tools/compose/docker-compose.database.yml \
    --env-file .env.production \
    up -d timescaledb
  ```

- [ ] **Wait for TimescaleDB to be healthy** (60 seconds)
  ```bash
  sleep 60
  docker ps | grep timescaledb
  # Should show: Up X seconds (healthy)
  ```

- [ ] **Connect TimescaleDB to backend network**
  ```bash
  docker network connect --alias timescaledb \
    tradingsystem_backend \
    data-timescaledb

  # Verify connection
  docker network inspect tradingsystem_backend | grep timescaledb
  ```

- [ ] **Verify database password**
  ```bash
  # Get password from .env.production
  PASS=$(grep TIMESCALEDB_PASSWORD .env.production | cut -d'"' -f2)

  # Update database password
  docker exec data-timescaledb psql -U timescale -d postgres \
    -c "ALTER USER timescale WITH PASSWORD '$PASS';"
  ```

- [ ] **Test database connection**
  ```bash
  PGPASSWORD="$PASS" psql \
    -h localhost -p 5433 \
    -U timescale \
    -d APPS-TPCAPITAL \
    -c "SELECT version();"

  # Should show PostgreSQL + TimescaleDB version
  ```

- [ ] **Initialize database schemas** (if first deployment)
  ```bash
  # TP Capital schema
  docker exec data-timescaledb psql -U timescale -d APPS-TPCAPITAL \
    -c "CREATE SCHEMA IF NOT EXISTS tp_capital;"

  # Workspace schema
  docker exec data-timescaledb psql -U timescale -d APPS-TPCAPITAL \
    -c "CREATE SCHEMA IF NOT EXISTS workspace;"

  # Run migration scripts
  docker exec data-timescaledb psql -U timescale -d APPS-TPCAPITAL \
    -f /path/to/init-timescale-schema.sql
  ```

---

## Phase 3: Application Deployment

### 3.1 Deploy Application Containers

- [ ] **Start application containers**
  ```bash
  docker compose -f tools/compose/docker-compose.apps.prod.yml \
    --env-file .env.production \
    up -d
  ```

- [ ] **Verify containers are running**
  ```bash
  docker ps --filter "name=tp-capital-api|workspace-service"

  # Should show both containers:
  # - tp-capital-api (Up X seconds)
  # - workspace-service (Up X seconds)
  ```

- [ ] **Wait for health checks** (60 seconds)
  ```bash
  sleep 60
  docker ps --filter "name=tp-capital-api|workspace-service"

  # Should show: Up X seconds (healthy)
  ```

- [ ] **Check container logs for errors**
  ```bash
  docker logs tp-capital-api --tail 50
  docker logs workspace-service --tail 50

  # Should NOT show errors
  ```

### 3.2 Test API Endpoints

- [ ] **Test TP Capital API health**
  ```bash
  curl http://localhost:4005/health

  # Expected output:
  # {"status":"healthy","service":"tp-capital-api",...}
  ```

- [ ] **Test Workspace API health**
  ```bash
  curl http://localhost:3200/health

  # Expected output:
  # {"status":"healthy","service":"workspace-api",...}
  ```

- [ ] **Test database connectivity**
  ```bash
  curl http://localhost:4005/health | jq '.database.connected'
  # Should return: true

  curl http://localhost:3200/health | jq '.database'
  # Should show connection info
  ```

- [ ] **Test CORS configuration**
  ```bash
  # Get production domain from .env.production
  DOMAIN=$(grep CORS_ORIGIN .env.production | cut -d'=' -f2)

  # Test allowed origin
  curl -H "Origin: $DOMAIN" \
    -v http://localhost:4005/health 2>&1 | \
    grep "Access-Control-Allow-Origin"

  # Should return: Access-Control-Allow-Origin: $DOMAIN

  # Test blocked origin (should fail)
  curl -H "Origin: https://evil.com" \
    -v http://localhost:4005/health 2>&1 | \
    grep "Access-Control-Allow-Origin"

  # Should return: (nothing - blocked)
  ```

### 3.3 Deploy Telegram Gateway (Optional)

**Only if using Telegram integration**

- [ ] **Install npm dependencies**
  ```bash
  cd apps/telegram-gateway
  npm install --production
  cd ../..
  ```

- [ ] **Configure Telegram credentials in .env.production**
  ```bash
  # Add to .env.production:
  # TELEGRAM_API_ID=your_api_id
  # TELEGRAM_API_HASH=your_api_hash
  # TELEGRAM_BOT_TOKEN=your_bot_token
  ```

- [ ] **Install systemd service**
  ```bash
  sudo bash tools/systemd/install-telegram-gateway.sh

  # Follow prompts, answer 'y' to start service
  ```

- [ ] **Verify systemd service is running**
  ```bash
  sudo systemctl status telegram-gateway

  # Should show: active (running)
  ```

- [ ] **Check Gateway logs**
  ```bash
  sudo journalctl -u telegram-gateway -n 50 --no-pager

  # Should show: "Telegram Gateway started on port 4006"
  ```

- [ ] **Test Gateway health**
  ```bash
  curl http://localhost:4006/health

  # Expected output: {"status":"ok",...}
  ```

---

## Phase 4: Post-Deployment Validation

### 4.1 Functional Tests

- [ ] **Test TP Capital webhook endpoint**
  ```bash
  # Get secret token from .env.production
  TOKEN=$(grep GATEWAY_SECRET_TOKEN .env.production | cut -d'"' -f2)

  # Send test signal
  curl -X POST http://localhost:4005/webhook/telegram \
    -H "Content-Type: application/json" \
    -H "X-Secret-Token: $TOKEN" \
    -d '{
      "symbol": "WINZ25",
      "action": "BUY",
      "price": 123456,
      "timestamp": "2025-10-25T10:00:00Z"
    }'

  # Should return: {"success": true}
  ```

- [ ] **Verify signal was stored in database**
  ```bash
  PGPASSWORD="$PASS" psql \
    -h localhost -p 5433 \
    -U timescale \
    -d APPS-TPCAPITAL \
    -c "SELECT COUNT(*) FROM tp_capital.tp_capital_signals;"

  # Should return: count >= 1
  ```

- [ ] **Test Workspace CRUD operations**
  ```bash
  # Create item
  curl -X POST http://localhost:3200/api/items \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Item","type":"documentation","status":"backlog"}'

  # List items
  curl http://localhost:3200/api/items

  # Should return: {"success":true,"data":[...]}
  ```

### 4.2 Performance Tests

- [ ] **Check container resource usage**
  ```bash
  docker stats --no-stream tp-capital-api workspace-service

  # Verify:
  # - CPU < 50%
  # - Memory < 512MB
  ```

- [ ] **Test API response times**
  ```bash
  # TP Capital health endpoint
  time curl http://localhost:4005/health
  # Should complete in < 100ms

  # Workspace health endpoint
  time curl http://localhost:3200/health
  # Should complete in < 100ms
  ```

- [ ] **Load test** (optional - requires wrk or ab)
  ```bash
  # Install wrk if not available
  # sudo apt install wrk

  # Test TP Capital API (1000 requests, 10 concurrent)
  wrk -t10 -c10 -d10s http://localhost:4005/health

  # Verify no errors in output
  ```

### 4.3 Monitoring & Logging

- [ ] **Configure log rotation**
  ```bash
  # Already configured in docker-compose.apps.prod.yml:
  # - max-size: 50MB
  # - max-file: 5

  # Verify logging configuration
  docker inspect tp-capital-api --format='{{.HostConfig.LogConfig}}'
  ```

- [ ] **Set up log monitoring** (optional)
  ```bash
  # Option 1: Follow all logs
  docker compose -f tools/compose/docker-compose.apps.prod.yml logs -f

  # Option 2: Export to external logging (Loki, ELK, etc.)
  # Configure in docker-compose.apps.prod.yml logging section
  ```

- [ ] **Enable Prometheus metrics** (optional)
  ```bash
  # TP Capital API metrics
  curl http://localhost:4005/metrics

  # Workspace API metrics
  curl http://localhost:3200/metrics

  # Configure Prometheus scraping if needed
  ```

---

## Phase 5: Security Validation

### 5.1 Security Checks

- [ ] **Verify containers running as non-root**
  ```bash
  docker exec tp-capital-api id
  # Should show: uid=1001(nodejs) gid=1001(nodejs)

  docker exec workspace-service id
  # Should show: uid=1001(nodejs) gid=1001(nodejs)
  ```

- [ ] **Verify no sensitive data in logs**
  ```bash
  docker logs tp-capital-api 2>&1 | grep -iE "password|secret|token"
  docker logs workspace-service 2>&1 | grep -iE "password|secret|token"

  # Should return: (nothing - no secrets in logs)
  ```

- [ ] **Verify .env.production not accessible**
  ```bash
  ls -la .env.production
  # Should show: -rw------- (600)

  # Verify not in Git
  git status .env.production
  # Should show: not tracked
  ```

- [ ] **Verify database not exposed to internet**
  ```bash
  # TimescaleDB should only be accessible via Docker network
  # Port 5432 should NOT be exposed to 0.0.0.0

  docker port data-timescaledb
  # Should show: 5432/tcp -> 127.0.0.1:5433 (localhost only)
  # OR: (nothing - not exposed)
  ```

- [ ] **Scan for exposed secrets** (optional)
  ```bash
  # Using gitleaks or similar
  docker run --rm -v $(pwd):/path zricethezav/gitleaks:latest \
    detect --source=/path --no-git

  # Should return: no leaks found
  ```

---

## Phase 6: Backup & Recovery

### 6.1 Database Backup

- [ ] **Create initial database backup**
  ```bash
  # Backup TimescaleDB
  docker exec data-timescaledb pg_dump \
    -U timescale \
    -d APPS-TPCAPITAL \
    --format=custom \
    --file=/tmp/backup-$(date +%Y%m%d-%H%M%S).dump

  # Copy backup to host
  docker cp data-timescaledb:/tmp/backup-*.dump ./backups/
  ```

- [ ] **Schedule automatic backups**
  ```bash
  # Create cron job for daily backups
  (crontab -l 2>/dev/null; echo "0 2 * * * /path/to/backup-script.sh") | crontab -

  # Verify cron job
  crontab -l | grep backup
  ```

- [ ] **Test backup restoration** (in test environment)
  ```bash
  # Restore backup (TEST ONLY - do not run in production!)
  # docker exec data-timescaledb pg_restore \
  #   -U timescale \
  #   -d APPS-TPCAPITAL_TEST \
  #   /tmp/backup-*.dump
  ```

### 6.2 Disaster Recovery Plan

- [ ] **Document recovery procedures**
  - Location of backups
  - Restoration steps
  - Contact information
  - Rollback procedures

- [ ] **Test rollback procedure** (in test environment)
  ```bash
  # Simulate rollback:
  # 1. Stop containers
  # 2. Restore previous database backup
  # 3. Deploy previous Docker images
  # 4. Restart services
  ```

---

## Phase 7: Documentation & Handoff

### 7.1 Documentation

- [ ] **Update runbook with production details**
  - Server IP/hostname
  - Service ports
  - Database credentials location
  - Log locations
  - Monitoring dashboards

- [ ] **Document production environment**
  ```bash
  # Create production inventory
  cat > PRODUCTION-INVENTORY.md <<EOF
  # Production Environment Inventory

  ## Services
  - TP Capital API: http://SERVER_IP:4005
  - Workspace API: http://SERVER_IP:3200
  - Telegram Gateway: http://SERVER_IP:4006
  - TimescaleDB: localhost:5432 (internal only)

  ## Docker Containers
  - tp-capital-api (tp-capital-api:production)
  - workspace-service (workspace-service:production)
  - data-timescaledb (timescale/timescaledb:latest-pg16)

  ## Configuration
  - Environment: .env.production (secured in /secure/path)
  - Docker Compose: tools/compose/docker-compose.apps.prod.yml
  - Systemd: /etc/systemd/system/telegram-gateway.service

  ## Backups
  - Location: /backups/tradingsystem/
  - Schedule: Daily at 02:00 UTC
  - Retention: 30 days
  EOF
  ```

- [ ] **Create operational procedures**
  - Restart procedures
  - Log access
  - Monitoring access
  - Escalation contacts

### 7.2 Team Handoff

- [ ] **Train operations team**
  - Service startup/shutdown
  - Log monitoring
  - Common issues and solutions
  - Escalation procedures

- [ ] **Share credentials securely**
  - Database passwords (password manager)
  - Secret tokens (secrets vault)
  - SSH access (key-based only)

- [ ] **Schedule on-call rotation**
  - Primary on-call engineer
  - Secondary backup
  - Escalation contact

---

## Phase 8: Go Live

### 8.1 Final Checks

- [ ] **All previous phases completed**
  - ✅ Phase 1: Pre-Deployment
  - ✅ Phase 2: Infrastructure
  - ✅ Phase 3: Application
  - ✅ Phase 4: Validation
  - ✅ Phase 5: Security
  - ✅ Phase 6: Backup
  - ✅ Phase 7: Documentation

- [ ] **Stakeholders notified**
  - Development team
  - Operations team
  - Management
  - End users (if applicable)

- [ ] **Rollback plan ready**
  - Previous version tagged in Git
  - Previous Docker images available
  - Database backup created
  - Rollback script tested

### 8.2 Production Cutover

- [ ] **Switch DNS/Load Balancer** (if applicable)
  ```bash
  # Update DNS to point to new servers
  # OR
  # Update load balancer configuration
  ```

- [ ] **Monitor for first hour**
  ```bash
  # Watch logs
  docker compose -f tools/compose/docker-compose.apps.prod.yml logs -f

  # Watch metrics
  watch -n 5 'docker stats --no-stream'

  # Monitor health endpoints
  watch -n 10 'curl -s http://localhost:4005/health | jq .'
  ```

- [ ] **Verify production traffic**
  - Check logs for incoming requests
  - Verify data being written to database
  - Confirm no errors in application logs

### 8.3 Post-Launch

- [ ] **Send launch announcement**
  - Services deployed successfully
  - URLs and endpoints
  - Known issues (if any)
  - Support contact

- [ ] **Schedule post-launch review** (24-48 hours)
  - Review metrics
  - Identify issues
  - Plan improvements

---

## Rollback Procedure

**If deployment fails, execute rollback:**

1. **Stop production containers**
   ```bash
   docker compose -f tools/compose/docker-compose.apps.prod.yml down
   ```

2. **Restore database backup** (if schema changed)
   ```bash
   docker exec data-timescaledb pg_restore \
     -U timescale \
     -d APPS-TPCAPITAL \
     --clean \
     /backups/latest.dump
   ```

3. **Deploy previous version**
   ```bash
   # Checkout previous version
   git checkout <previous_tag>

   # Rebuild images (or use previous tagged images)
   docker compose -f tools/compose/docker-compose.apps.prod.yml build

   # Start with previous .env
   docker compose -f tools/compose/docker-compose.apps.prod.yml \
     --env-file .env.production.backup \
     up -d
   ```

4. **Verify rollback successful**
   ```bash
   curl http://localhost:4005/health
   curl http://localhost:3200/health
   ```

5. **Notify stakeholders of rollback**

---

## Completion

**Deployment Status**:

- [ ] ✅ **DEPLOYED SUCCESSFULLY** - All checks passed
- [ ] ⚠️ **DEPLOYED WITH ISSUES** - Document issues below
- [ ] ❌ **ROLLBACK EXECUTED** - Document reason below

**Deployed By**: _______________
**Date/Time**: _______________
**Version**: _______________

**Notes**:
```
[Add any deployment notes, issues encountered, or lessons learned]
```

---

**Last Updated**: 2025-10-25
**Migration Phase**: Phase 9 - Production Deployment
**Related Docs**:
- `PRODUCTION-ENV-GUIDE.md`
- `TROUBLESHOOTING.md`
- `DOCKER-QUICK-START.md`
