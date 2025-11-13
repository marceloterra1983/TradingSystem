#!/bin/bash
set -e

echo "🔄 TradingSystem Dev Container - Post-Start"
echo "==========================================="

# Check Docker connection
echo "🐳 Checking Docker connection..."
if ! docker ps >/dev/null 2>&1; then
    echo "⚠️  Docker not available"
    exit 0
fi
echo "✅ Docker connection successful"

# Check workspace
cd /workspace

# Verify node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found"
fi

# Verify Python venv
if [ ! -d "venv" ]; then
    echo "⚠️  Python venv not found"
fi

# ============================================================================
# Auto-start TradingSystem Stacks
# ============================================================================

echo ""
echo "🚀 TradingSystem Stacks Management"
echo "=================================="

# Check if stacks are already running
GATEWAY_RUNNING=$(docker ps --filter "name=api-gateway" --format "{{.Names}}" 2>/dev/null | wc -l)

if [ "$GATEWAY_RUNNING" -gt 0 ]; then
    echo "✅ Stacks already running"
    docker ps --format "table {{.Names}}\t{{.Status}}" | head -15
    exit 0
fi

# Define essential stacks (always start)
ESSENTIAL_STACKS=(
    "docker-compose.0-gateway-stack.yml"
    "docker-compose.5-0-database-stack.yml"
    "docker-compose.4-3-workspace-stack.yml"
    "docker-compose.1-dashboard-stack.yml"
    "docker-compose.2-docs-stack.yml"
)

# Define optional stacks (start if AUTOSTART_OPTIONAL_STACKS is set)
OPTIONAL_STACKS=(
    "docker-compose.4-1-tp-capital-stack.yml"
    "docker-compose.6-1-monitoring-stack.yml"
    "docker-compose-5-1-n8n-stack.yml"
    "docker-compose.5-7-firecrawl-stack.yml"
)

# Read configuration from .env or environment
AUTOSTART_OPTIONAL="${AUTOSTART_OPTIONAL_STACKS:-false}"

echo "⚙️  Configuration:"
echo "  Essential stacks: ${#ESSENTIAL_STACKS[@]}"
echo "  Optional stacks: ${#OPTIONAL_STACKS[@]}"
echo "  Auto-start optional: $AUTOSTART_OPTIONAL"
echo ""

# Function to start a stack
start_stack() {
    local stack_file="$1"
    local stack_name=$(basename "$stack_file" .yml)
    
    if [ ! -f "tools/compose/$stack_file" ]; then
        echo "  ⚠️  Skipping $stack_name (file not found)"
        return 1
    fi
    
    echo "  🚀 Starting: $stack_name..."
    if docker compose -f "tools/compose/$stack_file" up -d 2>&1 | grep -v "Container.*Running"; then
        echo "     ✅ Started"
        return 0
    else
        echo "     ⚠️  Failed or already running"
        return 1
    fi
}

# Start essential stacks
echo "📦 Starting Essential Stacks:"
echo "=============================="
STARTED_COUNT=0
for stack in "${ESSENTIAL_STACKS[@]}"; do
    if start_stack "$stack"; then
        STARTED_COUNT=$((STARTED_COUNT + 1))
    fi
    sleep 2
done

# Start optional stacks if enabled
if [ "$AUTOSTART_OPTIONAL" = "true" ]; then
    echo ""
    echo "📦 Starting Optional Stacks:"
    echo "============================="
    for stack in "${OPTIONAL_STACKS[@]}"; do
        if start_stack "$stack"; then
            STARTED_COUNT=$((STARTED_COUNT + 1))
        fi
        sleep 2
    done
else
    echo ""
    echo "ℹ️  Optional stacks not started (set AUTOSTART_OPTIONAL_STACKS=true to enable)"
fi

# Wait for services to initialize
echo ""
echo "⏳ Waiting for services to initialize (15 seconds)..."
sleep 15

# Show status
echo ""
echo "📊 Container Status:"
echo "===================="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(NAMES|api-gateway|dashboard|docs|workspace|dbui|tp-capital|prometheus|grafana)" | head -20

# Health summary
TOTAL=$(docker ps --format "{{.Names}}" | wc -l)
HEALTHY=$(docker ps --filter "health=healthy" --format "{{.Names}}" | wc -l)
UNHEALTHY=$(docker ps --filter "health=unhealthy" --format "{{.Names}}" | wc -l)

echo ""
echo "📈 Summary:"
echo "  Stacks started: $STARTED_COUNT"
echo "  Total containers: $TOTAL"
echo "  Healthy: $HEALTHY"
echo "  Unhealthy: $UNHEALTHY"

if [ "$UNHEALTHY" -gt 0 ]; then
    echo ""
    echo "⚠️  Unhealthy containers:"
    docker ps --filter "health=unhealthy" --format "  - {{.Names}}: {{.Status}}"
    echo ""
    echo "💡 Tip: Check logs with: docker logs <container-name>"
fi

echo ""
echo "✅ Post-start completed!"
echo ""
echo "🎯 Quick Commands:"
echo "  npm run start     - Start all services"
echo "  npm run stop      - Stop all services"
echo "  dc ps             - Check containers"
