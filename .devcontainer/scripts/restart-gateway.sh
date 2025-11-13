#!/bin/bash
# Restart API Gateway with updated configuration
# Run this script on the HOST (not inside dev container)

set -e

echo "🔄 Restarting API Gateway"
echo "========================="
echo ""

cd /home/marce/Projetos/TradingSystem

echo "1️⃣ Stopping current gateway..."
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml down

echo ""
echo "2️⃣ Starting gateway with new configuration..."
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d

echo ""
echo "3️⃣ Waiting for gateway to be healthy..."
sleep 5

for i in {1..10}; do
    if docker inspect api-gateway --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
        echo "✅ Gateway is healthy!"
        break
    fi
    echo "  Waiting... ($i/10)"
    sleep 2
done

echo ""
echo "4️⃣ Testing connectivity..."
echo ""

# Test from host
echo "From host (localhost:9080):"
if timeout 3 curl -s http://localhost:9080 > /dev/null 2>&1; then
    echo "  ✅ Responding"
else
    echo "  ❌ Not responding"
fi

# Get gateway IP
GATEWAY_IP=$(docker inspect api-gateway --format '{{range .NetworkSettings.Networks}}{{if eq .NetworkMode "tradingsystem_backend"}}{{.IPAddress}}{{end}}{{end}}' | head -1)
if [ -z "$GATEWAY_IP" ]; then
    GATEWAY_IP=$(docker inspect api-gateway --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | head -1)
fi

echo ""
echo "From network (${GATEWAY_IP}:9080):"
if timeout 3 curl -s "http://${GATEWAY_IP}:9080" > /dev/null 2>&1; then
    echo "  ✅ Responding"
else
    echo "  ❌ Not responding"
fi

echo ""
echo "5️⃣ Showing gateway logs..."
docker logs --tail 20 api-gateway

echo ""
echo "✅ Gateway restart complete!"
echo ""
echo "Access points:"
echo "  - Host: http://localhost:9080"
echo "  - Network: http://${GATEWAY_IP}:9080"
echo "  - Dashboard: http://localhost:9081/dashboard/"
