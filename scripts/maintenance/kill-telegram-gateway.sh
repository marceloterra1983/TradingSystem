#!/bin/bash

set -e

echo "🔍 Matando TODOS os processos relacionados ao Telegram Gateway..."
echo ""

# 1. Matar processos nas portas específicas
echo "🔍 Verificando processos na porta 4006 (Telegram Gateway MTProto)..."
PID_4006=$(lsof -ti:4006 || echo "")

if [ -n "$PID_4006" ]; then
  echo "⚠️  Processo encontrado na porta 4006 (PID: $PID_4006)"
  ps -p $PID_4006 -o pid,cmd --no-headers
  echo "🔪 Matando processo..."
  kill -9 $PID_4006
  echo "✅ Processo $PID_4006 terminado"
else
  echo "✅ Porta 4006 está livre"
fi

echo ""
echo "🔍 Verificando processos na porta 4010 (Telegram Gateway REST API)..."
PID_4010=$(lsof -ti:4010 || echo "")

if [ -n "$PID_4010" ]; then
  echo "⚠️  Processo encontrado na porta 4010 (PID: $PID_4010)"
  ps -p $PID_4010 -o pid,cmd --no-headers
  echo "🔪 Matando processo..."
  kill -9 $PID_4010
  echo "✅ Processo $PID_4010 terminado"
else
  echo "✅ Porta 4010 está livre"
fi

# 2. Matar todos os processos nodemon relacionados ao telegram-gateway
echo ""
echo "🔍 Procurando processos nodemon do Telegram Gateway..."
NODEMON_PIDS=$(ps aux | grep -i "nodemon.*telegram" | grep -v grep | awk '{print $2}' || echo "")

if [ -n "$NODEMON_PIDS" ]; then
  echo "⚠️  Processos nodemon encontrados:"
  ps aux | grep -i "nodemon.*telegram" | grep -v grep
  echo ""
  for PID in $NODEMON_PIDS; do
    echo "🔪 Matando nodemon PID: $PID"
    kill -9 $PID 2>/dev/null || true
  done
  echo "✅ Processos nodemon terminados"
else
  echo "✅ Nenhum processo nodemon do Telegram Gateway encontrado"
fi

# 3. Matar processos node rodando src/index.js ou src/server.js do telegram-gateway
echo ""
echo "🔍 Procurando processos node do Telegram Gateway..."
NODE_PIDS=$(ps aux | grep -E "node.*(telegram-gateway|apps/telegram-gateway)" | grep -v grep | awk '{print $2}' || echo "")

if [ -n "$NODE_PIDS" ]; then
  echo "⚠️  Processos node encontrados:"
  ps aux | grep -E "node.*(telegram-gateway|apps/telegram-gateway)" | grep -v grep
  echo ""
  for PID in $NODE_PIDS; do
    echo "🔪 Matando node PID: $PID"
    kill -9 $PID 2>/dev/null || true
  done
  echo "✅ Processos node terminados"
else
  echo "✅ Nenhum processo node do Telegram Gateway encontrado"
fi

echo ""
echo "✅ Limpeza completa! Todas as instâncias do Telegram Gateway foram terminadas."
echo ""
echo "Aguarde 2 segundos para garantir que as portas sejam liberadas..."
sleep 2

echo ""
echo "Agora você pode executar:"
echo "  bash tools/scripts/start-local-telegram-gateway.sh"

