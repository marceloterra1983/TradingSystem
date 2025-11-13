#!/bin/bash
# ==============================================================================
# Connect Dashboard to Service Networks
# ==============================================================================
# Connects the dashboard-ui container to service-specific Docker networks
# so it can proxy requests to embedded services (n8n, Evolution, WAHA, etc.)
#
# Usage: bash scripts/docker/connect-dashboard-to-service-networks.sh
# ==============================================================================

set -e

echo "🔗 Connecting dashboard-ui to service networks..."
echo ""

# Check if dashboard-ui is running
if ! docker ps --filter "name=dashboard-ui" --format "{{.Names}}" | grep -q "dashboard-ui"; then
    echo "❌ ERROR: dashboard-ui container is not running"
    echo "   Start it first: docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d"
    exit 1
fi

# Function to connect to network if exists
connect_to_network() {
    local network=$1

    echo -n "Checking network: $network... "

    # Check if network exists
    if ! docker network ls --format "{{.Name}}" | grep -q "^${network}$"; then
        echo "⚠️  SKIP (network doesn't exist)"
        return 0
    fi

    # Check if already connected
    if docker network inspect "$network" --format '{{range .Containers}}{{.Name}} {{end}}' | grep -q "dashboard-ui"; then
        echo "✅ ALREADY CONNECTED"
        return 0
    fi

    # Connect to network
    if docker network connect "$network" dashboard-ui 2>/dev/null; then
        echo "✅ CONNECTED"
    else
        echo "❌ FAILED"
        return 1
    fi
}

# List of service networks
NETWORKS=(
    "n8n_backend"
    "evolution_backend"
    "waha_backend"
    "5-7-firecrawl-stack_firecrawl_backend"
)

echo "Networks to connect:"
for network in "${NETWORKS[@]}"; do
    echo "  - $network"
done
echo ""

# Connect to each network
SUCCESS=0
SKIPPED=0
FAILED=0

for network in "${NETWORKS[@]}"; do
    if connect_to_network "$network"; then
        if docker network inspect "$network" --format '{{range .Containers}}{{.Name}} {{end}}' | grep -q "dashboard-ui"; then
            ((SUCCESS++))
        else
            ((SKIPPED++))
        fi
    else
        ((FAILED++))
    fi
done

echo ""
echo "=========================================="
echo "📊 Summary"
echo "=========================================="
echo "Connected: $SUCCESS"
echo "Skipped:   $SKIPPED"
echo "Failed:    $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ Dashboard connected to all available service networks"
    echo ""
    echo "Verify with:"
    echo "  docker ps --filter 'name=dashboard-ui' --format '{{.ID}}' | xargs docker inspect --format '{{range \$net, \$conf := .NetworkSettings.Networks}}{{\$net}} {{end}}'"
    exit 0
else
    echo "⚠️  Some network connections failed"
    echo "   Check logs above for details"
    exit 1
fi
