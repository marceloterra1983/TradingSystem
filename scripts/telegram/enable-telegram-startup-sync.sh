#!/bin/bash
# Script para habilitar sincronização automática no startup do Telegram Gateway

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   🔄 HABILITAR SINCRONIZAÇÃO AUTOMÁTICA NO STARTUP              ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

ENV_FILE=".env"
PROJECT_ROOT="/home/marce/Projetos/TradingSystem"

cd "$PROJECT_ROOT"

# Verificar se .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Execute primeiro: cp .env.example .env"
    exit 1
fi

echo "📝 Configurando variáveis de ambiente..."
echo ""

# Função para adicionar ou atualizar variável
update_or_add_var() {
    local var_name=$1
    local var_value=$2
    local description=$3
    
    if grep -q "^${var_name}=" "$ENV_FILE" 2>/dev/null; then
        # Atualizar valor existente
        sed -i "s/^${var_name}=.*/${var_name}=${var_value}/" "$ENV_FILE"
        echo "   ✅ Atualizado: $var_name=$var_value"
    else
        # Adicionar nova variável
        echo "" >> "$ENV_FILE"
        if [ -n "$description" ]; then
            echo "# $description" >> "$ENV_FILE"
        fi
        echo "${var_name}=${var_value}" >> "$ENV_FILE"
        echo "   ✅ Adicionado: $var_name=$var_value"
    fi
}

# Adicionar seção se não existir
if ! grep -q "Telegram Gateway - Startup Sync" "$ENV_FILE" 2>/dev/null; then
    echo "" >> "$ENV_FILE"
    echo "# ========================================" >> "$ENV_FILE"
    echo "# Telegram Gateway - Startup Sync" >> "$ENV_FILE"
    echo "# ========================================" >> "$ENV_FILE"
fi

# Configurar variáveis
update_or_add_var "TELEGRAM_GATEWAY_SYNC_ON_STARTUP" "true" "Habilitar sincronização automática no startup"
update_or_add_var "TELEGRAM_GATEWAY_STARTUP_SYNC_DELAY" "5000" "Delay antes do sync (ms)"
update_or_add_var "TELEGRAM_GATEWAY_STARTUP_SYNC_LIMIT" "500" "Máximo de mensagens por canal"
update_or_add_var "TELEGRAM_GATEWAY_STARTUP_SYNC_CONCURRENCY" "3" "Canais processados em paralelo"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   ✅ CONFIGURAÇÃO COMPLETA!                                      ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 CONFIGURAÇÃO APLICADA:"
echo ""
echo "   • Sincronização habilitada: SIM"
echo "   • Delay no startup: 5 segundos"
echo "   • Mensagens por canal: até 500"
echo "   • Paralelismo: 3 canais simultâneos"
echo ""
echo "🎯 COMO FUNCIONA:"
echo ""
echo "   1. Serviço inicia (porta 4010)"
echo "   2. Aguarda 5 segundos (estabilização)"
echo "   3. Busca todos os canais ativos"
echo "   4. Sincroniza últimas 500 mensagens de cada"
echo "   5. Salva no TimescaleDB"
echo "   6. Registra logs detalhados"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo ""
echo "   1. Reinicie o serviço:"
echo "      bash START-GATEWAY-MTPROTO.sh"
echo ""
echo "   2. Monitore os logs:"
echo "      tail -f logs/telegram-gateway-mtproto.log | grep StartupSync"
echo ""
echo "   3. Verifique o resultado:"
echo "      grep 'StartupSync.*completed' logs/telegram-gateway-mtproto.log | tail -1"
echo ""
echo "⚙️  PERSONALIZAÇÃO:"
echo ""
echo "   Edite o .env para ajustar:"
echo "   - TELEGRAM_GATEWAY_STARTUP_SYNC_DELAY=10000  (10s delay)"
echo "   - TELEGRAM_GATEWAY_STARTUP_SYNC_LIMIT=1000   (1000 msgs)"
echo "   - TELEGRAM_GATEWAY_STARTUP_SYNC_CONCURRENCY=5 (5 paralelos)"
echo ""
echo "❌ DESABILITAR:"
echo ""
echo "   TELEGRAM_GATEWAY_SYNC_ON_STARTUP=false"
echo ""
echo "📖 DOCUMENTAÇÃO COMPLETA:"
echo ""
echo "   docs/content/apps/telegram-gateway/configuration/startup-sync.mdx"
echo ""

