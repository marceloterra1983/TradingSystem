#!/bin/bash
# TradingSystem - START WITH GATEWAY
# Inicia CORE + Kong Gateway

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "🚀 TRADINGSYSTEM - START WITH GATEWAY"
echo "=========================================="
echo ""

# Start minimal first
echo "1️⃣ Iniciando CORE services..."
bash "$PROJECT_ROOT/scripts/presets/start-minimal.sh"
echo ""

# Add Kong
echo "2️⃣ Adicionando Kong Gateway..."
docker compose -f tools/compose/docker-compose.kong.yml up -d
echo "   ✅ Kong Gateway rodando"
echo ""

echo "=========================================="
echo "✅ SISTEMA COM GATEWAY OPERACIONAL!"
echo "=========================================="
echo ""
echo "Serviços adicionais:"
echo "   ✅ Kong Gateway: http://localhost:8000"
echo "   ✅ Kong Admin:   http://localhost:8001"
echo ""
