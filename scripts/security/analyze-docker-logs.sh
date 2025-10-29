#!/bin/bash
###############################################################################
# analyze-docker-logs.sh
#
# Analisa logs históricos de acesso aos containers Docker
#
# Uso:
#   bash scripts/security/analyze-docker-logs.sh              # Últimas 24h
#   bash scripts/security/analyze-docker-logs.sh --today      # Hoje
#   bash scripts/security/analyze-docker-logs.sh --week       # Última semana
#   bash scripts/security/analyze-docker-logs.sh --suspicious # Apenas suspeitos
###############################################################################

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
LOG_DIR="$PROJECT_ROOT/logs/security"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Banner
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📊 Docker Access Log Analyzer${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar se diretório de logs existe
if [ ! -d "$LOG_DIR" ]; then
    echo -e "${YELLOW}⚠️  Nenhum log encontrado em: $LOG_DIR${NC}"
    echo -e "${CYAN}💡 Execute: bash scripts/security/monitor-docker-access.sh${NC}"
    exit 0
fi

# Contar logs disponíveis
LOG_COUNT=$(find "$LOG_DIR" -name "docker-access-*.log" 2>/dev/null | wc -l)

if [ "$LOG_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Nenhum log de acesso encontrado${NC}"
    echo -e "${CYAN}💡 Execute o monitor em background:${NC}"
    echo -e "${CYAN}   nohup bash scripts/security/monitor-docker-access.sh > /dev/null 2>&1 &${NC}"
    exit 0
fi

echo -e "${GREEN}✅ $LOG_COUNT arquivo(s) de log encontrado(s)${NC}"
echo ""

# Função para análise de logs
analyze_logs() {
    local filter=$1
    local timeframe=$2

    echo -e "${CYAN}📈 Estatísticas de Acesso${NC}"
    echo -e "${CYAN}─────────────────────────────────────────────────────────${NC}"

    # Total de eventos
    local total_events=$(cat "$LOG_DIR"/docker-access-*.log | wc -l)
    echo -e "Total de eventos: ${YELLOW}$total_events${NC}"

    # Eventos por tipo
    echo ""
    echo -e "${CYAN}Eventos por tipo:${NC}"
    cat "$LOG_DIR"/docker-access-*.log | grep -oP '\[.*?\]' | sort | uniq -c | sort -rn | while read count type; do
        case $type in
            *WARNING*)
                echo -e "  ${RED}⚠️  $type${NC}: $count eventos"
                ;;
            *ERROR*)
                echo -e "  ${RED}❌ $type${NC}: $count eventos"
                ;;
            *)
                echo -e "  ${GREEN}ℹ️  $type${NC}: $count eventos"
                ;;
        esac
    done

    # Container mais acessado
    echo ""
    echo -e "${CYAN}Containers mais acessados:${NC}"
    cat "$LOG_DIR"/docker-access-*.log | grep -oP 'container \K[^ ]+' | sort | uniq -c | sort -rn | head -5 | while read count container; do
        echo -e "  ${BLUE}$container${NC}: $count acessos"
    done

    # Comandos EXEC (suspeitos)
    echo ""
    local exec_count=$(grep -c "EXEC" "$LOG_DIR"/docker-access-*.log 2>/dev/null || echo "0")
    if [ "$exec_count" -gt 0 ]; then
        echo -e "${RED}⚠️  ALERTA: $exec_count comando(s) EXEC detectado(s)${NC}"
        echo -e "${YELLOW}   Comandos exec podem indicar acesso direto aos containers${NC}"
        echo ""
        echo -e "${CYAN}Últimos 5 comandos EXEC:${NC}"
        grep "EXEC" "$LOG_DIR"/docker-access-*.log | tail -5 | while IFS= read -r line; do
            echo -e "  ${YELLOW}→${NC} $line"
        done
    else
        echo -e "${GREEN}✅ Nenhum comando EXEC suspeito detectado${NC}"
    fi

    # Containers que morreram
    echo ""
    local died_count=$(grep -c "died" "$LOG_DIR"/docker-access-*.log 2>/dev/null || echo "0")
    if [ "$died_count" -gt 0 ]; then
        echo -e "${RED}⚠️  $died_count container(s) morreram inesperadamente${NC}"
        echo -e "${CYAN}Últimos containers que morreram:${NC}"
        grep "died" "$LOG_DIR"/docker-access-*.log | tail -3 | while IFS= read -r line; do
            echo -e "  ${RED}💀${NC} $line"
        done
    else
        echo -e "${GREEN}✅ Nenhuma morte inesperada de container${NC}"
    fi
}

# Função para mostrar logs recentes
show_recent_logs() {
    local hours=${1:-24}

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}📋 Últimos eventos (${hours}h)${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"

    # Buscar arquivos de log das últimas N horas
    find "$LOG_DIR" -name "docker-access-*.log" -mmin -$((hours*60)) -exec cat {} \; | tail -20
}

# Parse argumentos
case ${1:-} in
    --today)
        analyze_logs "today" "24h"
        show_recent_logs 24
        ;;
    --week)
        analyze_logs "week" "7d"
        ;;
    --suspicious)
        echo -e "${RED}🔍 Buscando atividades suspeitas...${NC}"
        echo ""
        grep -E "EXEC|died|WARNING|ERROR" "$LOG_DIR"/docker-access-*.log | tail -20 || echo "Nenhuma atividade suspeita encontrada"
        ;;
    --help)
        echo "Uso: bash scripts/security/analyze-docker-logs.sh [opção]"
        echo ""
        echo "Opções:"
        echo "  (nenhuma)     Análise completa + últimas 24h"
        echo "  --today       Análise do dia atual"
        echo "  --week        Análise da última semana"
        echo "  --suspicious  Apenas eventos suspeitos"
        echo "  --help        Mostra esta ajuda"
        exit 0
        ;;
    *)
        analyze_logs "all" "all"
        show_recent_logs 24
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Análise concluída${NC}"
echo ""
echo -e "${CYAN}💡 Dicas:${NC}"
echo -e "   • Para monitoramento contínuo: bash scripts/security/monitor-docker-access.sh"
echo -e "   • Para eventos suspeitos: bash scripts/security/analyze-docker-logs.sh --suspicious"
echo -e "   • Logs salvos em: $LOG_DIR"
echo ""
