# 🚀 Staging Deployment Checklist

**Environment**: Staging  
**Target**: Linux Server (Ubuntu 22.04+ recommended)  
**Estimated Time**: 1 hour

---

## 📋 PRE-DEPLOYMENT

### Server Preparation
- [ ] Ubuntu 22.04+ / Debian 11+ installed
- [ ] Docker 24.0+ installed (`docker --version`)
- [ ] Docker Compose V2 installed (`docker compose version`)
- [ ] Git installed
- [ ] 16GB+ RAM available
- [ ] 100GB+ disk space
- [ ] Ports 6333-6340, 8000-8002, 8201-8202, 11434 open

### Network Configuration
- [ ] Firewall rules configured
- [ ] DNS resolution working
- [ ] Internal network for Docker (`tradingsystem_backend`)

---

## 🔐 STEP 1: Repository Setup

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/marceloterra1983/TradingSystem.git
cd TradingSystem

# Set permissions
sudo chown -R $USER:$USER /opt/TradingSystem
```

**Checklist:**
- [ ] Repository cloned to `/opt/TradingSystem`
- [ ] Permissions set correctly

---

## 🔧 STEP 2: Environment Configuration

```bash
# Generate secrets
bash scripts/setup/configure-inter-service-secret.sh

# Verify .env
cat .env | grep -E "INTER_SERVICE_SECRET|KONG_PG_PASSWORD"
```

**Checklist:**
- [ ] `INTER_SERVICE_SECRET` generated (32 bytes)
- [ ] `KONG_PG_PASSWORD` set
- [ ] `JWT_SECRET_KEY` configured
- [ ] All required env vars present

---

## 🐳 STEP 3: Deploy Infrastructure

### Option A: Nuclear Script (RECOMMENDED)
```bash
sudo bash scripts/deployment/nuclear-cleanup-and-deploy.sh
```

**Wait**: 3-5 minutes for all services

### Option B: Manual (Step-by-Step)
```bash
# 1. Create network
docker network create tradingsystem_backend

# 2. Deploy in order
bash scripts/deployment/deploy-rag-sprint1.sh

# 3. Deploy Kong
sudo bash scripts/kong/sudo-deploy-kong.sh

# 4. Deploy Qdrant HA (optional)
bash scripts/qdrant/migrate-to-ha-cluster.sh
```

**Checklist:**
- [ ] All containers started
- [ ] No port conflicts
- [ ] Services starting in correct order

---

## ✅ STEP 4: Verification

### 4.1: Container Health
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Expected**: All show "(healthy)"

**Checklist:**
- [ ] kong-gateway (healthy)
- [ ] rag-service (healthy)
- [ ] rag-llamaindex-query (healthy)
- [ ] rag-ollama (healthy)
- [ ] rag-redis (healthy)
- [ ] data-qdrant (healthy) OR qdrant-node1/2/3
- [ ] Total: 11-15 containers healthy

---

### 4.2: Circuit Breakers
```bash
curl http://localhost:8202/health | jq '.circuitBreakers'
```

**Expected**:
```json
{
  "ollama_embedding": "closed",
  "ollama_generation": "closed",
  "qdrant_search": "closed"
}
```

**Checklist:**
- [ ] 3 circuit breakers visible
- [ ] All showing "closed" state
- [ ] Health endpoint responding (HTTP 200)

---

### 4.3: Kong Gateway
```bash
# Test Admin API
curl http://localhost:8001/status | jq '.server'

# Test Proxy Route
curl http://localhost:8000/api/v1/rag/status/health | jq '.'
```

**Checklist:**
- [ ] Kong Admin API responding (HTTP 200)
- [ ] Kong Proxy routing working (HTTP 200)
- [ ] Services registered (check `/services`)
- [ ] Routes configured (check `/routes`)

---

### 4.4: Qdrant Cluster (if deployed)
```bash
curl http://localhost:6333/cluster | jq '.result | {peers: (.peers | length), role: .raft_info.role}'
```

**Expected**:
```json
{
  "peers": 3,
  "role": "Leader"
}
```

**Checklist:**
- [ ] 3 peers connected
- [ ] 1 Leader, 2 Followers
- [ ] Raft consensus working
- [ ] HAProxy load balancer responding (port 6340)

---

## 🧪 STEP 5: Load Testing

```bash
# Run 2-minute quick test
k6 run scripts/testing/load-test-rag-with-jwt.js --duration 2m --vus 10

# Or run full 7-minute test
k6 run scripts/testing/load-test-rag-with-jwt.js
```

**Expected Results:**
- ✅ P95 latency < 500ms
- ✅ Circuit breaker open rate < 5%
- ✅ Error rate < 10%

**Checklist:**
- [ ] K6 test executed
- [ ] Thresholds passed (3/4 minimum)
- [ ] No service crashes
- [ ] Circuit breakers remained closed

---

## 📊 STEP 6: Monitoring Setup

### 6.1: Access Grafana
```
http://staging-server:3100
Username: admin
Password: (from GRAFANA_PASSWORD in .env)
```

### 6.2: Import Dashboard
1. Go to **"+"** → **"Import"**
2. Upload `tools/monitoring/dashboards/rag-services-overview.json`
3. Select **"Prometheus"** datasource
4. Click **"Import"**

**Checklist:**
- [ ] Grafana accessible
- [ ] Prometheus datasource connected
- [ ] Dashboard imported successfully
- [ ] All 4 panels showing data

---

## 🔒 STEP 7: Security Hardening

### Change Default Passwords
```bash
# Grafana admin password
# Kong Admin (if using auth)
# PostgreSQL passwords
```

### Configure Firewall
```bash
# Allow public
sudo ufw allow 8000/tcp  # Kong Proxy
sudo ufw allow 8443/tcp  # Kong HTTPS (if enabled)

