#!/bin/bash
# Diagnose dev container connectivity issues
# Run this script on the HOST (not inside dev container)

set -e

CONTAINER_NAME="tradingsystem_devcontainer-app-1"
GATEWAY_NAME="api-gateway"

echo "🔍 TradingSystem Dev Container Connectivity Diagnostics"
echo "=========================================================="
echo ""

# Check if containers exist
echo "1️⃣ Checking containers..."
echo ""

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ Dev container is running"
else
    echo "❌ Dev container is NOT running!"
    exit 1
fi

if docker ps --format '{{.Names}}' | grep -q "^${GATEWAY_NAME}$"; then
    echo "✅ API Gateway is running"
    GATEWAY_EXISTS=true
else
    echo "⚠️  API Gateway is NOT running!"
    GATEWAY_EXISTS=false
fi

echo ""

# Check networks
echo "2️⃣ Checking networks..."
echo ""

NETWORKS=("tradingsystem_backend" "tradingsystem_frontend" "tradingsystem_monitoring")

for network in "${NETWORKS[@]}"; do
    if docker network ls --format '{{.Name}}' | grep -q "^${network}$"; then
        echo "✅ Network ${network} exists"

        # Count containers in network
        COUNT=$(docker network inspect "${network}" -f '{{range .Containers}}{{.Name}}{{"\n"}}{{end}}' | wc -l)
        echo "   └─ Contains ${COUNT} containers"

        # Check if dev container is in network
        if docker network inspect "${network}" -f '{{range .Containers}}{{.Name}}{{"\n"}}{{end}}' | grep -q "^${CONTAINER_NAME}$"; then
            echo "   └─ ✅ Dev container connected"
        else
            echo "   └─ ❌ Dev container NOT connected"
        fi
    else
        echo "❌ Network ${network} does NOT exist"
    fi
done

echo ""

# Check gateway network membership
if [ "$GATEWAY_EXISTS" = true ]; then
    echo "3️⃣ Checking API Gateway network membership..."
    echo ""

    GATEWAY_NETWORKS=$(docker inspect "${GATEWAY_NAME}" --format '{{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}')
    echo "Gateway is in networks: ${GATEWAY_NETWORKS}"

    for network in "${NETWORKS[@]}"; do
        if echo "$GATEWAY_NETWORKS" | grep -q "$network"; then
            echo "   ✅ Gateway in ${network}"
        else
            echo "   ⚠️  Gateway NOT in ${network}"
        fi
    done

    echo ""
fi

# Get IP addresses
echo "4️⃣ IP Address Mapping..."
echo ""

echo "Dev Container IPs:"
docker inspect "${CONTAINER_NAME}" --format '{{range $key, $value := .NetworkSettings.Networks}}  {{$key}}: {{$value.IPAddress}}{{"\n"}}{{end}}'

if [ "$GATEWAY_EXISTS" = true ]; then
    echo ""
    echo "API Gateway IPs:"
    docker inspect "${GATEWAY_NAME}" --format '{{range $key, $value := .NetworkSettings.Networks}}  {{$key}}: {{$value.IPAddress}}{{"\n"}}{{end}}'
fi

echo ""

# Test connectivity from dev container
echo "5️⃣ Testing connectivity from dev container..."
echo ""

if [ "$GATEWAY_EXISTS" = true ]; then
    echo "Testing HTTP connection to api-gateway:9080..."
    if docker exec "${CONTAINER_NAME}" sh -c 'timeout 2 curl -s http://api-gateway:9080 > /dev/null' 2>/dev/null; then
        echo "✅ Successfully connected to api-gateway:9080"
    else
        echo "❌ Cannot connect to api-gateway:9080"

        # Try by IP
        GATEWAY_IP=$(docker inspect "${GATEWAY_NAME}" --format '{{range $key, $value := .NetworkSettings.Networks}}{{if eq $key "tradingsystem_backend"}}{{$value.IPAddress}}{{end}}{{end}}')
        if [ -n "$GATEWAY_IP" ]; then
            echo ""
            echo "Trying by IP (${GATEWAY_IP}:9080)..."
            if docker exec "${CONTAINER_NAME}" sh -c "timeout 2 curl -s http://${GATEWAY_IP}:9080 > /dev/null" 2>/dev/null; then
                echo "✅ Successfully connected via IP"
                echo "⚠️  DNS resolution may be the issue"
            else
                echo "❌ Cannot connect via IP either"
                echo "⚠️  Network routing may be the issue"
            fi
        fi
    fi

    echo ""
    echo "Testing DNS resolution..."
    if docker exec "${CONTAINER_NAME}" sh -c 'timeout 2 nslookup api-gateway 2>/dev/null' > /dev/null 2>&1; then
        echo "✅ DNS resolution working"
    else
        echo "⚠️  DNS resolution may not be working"
    fi
else
    echo "⚠️  Skipping connectivity test - API Gateway not running"
fi

echo ""

# Summary and recommendations
echo "📋 Summary & Recommendations"
echo "============================="
echo ""

if [ "$GATEWAY_EXISTS" = false ]; then
    echo "❌ ISSUE: API Gateway is not running"
    echo ""
    echo "Solution:"
    echo "  1. Start the gateway stack:"
    echo "     cd /home/marce/Projetos/TradingSystem"
    echo "     docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d"
    echo ""
    echo "  2. Re-run this script to verify"
    exit 1
fi

# Check if all networks are connected
MISSING_NETWORKS=()
for network in "${NETWORKS[@]}"; do
    if ! docker network inspect "${network}" -f '{{range .Containers}}{{.Name}}{{"\n"}}{{end}}' | grep -q "^${CONTAINER_NAME}$"; then
        MISSING_NETWORKS+=("$network")
    fi
done

if [ ${#MISSING_NETWORKS[@]} -gt 0 ]; then
    echo "❌ ISSUE: Dev container not connected to all networks"
    echo ""
    echo "Missing networks: ${MISSING_NETWORKS[*]}"
    echo ""
    echo "Solution:"
    echo "  bash .devcontainer/scripts/reconnect-networks.sh"
    echo ""
    exit 1
fi

# Check if gateway is in shared networks
GATEWAY_MISSING=false
for network in "${NETWORKS[@]}"; do
    if ! docker inspect "${GATEWAY_NAME}" --format '{{range $key, $value := .NetworkSettings.Networks}}{{$key}}{{"\n"}}{{end}}' | grep -q "^${network}$"; then
        echo "⚠️  Gateway not in ${network}"
        GATEWAY_MISSING=true
    fi
done

if [ "$GATEWAY_MISSING" = true ]; then
    echo ""
    echo "❌ ISSUE: API Gateway not connected to all TradingSystem networks"
    echo ""
    echo "Solution:"
    echo "  This is likely a compose configuration issue."
    echo "  Check tools/compose/docker-compose.0-gateway-stack.yml"
    echo ""
    exit 1
fi

echo "✅ All checks passed!"
echo ""
echo "If you still cannot connect from inside the dev container:"
echo "  1. Restart the dev container:"
echo "     VSCode → Command Palette → 'Dev Containers: Rebuild Container'"
echo ""
echo "  2. Check firewall rules"
echo ""
echo "  3. Try accessing via browser: http://localhost:9080"
