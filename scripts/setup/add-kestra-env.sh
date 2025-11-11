#!/bin/bash
# Script to add missing Kestra environment variables to .env
# Run: bash scripts/setup/add-kestra-env.sh

ENV_FILE="/home/marce/Projetos/TradingSystem/.env"

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  Adding Kestra Environment Variables                               ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: .env file not found at $ENV_FILE"
  exit 1
fi

# Check if Kestra variables already exist
if grep -q "KESTRA_HTTP_PORT" "$ENV_FILE"; then
  echo "⚠️  Kestra variables already exist in .env"
  echo ""
  echo "Current values:"
  grep "KESTRA" "$ENV_FILE"
  echo ""
  read -p "Do you want to update them? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. No changes made."
    exit 0
  fi
  
  # Remove old entries
  sed -i '/^KESTRA_/d' "$ENV_FILE"
fi

# Add Kestra section
echo "" >> "$ENV_FILE"
echo "# =============================================================================" >> "$ENV_FILE"
echo "# Kestra Workflow Orchestration" >> "$ENV_FILE"
echo "# =============================================================================" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Kestra Database (PostgreSQL)" >> "$ENV_FILE"
echo "KESTRA_DB_HOST=kestra-postgres" >> "$ENV_FILE"
echo "KESTRA_DB_PORT=5432" >> "$ENV_FILE"
echo "KESTRA_DB_NAME=kestra" >> "$ENV_FILE"
echo "KESTRA_DB_USER=kestra" >> "$ENV_FILE"
echo "KESTRA_DB_PASSWORD=kestra_password_change_in_production" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Kestra Web UI Authentication" >> "$ENV_FILE"
echo "KESTRA_BASICAUTH_USERNAME=admin" >> "$ENV_FILE"
echo "KESTRA_BASICAUTH_PASSWORD=admin_change_in_production" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Kestra HTTP Ports (uso interno; Traefik expõe /kestra e /kestra-management)" >> "$ENV_FILE"
echo "KESTRA_HTTP_PORT=8180" >> "$ENV_FILE"
echo "KESTRA_MANAGEMENT_PORT=8181" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Kestra Storage Directories" >> "$ENV_FILE"
echo "KESTRA_WORKDIR_DIR=./tools/kestra/workdir" >> "$ENV_FILE"
echo "KESTRA_STORAGE_DIR=./tools/kestra/storage" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"

echo "✅ Kestra variables added to .env"
echo ""
echo "📋 Variables added:"
echo "  • KESTRA_DB_HOST=kestra-postgres"
echo "  • KESTRA_DB_PORT=5432"
echo "  • KESTRA_DB_NAME=kestra"
echo "  • KESTRA_DB_USER=kestra"
echo "  • KESTRA_DB_PASSWORD=kestra_password_change_in_production"
echo "  • KESTRA_BASICAUTH_USERNAME=admin"
echo "  • KESTRA_BASICAUTH_PASSWORD=admin_change_in_production"
echo "  • KESTRA_HTTP_PORT=8180 (uso interno, Traefik publica /kestra)"
echo "  • KESTRA_MANAGEMENT_PORT=8181"
echo "  • KESTRA_WORKDIR_DIR=./tools/kestra/workdir"
echo "  • KESTRA_STORAGE_DIR=./tools/kestra/storage"
echo ""
echo "⚠️  IMPORTANT:"
echo "  • Change passwords in production!"
echo "  • Port 8180 chosen to avoid conflict with Adminer (port 8080)"
echo ""
echo "🚀 Next step:"
echo "  bash scripts/start.sh"
echo ""
echo "✅ Kestra will be accessible at: http://localhost:9080/kestra"

