#!/bin/bash
# Script para limpar completamente o cache do Vite e forçar rebuild

echo "🧹 Limpando cache do Vite..."
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist
rm -rf .cache

echo "✅ Cache limpo!"
echo ""
echo "📝 Próximos passos:"
echo "1. Pare o servidor de desenvolvimento (Ctrl+C)"
echo "2. Execute: npm run dev"
echo "3. No navegador, faça um hard refresh:"
echo "   - Windows/Linux: Ctrl + Shift + R ou Ctrl + F5"
echo "   - Mac: Cmd + Shift + R"
echo ""
echo "💡 Ou limpe o cache do navegador manualmente:"
echo "   - Chrome/Edge: DevTools (F12) → Application → Clear storage → Clear site data"
echo "   - Firefox: DevTools (F12) → Storage → Clear All"

