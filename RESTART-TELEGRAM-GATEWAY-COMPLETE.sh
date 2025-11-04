#!/bin/bash
# Script para reiniciar todo o Telegram Gateway com novos recursos
# (Social media previews + Photo download)

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║          🔄 REINICIANDO TELEGRAM GATEWAY COMPLETO                     ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Parar Gateway API
echo "🛑 Parando Gateway API (porta 4010)..."
API_PID=$(lsof -ti :4010 2>/dev/null || true)
if [ -n "$API_PID" ]; then
  echo "   ⚠️  Gateway API rodando (PID: $API_PID)"
  kill $API_PID 2>/dev/null || true
  sleep 2
  echo "   ✅ Gateway API parado"
else
  echo "   ℹ️  Gateway API não estava rodando"
fi

# 2. Parar Gateway MTProto
echo ""
echo "🛑 Parando Gateway MTProto (porta 4007)..."
pkill -f "telegram-gateway" 2>/dev/null || true
pkill -f "node.*src/index.js" 2>/dev/null || true
sleep 2
echo "   ✅ Gateway MTProto parado"

# 3. Verificar portas livres
echo ""
echo "🔍 Verificando portas..."
if lsof -i :4010 >/dev/null 2>&1; then
  echo "   ⚠️  Porta 4010 ainda em uso!"
  lsof -i :4010
  exit 1
fi
echo "   ✅ Porta 4010 livre"

if lsof -i :4007 >/dev/null 2>&1; then
  echo "   ⚠️  Porta 4007 ainda em uso!"
  lsof -i :4007
  exit 1
fi
echo "   ✅ Porta 4007 livre"

# 4. Criar diretório de cache se não existir
echo ""
echo "📁 Preparando cache de fotos..."
mkdir -p backend/api/telegram-gateway/cache/photos
echo "   ✅ Diretório de cache pronto"

# 5. Iniciar Gateway MTProto
echo ""
echo "🚀 Iniciando Gateway MTProto..."
bash START-GATEWAY-MTPROTO.sh 2>&1 | grep -E "(✅|❌|▶️|🔍)" || true
sleep 3

# 6. Verificar Gateway MTProto
if lsof -i :4007 >/dev/null 2>&1; then
  MTPROTO_PID=$(lsof -ti :4007)
  echo "   ✅ Gateway MTProto iniciado (PID: $MTPROTO_PID)"
else
  echo "   ❌ Gateway MTProto falhou ao iniciar"
  echo "   Verifique: tail -f logs/telegram-gateway-mtproto.log"
  exit 1
fi

# 7. Iniciar Gateway API
echo ""
echo "🚀 Iniciando Gateway API..."
cd backend/api/telegram-gateway

# Criar diretório de logs se não existir
mkdir -p ../../../logs

# Iniciar em background
nohup npm run dev > ../../../logs/telegram-gateway-api.log 2>&1 &
API_PID=$!

echo "   ▶️  Gateway API iniciado (PID: $API_PID)"
cd ../../..

# 8. Aguardar inicialização
echo ""
echo "⏳ Aguardando Gateway API inicializar (5 segundos)..."
sleep 5

# 9. Verificar Gateway API
if lsof -i :4010 >/dev/null 2>&1; then
  API_PID=$(lsof -ti :4010)
  echo "   ✅ Gateway API rodando (PID: $API_PID)"
else
  echo "   ❌ Gateway API falhou ao iniciar"
  echo "   Verifique: tail -f logs/telegram-gateway-api.log"
  exit 1
fi

# 10. Verificar Docker containers
echo ""
echo "🐳 Verificando Docker containers..."
docker ps --filter "name=telegram-" --format "table {{.Names}}\t{{.Status}}" | head -5

# 11. Sucesso!
echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║              ✅ TELEGRAM GATEWAY COMPLETO INICIADO!                   ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 SERVIÇOS ATIVOS:"
echo "══════════════════"
echo ""
echo "  Gateway MTProto (4007): ✅ PID: $(lsof -ti :4007)"
echo "  Gateway API (4010): ✅ PID: $(lsof -ti :4010)"
echo "  Dashboard (3103): $(lsof -ti :3103 >/dev/null 2>&1 && echo "✅ PID: $(lsof -ti :3103)" || echo "⚠️  Não rodando")"
echo ""
echo "🌟 FEATURES DISPONÍVEIS:"
echo "══════════════════════"
echo ""
echo "  ✅ Twitter/X Link Preview"
echo "  ✅ YouTube Link Preview (player embed)"
echo "  ✅ Instagram Link Preview (posts + reels)"
echo "  ✅ Telegram Photos Download (cache)"
echo ""
echo "🔗 ACESSE O DASHBOARD:"
echo "════════════════════"
echo ""
echo "  http://localhost:3103/#/telegram-gateway"
echo ""
echo "  (Faça Ctrl + Shift + R para recarregar)"
echo ""
echo "📋 LOGS EM TEMPO REAL:"
echo "════════════════════"
echo ""
echo "  Gateway MTProto:"
echo "    tail -f logs/telegram-gateway-mtproto.log"
echo ""
echo "  Gateway API:"
echo "    tail -f logs/telegram-gateway-api.log"
echo ""
echo "🧪 TESTE RÁPIDO:"
echo "══════════════"
echo ""
echo "  Envie mensagem com:"
echo "  • Link do Twitter/YouTube/Instagram → Ver preview!"
echo "  • Foto do Telegram → Foto carrega!"
echo ""

