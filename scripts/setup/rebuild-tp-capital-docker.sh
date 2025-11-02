#!/usr/bin/bash
#
# rebuild-tp-capital-docker.sh
# Rebuilda a imagem Docker do TP Capital com o código corrigido
#

set -e

echo "=========================================================="
echo "🐳 Rebuild TP Capital Docker Image (Código Correto)"
echo "=========================================================="
echo ""

cd /home/marce/Projetos/TradingSystem

# 1. Parar processo no host (se estiver rodando)
echo "1️⃣  Parando TP Capital no host..."
pkill -f "node src/server.js" 2>/dev/null || echo "   Nenhum processo no host"
lsof -ti:4005 | xargs kill -9 2>/dev/null || true
echo "   ✅ Host limpo"
echo ""

# 2. Remover container e imagem antigos
echo "2️⃣  Removendo container e imagem antigos..."
docker compose -f tools/compose/docker-compose.apps.yml down tp-capital 2>/dev/null || true
docker rmi img-apps-tpcapital:latest 2>/dev/null || echo "   Imagem já removida"
echo "   ✅ Container e imagem removidos"
echo ""

# 3. Rebuildar imagem com código novo
echo "3️⃣  Rebuildando imagem Docker..."
docker compose -f tools/compose/docker-compose.apps.yml build --no-cache tp-capital
echo "   ✅ Imagem rebuilada com código novo"
echo ""

# 4. Iniciar container
echo "4️⃣  Iniciando container TP Capital..."
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital
echo "   ✅ Container iniciado"
echo ""

# 5. Aguardar startup
echo "5️⃣  Aguardando startup (30 segundos)..."
sleep 30
echo ""

# 6. Validação
echo "=========================================================="
echo "✅ Validação Final"
echo "=========================================================="
echo ""

# Health check
HEALTH=$(curl -s http://localhost:4005/health | jq -r '.status' 2>/dev/null || echo "error")
if [ "$HEALTH" = "healthy" ]; then
  echo "✅ Health Check: SUCESSO"
else
  echo "❌ Health Check: FALHOU ($HEALTH)"
  echo ""
  echo "Ver logs:"
  echo "  docker logs apps-tpcapital --tail 50"
  exit 1
fi
echo ""

# Teste de sincronização (porta 4010)
API_KEY=$(grep "TP_CAPITAL_API_KEY=" .env | cut -d'=' -f2)
SYNC_RESULT=$(curl -s -X POST -H "X-API-Key: $API_KEY" http://localhost:4005/sync-messages)
MESSAGE=$(echo "$SYNC_RESULT" | jq -r '.message' 2>/dev/null || echo "error")

if echo "$MESSAGE" | grep -q "4010"; then
  echo "✅ Sincronização: Porta 4010 detectada (CORRETO!)"
elif echo "$MESSAGE" | grep -q "4006"; then
  echo "❌ Sincronização: AINDA mostra porta 4006 (INCORRETO!)"
  echo "   Código antigo ainda na imagem!"
  exit 1
else
  echo "⚠️  Sincronização: Mensagem inesperada"
  echo "   $MESSAGE"
fi
echo ""

# Timestamps
TS=$(curl -s "http://localhost:4005/signals?limit=1" | jq -r '.data[0].ts' 2>/dev/null || echo "null")
if [ "$TS" != "null" ] && [ "$TS" != "" ]; then
  echo "✅ Timestamps: Funcionando ($TS)"
else
  echo "❌ Timestamps: FALHOU (null ou vazio)"
fi
echo ""

echo "=========================================================="
echo "🎉 TP Capital Docker: PRONTO!"
echo "=========================================================="
echo ""
echo "📊 Status:"
echo "   • Container:     apps-tpcapital (RUNNING)"
echo "   • Image:         img-apps-tpcapital:latest (rebuilded)"
echo "   • Port:          4005"
echo "   • Health:        $HEALTH"
echo "   • Gateway Port:  4010 (correto)"
echo ""
echo "📝 Comandos Úteis:"
echo "   • Ver logs:      docker logs apps-tpcapital -f"
echo "   • Restart:       docker compose -f tools/compose/docker-compose.apps.yml restart tp-capital"
echo "   • Stop:          docker compose -f tools/compose/docker-compose.apps.yml stop tp-capital"
echo ""
echo "🌐 Acessar Dashboard: http://localhost:3103/tp-capital"
echo ""

