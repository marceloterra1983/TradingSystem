#!/bin/bash
# Continuous Workflow Monitor
# Monitora workflows em tempo real e exibe alertas

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuração
INTERVAL="${1:-30}" # Intervalo de verificação em segundos

echo -e "${BLUE}🔍 GitHub Actions Monitor${NC}"
echo -e "${YELLOW}Intervalo: ${INTERVAL}s${NC}"
echo ""

# Verifica gh CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI não instalado${NC}"
    echo "Instale: sudo apt install gh"
    exit 1
fi

# Última verificação
LAST_FAILURES=""

while true; do
    clear
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    echo -e "${BLUE}📊 GitHub Actions - Status em Tempo Real${NC}"
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}🕐 Última atualização: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""

    # Workflows em execução
    echo -e "${BLUE}⏳ Em Execução:${NC}"
    IN_PROGRESS=$(gh run list --status in_progress --json databaseId,displayTitle,event,createdAt --limit 5)

    if [ "$(echo "$IN_PROGRESS" | jq '. | length')" -gt 0 ]; then
        echo "$IN_PROGRESS" | jq -r '.[] | "  • \(.displayTitle) (\(.event)) - \(.createdAt)"'
    else
        echo "  Nenhum workflow em execução"
    fi

    echo ""

    # Últimas falhas
    echo -e "${RED}❌ Falhas Recentes:${NC}"
    FAILURES=$(gh run list --status failure --json databaseId,displayTitle,event,createdAt,conclusion --limit 5)

    if [ "$(echo "$FAILURES" | jq '. | length')" -gt 0 ]; then
        CURRENT_FAILURES=$(echo "$FAILURES" | jq -r '.[0].databaseId')

        # Notificar novas falhas
        if [ -n "$LAST_FAILURES" ] && [ "$CURRENT_FAILURES" != "$LAST_FAILURES" ]; then
            # Nova falha detectada!
            echo -e "${RED}🚨 NOVA FALHA DETECTADA!${NC}"

            # Tocar beep (se terminal suportar)
            printf '\a'

            # Enviar notificação desktop (Linux)
            if command -v notify-send &> /dev/null; then
                notify-send -u critical "GitHub Actions Failed" "Nova falha detectada no workflow"
            fi
        fi

        LAST_FAILURES="$CURRENT_FAILURES"

        echo "$FAILURES" | jq -r '.[] | "  • \(.displayTitle) (\(.event)) - ID: \(.databaseId)"'
    else
        echo "  Nenhuma falha recente ✅"
    fi

    echo ""

    # Últimos sucessos
    echo -e "${GREEN}✅ Sucessos Recentes:${NC}"
    SUCCESSES=$(gh run list --status success --json displayTitle,event,createdAt --limit 3)

    if [ "$(echo "$SUCCESSES" | jq '. | length')" -gt 0 ]; then
        echo "$SUCCESSES" | jq -r '.[] | "  • \(.displayTitle) (\(.event))"'
    else
        echo "  Nenhum sucesso recente"
    fi

    echo ""
    echo -e "${YELLOW}════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Próxima atualização em ${INTERVAL}s... (Ctrl+C para sair)${NC}"

    # Aguardar intervalo
    sleep "$INTERVAL"
done
