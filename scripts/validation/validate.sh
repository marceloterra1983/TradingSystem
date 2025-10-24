#!/bin/bash
# TradingSystem - Shell Script Validation
# Validates all shell scripts using shellcheck
#
# Usage: scripts/validate.sh [OPTIONS]
#   --fix           Auto-fix issues where possible
#   --strict        Use strict mode (fail on warnings)
#   --path PATH     Validate specific path only
#   --help          Show this help
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

set -euo pipefail

# Load common if available
if [[ -f "$(dirname "$0")/lib/common.sh" ]]; then
    # shellcheck source=scripts/lib/common.sh
    source "$(dirname "$0")/lib/common.sh"
else
    # Fallback logging
    log_info() { echo "[INFO] $*"; }
    log_success() { echo "[SUCCESS] $*"; }
    log_warning() { echo "[WARNING] $*"; }
    log_error() { echo "[ERROR] $*"; }
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Show help
show_help() {
    cat << EOF
TradingSystem Shell Script Validation

Usage: $(basename "$0") [OPTIONS]

Validates all shell scripts in the project using shellcheck.

Options:
  --fix           Auto-fix issues where possible (using shellcheck --format=diff)
  --strict        Fail on warnings (not just errors)
  --path PATH     Validate specific path only
  --help          Show this help message

Examples:
  $(basename "$0")                      # Validate all scripts
  $(basename "$0") --strict             # Strict mode (fail on warnings)
  $(basename "$0") --path scripts/lib/  # Validate specific directory

Requirements:
  - shellcheck must be installed
    Install: sudo apt install shellcheck

Exit Codes:
  0  All scripts passed validation
  1  Some scripts have errors
  2  shellcheck not installed

EOF
}

# Parse arguments
STRICT_MODE=false
FIX_MODE=false
TARGET_PATH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --fix) FIX_MODE=true; shift ;;
        --strict) STRICT_MODE=true; shift ;;
        --path) TARGET_PATH=$2; shift 2 ;;
        --help) show_help; exit 0 ;;
        *) log_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

# Check if shellcheck is installed
if ! command -v shellcheck &>/dev/null; then
    log_error "shellcheck is not installed"
    log_error "Install: sudo apt install shellcheck"
    exit 2
fi

# Determine search path
if [[ -n "$TARGET_PATH" ]]; then
    SEARCH_PATH="$TARGET_PATH"
else
    SEARCH_PATH="$PROJECT_ROOT"
fi

# Find all shell scripts
log_info "Searching for shell scripts in: $SEARCH_PATH"

# Paths to exclude
EXCLUDE_PATTERNS=(
    "tools/firecrawl"
    "tools/Agent-MCP/agent_mcp/templates"
    "node_modules"
    ".git"
    "external"
)

# Build find exclude arguments
FIND_ARGS=()
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    FIND_ARGS+=(-path "*/${pattern}/*" -prune -o)
done
FIND_ARGS+=(-name "*.sh" -type f -print)

# Find scripts
mapfile -t scripts < <(find "$SEARCH_PATH" "${FIND_ARGS[@]}" | sort)

if [[ ${#scripts[@]} -eq 0 ]]; then
    log_warning "No shell scripts found"
    exit 0
fi

log_info "Found ${#scripts[@]} shell script(s) to validate"
echo ""

# Shellcheck options
SHELLCHECK_OPTS=()
[[ "$STRICT_MODE" == "true" ]] && SHELLCHECK_OPTS+=(-S warning)

# Counters
checked=0
passed=0
failed=0
warnings=0

# Validate each script
for script in "${scripts[@]}"; do
    relative_path="${script#$PROJECT_ROOT/}"
    
    echo -n "Checking: $relative_path ... "
    
    # Run shellcheck
    if output=$(shellcheck -x "${SHELLCHECK_OPTS[@]}" "$script" 2>&1); then
        echo -e "${COLOR_GREEN:-}✓ PASS${COLOR_NC:-}"
        ((passed++))
    else
        # Check if it's warnings or errors
        if echo "$output" | grep -q "^error:"; then
            echo -e "${COLOR_RED:-}✗ FAIL${COLOR_NC:-}"
            ((failed++))
        else
            echo -e "${COLOR_YELLOW:-}⚠ WARNINGS${COLOR_NC:-}"
            ((warnings++))
        fi
        
        # Show output
        echo "$output" | sed 's/^/  /'
        echo ""
    fi
    
    ((checked++))
done

echo ""
echo "════════════════════════════════════════════════════════"
echo "Validation Summary"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  Total scripts:    $checked"
echo -e "  ${COLOR_GREEN:-}✓ Passed:${COLOR_NC:-}         $passed"
if [[ $warnings -gt 0 ]]; then
    echo -e "  ${COLOR_YELLOW:-}⚠ Warnings:${COLOR_NC:-}       $warnings"
fi
if [[ $failed -gt 0 ]]; then
    echo -e "  ${COLOR_RED:-}✗ Failed:${COLOR_NC:-}         $failed"
fi
echo ""

if [[ $failed -eq 0 ]] && ([[ "$STRICT_MODE" == "false" ]] || [[ $warnings -eq 0 ]]); then
    log_success "All scripts passed validation!"
    exit 0
else
    if [[ $failed -gt 0 ]]; then
        log_error "$failed script(s) have errors"
    fi
    if [[ "$STRICT_MODE" == "true" ]] && [[ $warnings -gt 0 ]]; then
        log_error "$warnings script(s) have warnings (strict mode)"
    fi
    exit 1
fi

