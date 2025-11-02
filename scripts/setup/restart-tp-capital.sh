#!/bin/bash

# ============================================================================
# Restart TP Capital Service
# ============================================================================
# This script forcefully kills any process on port 4005 and restarts TP Capital
# Requires sudo for fuser command
# ============================================================================

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
LOG_DIR="$PROJECT_ROOT/apps/tp-capital/logs"
LOG_FILE="$LOG_DIR/server.log"

# Create logs directory if doesn't exist
mkdir -p "$LOG_DIR"

echo "=================================================="
echo "TP Capital - Force Restart"
echo "=================================================="
echo ""

# 1. Kill process on port 4005 (requires sudo)
echo "1. Liberando porta 4005..."
sudo fuser -k 4005/tcp 2>/dev/null || true
sleep 2
echo "   ✅ Porta 4005 liberada"
echo ""

# 2. Kill any remaining node processes for tp-capital
echo "2. Matando processos residuais..."
pkill -9 -f "node.*tp-capital" 2>/dev/null || true
pkill -9 -f "npm.*tp-capital" 2>/dev/null || true
sleep 1
echo "   ✅ Processos limpos"
echo ""

# 3. Start TP Capital
echo "3. Iniciando TP Capital..."
cd "$PROJECT_ROOT/apps/tp-capital"

# Clear old log
> "$LOG_FILE"

# Start in background
nohup node src/server.js > "$LOG_FILE" 2>&1 &
TP_PID=$!
echo "   PID: $TP_PID"
echo "   Log: $LOG_FILE"
echo ""

# 4. Wait for startup
echo "4. Aguardando inicialização (10 segundos)..."
sleep 10
echo ""

# 5. Check if running
echo "5. Verificando status..."
if ps -p $TP_PID > /dev/null 2>&1; then
    echo "   ✅ TP Capital rodando (PID: $TP_PID)"
    echo ""
    
    # Test health endpoint
    echo "6. Testando health endpoint..."
    HEALTH=$(curl -s http://localhost:4005/healthz 2>/dev/null || echo "ERROR")
    
    if echo "$HEALTH" | grep -q "healthy"; then
        echo "   ✅ Servidor saudável!"
        echo "   $HEALTH"
    else
        echo "   ⚠️  Servidor respondendo mas pode ter problemas"
        echo "   $HEALTH"
    fi
else
    echo "   ❌ Processo morreu! Verificando log:"
    echo ""
    tail -30 "$LOG_FILE"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ TP Capital Iniciado com Sucesso!"
echo "=================================================="
echo ""
echo "Informações:"
echo "  🌐 URL: http://localhost:4005"
echo "  📋 PID: $TP_PID"
echo "  📝 Log: $LOG_FILE"
echo ""
echo "Comandos úteis:"
echo "  Ver logs: tail -f $LOG_FILE"
echo "  Parar: kill $TP_PID"
echo "  Health: curl http://localhost:4005/healthz"
echo ""
echo "Próximo passo:"
echo "  Reiniciar Dashboard: bash scripts/setup/restart-dashboard.sh"
echo ""
echo "=================================================="

