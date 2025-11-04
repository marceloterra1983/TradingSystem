#!/bin/bash

#################################################################
# Script: fix-api-ports.sh
# Purpose: Atualizar portas das APIs no .env para corresponder aos containers
# Author: TradingSystem Maintenance
# Date: 2025-11-03
#################################################################

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
ENV_FILE="$PROJECT_ROOT/.env"

echo "=================================================="
echo "  Fix API Ports - Environment Variables"
echo "=================================================="
echo ""

# Verificar se o arquivo .env existe
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Arquivo .env não encontrado em: $ENV_FILE"
  exit 1
fi

echo "[INFO] Fazendo backup do .env..."
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup criado: $ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo ""

echo "[INFO] Corrigindo portas das APIs..."

# Workspace API: 3200 → 3201
if grep -q "VITE_WORKSPACE_API_URL=http://localhost:3200" "$ENV_FILE"; then
  echo "  🔧 Atualizando VITE_WORKSPACE_API_URL: 3200 → 3201"
  sed -i 's|VITE_WORKSPACE_API_URL=http://localhost:3200|VITE_WORKSPACE_API_URL=http://localhost:3201|g' "$ENV_FILE"
fi

# Adicionar variável para Docs Hub se não existir (porta 3404)
if ! grep -q "VITE_DOCUSAURUS_URL" "$ENV_FILE"; then
  echo "  ➕ Adicionando VITE_DOCUSAURUS_URL=http://localhost:3404"
  echo "" >> "$ENV_FILE"
  echo "# Docusaurus Hub (NGINX serving static docs)" >> "$ENV_FILE"
  echo "VITE_DOCUSAURUS_URL=http://localhost:3404" >> "$ENV_FILE"
  echo "DOCS_PORT=3404" >> "$ENV_FILE"
fi

echo ""
echo "=================================================="
echo "  ✅ Correções aplicadas com sucesso!"
echo "=================================================="
echo ""
echo "Alterações feitas:"
echo "  - VITE_WORKSPACE_API_URL: http://localhost:3200 → http://localhost:3201"
echo "  - VITE_DOCUSAURUS_URL: http://localhost:3404 (adicionado)"
echo ""
echo "Próximos passos:"
echo "  1. Reiniciar o dashboard: cd frontend/dashboard && npm run dev"
echo "  2. Ou usar: stop && start"
echo ""






