#!/bin/bash
#
# Restart Evolution API Stack
# This script stops and restarts the Evolution API stack with proper configuration
#

set -euo pipefail

COMPOSE_FILE="/workspace/tools/compose/docker-compose.5-2-evolution-api-stack.yml"

echo "🔄 Restarting Evolution API Stack..."
echo

# Stop all Evolution services
echo "⏸️  Stopping Evolution services..."
cd /workspace/tools/compose
docker compose -f docker-compose.5-2-evolution-api-stack.yml down

# Start with --force-recreate to ensure fresh start
echo
echo "🚀 Starting Evolution services..."
docker compose -f docker-compose.5-2-evolution-api-stack.yml up -d --force-recreate

echo
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check status
echo
echo "📊 Service Status:"
docker compose -f docker-compose.5-2-evolution-api-stack.yml ps

echo
echo "✅ Evolution API Stack restart complete!"
echo
echo "Access URLs:"
echo "  - Evolution API: http://localhost:4100"
echo "  - Evolution Manager: http://localhost:4203"
echo "  - MinIO Console: http://localhost:9311"
echo
