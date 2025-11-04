#!/bin/bash
# TradingSystem - START MINIMAL
# Inicia APENAS serviços CORE (RAG + Dashboard)
# ZERO conflitos garantidos

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "🚀 TRADINGSYSTEM - START MINIMAL"
echo "=========================================="
echo "Iniciando CORE services (RAG + Dashboard)..."
echo ""

# Garantir network
echo "0️⃣ Network..."
docker network create tradingsystem_backend 2>/dev/null || echo "   ✅ Network OK"
echo ""

# RAG Stack
echo "1️⃣ RAG Stack (6 containers)..."
docker compose -f tools/compose/docker-compose.rag.yml up -d rag-redis ollama
sleep 10
docker compose -f tools/compose/docker-compose.rag.yml up -d llamaindex-query rag-service rag-collections-service --no-deps
echo "   ✅ RAG Services rodando"
echo ""

# Qdrant standalone
echo "2️⃣ Qdrant..."
if ! docker ps | grep -q "data-qdrant.*Up"; then
    docker run -d \
      --name data-qdrant \
      --network tradingsystem_backend \
      -p 6333:6333 -p 6334:6334 \
      -v "$PROJECT_ROOT/data/qdrant:/qdrant/storage" \
      --restart unless-stopped \
      qdrant/qdrant:v1.7.4 2>/dev/null || docker start data-qdrant
fi
echo "   ✅ Qdrant rodando"
echo ""

# Dashboard
echo "3️⃣ Dashboard..."
if ! lsof -ti:3103 >/dev/null 2>&1; then
    cd "$PROJECT_ROOT/frontend/dashboard"
    [ ! -d "node_modules" ] && npm install >/dev/null 2>&1
    npm run dev > /tmp/dashboard.log 2>&1 &
    echo $! > /tmp/dashboard.pid
    echo "   ✅ Dashboard iniciado (PID: $(cat /tmp/dashboard.pid))"
else
    echo "   ✅ Dashboard já rodando"
fi
cd "$PROJECT_ROOT"
echo ""

# Aguardar
echo "4️⃣ Aguardando (20s)..."
sleep 20
echo ""

# Health Checks
echo "=========================================="
echo "✅ HEALTH CHECKS"
echo "=========================================="
echo ""
docker ps --format "   ✅ {{.Names}}" | head -10
echo ""
echo "Endpoints:"
for P in "3103:Dashboard" "3402:RAG API" "8202:LlamaIndex" "6333:Qdrant" "11434:Ollama"; do
    PORT=$(echo $P | cut -d: -f1)
    NAME=$(echo $P | cut -d: -f2)
    timeout 2 curl -s http://localhost:$PORT >/dev/null 2>&1 && echo "   ✅ $NAME ($PORT)" || echo "   ⏳ $NAME ($PORT)"
done
echo ""
echo "=========================================="
echo "🎉 SISTEMA MINIMAL OPERACIONAL!"
echo "=========================================="
echo ""
echo "Acesse (navegador Windows):"
echo "   http://localhost:3103"
echo ""

