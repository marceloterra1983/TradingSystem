#!/bin/bash
# Quick fix script to ensure TELEGRAM_DB_PASSWORD is accessible to Docker Compose

set -e

echo "🔧 Fixing TELEGRAM_DB_PASSWORD for Docker Compose..."
echo ""

# Export the password from .env
export TELEGRAM_DB_PASSWORD=$(grep "^TELEGRAM_DB_PASSWORD=" .env | cut -d'=' -f2)
export TELEGRAM_RABBITMQ_PASSWORD=$(grep "^TELEGRAM_RABBITMQ_PASSWORD=" .env | cut -d'=' -f2)

if [ -z "$TELEGRAM_DB_PASSWORD" ]; then
  echo "❌ TELEGRAM_DB_PASSWORD not found in .env"
  exit 1
fi

echo "✅ TELEGRAM_DB_PASSWORD loaded: ${TELEGRAM_DB_PASSWORD:0:10}..."
echo "✅ TELEGRAM_RABBITMQ_PASSWORD loaded: ${TELEGRAM_RABBITMQ_PASSWORD:0:10}..."
echo ""

echo "🚀 Restarting TP Capital with correct environment..."
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital

echo ""
echo "✅ Done! Checking container..."
docker ps --filter "name=apps-tpcapital" --format "{{.Names}}: {{.Status}}"

echo ""
echo "📋 To verify connection, check logs:"
echo "   docker logs apps-tpcapital --tail 50"
