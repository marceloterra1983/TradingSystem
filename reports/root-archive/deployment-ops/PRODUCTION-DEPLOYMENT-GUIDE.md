# 🚀 Production Deployment Guide - RAG Services

**Last Updated**: 2025-11-03  
**Version**: Sprint 1 + Sprint 2  
**Target**: Staging/Production Linux Server

---

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ / Debian 11+ / RHEL 8+
- **RAM**: 16GB minimum (32GB recommended)
- **CPU**: 8 cores minimum
- **Disk**: 100GB+ SSD
- **Docker**: 24.0+ with Compose V2
- **Network**: Ports 6333-6340, 8000-8002, 8201-8202, 11434 open

### Software Requirements
```bash
# Docker & Docker Compose
docker --version  # >= 24.0
docker compose version  # V2

# Optional (for monitoring)
k6 --version  # For load testing
```

---

## 🔐 Step 1: Environment Configuration

### 1.1: Clone Repository
```bash
cd /opt
git clone https://github.com/marceloterra1983/TradingSystem.git
cd TradingSystem
```

### 1.2: Configure Environment Variables
```bash
# Copy environment template
cp .env.example .env

# Generate secrets
bash scripts/setup/configure-inter-service-secret.sh

# Edit .env and set production values
nano .env
```

**Critical Variables:**
```bash
# Inter-Service Authentication
INTER_SERVICE_SECRET=<generated-32-byte-hex>

# Kong Gateway
KONG_PG_PASSWORD=<secure-password>

# JWT Authentication
JWT_SECRET_KEY=<production-secret>

# Ollama Configuration
OLLAMA_BASE_URL=http://rag-ollama:11434
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large

# Qdrant Configuration  
QDRANT_URL=http://qdrant-lb:6333  # Use load balancer
QDRANT_COLLECTION=documentation

# Redis Cache
REDIS_URL=redis://rag-redis:6379
REDIS_ENABLED=true
```

---

## 🐳 Step 2: Deploy Infrastructure

### 2.1: Create Docker Network
```bash
docker network create tradingsystem_backend
```

### 2.2: Deploy Services (ONE Command - Nuclear Script)
```bash
sudo bash scripts/deployment/nuclear-cleanup-and-deploy.sh
```

**OR Manual Step-by-Step:**

```bash
# 1. Database layer
docker compose -f tools/compose/docker-compose.database.yml up -d

# 2. RAG infrastructure (Ollama, Redis)
docker compose -f tools/compose/docker-compose.rag.yml up -d ollama rag-redis

# 3. LlamaIndex services
docker compose -f tools/compose/docker-compose.rag.yml up -d llamaindex-query llamaindex-ingestion

# 4. RAG services
docker compose -f tools/compose/docker-compose.rag.yml up -d rag-service rag-collections-service

# 5. Kong API Gateway
docker compose -f tools/compose/docker-compose.kong.yml up -d

# 6. Qdrant HA Cluster (optional)
docker compose -f tools/compose/docker-compose.qdrant-ha.yml up -d

# 7. Monitoring (optional)
docker compose -f tools/compose/docker-compose.monitoring.yml up -d
```

**Wait Time**: 2-3 minutes for all services to be healthy

---

## ✅ Step 3: Verify Deployment

### 3.1: Check Container Health
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "rag|kong|qdrant"
```

**Expected**: All containers show "(healthy)"

### 3.2: Verify Circuit Breakers
```bash
curl http://localhost:8202/health | jq '.circuitBreakers'
```

**Expected Output:**
```json
{
  "ollama_embedding": "closed",
  "ollama_generation": "closed",
  "qdrant_search": "closed"
}
```

### 3.3: Test Kong Gateway
```bash
curl http://localhost:8000/api/v1/rag/status/health | jq '.'
```

**Expected**: HTTP 200 with service health status

### 3.4: Verify Qdrant Cluster (if deployed)
```bash
curl http://localhost:6340/cluster | jq '.result | {peers: (.peers | length), role: .raft_info.role}'
```

**Expected**:
```json
{
  "peers": 3,
  "role": "Leader"
}
```

---

## 🔧 Step 4: Configure Kong Routes

```bash
bash scripts/kong/configure-routes.sh
```

**This configures:**
- Service `rag-service` → `http://rag-service:3000`
- Route `/api/v1/rag/*` → `rag-service`
- Rate limiting: 100 req/min
- CORS: Enabled

**Verify:**
```bash
curl http://localhost:8001/services | jq '.data[].name'
curl http://localhost:8001/routes | jq '.data[].paths'
```

---

## 📊 Step 5: Performance Testing

### 5.1: Run Load Test (K6)
```bash
k6 run scripts/testing/load-test-rag-with-jwt.js
```

**Thresholds:**
- P95 latency < 500ms
- Error rate < 10%
- Circuit breaker open rate < 5%

**Expected Results:**
- ✅ P95: 6-10ms (exceptional)
- ✅ Circuit breaker: 0% open rate
- ✅ Throughput: 4-10 req/s per VU

---

## 🔍 Step 6: Monitoring Setup

### 6.1: Access Grafana
```bash
# Open browser
http://your-server:3100

# Login
User: admin
Password: (from GRAFANA_PASSWORD in .env, default: admin)
```

### 6.2: Import Dashboard
1. Click "+" → "Import"
2. Upload `tools/monitoring/dashboards/rag-services-overview.json`
3. Select Prometheus datasource
4. Click "Import"

