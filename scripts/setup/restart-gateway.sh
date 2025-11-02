#!/usr/bin/bash
#
# restart-gateway.sh
# Restart Telegram Gateway service (port 4010)
#

set -e

echo "=================================================="
echo "Telegram Gateway - Force Restart"
echo "=================================================="

# 1. Kill port 4010
echo "1. Liberando porta 4010..."
PID=$(lsof -ti:4010 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "Matando PID: $PID"
  kill -9 $PID 2>/dev/null || true
  sleep 2
fi
echo "✅ Porta 4010 liberada"

# 2. Kill residual processes
echo "2. Matando processos residuais..."
pkill -9 -f "telegram-gateway" || true
sleep 1
echo "✅ Processos limpos"

# 3. Start Telegram Gateway
echo "3. Iniciando Telegram Gateway..."
cd /home/marce/Projetos/TradingSystem/backend/api/telegram-gateway

# Create logs directory
mkdir -p logs

# Start in background
nohup npm run dev > logs/gateway.log 2>&1 &
GATEWAY_PID=$!
echo "Telegram Gateway PID: $GATEWAY_PID"

# Wait for startup
sleep 8

# 4. Health check
echo ""
echo "=== Testando Gateway ==="
curl -s http://localhost:4010/health | jq '.' || curl -s http://localhost:4010/health

echo ""
echo "✅ Telegram Gateway reiniciado com sucesso!"
echo ""
echo "Logs: backend/api/telegram-gateway/logs/gateway.log"
echo "Health: http://localhost:4010/health"
echo "Overview: http://localhost:4010/api/telegram-gateway/overview"

