#!/usr/bin/env bash
# ==============================================================================
# Fix Registry Container Health
# ==============================================================================
# Script para corrigir o healthcheck do container registry.2
#
# Uso:
#   bash scripts/docker/fix-registry-health.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/tools/docker-compose.cache.yml"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ==============================================================================
# Verificações pré-execução
# ==============================================================================

log_info "Verificando rede buildkit-net..."
if ! docker network inspect buildkit-net &>/dev/null; then
    log_warn "Rede buildkit-net não encontrada. Criando..."
    docker network create buildkit-net
    log_info "Rede buildkit-net criada com sucesso!"
fi

log_info "Verificando arquivo de configuração do registry..."
if [[ ! -f "${PROJECT_ROOT}/tools/registry/config.yml" ]]; then
    log_error "Arquivo de configuração não encontrado: ${PROJECT_ROOT}/tools/registry/config.yml"
    exit 1
fi

# ==============================================================================
# Recriar container
# ==============================================================================

log_info "Parando container registry..."
docker compose -f "${COMPOSE_FILE}" stop registry 2>/dev/null || true

log_info "Removendo container registry..."
docker compose -f "${COMPOSE_FILE}" rm -f registry 2>/dev/null || true

log_info "Recriando container registry com healthcheck corrigido..."
cd "${PROJECT_ROOT}/infrastructure"
docker compose -f docker-compose.cache.yml up -d registry

# ==============================================================================
# Aguardar inicialização
# ==============================================================================

log_info "Aguardando inicialização do container (15s start_period)..."
sleep 15

# ==============================================================================
# Verificar saúde
# ==============================================================================

log_info "Verificando logs do container..."
docker logs outros-containers-registry --tail 20

echo ""
log_info "Status atual do container:"
docker ps --filter name=outros-containers-registry --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
log_info "Testando endpoint manualmente..."
if curl -sf http://localhost:5000/v2/_catalog &>/dev/null; then
    log_info "✅ Registry está respondendo corretamente!"
    echo "Resposta:"
    curl -s http://localhost:5000/v2/_catalog | jq . 2>/dev/null || curl -s http://localhost:5000/v2/_catalog
else
    log_error "❌ Registry não está respondendo no endpoint /v2/_catalog"
    log_warn "Aguarde mais alguns segundos para o healthcheck completar..."
fi

echo ""
log_info "Aguardando próximo healthcheck (30s)..."
sleep 30

echo ""
log_info "Status final do container:"
docker ps --filter name=outros-containers-registry --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar se está healthy
if docker ps --filter name=outros-containers-registry --format "{{.Status}}" | grep -q "healthy"; then
    log_info "✅ Container está HEALTHY!"
    exit 0
else
    log_warn "⚠️  Container ainda não está healthy. Verifique os logs:"
    log_warn "    docker logs outros-containers-registry"
    exit 1
fi
