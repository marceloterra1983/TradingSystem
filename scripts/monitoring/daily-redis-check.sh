#!/bin/bash
# ==============================================================================
# Daily Redis Cache Health Check
# ==============================================================================
# Monitors Redis cache performance, memory usage, and container health
#
# Usage:
#   bash scripts/monitoring/daily-redis-check.sh [--json]
#
# Options:
#   --json    Output in JSON format for automation
#
# Schedule with cron:
#   0 8 * * * /path/to/daily-redis-check.sh >> /path/to/redis-health.log 2>&1
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
JSON_OUTPUT=false

# Parse arguments
if [[ "$1" == "--json" ]]; then
    JSON_OUTPUT=true
fi

# ==============================================================================
# Helper Functions
# ==============================================================================

print_header() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}$1${NC}"
    fi
}

print_metric() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "  $1: ${GREEN}$2${NC}"
    fi
}

print_warning() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "  ⚠️  ${YELLOW}$1${NC}"
    fi
}

print_error() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "  ❌ ${RED}$1${NC}"
    fi
}

# ==============================================================================
# Collect Metrics
# ==============================================================================

if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}Redis Cache Health Check - $(date)${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
fi

# Check if Redis container is running
if ! docker compose -f "$COMPOSE_FILE" ps workspace-redis | grep -q "Up"; then
    if [ "$JSON_OUTPUT" = true ]; then
        echo '{"status":"error","message":"Redis container is not running"}'
    else
        print_error "Redis container is not running!"
    fi
    exit 1
fi

# 1. Cache Hit Statistics
print_header "📊 Cache Hit Rate:"

STATS=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO stats | grep keyspace)
HITS=$(echo "$STATS" | grep keyspace_hits | cut -d: -f2 | tr -d '\r')
MISSES=$(echo "$STATS" | grep keyspace_misses | cut -d: -f2 | tr -d '\r')

if [ -z "$HITS" ] || [ -z "$MISSES" ]; then
    HITS=0
    MISSES=0
fi

TOTAL=$((HITS + MISSES))

if [ "$TOTAL" -gt 0 ]; then
    HIT_RATE=$(awk "BEGIN {printf \"%.1f\", ($HITS/$TOTAL)*100}")
else
    HIT_RATE="0.0"
fi

if [ "$JSON_OUTPUT" = false ]; then
    print_metric "Total Requests" "$TOTAL"
    print_metric "Cache Hits" "$HITS"
    print_metric "Cache Misses" "$MISSES"
    print_metric "Hit Rate" "$HIT_RATE%"

    # Evaluate hit rate
    if (( $(echo "$HIT_RATE >= 80" | bc -l) )); then
        echo -e "  ✅ ${GREEN}Excellent cache performance!${NC}"
    elif (( $(echo "$HIT_RATE >= 60" | bc -l) )); then
        print_warning "Hit rate is acceptable but could be improved"
    else
        print_warning "Hit rate is low - consider reviewing cache strategy"
    fi
fi

# 2. Memory Usage
print_header ""
print_header "💾 Memory Usage:"

MEMORY_INFO=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO memory)
USED_MEMORY=$(echo "$MEMORY_INFO" | grep "^used_memory_human:" | cut -d: -f2 | tr -d '\r')
MAX_MEMORY=$(echo "$MEMORY_INFO" | grep "^maxmemory_human:" | cut -d: -f2 | tr -d '\r')
USED_MEMORY_BYTES=$(echo "$MEMORY_INFO" | grep "^used_memory:" | cut -d: -f2 | tr -d '\r')
MAX_MEMORY_BYTES=$(echo "$MEMORY_INFO" | grep "^maxmemory:" | cut -d: -f2 | tr -d '\r')

if [ -z "$MAX_MEMORY_BYTES" ] || [ "$MAX_MEMORY_BYTES" -eq 0 ]; then
    MEMORY_PERCENT="N/A"
else
    MEMORY_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($USED_MEMORY_BYTES/$MAX_MEMORY_BYTES)*100}")
fi

