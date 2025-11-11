#!/bin/bash
# ==============================================================================
# Telegram Stack Startup - Inicialização Segura e Automatizada
# ==============================================================================
# Inicia a stack Telegram com verificações de porta e validação de configuração
# Uso: bash scripts/docker/start-telegram-stack.sh [--force] [--check-only]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.4-2-telegram-stack.yml"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# ==============================================================================
# Argumentos
# ==============================================================================

FORCE_MODE=false
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_MODE=true
            shift
            ;;
        --check-only|-c)
            CHECK_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [OPTIONS]"
            echo ""
            echo "Opções:"
            echo "  --force, -f       Force restart mesmo com conflitos de porta"
            echo "  --check-only, -c  Apenas verifica configuração, não inicia"
            echo "  --help, -h        Mostra esta ajuda"
            exit 0
            ;;
        *)
            log_error "Opção desconhecida: $1"
            echo "Use --help para ver opções disponíveis"
            exit 1
            ;;
    esac
done

# ==============================================================================
# Verificação de Pré-requisitos
# ==============================================================================

check_prerequisites() {
    log_info "Verificando pré-requisitos..."

    # Docker instalado
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi

    # Docker rodando
    if ! docker ps &> /dev/null; then
        log_error "Docker não está rodando ou você não tem permissões"
        echo "Tente: sudo systemctl start docker"
        exit 1
    fi

    # Compose file existe
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Compose file não encontrado: $COMPOSE_FILE"
        exit 1
    fi

    # .env existe
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_error "Arquivo .env não encontrado em $PROJECT_ROOT"
        exit 1
    fi

    log_success "Pré-requisitos OK"
}

# ==============================================================================
# Carregamento de Variáveis de Ambiente
# ==============================================================================

load_env_vars() {
    log_info "Carregando variáveis de ambiente..."

    # Carrega .env.defaults primeiro
    if [ -f "$PROJECT_ROOT/config/.env.defaults" ]; then
        set -a
        source "$PROJECT_ROOT/config/.env.defaults"
        set +a
    fi

    # Carrega .env (sobrescreve defaults)
    if [ -f "$PROJECT_ROOT/.env" ]; then
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    fi

    # Exporta variáveis críticas explicitamente
    export TELEGRAM_REDIS_PORT=${TELEGRAM_REDIS_PORT:-6383}
    export TELEGRAM_DB_PORT=${TELEGRAM_DB_PORT:-5436}
    export TELEGRAM_REDIS_REPLICA_PORT=${TELEGRAM_REDIS_REPLICA_PORT:-6385}
    export TELEGRAM_PGBOUNCER_PORT=${TELEGRAM_PGBOUNCER_PORT:-6434}

    log_success "Variáveis carregadas:"
    echo "  TELEGRAM_DB_PORT=$TELEGRAM_DB_PORT"
    echo "  TELEGRAM_REDIS_PORT=$TELEGRAM_REDIS_PORT"
    echo "  TELEGRAM_REDIS_REPLICA_PORT=$TELEGRAM_REDIS_REPLICA_PORT"
    echo "  TELEGRAM_PGBOUNCER_PORT=$TELEGRAM_PGBOUNCER_PORT"
}

# ==============================================================================
# Verificação de Conflitos de Porta
# ==============================================================================

check_port_conflicts() {
    log_info "Verificando conflitos de porta..."

    if [ -f "$SCRIPT_DIR/port-conflict-resolver.sh" ]; then
        if bash "$SCRIPT_DIR/port-conflict-resolver.sh" telegram; then
            log_success "Todas as portas estão disponíveis"
            return 0
        else
            log_error "Conflitos de porta detectados"
            if [ "$FORCE_MODE" = false ]; then
                echo ""
                log_warning "Soluções:"
                echo "  1. Parar serviços conflitantes manualmente"
                echo "  2. Executar: sudo bash .claude/sudo-scripts/docker-network-reset.sh"
                echo "  3. Usar --force para tentar mesmo assim (não recomendado)"
                exit 1
            else
                log_warning "Modo --force ativado, tentando mesmo com conflitos..."
                return 0
            fi
        fi
    else
        log_warning "Script de verificação de portas não encontrado, pulando..."
        return 0
    fi
}

# ==============================================================================
# Limpeza Prévia (se necessário)
# ==============================================================================

cleanup_previous() {
    log_info "Verificando estado anterior da stack..."

    # Verifica se há containers rodando
    if docker compose -f "$COMPOSE_FILE" ps -q 2>/dev/null | grep -q .; then
        log_warning "Stack já está parcialmente iniciada"
        read -p "Deseja reiniciar a stack? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Parando stack anterior..."
            docker compose -f "$COMPOSE_FILE" down
            sleep 2
            log_success "Stack anterior parada"
        else
            log_error "Operação cancelada pelo usuário"
            exit 1
        fi
    fi
}

