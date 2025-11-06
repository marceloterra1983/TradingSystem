# 🎯 Next Steps - Deploy & Test Sprint 1

## ✅ What We've Completed

1. ✅ **Circuit Breaker Pattern** - Implemented in Python & Node.js
2. ✅ **Inter-Service Authentication** - `X-Service-Token` validation
3. ✅ **API Versioning** - `/api/v1` endpoints ready
4. ✅ **Unit Tests** - 51 tests created (Vitest + Pytest)
5. ✅ **Deployment Scripts** - Automated deploy + testing
6. ✅ **Documentation** - Complete deployment guide

---

## 🚀 STEP 1: Configure Environment (NOW)

**You need to execute:**

```bash
bash scripts/setup/configure-inter-service-secret.sh
```

This will add `INTER_SERVICE_SECRET` to your `.env` file (required for inter-service auth).

**⏱️ Time**: 30 seconds

---

## 🚀 STEP 2: Deploy Sprint 1 (AFTER STEP 1)

**Option A: Full Deployment (Recommended)**

```bash
bash scripts/deployment/deploy-rag-sprint1.sh
```

**What it does:**
- ✅ Verifies `INTER_SERVICE_SECRET` exists
- ✅ Rebuilds 3 Docker images (llamaindex-query, rag-service, rag-collections-service)
- ✅ Stops existing containers
- ✅ Starts new containers with Sprint 1 features
- ✅ Runs health checks

**⏱️ Time**: 5-8 minutes

**Option B: Quick Rebuild (If you've already deployed before)**

```bash
bash scripts/deployment/quick-rebuild-rag.sh
docker compose -f tools/compose/docker-compose.rag.yml up -d --force-recreate llamaindex-query rag-service rag-collections-service
```

**⏱️ Time**: 3-5 minutes

---

## 🧪 STEP 3: Manual Testing (AFTER STEP 2)

### Test 1: Circuit Breaker Behavior

```bash
bash scripts/testing/test-circuit-breaker.sh
```

**What it tests:**
- ✅ Circuit breakers visible in health endpoint
- ✅ Circuit opens after 5 failures (Ollama down)
- ✅ Circuit recovers after timeout (30s)
- ✅ Fast-fail when circuit open (< 1ms)

**⏱️ Time**: 2-3 minutes

### Test 2: Inter-Service Authentication

```bash
bash scripts/testing/test-service-auth.sh
```

**What it tests:**
- ✅ Requests without token rejected (403)
- ✅ Requests with invalid token rejected (403)
- ✅ Requests with valid token succeed (200)
- ✅ Audit logs capture unauthorized attempts

**⏱️ Time**: 1 minute

---

## 🔍 STEP 4: Verification (CONTINUOUS)

### Quick Health Check

```bash
# Verify circuit breakers are active
curl -s http://localhost:8202/health | jq '.circuitBreakers'

# Expected output:
# {
#   "qdrant_search": "closed",
#   "qdrant_answer": "closed",
#   "ollama_embeddings": "closed",
#   "ollama_generation": "closed"
# }
```

### Monitor Logs

```bash
# Real-time logs (Ctrl+C to stop)
docker compose -f tools/compose/docker-compose.rag.yml logs -f llamaindex-query rag-service
```

### Check Container Status

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep rag
```

**Expected output:**
```
rag-llamaindex-query    Up X minutes (healthy)
rag-service             Up X minutes (healthy)
rag-collections-service Up X minutes (healthy)
rag-ollama              Up X minutes (healthy)
rag-redis               Up X minutes (healthy)
```

---

## 🎉 STEP 5: Sprint 2 Planning (AFTER VALIDATION)

Once Sprint 1 is stable (48 hours monitoring), proceed with:

### Sprint 2 Focus Areas:

1. **Qdrant HA** - 3-node cluster with replication (High Availability)
2. **Kong API Gateway** - Centralized auth, rate limiting, CORS
3. **Observability** - Prometheus metrics + Grafana dashboards
4. **Load Testing** - K6 stress tests (50 concurrent users)

**See**: `SPRINT-2-PROPOSAL.md` for detailed plan

---

## 📊 Success Criteria

### Sprint 1 Complete When:
- ✅ All 4 circuit breakers show `"closed"` state in health endpoint
- ✅ Inter-service auth rejects invalid tokens (403)
- ✅ Manual tests pass without errors
- ✅ No critical logs/errors in container logs
- ✅ Services remain healthy for 48 hours

### Ready for Sprint 2 When:
- ✅ Sprint 1 running stable for 48+ hours
- ✅ Zero critical bugs reported
- ✅ Performance metrics baseline established
- ✅ Team approval for HA/Gateway deployment

---

## 🆘 Troubleshooting

### Issue: `circuitBreakers: null` in health check

**Cause**: Container running old image (without Sprint 1 code)

**Fix**:
```bash
docker compose -f tools/compose/docker-compose.rag.yml build llamaindex-query --no-cache
docker compose -f tools/compose/docker-compose.rag.yml up -d --force-recreate llamaindex-query
curl http://localhost:8202/health | jq '.circuitBreakers'
```

### Issue: `INTER_SERVICE_SECRET not found`

**Cause**: Variable not in `.env`

**Fix**:
```bash
bash scripts/setup/configure-inter-service-secret.sh
docker compose -f tools/compose/docker-compose.rag.yml restart
```

### Issue: Container stuck in "unhealthy" state

**Check logs**:
```bash
docker logs rag-service --tail 50
```

**Force restart**:
```bash
docker compose -f tools/compose/docker-compose.rag.yml restart rag-service
```

---

## 📚 Documentation

- **[DEPLOY-NOW.md](DEPLOY-NOW.md)** - Quick deploy guide
- **[DEPLOY-GUIDE-RAG-SERVICES-ENHANCEMENTS.md](DEPLOY-GUIDE-RAG-SERVICES-ENHANCEMENTS.md)** - Comprehensive deployment guide
- **[SPRINT-1-COMPLETE-SUMMARY.md](SPRINT-1-COMPLETE-SUMMARY.md)** - Sprint 1 retrospective
- **[SPRINT-2-PROPOSAL.md](SPRINT-2-PROPOSAL.md)** - Sprint 2 proposal (pending approval)

---

## 🎯 Current Status

**Sprint 1**: ✅ Code Complete → 🚧 **Awaiting Deployment** → ⏳ Testing Phase

**Your Action Required**:
```bash
# 1. Configure secret (30 seconds)
bash scripts/setup/configure-inter-service-secret.sh

# 2. Deploy (5-8 minutes)
bash scripts/deployment/deploy-rag-sprint1.sh

# 3. Test (3-4 minutes)
bash scripts/testing/test-circuit-breaker.sh
bash scripts/testing/test-service-auth.sh
```

**After deployment**: Monitor for 48 hours → Approve Sprint 2 → Deploy HA infrastructure 🚀

---

**Last Updated**: 2025-11-03  
**Status**: Ready for Deployment

