#!/bin/bash
# ============================================
# Telegram Gateway - Autenticação Interativa
# ============================================
# Este script inicia o Gateway e permite que você
# insira o código de verificação no momento certo

set -eo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Telegram Gateway - Autenticação${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar se estamos no diretório correto
if [[ ! -f "src/index.js" ]]; then
    echo -e "${YELLOW}⚠️  Execute este script do diretório:${NC}"
    echo "   cd /home/marce/Projetos/TradingSystem/apps/telegram-gateway"
    echo "   bash authenticate-interactive.sh"
    exit 1
fi

# Verificar se a porta 4006 está livre
if lsof -ti :4006 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Porta 4006 em uso. Matando processos...${NC}"
    lsof -ti :4006 | xargs -r kill -9 2>/dev/null
    sleep 2
fi

echo -e "${GREEN}✓${NC} Porta 4006 livre"
echo ""

# Instruções
echo -e "${BLUE}📋 Instruções:${NC}"
echo ""
echo "1. O Gateway vai conectar ao Telegram"
echo "2. Você receberá um código SMS no celular (+55 67 99190-8000)"
echo "3. Digite o código quando solicitado"
echo "4. ${GREEN}O script detectará automaticamente${NC} o sucesso e continuará"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   - O código expira em 1-2 minutos"
echo "   - Digite o código assim que receber"
echo "   - ${GREEN}NÃO precisa mais pressionar Ctrl+C!${NC}"
echo ""

# Confirmar
read -p "Pressione ENTER para começar..." dummy

echo ""
echo -e "${GREEN}🚀 Iniciando Telegram Gateway...${NC}"
echo ""

# Criar arquivo temporário para logs
temp_log=$(mktemp)
trap "rm -f $temp_log" EXIT

# Iniciar watcher em background que mata Node quando detecta sucesso
(
    timeout=120
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if [ -f "$temp_log" ] && grep -q "Signed in successfully" "$temp_log" 2>/dev/null; then
            # Aguardar 3 segundos para sessão ser salva
            sleep 3

            # Encontrar PID do Node.js e matar gracefully
            node_pid=$(pgrep -f "node.*src/index.js" | head -1)
            if [ -n "$node_pid" ]; then
                echo ""
                echo ""
                echo -e "${GREEN}✓ Autenticação detectada com sucesso!${NC}"
                kill -TERM $node_pid 2>/dev/null || true
                sleep 1
                # Force kill se não morreu
                kill -9 $node_pid 2>/dev/null || true
            fi
            break
        fi
        sleep 1
        ((elapsed++))
    done
) &
watcher_pid=$!

# Rodar Node.js em FOREGROUND (permite input do usuário) com tee para capturar logs
node src/index.js 2>&1 | tee "$temp_log"
node_exit=$?

# Limpar watcher
kill $watcher_pid 2>/dev/null || true

echo ""
echo ""

# Verificar se autenticou com sucesso
if grep -q "Signed in successfully" "$temp_log" 2>/dev/null; then
    echo -e "${GREEN}✓ Authentication process completed${NC}"
else
    if [ $node_exit -eq 143 ] || [ $node_exit -eq 130 ]; then
        # 143 = SIGTERM, 130 = Ctrl+C
        echo -e "${GREEN}✓ Authentication process completed${NC}"
    else
        echo -e "${YELLOW}⚠ Processo terminou com código $node_exit${NC}"
    fi
fi

echo ""

# Verificar se a sessão foi salva
if [[ -f ".session/telegram-gateway.session" ]] && [[ -s ".session/telegram-gateway.session" ]]; then
    echo -e "${GREEN}✓ Session saved successfully${NC}"
    echo -e "   File: .session/telegram-gateway.session"
    echo -e "${BLUE}→ Continuing with system startup...${NC}"
else
    echo -e "${YELLOW}⚠ Session not found - authentication may have failed${NC}"
    echo -e "${BLUE}→ System will attempt to start anyway...${NC}"
fi

echo ""
sleep 2
