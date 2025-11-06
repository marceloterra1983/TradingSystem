#!/usr/bin/env bash
# ==============================================================================
# Health Dashboard Pre-Flight Check
# ==============================================================================
#
# Description:
#   Validates environment before running health monitoring scripts
#   Prevents hanging and failures by checking prerequisites
#
# Features:
#   ✓ Checks Python version and dependencies
#   ✓ Validates available disk space
#   ✓ Checks memory usage
#   ✓ Validates network connectivity
#   ✓ Checks for zombie processes
#   ✓ Validates port availability
#   ✓ Removes stale kill switch
#
# Usage:
#   bash scripts/docs/pre-flight-check.sh
#
# Exit Codes:
#   0 - All checks passed
#   1 - Critical failure (cannot proceed)
#   2 - Warnings (can proceed with caution)
#
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${PROJECT_ROOT}/config/health-dashboard.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Minimum requirements
MIN_PYTHON_VERSION="3.8"
MIN_DISK_SPACE_MB=500
MIN_MEMORY_MB=512
MAX_LOAD_AVERAGE=4.0

# Tracking
WARNINGS=0
ERRORS=0

# ------------------------------------------------------------------------------
# Logging Functions
# ------------------------------------------------------------------------------
log_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  $1"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((ERRORS++))
}

log_check() {
    echo -e "${CYAN}[CHECK]${NC} $1"
}

# ------------------------------------------------------------------------------
# Check Functions
# ------------------------------------------------------------------------------

check_python_version() {
    log_check "Python version (>= ${MIN_PYTHON_VERSION})"
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed"
        return 1
    fi
    
    PYTHON_VERSION=$(python3 --version | awk '{print $2}')
    log_info "Found Python ${PYTHON_VERSION}"
    
    # Compare versions
    REQUIRED_VERSION=$(echo "${MIN_PYTHON_VERSION}" | awk -F. '{print $1*10000 + $2*100}')
    CURRENT_VERSION=$(echo "${PYTHON_VERSION}" | awk -F. '{print $1*10000 + $2*100}')
    
    if [ "${CURRENT_VERSION}" -ge "${REQUIRED_VERSION}" ]; then
        log_success "Python version OK"
        return 0
    else
        log_error "Python version too old (need >= ${MIN_PYTHON_VERSION})"
        return 1
    fi
}

