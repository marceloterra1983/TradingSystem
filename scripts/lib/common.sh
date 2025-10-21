#!/bin/bash
# Common utilities for TradingSystem scripts
set -euo pipefail

# Prevent multiple sourcing
[[ -n "${_COMMON_SH_LOADED:-}" ]] && return 0
readonly _COMMON_SH_LOADED=1

# Color codes - detect if terminal supports colors
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && tput colors >/dev/null 2>&1 && [[ $(tput colors) -ge 8 ]]; then
    readonly COLOR_RED='\033[0;31m'
    readonly COLOR_GREEN='\033[0;32m'
    readonly COLOR_YELLOW='\033[1;33m'
    readonly COLOR_BLUE='\033[0;34m'
    readonly COLOR_NC='\033[0m'
else
    readonly COLOR_RED=''
    readonly COLOR_GREEN=''
    readonly COLOR_YELLOW=''
    readonly COLOR_BLUE=''
    readonly COLOR_NC=''
fi

# Auto-detect project root
get_project_root() {
    local script_path
    script_path="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    
    while [[ "$script_path" != "/" ]]; do
        if [[ -f "$script_path/.git/config" ]] || [[ -f "$script_path/CLAUDE.md" ]] || [[ -f "$script_path/package.json" ]]; then
            echo "$script_path"
            return 0
        fi
        script_path="$(dirname "$script_path")"
    done
    
    echo "ERROR: Could not find project root" >&2
    return 1
}

# Logging functions
log_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_NC} $*" >&2
}

log_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_NC} $*" >&2
}

log_warning() {
    echo -e "${COLOR_YELLOW}[WARNING]${COLOR_NC} $*" >&2
}

log_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_NC} $*" >&2
}

log_debug() {
    if [[ "${DEBUG:-0}" == "1" ]]; then
        echo -e "${COLOR_BLUE}[DEBUG]${COLOR_NC} $*" >&2
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" &>/dev/null
}

# Require command or exit
require_command() {
    local cmd=$1
    local suggestion=${2:-"Please install $cmd"}
    
    if ! command_exists "$cmd"; then
        log_error "Required command not found: $cmd"
        log_error "$suggestion"
        return 1
    fi
}

# Get environment variable with default
get_env() {
    local var_name=$1
    local default_value=${2:-}
    echo "${!var_name:-$default_value}"
}

# Validate safe string
validate_safe_string() {
    local str=$1
    if [[ "$str" =~ [\;\|\&\$\`\<\>] ]]; then
        log_error "String contains dangerous characters: $str"
        return 1
    fi
    return 0
}

# Confirm prompt
confirm() {
    local prompt=${1:-"Continue?"}
    local response
    
    read -r -p "$prompt [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

# Print horizontal rule
hr() {
    echo "========================================================================"
}

# Print section header
section() {
    local title=$1
    echo ""
    hr
    echo -e "${COLOR_BLUE}  $title${COLOR_NC}"
    hr
    echo ""
}

# Check if root
is_root() {
    [[ $EUID -eq 0 ]]
}

# Check if WSL
is_wsl() {
    grep -qi microsoft /proc/version 2>/dev/null
}

# Get timestamp
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Export functions
export -f log_info log_success log_warning log_error log_debug
export -f command_exists require_command validate_safe_string confirm
