#!/bin/bash
# Shortcut to start TP Capital with proper environment variables

set -e

cd "$(dirname "$0")"

echo "🚀 Starting TP Capital with Telegram database connection..."
echo ""

# Export required variables for Docker Compose substitution
export TELEGRAM_DB_PASSWORD=$(grep "^TELEGRAM_DB_PASSWORD=" .env | cut -d'=' -f2)
export TELEGRAM_RABBITMQ_PASSWORD=$(grep "^TELEGRAM_RABBITMQ_PASSWORD=" .env | cut -d'=' -f2)

if [ -z "$TELEGRAM_DB_PASSWORD" ]; then
  echo "❌ ERROR: TELEGRAM_DB_PASSWORD not found in .env"
  echo "   Run: grep TELEGRAM_DB_PASSWORD .env"
  exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Start container
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital

echo ""
echo "✅ TP Capital started!"
echo ""
echo "📊 Check status:"
echo "   docker ps --filter 'name=apps-tpcapital'"
echo ""
echo "📋 View logs:"
echo "   docker logs -f apps-tpcapital"
echo ""
echo "🔍 Test database connection:"
echo "   docker exec apps-tpcapital node -e \"const pg = require('pg'); const pool = new pg.Pool({connectionString: process.env.TELEGRAM_GATEWAY_DB_URL}); pool.query('SELECT COUNT(*) FROM telegram_gateway.messages').then(r => console.log('Messages:', r.rows[0].count)).catch(e => console.error(e.message)).finally(() => pool.end());\""
echo ""

