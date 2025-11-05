# 🔧 Solution: Stop Snap Services (Ollama Auto-Restart)

## Root Cause Identified ✅

**Ollama is running as a SNAP SERVICE** (`snap.ollama.listener`) that **automatically restarts** when killed.

```
Service: snap.ollama.listener.service
Status: enabled, active
Port: 11434
```

This is why killing the process doesn't work - systemd/snap manager immediately restarts it.

---

## 🚀 Solution: Stop & Disable Snap Services

### Option 1: Stop Snap Service (RECOMMENDED)

Run these commands:

```bash
# Stop Ollama snap
sudo snap stop ollama

# Disable Ollama snap (prevent auto-start)
sudo snap disable ollama

# Verify port is free
ss -tuln | grep 11434 || echo "Port 11434 is FREE!"
```

**Effect**: Ollama snap will NOT restart automatically.

---

### Option 2: Use Automated Script

```bash
sudo bash scripts/deployment/stop-snap-services.sh
```

**What it does:**
- Stops `snap.ollama.listener.service`
- Disables auto-start
- Verifies port 11434 is free

---

### Option 3: Identify All Port Users (Diagnostic)

If you still have port conflicts:

```bash
sudo bash scripts/deployment/identify-port-users.sh
```

**What it shows:**
- Processes using ports 11434, 6380, 8202
- Running systemd services
- Running snap services

---

## 🎯 Complete Deployment Sequence

### Step 1: Stop Snap Services
```bash
sudo snap stop ollama
sudo snap disable ollama
```

### Step 2: Kill Remaining Processes (if any)
```bash
sudo bash scripts/deployment/sudo-kill-processes.sh
```

### Step 3: Verify Ports Are Free
```bash
ss -tuln | grep -E "(11434|6380|8202)" || echo "All ports FREE!"
```

### Step 4: Start Docker Containers
```bash
cd /home/marce/Projetos/TradingSystem
docker compose -f tools/compose/docker-compose.rag.yml up -d
```

### Step 5: Wait for Healthy Status
```bash
sleep 30
docker ps --format "table {{.Names}}\t{{.Status}}" | grep rag
```

### Step 6: Verify Circuit Breakers
```bash
curl -s http://localhost:8202/health | jq '.circuitBreakers'
```

**Expected:**
```json
{
  "qdrant_search": "closed",
  "qdrant_answer": "closed",
  "ollama_embeddings": "closed",
  "ollama_generation": "closed"
}
```

✅ **SUCCESS! Sprint 1 deployed!**

---

## ⚠️ If Port 6380 or 8202 Still Occupied

### For Port 6380 (Redis):

```bash
# Find process
sudo lsof -i :6380

# Kill specific PID
sudo kill -9 <PID>

# Or kill all redis
sudo pkill -9 redis-server
```

### For Port 8202 (LlamaIndex):

```bash
# Find process
sudo lsof -i :8202

# Kill specific PID
sudo kill -9 <PID>

# Or kill all uvicorn/python
sudo pkill -9 uvicorn
```

---

## 🔄 To Re-Enable Ollama Snap Later

If you want to use native Ollama again:

```bash
# Re-enable snap
sudo snap enable ollama

# Start service
sudo snap start ollama

# Or via systemd
sudo systemctl start snap.ollama.listener.service
```

---

## 📊 Port Status Check

Quick check if ports are free:

```bash
# All RAG ports
ss -tuln | grep -E "(11434|6380|8202)"

# If empty output = all ports free ✅
# If shows lines = ports still in use ❌
```

---

## 🆘 Last Resort: Use Alternative Ports

If you **cannot** free the ports, modify Docker Compose:

**Edit `tools/compose/docker-compose.rag.yml`:**

```yaml
# Change Ollama port
ports:
  - "11435:11434"  # Changed from 11434:11434

# Change Redis port
ports:
  - "6381:6379"  # Changed from 6380:6379
```

**Then update services to use new ports:**
- Ollama: `http://localhost:11435`
- Redis: `localhost:6381`

---

**Next Steps After Fixing:**

1. Execute Step 1 above (`sudo snap stop ollama`)
2. Execute Steps 2-6 for complete deployment
3. Run manual tests: `bash scripts/testing/test-circuit-breaker.sh`

---

**Last Updated**: 2025-11-03  
**Status**: Snap service auto-restart identified

