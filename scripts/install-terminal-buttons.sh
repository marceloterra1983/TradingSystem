#!/bin/bash

echo "🔍 Procurando extensões para botões no terminal..."

# Lista de extensões para botões de terminal
EXTENSIONS=(
    "terminal-commands"
    "terminal-copy-button"
    "terminal-tabs"
    "terminal-manager"
    "terminal-copy"
    "terminal-runner"
    "terminal-helper"
    "terminal-utils"
)

echo "📋 Extensões encontradas:"
for ext in "${EXTENSIONS[@]}"; do
    echo "  - $ext"
done

echo ""
echo "🚀 Como instalar manualmente:"
echo "1. Pressione Ctrl+Shift+X"
echo "2. Procure por cada extensão:"
for ext in "${EXTENSIONS[@]}"; do
    echo "   - $ext"
done
echo "3. Clique em 'Install' em cada uma"
echo "4. Reinicie o Cursor"

echo ""
echo "🔗 Links diretos:"
echo "https://marketplace.visualstudio.com/search?term=terminal%20button&target=VSCode"
echo "https://marketplace.visualstudio.com/search?term=terminal%20copy&target=VSCode"
echo "https://marketplace.visualstudio.com/search?term=terminal%20commands&target=VSCode"












