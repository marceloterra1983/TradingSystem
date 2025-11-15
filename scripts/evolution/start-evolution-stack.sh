#!/bin/bash
#
# Start Evolution API Stack with Correct Port Bindings
# This script loads variables from .env and starts the stack
#

set -euo pipefail

COMPOSE_FILE="/workspace/tools/compose/docker-compose.5-2-evolution-api-stack.yml"
ENV_FILE="/workspace/.env"

echo "🚀 Starting Evolution API Stack..."
echo

# Load environment variables
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    exit 1
fi

echo "📋 Loading environment variables from $ENV_FILE..."
set -a
source "$ENV_FILE"
set +a

# Start the stack
echo
echo "▶️  Starting containers..."
cd /workspace/tools/compose
docker compose -f docker-compose.5-2-evolution-api-stack.yml up -d

echo
echo "⏳ Waiting for services to be healthy..."
sleep 20

# Check status
echo
echo "📊 Service Status:"
docker compose -f docker-compose.5-2-evolution-api-stack.yml ps

echo
echo "✅ Evolution API Stack started!"
echo
echo "🌐 Access URLs:"
echo "  - Evolution API: http://localhost:4100"
echo "  - Evolution Manager: http://localhost:4203"
echo "  - MinIO Console: http://localhost:9311"
echo "  - PostgreSQL: localhost:5437"
echo "  - Redis: localhost:6388"
echo
echo "🔑 API Key: \$EVOLUTION_API_GLOBAL_KEY"
echo
