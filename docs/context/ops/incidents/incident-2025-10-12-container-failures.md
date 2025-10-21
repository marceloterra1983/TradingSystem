---
title: "Incident: Multiple Container Startup Failures (2025-10-12)"
sidebar_position: 10
tags: [ops, incident, docker, containers, resolved]
domain: ops
type: reference
summary: Four Docker services failed to start after system restart. All issues resolved with documented solutions
status: active
last_review: 2025-10-17
---

# Incident: Multiple Container Startup Failures

**Incident ID:** INC-2025-10-12-001
**Date:** 2025-10-12
**Status:** ✅ RESOLVED
**Severity:** Medium (Multiple services down, no data loss)
**Duration:** ~45 minutes

## 📋 Summary

Multiple Docker containers in the TradingSystem infrastructure failed to start properly after a system restart. Four services were affected: Docusaurus documentation, TP Capital signal ingestion, B3 market data API, and Firecrawl web scraping service.

## 🔴 Impact

**Affected Services:**
- ✅ **Docusaurus** (port 3004) - Documentation unavailable
- ✅ **tp-capital-ingestion** (port 4005) - Signal ingestion offline
- ✅ **b3-market-data** (port 4010) - Market data API unavailable
- ✅ **Firecrawl** (port 3002) - Web scraping service stopped

**User Impact:**
- Development team unable to access documentation
- Signal ingestion from Telegram temporarily paused
- Dashboard unable to fetch B3 market data
- Web scraping capabilities offline

**Data Loss:** None - all services use persistent volumes

## 🔍 Root Causes

### 1. Docusaurus - Configuration Error
**Cause:** Invalid YAML frontmatter in template file
**File:** `docs/context/frontend/features/TEMPLATE-feature-spec.md`
**Issue:** Special characters (brackets, colons, pipes) not quoted in YAML values

### 2. tp-capital-ingestion - Dependency Missing
**Cause:** QuestDB dependency not running
**Issue:** Service requires QuestDB but it wasn't started first

### 3. b3-market-data - Wrong Build Context
**Cause:** Built from wrong location with wrong dependencies
**Issue:** Used complex infrastructure build instead of simple backend API

### 4. Firecrawl - Normal Stop
**Cause:** Containers stopped after system restart
**Issue:** Simply needed to be restarted (no configuration issue)

## 🛠️ Resolution Steps

### Docusaurus
```bash
# 1. Identified YAML parsing error in logs
docker logs tradingsystem-docs --tail 50

# 2. Fixed YAML frontmatter - added quotes to special characters
# File: docs/context/frontend/features/TEMPLATE-feature-spec.md
# Changed: title: [Page Name] - [Description]
# To:      title: "[Page Name] - [Description]"

# 3. Restarted container
docker-compose -f compose.dev.yml restart docs
```

### tp-capital-ingestion
```bash
# 1. Started QuestDB dependency first
docker-compose -f compose.dev.yml up -d questdb

# 2. Waited for initialization
sleep 5

# 3. Started ingestion service
docker-compose -f compose.dev.yml up -d tp-capital-ingestion

# 4. Verified connectivity
curl http://localhost:4005/signals?limit=5
```

### b3-market-data
```bash
# 1. Removed broken container
docker rm tradingsystem-b3-market-data

# 2. Rebuilt from correct location
cd frontend/apps/b3-market-data
docker build -t b3-market-data-simple:latest .

# 3. Ran with proper network configuration
docker run -d \
  --name tradingsystem-b3-market-data \
  --network tradingsystem_default \
  -p 4010:4010 \
  -e PORT=4010 \
  -e QUESTDB_HTTP_URL=http://questdb:9000 \
  -e CORS_ORIGIN=http://localhost:5173 \
  -e LOG_LEVEL=info \
  -e NODE_ENV=production \
  --restart unless-stopped \
  b3-market-data-simple:latest

# 4. Verified API endpoints
curl http://localhost:4010/overview
```

### Firecrawl
```bash
# 1. Restarted all containers
docker start firecrawl-redis-1 \
  firecrawl-nuq-postgres-1 \
  firecrawl-playwright-service-1 \
  firecrawl-api-1

# 2. Verified services
curl -X POST "http://localhost:3002/v1/scrape" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fc-test" \
  -d '{"url":"https://example.com"}'
```

## ✅ Verification

All services verified working:

| Service | Status | Verification |
|---------|--------|--------------|
| Docusaurus | ✅ Running | HTTP 200 on port 3004 |
| QuestDB | ✅ Running | SQL query successful on port 9000 |
| tp-capital-ingestion | ✅ Running | Signals API returning data on port 4005 |
| b3-market-data | ✅ Running | Overview API returning data on port 4010 |
| Firecrawl | ✅ Running | Scrape test successful on port 3002 |

## 📚 Documentation Created

Created comprehensive troubleshooting documentation:

**New File:** [`docs/context/ops/troubleshooting/container-startup-issues.md`](../troubleshooting/container-startup-issues.md)

**Contents:**
- Quick reference table for all 4 issues
- Detailed step-by-step solutions
- Root cause analysis for each issue
- Prevention strategies
- Health check commands for all services
- General debugging procedures
- When to escalate guidelines

## 🎓 Lessons Learned

### What Went Well
✅ All issues were configuration/deployment related, not data corruption
✅ Systematic debugging approach identified all root causes
✅ Solutions were documented in real-time
✅ No data loss occurred

### What Could Be Improved
⚠️ Better YAML validation in CI/CD for template files
⚠️ Service dependency documentation needs to be more prominent
⚠️ Consider automated health checks after system restarts
⚠️ Document which version of services to use (simple vs complex)

## 🔧 Action Items

### Immediate (Done)
- [x] Fix all container startup issues
- [x] Create troubleshooting documentation
- [x] Document incident for future reference

### Short-term (Next Sprint)
- [ ] Add YAML validation to pre-commit hooks
- [ ] Create automated health check script for all services
- [ ] Document service dependency graph visually
- [ ] Add startup sequence documentation
- [ ] Review and consolidate duplicate service implementations

### Long-term (Next Quarter)
- [ ] Implement automated incident detection and alerting
- [ ] Create service health dashboard with real-time monitoring
- [ ] Document disaster recovery procedures
- [ ] Set up automated backups for all persistent data

## 📊 Metrics

- **Time to Detection:** < 5 minutes (manual check)
- **Time to Resolution:** ~45 minutes total
- **Services Affected:** 4 of 15 running services (27%)
- **Data Loss:** 0 records
- **User Impact:** Development team only

## 🔗 Related Documentation

- [Container Startup Troubleshooting Guide](../troubleshooting/container-startup-issues.md)
- Resumo dos serviços Docker: consulte `infrastructure/DOCKER-SERVICES-SUMMARY.md` no repositório.
- [Service Ports Reference](../../frontend/features/feature-ports-page.md)
- [Monitoramento (Prometheus/Grafana)](../monitoring/prometheus-setup.md)

---

**Incident Commander:** DevOps Team
**Reported By:** System Administrator
**Resolved By:** DevOps Team
**Post-Mortem Completed:** 2025-10-12
