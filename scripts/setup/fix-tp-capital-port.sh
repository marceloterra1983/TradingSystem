#!/usr/bin/env bash
# Fix TP-Capital port in .env (change from 5435 to 5437)

ENV_FILE="/home/marce/Projetos/TradingSystem/.env"

echo "Fixing TP_CAPITAL_DB_PORT in .env..."

# Check if variable exists
if grep -q "^TP_CAPITAL_DB_PORT=" "$ENV_FILE"; then
  # Update existing
  sed -i 's/^TP_CAPITAL_DB_PORT=.*/TP_CAPITAL_DB_PORT=5437/' "$ENV_FILE"
  echo "✓ Updated TP_CAPITAL_DB_PORT=5437"
else
  # Add new
  echo "TP_CAPITAL_DB_PORT=5437" >> "$ENV_FILE"
  echo "✓ Added TP_CAPITAL_DB_PORT=5437"
fi

echo ""
echo "Current value:"
grep "^TP_CAPITAL_DB_PORT=" "$ENV_FILE"

