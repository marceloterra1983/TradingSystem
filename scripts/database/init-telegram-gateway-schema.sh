#!/bin/bash
################################################################################
# Telegram Gateway Database Schema Initialization
#
# Purpose: Initialize Telegram Gateway TimescaleDB schema manually
# Usage: sudo bash scripts/database/init-telegram-gateway-schema.sh
################################################################################

set -e

echo "🔧 Initializing Telegram Gateway database schema..."

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q 'telegram-timescale'; then
  echo "❌ Telegram TimescaleDB container is not running"
  echo "Start it with: docker compose -f tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml up -d"
  exit 1
fi

# Execute init scripts in order
echo "📝 Executing initialization scripts..."

for SQL_FILE in backend/data/timescaledb/telegram-gateway/*.sql; do
  FILENAME=$(basename "$SQL_FILE")
  echo "  → Executing $FILENAME..."

  cat "$SQL_FILE" | \
    docker exec -i telegram-timescale psql -U telegram -d telegram_gateway || {
      echo "    ⚠️  Warning: $FILENAME had errors (may be expected if already initialized)"
    }
done

echo ""
echo "✅ Schema initialization complete!"
echo ""

# Verify schema creation
echo "🔍 Verifying schemas..."
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "\dn"

echo ""
echo "📊 Verifying tables..."
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "\dt telegram_gateway.*"

echo ""
echo "✅ Telegram Gateway database is ready!"
