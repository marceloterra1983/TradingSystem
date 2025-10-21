#!/bin/bash

# Script para abrir o protótipo Gemini CLI no navegador
# Uso: bash OPEN.sh

echo "🎨 Abrindo protótipo Gemini CLI..."
echo ""

# Detectar navegador disponível
if command -v google-chrome &> /dev/null; then
    echo "✅ Abrindo no Google Chrome..."
    google-chrome index.html
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Abrindo no Chromium..."
    chromium-browser index.html
elif command -v firefox &> /dev/null; then
    echo "✅ Abrindo no Firefox..."
    firefox index.html
elif command -v xdg-open &> /dev/null; then
    echo "✅ Abrindo no navegador padrão..."
    xdg-open index.html
else
    echo "❌ Nenhum navegador encontrado!"
    echo ""
    echo "📝 Abra manualmente:"
    echo "   file://$(pwd)/index.html"
    exit 1
fi

echo ""
echo "✨ Protótipo aberto com sucesso!"
echo ""
echo "🎯 Recursos:"
echo "   • Theme toggle (dark/light) - canto superior direito"
echo "   • Search modal - Ctrl+K ou clique no botão Search"
echo "   • Sidebar navigation - clique nas categorias"
echo "   • Code copy - botões nos blocos de código"
echo ""
echo "🎨 Visual 100% baseado em: https://geminicli.com/docs/"
