#!/usr/bin/env bash
# ==============================================================================
# Add TP-Capital Stack Environment Variables
# ==============================================================================
# This script adds the required environment variables for TP-Capital stack
# to the root .env file
# ==============================================================================

set -euo pipefail

ENV_FILE="/home/marce/Projetos/TradingSystem/.env"

echo "==============================================="
echo "TP-Capital Stack - Environment Variables Setup"
echo "==============================================="
echo ""

# Generate secure random passwords
TP_CAPITAL_DB_PASSWORD=$(openssl rand -base64 32)
TELEGRAM_DB_PASSWORD_EXISTING=$(grep "^TELEGRAM_DB_PASSWORD=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 || echo "")

if [ -z "$TELEGRAM_DB_PASSWORD_EXISTING" ]; then
  TELEGRAM_DB_PASSWORD=$(openssl rand -base64 32)
  echo "ℹ️  TELEGRAM_DB_PASSWORD not found, generating new password"
else
  TELEGRAM_DB_PASSWORD="$TELEGRAM_DB_PASSWORD_EXISTING"
  echo "✓ TELEGRAM_DB_PASSWORD already exists, reusing"
fi

echo ""
echo "Adding variables to $ENV_FILE:"
echo ""
echo "  TP_CAPITAL_DB_PASSWORD=****** (generated)"
echo "  TP_CAPITAL_DB_USER=tp_capital"
echo "  TP_CAPITAL_DB_NAME=tp_capital_db"
echo "  TP_CAPITAL_DB_PORT=5435"
echo "  TP_CAPITAL_DB_STRATEGY=timescale"
echo ""

if [ -z "$TELEGRAM_DB_PASSWORD_EXISTING" ]; then
  echo "  TELEGRAM_DB_PASSWORD=****** (generated)"
  echo "  TELEGRAM_DB_USER=telegram"
  echo ""
fi

# Backup .env
cp "$ENV_FILE" "$ENV_FILE.backup-$(date +%Y%m%d-%H%M%S)"
echo "✓ Backup created: $ENV_FILE.backup-$(date +%Y%m%d-%H%M%S)"
echo ""

# Add variables
cat >> "$ENV_FILE" <<EOF

# ==============================================================================
# TP-Capital Stack (Added $(date))
# ==============================================================================
TP_CAPITAL_DB_PASSWORD=${TP_CAPITAL_DB_PASSWORD}
TP_CAPITAL_DB_USER=tp_capital
TP_CAPITAL_DB_NAME=tp_capital_db
TP_CAPITAL_DB_PORT=5435
TP_CAPITAL_PGBOUNCER_PORT=6435
TP_CAPITAL_REDIS_PORT=6381
TP_CAPITAL_REDIS_REPLICA_PORT=6382
TP_CAPITAL_DB_STRATEGY=timescale
TP_CAPITAL_DB_HOST=tp-capital-pgbouncer
EOF

if [ -z "$TELEGRAM_DB_PASSWORD_EXISTING" ]; then
  cat >> "$ENV_FILE" <<EOF

# Telegram Gateway Database (if not already defined)
TELEGRAM_DB_PASSWORD=${TELEGRAM_DB_PASSWORD}
TELEGRAM_DB_USER=telegram
EOF
fi

echo "✅ Environment variables added successfully!"
echo ""
echo "Next steps:"
echo "  1. Review the .env file if needed"
echo "  2. Start the TP-Capital stack:"
echo "     docker compose -f tools/compose/docker-compose.tp-capital-stack.yml up -d"
echo ""
echo "==============================================="

