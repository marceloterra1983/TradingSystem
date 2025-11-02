#!/bin/bash

# ============================================================================
# Fix TP Capital Timestamp Issue
# ============================================================================
# Kills old server, starts fresh one with updated code
# Requires sudo to kill process on port 4005
# ============================================================================

set -e

echo "=================================================="
echo "TP Capital - Fix Timestamp Issue"
echo "=================================================="
echo ""

# 1. Kill process on port 4005 (requires sudo)
echo "1. Liberando porta 4005..."
sudo fuser -k 4005/tcp 2>/dev/null || true
sleep 2
echo "   ✅ Porta 4005 liberada"
echo ""

# 2. Kill ALL tp-capital processes
echo "2. Matando processos residuais..."
pkill -9 -f "node.*tp-capital" 2>/dev/null || true
pkill -9 -f "npm.*tp-capital" 2>/dev/null || true
pkill -9 -f "node.*server.js" 2>/dev/null || true
sleep 2
echo "   ✅ Processos limpos"
echo ""

# 3. Start TP Capital with fresh code
echo "3. Iniciando TP Capital com código atualizado..."
cd /home/marce/Projetos/TradingSystem/apps/tp-capital
mkdir -p logs

# Start with nohup to keep running
nohup node src/server.js > logs/server.log 2>&1 &
PID=$!
echo "   ✅ PID: $PID"
sleep 8
echo ""

# 4. Verify running
echo "4. Verificando status..."
if ps -p $PID > /dev/null 2>&1; then
    echo "   ✅ Processo rodando"
else
    echo "   ❌ Processo morreu! Ver logs:"
    tail -20 logs/server.log
    exit 1
fi
echo ""

# 5. Test health
echo "5. Testando health..."
HEALTH=$(curl -s http://localhost:4005/healthz)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "   ✅ Servidor saudável"
else
    echo "   ❌ Servidor não respondendo"
    exit 1
fi
echo ""

# 6. Test timestamp fix
echo "6. Testando correção de timestamp..."
RESPONSE=$(curl -s "http://localhost:4005/signals?limit=1")
TS=$(echo "$RESPONSE" | jq -r '.data[0].ts')

if [ "$TS" = "null" ] || [ -z "$TS" ]; then
    echo "   ❌ ts ainda está null!"
    echo "   Resposta completa:"
    echo "$RESPONSE" | jq '.data[0]'
    echo ""
    echo "   Verificando banco de dados diretamente..."
    PGPASSWORD=pass_timescale psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -c \
      "SELECT id, ts, asset FROM tp_capital.signals_v2 WHERE ts IS NOT NULL LIMIT 1;"
else
    echo "   ✅ ts funcionando! Valor: $TS"
    echo "   Data legível: $(node -e "console.log(new Date($TS).toLocaleString('pt-BR'))")"
fi

echo ""
echo "=================================================="
echo "Servidor Info"
echo "=================================================="
echo "  🌐 URL: http://localhost:4005"
echo "  📋 PID: $PID"
echo "  📝 Log: logs/server.log"
echo "  🔍 Ver logs: tail -f logs/server.log"
echo "=================================================="

