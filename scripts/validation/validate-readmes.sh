#!/usr/bin/env bash
# ==============================================================================
# validate-readmes.sh - README Consistency Validator
# ==============================================================================
# Validates README files across the project for:
# - Existence in key directories
# - Correct port numbers
# - Required sections (Quick Start, Installation, etc.)
# - Consistency with CLAUDE.md and manifest
#
# Usage: bash scripts/validation/validate-readmes.sh
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

# Counters
ERRORS=0
WARNINGS=0
CHECKS=0

# Required sections in service READMEs
REQUIRED_SECTIONS=(
    "Installation"
    "Quick Start"
    "Configuration"
)

# Key directories that should have READMEs
KEY_DIRS=(
    "apps"
    "backend"
    "backend/api"
    "frontend"
    "frontend/dashboard"
    "docs"
    "tools"
    "scripts"
)

# Service directories to check
SERVICE_DIRS=(
    "apps/tp-capital"
    "apps/workspace"
    "backend/api/workspace"
    "backend/api/telegram-gateway"
    "backend/api/firecrawl-proxy"
    "backend/api/documentation-api"
    "frontend/dashboard"
    "docs"
)

# ==============================================================================
# Helper Functions
# ==============================================================================

log_error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
    ((ERRORS++))
}

log_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
    ((WARNINGS++))
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
# Validation Functions
# ==============================================================================

check_readme_existence() {
    log_section "Checking README Existence"

    for dir in "${KEY_DIRS[@]}"; do
        ((CHECKS++))
        local readme_path="$PROJECT_ROOT/$dir/README.md"

        if [[ -f "$readme_path" ]]; then
            log_success "$dir/README.md exists"
        else
            log_warning "$dir/README.md is missing"
        fi
    done
}

check_service_readmes() {
    log_section "Checking Service READMEs"

    for dir in "${SERVICE_DIRS[@]}"; do
        ((CHECKS++))
        local readme_path="$PROJECT_ROOT/$dir/README.md"

        if [[ ! -f "$readme_path" ]]; then
            if [[ -d "$PROJECT_ROOT/$dir" ]]; then
                log_error "Service $dir exists but README.md is missing"
            else
                log_info "Service $dir not found (skipping)"
            fi
            continue
        fi

        log_success "$dir/README.md exists"

        # Check for required sections
        check_required_sections "$readme_path" "$dir"
    done
}

check_required_sections() {
    local readme_path=$1
    local service_name=$2

    for section in "${REQUIRED_SECTIONS[@]}"; do
        ((CHECKS++))
        if grep -qi "^#.*$section" "$readme_path"; then
            log_success "  ├─ Section '$section' found in $service_name"
        else
            log_warning "  ├─ Section '$section' missing in $service_name/README.md"
        fi
    done
}

validate_port_numbers() {
    log_section "Validating Port Numbers"

    if [[ ! -f "$PROJECT_ROOT/config/services-manifest.json" ]]; then
        log_warning "services-manifest.json not found - skipping port validation"
        return
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq not installed - skipping port validation"
        return
    fi

    local services=$(jq -r '.services[] | @json' "$PROJECT_ROOT/config/services-manifest.json" 2>/dev/null || echo "")

    while IFS= read -r service; do
        ((CHECKS++))
        local id=$(echo "$service" | jq -r '.id')
        local port=$(echo "$service" | jq -r '.port')
        local path=$(echo "$service" | jq -r '.path')

        if [[ "$port" == "null" || -z "$port" ]]; then
            continue
        fi

        local readme_path="$PROJECT_ROOT/$path/README.md"

        if [[ ! -f "$readme_path" ]]; then
            continue
        fi

        # Check if README mentions the correct port
        if grep -q "$port" "$readme_path"; then
            log_success "Service '$id': Port $port documented in README"
        else
            log_warning "Service '$id': Port $port NOT mentioned in $path/README.md"
        fi
    done <<< "$services"
}

