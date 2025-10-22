#!/bin/bash

echo "Instalando extensões para botões do terminal..."

# Lista de extensões para botões de terminal
EXTENSIONS=(
    "ms-vscode.terminal-copy-button"
    "ms-vscode.terminal-commands"
    "ms-vscode.terminal-tabs"
    "ms-vscode.terminal-manager"
)

# Tentar instalar via cursor (se disponível)
if command -v cursor &> /dev/null; then
    for ext in "${EXTENSIONS[@]}"; do
        echo "Instalando $ext..."
        cursor --install-extension "$ext" || echo "Erro ao instalar $ext"
    done
else
    echo "Cursor CLI não encontrado. Instale manualmente:"
    echo "1. Ctrl+Shift+X (abrir extensões)"
    echo "2. Procurar: Terminal Copy Button"
    echo "3. Instalar"
    echo "4. Procurar: Terminal Commands"
    echo "5. Instalar"
fi

echo "Extensões instaladas!"

