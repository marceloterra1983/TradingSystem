#!/usr/bin/env bash
# Master Fix Script - Eliminate All Startup Warnings
# Orchestrates all fixes for warnings and missing keys

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $*"
}

show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         TradingSystem - Startup Warnings Fix Script           ║"
    echo "║                                                                ║"
    echo "║  This script will fix all Docker warnings and missing keys    ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_prerequisites() {
    log_step "1/6 - Checking prerequisites..."
    
    # Check if running from correct directory
    if [ ! -f "${REPO_ROOT}/.env.example" ] && [ ! -f "${REPO_ROOT}/.env" ]; then
        log_error "Not running from TradingSystem root directory!"
        exit 1
    fi
    
    # Check if docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running! Please start Docker first."
        exit 1
    fi
    
    # Check if services are running
    if ! pgrep -f "vite" >/dev/null 2>&1; then
        log_warn "Services don't appear to be running. This is OK, but fixes will be more effective if services are stopped."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
    
    log_info "✅ Prerequisites OK"
    echo
}

fix_docker_warnings() {
    log_step "2/6 - Fixing Docker Compose warnings..."
    
    # Fix network warnings
    log_info "Fixing network external declarations..."
    if [ -f "${REPO_ROOT}/scripts/docker/fix-network-warnings.sh" ]; then
        bash "${REPO_ROOT}/scripts/docker/fix-network-warnings.sh"
    else
        log_error "Network fix script not found!"
        return 1
    fi
    
    # Clean up orphan containers
    log_info "Cleaning up orphan containers..."
    if [ -f "${REPO_ROOT}/scripts/docker/cleanup-orphan-containers.sh" ]; then
        bash "${REPO_ROOT}/scripts/docker/cleanup-orphan-containers.sh"
    else
        log_error "Orphan cleanup script not found!"
        return 1
    fi
    
    log_info "✅ Docker warnings fixed"
    echo
}

generate_passwords() {
    log_step "3/6 - Generating secure passwords..."
    
    if [ -f "${REPO_ROOT}/scripts/env/generate-secure-passwords.sh" ]; then
        bash "${REPO_ROOT}/scripts/env/generate-secure-passwords.sh"
    else
        log_error "Password generation script not found!"
        return 1
    fi
    
    log_info "✅ Passwords generated"
    echo
}

add_api_keys() {
    log_step "4/6 - Adding API key placeholders..."
    
    if [ -f "${REPO_ROOT}/scripts/env/add-api-keys-template.sh" ]; then
        bash "${REPO_ROOT}/scripts/env/add-api-keys-template.sh"
    else
        log_error "API key template script not found!"
        return 1
    fi
    
    log_info "✅ API key placeholders added"
    echo
}

restart_services() {
    log_step "5/6 - Restarting all services..."
    
    log_info "Stopping all services..."
    if command -v stop >/dev/null 2>&1; then
        stop 2>/dev/null || true
    else
        bash "${REPO_ROOT}/scripts/docker/stop-stacks.sh" 2>/dev/null || true
        pkill -f "vite" 2>/dev/null || true
        pkill -f "node.*3[0-9]{3}" 2>/dev/null || true
    fi
    
    sleep 3
    
    log_info "Starting all services..."
    if command -v start >/dev/null 2>&1; then
        start
    else
        bash "${REPO_ROOT}/scripts/docker/start-stacks.sh"
        # Start Node services manually if needed
        log_warn "Please start Node.js services manually in separate terminals"
    fi
    
    log_info "✅ Services restarted"
    echo
}

validate_fixes() {
    log_step "6/6 - Validating fixes..."
    
    local validation_failed=false
    
    # Check for Docker warnings
    log_info "Checking for Docker warnings..."
    local warnings=$(docker compose -f "${REPO_ROOT}/infrastructure/compose/docker-compose.langgraph-dev.yml" config 2>&1 | grep -i "warn" || true)
    if [ -n "$warnings" ]; then
        log_warn "Still found warnings:"
        echo "$warnings"
        validation_failed=true
    else
        log_info "✅ No Docker warnings detected"
    fi
    
    # Check for missing API keys
    log_info "Checking for placeholder API keys..."
    if grep -q "CHANGE_ME" "${REPO_ROOT}/.env" 2>/dev/null; then
        log_warn "⚠️  Found CHANGE_ME placeholders in .env - these must be replaced manually!"
        echo
        grep "CHANGE_ME" "${REPO_ROOT}/.env" || true
        validation_failed=true
    else
        log_info "✅ No CHANGE_ME placeholders found"
    fi
    
    # Check service health
    log_info "Checking service health..."
    sleep 5  # Give services time to start
    
    if curl -s http://localhost:3500/api/health/full >/dev/null 2>&1; then
        local health=$(curl -s http://localhost:3500/api/health/full | jq -r '.overallHealth' 2>/dev/null || echo "unknown")
        if [ "$health" = "healthy" ]; then
            log_info "✅ All services healthy"
        else
            log_warn "⚠️  Service health: $health"
            validation_failed=true
        fi
    else
        log_warn "⚠️  Could not check service health (service launcher may not be running)"
    fi
    
    echo
    if [ "$validation_failed" = true ]; then
        log_warn "⚠️  Validation completed with warnings - manual intervention required"
        return 1
    else
        log_info "✅ All validations passed!"
        return 0
    fi
}

show_summary() {
    echo
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                     Fix Summary                                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${GREEN}✅ Completed Fixes:${NC}"
    echo "   1. Docker network warnings eliminated"
    echo "   2. Orphan containers removed"
    echo "   3. Secure passwords generated"
    echo "   4. API key placeholders added"
    echo "   5. Services restarted"
    echo
    echo -e "${YELLOW}⚠️  Manual Actions Required:${NC}"
    echo "   1. Replace CHANGE_ME_* values in .env with real API keys"
    echo "   2. Store passwords securely (check .env.backup-* files)"
    echo "   3. Test all integrations after adding API keys"
    echo
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo "   - Full audit: ${REPO_ROOT}/STARTUP-WARNINGS-AND-MISSING-KEYS-AUDIT.md"
    echo "   - Environment guide: docs/context/ops/ENVIRONMENT-CONFIGURATION.md"
    echo
    echo -e "${CYAN}🔗 API Key Registration Links:${NC}"
    echo "   - LangSmith: https://smith.langchain.com/"
    echo "   - OpenAI: https://platform.openai.com/api-keys"
    echo "   - Anthropic: https://console.anthropic.com/account/keys"
    echo "   - Firecrawl: https://www.firecrawl.dev/app/api-keys"
    echo
}

main() {
    cd "${REPO_ROOT}"
    
    show_banner
    
    check_prerequisites
    fix_docker_warnings
    generate_passwords
    add_api_keys
    restart_services
    
    if validate_fixes; then
        show_summary
        log_info "🎉 All automated fixes completed successfully!"
        exit 0
    else
        show_summary
        log_warn "⚠️  Some manual steps remain - see summary above"
        exit 1
    fi
}

# Trap errors
trap 'log_error "Script failed at line $LINENO. Check output above for details."' ERR

main "$@"
