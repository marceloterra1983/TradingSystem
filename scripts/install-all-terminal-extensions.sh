#!/bin/bash

echo "🚀 Instalando todas as extensões de terminal..."

# Lista completa de extensões
EXTENSIONS=(
    "terminal-copy-button"
    "terminal-commands" 
    "terminal-tabs"
    "terminal-manager"
    "terminal-runner"
    "command-runner"
    "terminal-helper"
    "terminal-colors"
    "terminal-themes"
    "gitlens"
    "git-graph"
    "docker"
    "docker-compose"
)

echo "📋 Extensões que serão instaladas:"
for ext in "${EXTENSIONS[@]}"; do
    echo "  - $ext"
done

echo ""
echo "🔧 Instruções de instalação:"
echo "1. Pressione Ctrl+Shift+X"
echo "2. Procure por cada extensão:"
for ext in "${EXTENSIONS[@]}"; do
    echo "   - $ext"
done
echo "3. Clique em 'Install' em cada uma"
echo "4. Reinicie o Cursor"

echo ""
echo "🎯 Extensões mais importantes para botões:"
echo "  - Terminal Copy Button (ESSENCIAL)"
echo "  - Terminal Commands (MUITO ÚTIL)"
echo "  - Terminal Tabs (ÚTIL)"
echo "  - Terminal Manager (ÚTIL)"

echo ""
echo "✅ Após instalar, teste no terminal!"









