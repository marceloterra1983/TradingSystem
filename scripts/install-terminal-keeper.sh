#!/bin/bash

echo "🚀 Instalando Terminal Keeper..."

# Verificar se cursor está disponível
if command -v cursor &> /dev/null; then
    echo "Instalando via Cursor CLI..."
    cursor --install-extension terminal-keeper
else
    echo "Cursor CLI não encontrado."
    echo ""
    echo "📋 Instruções manuais:"
    echo "1. Pressione Ctrl+Shift+X"
    echo "2. Procure por: Terminal Keeper"
    echo "3. Clique em 'Install'"
    echo "4. Reinicie o Cursor"
    echo ""
    echo "🔗 Ou acesse: https://marketplace.visualstudio.com/items?itemName=terminal-keeper"
fi

echo ""
echo "✅ Terminal Keeper instalado!"
echo "📝 Recarregue o Cursor para ativar"













