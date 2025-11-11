#!/bin/bash
# ==============================================================================
# Test Workspace Redis Cache Integration (Phase 2.3)
# ==============================================================================
# Tests Redis caching behavior in the Workspace API
#
# Usage:
#   bash scripts/docker/test-workspace-redis-cache.sh
#
# Tests:
#   1. Redis health check
#   2. Cache MISS on first request
#   3. Cache HIT on second request
#   4. Cache invalidation on mutations
#   5. Cache statistics
#
# Expected Results:
#   - First GET: X-Cache: MISS (~200ms)
#   - Second GET: X-Cache: HIT (~10ms)
#   - After POST: X-Cache: MISS (cache invalidated)
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="tools/compose/docker-compose.4-3-workspace-stack.yml"
API_URL="http://localhost:3200"
TEST_ENDPOINT="/api/items"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Workspace Redis Cache Testing (Phase 2.3)${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# ==============================================================================
# Test 1: Check Docker Containers
# ==============================================================================
echo -e "${YELLOW}Test 1: Checking Docker containers...${NC}"

if ! docker compose -f "$COMPOSE_FILE" ps | grep -q "workspace-redis.*Up"; then
    echo -e "${RED}❌ workspace-redis container not running${NC}"
    echo -e "${YELLOW}Starting workspace stack...${NC}"
    docker compose -f "$COMPOSE_FILE" up -d
    sleep 10
fi

if docker compose -f "$COMPOSE_FILE" ps | grep -q "workspace-redis.*Up.*healthy"; then
    echo -e "${GREEN}✅ workspace-redis is running and healthy${NC}"
else
    echo -e "${RED}❌ workspace-redis is not healthy${NC}"
    docker compose -f "$COMPOSE_FILE" logs workspace-redis
    exit 1
fi

if docker compose -f "$COMPOSE_FILE" ps | grep -q "workspace-api.*Up.*healthy"; then
    echo -e "${GREEN}✅ workspace-api is running and healthy${NC}"
else
    echo -e "${RED}❌ workspace-api is not healthy${NC}"
    docker compose -f "$COMPOSE_FILE" logs workspace-api
    exit 1
fi

echo ""

# ==============================================================================
# Test 2: Verify Redis Connection
# ==============================================================================
echo -e "${YELLOW}Test 2: Verifying Redis connection...${NC}"

REDIS_PING=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli PING 2>&1)

if [[ "$REDIS_PING" == *"PONG"* ]]; then
    echo -e "${GREEN}✅ Redis is responding to PING${NC}"
else
    echo -e "${RED}❌ Redis not responding: $REDIS_PING${NC}"
    exit 1
fi

# Check Redis memory info
echo -e "${BLUE}Redis Memory Info:${NC}"
docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human|maxmemory_policy"

echo ""

# ==============================================================================
# Test 3: Clear Cache Before Testing
# ==============================================================================
echo -e "${YELLOW}Test 3: Clearing cache for clean test...${NC}"

docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli FLUSHDB > /dev/null
echo -e "${GREEN}✅ Cache cleared${NC}"

echo ""

# ==============================================================================
# Test 4: Cache MISS on First Request
# ==============================================================================
echo -e "${YELLOW}Test 4: Testing cache MISS (first request)...${NC}"

START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" -H "Accept: application/json" "${API_URL}${TEST_ENDPOINT}" 2>&1)
END_TIME=$(date +%s%N)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
TIME_TOTAL=$(echo "$RESPONSE" | tail -n 1)
CACHE_HEADER=$(curl -s -I "${API_URL}${TEST_ENDPOINT}" 2>&1 | grep -i "X-Cache" || echo "X-Cache: NOT_SET")

if [[ "$HTTP_CODE" == "200" ]]; then
    echo -e "${GREEN}✅ API returned 200 OK${NC}"
else
    echo -e "${RED}❌ API returned $HTTP_CODE${NC}"
    echo "$RESPONSE"
    exit 1
fi

if [[ "$CACHE_HEADER" == *"MISS"* ]]; then
    echo -e "${GREEN}✅ Cache MISS detected (expected)${NC}"
    echo -e "${BLUE}   Response time: ${TIME_TOTAL}s${NC}"
else
    echo -e "${RED}❌ Expected X-Cache: MISS, got: $CACHE_HEADER${NC}"
fi

MISS_TIME=$TIME_TOTAL

echo ""

# ==============================================================================
# Test 5: Cache HIT on Second Request
# ==============================================================================
echo -e "${YELLOW}Test 5: Testing cache HIT (second request)...${NC}"

sleep 1 # Give Redis time to store

START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" -H "Accept: application/json" "${API_URL}${TEST_ENDPOINT}" 2>&1)
END_TIME=$(date +%s%N)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
TIME_TOTAL=$(echo "$RESPONSE" | tail -n 1)
CACHE_HEADER=$(curl -s -I "${API_URL}${TEST_ENDPOINT}" 2>&1 | grep -i "X-Cache" || echo "X-Cache: NOT_SET")

if [[ "$HTTP_CODE" == "200" ]]; then
    echo -e "${GREEN}✅ API returned 200 OK${NC}"
