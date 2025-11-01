#!/usr/bin/env bash
#
# Sync Collections from Qdrant to Configuration File
# This script reads all collections from Qdrant and adds missing ones to collections-config.json
#

set -e

QDRANT_URL="http://localhost:6333"
CONFIG_FILE="/home/marce/Projetos/TradingSystem/tools/rag-services/collections-config.json"

echo "🔄 Sincronizando coleções do Qdrant para arquivo de configuração..."
echo ""

# Get collections from Qdrant
echo "📊 Buscando coleções do Qdrant..."
QDRANT_COLLECTIONS=$(curl -s "$QDRANT_URL/collections" | jq -r '.result.collections[].name' | sort)

# Get collections from config file
echo "📄 Lendo arquivo de configuração..."
CONFIG_COLLECTIONS=$(jq -r '.collections[].name' "$CONFIG_FILE" | sort)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 COMPARAÇÃO:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Coleções no Qdrant:"
echo "$QDRANT_COLLECTIONS" | nl
echo ""
echo "Coleções no arquivo:"
echo "$CONFIG_COLLECTIONS" | nl
echo ""

# Find missing collections
MISSING=$(comm -23 <(echo "$QDRANT_COLLECTIONS") <(echo "$CONFIG_COLLECTIONS"))

if [ -z "$MISSING" ]; then
  echo "✅ Todas as coleções do Qdrant estão no arquivo de configuração!"
else
  echo "⚠️  Coleções no Qdrant MAS NÃO no arquivo:"
  echo "$MISSING" | nl
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Para adicionar essas coleções ao arquivo:"
  echo "   1. Use o dashboard para recriar as coleções"
  echo "   2. OU adicione manualmente ao arquivo:"
  echo "      $CONFIG_FILE"
  echo ""
  echo "Exemplo para 'tradingsystem':"
  echo '    {
      "name": "tradingsystem",
      "description": "TradingSystem code and documentation",
      "directory": "/data/tradingsystem",
      "embeddingModel": "nomic-embed-text",
      "chunkSize": 512,
      "chunkOverlap": 50,
      "fileTypes": ["md", "mdx", "py", "ts", "tsx"],
      "recursive": true,
      "enabled": true,
      "autoUpdate": false
    }'
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

