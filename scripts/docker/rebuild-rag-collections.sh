#!/usr/bin/env bash
#
# Rebuild and Restart RAG Collections Service
# Aplica alterações no código TypeScript do serviço
#
# Uso: bash scripts/docker/rebuild-rag-collections.sh

set -euo pipefail

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
SERVICE_NAME="rag-collections-service"
COMPOSE_FILE="tools/compose/docker-compose.4-4-rag-stack.yml"

echo "🔧 Rebuild RAG Collections Service"
echo ""
echo "Este script irá:"
echo "  1. Parar o container $SERVICE_NAME"
echo "  2. Recompilar a imagem Docker"
echo "  3. Reiniciar o container"
echo ""

cd "$PROJECT_ROOT"

# 1. Parar container
echo "⏹️  Parando container..."
docker compose -f "$COMPOSE_FILE" stop "$SERVICE_NAME" || true

# 2. Rebuild imagem
echo ""
echo "🏗️  Recompilando imagem Docker..."
docker compose -f "$COMPOSE_FILE" build --no-cache "$SERVICE_NAME"

# 3. Reiniciar
echo ""
echo "🚀 Reiniciando serviço..."
docker compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

# 4. Aguardar health check
echo ""
echo "⏳ Aguardando health check..."
sleep 5

# 5. Verificar status
echo ""
echo "📊 Status do serviço:"
docker ps --filter "name=$SERVICE_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 6. Testar endpoint
echo ""
echo "🧪 Testando endpoint /api/v1/rag/models..."
echo ""
curl -s http://localhost:3403/api/v1/rag/models | jq -r '.data.models[] | "  - \(.name) (\(.dimensions)d) - \(.performance) - \(if .available then "✅ disponível" else "❌ indisponível" end)"'

echo ""
echo "✅ Rebuild completo!"
echo ""
echo "📝 Próximos passos:"
echo "  1. Verificar se 'embeddinggemma' aparece na lista acima"
echo "  2. Se não aparecer, fazer pull do modelo: docker exec rag-ollama ollama pull embeddinggemma"
echo "  3. Testar criação de coleção no dashboard (http://localhost:3103)"

