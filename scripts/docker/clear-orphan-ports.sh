#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Clear Orphan Ports Script
# ==============================================================================
# Purpose: Kill processes occupying required ports
# Requires: sudo privileges
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $*"; }

echo ""
echo "======================================================================"
echo "  🔧 TradingSystem - Clear Orphan Ports"
echo "======================================================================"
echo ""

ports_to_check=(9080 9081 5052)

for port in "${ports_to_check[@]}"; do
    pids=$(lsof -ti :$port 2>/dev/null || echo "")
    if [ -n "$pids" ]; then
        log_warning "Porta $port em uso pelos PIDs: $pids"
        for pid in $pids; do
            cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            log_info "  Matando PID $pid ($cmd)"
            sudo kill -9 $pid 2>/dev/null || true
        done
        sleep 1
        log_success "Porta $port liberada"
    else
        log_success "Porta $port está livre"
    fi
done

echo ""
log_success "Todas as portas foram verificadas e liberadas"
echo ""
