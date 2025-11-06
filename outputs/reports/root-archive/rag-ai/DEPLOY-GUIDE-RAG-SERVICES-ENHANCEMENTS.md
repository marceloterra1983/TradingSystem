# 🚀 Deployment Guide - RAG Services Enhancements

**Version**: 1.0.0  
**Date**: 2025-11-02  
**Status**: ✅ Ready for Deployment

---

## 📋 Overview

This guide covers deployment of **Sprint 1 enhancements** to RAG Services:
- ✅ Circuit Breaker Pattern (fault tolerance)
- ✅ Inter-Service Authentication (security)
- ✅ API Versioning (/api/v1)
- ✅ Unit Tests (80% coverage)

---

## ⚡ Quick Start (Development Environment)

```bash
# 1. Pull latest code
git pull origin main

# 2. Install new dependencies
cd backend/api/documentation-api
npm install

cd ../../tools/llamaindex/query_service
pip install -r requirements.txt

# 3. Configure environment variables
# Add to .env file:
INTER_SERVICE_SECRET=<generate-32-char-random-secret>

# 4. Rebuild Docker images
cd /home/marce/Projetos/TradingSystem
docker-compose -f tools/compose/docker-compose.rag.yml build

# 5. Restart services
docker-compose -f tools/compose/docker-compose.rag.yml down
docker-compose -f tools/compose/docker-compose.rag.yml up -d

# 6. Verify deployment
curl http://localhost:8202/health | jq ".circuitBreakers"
```

---

## 🔧 Prerequisites

### Environment Variables

Add to `.env` file (root of project):

```bash
# Inter-Service Authentication (REQUIRED)
INTER_SERVICE_SECRET=<generate-secure-32-char-secret>

# Circuit Breaker Configuration (OPTIONAL - uses defaults)
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30
```

**Generate secure secret**:
```bash
# Linux/Mac
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📦 Dependencies

### Python (LlamaIndex Query Service)

**New dependency**:
```
circuitbreaker>=1.4.0
```

**Installation**:
```bash
cd tools/llamaindex/query_service
pip install -r requirements.txt
```

---

### Node.js (Documentation API / RAG Proxy)

**New dependency**:
```json
{
  "dependencies": {
    "opossum": "^8.1.0"
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "jest": "^29.7.0"
  }
}
```

**Installation**:
```bash
cd backend/api/documentation-api
npm install
```

---

## 🐳 Docker Deployment

### Rebuild Images

```bash
# Rebuild LlamaIndex Query Service (includes circuitbreaker)
docker-compose -f tools/compose/docker-compose.rag.yml build llamaindex-query

# Rebuild RAG Service / Documentation API (includes opossum)
docker-compose -f tools/compose/docker-compose.rag.yml build rag-service

# Rebuild Collections Service (if needed)
docker-compose -f tools/compose/docker-compose.rag.yml build rag-collections-service
```

### Update docker-compose.yml

No changes required! Environment variable `INTER_SERVICE_SECRET` is already configured via `.env`.

### Restart Services

```bash
# Stop all RAG services
docker-compose -f tools/compose/docker-compose.rag.yml down

# Start with new images
docker-compose -f tools/compose/docker-compose.rag.yml up -d

# Verify all containers healthy
docker-compose -f tools/compose/docker-compose.rag.yml ps
```

---

## ✅ Verification & Testing

### 1. Health Checks

```bash
# Check LlamaIndex Query Service
curl http://localhost:8202/health | jq

# Expected output includes:
# {
#   "status": "healthy",
#   "circuitBreakers": {
#     "ollama_embedding": "closed",
#     "ollama_generation": "closed",
#     "qdrant_search": "closed"
#   }
# }

# Check Documentation API / RAG Proxy
curl http://localhost:3402/health | jq

# Expected: Health status with circuit breaker states
```

---

### 2. Circuit Breaker Test (Manual)

**Test: Circuit opens when service fails**

```bash
# Step 1: Stop Ollama to simulate failure
docker stop rag-ollama

