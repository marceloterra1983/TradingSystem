#!/bin/bash
# Script para autenticar o MTProto com o Telegram
# Uso: bash scripts/telegram/authenticate-mtproto.sh

set -e

echo "🔐 Autenticação do Telegram MTProto"
echo "===================================="
echo ""
echo "⚠️  Este script vai iniciar o processo de autenticação interativo."
echo "    Você precisará fornecer:"
echo "    1. Número de telefone (formato: +5567991908000)"
echo "    2. Código SMS que será enviado para seu telefone"
echo "    3. Senha de 2FA (se configurada)"
echo ""
read -p "Pressione ENTER para continuar ou Ctrl+C para cancelar..."

echo ""
echo "📱 Iniciando autenticação interativa..."
docker exec -it telegram-mtproto node src/authenticate-interactive.js

echo ""
echo "✅ Autenticação concluída!"
echo ""
echo "🔄 Reiniciando MTProto para aplicar a sessão..."
docker restart telegram-mtproto

sleep 5

echo ""
echo "✅ MTProto reiniciado com sucesso!"
echo ""
echo "📊 Status do serviço:"
docker exec telegram-mtproto curl -s http://localhost:4007/health 2>/dev/null | jq .

echo ""
echo "🎉 Processo concluído! Verifique o Dashboard."
