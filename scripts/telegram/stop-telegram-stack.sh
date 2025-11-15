#!/bin/bash
# ==============================================================================
# Stop Telegram Stack (Gracefully)
# ==============================================================================

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"

echo "🛑 Stopping Telegram Stack..."
echo ""

# ==============================================================================
# Step 1: Stop Native MTProto Service
# ==============================================================================
echo "1️⃣ Stopping MTProto native service..."

if systemctl is-active --quiet telegram-gateway; then
  sudo systemctl stop telegram-gateway
  echo "  ✅ Stopped"
else
  echo "  Already stopped"
fi

cd "$PROJECT_ROOT/tools/compose"

# ==============================================================================
# Step 2: Stop Data Layer
# ==============================================================================
echo ""
echo "2️⃣ Stopping data layer containers (7)..."
docker compose -f docker-compose.4-2-telegram-stack.yml down

echo "  ✅ Stopped"

echo ""
echo "✅ Telegram Stack stopped!"
echo ""
echo "ℹ️  Data preserved in Docker volumes:"
echo "  • telegram-timescaledb-data"
echo "  • telegram-rabbitmq-data"
echo ""
echo "To restart: bash $PROJECT_ROOT/scripts/telegram/start-telegram-stack.sh"
echo "To remove volumes: docker compose -f docker-compose.4-2-telegram-stack.yml down -v"
echo ""

