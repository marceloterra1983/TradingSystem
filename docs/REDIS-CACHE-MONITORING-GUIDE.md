# Redis Cache Monitoring Guide

**Quick reference for monitoring Redis cache performance in production.**

---

## 🎯 Key Metrics to Watch

### 1. Cache Hit Rate (Target: >80%)

```bash
# Check hit/miss statistics
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-redis redis-cli INFO stats | grep keyspace

# Calculate hit rate:
# hit_rate = keyspace_hits / (keyspace_hits + keyspace_misses) * 100
```

**Interpretation:**
- **>80%** = Excellent (cache working as expected)
- **60-80%** = Good (room for optimization)
- **<60%** = Poor (review TTL settings or cache keys)

### 2. Memory Usage

```bash
# Check memory consumption
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-redis redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"
```

**Thresholds:**
- **<128MB** = Healthy (50% of limit)
- **128-230MB** = Warning (50-90% of limit)
- **>230MB** = Critical (>90% of limit, evictions happening)

### 3. API Response Times

```bash
# Prometheus metrics endpoint
curl http://localhost:3200/metrics | grep workspace_api_request_duration_seconds

# Or via Traefik
curl http://localhost:9080/api/workspace/metrics | grep workspace_api_request_duration_seconds
```

**Expected:**
- **Cached requests:** < 20ms (95th percentile)
- **Uncached requests:** 100-200ms (database queries)

### 4. X-Cache Headers

```bash
# Check cache status in responses
curl -v http://localhost:9080/api/workspace/items 2>&1 | grep X-Cache
```

**Values:**
- `X-Cache: MISS` - First request, cache populated
- `X-Cache: HIT` - Served from cache
- `X-Cache-Age: 45` - Cached 45 seconds ago (TTL: 300s)

---

## 📊 Daily Monitoring Checklist

### Morning Check (Once/Day)
```bash
#!/bin/bash
# Save as: scripts/monitoring/daily-redis-check.sh

echo "=== Redis Cache Health Check $(date) ==="

# 1. Cache hit rate
echo -e "\n📊 Cache Hit Rate:"
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec -T workspace-redis redis-cli INFO stats | grep keyspace | awk -F: '{print $2}'

# 2. Memory usage
echo -e "\n💾 Memory Usage:"
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec -T workspace-redis redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"

# 3. Key count
echo -e "\n🔑 Total Keys:"
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec -T workspace-redis redis-cli DBSIZE

# 4. Container health
echo -e "\n🏥 Container Status:"
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  ps workspace-redis

echo -e "\n✅ Check complete"
```

**Run daily:**
```bash
bash scripts/monitoring/daily-redis-check.sh
```

### Real-Time Monitoring
```bash
# Watch cache operations in real-time
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  logs -f workspace-api | grep -E "Cache|GET|POST"
```

---

## 🚨 Alerts & Thresholds

### Critical Issues (Immediate Action)

**1. Low Hit Rate (<60% after 24h)**
```bash
# Diagnosis:
# - Check TTL settings (may be too short)
# - Review cache key patterns
# - Validate cache invalidation logic

# Solution:
# - Increase TTL if data doesn't change frequently
# - Reduce cache invalidation frequency
# - Add more granular cache keys
```

**2. High Memory Usage (>90%)**
```bash
# Diagnosis:
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-redis redis-cli INFO memory | grep evicted_keys

# If evicted_keys is high:
# - LRU eviction is working (keys being removed)
# - May need to increase maxmemory limit

# Solution (increase to 512MB):
# Edit docker-compose.4-3-workspace-stack.yml:
#   command:
#     - redis-server
#     - --maxmemory 512mb  # Changed from 256mb
```

**3. Redis Container Down**
```bash
# Check container status
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml ps workspace-redis

# If unhealthy/stopped, restart:
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  restart workspace-redis

# Check logs for errors:
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  logs workspace-redis --tail=50
```

### Warning Issues (Monitor & Plan)

**1. Hit Rate 60-80%**
- Monitor for 48 hours
- If stable, acceptable
- If declining, investigate patterns

**2. Memory 50-90%**
- Normal operation
- Monitor eviction rate
- Plan capacity increase if growing

---