check_claude_consistency() {
    log_section "Checking CLAUDE.md Consistency"

    local claude_md="$PROJECT_ROOT/CLAUDE.md"

    if [[ ! -f "$claude_md" ]]; then
        log_error "CLAUDE.md not found in project root"
        return
    fi

    # Check if CLAUDE.md mentions key services
    local key_services=("Dashboard" "Workspace" "Documentation" "TP Capital")

    for service in "${key_services[@]}"; do
        ((CHECKS++))
        if grep -qi "$service" "$claude_md"; then
            log_success "CLAUDE.md mentions '$service'"
        else
            log_warning "CLAUDE.md does not mention '$service'"
        fi
    done

    # Check if CLAUDE.md has updated port information
    if grep -q "3103" "$claude_md" && \
       grep -q "3200" "$claude_md" && \
       grep -q "3400" "$claude_md" && \
       grep -q "3401" "$claude_md"; then
        log_success "CLAUDE.md contains current port information"
    else
        log_warning "CLAUDE.md may have outdated port information"
    fi
}

check_outdated_references() {
    log_section "Checking for Outdated References"

    # Common outdated patterns
    declare -A outdated_patterns=(
        ["QuestDB"]="Should use TimescaleDB for new services"
        ["Port 4005.*TP Capital"]="TP Capital may have moved to different port"
    )

    for dir in "${SERVICE_DIRS[@]}"; do
        local readme_path="$PROJECT_ROOT/$dir/README.md"

        if [[ ! -f "$readme_path" ]]; then
            continue
        fi

        for pattern in "${!outdated_patterns[@]}"; do
            ((CHECKS++))
            if grep -qi "$pattern" "$readme_path"; then
                log_warning "$dir/README.md: ${outdated_patterns[$pattern]}"
            fi
        done
    done
}

detect_broken_links() {
    log_section "Detecting Broken Internal Links"

    for dir in "${SERVICE_DIRS[@]}"; do
        local readme_path="$PROJECT_ROOT/$dir/README.md"

        if [[ ! -f "$readme_path" ]]; then
            continue
        fi

        # Extract markdown links [text](path)
        local links=$(grep -oP '\]\(\K[^)]+(?=\))' "$readme_path" 2>/dev/null || true)

        while IFS= read -r link; do
            if [[ -z "$link" || "$link" =~ ^http || "$link" =~ ^# ]]; then
                continue
            fi

            ((CHECKS++))
            # Resolve relative path
            local dir_path=$(dirname "$readme_path")
            local full_link="$dir_path/$link"

            if [[ ! -f "$full_link" && ! -d "$full_link" ]]; then
                log_warning "$dir/README.md: Broken link -> $link"
            fi
        done <<< "$links"
    done

    log_info "Internal link validation complete"
}

# ==============================================================================
# Reporting
# ==============================================================================

generate_report() {
    log_section "Validation Report"

    echo ""
    echo "Total Checks: $CHECKS"
    echo -e "${GREEN}Successes: $((CHECKS - ERRORS - WARNINGS))${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo -e "${RED}Errors: $ERRORS${NC}"
    echo ""

    if [[ $ERRORS -eq 0 ]]; then
        echo -e "${GREEN}✓ README VALIDATION PASSED${NC}"
        if [[ $WARNINGS -gt 0 ]]; then
            echo -e "${YELLOW}⚠ $WARNINGS warnings found - review recommended${NC}"
        fi
        return 0
    else
        echo -e "${RED}✗ README VALIDATION FAILED${NC}"
        echo -e "${RED}Fix $ERRORS errors before proceeding${NC}"
        return 1
    fi
}

generate_recommendations() {
    echo ""
    log_section "Recommendations"

    if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
        log_success "All READMEs are consistent!"
        return
    fi

    echo ""
    echo "Suggested actions:"
    echo "  1. Add missing READMEs to key directories"
    echo "  2. Ensure all service READMEs have required sections:"
    echo "     - Installation"
    echo "     - Quick Start"
    echo "     - Configuration"
    echo "  3. Update port numbers to match services-manifest.json"
    echo "  4. Fix broken internal links"
    echo "  5. Update CLAUDE.md with current service information"
    echo ""
    echo "README template location:"
    echo "  docs/content/reference/templates/SERVICE-README-TEMPLATE.md"
    echo ""
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    echo "=============================================="
    echo "  TradingSystem - README Validator"
    echo "=============================================="

    # Run validations
    check_readme_existence
    check_service_readmes
    validate_port_numbers
    check_claude_consistency
    check_outdated_references
    detect_broken_links

    # Generate reports
    generate_report
    generate_recommendations

    exit $?
}

main "$@"
