#!/usr/bin/env bash
# ==============================================================================
# validate-manifest.sh - Service Manifest Validation Script
# ==============================================================================
# Validates config/services-manifest.json for:
# - Path existence
# - Port conflicts
# - Required fields
# - package.json presence
#
# Usage: bash scripts/validation/validate-manifest.sh [--fix-paths]
# ==============================================================================

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST_FILE="$PROJECT_ROOT/config/services-manifest.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
CHECKS=0

# ==============================================================================
# Helper Functions
# ==============================================================================

log_error() {
    echo -e "${RED}✗ ERROR:${NC} $1"
    ((ERRORS++))
}

log_warning() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
    ((WARNINGS++))
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ==============================================================================
# Validation Functions
# ==============================================================================

check_manifest_exists() {
    ((CHECKS++))
    if [[ ! -f "$MANIFEST_FILE" ]]; then
        log_error "Manifest file not found: $MANIFEST_FILE"
        exit 1
    fi
    log_success "Manifest file exists"
}

validate_json_syntax() {
    ((CHECKS++))
    if ! jq empty "$MANIFEST_FILE" 2>/dev/null; then
        log_error "Invalid JSON syntax in $MANIFEST_FILE"
        exit 1
    fi
    log_success "JSON syntax is valid"
}

check_service_paths() {
    log_info "Checking service paths..."

    local services=$(jq -r '.services[] | @json' "$MANIFEST_FILE")

    while IFS= read -r service; do
        ((CHECKS++))
        local id=$(echo "$service" | jq -r '.id')
        local path=$(echo "$service" | jq -r '.path')
        local full_path="$PROJECT_ROOT/$path"

        if [[ ! -d "$full_path" ]]; then
            log_error "Service '$id': Path does not exist - $path"
        else
            log_success "Service '$id': Path exists - $path"

            # Check if package.json exists
            if [[ ! -f "$full_path/package.json" ]]; then
                log_warning "Service '$id': Missing package.json in $path"
            fi
        fi
    done <<< "$services"
}

detect_port_conflicts() {
    log_info "Checking for port conflicts..."

    declare -A port_map
    local services=$(jq -r '.services[] | @json' "$MANIFEST_FILE")

    while IFS= read -r service; do
        ((CHECKS++))
        local id=$(echo "$service" | jq -r '.id')
        local port=$(echo "$service" | jq -r '.port')

        # Skip null ports
        if [[ "$port" == "null" ]]; then
            continue
        fi

        # Check if port is already used
        if [[ -n "${port_map[$port]:-}" ]]; then
            log_error "PORT CONFLICT: Port $port used by both '${port_map[$port]}' and '$id'"
        else
            port_map[$port]="$id"
            log_success "Service '$id': Port $port is unique"
        fi
    done <<< "$services"
}

validate_required_fields() {
    log_info "Validating required fields..."

    local services=$(jq -r '.services[] | @json' "$MANIFEST_FILE")
    local required_fields=("id" "type" "path" "start")

    while IFS= read -r service; do
        ((CHECKS++))
        local id=$(echo "$service" | jq -r '.id')

        for field in "${required_fields[@]}"; do
            local value=$(echo "$service" | jq -r ".$field")

            if [[ "$value" == "null" || -z "$value" ]]; then
                log_error "Service '$id': Missing required field '$field'"
            fi
        done

        log_success "Service '$id': All required fields present"
    done <<< "$services"
}

check_service_types() {
    log_info "Validating service types..."

    local valid_types=("backend" "frontend" "docs" "infra" "external")
    local services=$(jq -r '.services[] | @json' "$MANIFEST_FILE")

    while IFS= read -r service; do
        ((CHECKS++))
        local id=$(echo "$service" | jq -r '.id')
        local type=$(echo "$service" | jq -r '.type')

        local is_valid=false
        for valid_type in "${valid_types[@]}"; do
            if [[ "$type" == "$valid_type" ]]; then
                is_valid=true
                break
            fi
        done

        if [[ "$is_valid" == false ]]; then
            log_warning "Service '$id': Unknown service type '$type'"
        else
            log_success "Service '$id': Valid service type '$type'"
        fi
    done <<< "$services"
}

generate_report() {
    echo ""
    echo "=============================================="
    echo "  SERVICE MANIFEST VALIDATION REPORT"
    echo "=============================================="
    echo ""
    echo "Total Checks: $CHECKS"
    echo -e "${GREEN}Successes: $((CHECKS - ERRORS - WARNINGS))${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo -e "${RED}Errors: $ERRORS${NC}"
    echo ""

    if [[ $ERRORS -eq 0 ]]; then
        echo -e "${GREEN}✓ VALIDATION PASSED${NC}"
        if [[ $WARNINGS -gt 0 ]]; then
            echo -e "${YELLOW}⚠ $WARNINGS warnings found - review recommended${NC}"
        fi
        return 0
    else
        echo -e "${RED}✗ VALIDATION FAILED${NC}"
        echo -e "${RED}Fix $ERRORS errors before proceeding${NC}"
        return 1
    fi
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    echo "=============================================="
    echo "  TradingSystem - Manifest Validator"
    echo "=============================================="
    echo ""

    # Check dependencies
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Install with: sudo apt install jq"
        exit 1
    fi

    # Run validations
    check_manifest_exists
    validate_json_syntax
    check_service_paths
    detect_port_conflicts
    validate_required_fields
    check_service_types

    # Generate report
    generate_report
}

# Run main function
main "$@"