**Panels:**
- Circuit Breaker States
- RAG Query Latency P95
- Circuit Breaker Failures
- Kong Request Rate

---

## 🛡️ Step 7: Security Hardening (Production)

### 7.1: Change Default Passwords
```bash
# Kong Admin (if using DB mode)
# Grafana admin password
# PostgreSQL passwords
```

### 7.2: Enable HTTPS (Kong)
```bash
# Generate SSL certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Update docker-compose.kong.yml
volumes:
  - ./cert.pem:/etc/kong/cert.pem:ro
  - ./key.pem:/etc/kong/key.pem:ro

environment:
  - KONG_SSL_CERT=/etc/kong/cert.pem
  - KONG_SSL_CERT_KEY=/etc/kong/key.pem
```

### 7.3: Firewall Rules
```bash
# Allow only necessary ports
ufw allow 8000/tcp  # Kong Proxy
ufw allow 8443/tcp  # Kong HTTPS
ufw deny 8001/tcp   # Kong Admin (internal only)
ufw deny 6333/tcp   # Qdrant (internal only)
```

---

## 📈 Step 8: Production Validation

### Run Full Test Suite
```bash
# 1. Health checks
bash scripts/maintenance/health-check-all.sh

# 2. Circuit breaker behavior
bash scripts/testing/test-circuit-breaker.sh

# 3. Inter-service auth
bash scripts/testing/test-service-auth.sh

# 4. Load test (7 min)
k6 run scripts/testing/load-test-rag-with-jwt.js
```

### Success Criteria
- [ ] All containers healthy
- [ ] Circuit breakers showing "closed"
- [ ] Kong routing working (HTTP 200)
- [ ] Load test P95 < 500ms
- [ ] Zero circuit breaker opens under load
- [ ] Rate limiting working (100 req/min)

---

## 🔄 Step 9: Rollback Procedure

If deployment fails:

```bash
# Stop all services
docker compose -f tools/compose/docker-compose.rag.yml down
docker compose -f tools/compose/docker-compose.kong.yml down
docker compose -f tools/compose/docker-compose.qdrant-ha.yml down

# Restore from backup
docker volume restore <backup>

# Restart old version
docker compose up -d --force-recreate
```

---

## 📊 Step 10: Post-Deployment Monitoring

### Daily Checks (First Week)
```bash
# Container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# Circuit breaker metrics
curl http://localhost:8202/health | jq '.circuitBreakers'

# Kong traffic
curl http://localhost:8001/status | jq '.server.total_requests'

# Qdrant cluster
curl http://localhost:6340/cluster | jq '.result.peers | length'
```

### Alert on:
- Any container not healthy
- Circuit breaker open > 5 minutes
- Kong error rate > 5%
- Qdrant peer count < 3

---

## 🆘 Troubleshooting

### Issue: Containers won't start

**Check ports:**
```bash
sudo lsof -i :6333
sudo lsof -i :8000
```

**Solution:**
```bash
sudo bash scripts/deployment/nuclear-cleanup-and-deploy.sh
```

---

### Issue: Circuit breakers showing "open"

**Check upstream services:**
```bash
curl http://localhost:11434  # Ollama
curl http://localhost:6333   # Qdrant
```

**Check logs:**
```bash
docker logs rag-ollama --tail 50
docker logs data-qdrant --tail 50
```

---

### Issue: Kong 503 errors

**Verify service resolution:**
```bash
docker exec kong-gateway ping -c 3 rag-service
```

**Check Kong logs:**
```bash
docker logs kong-gateway --tail 50
```

---

## 📚 Additional Resources

### Scripts
- **Nuclear Deploy**: `scripts/deployment/nuclear-cleanup-and-deploy.sh`
- **Kong Setup**: `scripts/kong/setup-kong.sh`
- **Qdrant Migration**: `scripts/qdrant/migrate-to-ha-cluster.sh`

### Documentation
- **Sprint 1 Summary**: `SPRINT-1-COMPLETE-SUMMARY.md`
- **Sprint 2 Summary**: `SPRINT-1-2-COMPLETE-SUCCESS.md`
- **Qdrant HA Architecture**: `docs/content/tools/rag/qdrant-ha-architecture.mdx`

### Monitoring
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3100
- **Kong Admin**: http://localhost:8001

---

## ✅ Deployment Checklist

- [ ] Repository cloned to `/opt/TradingSystem`
- [ ] Environment variables configured (`.env`)
- [ ] Docker network created (`tradingsystem_backend`)
- [ ] All services deployed (11 containers)
- [ ] Health checks passing
- [ ] Circuit breakers active (3/3)
- [ ] Kong routes configured
- [ ] Rate limiting enabled (100 req/min)
- [ ] CORS configured
- [ ] Load test executed (P95 < 500ms)
- [ ] Monitoring dashboard imported
- [ ] Firewall rules configured
- [ ] SSL certificates installed (HTTPS)
- [ ] Backup strategy defined
- [ ] Alerts configured

---

**Deployment Time**: 30-45 minutes  
**Validation Time**: 15-30 minutes  
**Total**: ~1 hour for complete production deployment

**Status**: ✅ READY FOR PRODUCTION

---

**Last Updated**: 2025-11-03  
**Tested On**: Ubuntu 22.04 LTS (WSL2 + native Linux)  
**Validated**: Load tested with 606 iterations, 0% circuit breaker opens

