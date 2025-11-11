#!/bin/bash
# TradingSystem - LIGAR TODOS OS CONTAINERS
# Inicia todos os containers que devem estar rodando

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "🚀 LIGANDO TODOS OS CONTAINERS"
echo "=========================================="
echo ""

# 1. Iniciar containers criados mas parados
echo "1️⃣ Iniciando containers em status 'Created'..."
CREATED=$(docker ps -a --filter "status=created" --format "{{.Names}}")
if [ -z "$CREATED" ]; then
    echo "   ✅ Nenhum container em status 'Created'"
else
    echo "$CREATED" | while read NAME; do
        echo "   ▶️  Iniciando: $NAME"
        docker start "$NAME" 2>&1 | head -1 || echo "      ⚠️  Erro"
    done
fi
echo ""

# 2. Iniciar containers parados (Exited)
echo "2️⃣ Reiniciando containers parados (Exited)..."
EXITED=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | grep -v kong-migrations)
if [ -z "$EXITED" ]; then
    echo "   ✅ Nenhum container parado"
else
    echo "$EXITED" | while read NAME; do
        echo "   ▶️  Reiniciando: $NAME"
        docker start "$NAME" 2>&1 | head -1 || echo "      ⚠️  Erro"
    done
fi
echo ""

# 3. Iniciar stacks via docker-compose
echo "3️⃣ Iniciando stacks via docker-compose..."
echo ""

echo "   📦 RAG Stack (CRÍTICO)..."
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d 2>&1 | tail -5
echo ""

echo "   📦 Database UI Stack..."
docker compose -p 5-0-database-stack -f tools/compose/docker-compose.5-0-database-stack.yml up -d 2>&1 | tail -5
echo ""

echo "   📦 Timescale Stack..."
docker compose -f tools/compose/docker-compose.timescale.yml up -d 2>&1 | tail -5
echo ""

echo "   ⚡ TP Capital Stack..."
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d 2>&1 | tail -5 || echo "      ⚠️  Alguns serviços podem ter conflito de porta"
echo ""

echo "   📦 Docs Stack..."
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d 2>&1 | tail -5 || echo "      ⚠️  Docs pode ter erro de build"
echo ""

echo "   📦 Firecrawl Stack..."
docker compose -f tools/compose/docker-compose.firecrawl.yml up -d 2>&1 | tail -5
echo ""

echo "   📦 Redis Stack..."
docker compose -f tools/compose/docker-compose.redis.yml up -d 2>&1 | tail -3
echo ""

# 4. Garantir Qdrant
echo "4️⃣ Garantindo Qdrant está rodando..."
if ! docker ps | grep -q "rag-qdrant.*Up"; then
    if docker ps -a | grep -q rag-qdrant; then
        echo "   ▶️  Iniciando Qdrant existente..."
        docker start rag-qdrant
    else
        echo "   ▶️  Criando novo container Qdrant..."
        docker run -d \
          --name rag-qdrant \
          --network tradingsystem_backend \
          -p 6333:6333 -p 6334:6334 \
          -v "$PROJECT_ROOT/backend/data/qdrant:/qdrant/storage" \
          --restart unless-stopped \
          qdrant/qdrant:v1.7.4
    fi
fi
echo "   ✅ Qdrant rodando"
echo ""

# 5. Esperar inicialização
echo "5️⃣ Aguardando containers iniciarem (30s)..."
sleep 30
echo "   ✅ Containers inicializados"
echo ""

# 6. Status Final
echo "6️⃣ STATUS FINAL DOS CONTAINERS:"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -30
echo ""

# 7. Contagem
TOTAL=$(docker ps | wc -l)
RUNNING=$(docker ps --filter "status=running" | wc -l)
echo "📊 RESUMO:"
echo "   Total containers rodando: $((TOTAL - 1))"
echo "   Containers healthy: $((RUNNING - 1))"
echo ""

# 8. Testes rápidos
echo "7️⃣ TESTES RÁPIDOS:"
echo ""
echo "   🧪 RAG Service..."
curl -s -m 3 http://localhost:3402/health > /dev/null 2>&1 && echo "      ✅ Rodando" || echo "      ⚠️  Não responde"
echo ""
echo "   🧪 LlamaIndex..."
curl -s -m 3 http://localhost:8202/health > /dev/null 2>&1 && echo "      ✅ Rodando" || echo "      ⚠️  Não responde"
echo ""
echo "   🧪 Qdrant..."
curl -s -m 3 http://localhost:6333 > /dev/null 2>&1 && echo "      ✅ Rodando" || echo "      ⚠️  Não responde"
echo ""
echo "   🧪 Redis..."
docker exec rag-redis redis-cli ping 2>/dev/null | grep -q PONG && echo "      ✅ Rodando" || echo "      ⚠️  Não responde"
echo ""

echo "=========================================="
echo "✅ TODOS OS CONTAINERS LIGADOS!"
echo "=========================================="
echo ""
echo "Acesse:"
echo "   • Dashboard: http://localhost:9080"
echo "   • Docs: http://localhost:3400"
echo "   • RAG API: http://localhost:3402"
echo "   • Qdrant: http://localhost:6333"
echo ""
echo "=========================================="