# Step 2: Make 5 requests (trigger circuit breaker)
for i in {1..5}; do
  curl -X GET "http://localhost:8202/search?query=test&max_results=5" \
    -H "Authorization: Bearer test-token"
  echo ""
done

# Expected: First few requests timeout (30s), then circuit opens (< 1ms 503 response)

# Step 3: Check health (verify circuit open)
curl http://localhost:8202/health | jq ".circuitBreakers"

# Expected:
# {
#   "ollama_embedding": "open",
#   "qdrant_search": "closed"
# }

# Step 4: Restart Ollama
docker start rag-ollama

# Step 5: Wait 30 seconds (recovery timeout)
sleep 30

# Step 6: Make request (circuit should attempt recovery)
curl -X GET "http://localhost:8202/search?query=test" \
  -H "Authorization: Bearer test-token"

# Expected: 200 OK (circuit recovered)

# Step 7: Verify circuit closed
curl http://localhost:8202/health | jq ".circuitBreakers"

# Expected: All circuits "closed"
```

---

### 3. Inter-Service Authentication Test

**Test: Requests without token are rejected**

```bash
# Step 1: Try calling internal endpoint without token
curl -X GET http://localhost:8202/internal/status

# Expected: 403 Forbidden
# {
#   "detail": {
#     "code": "FORBIDDEN",
#     "message": "Missing service authentication token"
#   }
# }

# Step 2: Try with invalid token
curl -X GET http://localhost:8202/internal/status \
  -H "X-Service-Token: invalid-token"

# Expected: 403 Forbidden

# Step 3: Try with valid token (from .env)
curl -X GET http://localhost:8202/internal/status \
  -H "X-Service-Token: ${INTER_SERVICE_SECRET}"

# Expected: 200 OK (if endpoint exists)
```

---

### 4. API Versioning Test

**Test: Versioned endpoints work**

```bash
# Test v1 endpoint
curl -X GET "http://localhost:3402/api/v1/rag/search?query=test" \
  -H "Authorization: Bearer test-token"

# Expected: 200 OK with results

# Test legacy endpoint (should show deprecation warning)
curl -v -X GET "http://localhost:3402/api/v1/rag/search?query=test" \
  -H "Authorization: Bearer test-token" 2>&1 | grep "X-API-Deprecated"

# Expected: Header "X-API-Deprecated: true" (check server logs for warning)
```

---

### 5. Run Unit Tests

**Jest (Node.js)**:
```bash
cd backend/api/documentation-api

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Expected:
# Tests: 33 passed (RagProxyService: 15, circuitBreaker: 10, serviceAuth: 8)
# Coverage: > 80%
```

**Pytest (Python)**:
```bash
cd tools/llamaindex/query_service

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html

# Expected:
# Tests: 18 passed (circuit_breaker: 10, search: 8)
# Coverage: > 75%
```

---

## 🔍 Monitoring

### Check Circuit Breaker States

```bash
# Via API
curl http://localhost:8202/health | jq ".circuitBreakers"

# Via logs
docker logs rag-llamaindex-query 2>&1 | grep "Circuit Breaker"

# Expected log entries:
# [Circuit Breaker] ollama_embedding: CLOSED (service healthy)
# [Circuit Breaker] qdrant_search: OPEN (service unavailable)  # If opened
```

### Check Service Auth Logs

```bash
# Check for unauthorized attempts
docker logs rag-llamaindex-query 2>&1 | grep "Unauthorized service"

# Expected: Nothing (unless there was an attack)

# Check documentation-api logs
docker logs rag-service 2>&1 | grep "Service Auth"
```

---

## 🚨 Troubleshooting

### Issue: Circuit Breaker Not Working

**Symptoms**: Requests still timeout even after 5 failures

**Diagnosis**:
```bash
# Check if circuitbreaker library installed
docker exec rag-llamaindex-query pip list | grep circuitbreaker

# Check if circuit_breaker.py exists
docker exec rag-llamaindex-query ls /app/query_service/circuit_breaker.py

# Check logs for import errors
docker logs rag-llamaindex-query 2>&1 | grep -i "error\|import"
```

**Solution**:
```bash
# Rebuild image with dependencies
docker-compose -f tools/compose/docker-compose.rag.yml build llamaindex-query --no-cache

