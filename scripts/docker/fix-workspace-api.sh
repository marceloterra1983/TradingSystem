#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Fix Workspace API Script
# ==============================================================================
# Purpose: Restart workspace-api to fix Redis connection timeout
# Requires: sudo privileges for Docker container operations
# ==============================================================================

set -euo pipefail

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
echo "  🔧 TradingSystem - Fix Workspace API"
echo "======================================================================"
echo ""

log_info "Problema identificado: workspace-api com timeout no Redis"
echo ""
log_info "Causa: Conexão perdida durante startup, necessário reiniciar"
echo ""

log_info "Reiniciando workspace-api..."
docker restart workspace-api

log_info "Aguardando 30 segundos para reconexão..."
sleep 30

log_info "Verificando status..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|workspace"

echo ""
log_success "Script concluído! Verifique se workspace-api está healthy"
echo ""
