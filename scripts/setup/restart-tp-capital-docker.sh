#!/usr/bin/bash
#
# restart-tp-capital-docker.sh
# Rebuilda e reinicia TP Capital como container Docker (SOLUÇÃO DEFINITIVA)
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

cd "$PROJECT_ROOT"

echo "=========================================================="
echo "🐳 TP Capital - Restart com Docker (Stack 4-1)"
echo "=========================================================="
echo ""

# 1. Parar processo no host (se houver)
echo "1️⃣  Parando processo TP Capital no host (se houver)..."
pkill -f "node src/server.js" 2>/dev/null || true
lsof -ti:"${API_PORT}" | xargs kill -9 2>/dev/null || true
sleep 2
echo "   ✅ Processos host parados"
echo ""

# 2. Parar container antigo
echo "2️⃣  Parando container Docker antigo..."
docker compose -f "${COMPOSE_FILE}" stop "${SERVICE_NAME}" >/dev/null 2>&1 || true
docker compose -f "${COMPOSE_FILE}" rm -f "${SERVICE_NAME}" >/dev/null 2>&1 || true
echo "   ✅ Serviço anterior removido"
echo ""

# 3. Rebuildar imagem com código novo
echo "3️⃣  Rebuildando imagem Docker com código novo..."
echo "   (Isso pode demorar 1-2 minutos...)"
docker compose -f "${COMPOSE_FILE}" build "${SERVICE_NAME}"
echo "   ✅ Imagem rebuilada"
echo ""

# 4. Iniciar novo container
echo "4️⃣  Iniciando serviço Docker..."
docker compose -f "${COMPOSE_FILE}" up -d "${SERVICE_NAME}"
echo "   ✅ Serviço iniciado"
echo ""

# 5. Aguardar container ficar healthy
echo "5️⃣  Aguardando container ficar healthy..."
for i in {1..30}; do
  STATUS=$(docker inspect "${CONTAINER_NAME}" --format='{{.State.Health.Status}}' 2>/dev/null || echo "starting")
  if [[ "${STATUS}" == "healthy" ]]; then
    echo "   ✅ Container está healthy!"
    break
  fi
  echo "   ⏳ Aguardando... (${i}/30) - Status: ${STATUS}"
  sleep 2
done
echo ""

# 6. Validação Final
echo "=========================================================="
echo "✅ Validação Final"
echo "=========================================================="
echo ""

echo "📊 Status do Container:"
docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}: {{.Status}}"
echo ""

echo "🧪 Health Check:"
curl -s "${API_BASE_URL}/health" | jq '.status' || echo "⚠️ Health check falhou"
echo ""

echo "🧪 Teste de Sincronização:"
API_KEY=$(grep "TP_CAPITAL_API_KEY=" .env | cut -d'=' -f2-)
curl -s -X POST -H "X-API-Key: $API_KEY" "${API_BASE_URL}/sync-messages" | jq '{success, message}' || echo "⚠️ Sincronização falhou"
echo ""

echo "=========================================================="
echo "🎉 TP Capital Rodando no Docker!"
echo "=========================================================="
echo ""
echo "📝 Comandos Úteis:"
echo "   • Ver logs:       docker logs -f ${CONTAINER_NAME}"
echo "   • Entrar no container: docker exec -it ${CONTAINER_NAME} sh"
echo "   • Parar:          docker compose -f ${COMPOSE_FILE} stop ${SERVICE_NAME}"
echo "   • Reiniciar:      docker compose -f ${COMPOSE_FILE} restart ${SERVICE_NAME}"
echo ""
echo "📚 Documentação: SUCESSO-TP-CAPITAL-2025-11-02.md"
echo ""

