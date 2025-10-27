#!/usr/bin/env bash
# ==============================================================================
# detect-port-conflicts.sh - Port Conflict Detection Script
# ==============================================================================
# Scans the project for port usage across:
# - services-manifest.json
# - Docker Compose files
# - .env files
# - package.json scripts
# - Currently running processes
#
# Usage: bash scripts/validation/detect-port-conflicts.sh [--include-running]
# ==============================================================================

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Port registry
declare -A PORT_REGISTRY
declare -A PORT_SOURCES

CONFLICTS_FOUND=0
INCLUDE_RUNNING=false

# Parse arguments
if [[ "${1:-}" == "--include-running" ]]; then
    INCLUDE_RUNNING=true
fi

# ==============================================================================
# Helper Functions
# ==============================================================================

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
}

register_port() {
    local port=$1
    local service=$2
    local source=$3

    if [[ -z "${PORT_REGISTRY[$port]:-}" ]]; then
        PORT_REGISTRY[$port]="$service"
        PORT_SOURCES[$port]="$source"
    else
        # Conflict detected!
        log_error "PORT CONFLICT: Port $port"
        echo "  • Already used by: ${PORT_REGISTRY[$port]}"
        echo "    Source: ${PORT_SOURCES[$port]}"
        echo "  • Also used by: $service"
        echo "    Source: $source"
        ((CONFLICTS_FOUND++))
    fi
}

# ==============================================================================
# Port Detection Functions
# ==============================================================================

scan_manifest() {
    log_section "Scanning services-manifest.json"

    local manifest="$PROJECT_ROOT/config/services-manifest.json"

    if [[ ! -f "$manifest" ]]; then
        log_warning "Manifest file not found"
        return
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq not installed - skipping manifest scan"
        return
    fi

    local services=$(jq -r '.services[] | @json' "$manifest" 2>/dev/null || echo "")

    if [[ -z "$services" ]]; then
        log_warning "No services found in manifest"
        return
    fi

    local count=0
    while IFS= read -r service; do
        local id=$(echo "$service" | jq -r '.id')
        local port=$(echo "$service" | jq -r '.port')

        if [[ "$port" != "null" && -n "$port" ]]; then
            register_port "$port" "$id" "services-manifest.json"
            ((count++))
        fi
    done <<< "$services"

    log_success "Found $count ports in manifest"
}

scan_docker_compose() {
    log_section "Scanning Docker Compose files"

    local compose_files=$(find "$PROJECT_ROOT/tools/compose" \
                               "$PROJECT_ROOT/tools/monitoring" \
                               "$PROJECT_ROOT/frontend/compose" \
                               -name "docker-compose*.yml" -o -name "compose*.yml" 2>/dev/null || true)

    if [[ -z "$compose_files" ]]; then
        log_warning "No Docker Compose files found"
        return
    fi

    local count=0
    while IFS= read -r file; do
        if [[ -z "$file" ]]; then continue; fi

        local filename=$(basename "$file")

        # Extract ports using grep (format: "PORT:PORT" or "PORT")
        local ports=$(grep -oP '^\s*-\s*"\K\d+(?=:\d+)' "$file" 2>/dev/null || true)

        while IFS= read -r port; do
            if [[ -n "$port" ]]; then
                register_port "$port" "docker-service" "$filename"
                ((count++))
            fi
        done <<< "$ports"

    done <<< "$compose_files"

    log_success "Found $count port mappings in Docker Compose files"
}

scan_env_files() {
    log_section "Scanning .env files"

    local env_files="$PROJECT_ROOT/.env"

    if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
        env_files="$env_files $PROJECT_ROOT/.env.local"
    fi

    local count=0
    for file in $env_files; do
        if [[ ! -f "$file" ]]; then continue; fi

        local filename=$(basename "$file")

        # Look for PORT variables (e.g., PORT=3200, WORKSPACE_PORT=3200)
        local port_vars=$(grep -oP '^\w+_?PORT=\K\d+' "$file" 2>/dev/null || true)

        while IFS= read -r port; do
            if [[ -n "$port" ]]; then
                register_port "$port" "env-variable" "$filename"
                ((count++))
            fi
        done <<< "$port_vars"
    done

    log_success "Found $count port definitions in .env files"
}