# Restart service
docker-compose -f tools/compose/docker-compose.rag.yml up -d llamaindex-query
```

---

### Issue: Inter-Service Auth Rejecting Valid Requests

**Symptoms**: 403 Forbidden even with correct token

**Diagnosis**:
```bash
# Check INTER_SERVICE_SECRET in container
docker exec rag-llamaindex-query printenv | grep INTER_SERVICE_SECRET

# Check if secret matches across services
docker exec rag-service printenv | grep INTER_SERVICE_SECRET

# They should match!
```

**Solution**:
```bash
# Update .env file with consistent secret
echo "INTER_SERVICE_SECRET=<your-secret-here>" >> .env

# Restart all services to pick up new env var
docker-compose -f tools/compose/docker-compose.rag.yml restart
```

---

### Issue: Tests Failing

**Symptoms**: `npm test` or `pytest` fails

**Diagnosis**:
```bash
# Check Node.js version (requires 18+)
node --version

# Check Python version (requires 3.11+)
python --version

# Check Jest installed
npm list jest

# Check pytest installed
pip list | grep pytest
```

**Solution**:
```bash
# Install test dependencies
cd backend/api/documentation-api
npm install --save-dev @jest/globals jest

cd ../../tools/llamaindex/query_service
pip install pytest pytest-asyncio
```

---

## 📊 Success Criteria

### Post-Deployment Checklist

- [ ] ✅ All containers healthy (`docker-compose ps`)
- [ ] ✅ Health endpoint returns "healthy" with circuit breaker states
- [ ] ✅ Circuit breaker opens after 5 failures (manual test passed)
- [ ] ✅ Circuit breaker recovers after 30s (manual test passed)
- [ ] ✅ Inter-service auth rejects invalid tokens (403)
- [ ] ✅ Inter-service auth allows valid tokens (200)
- [ ] ✅ API versioning works (/api/v1 endpoints accessible)
- [ ] ✅ Unit tests pass (npm test && pytest)
- [ ] ✅ Test coverage ≥ 80% (backend)
- [ ] ✅ No regressions (existing features still work)

### Performance Verification

```bash
# Baseline: Response time should be similar
time curl -s "http://localhost:8202/search?query=test" > /dev/null

# Expected: < 50ms (circuit breaker adds < 1ms overhead)

# Check circuit breaker stats
curl http://localhost:8202/health | jq ".circuitBreakers.qdrant_search.stats"

# Expected: latencyMean < 50ms
```

---

## 🔄 Rollback Plan

### If Issues Arise

**Rollback Steps**:
```bash
# 1. Stop services
docker-compose -f tools/compose/docker-compose.rag.yml down

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Rebuild images
docker-compose -f tools/compose/docker-compose.rag.yml build

# 4. Start services
docker-compose -f tools/compose/docker-compose.rag.yml up -d

# 5. Verify services healthy
curl http://localhost:8202/health
```

**Data Safety**: No database schema changes in Sprint 1, rollback is safe.

---

## 📚 Related Documentation

- **[Implementation Progress](./IMPLEMENTATION-PROGRESS-2025-11-02.md)** - Current status
- **[OpenSpec Proposal](./tools/openspec/changes/enhance-rag-services-architecture/proposal.md)** - Full proposal
- **[Tasks Checklist](./tools/openspec/changes/enhance-rag-services-architecture/tasks.md)** - 140 tasks
- **[Architecture Review](./governance/reviews/architecture-2025-11-02-fullstack-review.mdx)** - Assessment

---

## 🎯 Next Steps (Sprint 2)

**After Sprint 1 deployed successfully**:
- [ ] Qdrant High Availability (3-node cluster)
- [ ] API Gateway (Kong)
- [ ] Frontend Code Splitting
- [ ] Database Schema Migration

**Timeline**: Week 3-4

---

**Deployment Status**: ✅ **Ready for Development Environment**  
**Production Deployment**: After 48h staging validation

---

**Questions?** Contact DevOps team or check troubleshooting section above.

