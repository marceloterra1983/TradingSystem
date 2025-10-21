---
title: Container Startup Issues - Troubleshooting Guide
sidebar_position: 10
tags: [ops, docker, containers, troubleshooting, deployment]
domain: ops
type: runbook
summary: Common Docker container startup issues and their solutions, documented from production incidents
status: active
last_review: 2025-10-17
---

# Container Startup Issues - Troubleshooting Guide

This document catalogs common Docker container startup issues encountered in the TradingSystem project and their proven solutions.

## 🎯 Quick Reference

| Service | Common Issue | Quick Fix |
|---------|-------------|-----------|
| Docusaurus | YAML frontmatter parsing error | Quote special characters in frontmatter values |
| tp-capital-ingestion | Dependency not running | Start QuestDB first, then ingestion service |
| b3-market-data | Wrong image/network | Rebuild from frontend/apps, attach to the active QuestDB network |
| Firecrawl | Containers stopped | Restart with `docker start` command |

## 📚 Detailed Solutions

### Issue 1: Docusaurus Container Restart Loop

**Incident Date:** 2025-10-12

**Symptoms:**
```bash
docker ps -a | grep docs
# STATUS: Restarting (1) XX seconds ago
```

**Error Message:**
```
Error: Can't process doc metadata for doc at path=.../TEMPLATE-feature-spec.md
YAMLException: end of the stream or a document separator is expected at line 2, column 20
```

**Root Cause:**
YAML frontmatter in markdown files contained special characters (brackets, colons, pipes) without proper quoting, causing the YAML parser to fail.

**Solution:**

1. **Identify the problematic file:**
```bash
docker logs docs-docusaurus --tail 50
# Look for "Error while parsing Markdown front matter"
```

2. **Fix YAML frontmatter - Quote all values with special characters:**

❌ **WRONG:**
```yaml
---
title: [Page Name] - [Brief Description]
status: placeholder | active | deprecated
last_review: YYYY-MM-DD
---
```

✅ **CORRECT:**
```yaml
---
title: "[Page Name] - [Brief Description]"
status: "placeholder | active | deprecated"
last_review: "YYYY-MM-DD"
---
```

3. **Restart the container:**
```bash
docker-compose -f compose.dev.yml restart docs
```

**Prevention:**
- Always quote YAML values containing: `[]`, `{}`, `:`, `|`, `>`, `@`, `` ` ``, `#`, `&`, `*`, `!`
- Use templates that already have proper quoting
- Test Docusaurus build locally before committing template changes

**Files Fixed:**
- `docs/context/frontend/features/TEMPLATE-feature-spec.md`

---

### Issue 2: tp-capital-ingestion Not Starting

**Incident Date:** 2025-10-12

**Symptoms:**
```bash
docker ps -a | grep tp-capital-ingestion
# STATUS: Exited (255) XX minutes ago
```

**Error Message:**
```json
{
  "code": "ERR_BAD_REQUEST",
  "status": 404,
  "message": "Cannot connect to http://questdb:9000/ping"
}
```

**Root Cause:**
The service depends on QuestDB, but QuestDB was not running. Both services use the `tp-capital` profile but QuestDB is also used by B3 services.

**Solution:**

1. **Check QuestDB status:**
```bash
docker ps -a --filter name=questdb
```

2. **Start QuestDB first:**
```bash
docker-compose -f compose.dev.yml up -d questdb
```

3. **Wait for QuestDB to initialize (5 seconds):**
```bash
sleep 5
```

4. **Start tp-capital-ingestion:**
```bash
docker-compose -f compose.dev.yml up -d tp-capital-ingestion
```

5. **Verify both are running:**
```bash
docker ps | grep -E "(questdb|tp-capital)"
curl http://localhost:4005/
curl http://localhost:9000/exec?query=SELECT+1
```

**Prevention:**
- Always start dependencies before dependent services
- Use `depends_on` in compose files (already configured)
- Consider adding health checks with `wait-for-it.sh` scripts

**Service Dependencies:**
```
QuestDB (port 9000)
  ├── tp-capital-ingestion (port 4005)
  └── b3-market-data (port 4010)
```

---

### Issue 3: b3-market-data Wrong Image/Network

**Incident Date:** 2025-10-12

**Symptoms:**
```bash
docker logs apps-b3-market-data
# npm error signal SIGTERM
# Container exits immediately after starting
```