# Deny external access
sudo ufw deny 8001/tcp   # Kong Admin
sudo ufw deny 6333/tcp   # Qdrant
sudo ufw deny 9090/tcp   # Prometheus
sudo ufw deny 3100/tcp   # Grafana (or allow with auth)
```

**Checklist:**
- [ ] Default passwords changed
- [ ] Firewall rules applied
- [ ] Only necessary ports exposed
- [ ] Admin interfaces protected

---

## 🔄 STEP 8: Setup Automated Backups

```bash
sudo bash scripts/qdrant/setup-automated-backups.sh
```

**This configures:**
- Daily backups at 2 AM
- 30-day retention
- Automatic cleanup

**Checklist:**
- [ ] Cron job created (`/etc/cron.d/qdrant-backup`)
- [ ] Test backup executed successfully
- [ ] Log file created (`/var/log/qdrant-backup.log`)
- [ ] Backup directory exists

---

## 📈 STEP 9: Post-Deployment Monitoring

### First 24 Hours
```bash
# Check every hour
watch -n 3600 'docker ps --format "table {{.Names}}\t{{.Status}}"'

# Monitor circuit breakers
watch -n 60 'curl -s http://localhost:8202/health | jq .circuitBreakers'

# View logs
docker compose -f tools/compose/docker-compose.rag.yml logs -f --tail=50
```

**Checklist:**
- [ ] All containers remain healthy
- [ ] No circuit breaker opens
- [ ] No error spikes in logs
- [ ] Memory/CPU usage normal

---

## 🆘 STEP 10: Rollback Plan

If deployment fails:

```bash
# Stop all services
cd /opt/TradingSystem
docker compose -f tools/compose/docker-compose.rag.yml down
docker compose -f tools/compose/docker-compose.kong.yml down

# Restore from backup (if needed)
tar xzf /path/to/backup/qdrant_node1_volume.tar.gz -C /var/lib/docker/volumes/qdrant_data/_data

# Restart
bash scripts/deployment/nuclear-cleanup-and-deploy.sh
```

**Checklist:**
- [ ] Rollback procedure tested (dry-run)
- [ ] Backups validated
- [ ] Team knows rollback steps

---

## ✅ DEPLOYMENT SUCCESS CRITERIA

### All Must Pass
- [ ] 11-15 containers healthy
- [ ] Circuit breakers active (3/3 closed)
- [ ] Kong routing working (HTTP 200)
- [ ] Load test P95 < 500ms
- [ ] Zero circuit breaker opens under load
- [ ] Prometheus scraping metrics
- [ ] Grafana dashboard showing data
- [ ] Automated backups configured
- [ ] Security hardened
- [ ] Monitoring in place

### Performance Targets
- [ ] Query latency P95 < 500ms (baseline: 6-10ms)
- [ ] Circuit breaker open rate < 5% (baseline: 0%)
- [ ] Kong gateway latency < 10ms overhead
- [ ] Qdrant cluster sync < 1s

---

## 📞 SUPPORT CONTACTS

**Documentation**:
- **Production Guide**: `PRODUCTION-DEPLOYMENT-GUIDE.md`
- **Victory Report**: `ULTIMATE-VICTORY-REPORT.md`
- **Troubleshooting**: `DEPLOY-TROUBLESHOOTING.md`

**Scripts**:
- **Nuclear Deploy**: `scripts/deployment/nuclear-cleanup-and-deploy.sh`
- **Kong Setup**: `scripts/kong/sudo-deploy-kong.sh`
- **Backup**: `scripts/qdrant/backup-cluster.sh`

---

## 🎯 POST-DEPLOYMENT TASKS

### Week 1
- [ ] Daily health checks
- [ ] Monitor Grafana dashboards
- [ ] Review logs for errors
- [ ] Validate backups

### Week 2
- [ ] Performance tuning (if needed)
- [ ] Scale testing (increase VUs)
- [ ] Security audit
- [ ] Documentation review

### Month 1
- [ ] Capacity planning
- [ ] Cost optimization
- [ ] Disaster recovery drill
- [ ] Team training

---

## 🏆 STAGING DEPLOYMENT COMPLETE!

When all checkboxes are ✅:

**Status**: ✅ STAGING VALIDATED  
**Next**: Production deployment (use same scripts!)  
**Confidence**: HIGH (load tested, monitored, backed up)

---

**Last Updated**: 2025-11-03  
**Deployment Time**: ~1 hour  
**Validation Time**: ~30 minutes  
**Total**: 90 minutes to production-ready staging

