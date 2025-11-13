#!/bin/bash

echo "🔴 Iniciando shutdown completo do TradingSystem..."
echo ""

cd /workspace/tools/compose

# Array de stacks na ordem reversa de startup
# Frontend → Apps → Backend → Databases → Monitoring
STACKS=(
    "docker-compose.0-gateway-stack.yml"
    "docker-compose.1-dashboard-stack.yml"
    "docker-compose.2-docs-stack.yml"
    "docker-compose.4-3-workspace-stack.yml"
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
    "docker-compose.5-0-database-stack.yml"
)

for stack in "${STACKS[@]}"; do
    if [ -f "$stack" ]; then
        echo "⏹️  Parando stack: $stack"
        docker compose -f "$stack" down 2>&1 | grep -E "(Removed|Stopped|not found)" || true
        echo ""
    fi
done

echo "✅ Shutdown completo!"
echo ""
echo "📊 Containers restantes:"
docker ps --format "table {{.Names}}\t{{.Status}}" || echo "   Nenhum container em execução"
