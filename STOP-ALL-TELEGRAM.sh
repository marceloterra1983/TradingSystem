#!/bin/bash
# Script Master: Para TODOS os componentes do Telegram Gateway System
# Componentes: Dashboard + Gateway API + Gateway MTProto + Docker Stack

set -e

# Carregar variáveis do .env para evitar warnings
set -a
source .env 2>/dev/null || true
set +a

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║         🛑 PARANDO SISTEMA COMPLETO TELEGRAM GATEWAY                ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flag para força
FORCE=false
if [[ "$1" == "--force" ]]; then
  FORCE=true
fi

# ============================================================================
# ETAPA 1: Dashboard
# ============================================================================

echo -e "${BLUE}🖥️  ETAPA 1: Parando Dashboard (Porta 3103)${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

if lsof -ti :3103 >/dev/null 2>&1; then
  DASH_PID=$(lsof -ti :3103)
  echo "🛑 Parando Dashboard (PID: $DASH_PID)..."
  
  if [ "$FORCE" = true ]; then
    kill -9 $DASH_PID 2>/dev/null || true
  else
    kill $DASH_PID 2>/dev/null || true
    sleep 2
    
    # Se ainda estiver rodando, force
    if ps -p $DASH_PID > /dev/null 2>&1; then
      kill -9 $DASH_PID 2>/dev/null || true
    fi
  fi
  
  # Matar processos relacionados
  pkill -f "vite.*3103" 2>/dev/null || true
  pkill -f "npm.*dashboard" 2>/dev/null || true
  
  echo -e "${GREEN}✅ Dashboard parado${NC}"
else
  echo -e "${YELLOW}⏭️  Dashboard não estava rodando${NC}"
fi

echo ""

# ============================================================================
# ETAPA 2: Gateway API
# ============================================================================

echo -e "${BLUE}🔌 ETAPA 2: Parando Gateway API (Porta 4010)${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

if lsof -ti :4010 >/dev/null 2>&1; then
  API_PID=$(lsof -ti :4010)
  echo "🛑 Parando Gateway API (PID: $API_PID)..."
  
  if [ "$FORCE" = true ]; then
    kill -9 $API_PID 2>/dev/null || true
  else
    kill $API_PID 2>/dev/null || true
    sleep 2
    
    # Se ainda estiver rodando, force
    if ps -p $API_PID > /dev/null 2>&1; then
      kill -9 $API_PID 2>/dev/null || true
    fi
  fi
  
  # Matar processos relacionados
  pkill -f "node.*backend/api/telegram-gateway" 2>/dev/null || true
  
  echo -e "${GREEN}✅ Gateway API parado${NC}"
else
  echo -e "${YELLOW}⏭️  Gateway API não estava rodando${NC}"
fi

echo ""

# ============================================================================
# ETAPA 3: Gateway MTProto
# ============================================================================

echo -e "${BLUE}📱 ETAPA 3: Parando Gateway MTProto${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

if ps aux | grep -E "node.*telegram-gateway/src/index.js" | grep -v grep >/dev/null 2>&1; then
  MTPROTO_PID=$(ps aux | grep -E "node.*telegram-gateway/src/index.js" | grep -v grep | awk '{print $2}' | head -1)
  echo "🛑 Parando Gateway MTProto (PID: $MTPROTO_PID)..."
  
  if [ "$FORCE" = true ]; then
    pkill -9 -f "telegram-gateway" 2>/dev/null || true
  else
    pkill -f "npm.*telegram-gateway" 2>/dev/null || true
    pkill -f "node.*telegram-gateway" 2>/dev/null || true
    sleep 2
    
    # Se ainda estiver rodando, force
    if ps aux | grep -E "node.*telegram-gateway/src/index.js" | grep -v grep >/dev/null 2>&1; then
      pkill -9 -f "telegram-gateway" 2>/dev/null || true
    fi
  fi
  
  echo -e "${GREEN}✅ Gateway MTProto parado${NC}"
else
  echo -e "${YELLOW}⏭️  Gateway MTProto não estava rodando${NC}"
fi

echo ""

# ============================================================================
# ETAPA 4: Docker Compose Stack
# ============================================================================

echo -e "${BLUE}🐳 ETAPA 4: Parando Docker Compose Stack${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

if docker compose -f tools/compose/docker-compose.telegram.yml ps --quiet 2>/dev/null | grep -q .; then
  echo "🛑 Parando containers Docker..."
  docker compose -f tools/compose/docker-compose.telegram.yml down
  echo -e "${GREEN}✅ Docker stack parado${NC}"
else
  echo -e "${YELLOW}⏭️  Docker stack não estava rodando${NC}"
fi

echo ""

# ============================================================================
# VERIFICAÇÃO FINAL
# ============================================================================

echo -e "${BLUE}🔍 ETAPA 5: Verificação Final${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

ALL_STOPPED=true

# Verificar Dashboard
if lsof -ti :3103 >/dev/null 2>&1; then
  echo -e "${RED}⚠️  Dashboard ainda está usando porta 3103${NC}"
  ALL_STOPPED=false
fi

# Verificar Gateway API
if lsof -ti :4010 >/dev/null 2>&1; then
  echo -e "${RED}⚠️  Gateway API ainda está usando porta 4010${NC}"
  ALL_STOPPED=false
fi

# Verificar Gateway MTProto
if ps aux | grep -E "node.*telegram-gateway/src/index.js" | grep -v grep >/dev/null 2>&1; then
  echo -e "${RED}⚠️  Gateway MTProto ainda está rodando${NC}"
  ALL_STOPPED=false
fi

# Verificar Docker
if docker compose -f tools/compose/docker-compose.telegram.yml ps --quiet 2>/dev/null | grep -q .; then
  echo -e "${RED}⚠️  Docker containers ainda estão rodando${NC}"
  ALL_STOPPED=false
fi

if [ "$ALL_STOPPED" = true ]; then
  echo -e "${GREEN}✅ Todos os componentes foram parados com sucesso!${NC}"
else
  echo ""
  echo -e "${YELLOW}⚠️  Alguns componentes ainda estão rodando${NC}"
  echo ""
  echo "Execute novamente com --force para forçar:"
  echo "   bash STOP-ALL-TELEGRAM.sh --force"
fi

echo ""

# ============================================================================
# RESUMO FINAL
# ============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║           ✅ SISTEMA TELEGRAM GATEWAY PARADO                         ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}📊 STATUS FINAL:${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "  ❌ Dashboard (porta 3103)"
echo "  ❌ Gateway API (porta 4010)"
echo "  ❌ Gateway MTProto"
echo "  ❌ Docker Stack (TimescaleDB, Redis, RabbitMQ)"
echo ""

echo -e "${BLUE}🚀 PARA REINICIAR:${NC}"
echo "═════════════════"
echo ""
echo "  bash START-ALL-TELEGRAM.sh"
echo ""

