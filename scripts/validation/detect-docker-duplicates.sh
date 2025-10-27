#!/usr/bin/env bash
# ==============================================================================
# detect-docker-duplicates.sh - Docker Compose Duplication Detector
# ==============================================================================
# Detects duplicate service definitions across Docker Compose files:
# - Same service names in multiple files
# - Same container names
# - Conflicting network definitions
# - Duplicate volume mounts
#
# Usage: bash scripts/validation/detect-docker-duplicates.sh
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

# Registries
declare -A SERVICE_REGISTRY
declare -A CONTAINER_REGISTRY
declare -A NETWORK_REGISTRY

DUPLICATES_FOUND=0

# ==============================================================================
# Helper Functions
# ==============================================================================

log_error() {
    echo -e "${RED}✗ DUPLICATE: $1${NC}"
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

# ==============================================================================
# Detection Functions
# ==============================================================================

find_compose_files() {
    find "$PROJECT_ROOT" \
        -name "docker-compose*.yml" -o -name "compose*.yml" \
        -not -path "*/node_modules/*" \
        -not -path "*/build/*" \
        -not -path "*/dist/*" \
        2>/dev/null || true
}

extract_services() {
    local file=$1
    local filename=$(basename "$file")

    if ! command -v yq &> /dev/null; then
        # Fallback to grep if yq not available
        grep -oP '^  \K[a-zA-Z0-9_-]+(?=:)' "$file" 2>/dev/null || true
        return
    fi

    yq eval '.services | keys | .[]' "$file" 2>/dev/null || true
}

extract_container_names() {
    local file=$1

    if ! command -v yq &> /dev/null; then
        grep -oP 'container_name:\s*\K[^\s]+' "$file" 2>/dev/null || true
        return
    fi

    yq eval '.services.*.container_name' "$file" 2>/dev/null | grep -v null || true
}

extract_networks() {
    local file=$1

    if ! command -v yq &> /dev/null; then
        grep -oP '^  \K[a-zA-Z0-9_-]+(?=:)' "$file" | \
            grep -A5 "^networks:" 2>/dev/null || true
        return
    fi

    yq eval '.networks | keys | .[]' "$file" 2>/dev/null || true
}

check_service_duplicates() {
    log_section "Checking for Duplicate Service Names"

    local compose_files=$(find_compose_files)
    local service_count=0

    while IFS= read -r file; do
        if [[ -z "$file" || ! -f "$file" ]]; then continue; fi

        local filename=$(basename "$file")
        local services=$(extract_services "$file")

        while IFS= read -r service; do
            if [[ -z "$service" ]]; then continue; fi

            ((service_count++))

            if [[ -n "${SERVICE_REGISTRY[$service]:-}" ]]; then
                log_error "Service '$service' defined in multiple files:"
                echo "  • ${SERVICE_REGISTRY[$service]}"
                echo "  • $filename"
                ((DUPLICATES_FOUND++))
            else
                SERVICE_REGISTRY[$service]="$filename"
            fi
        done <<< "$services"

    done <<< "$compose_files"

    if [[ $DUPLICATES_FOUND -eq 0 ]]; then
        log_success "No duplicate service names found ($service_count services checked)"
    fi
}

check_container_duplicates() {
    log_section "Checking for Duplicate Container Names"

    local compose_files=$(find_compose_files)
    local container_count=0
    local duplicates_in_section=0

    while IFS= read -r file; do
        if [[ -z "$file" || ! -f "$file" ]]; then continue; fi

        local filename=$(basename "$file")
        local containers=$(extract_container_names "$file")

        while IFS= read -r container; do
            if [[ -z "$container" ]]; then continue; fi

            ((container_count++))

            if [[ -n "${CONTAINER_REGISTRY[$container]:-}" ]]; then
                log_error "Container '$container' defined in multiple files:"
                echo "  • ${CONTAINER_REGISTRY[$container]}"
                echo "  • $filename"
                ((DUPLICATES_FOUND++))
                ((duplicates_in_section++))
            else
                CONTAINER_REGISTRY[$container]="$filename"
            fi
        done <<< "$containers"

    done <<< "$compose_files"

    if [[ $duplicates_in_section -eq 0 ]]; then
        log_success "No duplicate container names found ($container_count containers checked)"
    fi
}

check_network_conflicts() {
    log_section "Checking for Network Definition Conflicts"

    local compose_files=$(find_compose_files)
    local network_count=0
    local conflicts=0

    while IFS= read -r file; do
        if [[ -z "$file" || ! -f "$file" ]]; then continue; fi

        local filename=$(basename "$file")
        local networks=$(extract_networks "$file")

        while IFS= read -r network; do
            if [[ -z "$network" ]]; then continue; fi

            ((network_count++))

            # Check if network is marked as external
            local is_external=false
            if grep -q "external: true" "$file" 2>/dev/null; then
                is_external=true
            fi

            if [[ -n "${NETWORK_REGISTRY[$network]:-}" ]]; then
                if [[ "$is_external" == false ]]; then
                    log_warning "Network '$network' defined in multiple files (may conflict):"
                    echo "  • ${NETWORK_REGISTRY[$network]}"
                    echo "  • $filename"
                    ((conflicts++))
                fi
            else
                NETWORK_REGISTRY[$network]="$filename"
            fi
        done <<< "$networks"

    done <<< "$compose_files"

    if [[ $conflicts -eq 0 ]]; then
        log_success "No network definition conflicts found ($network_count networks checked)"
    fi
}

analyze_compose_organization() {
    log_section "Analyzing Compose File Organization"

    local compose_files=$(find_compose_files)

    # Group by directory
    declare -A dir_counts

    while IFS= read -r file; do
        if [[ -z "$file" ]]; then continue; fi

        local dir=$(dirname "$file" | sed "s|$PROJECT_ROOT/||")
        dir_counts[$dir]=$((${dir_counts[$dir]:-0} + 1))
    done <<< "$compose_files"

    echo ""
    printf "%-50s %s\n" "DIRECTORY" "COUNT"
    printf "%-50s %s\n" "─────────" "─────"

    for dir in "${!dir_counts[@]}"; do
        printf "%-50s %d\n" "$dir" "${dir_counts[$dir]}"
    done

    echo ""
}

detect_similar_services() {
    log_section "Detecting Potentially Similar Services"

    # Look for services with similar purposes
    local compose_files=$(find_compose_files)

    declare -A service_patterns=(
        ["monitoring"]="prometheus|grafana|alertmanager"
        ["database"]="postgres|timescale|questdb|mongo"
        ["documentation"]="docs|docusaurus"
        ["tools"]="adminer|pgadmin"
    )

    for pattern_name in "${!service_patterns[@]}"; do
        local pattern="${service_patterns[$pattern_name]}"
        local matches=()

        while IFS= read -r file; do
            if [[ -z "$file" || ! -f "$file" ]]; then continue; fi

            local filename=$(basename "$file")
            local services=$(extract_services "$file")

            while IFS= read -r service; do
                if [[ "$service" =~ $pattern ]]; then
                    matches+=("$service ($filename)")
                fi
            done <<< "$services"

        done <<< "$compose_files"

        if [[ ${#matches[@]} -gt 1 ]]; then
            log_info "$pattern_name services found in ${#matches[@]} files:"
            for match in "${matches[@]}"; do
                echo "  • $match"
            done
        fi
    done
}

# ==============================================================================
# Reporting
# ==============================================================================

generate_recommendations() {
    log_section "Recommendations"

    echo ""

    if [[ $DUPLICATES_FOUND -eq 0 ]]; then
        log_success "No critical duplications detected!"
        echo ""
        echo "Optional improvements:"
        echo "  • Consider consolidating related services into single compose files"
        echo "  • Use docker-compose.override.yml for local customizations"
        echo "  • Document which compose files should be run together"
        return 0
    fi

    log_error "Found $DUPLICATES_FOUND duplications"
    echo ""
    echo "Required actions:"
    echo "  1. Remove duplicate service definitions"
    echo "  2. Ensure container names are unique across all compose files"
    echo "  3. Use 'external: true' for shared networks"
    echo ""
    echo "Tips:"
    echo "  • Use 'extends' to share service configurations"
    echo "  • Create a base docker-compose.base.yml for common definitions"
    echo "  • Use profiles to organize services by environment"
    echo ""

    return 1
}

list_all_compose_files() {
    log_section "Docker Compose Files Inventory"

    local compose_files=$(find_compose_files)
    local count=0

    echo ""
    while IFS= read -r file; do
        if [[ -z "$file" ]]; then continue; fi

        ((count++))
        local relative_path=$(echo "$file" | sed "s|$PROJECT_ROOT/||")
        local num_services=$(extract_services "$file" | wc -l)

        printf "%2d. %-60s (%d services)\n" "$count" "$relative_path" "$num_services"
    done <<< "$compose_files"

    echo ""
    log_info "Total compose files: $count"
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    echo "=============================================="
    echo "  TradingSystem - Docker Compose Analyzer"
    echo "=============================================="

    # Check for yq (optional but helpful)
    if ! command -v yq &> /dev/null; then
        log_warning "yq not installed - using grep fallback (less accurate)"
        echo "Install yq for better accuracy: sudo snap install yq"
        echo ""
    fi

    # Run checks
    list_all_compose_files
    check_service_duplicates
    check_container_duplicates
    check_network_conflicts
    analyze_compose_organization
    detect_similar_services
    generate_recommendations

    exit $?
}

main "$@"
