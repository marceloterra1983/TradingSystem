#!/bin/bash
# Test if backend services are actually responding
# Run this script on the HOST (not inside dev container)

set -e

echo "🏥 Testing Backend Services Health"
echo "===================================="
echo ""

# Array of services to test
declare -A SERVICES=(
    ["workspace-api"]="3200:/api/health"
    ["dashboard-ui"]="3103:/health"
    ["docs-hub"]="80:/health"
    ["docs-api"]="3000:/health"
)

for service in "${!SERVICES[@]}"; do
    IFS=':' read -r port path <<< "${SERVICES[$service]}"

    echo "Testing $service..."

    # Check if container exists
    if ! docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        echo "  ❌ Container NOT running"
        echo ""
        continue
    fi

    # Get container IP
    IP=$(docker inspect "$service" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | head -1)
    echo "  Container: $service"
    echo "  IP: $IP"
    echo "  Port: $port"
    echo "  Path: $path"

    # Test from host
    echo -n "  Testing from host (localhost:$port$path): "
    if timeout 3 curl -sf "http://localhost:$port$path" > /dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "❌ FAILED"
    fi

    # Test from inside container
    echo -n "  Testing from inside container (localhost:$port$path): "
    if docker exec "$service" sh -c "timeout 2 curl -sf http://localhost:$port$path > /dev/null 2>&1" 2>/dev/null; then
        echo "✅ OK"
    else
        echo "❌ FAILED"
    fi

    # Test via IP from gateway
    echo -n "  Testing from gateway via IP ($IP:$port$path): "
    if docker exec api-gateway sh -c "timeout 2 curl -sf http://$IP:$port$path > /dev/null 2>&1" 2>/dev/null; then
        echo "✅ OK"
    else
        echo "❌ FAILED"
    fi

    # Check what's actually listening
    echo "  Listening ports in container:"
    docker exec "$service" sh -c 'netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null || echo "  No network tools available"' | grep LISTEN | head -5 | sed 's/^/    /'

    echo ""
done

echo ""
echo "📋 Summary"
echo "=========="
echo ""
echo "If services are failing:"
echo "  1. Check if services implement /health endpoint"
echo "  2. Verify correct port is exposed"
echo "  3. Check service logs: docker logs <service-name>"
echo "  4. Try alternative health check paths (/api/health, /healthz, etc.)"
