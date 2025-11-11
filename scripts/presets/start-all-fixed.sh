#!/bin/bash
# TradingSystem - START ALL (FIXED)
# Inicia TODOS os serviços na ordem correta

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "🚀 TRADINGSYSTEM - START ALL"
echo "=========================================="
echo ""

# 1. Database UI stack primeiro (ferramentas e QuestDB)
echo "1️⃣ Database UI Stack (pgAdmin/Adminer/QuestDB)..."
docker compose -p 4-0-database-ui-stack -f tools/compose/docker-compose.4-0-database-ui-stack.yml up -d
echo "   ✅ Database UI iniciando..."
sleep 20
echo ""

# 2. RAG Stack (depende de Qdrant)
echo "2️⃣ RAG Stack (6 serviços)..."
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d --scale llamaindex-ingestion=0
echo "   ✅ RAG iniciado (sem ingest)"
echo ""

# 3. Kong Gateway
echo "3️⃣ Kong Gateway..."
docker compose -f tools/compose/docker-compose.kong.yml up -d
echo "   ✅ Kong iniciado"
echo ""

# 4. DOCS Stack (depende de RAG + networks)
echo "4️⃣ DOCS Stack (2 serviços)..."
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d
echo "   ✅ DOCS iniciado"
echo ""

# 5. TP Capital Stack (depende de TimescaleDB/Telegram)
echo "5️⃣ TP Capital Stack (5 serviços)..."
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d
echo "   ✅ TP Capital iniciado"
echo ""

# 6. MONITORING Stack
echo "6️⃣ MONITORING Stack (2 serviços)..."
docker compose -f tools/compose/docker-compose.6-1-monitoring-stack.yml up -d
echo "   ✅ MONITORING iniciado"
echo ""

# 7. Dashboard
echo "7️⃣ Dashboard (Node.js)..."
if ! lsof -ti:3103 >/dev/null 2>&1; then
    cd "$PROJECT_ROOT/frontend/dashboard"
    [ ! -d "node_modules" ] && npm install >/dev/null 2>&1
    npm run dev > /tmp/dashboard-all.log 2>&1 &
    echo $! > /tmp/dashboard-all.pid
    echo "   ✅ Dashboard iniciado (PID: $(cat /tmp/dashboard-all.pid))"
else
    echo "   ✅ Dashboard já rodando"
fi
cd "$PROJECT_ROOT"
echo ""

# Aguardar health checks
echo "8️⃣ Aguardando health checks (30s)..."
sleep 30
echo ""

# Status final
echo "=========================================="
echo "✅ TODOS OS SERVIÇOS INICIADOS!"
echo "=========================================="
echo ""
docker ps --format "   ✅ {{.Names}}" | head -25
echo ""
echo "Total: $(docker ps | wc -l) containers rodando"
echo ""
echo "🌐 Acesse (navegador Windows):"
echo "   • Dashboard:     http://localhost:3103"
echo "   • RAG API:       http://localhost:3402"
echo "   • DOCS API:      http://localhost:3401"
echo "   • Workspace:     http://localhost:3200"
echo "   • TP Capital:    http://localhost:4008"
echo "   • Prometheus:    http://localhost:9090"
echo "   • Grafana:       http://localhost:3100"
echo "   • TimescaleDB:   postgresql://localhost:5432"
echo "   • QuestDB:       http://localhost:9001"
echo ""
echo "=========================================="

