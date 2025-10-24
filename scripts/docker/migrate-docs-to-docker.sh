#!/bin/bash
# ============================================================================
# TradingSystem - Migrate Documentation Services to Docker
# ============================================================================
# This script helps migrate from local services to Docker containers:
#   - Documentation API (Port 3400) → DocsAPI container
#   - Docusaurus (Port 3004) → Kept as local service for DEV
#
# Usage:
#   bash scripts/docker/migrate-docs-to-docker.sh [OPTIONS]
#
# Options:
#   --dry-run         Show what would be done without executing
#   --skip-backup     Skip backup of current data
#   --force           Force migration even if services are running
#
# Author: TradingSystem Team
# Last Updated: 2025-10-15
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
DRY_RUN=false
SKIP_BACKUP=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --skip-backup) SKIP_BACKUP=true; shift ;;
        --force) FORCE=true; shift ;;
        --help)
            head -n 20 "$0" | grep "^#" | sed 's/^# \?//'
            exit 0
            ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
done

# Helper functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${BLUE}\n🔹 $1${NC}"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# ============================================================================
# Pre-flight Checks
# ============================================================================
log_step "Pre-flight Checks"

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi
log_success "Docker is installed"

# Check Docker Compose is installed
if ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose v2+"
    exit 1
fi
log_success "Docker Compose v2+ is installed"

# Check if services are running
DOCS_API_RUNNING=false
if lsof -i :3400 &> /dev/null; then
    DOCS_API_RUNNING=true
    log_warning "Documentation API is currently running on port 3400"
fi

DOCUSAURUS_RUNNING=false
if lsof -i :3004 &> /dev/null; then
    DOCUSAURUS_RUNNING=true
    log_warning "Docusaurus is currently running on port 3004"
fi

if [[ "$DOCS_API_RUNNING" == "true" || "$DOCUSAURUS_RUNNING" == "true" ]] && [[ "$FORCE" == "false" ]]; then
    log_error "Services are currently running. Stop them first or use --force"
    log_info "  To stop: bash scripts/services/stop-all.sh"
    log_info "  Or use: $0 --force"
    exit 1
fi

# ============================================================================
# Backup Current State
# ============================================================================
if [[ "$SKIP_BACKUP" == "false" ]]; then
    log_step "Backing up current data"
    
    BACKUP_DIR="$PROJECT_ROOT/backups/docs-migration-$(date +%Y%m%d_%H%M%S)"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        mkdir -p "$BACKUP_DIR"
        
        # Backup Documentation API uploads
        if [[ -d "backend/api/documentation-api/uploads" ]]; then
            log_info "Backing up Documentation API uploads..."
            cp -r backend/api/documentation-api/uploads "$BACKUP_DIR/"
            log_success "Uploads backed up to $BACKUP_DIR/uploads"
        fi
        
        # Backup .env files
        if [[ -f "backend/api/documentation-api/.env" ]]; then
            cp backend/api/documentation-api/.env "$BACKUP_DIR/.env.docs-api.backup"
            log_success ".env backed up"
        fi
        
        # Create backup README
        cat > "$BACKUP_DIR/README.md" << 'EOF'
# Documentation Services Backup

Created: $(date)
Migration: Local Services → Docker Containers

## Contents

- `uploads/` - Documentation API file uploads
- `.env.docs-api.backup` - Environment variables

## Restore

To restore uploads to Docker volume:

```bash
docker run --rm -v tradingsystem_docs-api-uploads:/data \
  -v $(pwd):/backup alpine \
  sh -c "cp -r /backup/uploads/* /data/"
```
EOF
        
        log_success "Backup created at: $BACKUP_DIR"
    else
        log_info "[DRY-RUN] Would create backup at: $BACKUP_DIR"
    fi
else
    log_warning "Skipping backup (--skip-backup flag set)"
fi

# ============================================================================
# Stop Running Services
# ============================================================================
if [[ "$DOCS_API_RUNNING" == "true" || "$DOCUSAURUS_RUNNING" == "true" ]]; then
    log_step "Stopping running services"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        bash scripts/services/stop-all.sh --only documentation-api,docs-hub || true
        sleep 2
        log_success "Local services stopped"
    else
        log_info "[DRY-RUN] Would stop local services"
    fi
fi

# ============================================================================
# Create Docker Networks (if not exist)
# ============================================================================
log_step "Creating Docker networks"

NETWORKS=("tradingsystem_backend" "tradingsystem_data" "tradingsystem_frontend")

for network in "${NETWORKS[@]}"; do
    if docker network inspect "$network" &> /dev/null; then
        log_success "Network $network already exists"
    else
        if [[ "$DRY_RUN" == "false" ]]; then
            docker network create "$network"
            log_success "Created network: $network"
        else
            log_info "[DRY-RUN] Would create network: $network"
        fi
    fi
