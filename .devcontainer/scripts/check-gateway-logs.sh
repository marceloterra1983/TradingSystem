#!/bin/bash
# Check API Gateway logs for errors
# Run this script on the HOST (not inside dev container)

set -e

GATEWAY_NAME="api-gateway"

echo "🔍 API Gateway Logs Analysis"
echo "=============================="
echo ""

# Check if container exists
if ! docker ps --format '{{.Names}}' | grep -q "^${GATEWAY_NAME}$"; then
    echo "❌ Container ${GATEWAY_NAME} is not running!"
    echo ""
    echo "Start it with:"
    echo "  cd /home/marce/Projetos/TradingSystem"
    echo "  docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d"
    exit 1
fi

echo "Container Status:"
docker ps --filter "name=${GATEWAY_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "Health Check:"
docker inspect "${GATEWAY_NAME}" --format '{{.State.Health.Status}}' 2>/dev/null || echo "No health check defined"
echo ""

echo "Last 50 lines of logs:"
echo "======================"
docker logs --tail 50 "${GATEWAY_NAME}" 2>&1

echo ""
echo ""
echo "Checking if Traefik is listening on port 9080..."
echo "================================================="

# Try to connect from inside the container
if docker exec "${GATEWAY_NAME}" sh -c 'command -v nc' > /dev/null 2>&1; then
    echo "Using netcat to test port..."
    docker exec "${GATEWAY_NAME}" nc -zv localhost 9080 2>&1 || echo "Port not listening"
elif docker exec "${GATEWAY_NAME}" sh -c 'command -v curl' > /dev/null 2>&1; then
    echo "Using curl to test port..."
    docker exec "${GATEWAY_NAME}" curl -s http://localhost:9080 > /dev/null && echo "✅ Port responding" || echo "❌ Port not responding"
else
    echo "⚠️  No network tools available in container"
fi

echo ""
echo "Port bindings (from Docker):"
docker port "${GATEWAY_NAME}" 2>/dev/null || echo "No ports exposed"

echo ""
echo "Network interfaces:"
docker exec "${GATEWAY_NAME}" sh -c 'ip addr show' 2>/dev/null | grep -E 'inet |UP' || echo "ip command not available"
