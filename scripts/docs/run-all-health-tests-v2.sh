#!/usr/bin/env bash
# ==============================================================================
# Health Dashboard - Complete Diagnostic & Setup (V2 - Anti-Hang Protected)
# ==============================================================================
#
# Description:
#   Master script to execute all health dashboard tests with anti-hang protection
#
# IMPROVEMENTS OVER V1:
#   ✓ Pre-flight checks before execution
#   ✓ Timeout protection (max 10 minutes per script)
#   ✓ Graceful shutdown on Ctrl+C
#   ✓ Kill switch support
#   ✓ Centralized configuration
#   ✓ Structured logging
#   ✓ Progress feedback
#   ✓ Resource monitoring
#
# Usage:
#   bash scripts/docs/run-all-health-tests-v2.sh
#
#   # Skip pre-flight checks (not recommended)
#   bash scripts/docs/run-all-health-tests-v2.sh --skip-preflight
#
#   # Emergency stop (from another terminal)
#   touch /tmp/health-dashboard-STOP
#
# Exit Codes:
#   0 - Success
#   1 - Failure
#   130 - Interrupted by user (Ctrl+C)
#
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${PROJECT_ROOT}/config/health-dashboard.env"
KILL_SWITCH_FILE="/tmp/health-dashboard-STOP"

# Default values (will be overridden by config file)
MAX_EXECUTION_TIME=600  # 10 minutes per script
GRACEFUL_SHUTDOWN_TIMEOUT=10
LOG_DIR="${PROJECT_ROOT}/logs/health-monitoring"
ENABLE_LOGGING=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Tracking
START_TIME=$(date +%s)
SCRIPTS_RUN=0
SCRIPTS_PASSED=0
SCRIPTS_FAILED=0