done

# ============================================================================
# Build Docker Images
# ============================================================================
log_step "Building Docker images"

if [[ "$DRY_RUN" == "false" ]]; then
    log_info "Building DocsAPI image..."
    docker compose --env-file "$PROJECT_ROOT/.env" -f tools/compose/docker-compose.docs.yml build docs-api
    log_success "DocsAPI image built"
    
    log_info "Building Docusaurus production image..."
    docker compose --env-file "$PROJECT_ROOT/.env" -f tools/compose/docker-compose.docs.yml build docusaurus
    log_success "Docusaurus image built"
else
    log_info "[DRY-RUN] Would build Docker images"
fi

# ============================================================================
# Start TimescaleDB (dependency)
# ============================================================================
log_step "Ensuring TimescaleDB is running"

if ! docker ps --format '{{.Names}}' | grep -q '^data-timescaledb$'; then
    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Starting TimescaleDB..."
        docker compose --env-file "$PROJECT_ROOT/.env" -f tools/compose/docker-compose.timescale.yml up -d timescaledb

        log_info "Waiting for TimescaleDB to accept connections..."
        timeout=60
        elapsed=0
        while [[ $elapsed -lt $timeout ]]; do
            if docker exec data-timescaledb pg_isready -U "${TIMESCALEDB_USER:-timescale}" >/dev/null 2>&1; then
                log_success "TimescaleDB is ready"
                break
            fi
            sleep 2
            elapsed=$((elapsed + 2))
        done

        if [[ $elapsed -ge $timeout ]]; then
            log_error "TimescaleDB failed to become ready within ${timeout}s"
            exit 1
        fi
    else
        log_info "[DRY-RUN] Would start TimescaleDB"
    fi
else
    log_success "TimescaleDB is already running"
fi

# ============================================================================
# Initialize Database Schemas
# ============================================================================
log_step "Initializing database schemas"

log_info "QuestDB schema bootstrap has been retired. Please run TimescaleDB migrations manually if required."

# ============================================================================
# Start DocsAPI Container
# ============================================================================
log_step "Starting DocsAPI container"

if [[ "$DRY_RUN" == "false" ]]; then
    docker compose --env-file "$PROJECT_ROOT/.env" -f tools/compose/docker-compose.docs.yml up -d docs-api
    
    log_info "Waiting for DocsAPI to be healthy..."
    timeout=60
    elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        if curl -s http://localhost:3400/health | grep -q '"status":"ok"'; then
            log_success "DocsAPI is healthy and responding"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    if [[ $elapsed -ge $timeout ]]; then
        log_error "DocsAPI failed to become healthy within ${timeout}s"
        log_info "Check logs: docker compose --env-file .env -f tools/compose/docker-compose.docs.yml logs docs-api"
        exit 1
    fi
else
    log_info "[DRY-RUN] Would start DocsAPI container"
fi

# ============================================================================
# Migration Complete
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              MIGRATION COMPLETED SUCCESSFULLY               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

log_success "DocsAPI is now running in Docker!"
echo ""
log_info "📋 Service Information:"
echo "  • DocsAPI:      http://localhost:3400"
echo "  • Health:       http://localhost:3400/health"
echo "  • OpenAPI:      http://localhost:3400/spec/openapi.yaml"
echo "  • AsyncAPI:     http://localhost:3400/spec/asyncapi.yaml"
echo ""

log_info "🔧 Management Commands:"
echo "  • View logs:    docker compose --env-file .env -f tools/compose/docker-compose.docs.yml logs -f docs-api"
echo "  • Restart:      docker compose --env-file .env -f tools/compose/docker-compose.docs.yml restart docs-api"
echo "  • Stop:         docker compose --env-file .env -f tools/compose/docker-compose.docs.yml down"
echo "  • Stats:        docker stats docs-api"
echo ""

log_info "📚 Docusaurus (Development):"
echo "  • Use LOCAL service for development (hot reload):"
echo "    cd docs/docusaurus && npm run start -- --port 3004"
echo ""
echo "  • Use DOCKER for production:"
echo "    docker compose --env-file .env -f tools/compose/docker-compose.docs.yml --profile production up -d"
echo ""

if [[ "$SKIP_BACKUP" == "false" && "$DRY_RUN" == "false" ]]; then
    log_info "💾 Backup Location:"
    echo "  $BACKUP_DIR"
fi
echo ""

log_warning "⚠️  Next Steps:"
echo "  1. Update frontend dashboard to use container URLs (already configured)"
echo "  2. Test all endpoints: bash scripts/docker/test-docs-api.sh"
echo "  3. Update documentation: docs/DIRECTORY-STRUCTURE.md"
echo "  4. Remove old start scripts (optional)"
echo ""
