#!/bin/bash
# Script Master: Inicia TODOS os componentes do Telegram Gateway System
# Componentes: Docker Stack + Gateway MTProto + Gateway API + Dashboard

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║        🚀 INICIANDO SISTEMA COMPLETO TELEGRAM GATEWAY               ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Array para armazenar PIDs
declare -a PIDS
declare -a SERVICES

# Função para limpar em caso de erro
cleanup_on_error() {
  echo ""
  echo -e "${RED}❌ Erro detectado! Limpando processos iniciados...${NC}"
  
  for pid in "${PIDS[@]}"; do
    if ps -p $pid > /dev/null 2>&1; then
      kill $pid 2>/dev/null || true
    fi
  done
  
  exit 1
}

trap cleanup_on_error ERR

# ============================================================================
# ETAPA 1: Docker Compose Stack
# ============================================================================

echo -e "${BLUE}📦 ETAPA 1: Docker Compose Stack${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo "🔍 Verificando se Docker stack já está rodando..."

# Carregar variáveis do .env para evitar warnings
set -a
source .env 2>/dev/null || true
set +a

if docker compose -f tools/compose/docker-compose.telegram.yml ps --quiet 2>/dev/null | grep -q .; then
  echo -e "${YELLOW}⚠️  Docker stack já está rodando${NC}"
  echo ""
  read -p "   Deseja REINICIAR o Docker stack? (s/n): " reiniciar_docker
  
  if [[ "$reiniciar_docker" =~ ^[Ss]$ ]]; then
    echo "   🛑 Parando Docker stack..."
    # Parar apenas os essenciais (ignora Replica/Sentinel/PgBouncer que causam problemas)
    docker compose -f tools/compose/docker-compose.telegram.yml stop telegram-timescaledb telegram-redis-master telegram-rabbitmq 2>/dev/null || true
    docker compose -f tools/compose/docker-compose.telegram.yml rm -f telegram-timescaledb telegram-redis-master telegram-rabbitmq 2>/dev/null || true
    sleep 2
    echo "   ✅ Docker stack parado"
  else
    echo "   ⏭️  Mantendo Docker stack atual"
  fi
fi

# Verificar se precisa iniciar
if ! docker compose -f tools/compose/docker-compose.telegram.yml ps --quiet 2>/dev/null | grep -q .; then
  echo "🚀 Iniciando Docker Compose stack (APENAS ESSENCIAIS)..."
  echo "   📝 Iniciando: TimescaleDB, Redis Master, RabbitMQ"
  echo "   ⏭️  Ignorando: Redis Replica, Sentinel, PgBouncer (não essenciais para dev)"
  echo ""
  
  # Iniciar APENAS os 3 essenciais (com variáveis já exportadas)
  docker compose -f tools/compose/docker-compose.telegram.yml up -d \
    telegram-timescaledb \
    telegram-redis-master \
    telegram-rabbitmq
  
  echo "⏳ Aguardando containers inicializarem (10 segundos)..."
  sleep 10
  
  # Validar containers
  echo "✅ Validando containers..."
  CONTAINERS=(
    "telegram-timescale:5432"
    "telegram-redis-master:6379"
    "telegram-rabbitmq:5672"
  )
  
  for container in "${CONTAINERS[@]}"; do
    IFS=':' read -r name port <<< "$container"
    if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
      echo "   ✅ $name (porta $port)"
    else
      echo -e "   ${RED}❌ $name FALHOU${NC}"
      exit 1
    fi
  done
  
  echo ""
  echo -e "${GREEN}✅ Docker stack essenciais iniciados com sucesso!${NC}"
else
  echo -e "${GREEN}✅ Docker stack já estava rodando!${NC}"
fi

echo ""

# ============================================================================
# ETAPA 2: Gateway MTProto
# ============================================================================

echo -e "${BLUE}📱 ETAPA 2: Gateway MTProto (Conexão Telegram)${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo "🔍 Verificando se Gateway MTProto já está rodando..."
if ps aux | grep -E "node.*telegram-gateway/src/index.js" | grep -v grep >/dev/null 2>&1; then
  EXISTING_PID=$(ps aux | grep -E "node.*telegram-gateway/src/index.js" | grep -v grep | awk '{print $2}' | head -1)
  echo -e "${YELLOW}⚠️  Gateway MTProto já está rodando (PID: $EXISTING_PID)${NC}"
  echo ""
  read -p "   Deseja REINICIAR o Gateway MTProto? (s/n): " reiniciar_mtproto
  
  if [[ "$reiniciar_mtproto" =~ ^[Ss]$ ]]; then
    echo "   🛑 Parando Gateway MTProto..."
    pkill -f "npm.*telegram-gateway" 2>/dev/null || true
    pkill -f "node.*telegram-gateway" 2>/dev/null || true
    sleep 3
    echo "   ✅ Gateway MTProto parado"
  else
    echo "   ⏭️  Mantendo Gateway MTProto atual"
    PIDS+=($EXISTING_PID)
    SERVICES+=("Gateway MTProto")
  fi
