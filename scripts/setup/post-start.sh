#!/bin/bash
set -e

echo "🔄 TradingSystem Dev Container - Post-Start"
echo "==========================================="

# Check Docker
if ! docker ps >/dev/null 2>&1; then
    echo "⚠️  Docker not available"
    exit 0
fi

cd /workspace

# Check if already running
if docker ps --filter "name=api-gateway" --format "{{.Names}}" | grep -q "api-gateway"; then
    echo "✅ Stacks already running"
    docker ps --format "table {{.Names}}\t{{.Status}}" | head -20
    exit 0
fi

echo "🚀 Starting all stacks..."
echo ""

# Start all stacks in order
STACKS=(
    "0-gateway" "5-0-database" "4-3-workspace" 
    "1-dashboard" "2-docs" "4-1-tp-capital"
    "4-2-telegram" "4-4-rag" "4-5-course-crawler"
    "5-1-n8n" "5-2-evolution-api" "5-3-waha"
    "5-5-kestra" "5-7-firecrawl" "6-1-monitoring"
)

for stack in "${STACKS[@]}"; do
    # Handle different naming patterns
    if [ -f "tools/compose/docker-compose.$stack-stack.yml" ]; then
        FILE="tools/compose/docker-compose.$stack-stack.yml"
    elif [ -f "tools/compose/docker-compose-$stack-stack.yml" ]; then
        FILE="tools/compose/docker-compose-$stack-stack.yml"
    else
        continue
    fi
    
    echo "  📦 Starting: $stack"
    docker compose -f "$FILE" up -d 2>&1 | grep -v "Container.*Running" || true
    sleep 1
done

echo ""
echo "⏳ Waiting 10 seconds..."
sleep 10

echo ""
echo "📊 Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | head -30

TOTAL=$(docker ps | wc -l)
echo ""
echo "✅ $((TOTAL - 1)) containers running!"
