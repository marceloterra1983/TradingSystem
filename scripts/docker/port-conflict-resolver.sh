#!/bin/bash
# ==============================================================================
# Port Conflict Resolver - Solução Definitiva para Conflitos de Porta
# ==============================================================================
# Detecta e resolve conflitos de porta antes de iniciar stacks Docker
# Uso: bash scripts/docker/port-conflict-resolver.sh [stack-name]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Funções de Utilidade
# ==============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ==============================================================================
# Mapeamento de Portas por Stack
# ==============================================================================

declare -A TELEGRAM_PORTS=(
    ["timescaledb"]="5436"
    ["pgbouncer"]="6434"
    ["redis-master"]="6383"
    ["redis-replica"]="6385"
    ["redis-sentinel"]="26379"
    ["rabbitmq"]="5672"
    ["rabbitmq-mgmt"]="15672"
    ["mtproto"]="4007"
    ["gateway-api"]="4010"
)

declare -A TP_CAPITAL_PORTS=(
    ["timescaledb"]="5440"
    ["pgbouncer"]="6435"
    ["redis-master"]="6381"
    ["redis-replica"]="6382"
    ["api"]="4005"
)

# ==============================================================================
# Detecção de Conflitos
# ==============================================================================

check_port_available() {
    local port=$1
    local service_name=$2

    # Método 1: lsof (mais confiável)
    if command -v lsof &> /dev/null; then
        if lsof -i :"$port" &> /dev/null; then
            local process=$(lsof -i :"$port" -t 2>/dev/null | head -1)
            if [ -n "$process" ]; then
                local proc_name=$(ps -p "$process" -o comm= 2>/dev/null || echo "unknown")
                log_error "Port $port ($service_name) is used by process $process ($proc_name)"
                return 1
            fi
        fi
    fi

    # Método 2: ss
    if ss -tlnp 2>/dev/null | grep -q ":$port "; then
        log_error "Port $port ($service_name) is in use (detected by ss)"
        return 1
    fi

    # Método 3: Docker containers
    if docker ps --format "{{.Ports}}" 2>/dev/null | grep -q "0.0.0.0:$port->"; then
        local container=$(docker ps --format "table {{.Names}}\t{{.Ports}}" | grep "$port" | awk '{print $1}')
        log_error "Port $port ($service_name) is used by Docker container: $container"
        return 1
    fi

    return 0
}

scan_ports_for_stack() {
    local stack_name=$1
    local -n ports_map=$2
    local conflicts=0

    log_info "Scanning ports for $stack_name stack..."
    echo ""

    for service in "${!ports_map[@]}"; do
        local port="${ports_map[$service]}"
        if check_port_available "$port" "$service"; then
            log_success "Port $port ($service) is available"
        else
            ((conflicts++))
        fi
    done

    echo ""
    return $conflicts
}

# ==============================================================================
# Limpeza de Locks do Docker
# ==============================================================================

cleanup_docker_locks() {
    log_info "Cleaning up Docker network locks..."

    # Remove containers órfãos
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.4-2-telegram-stack.yml" down --remove-orphans 2>/dev/null || true

    # Aguarda liberação de recursos
    sleep 2

    # Prune de networks não utilizadas
    docker network prune -f &> /dev/null || true

    log_success "Docker locks cleaned"
}

# ==============================================================================
# Força Liberação de Porta (requer sudo)
# ==============================================================================

force_free_port() {
    local port=$1

    log_warning "Attempting to force-free port $port..."

    # Identifica processo
    local pid=$(lsof -ti :"$port" 2>/dev/null | head -1)

    if [ -z "$pid" ]; then
        # Tenta fuser como fallback
        if command -v fuser &> /dev/null; then
            sudo fuser -k "$port/tcp" 2>/dev/null || true
            sleep 1
        fi
    else
        log_warning "Found process $pid using port $port"

        # Tenta SIGTERM primeiro (graceful)
        sudo kill -TERM "$pid" 2>/dev/null || true
        sleep 2

        # Se ainda existe, força SIGKILL
        if ps -p "$pid" &> /dev/null; then
            log_warning "Process still alive, forcing SIGKILL..."
            sudo kill -KILL "$pid" 2>/dev/null || true
            sleep 1
        fi
    fi

    # Verifica se liberou
    if check_port_available "$port" "freed"; then
        log_success "Port $port successfully freed"
        return 0
    else
        log_error "Failed to free port $port"
        return 1
    fi
}

# ==============================================================================
# Diagnóstico Completo
# ==============================================================================

full_diagnostic() {
    echo "================================================================================"
    echo "                    PORT CONFLICT DIAGNOSTIC REPORT"
    echo "================================================================================"
    echo ""

    log_info "System Information:"
    echo "  - OS: $(uname -s)"
    echo "  - Kernel: $(uname -r)"
    echo "  - Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
    echo ""

    log_info "Active Docker Containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(telegram|tp-capital)" || echo "  None"
    echo ""

    log_info "Network Listeners on Key Ports:"
    for port in 5436 6383 6385 4007 4010; do
        if ss -tlnp 2>/dev/null | grep -q ":$port "; then
            echo "  Port $port: $(ss -tlnp 2>/dev/null | grep ":$port " | awk '{print $6}')"
        fi
    done
    echo ""

    echo "================================================================================"
}

# ==============================================================================
# Função Principal
# ==============================================================================

main() {
    local stack_name="${1:-telegram}"

    echo ""
    echo "================================================================================"
    echo "          PORT CONFLICT RESOLVER - TradingSystem"
    echo "================================================================================"
    echo ""

    case "$stack_name" in
        telegram)
            scan_ports_for_stack "Telegram" TELEGRAM_PORTS
            conflicts=$?
            ;;
        tp-capital)
            scan_ports_for_stack "TP Capital" TP_CAPITAL_PORTS
            conflicts=$?
            ;;
        diagnostic|--diagnostic|-d)
            full_diagnostic
            exit 0
            ;;
        *)
            log_error "Unknown stack: $stack_name"
            echo "Usage: $0 [telegram|tp-capital|diagnostic]"
            exit 1
            ;;
    esac

    if [ $conflicts -gt 0 ]; then
        echo ""
        log_error "Found $conflicts port conflict(s)"
        echo ""
        log_warning "Recommended actions:"
        echo "  1. Stop conflicting services manually"
        echo "  2. Run: bash scripts/docker/docker-network-reset.sh (requires sudo)"
        echo "  3. Use alternative ports (see docs/content/tools/ports-services.mdx)"
        echo ""
        exit 1
    else
        echo ""
        log_success "All ports are available for $stack_name stack!"
        echo ""
        log_info "Safe to start stack with:"
        echo "  docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml up -d"
        echo ""
        exit 0
    fi
}

# ==============================================================================
# Execução
# ==============================================================================

main "$@"
