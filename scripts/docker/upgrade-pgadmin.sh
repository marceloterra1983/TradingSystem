#!/usr/bin/env bash
# ==============================================================================
# Upgrade pgAdmin to Version 9.0
# ==============================================================================
# Script para atualizar pgAdmin de 8.11 para 9.0 seguindo os padrões do projeto
#
# Uso:
#   bash scripts/docker/upgrade-pgadmin.sh
#
# Documentação:
#   - Container Naming: docs/context/ops/tools/container-naming.md
#   - Build Images: scripts/docker/build-images.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/tools/compose/docker-compose.timescale.yml"
IMG_VERSION="${IMG_VERSION:-2025.10.19}"
PLATFORM="${PLATFORM:-linux/amd64}"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

log_detail() {
    echo -e "${CYAN}      ${NC} $1"
}

# ==============================================================================
# Banner
# ==============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║           pgAdmin Upgrade: 8.11 → 9.0                              ║"
echo "║           Following TradingSystem Container Standards              ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
log_info "IMG_VERSION: ${IMG_VERSION}"
log_info "PLATFORM: ${PLATFORM}"
echo ""

# ==============================================================================
# Verificações pré-execução
# ==============================================================================

log_step "1/7 - Verificando versão atual do pgAdmin..."
if docker inspect data-timescaledb-pgadmin &>/dev/null; then
    CURRENT_IMAGE=$(docker inspect data-timescaledb-pgadmin --format='{{.Config.Image}}')
    CURRENT_STATUS=$(docker inspect data-timescaledb-pgadmin --format='{{.State.Status}}')
    log_info "Container encontrado"
    log_detail "Imagem atual: ${CURRENT_IMAGE}"
    log_detail "Status: ${CURRENT_STATUS}"
else
    log_warn "Container data-timescaledb-pgadmin não encontrado (primeira instalação)"
    CURRENT_IMAGE="nenhum"
fi

# ==============================================================================
# Backup de configurações
# ==============================================================================

log_step "2/7 - Criando backup das configurações do pgAdmin..."
BACKUP_DIR="${PROJECT_ROOT}/backups/pgadmin-upgrade-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

# Backup do volume de dados
log_info "Fazendo backup do volume timescaledb-pgadmin..."
if docker volume inspect timescaledb-pgadmin &>/dev/null; then
    docker run --rm \
        --platform "${PLATFORM}" \
        -v timescaledb-pgadmin:/source:ro \
        -v "${BACKUP_DIR}:/backup" \
        alpine tar czf /backup/pgadmin-data.tar.gz -C /source . 2>/dev/null && \
        log_detail "✅ Backup do volume criado: pgadmin-data.tar.gz" || \
        log_warn "Volume vazio (normal para primeira instalação)"
else
    log_warn "Volume timescaledb-pgadmin não existe"
fi

# Backup das configurações do servidor
if docker exec data-timescaledb-pgadmin test -f /pgadmin4/servers.json 2>/dev/null; then
    log_info "Exportando configuração de servidores..."
    docker exec data-timescaledb-pgadmin cat /pgadmin4/servers.json > "${BACKUP_DIR}/servers.json" 2>/dev/null || true
    log_detail "✅ Configuração exportada: servers.json"
fi

log_info "📦 Backup salvo em: ${BACKUP_DIR}"

# ==============================================================================
# Parar e remover container antigo
# ==============================================================================

log_step "3/7 - Parando container antigo..."
if docker ps -q --filter name=data-timescaledb-pgadmin | grep -q .; then
    docker compose -f "${COMPOSE_FILE}" stop timescaledb-pgadmin 2>/dev/null || true
    log_detail "✅ Container parado"
fi

log_info "Removendo container antigo..."
if docker ps -aq --filter name=data-timescaledb-pgadmin | grep -q .; then
    docker compose -f "${COMPOSE_FILE}" rm -f timescaledb-pgadmin 2>/dev/null || true
    log_detail "✅ Container removido"
fi

# ==============================================================================
# Pull e retag da nova imagem (seguindo padrão do projeto)
# ==============================================================================

log_step "4/7 - Baixando e retagueando imagem pgAdmin 9.0..."
log_info "Baixando dpage/pgadmin4:9.0 (platform: ${PLATFORM})..."
docker pull --platform "${PLATFORM}" dpage/pgadmin4:9.0

log_info "Retagueando para img-data-timescaledb-pgadmin:${IMG_VERSION}..."
docker tag dpage/pgadmin4:9.0 "img-data-timescaledb-pgadmin:${IMG_VERSION}"
log_detail "✅ Imagem pronta: img-data-timescaledb-pgadmin:${IMG_VERSION}"

# ==============================================================================
# Atualizar build-images.sh (verificação)
# ==============================================================================

log_step "5/7 - Verificando build-images.sh..."
if grep -q "dpage/pgadmin4:9.0" "${PROJECT_ROOT}/scripts/docker/build-images.sh"; then
    log_detail "✅ build-images.sh já atualizado para versão 9.0"
