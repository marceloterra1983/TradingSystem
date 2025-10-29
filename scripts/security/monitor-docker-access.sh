#!/bin/bash
###############################################################################
# monitor-docker-access.sh
#
# Monitora acessos aos containers Docker (alternativa ao auditd para WSL2)
#
# Uso:
#   bash scripts/security/monitor-docker-access.sh         # Modo interativo
#   bash scripts/security/monitor-docker-access.sh --log   # Salvar em arquivo
###############################################################################

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
LOG_DIR="$PROJECT_ROOT/logs/security"
LOG_FILE="$LOG_DIR/docker-access-$(date +%Y%m%d).log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Criar diretório de logs se não existir
mkdir -p "$LOG_DIR"

# Função para log com timestamp
log_event() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Função para mostrar eventos formatados
show_event() {
    local event_type=$1
    local container=$2
    local user=$3
    local timestamp=$(date '+%H:%M:%S')

    case $event_type in
        "exec_start")
            echo -e "${RED}⚠️  [$timestamp]${NC} ${YELLOW}EXEC${NC} em container: ${BLUE}$container${NC} (user: $user)"
            log_event "WARNING" "EXEC command in container $container by user $user"
            ;;
        "exec_create")
            echo -e "${YELLOW}📝 [$timestamp]${NC} EXEC criado em: ${BLUE}$container${NC}"
            log_event "INFO" "EXEC created in container $container"
            ;;
        "start")
            echo -e "${GREEN}▶️  [$timestamp]${NC} Container iniciado: ${BLUE}$container${NC}"
            log_event "INFO" "Container started: $container"
            ;;
        "stop")
            echo -e "${RED}⏹️  [$timestamp]${NC} Container parado: ${BLUE}$container${NC}"
            log_event "INFO" "Container stopped: $container"
            ;;
        "die")
            echo -e "${RED}💀 [$timestamp]${NC} Container morreu: ${BLUE}$container${NC}"
            log_event "ERROR" "Container died: $container"
            ;;
    esac
}

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker não está rodando!${NC}"
    exit 1
fi

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}   🔍 Docker Access Monitor (WSL2)                    ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   Monitorando eventos de containers...               ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   Logs salvos em: logs/security/                     ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Monitoramento ativo${NC} - Pressione Ctrl+C para sair"
echo ""

log_event "INFO" "Docker monitoring started"

# Monitorar eventos do Docker
docker events --filter 'type=container' --format '{{json .}}' | while read -r event; do
    # Extrair informações do evento JSON
    event_type=$(echo "$event" | jq -r '.Action')
    container_name=$(echo "$event" | jq -r '.Actor.Attributes.name // "unknown"')
    container_id=$(echo "$event" | jq -r '.Actor.ID' | cut -c1-12)

    # Tentar pegar usuário (nem sempre disponível)
    user=$(whoami)

    # Filtrar eventos relevantes
    case $event_type in
        "exec_start"|"exec_create"|"start"|"stop"|"die")
            show_event "$event_type" "$container_name" "$user"
            ;;
    esac
done

# Cleanup ao sair
log_event "INFO" "Docker monitoring stopped"
