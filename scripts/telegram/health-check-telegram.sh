#!/bin/bash
# ==============================================================================
# Telegram Stack Comprehensive Health Check
# ==============================================================================

set -e

# Load project .env so DB credentials/ports are available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "⚠️  Warning: .env file not found at $ENV_FILE; using default credentials." >&2
fi

# Parse arguments
FORMAT="text"
if [ "$1" == "--format" ] && [ "$2" == "json" ]; then
  FORMAT="json"
fi

# Colors (only for text format)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health check results
declare -A HEALTH
OVERALL_HEALTHY=true

# Helper to run psql through PgBouncer from the host
psql_through_pgbouncer() {
  local target_db=$1
  shift
  local password="${TELEGRAM_DB_PASSWORD:-}"
  local user="${TELEGRAM_DB_USER:-telegram}"
  local port="${TELEGRAM_PGBOUNCER_PORT:-6434}"

  if [ -n "$password" ]; then
    PGPASSWORD="$password" psql -h localhost -p "$port" -U "$user" -d "$target_db" "$@"
  else
    psql -h localhost -p "$port" -U "$user" -d "$target_db" "$@"
  fi
}

# ==============================================================================
# Check Native Service
# ==============================================================================
check_systemd() {
  local mtproto_url="http://localhost:${GATEWAY_PORT:-4006}/health"
  if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet telegram-gateway; then
    HEALTH["mtproto_service"]="healthy"
    return
  fi

  if curl -s -f "$mtproto_url" >/dev/null 2>&1; then
    HEALTH["mtproto_service"]="healthy (http)"
  else
    HEALTH["mtproto_service"]="unhealthy"
    OVERALL_HEALTHY=false
  fi
}

# ==============================================================================
# Check Docker Containers
# ==============================================================================
check_containers() {
  containers=(
    "telegram-timescale"
    "telegram-pgbouncer"
    "telegram-redis-master"
    "telegram-redis-replica"
    "telegram-redis-sentinel"
    "telegram-rabbitmq"
    "telegram-gateway-api"
  )
  
  for container in "${containers[@]}"; do
    if docker ps --filter "name=$container" --filter "health=healthy" | grep -q "$container"; then
      HEALTH["$container"]="healthy"
    elif docker ps --filter "name=$container" | grep -q "$container"; then
      HEALTH["$container"]="starting"
      OVERALL_HEALTHY=false
    else
      HEALTH["$container"]="stopped"
      OVERALL_HEALTHY=false
    fi
  done
}

# ==============================================================================
# Check Database Connectivity
# ==============================================================================
check_database() {
  if psql_through_pgbouncer telegram_gateway -c "SELECT 1" &>/dev/null; then
    HEALTH["database_connection"]="healthy"
    
    # Get connection pool stats
    POOL_STATS=$(psql_through_pgbouncer pgbouncer -t -c "SHOW POOLS" 2>/dev/null | grep -m 1 telegram_gateway || true)
    if [ -n "$POOL_STATS" ]; then
      ACTIVE_CONNS=$(echo "$POOL_STATS" | awk '{print $5}')
      HEALTH["database_active_connections"]=$ACTIVE_CONNS
    fi
  else
    HEALTH["database_connection"]="unhealthy"
    OVERALL_HEALTHY=false
  fi
}

# ==============================================================================
# Check Redis Cluster
# ==============================================================================
check_redis() {
  # Master
  if docker exec telegram-redis-master redis-cli ping | grep -q "PONG"; then
    HEALTH["redis_master"]="healthy"
    
    # Get memory usage
    MEM_USED=$(docker exec telegram-redis-master redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r\n ')
    HEALTH["redis_memory_used"]=$MEM_USED
  else
    HEALTH["redis_master"]="unhealthy"
    OVERALL_HEALTHY=false
  fi
  
  # Replica
  if docker exec telegram-redis-replica redis-cli ping | grep -q "PONG"; then
    HEALTH["redis_replica"]="healthy"
  else
    HEALTH["redis_replica"]="unhealthy"
    OVERALL_HEALTHY=false
  fi
}

# ==============================================================================
# Check HTTP Endpoints
# ==============================================================================
check_http_endpoints() {
  endpoints=(
    "mtproto_gateway:http://localhost:${GATEWAY_PORT:-4006}/health"
    "gateway_api:http://localhost:4010/health"
    "rabbitmq_mgmt:http://localhost:15672"
  )
  
  for entry in "${endpoints[@]}"; do
    IFS=':' read -r key url <<< "$entry"
    
    if curl -s -f "$url" &>/dev/null; then
      HEALTH["$key"]="healthy"
    else
      HEALTH["$key"]="unhealthy"
      OVERALL_HEALTHY=false
    fi
  done
}

# ==============================================================================
# Execute All Checks
# ==============================================================================
check_systemd
check_containers
check_database
check_redis
check_http_endpoints

# ==============================================================================
# Output Results
# ==============================================================================
if [ "$FORMAT" == "json" ]; then
  # JSON output
  echo "{"
  echo "  \"overallHealth\": \"$([ "$OVERALL_HEALTHY" == "true" ] && echo "healthy" || echo "unhealthy")\","
  echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\","
  echo "  \"services\": {"
  
  first=true
  for key in "${!HEALTH[@]}"; do
    if [ "$first" == "true" ]; then
      first=false
    else
      echo ","
    fi
    echo -n "    \"$key\": \"${HEALTH[$key]}\""
  done
  
  echo ""
  echo "  }"
  echo "}"
else
  # Text output
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Telegram Stack Health Check${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  
  for key in "${!HEALTH[@]}"; do
    status="${HEALTH[$key]}"
    
    if [[ "$status" == healthy* ]]; then
      echo -e "  ${GREEN}✓${NC} $key: $status"
    elif [[ "$status" =~ ^[0-9]+$ ]] || [[ "$status" =~ [A-Z] ]]; then
      echo -e "  ${BLUE}ℹ${NC} $key: $status"
    else
      echo -e "  ${RED}✗${NC} $key: $status"
    fi
  done
  
  echo ""
  if [ "$OVERALL_HEALTHY" == "true" ]; then
    echo -e "${GREEN}Overall Status: HEALTHY ✅${NC}"
  else
    echo -e "${RED}Overall Status: UNHEALTHY ❌${NC}"
  fi
  echo ""
fi

# Exit code
if [ "$OVERALL_HEALTHY" == "true" ]; then
  exit 0
else
  exit 1
fi