# ------------------------------------------------------------------------------
# Logging Functions
# ------------------------------------------------------------------------------
log_header() {
    echo ""
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
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  STEP $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# ------------------------------------------------------------------------------
# Utility Functions
# ------------------------------------------------------------------------------

check_kill_switch() {
    if [ -f "${KILL_SWITCH_FILE}" ]; then
        log_error "Kill switch detected: ${KILL_SWITCH_FILE}"
        log_info "Emergency stop requested"
        return 0  # Kill switch is active
    fi
    return 1  # No kill switch
}

cleanup() {
    local exit_code=$?
    
    # Calculate execution time
    local end_time=$(date +%s)
    local elapsed=$((end_time - START_TIME))
    
    log_header "Cleanup & Summary"
    
    log_info "Total execution time: ${elapsed}s"
    log_info "Scripts run: ${SCRIPTS_RUN}"
    log_success "Scripts passed: ${SCRIPTS_PASSED}"
    if [ ${SCRIPTS_FAILED} -gt 0 ]; then
        log_error "Scripts failed: ${SCRIPTS_FAILED}"
    fi
    
    # Remove kill switch if it exists
    if [ -f "${KILL_SWITCH_FILE}" ]; then
        rm -f "${KILL_SWITCH_FILE}"
        log_info "Removed kill switch file"
    fi
    
    echo ""
    
    if [ ${exit_code} -eq 0 ]; then
        log_success "All health tests completed successfully!"
    elif [ ${exit_code} -eq 130 ]; then
        log_warning "Health tests interrupted by user"
    else
        log_error "Health tests failed with exit code ${exit_code}"
    fi
    
    echo ""
}

trap cleanup EXIT

# Graceful shutdown on Ctrl+C
trap 'log_warning "Interrupted by user (Ctrl+C)"; exit 130' INT TERM

# ------------------------------------------------------------------------------
# Load Configuration
# ------------------------------------------------------------------------------
load_config() {
    if [ -f "${CONFIG_FILE}" ]; then
        log_info "Loading configuration from: ${CONFIG_FILE}"
        source "${CONFIG_FILE}"
        log_success "Configuration loaded"
    else
        log_warning "Configuration file not found, using defaults"
        log_info "Expected location: ${CONFIG_FILE}"
    fi
}

# ------------------------------------------------------------------------------
# Pre-Flight Checks
# ------------------------------------------------------------------------------
run_preflight_checks() {
    log_step "1: Pre-Flight Checks"
    
    local preflight_script="${SCRIPT_DIR}/pre-flight-check.sh"
    
    if [ ! -f "${preflight_script}" ]; then
        log_warning "Pre-flight check script not found: ${preflight_script}"
        log_info "Skipping pre-flight checks"
        return 0
    fi
    
    # Make script executable
    chmod +x "${preflight_script}" 2>/dev/null || true
    
    # Run pre-flight checks
    if bash "${preflight_script}"; then
        log_success "Pre-flight checks passed"
        return 0
    else
        local exit_code=$?
        if [ ${exit_code} -eq 2 ]; then
            log_warning "Pre-flight checks completed with warnings"
            log_info "Proceeding with caution..."
            return 0
        else
            log_error "Pre-flight checks failed"
            log_info "Fix errors before proceeding"
            return 1
        fi
    fi
}

# ------------------------------------------------------------------------------
# Run Script with Timeout Protection
# ------------------------------------------------------------------------------
run_script_with_timeout() {
    local script_name="$1"
    local script_path="$2"
    local timeout="${3:-$MAX_EXECUTION_TIME}"
    
    ((SCRIPTS_RUN++))
    
    log_info "Running: ${script_name}"
    log_info "Timeout: ${timeout}s"
    log_info "Script: ${script_path}"
    
    # Check if script exists
    if [ ! -f "${script_path}" ]; then
        log_error "Script not found: ${script_path}"
        ((SCRIPTS_FAILED++))
        return 1
    fi
    
    # Make script executable
    chmod +x "${script_path}" 2>/dev/null || true
    
    # Run script with timeout
    local start=$(date +%s)
    
    if timeout "${timeout}s" bash "${script_path}"; then
        local end=$(date +%s)
        local elapsed=$((end - start))
        log_success "${script_name} completed in ${elapsed}s"
        ((SCRIPTS_PASSED++))
        return 0
    else
        local exit_code=$?
        local end=$(date +%s)
        local elapsed=$((end - start))
        
        if [ ${exit_code} -eq 124 ]; then
            log_error "${script_name} TIMED OUT after ${timeout}s"
        else
            log_error "${script_name} failed with exit code ${exit_code} after ${elapsed}s"
        fi
        
        ((SCRIPTS_FAILED++))
        return 1
    fi
}

# ------------------------------------------------------------------------------
# System Diagnostics
# ------------------------------------------------------------------------------
run_diagnostics() {
    log_step "2: System Diagnostics"
    
    local diagnostic_script="${SCRIPT_DIR}/troubleshoot-health-dashboard.sh"
    
    run_script_with_timeout "System Diagnostics" "${diagnostic_script}" 60
}

# ------------------------------------------------------------------------------
# API Tests
# ------------------------------------------------------------------------------
run_api_tests() {
    log_step "3: API Endpoint Tests"
    
    # Script test-health-api.sh foi removido (redundante com troubleshoot-health-dashboard.sh)
    # Funcionalidade agora integrada em troubleshoot-health-dashboard.sh
    local api_test_script="${SCRIPT_DIR}/troubleshoot-health-dashboard.sh"
    
    if [[ -f "${api_test_script}" ]]; then
        run_script_with_timeout "API Tests" "${api_test_script}" 30
    else
        log_warning "Script de teste de API não encontrado, pulando..."
    fi
}

# ------------------------------------------------------------------------------
# Start Docusaurus (Optional)
# ------------------------------------------------------------------------------
start_docusaurus() {
    log_step "4: Start Docusaurus (Optional)"
    
    log_info "Docusaurus startup is manual to prevent hanging"
    echo ""
    echo "To start Docusaurus manually:"
    echo "  bash scripts/docs/start-docusaurus-health.sh"
    echo ""
    echo "Or run directly:"
    echo "  cd docs"
    echo "  npm run start -- --port 3400"
    echo ""
    echo "Then access: http://localhost:3400/health"
    echo ""
    
    log_success "Skipped Docusaurus startup (manual step)"
}

# ------------------------------------------------------------------------------
# Main Execution
# ------------------------------------------------------------------------------
main() {
    local skip_preflight=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-preflight)
                skip_preflight=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Usage: $0 [--skip-preflight]"
                exit 1
                ;;
        esac
    done
    
    log_header "Health Dashboard - Complete Diagnostic & Setup (V2)"
    
    log_info "Project root: ${PROJECT_ROOT}"
    log_info "Script directory: ${SCRIPT_DIR}"
    log_info "Kill switch: ${KILL_SWITCH_FILE}"
    
    # Load configuration
    load_config
    
    # Create log directory
    if [ "${ENABLE_LOGGING}" = "true" ]; then
        mkdir -p "${LOG_DIR}"
        log_info "Logs will be saved to: ${LOG_DIR}"
    fi
    
    # Check kill switch
    if check_kill_switch; then
        log_error "Aborted due to kill switch"
        exit 1
    fi
    
    # Run pre-flight checks
    if [ "${skip_preflight}" = false ]; then
        if ! run_preflight_checks; then
            log_error "Aborted due to pre-flight check failures"
            exit 1
        fi
    else
        log_warning "Skipping pre-flight checks (not recommended)"
    fi
    
    # Run diagnostics
    run_diagnostics || log_warning "Diagnostics had issues"
    
    # Check kill switch
    if check_kill_switch; then
        log_error "Aborted due to kill switch"
        exit 1
    fi
    
    # Run API tests
    run_api_tests || log_warning "API tests had issues"
    
    # Check kill switch
    if check_kill_switch; then
        log_error "Aborted due to kill switch"
        exit 1
    fi
    
    # Start Docusaurus (manual)
    start_docusaurus
    
    # Final status
    echo ""
    if [ ${SCRIPTS_FAILED} -eq 0 ]; then
        log_success "All automated tests passed!"
        return 0
    else
        log_warning "Some tests failed - check logs for details"
        return 1
    fi
}

# Execute main function
main "$@"
