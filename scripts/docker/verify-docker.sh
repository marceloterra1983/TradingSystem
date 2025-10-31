#!/bin/bash
# TradingSystem - Docker Verification
# Verifica se Docker está configurado corretamente
#
# Usage: bash scripts/docker/verify-docker.sh
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

set -euo pipefail

# Basic formatting helpers (inline para evitar dependência de libs removidas)
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_BLUE='\033[0;34m'
COLOR_NC='\033[0m'

command_exists() { command -v "$1" >/dev/null 2>&1; }
log_info() { echo -e "${COLOR_BLUE}[INFO]${COLOR_NC} $*"; }
log_warning() { echo -e "${COLOR_YELLOW}[WARN]${COLOR_NC} $*"; }
section() { echo -e "\n${COLOR_BLUE}=== $1 ===${COLOR_NC}\n"; }

section "Docker Verification - TradingSystem"

# Counters
PASS=0
FAIL=0

# Test function
run_test() {
    local name=$1
    local test_cmd=$2
    
    echo -n "$name... "
    if eval "$test_cmd"; then
        echo -e "${COLOR_GREEN}✓ PASS${COLOR_NC}"
        ((PASS++))
        return 0
    else
        echo -e "${COLOR_RED}✗ FAIL${COLOR_NC}"
        ((FAIL++))
        return 1
    fi
}

# Test 1: Docker installed
log_info "1. Docker instalado"
if run_test "  Docker command" "command_exists docker"; then
    DOCKER_VERSION=$(docker --version 2>/dev/null || echo "unknown")
    echo "     Version: $DOCKER_VERSION"
fi
echo ""

# Test 2: User in docker group
log_info "2. Usuário no grupo 'docker'"
if run_test "  Group membership" "groups | grep -q docker"; then
    :
else
    echo "     Solução: sudo usermod -aG docker \$USER"
    echo "     Depois: newgrp docker (ou logout/login)"
fi
echo ""

# Test 3: Docker daemon running
log_info "3. Docker daemon rodando"
if run_test "  Daemon status" "docker info &>/dev/null"; then
    :
else
    echo "     Solução: sudo systemctl start docker"
fi
echo ""

# Test 4: Permission to list containers
log_info "4. Permissão para listar containers"
if run_test "  Docker ps" "docker ps &>/dev/null"; then
    CONTAINER_COUNT=$(docker ps -q | wc -l)
    echo "     Containers rodando: $CONTAINER_COUNT"
else
    ERROR=$(docker ps 2>&1 | head -n 1)
    echo "     Erro: $ERROR"
fi
echo ""

# Test 5: Docker socket accessible
log_info "5. Docker socket acessível"
if run_test "  Socket exists" "[[ -S /var/run/docker.sock ]]"; then
    SOCKET_PERMS=$(ls -l /var/run/docker.sock | awk '{print $1, $3, $4}')
    echo "     Permissões: $SOCKET_PERMS"
else
    echo "     Socket não encontrado"
fi
echo ""

# Test 6: Docker Compose available
log_info "6. Docker Compose disponível"
if run_test "  Compose command" "check_docker_compose"; then
    COMPOSE_CMD=$(get_compose_cmd)
    echo "     Comando: $COMPOSE_CMD"
fi
echo ""

# Summary
section "Resumo"

echo -e "  ✓ Testes OK: ${COLOR_GREEN}$PASS${COLOR_NC}"
echo -e "  ✗ Testes com falha: ${COLOR_RED}$FAIL${COLOR_NC}"
echo ""

# Diagnosis
if [[ $FAIL -eq 0 ]]; then
    log_success "TUDO CERTO! Docker configurado corretamente."
    echo ""
elif [[ $FAIL -le 2 ]]; then
    log_warning "ATENÇÃO! Alguns testes falharam."
    echo ""
    echo "  Soluções sugeridas:"
    if ! groups | grep -q docker; then
        echo "  1. sudo usermod -aG docker \$USER"
        echo "  2. newgrp docker (ou logout/login)"
    fi
    if ! docker info &>/dev/null; then
        echo "  3. sudo systemctl start docker"
    fi
else
    log_error "PROBLEMAS DETECTADOS!"
    echo ""
    echo "  Consulte a documentação:"
    echo "  - docs/context/ops/scripts/README.md"
fi

echo ""
exit "$FAIL"
