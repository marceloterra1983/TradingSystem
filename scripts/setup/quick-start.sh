#!/bin/bash
# TradingSystem Quick Start
# Configura ambiente de desenvolvimento rapidamente
#
# Usage: bash scripts/setup/quick-start.sh
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"
# shellcheck source=scripts/lib/docker.sh
source "$SCRIPT_DIR/../lib/docker.sh"

PROJECT_ROOT=$(get_project_root)

section "TradingSystem Quick Start"

log_info "Este script irá configurar seu ambiente de desenvolvimento"
echo ""

# Step 1: Docker group
log_info "1. Adicionando usuário ao grupo docker..."
if groups | grep -q docker; then
    log_success "Usuário já está no grupo docker"
else
    sudo usermod -aG docker "$USER"
    log_success "Usuário adicionado ao grupo docker"
    log_warning "Você precisará fazer logout/login ou executar: newgrp docker"
fi
echo ""

# Step 2: Docker socket permissions
log_info "2. Ajustando permissões do Docker socket..."
if [[ -S /var/run/docker.sock ]]; then
    sudo chmod 666 /var/run/docker.sock
    log_success "Permissões ajustadas"
else
    log_warning "Docker socket não encontrado"
fi
echo ""

# Step 3: Start Docker
log_info "3. Iniciando Docker daemon..."
if check_docker; then
    log_success "Docker já está rodando"
else
    sudo systemctl start docker && sudo systemctl enable docker
    log_success "Docker iniciado e habilitado"
fi
echo ""

# Step 4: Nginx (opcional)
log_info "4. Configurando Nginx (opcional)..."
if confirm "Deseja instalar e configurar Nginx?"; then
    if ! command_exists nginx; then
        log_info "Instalando Nginx..."
        sudo apt update && sudo apt install -y nginx
        log_success "Nginx instalado"
    else
        log_success "Nginx já está instalado"
    fi
    
    # Add local domain
    if ! grep -q "tradingsystem.local" /etc/hosts; then
        log_info "Adicionando tradingsystem.local ao /etc/hosts..."
        echo "127.0.0.1 tradingsystem.local" | sudo tee -a /etc/hosts
        log_success "Domínio local adicionado"
    fi
    
    # Nginx config
    if [[ -f "$PROJECT_ROOT/tools/nginx-proxy/tradingsystem.conf" ]]; then
        if [[ ! -f "/etc/nginx/sites-enabled/tradingsystem.conf" ]]; then
            log_info "Configurando Nginx..."
            sudo cp "$PROJECT_ROOT/tools/nginx-proxy/tradingsystem.conf" /etc/nginx/sites-available/
            sudo ln -s /etc/nginx/sites-available/tradingsystem.conf /etc/nginx/sites-enabled/
            sudo nginx -t && sudo systemctl reload nginx
            log_success "Nginx configurado"
        else
            log_success "Nginx já configurado"
        fi
    fi
else
    log_info "Nginx ignorado"
fi
echo ""

# Step 5: Environment files
log_info "5. Configurando arquivos de ambiente..."

ENV_FILES=(
    "frontend/dashboard/.env"
    "backend/api/workspace/.env"
    "apps/tp-capital/.env"
)

for env_file in "${ENV_FILES[@]}"; do
    if [[ -f "$PROJECT_ROOT/$env_file.example" ]] && [[ ! -f "$PROJECT_ROOT/$env_file" ]]; then
        cp "$PROJECT_ROOT/$env_file.example" "$PROJECT_ROOT/$env_file"
        log_success "Criado: $env_file"
    fi
done
echo ""

# Step 6: Apply group changes
section "Próximos Passos"

log_info "Ambiente configurado com sucesso!"
echo ""
log_warning "IMPORTANTE: Para aplicar as mudanças de grupo, execute:"
echo ""
echo "  Opção A (rápido):"
echo "    newgrp docker"
echo ""
echo "  Opção B (mais confiável):"
echo "    exit"
echo "    # Faça login novamente"
echo ""
log_info "Depois de aplicar as mudanças:"
echo ""
echo "  1. Instalar dependências:"
echo "     bash scripts/setup/install-dependencies.sh"
echo ""
echo "  2. Iniciar serviços:"
echo "     bash scripts/docker/start-stacks.sh"
echo "     bash scripts/services/start-all.sh"
echo ""
echo "  3. Verificar status:"
echo "     bash scripts/services/status.sh"
echo ""
