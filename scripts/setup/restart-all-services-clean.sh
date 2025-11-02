#!/usr/bin/bash
#
# restart-all-services-clean.sh
# Restart COMPLETO de todos os serviços Node.js com código limpo
#

set -e

echo "=========================================================="
echo "🔄 Restart Completo - Todos os Serviços"
echo "=========================================================="
echo ""

# 1. Parar TUDO
echo "1️⃣  Parando TODOS os serviços Node.js..."
pkill -9 node 2>/dev/null || true
sleep 3
echo "   ✅ Todos os processos Node terminados"
echo ""

# 2. Verificar portas
echo "2️⃣  Verificando portas..."
for port in 4005 4010 3103; do
  if lsof -ti:$port > /dev/null 2>&1; then
    echo "   ⚠️  Porta $port ainda em uso, liberando..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
  fi
done
echo "   ✅ Portas 4005, 4010, 3103 livres"
echo ""

# 3. Iniciar Telegram Gateway
echo "3️⃣  Iniciando Telegram Gateway (porta 4010)..."
cd /home/marce/Projetos/TradingSystem/backend/api/telegram-gateway
export TELEGRAM_GATEWAY_PORT=4010
mkdir -p logs
nohup npm run dev > logs/gateway.log 2>&1 &
GATEWAY_PID=$!
echo "   PID: $GATEWAY_PID"
sleep 8

if curl -s http://localhost:4010/health > /dev/null 2>&1; then
  echo "   ✅ Telegram Gateway ONLINE"
else
  echo "   ❌ Telegram Gateway FALHOU"
  exit 1
fi
echo ""

# 4. Iniciar TP Capital
echo "4️⃣  Iniciando TP Capital (porta 4005)..."
cd /home/marce/Projetos/TradingSystem/apps/tp-capital
export TELEGRAM_GATEWAY_PORT=4010
mkdir -p logs
nohup npm run dev > logs/tp-capital.log 2>&1 &
TP_CAPITAL_PID=$!
echo "   PID: $TP_CAPITAL_PID"
sleep 10

if curl -s http://localhost:4005/health > /dev/null 2>&1; then
  echo "   ✅ TP Capital ONLINE"
else
  echo "   ❌ TP Capital FALHOU"
  exit 1
fi
echo ""

# 5. Iniciar Dashboard
echo "5️⃣  Iniciando Dashboard (porta 3103)..."
cd /home/marce/Projetos/TradingSystem/frontend/dashboard
mkdir -p logs
nohup npm run dev > logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "   PID: $DASHBOARD_PID"
sleep 15

if curl -I http://localhost:3103 2>/dev/null | grep -q "200\|304"; then
  echo "   ✅ Dashboard ONLINE"
else
  echo "   ⚠️  Dashboard pode demorar mais - verifique manualmente"
fi
echo ""

# 6. Validação Final
echo "=========================================================="
echo "✅ Todos os Serviços Iniciados!"
echo "=========================================================="
echo ""
echo "📊 Status:"
echo "   • Telegram Gateway: http://localhost:4010 (PID: $GATEWAY_PID)"
echo "   • TP Capital:       http://localhost:4005 (PID: $TP_CAPITAL_PID)"
echo "   • Dashboard:        http://localhost:3103 (PID: $DASHBOARD_PID)"
echo ""
echo "🧪 Teste de Sincronização:"
echo ""
API_KEY=$(grep "TP_CAPITAL_API_KEY=" /home/marce/Projetos/TradingSystem/.env | cut -d'=' -f2)
echo "   curl -X POST -H \"X-API-Key: $API_KEY\" \\"
echo "     http://localhost:4005/sync-messages | jq '{success, message}'"
echo ""
curl -s -X POST -H "X-API-Key: $API_KEY" \
  http://localhost:4005/sync-messages | jq '{success, message}'
echo ""
echo "=========================================================="
echo "🎉 Restart Completo Concluído!"
echo "=========================================================="
echo ""
echo "📝 Próximos Passos:"
echo "   1. Abrir Dashboard: http://localhost:3103/tp-capital"
echo "   2. Clicar em 'Checar Mensagens'"
echo "   3. Verificar se funciona sem erro de porta"
echo ""
echo "📚 Logs:"
echo "   • Gateway: backend/api/telegram-gateway/logs/gateway.log"
echo "   • TP Capital: apps/tp-capital/logs/tp-capital.log"
echo "   • Dashboard: frontend/dashboard/logs/dashboard.log"
echo ""