# ==============================================================================
# Inicialização da Stack
# ==============================================================================

start_stack() {
    log_info "Iniciando Telegram Stack..."
    echo ""

    # Exporta variáveis críticas explicitamente no comando
    TELEGRAM_REDIS_PORT=$TELEGRAM_REDIS_PORT \
    TELEGRAM_DB_PORT=$TELEGRAM_DB_PORT \
    TELEGRAM_REDIS_REPLICA_PORT=$TELEGRAM_REDIS_REPLICA_PORT \
    TELEGRAM_PGBOUNCER_PORT=$TELEGRAM_PGBOUNCER_PORT \
    docker compose -f "$COMPOSE_FILE" up -d

    if [ $? -eq 0 ]; then
        log_success "Stack iniciada com sucesso!"
    else
        log_error "Falha ao iniciar stack"
        echo ""
        log_info "Verificando logs dos últimos containers..."
        docker compose -f "$COMPOSE_FILE" logs --tail=20
        exit 1
    fi
}

# ==============================================================================
# Verificação de Saúde
# ==============================================================================

check_health() {
    log_info "Aguardando containers ficarem saudáveis..."
    echo ""

    local max_wait=60
    local waited=0

    while [ $waited -lt $max_wait ]; do
        local status=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | \
                       jq -r 'select(.Health != "") | "\(.Name):\(.Health)"' 2>/dev/null || echo "")

        if [ -z "$status" ]; then
            log_info "  Aguardando health checks iniciarem... (${waited}s)"
        else
            echo "$status" | while IFS=: read -r name health; do
                if [ "$health" = "healthy" ]; then
                    log_success "  $name: $health"
                elif [ "$health" = "unhealthy" ]; then
                    log_error "  $name: $health"
                else
                    log_info "  $name: $health"
                fi
            done
        fi

        # Verifica se todos os containers com healthcheck estão healthy
        local unhealthy=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | \
                          jq -r 'select(.Health == "unhealthy") | .Name' 2>/dev/null | wc -l)

        if [ "$unhealthy" -eq 0 ]; then
            # Verifica se há containers com healthcheck definido
            local has_healthcheck=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | \
                                    jq -r 'select(.Health != "") | .Name' 2>/dev/null | wc -l)

            if [ "$has_healthcheck" -gt 0 ]; then
                log_success "Todos os containers estão saudáveis!"
                break
            fi
        fi

        sleep 5
        ((waited+=5))
    done

    if [ $waited -ge $max_wait ]; then
        log_warning "Timeout aguardando health checks (${max_wait}s)"
        log_info "Containers podem ainda estar inicializando..."
    fi
}

# ==============================================================================
# Status Final
# ==============================================================================

show_final_status() {
    echo ""
    echo "================================================================================"
    log_success "Telegram Stack Status"
    echo "================================================================================"
    echo ""

    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    log_info "Endpoints disponíveis:"
    echo "  • Telegram MTProto Gateway:  http://localhost:4007"
    echo "  • Telegram Gateway API:      http://localhost:4010"
    echo "  • TimescaleDB:               localhost:$TELEGRAM_DB_PORT"
    echo "  • PgBouncer:                 localhost:$TELEGRAM_PGBOUNCER_PORT"
    echo "  • Redis Master:              localhost:$TELEGRAM_REDIS_PORT"
    echo "  • Redis Replica:             localhost:$TELEGRAM_REDIS_REPLICA_PORT"
    echo "  • RabbitMQ Management:       http://localhost:15672"
    echo ""

    log_info "Comandos úteis:"
    echo "  • Ver logs:        docker compose -f $COMPOSE_FILE logs -f"
    echo "  • Parar stack:     docker compose -f $COMPOSE_FILE down"
    echo "  • Reiniciar:       bash $0"
    echo ""
    echo "================================================================================"
}

# ==============================================================================
# Função Principal
# ==============================================================================

main() {
    echo ""
    echo "================================================================================"
    echo "          TELEGRAM STACK STARTUP - TradingSystem"
    echo "================================================================================"
    echo ""

    cd "$PROJECT_ROOT"

    check_prerequisites
    load_env_vars

    if [ "$CHECK_ONLY" = true ]; then
        check_port_conflicts
        log_success "Verificação concluída - tudo OK!"
        exit 0
    fi

    check_port_conflicts
    cleanup_previous
    start_stack
    check_health
    show_final_status
}

# ==============================================================================
# Execução
# ==============================================================================

main "$@"