if [ "$JSON_OUTPUT" = false ]; then
    print_metric "Used Memory" "$USED_MEMORY"
    print_metric "Max Memory" "$MAX_MEMORY"
    print_metric "Usage" "$MEMORY_PERCENT%"

    # Evaluate memory usage
    if [ "$MEMORY_PERCENT" != "N/A" ]; then
        if (( $(echo "$MEMORY_PERCENT >= 90" | bc -l) )); then
            print_error "Memory usage critical! LRU evictions may be frequent"
        elif (( $(echo "$MEMORY_PERCENT >= 70" | bc -l) )); then
            print_warning "Memory usage high - monitor for growth"
        else
            echo -e "  ✅ ${GREEN}Memory usage healthy${NC}"
        fi
    fi
fi

# 3. Key Count & TTL Info
print_header ""
print_header "🔑 Cache Keys:"

KEY_COUNT=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli DBSIZE | tr -d '\r')
KEYSPACE_INFO=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO keyspace | grep "^db0:" | tr -d '\r')

if [ -n "$KEYSPACE_INFO" ]; then
    KEYS_WITH_TTL=$(echo "$KEYSPACE_INFO" | sed -n 's/.*expires=\([0-9]*\).*/\1/p')
    AVG_TTL=$(echo "$KEYSPACE_INFO" | sed -n 's/.*avg_ttl=\([0-9]*\).*/\1/p')
    AVG_TTL_MIN=$(awk "BEGIN {printf \"%.1f\", $AVG_TTL/60}")
else
    KEYS_WITH_TTL="0"
    AVG_TTL_MIN="N/A"
fi

if [ "$JSON_OUTPUT" = false ]; then
    print_metric "Total Keys" "$KEY_COUNT"
    print_metric "Keys with TTL" "$KEYS_WITH_TTL"
    print_metric "Average TTL" "${AVG_TTL_MIN} minutes"
fi

# 4. Container Health
print_header ""
print_header "🏥 Container Status:"

CONTAINER_STATUS=$(docker compose -f "$COMPOSE_FILE" ps workspace-redis --format json | jq -r '.State')
CONTAINER_HEALTH=$(docker compose -f "$COMPOSE_FILE" ps workspace-redis --format json | jq -r '.Health // "N/A"')

if [ "$JSON_OUTPUT" = false ]; then
    print_metric "State" "$CONTAINER_STATUS"
    print_metric "Health" "$CONTAINER_HEALTH"

    if [ "$CONTAINER_STATUS" = "running" ] && [ "$CONTAINER_HEALTH" = "healthy" ]; then
        echo -e "  ✅ ${GREEN}Container is healthy${NC}"
    else
        print_warning "Container health check failed or not configured"
    fi
fi

# 5. Eviction Statistics
print_header ""
print_header "🗑️  Eviction Stats:"

EVICTED_KEYS=$(echo "$STATS" | grep evicted_keys | cut -d: -f2 | tr -d '\r')
if [ -z "$EVICTED_KEYS" ]; then
    EVICTED_KEYS=0
fi

if [ "$JSON_OUTPUT" = false ]; then
    print_metric "Evicted Keys" "$EVICTED_KEYS"

    if [ "$EVICTED_KEYS" -gt 100 ]; then
        print_warning "High eviction rate - consider increasing maxmemory"
    elif [ "$EVICTED_KEYS" -gt 0 ]; then
        echo -e "  ℹ️  Some keys evicted (normal under memory pressure)"
    else
        echo -e "  ✅ ${GREEN}No evictions (plenty of memory)${NC}"
    fi
fi

# ==============================================================================
# JSON Output
# ==============================================================================

if [ "$JSON_OUTPUT" = true ]; then
    cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "status": "healthy",
  "cache": {
    "total_requests": $TOTAL,
    "hits": $HITS,
    "misses": $MISSES,
    "hit_rate": $HIT_RATE
  },
  "memory": {
    "used": "$USED_MEMORY",
    "max": "$MAX_MEMORY",
    "percent": $MEMORY_PERCENT
  },
  "keys": {
    "total": $KEY_COUNT,
    "with_ttl": $KEYS_WITH_TTL,
    "avg_ttl_minutes": $AVG_TTL_MIN
  },
  "container": {
    "state": "$CONTAINER_STATUS",
    "health": "$CONTAINER_HEALTH"
  },
  "evictions": {
    "total": $EVICTED_KEYS
  }
}
EOF
else
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${GREEN}✅ Health check complete${NC}"
    echo -e "${BLUE}================================================================${NC}"
fi
