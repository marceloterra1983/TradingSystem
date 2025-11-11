#!/usr/bin/bash
#
# kill-all-tp-capital.sh
# Mata TODOS os processos Node.js relacionados ao TP Capital
# Incluindo processos como root, nodemon, PM2, e containers Docker
#

set -euo pipefail

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
COMPOSE_FILE="${PROJECT_ROOT}/tools/compose/docker-compose.4-1-tp-capital-stack.yml"
SERVICE_NAME="tp-capital-api"

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

echo "=========================================================="
echo "🔪 Eliminar TODOS os Processos TP Capital"
echo "=========================================================="
echo ""

# 1. Parar stack Docker
echo "1️⃣  Parando stack Docker 4-1-tp-capital..."
cd "${PROJECT_ROOT}"
if [[ -f "${COMPOSE_FILE}" ]]; then
  docker compose -f "${COMPOSE_FILE}" down >/dev/null 2>&1 || echo "   Stack já estava parada"
else
  echo "   ⚠️  Compose file ${COMPOSE_FILE} não encontrado"
fi
echo ""

# 2. Matar nodemon (pode estar rodando como root)
echo "2️⃣  Eliminando processos nodemon..."
sudo pkill -9 -f "nodemon.*tp-capital" 2>/dev/null || true
sudo pkill -9 -f "nodemon src/server.js" 2>/dev/null || true
echo "   ✅ Nodemon eliminado"
echo ""

# 3. Matar todos os processos Node src/server.js (incluindo root)
echo "3️⃣  Eliminando processos Node.js..."
sudo ps aux | grep "[n]ode src/server.js" | awk '{print $2}' | xargs -r sudo kill -9 2>/dev/null || true
echo "   ✅ Processos Node eliminados"
echo ""

# 4. Matar processos na porta configurada
echo "4️⃣  Liberando porta ${API_PORT}..."
sudo lsof -ti:"${API_PORT}" | xargs -r sudo kill -9 2>/dev/null || true
echo "   ✅ Porta ${API_PORT} liberada"
echo ""

# 5. Esperar e verificar
echo "5️⃣  Aguardando limpeza..."
sleep 5
echo ""

# 6. Validação Final
echo "=========================================================="
echo "✅ Validação Final"
echo "=========================================================="
echo ""

REMAINING=$(ps aux | grep "[n]ode src/server.js" | wc -l)
if [[ "${REMAINING}" -eq 0 ]]; then
  echo "✅ SUCESSO: Nenhum processo Node.js rodando"
else
  echo "⚠️  ATENÇÃO: Ainda há ${REMAINING} processo(s) Node.js:"
  ps aux | grep "[n]ode src/server.js"
fi
echo ""

PORT_CHECK=$(sudo lsof -ti:"${API_PORT}" 2>/dev/null | wc -l)
if [[ "${PORT_CHECK}" -eq 0 ]]; then
  echo "✅ SUCESSO: Porta ${API_PORT} está livre"
else
  echo "⚠️  ATENÇÃO: Porta ${API_PORT} ainda em uso:"
  sudo lsof -i:"${API_PORT}"
fi
echo ""

echo "=========================================================="
echo "🎉 Limpeza Concluída!"
echo "=========================================================="
echo ""
echo "📝 Próximo Passo:"
echo "   bash scripts/setup/start-tp-capital-clean.sh"
echo ""

