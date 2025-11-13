#!/bin/bash
set -e

echo "🚀 Starting stacks in correct order"
echo "===================================="

# Grupo 1: Core infrastructure (sem dependências)
echo ""
echo "📦 Group 1: Core Infrastructure"
for stack in \
    "0-gateway" \
    "5-0-database"
do
    echo "  Starting: $stack"
    docker compose -f "tools/compose/docker-compose.$stack-stack.yml" up -d
    sleep 2
done

# Grupo 2: Workspace e UIs
echo ""
echo "📦 Group 2: Workspace & UIs"
for stack in \
    "4-3-workspace" \
    "1-dashboard" \
    "2-docs"
do
    echo "  Starting: $stack"
    docker compose -f "tools/compose/docker-compose.$stack-stack.yml" up -d
    sleep 2
done

# Grupo 3: Trading (com networks criadas)
echo ""
echo "📦 Group 3: Trading Systems"
for stack in \
    "4-1-tp-capital" \
    "4-2-telegram"
do
    echo "  Starting: $stack"
    docker compose -f "tools/compose/docker-compose.$stack-stack.yml" up -d 2>&1 | grep -v "already exists" || true
    sleep 2
done

# Grupo 4: AI/ML (portas podem conflitar, então separado)
echo ""
echo "📦 Group 4: AI/ML Systems"
echo "  Starting: rag-stack"
docker compose -f "tools/compose/docker-compose.4-4-rag-stack.yml" up -d 2>&1 | grep -v "address already in use" || true
sleep 3

# Grupo 5: Automation
echo ""
echo "📦 Group 5: Automation"
for stack in \
    "5-1-n8n" \
    "5-5-kestra"
do
    FILE=$(ls tools/compose/*$stack* 2>/dev/null | head -1)
    if [ -n "$FILE" ]; then
        echo "  Starting: $(basename $FILE)"
        docker compose -f "$FILE" up -d 2>&1 | grep -v "already exists" || true
        sleep 2
    fi
done

# Grupo 6: Messaging
echo ""
echo "📦 Group 6: Messaging"
for stack in \
    "5-2-evolution-api" \
    "5-3-waha"
do
    echo "  Starting: $stack"
    docker compose -f "tools/compose/docker-compose.$stack-stack.yml" up -d 2>&1 | grep -v "Conflict\|already in use" || true
    sleep 2
done

# Grupo 7: Tools
echo ""
echo "📦 Group 7: Tools"
echo "  Starting: firecrawl"
docker compose -f "tools/compose/docker-compose.5-7-firecrawl-stack.yml" up -d
sleep 2

echo "  Starting: monitoring"
docker compose -f "tools/compose/docker-compose.6-1-monitoring-stack.yml" up -d 2>&1 | grep -v "error mounting" || true

# Pular course-crawler por conflito de porta
echo ""
echo "⚠️  Skipping course-crawler (port 9876 conflict)"

echo ""
echo "⏳ Waiting 15 seconds for stabilization..."
sleep 15

echo ""
echo "📊 Final Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | head -40

TOTAL=$(docker ps | wc -l)
echo ""
echo "✅ Completed! $((TOTAL - 1)) containers running"
