#!/bin/bash
# Script completo para resolver Dashboard + Gateway MTProto

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║         🔧 FIX COMPLETO: Dashboard + Gateway MTProto                 ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Parar Dashboard
echo "🛑 Parando Dashboard..."
pkill -f "vite.*3103" 2>/dev/null || true
pkill -f "npm.*dashboard" 2>/dev/null || true
sleep 2
echo "   ✅ Dashboard parado"
echo ""

# 2. Verificar Gateway MTProto
echo "🔍 Verificando Gateway MTProto (porta 4006)..."
if ps aux | grep -E "node.*telegram-gateway/src/index.js" | grep -v grep >/dev/null 2>&1; then
  echo "   ⚠️  Gateway MTProto já está rodando"
  echo ""
  read -p "   Deseja REINICIAR o Gateway MTProto? (s/n): " reiniciar
  if [[ "$reiniciar" =~ ^[Ss]$ ]]; then
    echo "   🛑 Parando Gateway MTProto..."
    pkill -f "npm.*telegram-gateway" 2>/dev/null || true
    pkill -f "node.*telegram-gateway" 2>/dev/null || true
    sleep 3
    echo "   ✅ Gateway MTProto parado"
  else
    echo "   ⏭️  Mantendo Gateway MTProto atual"
  fi
else
  echo "   ⚠️  Gateway MTProto NÃO está rodando"
  echo ""
  read -p "   Deseja INICIAR o Gateway MTProto? (s/n): " iniciar
  if [[ "$iniciar" =~ ^[Ss]$ ]]; then
    echo "   🚀 Iniciando Gateway MTProto..."
    bash START-GATEWAY-MTPROTO.sh
    sleep 5
  else
    echo "   ⏭️  Gateway MTProto não será iniciado"
    echo "   ⚠️  Sem Gateway MTProto, mensagens REAIS não chegarão!"
  fi
fi

echo ""

# 3. Reiniciar Dashboard em background
echo "🚀 Reiniciando Dashboard..."
cd frontend/dashboard

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
  echo "   📦 Instalando dependências..."
  npm install
fi

echo "   ▶️  Iniciando Vite dev server..."
nohup npm run dev > ../../logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!

cd ../..
echo "   ✅ Dashboard iniciado (PID: $DASHBOARD_PID)"
echo ""

# 4. Aguardar Dashboard inicializar
echo "⏳ Aguardando Dashboard inicializar (15 segundos)..."
sleep 15

# 5. Verificar se Dashboard está rodando
if ps -p $DASHBOARD_PID > /dev/null 2>&1; then
  echo "   ✅ Dashboard está rodando!"
else
  echo "   ❌ Dashboard falhou ao iniciar"
  echo "   Verifique logs: tail -f logs/dashboard.log"
  exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║              ✅ SISTEMA PRONTO E FUNCIONANDO!                         ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 INFORMAÇÕES:"
echo "══════════════"
echo ""
echo "  • Dashboard: http://localhost:3103"
echo "  • Dashboard PID: $DASHBOARD_PID"
echo "  • Logs Dashboard: logs/dashboard.log"
echo "  • Logs Gateway MTProto: logs/telegram-gateway-mtproto.log"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "══════════════════"
echo ""
echo "  1️⃣  Abra o Dashboard:"
echo "      http://localhost:3103/#/telegram-gateway"
echo ""
echo "  2️⃣  Faça HARD RELOAD:"
echo "      • Linux/Windows: Ctrl + Shift + R"
echo "      • Mac: Cmd + Shift + R"
echo ""
echo "  3️⃣  Clique \"Checar Mensagens\":"
echo "      ✅ Erro NÃO deve mais aparecer!"
echo ""
echo "  4️⃣  Aguarde mensagens dos canais:"
echo "      • Channel -1001744113331 (jonas)"
echo "      • Channel -1001649127710 (TP)"
echo ""
echo "🛑 PARA PARAR:"
echo "═════════════"
echo ""
echo "  Dashboard: kill $DASHBOARD_PID"
echo "  Gateway: lsof -ti :4006 | xargs kill"
echo ""
echo "📝 VER LOGS:"
echo "═══════════"
echo ""
echo "  tail -f logs/dashboard.log"
echo "  tail -f logs/telegram-gateway-mtproto.log"
echo ""

