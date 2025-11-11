#!/bin/bash
#
# Enable GPU Support for Ollama Container
# 
# This script modifies docker-compose.4-4-rag-stack.yml to use nvidia runtime
# Requires: NVIDIA Container Toolkit installed (already confirmed ✅)
#
# RTX 5090 detected - should provide 10-100x faster embeddings!
#

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.4-4-rag-stack.yml"

echo "🎮 Configurando Ollama para usar GPU RTX 5090..."
echo ""

# Backup do compose file
cp "$COMPOSE_FILE" "$COMPOSE_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup criado"

# Add runtime: nvidia to ollama service
# Usar sed para adicionar a linha após "container_name: rag-ollama"
sed -i '/container_name: rag-ollama/a\    runtime: nvidia' "$COMPOSE_FILE"

echo "✅ Adicionado runtime: nvidia ao serviço ollama"
echo ""

# Verificar se a mudança foi aplicada
if grep -q "runtime: nvidia" "$COMPOSE_FILE"; then
    echo "✅ Configuração aplicada com sucesso!"
else
    echo "❌ Falha ao aplicar configuração"
    exit 1
fi

echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Recriar o container Ollama com GPU:"
echo "   cd $PROJECT_ROOT"
echo "   docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d --force-recreate rag-ollama"
echo ""
echo "2. Verificar se a GPU está acessível:"
echo "   docker exec rag-ollama nvidia-smi"
echo ""
echo "3. Testar performance:"
echo "   - Antes: 3 arquivos = 10-15s"
echo "   - Depois (esperado): 3 arquivos < 2s  (5-10x mais rápido!)"
echo ""
echo "⚠️  IMPORTANTE: Você precisa executar os comandos acima para aplicar as mudanças!"
echo ""

