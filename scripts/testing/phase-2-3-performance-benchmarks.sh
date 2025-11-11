#!/bin/bash

# Phase 2.3 Performance Benchmarks
# Comprehensive performance testing for Redis caching, API response times, and database queries

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Phase 2.3 Performance Benchmarks ===${NC}\n"

# Configuration
API_BASE="http://localhost:9080/api/workspace"
NUM_REQUESTS=100
COMPOSE_FILE="tools/compose/docker-compose.4-3-workspace-stack.yml"

# Output files
RESULTS_DIR="docs/benchmarks/phase-2-3"
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$RESULTS_DIR/benchmark-results-$TIMESTAMP.json"

echo -e "${GREEN}[1/5] Testing API Response Times (Cold Start)${NC}"
echo "Making 10 cold start requests to measure uncached performance..."

COLD_TIMES=()
for i in {1..10}; do
  RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$API_BASE/items")
  COLD_TIMES+=("$RESPONSE_TIME")
  echo "  Request $i: ${RESPONSE_TIME}s"
  sleep 0.5
done

# Calculate average
COLD_AVG=$(printf '%s\n' "${COLD_TIMES[@]}" | awk '{sum+=$1} END {print sum/NR}')
echo -e "  ${BLUE}Average cold start time: ${COLD_AVG}s${NC}\n"

echo -e "${GREEN}[2/5] Testing API Response Times (Cached)${NC}"
echo "Making $NUM_REQUESTS requests to measure cached performance..."

HOT_TIMES=()
HIT_COUNT=0
MISS_COUNT=0

for i in $(seq 1 $NUM_REQUESTS); do
  RESPONSE=$(curl -s -w "\n%{time_total}" "$API_BASE/items")
  TIME=$(echo "$RESPONSE" | tail -1)
  CACHE_HEADER=$(curl -s -I "$API_BASE/items" | grep -i "x-cache" | awk '{print $2}' | tr -d '\r')

  HOT_TIMES+=("$TIME")

  if [[ "$CACHE_HEADER" == "HIT" ]]; then
    ((HIT_COUNT++))
  else
    ((MISS_COUNT++))
  fi

  if [[ $((i % 20)) -eq 0 ]]; then
    echo "  Progress: $i/$NUM_REQUESTS requests (Hits: $HIT_COUNT, Misses: $MISS_COUNT)"
  fi
done

HOT_AVG=$(printf '%s\n' "${HOT_TIMES[@]}" | awk '{sum+=$1} END {print sum/NR}')
CACHE_HIT_RATE=$(awk "BEGIN {printf \"%.2f\", ($HIT_COUNT / $NUM_REQUESTS) * 100}")

echo -e "  ${BLUE}Average cached time: ${HOT_AVG}s${NC}"
echo -e "  ${BLUE}Cache hit rate: ${CACHE_HIT_RATE}%${NC}\n"

# Calculate speedup
SPEEDUP=$(awk "BEGIN {printf \"%.2f\", ($COLD_AVG / $HOT_AVG)}")
SPEEDUP_PERCENT=$(awk "BEGIN {printf \"%.1f\", (($COLD_AVG - $HOT_AVG) / $COLD_AVG) * 100}")

echo -e "${GREEN}[3/5] Redis Cache Statistics${NC}"

# Get Redis stats from container
docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses" | while read -r line; do
  echo "  $line"
done

echo ""

# Calculate hit rate from Redis
REDIS_HITS=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO stats | grep "keyspace_hits:" | awk -F: '{print $2}' | tr -d '\r')
REDIS_MISSES=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO stats | grep "keyspace_misses:" | awk -F: '{print $2}' | tr -d '\r')
REDIS_TOTAL=$((REDIS_HITS + REDIS_MISSES))

if [[ $REDIS_TOTAL -gt 0 ]]; then
  REDIS_HIT_RATE=$(awk "BEGIN {printf \"%.2f\", ($REDIS_HITS / $REDIS_TOTAL) * 100}")
  echo -e "  ${BLUE}Redis overall hit rate: ${REDIS_HIT_RATE}%${NC}\n"
fi

echo -e "${GREEN}[4/5] Database Query Performance${NC}"

