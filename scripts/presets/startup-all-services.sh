#!/bin/bash
# TradingSystem Universal Startup
# Starts all Docker services and Node.js applications

set -e

DASHBOARD_PORT="${DASHBOARD_PORT:-9080}"
PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "🚀 TRADINGSYSTEM - COMPLETE STARTUP"
echo "=========================================="
echo ""

# Step 1: Docker Services
echo "1️⃣ Starting Docker Services..."
echo ""

echo "   📦 RAG Services Stack..."
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d
echo "   ✅ RAG Services started"
echo ""

echo "   📦 Documentation Hub..."
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d 2>/dev/null || echo "   ⚠️  Docs hub already running or build error"
echo ""

echo "   ⚡ TP Capital Stack..."
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d 2>/dev/null || echo "   ⚠️  TP Capital pode ter dependências pendentes"
echo ""

echo "   📦 Monitoring Stack..."
docker compose -f tools/compose/docker-compose.6-1-monitoring-stack.yml up -d 2>/dev/null || echo "   ⚠️  Monitoring optional"
echo ""

# Step 2: Wait for Docker services
echo "2️⃣ Waiting for Docker services to initialize (20s)..."
sleep 20
echo "   ✅ Docker services should be ready"
echo ""

# Step 3: Check running containers
echo "3️⃣ Services Status:"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(NAMES|rag-|docs-|tp-capital-|prometheus|grafana)" | head -20
echo ""

# Step 4: Node.js Services
echo "4️⃣ Starting Node.js Services..."
echo ""

# Dashboard (Port)
echo "   🎨 Starting Dashboard (${DASHBOARD_PORT})..."
if ! lsof -ti:${DASHBOARD_PORT} > /dev/null 2>&1; then
    cd "$PROJECT_ROOT/frontend/dashboard"
    npm run dev > /tmp/dashboard.log 2>&1 &
    echo $! > /tmp/dashboard.pid
    echo "   ✅ Dashboard starting (PID: $(cat /tmp/dashboard.pid))"
else
    echo "   ⚠️  Port ${DASHBOARD_PORT} already in use"
fi
cd "$PROJECT_ROOT"
echo ""

# Step 5: Wait for Node services
echo "5️⃣ Waiting for Node.js services (15s)..."
sleep 15
echo "   ✅ Services should be ready"
echo ""

# Step 6: Health Checks
echo "6️⃣ Health Checks:"
echo ""

echo "   📊 Dashboard (${DASHBOARD_PORT}):"
curl -s http://localhost:${DASHBOARD_PORT} > /dev/null 2>&1 && echo "      ✅ Healthy" || echo "      ⚠️  Not ready yet"

echo "   📊 Documentation Hub (3400):"
curl -s http://localhost:3400 > /dev/null 2>&1 && echo "      ✅ Healthy" || echo "      ⚠️  Not ready (Docker build error)"

echo "   📊 RAG Service (3402):"
curl -s http://localhost:3402/health > /dev/null 2>&1 && echo "      ✅ Healthy" || echo "      ⚠️  Not ready"

echo "   📊 LlamaIndex Query (8202):"
curl -s http://localhost:8202/health > /dev/null 2>&1 && echo "      ✅ Healthy ($(curl -s http://localhost:8202/health | jq -r '.vectors') vectors)" || echo "      ⚠️  Not ready"

echo "   📊 Qdrant (6333):"
curl -s http://localhost:6333 > /dev/null 2>&1 && echo "      ✅ Healthy ($(curl -s http://localhost:6333/collections/documentation | jq -r '.result.vectors_count') vectors)" || echo "      ⚠️  Not ready"

echo "   📊 Redis (6380):"
docker exec rag-redis redis-cli ping > /dev/null 2>&1 && echo "      ✅ Healthy" || echo "      ⚠️  Not ready"

echo ""

# Summary
echo "=========================================="
echo "✅ TRADINGSYSTEM STARTUP COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Access Points:"
echo "   Dashboard:        http://localhost:9080"
echo "   Documentation:    http://localhost:3400"
echo "   RAG Service:      http://localhost:3402"
echo "   LlamaIndex:       http://localhost:8202"
echo "   Qdrant:           http://localhost:6333"
echo "   Prometheus:       http://localhost:9090"
echo "   Grafana:          http://localhost:3030"
echo ""
echo "📊 Check detailed status:"
echo "   bash scripts/maintenance/health-check-all.sh"
echo ""
echo "📋 View logs:"
echo "   Dashboard:   tail -f /tmp/dashboard.log"
echo "   RAG Service: docker logs -f rag-service"
echo ""
echo "=========================================="
