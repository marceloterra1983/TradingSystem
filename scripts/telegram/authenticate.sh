#!/bin/bash
# ============================================
# Script para autenticação interativa do Telegram
# ============================================

set -e

COMPOSE_FILE="tools/compose/docker-compose.4-2-telegram-stack.yml"
CONTAINER_NAME="telegram-mtproto"
IMAGE_NAME="img-telegram-mtproto"

echo "=========================================="
echo "Telegram Gateway - Autenticação Interativa"
echo "=========================================="
echo ""

# 1. Parar o container se estiver rodando
echo "📦 Parando container telegram-mtproto..."
cd /workspace
docker compose -f "$COMPOSE_FILE" stop "$CONTAINER_NAME" 2>/dev/null || true

# 2. Executar autenticação em container temporário
echo "🔐 Iniciando autenticação interativa..."
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Você receberá um código SMS no celular"
echo "   - Digite o código quando solicitado"
echo "   - O script detectará automaticamente o sucesso"
echo ""

docker run --rm -it \
  --network tradingsystem_backend \
  -v "$(pwd)/apps/telegram-gateway/.session:/usr/src/app/.session" \
  -v "$(pwd)/apps/telegram-gateway/data:/usr/src/app/data" \
  -v "$(pwd)/apps/telegram-gateway:/usr/src/app" \
  -w /usr/src/app \
  --env-file "$(pwd)/.env" \
  --env-file "$(pwd)/.env.shared" 2>/dev/null || true \
  -e NODE_ENV=production \
  -e GATEWAY_PORT=4006 \
  "$IMAGE_NAME" \
  sh -c "apk add --no-cache bash lsof 2>/dev/null || true && bash authenticate-interactive.sh"

# 3. Verificar se a sessão foi criada
if [ -f "apps/telegram-gateway/.session/telegram-gateway.session" ]; then
    echo ""
    echo "✅ Sessão salva com sucesso!"
    echo "   Arquivo: apps/telegram-gateway/.session/telegram-gateway.session"
else
    echo ""
    echo "⚠️  Sessão não encontrada. A autenticação pode ter falhado."
fi

# 4. Reiniciar o container
echo ""
echo "🔄 Reiniciando container telegram-mtproto..."
docker compose -f "$COMPOSE_FILE" start "$CONTAINER_NAME" || docker compose -f "$COMPOSE_FILE" up -d "$CONTAINER_NAME"

echo ""
echo "✅ Processo concluído!"
echo ""

