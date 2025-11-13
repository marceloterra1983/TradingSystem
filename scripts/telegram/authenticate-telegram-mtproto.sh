#!/usr/bin/bash
#
# authenticate-telegram-mtproto.sh
# Script para primeira autenticação do Telegram MTProto (GramJS)
#
# Este script deve ser executado UMA VEZ para autenticar o Telegram Gateway
# Após autenticação, o arquivo .telegram-session será criado e as próximas
# execuções serão automáticas.
#

set -e

echo "=========================================================="
echo "🔐 Telegram MTProto - Primeira Autenticação"
echo "=========================================================="
echo ""
echo "Este script irá:"
echo "  1. Parar todos os processos do Telegram Gateway"
echo "  2. Liberar porta 4010"
echo "  3. Iniciar Gateway em modo INTERATIVO"
echo "  4. Solicitar código de autenticação do Telegram"
echo ""
echo "⚠️  IMPORTANTE:"
echo "  - Você receberá um código de 5 dígitos no app do Telegram"
echo "  - Digite o código quando solicitado"
echo "  - Se tiver 2FA, digite sua senha quando solicitado"
echo ""
read -p "Pressione ENTER para continuar..."
echo ""

# 1. Parar todos os processos do Gateway
echo "1️⃣  Parando processos do Telegram Gateway..."
pkill -9 -f "telegram-gateway" 2>/dev/null || true
pkill -9 -f "node --watch src/server.js" 2>/dev/null || true
sleep 2
echo "   ✅ Processos parados"
echo ""

# 2. Liberar porta 4010
echo "2️⃣  Liberando porta 4010..."
lsof -ti:4010 | xargs kill -9 2>/dev/null || true
sleep 2

if lsof -i:4010 > /dev/null 2>&1; then
  echo "   ❌ ERRO: Porta 4010 ainda em uso!"
  echo "   Execute manualmente: sudo lsof -ti:4010 | xargs sudo kill -9"
  exit 1
else
  echo "   ✅ Porta 4010 livre"
fi
echo ""

# 3. Verificar variáveis de ambiente
echo "3️⃣  Verificando variáveis de ambiente..."
source /home/marce/Projetos/TradingSystem/.env

if [ -z "$TELEGRAM_API_ID" ] || [ "$TELEGRAM_API_ID" = "YOUR_API_ID_HERE" ]; then
  echo "   ❌ ERRO: TELEGRAM_API_ID não configurado!"
  echo "   Configure em: /home/marce/Projetos/TradingSystem/.env"
  exit 1
fi

if [ -z "$TELEGRAM_API_HASH" ] || [ "$TELEGRAM_API_HASH" = "YOUR_API_HASH_HERE" ]; then
  echo "   ❌ ERRO: TELEGRAM_API_HASH não configurado!"
  echo "   Configure em: /home/marce/Projetos/TradingSystem/.env"
  exit 1
fi

if [ -z "$TELEGRAM_PHONE_NUMBER" ]; then
  echo "   ❌ ERRO: TELEGRAM_PHONE_NUMBER não configurado!"
  echo "   Configure em: /home/marce/Projetos/TradingSystem/.env"
  exit 1
fi

echo "   ✅ Variáveis configuradas:"
echo "      API_ID: $TELEGRAM_API_ID"
echo "      API_HASH: ${TELEGRAM_API_HASH:0:8}..."
echo "      PHONE: $TELEGRAM_PHONE_NUMBER"
echo ""

# 4. Verificar se já existe session
SESSION_FILE="/home/marce/Projetos/TradingSystem/backend/api/telegram-gateway/.telegram-session"

if [ -f "$SESSION_FILE" ]; then
  echo "⚠️  ATENÇÃO: Arquivo de session já existe!"
  echo "   Localização: $SESSION_FILE"
  echo ""
  read -p "Deseja deletar e criar nova session? (s/N): " DELETE_SESSION
  
  if [ "$DELETE_SESSION" = "s" ] || [ "$DELETE_SESSION" = "S" ]; then
    rm -f "$SESSION_FILE"
    echo "   ✅ Session antiga removida"
  else
    echo "   ℹ️  Usando session existente (pode não solicitar código)"
  fi
  echo ""
fi

# 5. Iniciar Gateway em modo INTERATIVO
echo "=========================================================="
echo "🚀 Iniciando Telegram Gateway (MODO INTERATIVO)"
echo "=========================================================="
echo ""
echo "📱 AGUARDE O CÓDIGO DO TELEGRAM no seu app móvel/desktop!"
echo ""
echo "Quando aparecer:"
echo "  'Please enter the code you received: _____'"
echo ""
echo "➡️  Digite o código de 5 dígitos e pressione ENTER"
echo ""
echo "Se tiver 2FA:"
echo "  'Please enter your 2FA password: _____'"
echo "  ➡️  Digite sua senha 2FA e pressione ENTER"
echo ""
echo "=========================================================="
echo "Iniciando em 3 segundos..."
sleep 1
echo "2..."
sleep 1
echo "1..."
sleep 1
echo ""
echo "▶️  GATEWAY INICIANDO..."
echo ""

cd /home/marce/Projetos/TradingSystem/backend/api/telegram-gateway
TELEGRAM_GATEWAY_PORT=4010 node src/server.js

# Se chegar aqui, o usuário pressionou Ctrl+C
echo ""
echo "=========================================================="
echo "Gateway interrompido!"
echo "=========================================================="

