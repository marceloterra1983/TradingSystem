#!/usr/bin/env bash
#
# Fix permissions for collections-config.json
# Allows container (running as nodejs user) to write to the file
#

set -e

CONFIG_FILE="/home/marce/Projetos/TradingSystem/tools/rag-services/collections-config.json"

echo "🔧 Corrigindo permissões do arquivo de coleções..."
echo ""
echo "Arquivo: $CONFIG_FILE"
echo ""

# Give write permissions to all users (666) - safe for local development
chmod 666 "$CONFIG_FILE"

echo "✅ Permissões atualizadas!"
echo ""
ls -l "$CONFIG_FILE"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Agora o container pode gravar no arquivo!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