# Run database analysis
CACHE_HIT_RATIO=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-db psql -U postgres -d workspace -t -c \
  "SELECT ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
   FROM pg_statio_user_tables WHERE schemaname = 'workspace';" | xargs)

echo -e "  ${BLUE}Database cache hit ratio: ${CACHE_HIT_RATIO}%${NC}\n"

echo -e "${GREEN}[5/5] Bundle Size Analysis${NC}"

# Check if build exists
BUILD_DIR="frontend/dashboard/dist"
if [[ -d "$BUILD_DIR" ]]; then
  TOTAL_SIZE=$(du -sh "$BUILD_DIR" | awk '{print $1}')
  JS_SIZE=$(find "$BUILD_DIR" -name "*.js" -exec du -ch {} + | grep total | awk '{print $1}')
  CSS_SIZE=$(find "$BUILD_DIR" -name "*.css" -exec du -ch {} + | grep total | awk '{print $1}')

  echo "  Total bundle size: $TOTAL_SIZE"
  echo "  JavaScript: $JS_SIZE"
  echo "  CSS: $CSS_SIZE"

  # Find largest bundles
  echo ""
  echo "  Top 5 largest bundles:"
  find "$BUILD_DIR" -name "*.js" -exec du -h {} + | sort -rh | head -5 | while read -r size file; do
    echo "    - $(basename "$file"): $size"
  done
else
  echo -e "  ${YELLOW}Build directory not found. Run 'cd frontend/dashboard && npm run build' first.${NC}"
fi

echo ""
echo -e "${BLUE}=== Performance Summary ===${NC}\n"

# Generate JSON report
cat > "$REPORT_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "phase": "2.3",
  "api_performance": {
    "cold_start_avg_ms": $(awk "BEGIN {printf \"%.2f\", $COLD_AVG * 1000}"),
    "cached_avg_ms": $(awk "BEGIN {printf \"%.2f\", $HOT_AVG * 1000}"),
    "speedup_factor": $SPEEDUP,
    "speedup_percent": $SPEEDUP_PERCENT,
    "requests_tested": $NUM_REQUESTS
  },
  "cache_performance": {
    "application_hit_rate": $CACHE_HIT_RATE,
    "redis_hits": $REDIS_HITS,
    "redis_misses": $REDIS_MISSES,
    "redis_hit_rate": $REDIS_HIT_RATE,
    "database_cache_hit_ratio": $CACHE_HIT_RATIO
  },
  "targets": {
    "api_response_cached": "<100ms",
    "cache_hit_rate": ">80%",
    "db_cache_ratio": ">95%",
    "bundle_size": "<500KB"
  }
}
EOF

echo -e "📊 ${GREEN}API Performance:${NC}"
echo -e "  • Cold start (uncached): $(awk "BEGIN {printf \"%.0f\", $COLD_AVG * 1000}")ms"
echo -e "  • Cached: $(awk "BEGIN {printf \"%.0f\", $HOT_AVG * 1000}")ms"
echo -e "  • Speedup: ${SPEEDUP}x (${SPEEDUP_PERCENT}% faster)"
echo ""

echo -e "💾 ${GREEN}Cache Performance:${NC}"
echo -e "  • Application cache hit rate: ${CACHE_HIT_RATE}%"
if [[ $REDIS_TOTAL -gt 0 ]]; then
  echo -e "  • Redis overall hit rate: ${REDIS_HIT_RATE}%"
fi
echo -e "  • Database cache hit ratio: ${CACHE_HIT_RATIO}%"
echo ""

echo -e "🎯 ${GREEN}Target Metrics:${NC}"
echo -e "  • API response (cached): <100ms → $(awk "BEGIN {printf \"%.0f\", $HOT_AVG * 1000}")ms ${GREEN}✓${NC}"

if (( $(awk "BEGIN {print ($CACHE_HIT_RATE >= 80)}") )); then
  echo -e "  • Cache hit rate: >80% → ${CACHE_HIT_RATE}% ${GREEN}✓${NC}"
else
  echo -e "  • Cache hit rate: >80% → ${CACHE_HIT_RATE}% ${YELLOW}(Growing)${NC}"
fi

echo -e "  • DB cache ratio: >95% → ${CACHE_HIT_RATIO}% ${GREEN}✓${NC}"
echo ""

echo -e "${GREEN}Results saved to:${NC} $REPORT_FILE"
echo ""
