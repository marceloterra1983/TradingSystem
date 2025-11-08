#!/bin/bash
# ==============================================================================
# WhatsApp Gateway Stack - Startup Script
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.whatsapp.yml"

echo "🚀 Starting WhatsApp Gateway Stack..."

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "❌ Error: .env file not found in project root"
    echo "Please create .env file with required variables:"
    echo "  - WHATSAPP_DB_PASSWORD"
    echo "  - WHATSAPP_API_KEY"
    echo "  - WHATSAPP_GATEWAY_API_TOKEN"
    echo "  - WHATSAPP_MINIO_ROOT_PASSWORD"
    exit 1
fi

# Load environment
set -a
source "$PROJECT_ROOT/.env"
[ -f "$PROJECT_ROOT/.env.shared" ] && source "$PROJECT_ROOT/.env.shared"
set +a

# Check required env vars

required_vars=(
    "WHATSAPP_DB_PASSWORD"
    "WHATSAPP_API_KEY"
    "WHATSAPP_GATEWAY_API_TOKEN"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ Error: Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

# Create external network if it doesn't exist
echo "📡 Ensuring tradingsystem_backend network exists..."
docker network inspect tradingsystem_backend >/dev/null 2>&1 || \
    docker network create tradingsystem_backend

# Start the stack
echo "🐳 Starting Docker containers..."
docker compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."

services=(
    "whatsapp-timescale:whatsapp-timescaledb"
    "whatsapp-pgbouncer:whatsapp-pgbouncer"
    "whatsapp-redis:whatsapp-redis"
    "whatsapp-minio:whatsapp-minio"
)

for service_info in "${services[@]}"; do
    IFS=':' read -r container_name service_name <<< "$service_info"
    
    echo -n "  Waiting for $container_name... "
    
    timeout=60
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null | grep -q "healthy"; then
            echo "✅ healthy"
            break
        fi
        
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo "❌ timeout"
        echo "Service $container_name did not become healthy in time"
        docker logs "$container_name" --tail 50
        exit 1
    fi
done

echo ""
echo "✅ WhatsApp Gateway Stack started successfully!"
echo ""
echo "📋 Service URLs:"
echo "  - WhatsApp Core (WAHA):     http://localhost:${WHATSAPP_CORE_PORT:-3310}"
echo "  - Gateway API:              http://localhost:${WHATSAPP_GATEWAY_API_PORT:-4011}"
echo "  - TimescaleDB:              localhost:${WHATSAPP_DB_PORT:-5435}"
echo "  - PgBouncer:                localhost:${WHATSAPP_PGBOUNCER_PORT:-6435}"
echo "  - Redis:                    localhost:${WHATSAPP_REDIS_PORT:-6380}"
echo "  - MinIO API:                http://localhost:${WHATSAPP_MINIO_API_PORT:-9302}"
echo "  - MinIO Console:            http://localhost:${WHATSAPP_MINIO_CONSOLE_PORT:-9303}"
echo ""
echo "📝 Next steps:"
echo "  1. Access WhatsApp Core dashboard and create a session"
echo "  2. Scan QR code with WhatsApp mobile app"
echo "  3. Messages will be automatically synced to TimescaleDB"
echo ""
echo "🔍 View logs:"
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo ""

