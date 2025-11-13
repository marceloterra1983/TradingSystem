#!/bin/bash
set -e

echo "🚀 Starting ALL remaining stacks..."
echo ""

cd /workspace

STACKS=(
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

for stack in "${STACKS[@]}"; do
    echo "Starting: $stack"
    docker compose -f "tools/compose/$stack" up -d 2>&1 | grep -E "Started|Created|Running" || true
    sleep 2
done

echo ""
echo "✅ Done! Waiting 20 seconds..."
sleep 20

echo ""
docker ps --format "table {{.Names}}\t{{.Status}}" | head -40
