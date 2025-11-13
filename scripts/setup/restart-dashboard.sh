#!/bin/bash

# ============================================================================
# Restart Dashboard Service
# ============================================================================
# This script restarts the frontend dashboard
# ============================================================================

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
LOG_DIR="$PROJECT_ROOT/frontend/dashboard/logs"
LOG_FILE="$LOG_DIR/dev-server.log"
DASHBOARD_PORT="${DASHBOARD_PORT:-9080}"
LEGACY_DASHBOARD_PORT=3103

# Create logs directory if doesn't exist
mkdir -p "$LOG_DIR"

echo "=================================================="
echo "Dashboard - Restart"
echo "=================================================="
echo ""

# 1. Kill process on port 3103
echo "1. Liberando porta ${DASHBOARD_PORT}..."
lsof -ti:"${DASHBOARD_PORT}" | xargs kill -9 2>/dev/null || true
if [ "$LEGACY_DASHBOARD_PORT" != "$DASHBOARD_PORT" ]; then
  lsof -ti:"${LEGACY_DASHBOARD_PORT}" | xargs kill -9 2>/dev/null || true
fi
pkill -9 -f "vite.*dashboard" 2>/dev/null || true
pkill -9 -f "npm.*dashboard.*dev" 2>/dev/null || true
sleep 2
echo "   ✅ Porta ${DASHBOARD_PORT} liberada"
echo ""

# 2. Start Dashboard
echo "2. Iniciando Dashboard..."
cd "$PROJECT_ROOT/frontend/dashboard"

# Clear old log
> "$LOG_FILE"

# Start in background
nohup npm run dev > "$LOG_FILE" 2>&1 &
DASH_PID=$!
echo "   PID: $DASH_PID"
echo "   Log: $LOG_FILE"
echo ""

# 3. Wait for startup (Vite takes ~5-10 seconds)
echo "3. Aguardando inicialização (15 segundos)..."
for i in {1..15}; do
    echo -n "."
    sleep 1
done
echo ""
echo ""

# 4. Check if running
echo "4. Verificando status..."
if curl -s http://localhost:${DASHBOARD_PORT} > /dev/null 2>&1; then
    echo "   ✅ Dashboard respondendo!"
    echo ""
    
    # Check for Vite in logs
    if grep -q "Local:.*http://localhost:${DASHBOARD_PORT}" "$LOG_FILE" 2>/dev/null; then
        echo "   ✅ Vite dev server ativo"
        echo ""
        grep "Local:" "$LOG_FILE" | tail -1
    fi
else
    echo "   ⚠️  Dashboard ainda não respondendo"
    echo "   Aguarde mais alguns segundos ou verifique log"
fi

echo ""
echo "=================================================="
echo "Dashboard Status"
echo "=================================================="
echo ""
echo "  🌐 URL: http://localhost:${DASHBOARD_PORT}"
echo "  📋 PID: $DASH_PID"
echo "  📝 Log: $LOG_FILE"
echo ""
echo "Comandos úteis:"
echo "  Ver logs: tail -f $LOG_FILE"
echo "  Parar: kill $DASH_PID"
echo ""
echo "Próximo passo:"
echo "  Abrir http://localhost:${DASHBOARD_PORT} no navegador"
echo "  Navegar para TP Capital e testar sincronização"
echo ""
echo "=================================================="

