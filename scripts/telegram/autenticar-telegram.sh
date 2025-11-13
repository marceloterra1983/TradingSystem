#!/bin/bash
# Script para autenticar o Telegram MTProto
# Uso: bash scripts/telegram/autenticar-telegram.sh

set -e

echo ""
echo "🔐 Autenticação do Telegram MTProto"
echo "===================================="
echo ""
echo "⚠️  IMPORTANTE: Este processo é INTERATIVO"
echo ""
echo "Você precisará fornecer:"
echo "  1. Código SMS enviado para seu telefone"
echo "  2. Senha 2FA (se configurada)"
echo ""
echo "📱 Telefone configurado: Verifique seu .env (TELEGRAM_PHONE_NUMBER)"
echo ""
read -p "Pressione ENTER para iniciar ou Ctrl+C para cancelar..."
echo ""

# Verificar se o container está rodando
if ! docker ps | grep -q telegram-mtproto; then
    echo "❌ Container telegram-mtproto não está rodando!"
    echo ""
    echo "Inicie o container primeiro:"
    echo "  docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml up -d telegram-mtproto"
    exit 1
fi

echo "📡 Iniciando autenticação interativa..."
echo ""

# Executar script de autenticação no container (modo interativo)
docker exec -it telegram-mtproto node authenticate-interactive.js

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Autenticação concluída com sucesso!"
    echo ""
    echo "🔄 Reiniciando MTProto para carregar a sessão..."
    docker restart telegram-mtproto

    echo ""
    echo "⏳ Aguardando serviço iniciar..."
    sleep 5

    echo ""
    echo "📊 Verificando status do serviço..."
    echo ""

    # Verificar health do MTProto
    HEALTH=$(docker exec telegram-mtproto curl -s http://localhost:4007/health 2>/dev/null)

    if echo "$HEALTH" | jq -e '.telegram == "connected"' > /dev/null 2>&1; then
        echo "✅ MTProto conectado ao Telegram com sucesso!"
        echo ""
        echo "$HEALTH" | jq .
    else
        echo "⚠️  MTProto iniciado mas pode não estar conectado ainda"
        echo ""
        echo "$HEALTH" | jq .
        echo ""
        echo "Aguarde alguns segundos e verifique novamente:"
        echo "  curl http://localhost:14007/health | jq ."
    fi

    echo ""
    echo "🎉 Processo concluído!"
    echo ""
    echo "Agora você pode:"
    echo "  1. Acessar o Dashboard em http://localhost:9080"
    echo "  2. Ir para 'Telegram Gateway'"
    echo "  3. Clicar em 'Checar Mensagens' para sincronizar"
    echo ""
else
    echo ""
    echo "❌ Autenticação falhou com código: $EXIT_CODE"
    echo ""
    echo "Verifique:"
    echo "  1. Telefone está correto no .env (TELEGRAM_PHONE_NUMBER)"
    echo "  2. API_ID e API_HASH estão corretos"
    echo "  3. Código SMS foi digitado corretamente"
    echo ""
fi
