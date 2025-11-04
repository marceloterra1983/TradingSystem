#!/bin/bash
# Script wrapper para autenticação do Telegram
# Trata automaticamente conflitos de porta

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║         📱 AUTENTICAÇÃO DO TELEGRAM - VERIFICANDO SISTEMA            ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar porta 4006
echo "🔍 Verificando porta 4006..."
if lsof -i :4006 >/dev/null 2>&1; then
  echo "   ⚠️  Porta 4006 em uso. Liberando..."
  lsof -ti :4006 | xargs kill -9 2>/dev/null || true
  sleep 2
  
  if lsof -i :4006 >/dev/null 2>&1; then
    echo "   ❌ Não foi possível liberar porta 4006"
    echo "   Execute manualmente: lsof -ti :4006 | xargs kill -9"
    exit 1
  fi
  echo "   ✅ Porta 4006 liberada!"
else
  echo "   ✅ Porta 4006 livre!"
fi

echo ""

# 2. Verificar variáveis de ambiente
echo "🔍 Verificando variáveis de ambiente..."
if ! grep -q "TELEGRAM_API_ID" .env 2>/dev/null; then
  echo "   ❌ TELEGRAM_API_ID não encontrado no .env"
  echo ""
  echo "   Configure primeiro:"
  echo "     bash CONECTAR-MEU-TELEGRAM.sh"
  echo ""
  exit 1
fi

if ! grep -q "TELEGRAM_API_HASH" .env 2>/dev/null; then
  echo "   ❌ TELEGRAM_API_HASH não encontrado no .env"
  echo "   Configure primeiro: bash CONECTAR-MEU-TELEGRAM.sh"
  exit 1
fi

if ! grep -q "TELEGRAM_PHONE_NUMBER" .env 2>/dev/null; then
  echo "   ❌ TELEGRAM_PHONE_NUMBER não encontrado no .env"
  echo "   Configure primeiro: bash CONECTAR-MEU-TELEGRAM.sh"
  exit 1
fi

echo "   ✅ Variáveis configuradas!"
echo ""

# 3. Executar autenticação
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║         🚀 INICIANDO AUTENTICAÇÃO INTERATIVA                         ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 INSTRUÇÕES:"
echo "══════════════"
echo ""
echo "  1. Você receberá um código SMS no celular"
echo "  2. Digite o código quando solicitado"
echo "  3. Se tiver 2FA, digite sua senha"
echo "  4. Script detectará sucesso automaticamente ✅"
echo ""
echo "⚠️  O código SMS expira em 1-2 minutos!"
echo ""
read -p "Pressione ENTER para começar..."
echo ""

cd apps/telegram-gateway
exec bash authenticate-interactive.sh

