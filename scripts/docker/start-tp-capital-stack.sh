#!/usr/bin/env bash
# ==============================================================================
# Start TP-Capital Stack with correct configuration
# ==============================================================================

set -euo pipefail

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.4-1-tp-capital-stack.yml"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "TP-Capital Stack Startup"
echo "=========================================="
echo ""

# Source .env to get passwords
set -a
source .env 2>/dev/null || true
set +a

# Override port to avoid conflicts
export TP_CAPITAL_DB_PORT=5437
export TP_CAPITAL_PGBOUNCER_PORT=6435
export TP_CAPITAL_REDIS_PORT=6381
export TP_CAPITAL_REDIS_REPLICA_PORT=6382

echo "Configuration:"
echo "  Database Port: $TP_CAPITAL_DB_PORT"
echo "  PgBouncer Port: $TP_CAPITAL_PGBOUNCER_PORT"
echo "  Redis Master Port: $TP_CAPITAL_REDIS_PORT"
echo "  Redis Replica Port: $TP_CAPITAL_REDIS_REPLICA_PORT"
echo ""

echo "Starting stack..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "=========================================="
echo "Checking status..."
echo "=========================================="
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "To view logs: docker compose -f $COMPOSE_FILE logs -f"
echo "To check health: curl http://localhost:4008/health"

