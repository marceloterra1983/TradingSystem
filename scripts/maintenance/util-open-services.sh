#!/bin/bash
# TradingSystem - Open Services in Browser
# Abre URLs dos serviços no navegador
#
# Usage: bash scripts/utils/open-services.sh
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"
# shellcheck source=scripts/lib/terminal.sh
source "$SCRIPT_DIR/../lib/terminal.sh"

section "TradingSystem - Opening Services"

# Service URLs
declare -A SERVICE_URLS=(
    ["Dashboard"]="http://localhost:3103"
    ["Documentation"]="http://localhost:3400"
    ["Workspace"]="http://localhost:3100"
    ["TP-Capital"]="http://localhost:3200"
    ["QuestDB Console"]="http://localhost:9000"
    ["QuestDB UI"]="http://localhost:9009"
    ["Prometheus"]="http://localhost:9090"
    ["Grafana"]="http://localhost:3000"
)

log_info "Available Services:"
echo ""
for service in "${!SERVICE_URLS[@]}"; do
    url="${SERVICE_URLS[$service]}"
    echo "  $service: $url"
done
echo ""

log_info "Opening services in browser..."
echo ""

# Open main services
MAIN_SERVICES=(
    "Dashboard"
    "Documentation"
    "Workspace"
)

for service in "${MAIN_SERVICES[@]}"; do
    url="${SERVICE_URLS[$service]}"
    log_info "Opening $service..."
    
    if open_url "$url"; then
        log_success "  Opened: $url"
    else
        log_warning "  Failed to open automatically"
        log_info "  Please open manually: $url"
    fi
    
    sleep 1
done

echo ""
log_success "Services opened in browser!"
echo ""
log_info "💡 DICA: Se algum serviço não abrir automaticamente,"
log_info "copie as URLs acima e acesse diretamente no browser."
echo ""
