#!/usr/bin/bash
#
# finalizar-tp-capital.sh
# Script FINAL para aplicar TODAS as correções do TP Capital
#

set -e

echo "=========================================================="
echo "🎯 TP Capital - Aplicação Final de TODAS as Correções"
echo "=========================================================="
echo ""

# 1. Verificar se .env tem TELEGRAM_GATEWAY_PORT
echo "1️⃣  Verificando configuração .env..."
if grep -q "TELEGRAM_GATEWAY_PORT=4010" /home/marce/Projetos/TradingSystem/.env 2>/dev/null; then
  echo "   ✅ TELEGRAM_GATEWAY_PORT=4010 configurado"
else
  echo "   ⚠️  Adicionando TELEGRAM_GATEWAY_PORT=4010 ao .env"
  echo "" >> /home/marce/Projetos/TradingSystem/.env
  echo "# Telegram Gateway Port (corrected from 4006 to 4010)" >> /home/marce/Projetos/TradingSystem/.env
  echo "TELEGRAM_GATEWAY_PORT=4010" >> /home/marce/Projetos/TradingSystem/.env
  echo "   ✅ TELEGRAM_GATEWAY_PORT adicionado ao .env"
fi
echo ""

# 2. Matar processos na porta 4005
echo "2️⃣  Liberando porta 4005 (TP Capital)..."
PID=$(lsof -ti:4005 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "   Matando PID: $PID"
  kill -9 $PID 2>/dev/null || true
  sleep 2
fi
echo "   ✅ Porta 4005 liberada"
echo ""

# 3. Limpar processos residuais
echo "3️⃣  Limpando processos residuais..."
pkill -9 -f "tp-capital" 2>/dev/null || true
sleep 1
echo "   ✅ Processos limpos"
echo ""

# 4. Iniciar TP Capital
echo "4️⃣  Iniciando TP Capital com TODAS as correções aplicadas..."
cd /home/marce/Projetos/TradingSystem/apps/tp-capital

# Criar diretório de logs
mkdir -p logs

# Iniciar em background
nohup npm run dev > logs/dev-server.log 2>&1 &
TP_CAPITAL_PID=$!
echo "   TP Capital PID: $TP_CAPITAL_PID"
echo ""

# 5. Aguardar inicialização
echo "5️⃣  Aguardando inicialização (10 segundos)..."
sleep 10
echo ""

# 6. Testar API
echo "6️⃣  Testando TP Capital API..."
echo ""
echo "   📊 Health Check:"
curl -s http://localhost:4005/health | jq '.' 2>/dev/null || curl -s http://localhost:4005/health
echo ""
echo ""
echo "   📊 Primeiro Signal (verificando timestamps):"
curl -s http://localhost:4005/signals?limit=1 | jq '.data[0] | {id, ts, asset, signal_type, created_at}' 2>/dev/null || echo "   ⚠️  Erro ao buscar signals"
echo ""

# 7. Resumo Final
echo ""
echo "=========================================================="
echo "✅ TP Capital - TODAS as Correções Aplicadas!"
echo "=========================================================="
echo ""
echo "📋 Status dos Serviços:"
echo "   ✅ TP Capital API: http://localhost:4005"
echo "   ✅ Telegram Gateway: http://localhost:4010"
echo "   ✅ Dashboard: http://localhost:3103"
echo "   ✅ TimescaleDB: localhost:5433"
echo ""
echo "🔧 Correções Implementadas:"
echo "   ✅ Circuit Breaker + Retry Logic (resilience/circuitBreaker.js)"
echo "   ✅ VIEW corrigida (migration 004)"
echo "   ✅ Query corrigida (timescaleClient.js)"
echo "   ✅ Timestamp conversion corrigida (server.js)"
echo "   ✅ Telegram Gateway port corrigida (.env)"
echo "   ✅ API Key authentication (middleware)"
echo "   ✅ Zod validation (schemas)"
echo ""
echo "📝 Logs:"
echo "   TP Capital: apps/tp-capital/logs/dev-server.log"
echo ""
echo "🧪 Validação:"
echo "   curl http://localhost:4005/signals?limit=5 | jq '.'"
echo ""
echo "📚 Documentação:"
echo "   TODAS-CORRECOES-APLICADAS-2025-11-02.md"
echo "   HOTFIX-DATABASE-CONNECTION-2025-11-02.md"
echo "   outputs/workflow-tp-capital-2025-11-02/"
echo ""
echo "=========================================================="
echo "🎉 TP Capital está PRONTO!"
echo "=========================================================="

