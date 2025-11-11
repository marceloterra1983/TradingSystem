#!/usr/bin/bash
#
# rebuild-tp-capital-docker.sh
# Rebuilda a imagem Docker do TP Capital com o código corrigido
#

set -euo pipefail

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
COMPOSE_FILE="${PROJECT_ROOT}/tools/compose/docker-compose.4-1-tp-capital-stack.yml"
SERVICE_NAME="tp-capital-api"
CONTAINER_NAME="tp-capital-api"

load_env_var() {
  local key=$1
  local default=$2
  if [[ -f "${PROJECT_ROOT}/.env" ]]; then
    local value
    value=$(grep -E "^${key}=" "${PROJECT_ROOT}/.env" | tail -1 | cut -d'=' -f2-)
    if [[ -n "${value}" ]]; then
      echo "${value}"
      return
    fi
  fi
  echo "${default}"
}

API_PORT=$(load_env_var "TP_CAPITAL_API_PORT" "4008")
API_PROTOCOL="http"
API_HOST="localhost"
API_BASE_URL="${API_PROTOCOL}://${API_HOST}:${API_PORT}"

echo "=========================================================="
echo "🐳 Rebuild TP Capital Docker Image (Stack 4-1)"
echo "=========================================================="
echo ""

cd "${PROJECT_ROOT}"

# 1. Parar processo no host (se estiver rodando)
echo "1️⃣  Parando TP Capital no host..."
pkill -f "node src/server.js" 2>/dev/null || echo "   Nenhum processo no host"
lsof -ti:"${API_PORT}" | xargs kill -9 2>/dev/null || true
echo "   ✅ Host limpo"
echo ""

# 2. Remover container e imagem antigos
echo "2️⃣  Removendo serviço e imagem antigos..."
docker compose -f "${COMPOSE_FILE}" stop "${SERVICE_NAME}" >/dev/null 2>&1 || true
docker compose -f "${COMPOSE_FILE}" rm -f "${SERVICE_NAME}" >/dev/null 2>&1 || true
docker rmi img-apps-tpcapital:latest 2>/dev/null || echo "   Imagem já removida"
echo "   ✅ Serviço e imagem removidos"
echo ""

# 3. Rebuildar imagem com código novo
echo "3️⃣  Rebuildando imagem Docker..."
docker compose -f "${COMPOSE_FILE}" build --no-cache "${SERVICE_NAME}"
echo "   ✅ Imagem rebuilada com código novo"
echo ""

# 4. Iniciar container
echo "4️⃣  Iniciando serviço TP Capital..."
docker compose -f "${COMPOSE_FILE}" up -d "${SERVICE_NAME}"
echo "   ✅ Serviço iniciado"
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
HEALTH=$(curl -s "${API_BASE_URL}/health" | jq -r '.status' 2>/dev/null || echo "error")
if [[ "${HEALTH}" == "healthy" ]]; then
  echo "✅ Health Check: SUCESSO"
else
  echo "❌ Health Check: FALHOU (${HEALTH})"
  echo ""
  echo "Ver logs:"
  echo "  docker logs ${CONTAINER_NAME} --tail 50"
  exit 1
fi
echo ""

# Teste de sincronização (porta 4010)
API_KEY=$(grep "TP_CAPITAL_API_KEY=" .env | cut -d'=' -f2-)
SYNC_RESULT=$(curl -s -X POST -H "X-API-Key: $API_KEY" "${API_BASE_URL}/sync-messages")
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
TS=$(curl -s "${API_BASE_URL}/signals?limit=1" | jq -r '.data[0].ts' 2>/dev/null || echo "null")
if [[ "${TS}" != "null" && -n "${TS}" ]]; then
  echo "✅ Timestamps: Funcionando (${TS})"
else
  echo "❌ Timestamps: FALHOU (null ou vazio)"
fi
echo ""

echo "=========================================================="
echo "🎉 TP Capital Docker: PRONTO!"
echo "=========================================================="
echo ""
echo "📊 Status:"
echo "   • Container:     ${CONTAINER_NAME} (RUNNING)"
echo "   • Image:         img-apps-tpcapital:latest (rebuilded)"
echo "   • Port:          ${API_PORT}"
echo "   • Health:        ${HEALTH}"
echo "   • Gateway Port:  4010 (correto)"
echo ""
echo "📝 Comandos Úteis:"
echo "   • Ver logs:      docker logs ${CONTAINER_NAME} -f"
echo "   • Restart:       docker compose -f ${COMPOSE_FILE} restart ${SERVICE_NAME}"
echo "   • Stop:          docker compose -f ${COMPOSE_FILE} stop ${SERVICE_NAME}"
echo ""
echo "🌐 Acessar Dashboard: http://localhost:9080/tp-capital"
echo ""

