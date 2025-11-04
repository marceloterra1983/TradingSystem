# 🚨 Manual Deploy Steps - Port Conflict Resolution

## Current Issue

**Protected processes** (running as root) are blocking ports needed by Docker containers:

- **Port 11434**: Ollama (PIDs 523, 317149) 
- **Port 8000/8202**: LlamaIndex/uvicorn (PIDs 3152, 3787, 280386)
- **Port 6380**: Potentially Redis

---

## 🔧 SOLUTION: Manual Process Kill + Docker Start

### Step 1: Kill Protected Processes (REQUIRES SUDO)

```bash
sudo bash scripts/deployment/sudo-kill-processes.sh
```

**What it does:**
- Kills PIDs: 523, 317149, 3152, 3787, 280386, 221
- Verifies ports 11434, 6380, 8202 are free
- Safe to run (only kills Ollama/LlamaIndex processes)

**Expected Output:**
```
✅ Port 11434 is free
✅ Port 6380 is free
✅ Port 8202 is free
```

---

### Step 2: Configure INTER_SERVICE_SECRET (First Time Only)

```bash
bash scripts/setup/configure-inter-service-secret.sh
```

**What it does:**
- Generates secure 32-byte random secret
- Adds `INTER_SERVICE_SECRET` to `.env`
- Required for inter-service authentication

**Expected Output:**
```
✅ INTER_SERVICE_SECRET added to .env
Secret (first 16 chars): 1ffd0dbb82f72748***
```

---

### Step 3: Start Docker Containers

```bash
cd /home/marce/Projetos/TradingSystem
docker compose -f tools/compose/docker-compose.rag.yml up -d
```

**What it does:**
- Starts 6 containers with Sprint 1 features:
  - `rag-ollama` (CPU mode)
  - `rag-redis` (cache)
  - `rag-llamaindex-query` (**with circuit breakers!**)
  - `rag-llamaindex-ingest`
  - `rag-service` (documentation API)
  - `rag-collections-service`

**Expected Output:**
```
✅ Container rag-ollama Started
✅ Container rag-redis Started
✅ Container rag-llamaindex-query Started
...
```

---

### Step 4: Wait for Services to Be Healthy

```bash
# Wait 30-60 seconds
sleep 30

# Check containers
docker ps --format "table {{.Names}}\t{{.Status}}" | grep rag
```

**Expected Status:**
```
rag-llamaindex-query     Up X seconds (healthy)
rag-service              Up X seconds (healthy)
rag-collections-service  Up X seconds (healthy)
rag-ollama               Up X seconds (healthy)
rag-redis                Up X seconds (healthy)
```

---

### Step 5: Verify Circuit Breakers Are Active

```bash
curl -s http://localhost:8202/health | jq '.circuitBreakers'
```

**Expected Output (SUCCESS!):**
```json
{
  "qdrant_search": "closed",
  "qdrant_answer": "closed",
  "ollama_embeddings": "closed",
  "ollama_generation": "closed"
}
```

✅ **If you see this, Sprint 1 is deployed successfully!**

---

### Step 6: Run Manual Tests

```bash
# Test 1: Circuit Breaker Behavior (2-3 minutes)
bash scripts/testing/test-circuit-breaker.sh

# Test 2: Inter-Service Auth (1 minute)
bash scripts/testing/test-service-auth.sh
```

---

## 🆘 Troubleshooting

### Issue: Ports still in use after Step 1

**Check what's using the port:**
```bash
sudo lsof -i :11434
sudo lsof -i :6380
sudo lsof -i :8202
```

**Force kill specific PID:**
```bash
sudo kill -9 <PID>
```

**Nuclear option (kills ALL Python/Ollama):**
```bash
sudo pkill -9 ollama
sudo pkill -9 python3
sudo pkill -9 uvicorn
```

---

### Issue: Containers start but unhealthy

**Check logs:**
```bash
docker logs rag-llamaindex-query --tail 50
docker logs rag-service --tail 50
docker logs rag-ollama --tail 50
```

**Common causes:**
- Qdrant not running → `docker ps | grep qdrant`
- Ollama taking too long to start (wait 60s)
- INTER_SERVICE_SECRET not set → Check `.env`

**Restart specific service:**
```bash
docker compose -f tools/compose/docker-compose.rag.yml restart rag-llamaindex-query
```

---

### Issue: `circuitBreakers: null` in health response

**Cause**: Container running old image (without Sprint 1).

**Solution**: Force rebuild and recreate:
```bash
docker compose -f tools/compose/docker-compose.rag.yml build llamaindex-query --no-cache
docker compose -f tools/compose/docker-compose.rag.yml up -d --force-recreate llamaindex-query
sleep 15
curl http://localhost:8202/health | jq '.circuitBreakers'
```

---

## 📊 Success Checklist

- [ ] Ports 11434, 6380, 8202 are free (Step 1)
- [ ] `INTER_SERVICE_SECRET` configured in `.env` (Step 2)
- [ ] 6 containers running (Step 3)
- [ ] All containers show `(healthy)` status (Step 4)
- [ ] Health endpoint shows 4 circuit breakers (Step 5)
- [ ] Manual tests pass (Step 6)

**When all checked:** ✅ Sprint 1 Deployment Complete!

---

## 🚀 What's Next After Deployment

1. **Monitor for 48 hours** - Check health/logs daily
2. **Review Sprint 1 Summary** - See `SPRINT-1-COMPLETE-SUMMARY.md`
3. **Approve Sprint 2** - See `SPRINT-2-PROPOSAL.md` for Qdrant HA + Kong Gateway
4. **Deploy to production** - Use same scripts on production environment

---

**Last Updated**: 2025-11-03  
**Status**: Manual intervention required (protected processes)

