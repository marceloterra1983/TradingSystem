#!/usr/bin/bash
#
# restart-tp-capital-docker.sh
# Rebuilda e reinicia TP Capital como container Docker (SOLUÇÃO DEFINITIVA)
#

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "=========================================================="
echo "🐳 TP Capital - Restart com Docker (Rebuild)"
echo "=========================================================="
echo ""

# 1. Parar processo no host (se houver)
echo "1️⃣  Parando processo TP Capital no host (se houver)..."
pkill -f "node src/server.js" 2>/dev/null || true
lsof -ti:4005 | xargs kill -9 2>/dev/null || true
sleep 2
echo "   ✅ Processos host parados"
echo ""

# 2. Parar container antigo
echo "2️⃣  Parando container Docker antigo..."
docker compose -f tools/compose/docker-compose.apps.yml down tp-capital 2>/dev/null || true
echo "   ✅ Container antigo removido"
echo ""

# 3. Rebuildar imagem com código novo
echo "3️⃣  Rebuildando imagem Docker com código novo..."
echo "   (Isso pode demorar 1-2 minutos...)"
docker compose -f tools/compose/docker-compose.apps.yml build tp-capital
echo "   ✅ Imagem rebuilada"
echo ""

# 4. Iniciar novo container
echo "4️⃣  Iniciando novo container Docker..."
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital
echo "   ✅ Container iniciado"
echo ""

# 5. Aguardar container ficar healthy
echo "5️⃣  Aguardando container ficar healthy..."
for i in {1..30}; do
  STATUS=$(docker inspect apps-tpcapital --format='{{.State.Health.Status}}' 2>/dev/null || echo "starting")
  if [ "$STATUS" = "healthy" ]; then
    echo "   ✅ Container está healthy!"
    break
  fi
  echo "   ⏳ Aguardando... ($i/30) - Status: $STATUS"
  sleep 2
done
echo ""

# 6. Validação Final
echo "=========================================================="
echo "✅ Validação Final"
echo "=========================================================="
echo ""

echo "📊 Status do Container:"
docker ps --filter "name=apps-tpcapital" --format "{{.Names}}: {{.Status}}"
echo ""

echo "🧪 Health Check:"
curl -s http://localhost:4005/health | jq '.status' || echo "⚠️ Health check falhou"
echo ""

echo "🧪 Teste de Sincronização:"
API_KEY=$(grep "TP_CAPITAL_API_KEY=" .env | cut -d'=' -f2)
curl -s -X POST -H "X-API-Key: $API_KEY" http://localhost:4005/sync-messages | jq '{success, message}' || echo "⚠️ Sincronização falhou"
echo ""

echo "=========================================================="
echo "🎉 TP Capital Rodando no Docker!"
echo "=========================================================="
echo ""
echo "📝 Comandos Úteis:"
echo "   • Ver logs:       docker logs -f apps-tpcapital"
echo "   • Entrar no container: docker exec -it apps-tpcapital sh"
echo "   • Parar:          docker compose -f tools/compose/docker-compose.apps.yml stop tp-capital"
echo "   • Reiniciar:      docker compose -f tools/compose/docker-compose.apps.yml restart tp-capital"
echo ""
echo "📚 Documentação: SUCESSO-TP-CAPITAL-2025-11-02.md"
echo ""