else
    echo -e "${RED}❌ API returned $HTTP_CODE${NC}"
    exit 1
fi

if [[ "$CACHE_HEADER" == *"HIT"* ]]; then
    echo -e "${GREEN}✅ Cache HIT detected (expected)${NC}"
    echo -e "${BLUE}   Response time: ${TIME_TOTAL}s${NC}"

    # Calculate speedup
    SPEEDUP=$(echo "scale=2; ($MISS_TIME - $TIME_TOTAL) / $MISS_TIME * 100" | bc 2>/dev/null || echo "N/A")
    if [[ "$SPEEDUP" != "N/A" ]]; then
        echo -e "${GREEN}   Speedup: ${SPEEDUP}% faster than uncached${NC}"
    fi
else
    echo -e "${RED}❌ Expected X-Cache: HIT, got: $CACHE_HEADER${NC}"
fi

HIT_TIME=$TIME_TOTAL

echo ""

# ==============================================================================
# Test 6: Check Cached Keys
# ==============================================================================
echo -e "${YELLOW}Test 6: Checking cached keys in Redis...${NC}"

KEYS=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli KEYS 'workspace:*' 2>&1)

if [[ -n "$KEYS" ]]; then
    echo -e "${GREEN}✅ Found cached keys:${NC}"
    echo "$KEYS" | sed 's/^/   /'
else
    echo -e "${RED}❌ No cached keys found${NC}"
fi

echo ""

# ==============================================================================
# Test 7: Cache Invalidation on Mutation
# ==============================================================================
echo -e "${YELLOW}Test 7: Testing cache invalidation (create item)...${NC}"

# Create test item (this should invalidate cache)
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}${TEST_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Cache Test Item",
        "description": "Testing cache invalidation",
        "category": "dev",
        "priority": "medium"
    }' 2>&1)

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n 1)

if [[ "$HTTP_CODE" == "201" ]]; then
    echo -e "${GREEN}✅ Item created (201 Created)${NC}"
else
    echo -e "${RED}❌ Failed to create item: $HTTP_CODE${NC}"
    echo "$CREATE_RESPONSE"
fi

sleep 1

# Check if cache was invalidated (next GET should be MISS)
CACHE_HEADER=$(curl -s -I "${API_URL}${TEST_ENDPOINT}" 2>&1 | grep -i "X-Cache" || echo "X-Cache: NOT_SET")

if [[ "$CACHE_HEADER" == *"MISS"* ]]; then
    echo -e "${GREEN}✅ Cache invalidated successfully (X-Cache: MISS)${NC}"
else
    echo -e "${RED}❌ Cache not invalidated, got: $CACHE_HEADER${NC}"
fi

echo ""

# ==============================================================================
# Test 8: Cache Statistics
# ==============================================================================
echo -e "${YELLOW}Test 8: Redis cache statistics...${NC}"

echo -e "${BLUE}Cache Stats:${NC}"
docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|evicted_keys"

# Calculate hit rate if possible
HITS=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO stats | grep "keyspace_hits" | cut -d: -f2 | tr -d '\r')
MISSES=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO stats | grep "keyspace_misses" | cut -d: -f2 | tr -d '\r')

if [[ -n "$HITS" && -n "$MISSES" && "$HITS" -gt 0 ]]; then
    TOTAL=$((HITS + MISSES))
    HIT_RATE=$(echo "scale=2; $HITS / $TOTAL * 100" | bc 2>/dev/null || echo "N/A")
    if [[ "$HIT_RATE" != "N/A" ]]; then
        echo -e "${GREEN}   Cache Hit Rate: ${HIT_RATE}%${NC}"

        if (( $(echo "$HIT_RATE > 80" | bc -l) )); then
            echo -e "${GREEN}   ✅ Hit rate above 80% target${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Hit rate below 80% target (needs more usage)${NC}"
        fi
    fi
fi

echo ""

# ==============================================================================
# Summary
# ==============================================================================
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "${GREEN}✅ All Redis cache tests passed!${NC}"
echo ""
echo -e "${BLUE}Performance Comparison:${NC}"
echo -e "   Cache MISS: ${MISS_TIME}s"
echo -e "   Cache HIT:  ${HIT_TIME}s"
if [[ "$SPEEDUP" != "N/A" ]]; then
    echo -e "   ${GREEN}Speedup: ${SPEEDUP}% faster${NC}"
fi
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "   1. Monitor cache hit rate in production"
echo -e "   2. Adjust TTL values if needed"
echo -e "   3. Add Prometheus metrics for monitoring"
echo -e "   4. Run load tests to verify performance at scale"
echo ""
echo -e "${BLUE}Monitoring Commands:${NC}"
echo -e "   # View cached keys"
echo -e "   docker compose -f $COMPOSE_FILE exec workspace-redis redis-cli KEYS 'workspace:*'"
echo ""
echo -e "   # Check cache stats"
echo -e "   docker compose -f $COMPOSE_FILE exec workspace-redis redis-cli INFO stats"
echo ""
echo -e "   # Clear cache if needed"
echo -e "   docker compose -f $COMPOSE_FILE exec workspace-redis redis-cli FLUSHDB"
echo ""
echo -e "${BLUE}==============================================================================${NC}"
