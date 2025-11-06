#!/bin/bash
# TradingSystem - Limpar portas e iniciar TUDO
# Mata processos nas portas e inicia todos os containers

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "🔧 LIMPANDO PORTAS E INICIANDO TUDO"
echo "=========================================="
echo ""

# Portas que precisam ser liberadas
PORTS=(3103 3200 3400 3401 3402 3403 3500 3600 4005 5433 5434 5435 5436 5050 6333 6334 6379 6380 8000 8001 8002 8201 8202 8812 9090 11434 3002 3003)

echo "1️⃣ Matando processos nas portas críticas..."
for PORT in "${PORTS[@]}"; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "   🔪 Matando processos na porta $PORT..."
        echo "$PIDS" | xargs kill -9 2>/dev/null || true
    fi
done
echo "   ✅ Portas liberadas"
echo ""

echo "2️⃣ Parando todos os containers Docker..."
docker stop $(docker ps -aq) 2>/dev/null || true
echo "   ✅ Containers parados"
echo ""

sleep 3

echo "3️⃣ Iniciando RAG Stack (PRIORIDADE)..."
docker compose -f tools/compose/docker-compose.rag.yml up -d
echo "   ✅ RAG Services iniciando..."
echo ""

echo "4️⃣ Iniciando Kong Gateway..."
docker compose -f tools/compose/docker-compose.kong.yml up -d
echo "   ✅ Kong iniciando..."
echo ""

echo "5️⃣ Iniciando Redis..."
docker compose -f tools/compose/docker-compose.redis.yml up -d
echo "   ✅ Redis iniciando..."
echo ""

echo "6️⃣ Garantindo Qdrant..."
if ! docker ps | grep -q "data-qdrant.*Up"; then
    if docker ps -a | grep -q data-qdrant; then
        docker start data-qdrant || docker run -d \
          --name data-qdrant \
          --network tradingsystem_backend \
          -p 6333:6333 -p 6334:6334 \
          -v "$PROJECT_ROOT/backend/data/qdrant:/qdrant/storage" \
          --restart unless-stopped \
          qdrant/qdrant:v1.7.4
    else
        docker run -d \
          --name data-qdrant \
          --network tradingsystem_backend \
          -p 6333:6333 -p 6334:6334 \
          -v "$PROJECT_ROOT/backend/data/qdrant:/qdrant/storage" \
          --restart unless-stopped \
          qdrant/qdrant:v1.7.4
    fi
fi
echo "   ✅ Qdrant rodando"
echo ""

echo "7️⃣ Aguardando serviços críticos (30s)..."
sleep 30
echo ""

echo "8️⃣ Tentando iniciar stacks opcionais..."
echo ""

# Database stack (pode ter conflito, mas tentamos)
echo "   📦 Database Stack..."
docker compose -f tools/compose/docker-compose.database.yml up -d 2>&1 | tail -3 || echo "      ⚠️  Conflito de porta (ok se já existir)"
echo ""

# Apps stack
echo "   📦 Apps Stack..."
docker compose -f tools/compose/docker-compose.apps.yml up -d 2>&1 | tail -3 || echo "      ⚠️  Conflito de porta (ok se já existir)"
echo ""

echo "9️⃣ STATUS FINAL:"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -25
echo ""

echo "🔟 TESTES RÁPIDOS:"
echo ""
for SVC in "RAG Service:3402:/health" "LlamaIndex:8202:/health" "Qdrant:6333:/" "Redis:6380"; do
    NAME=$(echo $SVC | cut -d: -f1)
    PORT=$(echo $SVC | cut -d: -f2)
    PATH=$(echo $SVC | cut -d: -f3)
    if timeout 2 curl -s http://localhost:$PORT$PATH > /dev/null 2>&1; then
        echo "   ✅ $NAME ($PORT)"
    else
        echo "   ⚠️  $NAME ($PORT) - Aguardando..."
    fi
done
echo ""

echo "=========================================="
echo "✅ CONTAINERS INICIADOS!"
echo "=========================================="
echo ""
echo "Containers rodando: $(docker ps | wc -l)"
echo ""
echo "Acesse:"
echo "   • RAG Service: http://localhost:3402"
echo "   • LlamaIndex: http://localhost:8202"
echo "   • Qdrant: http://localhost:6333"
echo ""
echo "=========================================="