fi

# Verificar se precisa iniciar
if ! ps aux | grep -E "node.*telegram-gateway/src/index.js" | grep -v grep >/dev/null 2>&1; then
  echo "🚀 Iniciando Gateway MTProto..."
  
  # Usar o script existente
  bash START-GATEWAY-MTPROTO.sh > /dev/null 2>&1 &
  sleep 12
  
  # Verificar se iniciou
  MTPROTO_PID=$(ps aux | grep -E "npm start.*telegram-gateway" | grep -v grep | awk '{print $2}' | head -1)
  
  if [ -n "$MTPROTO_PID" ] && ps -p $MTPROTO_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Gateway MTProto iniciado (PID: $MTPROTO_PID)${NC}"
    PIDS+=($MTPROTO_PID)
    SERVICES+=("Gateway MTProto")
  else
    echo -e "${RED}❌ Gateway MTProto falhou ao iniciar${NC}"
    echo "   Verifique logs: tail -f logs/telegram-gateway-mtproto.log"
    exit 1
  fi
fi

echo ""

# ============================================================================
# ETAPA 3: Gateway API
# ============================================================================

echo -e "${BLUE}🔌 ETAPA 3: Gateway API (Endpoints REST - Porta 4010)${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo "🔍 Verificando se Gateway API já está rodando..."
if lsof -ti :4010 >/dev/null 2>&1; then
  EXISTING_API_PID=$(lsof -ti :4010)
  echo -e "${YELLOW}⚠️  Gateway API já está rodando (PID: $EXISTING_API_PID)${NC}"
  echo ""
  read -p "   Deseja REINICIAR o Gateway API? (s/n): " reiniciar_api
  
  if [[ "$reiniciar_api" =~ ^[Ss]$ ]]; then
    echo "   🛑 Parando Gateway API..."
    kill $EXISTING_API_PID 2>/dev/null || true
    sleep 2
    echo "   ✅ Gateway API parado"
  else
    echo "   ⏭️  Mantendo Gateway API atual"
    PIDS+=($EXISTING_API_PID)
    SERVICES+=("Gateway API")
  fi
fi

# Verificar se precisa iniciar
if ! lsof -ti :4010 >/dev/null 2>&1; then
  echo "🚀 Iniciando Gateway API..."
  
  cd backend/api/telegram-gateway
  
  # Verificar node_modules
  if [ ! -d "node_modules" ]; then
    echo "   📦 Instalando dependências..."
    npm install --silent
  fi
  
  # Iniciar em background
  nohup npm run dev > ../../../logs/telegram-gateway-api.log 2>&1 &
  API_PID=$!
  
  cd ../../..
  
  echo "⏳ Aguardando API inicializar (8 segundos)..."
  sleep 8
  
  # Validar
  if ps -p $API_PID > /dev/null 2>&1 && lsof -ti :4010 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Gateway API iniciado (PID: $API_PID)${NC}"
    PIDS+=($API_PID)
    SERVICES+=("Gateway API")
  else
    echo -e "${RED}❌ Gateway API falhou ao iniciar${NC}"
    echo "   Verifique logs: tail -f logs/telegram-gateway-api.log"
    exit 1
  fi
fi

echo ""

# ============================================================================
# ETAPA 4: Dashboard (Opcional)
# ============================================================================

echo -e "${BLUE}🖥️  ETAPA 4: Dashboard (Interface UI - Porta 3103)${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

read -p "Deseja INICIAR o Dashboard também? (s/n): " iniciar_dashboard

