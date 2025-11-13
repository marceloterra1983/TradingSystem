#!/bin/bash
# Stop all external Docker stacks before starting dev container
# Run this script on the HOST (not inside dev container)

set -e

echo "🛑 Stopping All External TradingSystem Stacks"
echo "=============================================="
echo ""

cd /home/marce/Projetos/TradingSystem

# List of compose files to stop (in reverse order of dependencies)
COMPOSE_FILES=(
    "tools/compose/docker-compose.1-dashboard-stack.yml"
    "tools/compose/docker-compose.2-docs-stack.yml"
    "tools/compose/docker-compose.4-3-workspace-stack.yml"
    "tools/compose/docker-compose.5-0-database-stack.yml"
    "tools/compose/docker-compose.0-gateway-stack.yml"
)

echo "Stopping Docker Compose stacks..."
echo ""

for file in "${COMPOSE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📦 Stopping: $file"
        docker compose -f "$file" down 2>/dev/null || echo "  (already stopped or not found)"
    fi
done

echo ""
echo "Checking for remaining TradingSystem containers..."
docker ps -a --filter "label=com.tradingsystem.stack" --format "table {{.Names}}\t{{.Status}}" || echo "No TradingSystem containers found"

echo ""
echo "✅ All external stacks stopped!"
echo ""
echo "Next steps:"
echo "  1. Rebuild dev container: VSCode → Dev Containers: Rebuild Container"
echo "  2. Services will start automatically inside dev container"
