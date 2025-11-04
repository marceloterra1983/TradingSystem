#!/bin/bash

#################################################################
# Script: restart-dashboard.sh
# Purpose: Reiniciar o dashboard com cache limpo
# Author: TradingSystem Maintenance
# Date: 2025-11-03
#################################################################

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
DASHBOARD_DIR="$PROJECT_ROOT/frontend/dashboard"

echo "=================================================="
echo "  Restart Dashboard - Clean Cache"
echo "=================================================="
echo ""

echo "[INFO] Parando o dashboard..."
# Encontrar e matar processo na porta 3103
PIDS=$(lsof -t -i:3103 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "  Matando processo(s): $PIDS"
  kill -15 $PIDS 2>/dev/null || true
  sleep 2
  
  # Force kill se necessário
  PIDS=$(lsof -t -i:3103 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "  Force killing processo(s): $PIDS"
    kill -9 $PIDS 2>/dev/null || true
  fi
fi

echo "[INFO] Limpando cache do Vite..."
rm -rf "$DASHBOARD_DIR/node_modules/.vite" 2>/dev/null || true
rm -rf "$DASHBOARD_DIR/.vite" 2>/dev/null || true

echo "[INFO] Aguardando porta liberar..."
sleep 2

echo ""
echo "=================================================="
echo "  ✅ Dashboard parado e cache limpo"
echo "=================================================="
echo ""
echo "Para reiniciar o dashboard, execute:"
echo "  cd $DASHBOARD_DIR"
echo "  npm run dev"
echo ""
echo "Ou use o comando universal:"
echo "  start"
echo ""