**Root Cause:**
The container was built from the wrong location (`infrastructure/b3/services/b3-market-data-api`) which has complex dependencies on:
- `b3-system` service (Python API that wasn't running)
- Separate `b3_network` (isolated from QuestDB)

The simpler version in `frontend/apps/b3-market-data` only needs QuestDB.

**Solution:**

1. **Remove the broken container:**
```bash
docker rm apps-b3-market-data
```

2. **Build from the correct location:**
```bash
cd frontend/apps/b3-market-data
docker build -t b3-market-data-simple:latest .
```

3. **Identify the active QuestDB network:**
```bash
docker network ls
# Locate the network used by the current stack (e.g., tradingsystem_default)
```

4. **Run with proper configuration:**
```bash
docker run -d \
  --name apps-b3-market-data \
  --network <current network> \
  -p 4010:4010 \
  -e PORT=4010 \
  -e QUESTDB_HTTP_URL=http://questdb:9000 \
  -e CORS_ORIGIN=http://localhost:5173 \
  -e LOG_LEVEL=info \
  -e NODE_ENV=production \
  --restart unless-stopped \
  b3-market-data-simple:latest
```
> ℹ️ Replace `<current network>` with the network name discovered in step 3.

5. **Verify it's working:**
```bash
curl http://localhost:4010/
curl http://localhost:4010/overview
```

**Prevention:**
- Document which version of the service to use (simple vs. complex)
- Use clear naming for different service variants
- Consider removing the complex infrastructure version if not needed

**Service Comparison:**

| Location | Dependencies | Use Case |
|----------|-------------|----------|
| `frontend/apps/b3-market-data` | QuestDB only | ✅ Simple API for dashboard |
| `infrastructure/b3/services/b3-market-data-api` | QuestDB + b3-system + traefik | Production B3 ecosystem |

---

### Issue 4: Firecrawl Containers Stopped

**Incident Date:** 2025-10-12

**Symptoms:**
```bash
docker ps -a | grep firecrawl
# All show: Exited (255) XX minutes ago
```

**Root Cause:**
Containers were previously created and running but stopped (possibly due to system restart or Docker daemon restart). No configuration issues.

**Solution:**

1. **Start all Firecrawl containers:**
```bash
docker start firecrawl-redis \
  firecrawl-postgres \
  firecrawl-playwright \
  firecrawl-api
```
> ℹ️ If Docker Compose appended suffixes (e.g., `firecrawl-api-1`), run `docker ps -a | grep firecrawl` to confirm the exact container names before starting.

2. **Wait for services to initialize:**
```bash
sleep 5
```

3. **Verify all are running:**
```bash
docker ps --filter name=firecrawl
```

4. **Test the API:**
```bash
curl http://localhost:3002/v0/health/readiness
# Expect 200 OK with readiness payload

# Test scraping:
curl -X POST "http://localhost:3002/v1/scrape" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-test" \
  -d '{"url":"https://example.com"}'
```

**Alternative (if docker start fails):**
```bash
cd /home/marce/projetos/TradingSystem
docker compose -f infrastructure/firecrawl/firecrawl-source/docker-compose.yaml --env-file .env up -d
```

**Prevention:**
- Set `restart: unless-stopped` in compose files (already configured)
- Monitor container health with Prometheus/Grafana
- Set up alerts for container down events

**Firecrawl Architecture:**
```
firecrawl-api (port 3002)
  ├── firecrawl-redis (queue & cache)
  ├── firecrawl-postgres (database)
  └── firecrawl-playwright (browser automation)
```

---

## 🔍 General Debugging Steps

### 1. Check Container Status
```bash
docker ps -a --filter name=<service>
```

### 2. View Recent Logs
```bash
docker logs <container-name> --tail 50
```

### 3. Check Container Logs in Real-time
```bash
docker logs -f <container-name>
```

### 4. Inspect Container Configuration
```bash
docker inspect <container-name>
```

### 5. Check Network Connectivity
```bash
# From inside container:
docker exec <container> ping <dependency-service>
docker exec <container> wget -qO- http://<dependency>:<port>/health
```

### 6. Verify Environment Variables
```bash
docker exec <container> env | grep <VAR_NAME>
```

### 7. Check Docker Compose Service Status
```bash
docker-compose -f compose.dev.yml ps
```

---

## 📝 Service Health Check Commands

### QuestDB
```bash
curl http://localhost:9000/exec?query=SELECT+1
# Expected: {"query":"SELECT 1","columns":[...],"dataset":[[1]]}
```

### tp-capital-ingestion
```bash
curl http://localhost:4005/health
# Expected: {"status":"ok","questdb":true}

curl http://localhost:4005/signals?limit=5
# Expected: {"data":[...signal objects...]}
```

### b3-market-data
```bash
curl http://localhost:4010/
# Expected: {"status":"ok","endpoints":[...],"message":"B3 API"}

curl http://localhost:4010/overview
# Expected: {"data":{"snapshots":[...],"indicators":[...]}}
```

### Firecrawl
```bash
curl http://localhost:3002/v0/health/readiness
# Expected: {"status":"ok","service":"firecrawl-api",...}

curl -X POST "http://localhost:3002/v1/scrape" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-test" \
  -d '{"url":"https://example.com"}'
# Expected: {"success":true,"data":{...}}
```

### Docusaurus
```bash
curl -I http://localhost:3004/
# Expected: HTTP/1.1 200 OK
```

---

## 🚨 When to Escalate

Contact the infrastructure team if:

1. **Persistent failures** after following troubleshooting steps
2. **Data corruption** suspected in volumes or databases
3. **Network issues** affecting multiple services
4. **Resource exhaustion** (CPU, memory, disk)
5. **Security concerns** (unusual logs, unauthorized access)

---

## 📚 Related Documentation

- Resumo dos serviços Docker: consulte `infrastructure/DOCKER-SERVICES-SUMMARY.md` no repositório.
- [Monitoramento (Prometheus/Grafana)](../monitoring/prometheus-setup.md)
- [Service Ports Reference](../../frontend/features/feature-ports-page.md)
- [Incident Response Playbook](../incidents/incidents.md)

---

**Last Updated:** 2025-10-12
**Maintainer:** DevOps Team
**Review Frequency:** Monthly or after major incidents
