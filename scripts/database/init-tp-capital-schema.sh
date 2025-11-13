#!/bin/bash
################################################################################
# TP Capital Database Schema Initialization
#
# Purpose: Initialize TP Capital TimescaleDB schema manually
# Usage: sudo bash scripts/database/init-tp-capital-schema.sh
################################################################################

set -e

echo "🔧 Initializing TP Capital database schema..."

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q 'tp-capital-timescale'; then
  echo "❌ TP Capital TimescaleDB container is not running"
  echo "Start it with: docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d"
  exit 1
fi

# Execute init script
echo "📝 Executing 01-init-schema.sql..."
cat backend/data/timescaledb/tp-capital/01-init-schema.sql | \
  docker exec -i tp-capital-timescale psql -U tp_capital -d tp_capital_db

echo ""
echo "✅ Schema initialization complete!"
echo ""

# Verify schema creation
echo "🔍 Verifying schema..."
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "\dn"

echo ""
echo "📊 Verifying tables..."
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "\dt signals.*"

echo ""
echo "✅ TP Capital database is ready!"
