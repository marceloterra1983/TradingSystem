#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Recreate Workspace Stack Script
# ==============================================================================
# Purpose: Completely recreate workspace stack to fix network connectivity
# Requires: No sudo needed for docker compose commands
# ==============================================================================

set -euo pipefail

COMPOSE_FILE="tools/compose/docker-compose.4-3-workspace-stack.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }

echo ""
echo "======================================================================"
echo "  🔄 TradingSystem - Recreate Workspace Stack"
echo "======================================================================"
echo ""

log_warning "Problema identificado: workspace-api não consegue conectar ao Redis e PostgreSQL"
echo ""
log_info "Solução: Recriar completamente o stack para resetar a rede"
echo ""

log_info "Parando workspace stack..."
docker compose -f "$COMPOSE_FILE" down

log_info "Aguardando 5 segundos..."
sleep 5

log_info "Iniciando workspace stack com recreate forçado..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate

log_info "Aguardando serviços ficarem saudáveis (60 segundos)..."
sleep 60

log_info "Verificando status..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|workspace"

echo ""
log_success "Script concluído! Verifique se todos os serviços estão healthy"
echo ""
