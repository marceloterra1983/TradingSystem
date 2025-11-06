#!/bin/bash
# TradingSystem - NUCLEAR RESET
# Para TUDO, remove TUDO, limpa TUDO, inicia limpo

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "🔥 NUCLEAR RESET - LIMPEZA TOTAL"
echo "=========================================="
echo ""
echo "⚠️  ATENÇÃO: Parando e removendo TODOS os containers!"
echo ""

# 1. Parar TODOS os containers
echo "1️⃣ Parando TODOS os containers Docker..."
docker stop $(docker ps -aq) 2>/dev/null || echo "   Nenhum container rodando"
echo "   ✅ Todos os containers parados"
echo ""

# 2. Remover TODOS os containers
echo "2️⃣ Removendo TODOS os containers..."
docker rm -f $(docker ps -aq) 2>/dev/null || echo "   Nenhum container para remover"
echo "   ✅ Todos os containers removidos"
echo ""

# 3. Limpar networks órfãs
echo "3️⃣ Limpando networks Docker..."
docker network prune -f 2>/dev/null || true
echo "   ✅ Networks limpas"
echo ""

# 4. Recriar network principal
echo "4️⃣ Recriando network tradingsystem_backend..."
docker network create tradingsystem_backend 2>/dev/null || echo "   ✅ Network já existe"
echo ""

# 5. Matar TODOS os processos nas portas
echo "5️⃣ Liberando TODAS as portas..."
PORTS=(3103 3200 3400 3401 3402 3403 3500 3600 4005 4006 4010 5050 5432 5433 5434 5435 5436 6333 6334 6379 6380 8000 8001 8002 8081 8201 8202 8443 8812 9090 9187 11434)

for PORT in "${PORTS[@]}"; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "   🔪 Matando processos na porta $PORT..."
        echo "$PIDS" | xargs kill -9 2>/dev/null || true
    fi
done
echo "   ✅ Todas as portas liberadas"
echo ""

echo "=========================================="
echo "✅ LIMPEZA COMPLETA!"
echo "=========================================="
echo ""
echo "Containers: 0 rodando"
echo "Networks: Limpas"
echo "Portas: Livres"
echo ""
echo "🚀 Pronto para iniciar limpo!"
echo ""