scan_package_json() {
    log_section "Scanning package.json files"

    local package_files=$(find "$PROJECT_ROOT" \
                               -name "package.json" \
                               -not -path "*/node_modules/*" \
                               -not -path "*/dist/*" \
                               -not -path "*/build/*" 2>/dev/null || true)

    local count=0
    while IFS= read -r file; do
        if [[ -z "$file" || ! -f "$file" ]]; then continue; fi

        # Look for --port flags in scripts
        local ports=$(grep -oP '(--port|PORT=)\s*\K\d+' "$file" 2>/dev/null || true)

        local service_dir=$(dirname "$file" | sed "s|$PROJECT_ROOT/||")

        while IFS= read -r port; do
            if [[ -n "$port" ]]; then
                register_port "$port" "npm-script" "$service_dir/package.json"
                ((count++))
            fi
        done <<< "$ports"

    done <<< "$package_files"

    log_success "Found $count port references in package.json files"
}

scan_running_processes() {
    if [[ "$INCLUDE_RUNNING" != true ]]; then
        return
    fi

    log_section "Scanning running processes"

    if ! command -v lsof &> /dev/null && ! command -v ss &> /dev/null; then
        log_warning "Neither lsof nor ss available - skipping running process scan"
        return
    fi

    local count=0

    # Get listening ports using ss (faster than lsof)
    if command -v ss &> /dev/null; then
        local listening_ports=$(ss -tuln | grep LISTEN | awk '{print $5}' | grep -oP ':\K\d+$' | sort -u)

        while IFS= read -r port; do
            if [[ -n "$port" ]]; then
                # Check if this port is already in our registry
                if [[ -n "${PORT_REGISTRY[$port]:-}" ]]; then
                    log_warning "Port $port (${PORT_REGISTRY[$port]}) is currently IN USE"
                else
                    register_port "$port" "running-process" "system"
                fi
                ((count++))
            fi
        done <<< "$listening_ports"
    fi

    log_success "Found $count ports currently in use"
}

# ==============================================================================
# Reporting
# ==============================================================================

generate_port_map() {
    log_section "Port Allocation Map"

    if [[ ${#PORT_REGISTRY[@]} -eq 0 ]]; then
        log_warning "No ports registered"
        return
    fi

    echo ""
    printf "%-8s %-25s %-40s\n" "PORT" "SERVICE" "SOURCE"
    printf "%-8s %-25s %-40s\n" "────" "───────" "──────"

    for port in $(echo "${!PORT_REGISTRY[@]}" | tr ' ' '\n' | sort -n); do
        printf "%-8s %-25s %-40s\n" \
            "$port" \
            "${PORT_REGISTRY[$port]}" \
            "${PORT_SOURCES[$port]}"
    done

    echo ""
}

generate_recommendations() {
    log_section "Recommendations"

    if [[ $CONFLICTS_FOUND -eq 0 ]]; then
        log_success "No port conflicts detected!"
        return 0
    fi

    echo ""
    log_error "Found $CONFLICTS_FOUND port conflicts"
    echo ""
    echo "Recommended actions:"
    echo "  1. Review services-manifest.json for duplicate port assignments"
    echo "  2. Check Docker Compose files in tools/compose/"
    echo "  3. Verify .env port variables are correct"
    echo "  4. Update package.json scripts with correct ports"
    echo ""
    echo "Quick fixes:"
    echo "  • Edit config/services-manifest.json and update conflicting ports"
    echo "  • Adjust Docker Compose port mappings: \"NEW_PORT:CONTAINER_PORT\""
    echo "  • Update .env files with correct port values"
    echo ""

    return 1
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    echo "=============================================="
    echo "  TradingSystem - Port Conflict Detector"
    echo "=============================================="

    # Run scans
    scan_manifest
    scan_docker_compose
    scan_env_files
    scan_package_json
    scan_running_processes

    # Generate reports
    generate_port_map
    generate_recommendations

    exit $?
}

main "$@"
