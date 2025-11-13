#!/bin/bash
# Fix network isolation between dev container and other services
# Run this script on the HOST (not inside dev container)

set -e

echo "🔧 Fixing Network Isolation"
echo "============================"
echo ""

# The issue: Docker networks have internal=true or isolation enabled
# Solution: Verify network configuration and recreate if needed

echo "1️⃣ Checking network configuration..."
echo ""

for network in tradingsystem_backend tradingsystem_frontend; do
    echo "Network: $network"

    # Check if network exists
    if ! docker network ls --format '{{.Name}}' | grep -q "^${network}$"; then
        echo "  ❌ Network does not exist!"
        continue
    fi

    # Check internal flag
    INTERNAL=$(docker network inspect "$network" --format '{{.Internal}}')
    echo "  Internal: $INTERNAL"

    # Check driver
    DRIVER=$(docker network inspect "$network" --format '{{.Driver}}')
    echo "  Driver: $DRIVER"

    # List containers
    echo "  Containers:"
    docker network inspect "$network" --format '{{range .Containers}}    - {{.Name}} ({{.IPv4Address}}){{"\n"}}{{end}}'

    echo ""
done

echo ""
echo "2️⃣ Testing connectivity between containers..."
echo ""

DEV_CONTAINER="tradingsystem_devcontainer-app-1"
GATEWAY="api-gateway"

# Test from dev container to gateway
echo "From dev container to gateway:"
if docker exec "$DEV_CONTAINER" sh -c "timeout 2 ping -c 1 172.20.0.12" > /dev/null 2>&1; then
    echo "  ✅ Ping successful"
else
    echo "  ❌ Ping failed"
fi

# Test from gateway to dev container
echo ""
echo "From gateway to dev container:"
DEV_IP=$(docker inspect "$DEV_CONTAINER" --format '{{range .NetworkSettings.Networks}}{{if eq .NetworkName "tradingsystem_backend"}}{{.IPAddress}}{{end}}{{end}}')
if [ -n "$DEV_IP" ]; then
    echo "  Dev container IP: $DEV_IP"
    if docker exec "$GATEWAY" sh -c "timeout 2 ping -c 1 $DEV_IP" > /dev/null 2>&1; then
        echo "  ✅ Ping successful"
    else
        echo "  ❌ Ping failed"
    fi
else
    echo "  ⚠️  Could not determine dev container IP"
fi

echo ""
echo "3️⃣ Checking Docker network driver options..."
echo ""

# Check if ICC (Inter-Container Communication) is disabled
for network in tradingsystem_backend tradingsystem_frontend; do
    echo "Network: $network"
    docker network inspect "$network" --format '{{json .Options}}' | jq . 2>/dev/null || echo "  No special options"
    echo ""
done

echo ""
echo "4️⃣ Recommendation"
echo "=================="
echo ""

echo "The issue is likely due to network isolation settings."
echo ""
echo "Possible causes:"
echo "  1. Docker daemon has ICC (Inter-Container Communication) disabled"
echo "  2. Network has 'internal: true' flag"
echo "  3. Firewall rules blocking container-to-container traffic"
echo ""
echo "Solutions:"
echo "  1. Check Docker daemon.json for 'icc: false'"
echo "  2. Recreate networks without 'internal' flag"
echo "  3. Enable ICC in Docker daemon settings"
echo ""
echo "Quick fix - Recreate gateway on same network as dev container:"
echo "  docker network connect bridge api-gateway"
echo "  # Then test: docker exec $DEV_CONTAINER ping 172.17.0.X"
