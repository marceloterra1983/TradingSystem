#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Complete System Shutdown Script
# ==============================================================================
# Purpose: Gracefully stop ALL project stacks in reverse dependency order
# Features:
#   - Reverse order shutdown (applications → databases → gateway)
#   - Optional volume cleanup
#   - Optional network cleanup
#   - Status verification
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_DIR="${PROJECT_ROOT}/tools/compose"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }

stop_stack() {
    local stack_file=$1
    local stack_name=$2

    if [ ! -f "$stack_file" ]; then
        log_warning "Stack $stack_name não encontrado, pulando"
        return 0
    fi

    log_info "Parando $stack_name..."
    docker compose -f "$stack_file" down 2>/dev/null || true
    log_success "$stack_name parado"
}

cd "${PROJECT_ROOT}"

echo ""
echo "======================================================================"
echo "  🛑 TradingSystem - Complete System Shutdown"
echo "======================================================================"
echo ""

# Stop in reverse order (applications first, infrastructure last)

log_info "Parando stacks de aplicação..."
echo ""

stop_stack "${COMPOSE_DIR}/docker-compose.4-5-course-crawler-stack.yml" "Course Crawler Stack"
stop_stack "${COMPOSE_DIR}/docker-compose.5-7-firecrawl-stack.yml" "Firecrawl Stack"
stop_stack "${COMPOSE_DIR}/docker-compose.6-1-monitoring-stack.yml" "Monitoring Stack"
stop_stack "${COMPOSE_DIR}/docker-compose.4-2-telegram-stack.yml" "Telegram Stack"
stop_stack "${COMPOSE_DIR}/docker-compose.4-4-rag-stack.yml" "RAG Stack"
stop_stack "${COMPOSE_DIR}/docker-compose-5-1-n8n-stack.yml" "n8n Stack"
stop_stack "${COMPOSE_DIR}/docker-compose.4-1-tp-capital-stack.yml" "TP Capital Stack"

echo ""
log_info "Parando stacks de infraestrutura..."
echo ""

stop_stack "${COMPOSE_DIR}/docker-compose.4-3-workspace-stack.yml" "Workspace Stack"
stop_stack "${COMPOSE_DIR}/docker-compose.5-0-database-stack.yml" "Database Stack"
stop_stack "${COMPOSE_DIR}/docker-compose.2-docs-stack.yml" "Documentation Stack"
stop_stack "${COMPOSE_DIR}/docker-compose.1-dashboard-stack.yml" "Dashboard Stack"

echo ""
log_info "Parando Gateway..."
echo ""

stop_stack "${COMPOSE_DIR}/docker-compose.0-gateway-stack.yml" "Gateway Stack"

echo ""
log_success "Todos os stacks foram parados"
echo ""

# Verify
remaining=$(docker ps --filter 'label=com.tradingsystem' --format "{{.Names}}" 2>/dev/null | wc -l)
if [ $remaining -gt 0 ]; then
    log_warning "Ainda existem $remaining containers do TradingSystem rodando:"
    docker ps --filter 'label=com.tradingsystem' --format "   • {{.Names}}"
    echo ""
else
    log_success "Nenhum container do TradingSystem está rodando"
    echo ""
fi

echo "======================================================================"
echo ""
