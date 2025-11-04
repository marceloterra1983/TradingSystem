#!/bin/bash
# Script para iniciar Telegram Gateway MTProto
# Usa sessão existente (não requer autenticação)

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║          📱 INICIANDO TELEGRAM GATEWAY MTPROTO                        ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar sessão existente
echo "🔍 Verificando sessão do Telegram..."
if [ ! -f "apps/telegram-gateway/.session/telegram-gateway.session" ]; then
  echo "   ❌ Sessão não encontrada!"
  echo ""
  echo "   Você precisa autenticar primeiro:"
  echo "     cd apps/telegram-gateway"
  echo "     bash authenticate-interactive.sh"
  echo ""
  exit 1
fi

session_date=$(stat -c %y apps/telegram-gateway/.session/telegram-gateway.session | cut -d'.' -f1)
echo "   ✅ Sessão encontrada (criada em: $session_date)"
echo ""

# 2. Limpar porta 4007 e processos relacionados (robusto)
echo "🔧 Liberando porta 4007 e processos relacionados..."

# Matar TODOS os processos relacionados ao telegram-gateway
echo "   🔍 Buscando processos conflitantes..."
pkill -f "npm.*telegram-gateway" 2>/dev/null || true
pkill -f "node.*telegram-gateway" 2>/dev/null || true
pkill -f "node.*src/index.js" 2>/dev/null || true  # Matar processos node src/index.js genéricos
pkill -f "nodemon.*telegram-gateway" 2>/dev/null || true
sleep 2

# Matar processos específicos que estão na porta 4007
PORT_PIDS=$(lsof -ti :4007 2>/dev/null || true)
if [ -n "$PORT_PIDS" ]; then
  echo "   ⚠️  Encontrados processos na porta 4007: $PORT_PIDS"
  echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 2
fi

# Limpar porta 4007 múltiplas vezes
max_attempts=5
attempt=1

while [ $attempt -le $max_attempts ]; do
  if lsof -i :4007 >/dev/null 2>&1; then
    echo "   ⚠️  Porta 4007 em uso. Tentativa $attempt/$max_attempts..."
    
    # Matar processos na porta
    lsof -ti :4007 | xargs kill -9 2>/dev/null || true
    sleep 3
    
    if ! lsof -i :4007 >/dev/null 2>&1; then
      echo "   ✅ Porta 4007 liberada!"
      break
    fi
    
    attempt=$((attempt + 1))
    
    if [ $attempt -gt $max_attempts ]; then
      echo "   ❌ Não foi possível liberar porta 4007 após $max_attempts tentativas"
      echo "   Processos atuais:"
      lsof -i :4007
      echo ""
      echo "   Execute manualmente: lsof -ti :4007 | xargs kill -9"
      exit 1
    fi
  else
    echo "   ✅ Porta 4007 está livre!"
    break
  fi
done

# Aguardar mais um pouco para garantir
echo "   ⏳ Aguardando 3s para estabilizar..."
sleep 3

echo ""

# 3. Iniciar Gateway MTProto
echo "🚀 Iniciando Gateway MTProto..."
cd apps/telegram-gateway

# Criar diretório de logs se não existir
mkdir -p ../../logs

# Iniciar em background (usar 'npm start' ao invés de 'npm run dev')
# npm start usa 'node' direto (sem nodemon) = mais estável
nohup npm start > ../../logs/telegram-gateway-mtproto.log 2>&1 &
GATEWAY_PID=$!

echo "   ▶️  Gateway iniciado (PID: $GATEWAY_PID)"
echo ""

# 4. Aguardar inicialização
echo "⏳ Aguardando inicialização (10 segundos)..."
sleep 10

# 5. Verificar se está rodando
if ps -p $GATEWAY_PID > /dev/null 2>&1; then
  echo "   ✅ Gateway está rodando!"
else
  echo "   ❌ Gateway falhou ao iniciar"
  echo "   Verifique logs: tail -f logs/telegram-gateway-mtproto.log"
  exit 1
fi

# 6. Verificar conexão
echo ""
echo "🔍 Verificando conexão..."
if grep -q "Telegram Gateway started" ../../logs/telegram-gateway-mtproto.log 2>/dev/null; then
  echo "   ✅ Gateway conectado ao Telegram!"
else
  echo "   ⚠️  Ainda não conectado (aguarde mais alguns segundos)"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║              ✅ TELEGRAM GATEWAY MTPROTO INICIADO!                    ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 INFORMAÇÕES:"
echo "══════════════"
echo ""
echo "  • PID: $GATEWAY_PID"
echo "  • Porta HTTP: 4007 (endpoints: /health, /sync-messages)"
echo "  • Sessão: apps/telegram-gateway/.session/telegram-gateway.session"
echo "  • Logs: logs/telegram-gateway-mtproto.log"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "══════════════════"
echo ""
echo "  1. Recarregue o Dashboard:"
echo "     http://localhost:3103/#/telegram-gateway"
echo ""
echo "  2. Adicione canais para monitorar:"
echo "     → Seção \"Canais Monitorados\" → \"+ Adicionar\""
echo ""
echo "  3. Ver logs em tempo real:"
echo "     tail -f logs/telegram-gateway-mtproto.log"
echo ""
echo "🛑 PARA PARAR O GATEWAY:"
echo "═══════════════════════"
echo ""
echo "  kill $GATEWAY_PID"
echo ""
echo "  Ou use: lsof -ti :4007 | xargs kill"
echo ""

