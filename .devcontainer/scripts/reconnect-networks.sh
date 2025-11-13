#!/bin/bash
# Reconnect dev container to TradingSystem networks
# This script should be run from the HOST (not inside dev container)

set -e

CONTAINER_NAME="tradingsystem_devcontainer-app-1"

echo "🔗 Reconnecting Dev Container to TradingSystem Networks"
echo "========================================================"
echo ""

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container ${CONTAINER_NAME} not found!"
    echo ""
    echo "Available containers:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "⚠️  Container ${CONTAINER_NAME} is not running!"
    echo ""
    echo "Starting container..."
    docker start "${CONTAINER_NAME}"
    sleep 2
fi

# Networks to connect
NETWORKS=(
    "tradingsystem_backend"
    "tradingsystem_frontend"
    "tradingsystem_monitoring"
)

echo "Connecting to networks..."
echo ""

for network in "${NETWORKS[@]}"; do
    # Check if network exists
    if ! docker network ls --format '{{.Name}}' | grep -q "^${network}$"; then
        echo "⚠️  Network ${network} does not exist - creating..."
        docker network create "${network}" || true
    fi

    # Check if already connected
    if docker network inspect "${network}" -f '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null | grep -q "${CONTAINER_NAME}"; then
        echo "✅ ${network} - already connected"
    else
        echo "🔌 ${network} - connecting..."
        docker network connect "${network}" "${CONTAINER_NAME}" 2>/dev/null || echo "   ⚠️  Failed to connect (may already be connected)"
    fi
done

echo ""
echo "✅ Network reconnection complete!"
echo ""
echo "Verifying connectivity..."
docker exec "${CONTAINER_NAME}" sh -c 'timeout 2 curl -s http://api-gateway:9080 > /dev/null && echo "✅ Can reach API Gateway" || echo "❌ Cannot reach API Gateway"'

echo ""
echo "Current networks for ${CONTAINER_NAME}:"
docker inspect "${CONTAINER_NAME}" --format '{{range $key, $value := .NetworkSettings.Networks}}  - {{$key}}{{"\n"}}{{end}}'
