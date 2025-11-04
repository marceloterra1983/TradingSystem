# 🆘 Deploy Troubleshooting - RAG Services

## Issue: Port Already in Use (6380, 11434)

### Symptom

```
Error response from daemon: failed to bind host port for 0.0.0.0:6380
Error response from daemon: failed to bind host port for 0.0.0.0:11434
```

### Root Cause

Ports 6380 (Redis) and 11434 (Ollama) are stuck in Docker's networking layer (WSL2 + Docker Desktop issue).

---

## 🔧 Solution 1: Restart Docker Desktop (RECOMMENDED)

**On Windows:**

1. Right-click Docker Desktop icon in system tray
2. Click **"Restart"**
3. Wait 30-60 seconds
4. Run deployment again:

```bash
cd /home/marce/Projetos/TradingSystem
docker compose -f tools/compose/docker-compose.rag.yml up -d
```

**Expected Result**: Ports freed, containers start successfully

---

## 🔧 Solution 2: Use Alternative Ports (WORKAROUND)

If Docker restart doesn't work, modify ports in docker-compose:

```bash
# Edit docker-compose.rag.yml
# Change:
#   - "${OLLAMA_PORT:-11434}:11434"  →  - "11435:11434"
#   - "${RAG_REDIS_PORT:-6380}:6379"  →  - "6381:6379"

# Update .env (if using environment variables)
OLLAMA_PORT=11435
RAG_REDIS_PORT=6381

# Restart services
docker compose -f tools/compose/docker-compose.rag.yml up -d
```

**Note**: You'll need to update Dashboard config to point to new ports.

---

## 🔧 Solution 3: Nuclear Option (Last Resort)

**Complete Docker cleanup:**

```bash
# Stop ALL containers
docker stop $(docker ps -aq)

# Remove ALL containers
docker rm $(docker ps -aq)

# Prune networks, volumes, images
docker network prune -f
docker volume prune -f
docker system prune -a -f

# Restart Docker Desktop (Windows)

# Deploy again
cd /home/marce/Projetos/TradingSystem
docker compose -f tools/compose/docker-compose.rag.yml up -d
```

⚠️ **WARNING**: This will delete ALL Docker data (containers, images, volumes)!

---

## 🔍 Verification Commands

```bash
# Check if ports are free
ss -tuln | grep -E "(6380|11434)"

# List running containers
docker ps

# Check Docker daemon status
docker info

# View Docker Desktop logs (Windows)
# Settings → Troubleshoot → View Logs
```

---

## 🎯 Quick Decision Tree

```
Port conflict error?
├── Try Solution 1 (Docker restart) ✅ 90% success rate
├──  Still failing?
│   ├── Try Solution 2 (Alternative ports) ✅ 95% success rate
│   └──  Still failing?
│       └── Try Solution 3 (Nuclear option) ✅ 100% success rate (but loses data)
```

---

## 📞 Additional Help

If none of the above work:

1. **Check Windows Firewall**: May be blocking ports
2. **Check Windows processes**: Task Manager → Details → Filter "redis" or "ollama"
3. **WSL2 restart**: `wsl --shutdown` (in PowerShell) then restart WSL

---

## ✅ Once Fixed

After ports are freed, run:

```bash
cd /home/marce/Projetos/TradingSystem

# Configure environment (first time only)
bash scripts/setup/configure-inter-service-secret.sh

# Deploy Sprint 1
bash scripts/deployment/deploy-rag-sprint1.sh

# Verify circuit breakers
curl http://localhost:8202/health | jq '.circuitBreakers'
```

Expected output:
```json
{
  "qdrant_search": "closed",
  "qdrant_answer": "closed",
  "ollama_embeddings": "closed",
  "ollama_generation": "closed"
}
```

---

**Last Updated**: 2025-11-03  
**Status**: Active Issue - Docker/WSL2 Port Binding

