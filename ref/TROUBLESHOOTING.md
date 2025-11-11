# TradingSystem Troubleshooting Guide

> **Common issues and solutions** for quick problem resolution
> **Last Updated:** 2025-11-05

## Quick Diagnostic

```bash
# Run comprehensive health check
bash scripts/maintenance/health-check-all.sh

# Check service status
docker ps
lsof -ti:3103,3200,3500,4005  # Check ports

# View logs
docker logs timescaledb --tail 50
docker logs redis --tail 50
```

---

## Common Issues

### 1. Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3103
```

**Solution:**
```bash
# Find and kill process
lsof -ti:3103 | xargs kill -9

# Or use start script with force-kill
bash scripts/start.sh --force-kill

# Check what's using the port
lsof -i:3103
```

**Prevention:**
- Use universal `stop` command before starting
- Check port availability: `nc -zv localhost 3103`

---

### 2. Docker Container Won't Start

**Symptoms:**
```
ERROR: Cannot start service timescaledb: driver failed
```

**Diagnosis:**
```bash
# Check container status
docker ps -a | grep timescaledb

# View logs
docker logs timescaledb

# Inspect container
docker inspect timescaledb | jq '.[0].State'
```

**Solutions:**

**A. Container is unhealthy:**
```bash
# Restart container
docker restart tp-capital-timescale

# Or recreate
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d --force-recreate tp-capital-timescaledb
```

**B. Port conflict:**
```bash
# Check if port 5440 is in use
lsof -i:5440

# Kill conflicting process
lsof -ti:5440 | xargs kill -9
```

**C. Volume corruption:**
```bash
# Remove volume and recreate
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml down -v tp-capital-timescaledb
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d tp-capital-timescaledb
```

---

### 3. Database Connection Refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5440
```

**Diagnosis:**
```bash
# Test TimescaleDB connection
psql -h localhost -p 5440 -U tp_capital -d tp_capital_db

# Test QuestDB connection
curl http://localhost:7040/

# Test Redis connection
redis-cli -h localhost -p 7079 ping
```

**Solutions:**

**A. Container not running:**
```bash
docker start timescaledb
docker start redis
docker start questdb
```

**B. Wrong credentials:**
```bash
# Check environment variables
grep -E "TIMESCALEDB|REDIS|QUESTDB" .env

# Validate credentials
bash scripts/env/validate-env.sh
```

**C. Network issues:**
```bash
# Check Docker network
docker network inspect trading-network

# Reconnect container
docker network connect trading-network timescaledb
```

---

### 4. Frontend Build Fails

**Symptoms:**
```
ERROR: Module not found: Can't resolve '@/components/ui/button'
```

**Solutions:**

**A. Missing dependencies:**
```bash
cd frontend/dashboard
rm -rf node_modules package-lock.json
npm install
```

**B. TypeScript errors:**
```bash
npm run type-check
npm run lint:fix
```

**C. Cache issues:**
```bash
# Clear Vite cache
rm -rf frontend/dashboard/.vite
rm -rf frontend/dashboard/dist

# Rebuild
npm run build
```

---

### 5. API Returns 500 Internal Server Error

**Symptoms:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

**Diagnosis:**
```bash
# Check service logs
docker logs workspace --tail 100
docker logs tp-capital --tail 100

# Check health endpoint
curl http://localhost:3200/api/health
curl http://localhost:4005/health
```

**Common Causes:**

**A. Database query errors:**
```bash
# Check TimescaleDB logs
docker logs timescaledb | grep ERROR

# Test query manually
psql -h localhost -p 5440 -U tp_capital -d tp_capital_db -c "SELECT 1;"
```

**B. Missing environment variables:**
```bash
# Validate environment
bash scripts/env/validate-env.sh

# Check service-specific vars
docker exec workspace env | grep -E "TIMESCALEDB|PORT"
```

**C. Circuit breaker opened:**
```bash
# Check metrics endpoint
curl http://localhost:4005/metrics | grep circuit_breaker

# Restart service to reset breaker
docker restart tp-capital
```

---

### 6. RAG/LlamaIndex Not Working

**Symptoms:**
```
Error: Failed to fetch RAG results
```

**Diagnosis:**
```bash
# Check Qdrant
curl http://localhost:7050/collections

# Check Ollama
docker exec ollama ollama list

# Check LlamaIndex
curl http://localhost:8202/api/v1/rag/health
```

**Solutions:**

**A. Missing embeddings:**
```bash
# Pull embedding model
docker exec ollama ollama pull mxbai-embed-large

# Verify model
docker exec ollama ollama list | grep mxbai
```

**B. Empty Qdrant collection:**
```bash
# Re-ingest documents
python3 scripts/rag/ingest-documents.py --docs-dir ./docs/content --force

# Verify collection
curl http://localhost:7050/collections/docs_index_mxbai
```

**C. Service not responding:**
```bash
# Restart RAG stack
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml restart

# Check logs
docker logs llamaindex
docker logs ollama
```

---

### 7. Slow Performance

**Symptoms:**
- API responses > 2 seconds
- Dashboard loading slowly
- High CPU/memory usage