check_python_dependencies() {
    log_check "Python dependencies"
    
    local missing=()
    
    # Check required packages
    for package in yaml requests; do
        if ! python3 -c "import ${package}" 2>/dev/null; then
            missing+=("${package}")
        fi
    done
    
    # Check optional packages
    local optional_missing=()
    for package in tqdm dotenv; do
        if ! python3 -c "import ${package}" 2>/dev/null; then
            optional_missing+=("${package}")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required packages: ${missing[*]}"
        log_info "Install with: pip install ${missing[*]}"
        return 1
    elif [ ${#optional_missing[@]} -gt 0 ]; then
        log_warning "Missing optional packages: ${optional_missing[*]}"
        log_info "Install with: pip install ${optional_missing[*]}"
        log_info "These improve user experience but are not required"
    else
        log_success "All Python dependencies installed"
    fi
    
    return 0
}

check_disk_space() {
    log_check "Disk space (>= ${MIN_DISK_SPACE_MB} MB free)"
    
    # Get available space in MB
    AVAILABLE_MB=$(df -m "${PROJECT_ROOT}" | awk 'NR==2 {print $4}')
    
    log_info "Available disk space: ${AVAILABLE_MB} MB"
    
    if [ "${AVAILABLE_MB}" -lt "${MIN_DISK_SPACE_MB}" ]; then
        log_error "Insufficient disk space (need ${MIN_DISK_SPACE_MB} MB)"
        return 1
    else
        log_success "Disk space OK"
        return 0
    fi
}

check_memory() {
    log_check "Available memory (>= ${MIN_MEMORY_MB} MB)"
    
    # Get available memory in MB
    if command -v free &> /dev/null; then
        AVAILABLE_MB=$(free -m | awk 'NR==2 {print $7}')
        log_info "Available memory: ${AVAILABLE_MB} MB"
        
        if [ "${AVAILABLE_MB}" -lt "${MIN_MEMORY_MB}" ]; then
            log_warning "Low available memory"
            log_info "Scripts may run slower with limited memory"
        else
            log_success "Memory OK"
        fi
    else
        log_warning "Cannot check memory (free command not available)"
    fi
    
    return 0
}

check_load_average() {
    log_check "System load average"
    
    if command -v uptime &> /dev/null; then
        LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
        log_info "Current load average: ${LOAD}"
        
        # Compare load (basic float comparison)
        if (( $(echo "${LOAD} > ${MAX_LOAD_AVERAGE}" | bc -l 2>/dev/null || echo 0) )); then
            log_warning "High system load (${LOAD})"
            log_info "Scripts may run slower or timeout"
        else
            log_success "System load OK"
        fi
    else
        log_warning "Cannot check system load (uptime command not available)"
    fi
    
    return 0
}

check_ports() {
    log_check "Port availability"
    
    # Load configuration
    if [ -f "${CONFIG_FILE}" ]; then
        source "${CONFIG_FILE}"
    else
        log_warning "Configuration file not found: ${CONFIG_FILE}"
        return 0
    fi
    
    local ports_to_check=(
        "${DOCUSAURUS_PORT:-3404}"
        "${DOCS_API_PORT:-3405}"
    )
    
    for port in "${ports_to_check[@]}"; do
        if lsof -i:"${port}" &> /dev/null; then
            local pid=$(lsof -ti:"${port}")
            log_warning "Port ${port} is in use by PID ${pid}"
            log_info "Scripts may fail to start services on this port"
        else
            log_success "Port ${port} is available"
        fi
    done
    
    return 0
}

check_zombie_processes() {
    log_check "Zombie processes"
    
    ZOMBIES=$(ps aux | awk '$8 == "Z" {print $2}' | wc -l)
    
    if [ "${ZOMBIES}" -gt 0 ]; then
        log_warning "Found ${ZOMBIES} zombie process(es)"
        log_info "This may indicate previous script failures"
        log_info "Consider rebooting if problems persist"
    else
        log_success "No zombie processes found"
    fi
    
    return 0
}

check_network() {
    log_check "Network connectivity"
    
    # Try to ping a reliable server
    if ping -c 1 -W 2 8.8.8.8 &> /dev/null; then
        log_success "Network connectivity OK"
    elif ping -c 1 -W 2 1.1.1.1 &> /dev/null; then
        log_success "Network connectivity OK"
    else
        log_warning "Network connectivity issues detected"
        log_info "External link validation will likely fail"
    fi
    
    return 0
}

check_kill_switch() {
    log_check "Kill switch status"
    
    local kill_switch_file="/tmp/health-dashboard-STOP"
    
    if [ -f "${kill_switch_file}" ]; then
        log_warning "Kill switch file exists: ${kill_switch_file}"
        log_info "Removing stale kill switch..."
        rm -f "${kill_switch_file}"
        log_success "Kill switch removed"
    else
        log_success "No kill switch active"
    fi
    
    return 0
}

check_config_file() {
    log_check "Configuration file"
    
    if [ -f "${CONFIG_FILE}" ]; then
        log_success "Configuration file found: ${CONFIG_FILE}"
        
        # Validate it can be sourced
        if source "${CONFIG_FILE}" 2>/dev/null; then
            log_success "Configuration file is valid"
        else
            log_error "Configuration file has syntax errors"
            return 1
        fi
    else
        log_warning "Configuration file not found: ${CONFIG_FILE}"
        log_info "Using default values"
    fi
    
    return 0
}

check_scripts_exist() {
    log_check "Health monitoring scripts"
    
    local scripts=(
        "${SCRIPT_DIR}/validate-frontmatter.py"
        "${SCRIPT_DIR}/check-links.py"
        "${SCRIPT_DIR}/detect-duplicates.py"
        "${SCRIPT_DIR}/generate-audit-report.py"
    )
    
    local missing=()
    
    for script in "${scripts[@]}"; do
        if [ ! -f "${script}" ]; then
            missing+=("$(basename "${script}")")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing scripts: ${missing[*]}"
        return 1
    else
        log_success "All scripts found"
    fi
    
    return 0
}

# ------------------------------------------------------------------------------
# Main Execution
# ------------------------------------------------------------------------------
main() {
    log_header "Health Dashboard Pre-Flight Check"
    
    log_info "Starting environment validation..."
    echo ""
    
    # Run all checks
    check_python_version
    check_python_dependencies
    check_disk_space
    check_memory
    check_load_average
    check_network
    check_ports
    check_zombie_processes
    check_kill_switch
    check_config_file
    check_scripts_exist
    
    # Summary
    echo ""
    log_header "Pre-Flight Check Summary"
    
    if [ ${ERRORS} -gt 0 ]; then
        log_error "Pre-flight check FAILED with ${ERRORS} error(s)"
        echo ""
        log_info "❌ Cannot proceed - fix errors and try again"
        echo ""
        return 1
    elif [ ${WARNINGS} -gt 0 ]; then
        log_warning "Pre-flight check completed with ${WARNINGS} warning(s)"
        echo ""
        log_info "⚠️  Can proceed but expect potential issues"
        echo ""
        return 2
    else
        log_success "Pre-flight check PASSED - all systems go!"
        echo ""
        log_info "✅ Safe to run health monitoring scripts"
        echo ""
        return 0
    fi
}

# Execute main function
main
EXIT_CODE=$?

# Provide next steps
if [ ${EXIT_CODE} -eq 0 ]; then
    echo ""
    echo "Next steps:"
    echo "  bash scripts/docs/run-all-health-tests.sh"
    echo ""
fi

exit ${EXIT_CODE}