else
    log_warn "⚠️  build-images.sh ainda referencia versão antiga"
    log_detail "Execute: sed -i 's/pgadmin4:8.11/pgadmin4:9.0/' scripts/docker/build-images.sh"
fi

# ==============================================================================
# Recriar container com nova versão
# ==============================================================================

log_step "6/7 - Recriando container pgAdmin com versão 9.0..."
cd "${PROJECT_ROOT}/tools/compose"
export IMG_VERSION
docker compose -f docker-compose.timescale.yml up -d timescaledb-pgadmin

log_detail "✅ Container criado"

# ==============================================================================
# Aguardar inicialização e verificar saúde
# ==============================================================================

log_step "7/7 - Aguardando inicialização e validando..."
log_info "Aguardando 20 segundos para o container inicializar..."
sleep 20

# Verificar logs
echo ""
log_info "📋 Últimas linhas do log:"
docker logs data-timescaledb-pgadmin --tail 15 2>&1 | sed 's/^/      /'

# Status do container
echo ""
log_info "📊 Status do container:"
docker ps --filter name=data-timescaledb-pgadmin --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | sed '1!s/^/      /'

# Testar endpoint
echo ""
log_info "🔍 Testando acesso ao pgAdmin..."
PGADMIN_PORT=$(grep '^PGADMIN_HOST_PORT=' "${PROJECT_ROOT}/.env.example" 2>/dev/null | cut -d'=' -f2 | tr -d ' ' || echo "5050")
PGADMIN_PORT=${PGADMIN_PORT:-5050}

if timeout 5 curl -sf "http://localhost:${PGADMIN_PORT}/login" > /dev/null 2>&1; then
    log_detail "✅ pgAdmin está acessível em http://localhost:${PGADMIN_PORT}"
else
    log_warn "⚠️  pgAdmin pode ainda estar inicializando"
    log_detail "Aguarde mais 30s e tente: http://localhost:${PGADMIN_PORT}"
fi

# ==============================================================================
# Informações de acesso
# ==============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    Upgrade Concluído!                              ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
log_info "🌐 Informações de acesso:"
log_detail "URL: http://localhost:${PGADMIN_PORT}"
log_detail "Email: (ver .env - PGADMIN_DEFAULT_EMAIL)"
log_detail "Senha: (ver .env - PGADMIN_DEFAULT_PASSWORD)"
echo ""
log_info "📦 Backup salvo em:"
log_detail "${BACKUP_DIR}"
echo ""
log_info "📚 Novidades do pgAdmin 9.0:"
log_detail "• Novo layout 'Workspace' (além do Classic)"
log_detail "• Suporte ao PostgreSQL 17 MAINTAIN privilege"
log_detail "• Melhorias no OAuth2 (GitHub Private Email)"
log_detail "• Nome simplificado: 'pgAdmin 4' (sem vX)"
log_detail "• ⚠️  PostgreSQL 9.6 e anteriores não mais suportados"
echo ""
log_warn "📝 Nota: Pode ser necessário reconfigurar conexões de servidor"
log_detail "As configurações antigas foram preservadas no backup"
echo ""

# ==============================================================================
# Verificação final
# ==============================================================================

NEW_IMAGE=$(docker inspect data-timescaledb-pgadmin --format='{{.Config.Image}}' 2>/dev/null)
if [[ "${NEW_IMAGE}" == *"${IMG_VERSION}"* ]]; then
    log_info "✅ Upgrade bem-sucedido!"
    log_detail "Imagem anterior: ${CURRENT_IMAGE}"
    log_detail "Imagem atual: ${NEW_IMAGE}"
    echo ""
    log_info "🎯 Próximos passos:"
    log_detail "1. Acesse http://localhost:${PGADMIN_PORT} e faça login"
    log_detail "2. Verifique se as conexões existentes funcionam"
    log_detail "3. Explore o novo layout 'Workspace' em Settings → Preferences"
    log_detail "4. Execute 'docker compose -f tools/compose/docker-compose.timescale.yml ps' para verificar status"
    echo ""
    exit 0
else
    log_error "❌ Algo deu errado durante o upgrade"
    log_detail "Imagem esperada: img-data-timescaledb-pgadmin:${IMG_VERSION}"
    log_detail "Imagem atual: ${NEW_IMAGE}"
    echo ""
    log_info "🔄 Para reverter:"
    log_detail "1. docker compose -f ${COMPOSE_FILE} stop timescaledb-pgadmin"
    log_detail "2. docker volume rm timescaledb-pgadmin"
    log_detail "3. cd ${BACKUP_DIR} && tar xzf pgadmin-data.tar.gz"
    log_detail "4. Copiar dados para /var/lib/docker/volumes/timescaledb-pgadmin/_data/"
    log_detail "5. Recriar container com versão antiga"
    echo ""
    exit 1
fi