## 📈 Performance Benchmarks

### Before Redis Cache (Baseline)
```
GET /api/items        200ms avg
GET /api/items/:id    150ms avg
GET /api/items/stats  250ms avg
Database Load:        100% (all requests hit DB)
```

### After Redis Cache (Expected)
```
GET /api/items        10ms avg (cached)
GET /api/items/:id    10ms avg (cached)
GET /api/items/stats  10ms avg (cached)
Database Load:        20% (80% cache hit rate)

Performance Improvement:
- 95% faster response times (cached)
- 80% reduction in database load
- 5x higher throughput capacity
```

### Load Testing
```bash
# Apache Bench - 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:9080/api/workspace/items

# Expected results:
# Requests per second: 100-200 (was 20-30 before caching)
# Mean response time: <50ms (was 200ms before caching)
# Failed requests: 0
```

---

## 🔧 Troubleshooting

### Issue: Cache Always Shows MISS

**Possible Causes:**
1. Redis cache disabled in environment
2. Cache middleware not applied to routes
3. Cache keys not matching between requests

**Diagnosis:**
```bash
# 1. Check environment variables
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-api env | grep REDIS

# Should show:
# REDIS_HOST=workspace-redis
# REDIS_PORT=6379
# REDIS_CACHE_ENABLED=true

# 2. Check Redis connectivity
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-api ping -c 1 workspace-redis

# 3. Test cache manually
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-redis redis-cli SET test "value"
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-redis redis-cli GET test
```

**Solution:**
- Ensure `REDIS_CACHE_ENABLED=true` in environment
- Restart workspace-api container
- Check API logs for cache errors

### Issue: Cache Not Invalidating

**Possible Causes:**
1. Cache invalidation code not executing
2. Pattern mismatch in cache keys
3. Redis connection issues during invalidation

**Diagnosis:**
```bash
# 1. Check API logs for invalidation
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  logs workspace-api --since=5m | grep -i "invalidat"

# 2. Monitor Redis keys during mutation
# Terminal 1: Watch keys
watch -n 1 'docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml exec workspace-redis redis-cli KEYS "workspace:*"'

# Terminal 2: Create item
curl -X POST http://localhost:9080/api/workspace/items \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","category":"documentacao","priority":"low"}'
```

**Solution:**
- Verify cache invalidation in route handlers
- Check pattern matching in `invalidateCache()` calls
- Add explicit logging to invalidation code

### Issue: High Response Times Despite Cache

**Possible Causes:**
1. Network latency (Traefik overhead)
2. Redis performance degradation
3. Cache deserialization slow

**Diagnosis:**
```bash
# 1. Direct API timing (bypass Traefik)
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-api time curl http://localhost:3200/api/items

# 2. Redis performance check
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-redis redis-cli --latency-history

# 3. Check network issues
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml \
  exec workspace-api ping -c 10 workspace-redis
```

**Solution:**
- If Redis latency >10ms, check container resources
- If network latency high, check Docker network configuration
- Consider increasing Redis memory for faster access

---

## 📋 Weekly Reporting Template

```markdown
## Redis Cache Performance Report - Week of [DATE]

### Metrics Summary
- **Average Hit Rate:** X%
- **Total Requests:** Y
- **Cache Hits:** Z
- **Memory Usage:** Xmb / 256mb (Y%)

### Performance Impact
- **Average Response Time (cached):** Xms
- **Average Response Time (uncached):** Yms
- **Database Load Reduction:** X%

### Issues & Actions
- [None / List any issues encountered]

### Recommendations
- [Any changes to TTL, memory, or configuration]

### Next Week Goals
- Monitor hit rate stability
- [Other objectives]
```

---

## 🔗 Related Documentation

- **[Phase 2.3 Testing Complete](PHASE-2-3-REDIS-TESTING-COMPLETE.md)** - Test results
- **[Phase 2.3 Implementation](PHASE-2-3-IMPLEMENTATION-COMPLETE.md)** - Implementation details
- **[Redis Integration Guide](PHASE-2-3-REDIS-INTEGRATION-COMPLETE.md)** - Complete integration docs

---

**Last Updated:** 2025-11-11 | **Version:** 1.0 | **Status:** Production Ready 🟢