if [[ "$iniciar_dashboard" =~ ^[Ss]$ ]]; then
  echo ""
  echo "🔍 Verificando se Dashboard já está rodando..."
  
  if lsof -ti :3103 >/dev/null 2>&1; then
    EXISTING_DASH_PID=$(lsof -ti :3103)
    echo -e "${YELLOW}⚠️  Dashboard já está rodando (PID: $EXISTING_DASH_PID)${NC}"
    echo ""
    read -p "   Deseja REINICIAR o Dashboard? (s/n): " reiniciar_dash
    
    if [[ "$reiniciar_dash" =~ ^[Ss]$ ]]; then
      echo "   🛑 Parando Dashboard..."
      pkill -f "vite.*3103" 2>/dev/null || true
      sleep 2
      echo "   ✅ Dashboard parado"
    else
      echo "   ⏭️  Mantendo Dashboard atual"
      PIDS+=($EXISTING_DASH_PID)
      SERVICES+=("Dashboard")
    fi
  fi
  
  # Verificar se precisa iniciar
  if ! lsof -ti :3103 >/dev/null 2>&1; then
    echo "🚀 Iniciando Dashboard..."
    
    cd frontend/dashboard
    
    # Verificar node_modules
    if [ ! -d "node_modules" ]; then
      echo "   📦 Instalando dependências..."
      npm install --silent
    fi
    
    # Iniciar em background
    nohup npm run dev > ../../logs/dashboard.log 2>&1 &
    DASH_PID=$!
    
    cd ../..
    
    echo "⏳ Aguardando Dashboard inicializar (12 segundos)..."
    sleep 12
    
    # Validar
    if ps -p $DASH_PID > /dev/null 2>&1 && lsof -ti :3103 >/dev/null 2>&1; then
      echo -e "${GREEN}✅ Dashboard iniciado (PID: $DASH_PID)${NC}"
      PIDS+=($DASH_PID)
      SERVICES+=("Dashboard")
    else
      echo -e "${RED}❌ Dashboard falhou ao iniciar${NC}"
      echo "   Verifique logs: tail -f logs/dashboard.log"
      # Não sair aqui, Dashboard é opcional
    fi
  fi
else
  echo "   ⏭️  Dashboard não será iniciado"
fi

echo ""

# ============================================================================
# RESUMO FINAL
# ============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║              ✅ SISTEMA TELEGRAM INICIADO COM SUCESSO!               ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}📊 COMPONENTES ATIVOS:${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

# Docker Containers
echo "  🐳 Docker Containers:"
docker compose -f tools/compose/docker-compose.telegram.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" | grep -E "telegram-" | while read line; do
  echo "     ✅ $line"
done

echo ""

# Node.js Services
echo "  ⚙️  Node.js Services:"
for i in "${!SERVICES[@]}"; do
  SERVICE="${SERVICES[$i]}"
  PID="${PIDS[$i]}"
  echo "     ✅ $SERVICE (PID: $PID)"
done

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo ""

echo -e "${BLUE}📋 PRÓXIMOS PASSOS:${NC}"
echo "══════════════════"
echo ""

if [[ " ${SERVICES[@]} " =~ " Dashboard " ]]; then
  echo "  1️⃣  Abra o Dashboard:"
  echo "      http://localhost:3103/#/telegram-gateway"
  echo ""
  echo "  2️⃣  Faça HARD RELOAD:"
  echo "      Ctrl + Shift + R (Linux/Windows)"
  echo "      Cmd + Shift + R (Mac)"
  echo ""
  echo "  3️⃣  Clique \"Checar Mensagens\":"
  echo "      ✅ Sistema deve estar funcionando!"
  echo ""
else
  echo "  1️⃣  Para iniciar o Dashboard posteriormente:"
  echo "      cd frontend/dashboard && npm run dev"
  echo ""
fi

echo "  📊 Endpoints Disponíveis:"
echo "      • Gateway API: http://localhost:4010"
echo "      • Prometheus: http://localhost:9091"
echo "      • Grafana: http://localhost:3001"
echo ""

echo -e "${BLUE}🔍 VER LOGS:${NC}"
echo "═══════════"
echo ""
echo "  Gateway MTProto:  tail -f logs/telegram-gateway-mtproto.log"
echo "  Gateway API:      tail -f logs/telegram-gateway-api.log"
if [[ " ${SERVICES[@]} " =~ " Dashboard " ]]; then
  echo "  Dashboard:        tail -f logs/dashboard.log"
fi
echo ""

echo -e "${BLUE}🛑 PARAR TODO O SISTEMA:${NC}"
echo "═══════════════════════"
echo ""
echo "  bash STOP-ALL-TELEGRAM.sh"
echo ""
echo "  Ou manualmente:"
echo "  • Docker:         docker compose -f tools/compose/docker-compose.telegram.yml down"
for i in "${!SERVICES[@]}"; do
  SERVICE="${SERVICES[$i]}"
  PID="${PIDS[$i]}"
  echo "  • $SERVICE:  kill $PID"
done
echo ""

echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}🎉 Sistema Telegram Gateway 100% OPERACIONAL! 🎉${NC}"
echo ""

