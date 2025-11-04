#!/bin/bash
# Script para reiniciar o Telegram Gateway API com logs visíveis

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   🔄 REINICIAR TELEGRAM GATEWAY API (com StartupSync)       ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 1. Parar processo existente na porta 4010
echo "🛑 Parando processo existente na porta 4010..."
if lsof -ti :4010 >/dev/null 2>&1; then
    lsof -ti :4010 | xargs kill -9 2>/dev/null || true
    sleep 2
    echo "   ✅ Processo parado"
else
    echo "   ℹ️  Nenhum processo rodando na porta 4010"
fi

# 2. Navegar para diretório da API
cd /home/marce/Projetos/TradingSystem/backend/api/telegram-gateway

# 3. Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# 4. Iniciar API em background com logs
echo ""
echo "🚀 Iniciando Telegram Gateway API..."
echo "   📂 Diretório: $(pwd)"
echo "   🔌 Porta: 4010"
echo ""

# Criar diretório de logs se não existir
mkdir -p /home/marce/Projetos/TradingSystem/logs

# Iniciar serviço com logs
nohup npm start > /home/marce/Projetos/TradingSystem/logs/telegram-gateway-api.log 2>&1 &
API_PID=$!

echo "   ▶️  API iniciada (PID: $API_PID)"
echo ""

# 5. Aguardar inicialização
echo "⏳ Aguardando inicialização (8 segundos)..."
sleep 8

# 6. Verificar se está rodando
if ps -p $API_PID > /dev/null 2>&1; then
    echo "   ✅ API está rodando!"
else
    echo "   ❌ API falhou ao iniciar"
    echo "   📋 Últimas linhas do log:"
    tail -20 /home/marce/Projetos/TradingSystem/logs/telegram-gateway-api.log
    exit 1
fi

# 7. Testar health check
echo ""
echo "🔍 Testando health check..."
if curl -s http://localhost:4010/health >/dev/null 2>&1; then
    echo "   ✅ API respondendo corretamente!"
else
    echo "   ⚠️  API não está respondendo ainda (aguarde mais alguns segundos)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   ✅ TELEGRAM GATEWAY API REINICIADA!                       ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 INFORMAÇÕES:"
echo "════════════════"
echo ""
echo "  • PID: $API_PID"
echo "  • Porta: 4010"
echo "  • Logs: logs/telegram-gateway-api.log"
echo ""
echo "📝 MONITORAR LOGS:"
echo "══════════════════"
echo ""
echo "  # Ver todos os logs"
echo "  tail -f logs/telegram-gateway-api.log"
echo ""
echo "  # Ver apenas StartupSync"
echo "  tail -f logs/telegram-gateway-api.log | grep StartupSync"
echo ""
echo "  # Ver última sincronização"
echo "  grep 'StartupSync.*completed' logs/telegram-gateway-api.log | tail -1"
echo ""
echo "🔍 VERIFICAR SINCRONIZAÇÃO:"
echo "═══════════════════════════"
echo ""
echo "  Aguarde ~10 segundos e execute:"
echo "  grep 'StartupSync' logs/telegram-gateway-api.log"
echo ""
echo "🛑 PARAR API:"
echo "═════════════"
echo ""
echo "  kill $API_PID"
echo ""
echo "  Ou: lsof -ti :4010 | xargs kill"
echo ""

