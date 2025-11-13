#!/bin/bash
set -e

echo "🚀 Starting ALL TradingSystem Stacks"
echo "===================================="
echo ""

# Define all stacks in order
STACKS=(
    "docker-compose.0-gateway-stack.yml"
    "docker-compose.5-0-database-stack.yml"
    "docker-compose.4-3-workspace-stack.yml"
    "docker-compose.1-dashboard-stack.yml"
    "docker-compose.2-docs-stack.yml"
    "docker-compose.4-1-tp-capital-stack.yml"
    "docker-compose.4-2-telegram-stack.yml"
    "docker-compose.4-4-rag-stack.yml"
    "docker-compose.4-5-course-crawler-stack.yml"
    "docker-compose-5-1-n8n-stack.yml"
    "docker-compose.5-2-evolution-api-stack.yml"
    "docker-compose.5-3-waha-stack.yml"
    "docker-compose.5-5-kestra-stack.yml"
    "docker-compose.5-7-firecrawl-stack.yml"
    "docker-compose.6-1-monitoring-stack.yml"
)

TOTAL=${#STACKS[@]}
CURRENT=0
STARTED=0
FAILED=0

for stack in "${STACKS[@]}"; do
    CURRENT=$((CURRENT + 1))
    STACK_NAME=$(basename "$stack" .yml)
    
    printf "[%2d/%2d] Starting %-50s" "$CURRENT" "$TOTAL" "$STACK_NAME"
    
    if docker compose -f "tools/compose/$stack" up -d 2>&1 | grep -q "Started\|Running\|Created"; then
        echo " ✅"
        STARTED=$((STARTED + 1))
    else
        echo " ⚠️"
        FAILED=$((FAILED + 1))
    fi
    
    sleep 2
done

echo ""
echo "⏳ Waiting for services to stabilize (15 seconds)..."
sleep 15

echo ""
echo "�� Final Status:"
echo "================"
docker ps --format "table {{.Names}}\t{{.Status}}" | head -50

TOTAL_CONTAINERS=$(docker ps | wc -l)
echo ""
echo "📈 Summary:"
echo "  Stacks started: $STARTED/$TOTAL"
echo "  Total containers: $((TOTAL_CONTAINERS - 1))"

if [ "$FAILED" -gt 0 ]; then
    echo "  Failed: $FAILED"
fi

echo ""
echo "✅ All stacks started!"