**Diagnosis:**
```bash
# Check Docker stats
docker stats

# Check service health
bash scripts/maintenance/health-check-all.sh --format json | jq '.services'

# Check database connections
psql -h localhost -p 5440 -U tp_capital -d tp_capital_db -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions:**

**A. Database optimization:**
```sql
-- Check slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_workspace_items_created_at ON workspace_items(created_at DESC);

-- Vacuum and analyze
VACUUM ANALYZE workspace_items;
```

**B. Redis cache:**
```bash
# Check cache hit rate
redis-cli -h localhost -p 7079 INFO stats | grep hit

# Clear stale cache
redis-cli -h localhost -p 7079 FLUSHDB
```

**C. Frontend optimization:**
```bash
# Analyze bundle size
cd frontend/dashboard
npm run analyze:bundle

# Check for console errors
# Open browser DevTools → Console
```

---

### 8. Environment Variables Not Loading

**Symptoms:**
```
Error: Missing required environment variable: TIMESCALEDB_PASSWORD
```

**Solutions:**

**A. Wrong .env location:**
```bash
# Check .env exists in project root
ls -la /home/marce/Projetos/TradingSystem/.env

# Verify loading
node -e "require('dotenv').config(); console.log(process.env.TIMESCALEDB_PASSWORD)"
```

**B. Docker not reading .env:**
```bash
# Check docker-compose env_file
cat tools/compose/docker-compose.4-1-tp-capital-stack.yml | grep env_file

# Manually specify .env
docker compose --env-file ../../.env -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d tp-capital-timescaledb
```

**C. Validation failing:**
```bash
# Run validation
bash scripts/env/validate-env.sh --verbose

# Fix issues reported
vim .env
```

---

### 9. Tests Failing

**Symptoms:**
```
FAIL  src/__tests__/workspaceApi.test.ts
```

**Solutions:**

**A. Outdated snapshots:**
```bash
npm run test -- -u  # Update snapshots
```

**B. Missing test database:**
```bash
# Setup test database
psql -h localhost -p 5440 -U tp_capital -c "CREATE DATABASE trading_system_test;"

# Run migrations
npm run migrate:test
```

**C. Async timing issues:**
```typescript
// Use waitFor from @testing-library/react
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('Item created')).toBeInTheDocument();
});
```

---

### 10. Git/GitHub Actions Failing

**Symptoms:**
```
Error: Husky pre-commit hook failed
```

**Solutions:**

**A. Linting errors:**
```bash
npm run lint:fix
```

**B. Type errors:**
```bash
cd frontend/dashboard
npm run type-check
```

**C. Bypass hooks (emergency only):**
```bash
git commit --no-verify -m "Emergency fix"
```

---

## Emergency Recovery

### Full System Reset

```bash
# CAUTION: This will delete all data!

# 1. Stop everything
bash scripts/stop.sh --force

# 2. Remove all containers and volumes
docker compose down -v --remove-orphans

# 3. Clean Docker system
docker system prune -af --volumes

# 4. Remove node_modules
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# 5. Fresh install
npm install
cd frontend/dashboard && npm install

# 6. Start from scratch
bash scripts/start.sh
```

### Backup Before Reset

```bash
# Backup databases
docker exec timescaledb pg_dump -U postgres trading_system | gzip > backup-timescaledb.sql.gz
docker exec redis redis-cli --rdb /data/dump.rdb SAVE
docker cp redis:/data/dump.rdb backup-redis.rdb

# Backup Qdrant
bash scripts/qdrant/backup-cluster.sh
```

---

## Getting Help

### Logs to Collect

When asking for help, provide:

```bash
# System info
uname -a
docker --version
node --version

# Health check
bash scripts/maintenance/health-check-all.sh > health-report.txt

# Service logs
docker logs timescaledb > logs-timescaledb.txt
docker logs workspace > logs-workspace.txt

# Environment (sanitized)
grep -v PASSWORD .env > env-sanitized.txt
```

### Support Channels

- **GitHub Issues:** https://github.com/yourusername/TradingSystem/issues
- **Documentation:** http://localhost:3404
- **Health Dashboard:** http://localhost:3103/#/health

---

## Preventive Maintenance

### Daily Checks

```bash
# Run health check
bash scripts/maintenance/health-check-all.sh

# Check disk space
df -h

# Check Docker logs size
docker system df
```

### Weekly Maintenance

```bash
# Update dependencies
npm run governance:check

# Backup databases
bash scripts/backup/backup-all.sh

# Clean old logs
find logs/ -name "*.log" -mtime +7 -delete

# Docker cleanup
docker system prune -f
```

### Monthly Tasks

- Review and rotate logs
- Check for security updates
- Run performance profiling
- Review and archive old data

---

## Additional Resources

- **Health Check Script:** [scripts/maintenance/health-check-all.sh](../scripts/maintenance/health-check-all.sh)
- **Docker Management:** [scripts/docker/](../scripts/docker/)
- **Environment Validation:** [scripts/env/validate-env.sh](../scripts/env/validate-env.sh)
- **Architecture Review:** [governance/evidence/reports/reviews/](../governance/evidence/reports/reviews/)
