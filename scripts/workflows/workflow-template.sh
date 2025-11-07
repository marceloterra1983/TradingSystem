#!/bin/bash

################################################################################
# Generic Workflow Execution Script Template
#
# Purpose: Reusable template for documenting any workflow execution in the
#          TradingSystem project (bugfixes, features, testing, deployment, etc.)
#
# Usage:
#   bash workflow-template.sh [workflow-name] [workflow-type]
#
# Examples:
#   bash workflow-template.sh "fix-search-bug" "bugfix"
#   bash workflow-template.sh "add-telegram-bot" "feature"
#   bash workflow-template.sh "deploy-production" "deployment"
#   bash workflow-template.sh "performance-test" "testing"
#
# Configuration:
#   Edit the ENABLED_SECTIONS array to enable/disable workflow steps
#   Customize functions below to match your workflow requirements
#
################################################################################

set -e  # Exit on error

# =============================================================================
# CONFIGURATION
# =============================================================================

WORKFLOW_NAME="${1:-unnamed-workflow}"
WORKFLOW_TYPE="${2:-general}"  # bugfix, feature, deployment, testing, analysis
OUTPUT_DIR="outputs/workflow-${WORKFLOW_NAME}-$(date +%Y-%m-%d)"
REPORT_FILE="${OUTPUT_DIR}/WORKFLOW-REPORT.md"
INDEX_FILE="${OUTPUT_DIR}/INDEX.md"

# Enable/disable workflow sections (true/false)
declare -A ENABLED_SECTIONS=(
    ["ENVIRONMENT_CHECK"]=true
    ["SERVICE_HEALTH"]=true
    ["DATABASE_CHECK"]=true
    ["API_VALIDATION"]=true
    ["CODE_CHANGES"]=true
    ["TESTING"]=true
    ["PERFORMANCE_METRICS"]=true
    ["DOCUMENTATION"]=true
)

# Service health check configuration
SERVICES=(
    "dashboard:3103"
    "docs-hub:3400"
    "documentation-api:3401"
)

# Docker containers to check
CONTAINERS=(
    "rag-service"
    "docs-hub"
    "documentation-api"
    "workspace"
)

# API endpoints to validate
declare -A API_ENDPOINTS=(
    ["Documentation API"]="http://localhost:3401/api/health"
    ["RAG Service"]="http://localhost:8201/health"
)

# Files to include in code changes summary
CODE_FILES=()  # Populate this array based on your workflow

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log_info() {
    echo "[INFO] $1"
}

log_success() {
    echo "[SUCCESS] ✅ $1"
}

log_error() {
    echo "[ERROR] ❌ $1"
}

log_warning() {
    echo "[WARNING] ⚠️  $1"
}

# Initialize output directory
init_output_dir() {
    log_info "Initializing output directory: ${OUTPUT_DIR}"
    mkdir -p "${OUTPUT_DIR}"

    # Create index file
    cat > "${INDEX_FILE}" <<EOF
# Workflow Index: ${WORKFLOW_NAME}

**Type**: ${WORKFLOW_TYPE}
**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Status**: In Progress

## Generated Artifacts

EOF
}

# Append to report
append_report() {
    echo "$1" >> "${REPORT_FILE}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# WORKFLOW SECTIONS
# =============================================================================

# Section 1: Environment Check
check_environment() {
    if [[ "${ENABLED_SECTIONS[ENVIRONMENT_CHECK]}" != "true" ]]; then
        return 0
    fi

    log_info "Checking environment..."

    append_report "## Environment Information"
    append_report ""
    append_report "- **Date**: $(date '+%Y-%m-%d %H:%M:%S')"
    append_report "- **User**: $(whoami)"
    append_report "- **Hostname**: $(hostname)"
    append_report "- **OS**: $(uname -s)"
    append_report "- **Working Directory**: $(pwd)"
    append_report ""

    # Git information
    if command_exists git; then
        append_report "### Git Status"
        append_report '```'
        git branch --show-current >> "${REPORT_FILE}" 2>&1 || echo "Not a git repository" >> "${REPORT_FILE}"
        append_report '```'
        append_report ""
    fi

    # Node.js version
    if command_exists node; then
        append_report "- **Node.js**: $(node --version)"
    fi

    # Docker version
    if command_exists docker; then
        append_report "- **Docker**: $(docker --version)"
    fi

    append_report ""
    log_success "Environment check complete"
}

# Section 2: Service Health Check
check_service_health() {
    if [[ "${ENABLED_SECTIONS[SERVICE_HEALTH]}" != "true" ]]; then
        return 0
    fi

    log_info "Checking service health..."

    append_report "## Service Health Status"
    append_report ""
    append_report "| Service | Port | Status |"
    append_report "|---------|------|--------|"

    for service_entry in "${SERVICES[@]}"; do
        IFS=':' read -r service_name service_port <<< "$service_entry"

        if nc -z localhost "$service_port" 2>/dev/null; then
            append_report "| ${service_name} | ${service_port} | ✅ Running |"
            log_success "${service_name} is running on port ${service_port}"
        else
            append_report "| ${service_name} | ${service_port} | ❌ Not Running |"
            log_error "${service_name} is not running on port ${service_port}"
        fi
    done

    append_report ""
    log_success "Service health check complete"
}

# Section 3: Database Check
check_databases() {
    if [[ "${ENABLED_SECTIONS[DATABASE_CHECK]}" != "true" ]]; then
        return 0
    fi

    log_info "Checking database connections..."

    append_report "## Database Status"
    append_report ""

    # Add your database checks here
    # Example:
    # if docker exec timescaledb psql -U postgres -c "SELECT 1" >/dev/null 2>&1; then
    #     append_report "- ✅ TimescaleDB: Connected"
    # else
    #     append_report "- ❌ TimescaleDB: Not Connected"
    # fi

    append_report ""
    log_success "Database check complete"
}

# Section 4: API Validation
validate_apis() {
    if [[ "${ENABLED_SECTIONS[API_VALIDATION]}" != "true" ]]; then
        return 0
    fi

    log_info "Validating API endpoints..."

    append_report "## API Validation"
    append_report ""
    append_report "| API | Endpoint | Status | Response Time |"
    append_report "|-----|----------|--------|---------------|"

    for api_name in "${!API_ENDPOINTS[@]}"; do
        api_url="${API_ENDPOINTS[$api_name]}"

        start_time=$(date +%s%N)
        if http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$api_url" 2>/dev/null); then
            end_time=$(date +%s%N)
            response_time=$(( (end_time - start_time) / 1000000 ))

            if [[ "$http_code" == "200" ]]; then
                append_report "| ${api_name} | ${api_url} | ✅ ${http_code} | ${response_time}ms |"
                log_success "${api_name} returned ${http_code} in ${response_time}ms"
            else
                append_report "| ${api_name} | ${api_url} | ⚠️  ${http_code} | ${response_time}ms |"
                log_warning "${api_name} returned ${http_code} in ${response_time}ms"
            fi
        else
            append_report "| ${api_name} | ${api_url} | ❌ Timeout | N/A |"
            log_error "${api_name} request timed out"
        fi
    done

    append_report ""
    log_success "API validation complete"
}

# Section 5: Code Changes Summary
document_code_changes() {
    if [[ "${ENABLED_SECTIONS[CODE_CHANGES]}" != "true" ]]; then
        return 0
    fi

    log_info "Documenting code changes..."

    append_report "## Code Changes"
    append_report ""

    if [[ ${#CODE_FILES[@]} -eq 0 ]]; then
        append_report "_No code files specified for this workflow._"
        append_report ""
        return 0
    fi

    for file in "${CODE_FILES[@]}"; do
        if [[ -f "$file" ]]; then
            append_report "### ${file}"
            append_report ""
            append_report '```bash'
            append_report "wc -l ${file}"
            wc -l "$file" >> "${REPORT_FILE}"
            append_report '```'
            append_report ""
        else
            log_warning "File not found: ${file}"
        fi
    done

    log_success "Code changes documented"
}

# Section 6: Testing
run_tests() {
    if [[ "${ENABLED_SECTIONS[TESTING]}" != "true" ]]; then
        return 0
    fi

    log_info "Running tests..."

    append_report "## Test Results"
    append_report ""

    # Add your test commands here
    # Example:
    # if npm run test --silent > /tmp/test-output.log 2>&1; then
    #     append_report "✅ **Tests Passed**"
    #     append_report '```'
    #     cat /tmp/test-output.log >> "${REPORT_FILE}"
    #     append_report '```'
    # else
    #     append_report "❌ **Tests Failed**"
    # fi

    append_report "_No tests configured for this workflow._"
    append_report ""

    log_success "Testing complete"
}

# Section 7: Performance Metrics
collect_performance_metrics() {
    if [[ "${ENABLED_SECTIONS[PERFORMANCE_METRICS]}" != "true" ]]; then
        return 0
    fi

    log_info "Collecting performance metrics..."

    append_report "## Performance Metrics"
    append_report ""

    # Docker stats
    if command_exists docker; then
        append_report "### Container Resource Usage"
        append_report ""
        append_report '```'
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" >> "${REPORT_FILE}" 2>/dev/null || echo "No containers running" >> "${REPORT_FILE}"
        append_report '```'
        append_report ""
    fi

    # Disk usage
    append_report "### Disk Usage"
    append_report '```'
    df -h / >> "${REPORT_FILE}" 2>&1
    append_report '```'
    append_report ""

    log_success "Performance metrics collected"
}

# Section 8: Documentation
generate_documentation() {
    if [[ "${ENABLED_SECTIONS[DOCUMENTATION]}" != "true" ]]; then
        return 0
    fi

    log_info "Generating documentation..."

    append_report "## Documentation"
    append_report ""
    append_report "### Files Modified"
    append_report ""

    if command_exists git; then
        append_report '```'
        git diff --name-only >> "${REPORT_FILE}" 2>&1 || echo "No changes detected" >> "${REPORT_FILE}"
        append_report '```'
        append_report ""
    fi

    append_report "### Related Documentation"
    append_report ""
    append_report "- [Project README](../../README.md)"
    append_report "- [CLAUDE.md](../../CLAUDE.md)"
    append_report "- [Documentation Hub](http://localhost:3400)"
    append_report ""

    log_success "Documentation generated"
}

# =============================================================================
# MAIN WORKFLOW EXECUTION
# =============================================================================

main() {
    log_info "Starting workflow: ${WORKFLOW_NAME} (${WORKFLOW_TYPE})"

    # Initialize
    init_output_dir

    # Create report header
    cat > "${REPORT_FILE}" <<EOF
# Workflow Report: ${WORKFLOW_NAME}

**Type**: ${WORKFLOW_TYPE}
**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Generated By**: workflow-template.sh

---

EOF

    # Execute workflow sections
    check_environment
    check_service_health
    check_databases
    validate_apis
    document_code_changes
    run_tests
    collect_performance_metrics
    generate_documentation

    # Add completion footer
    append_report "---"
    append_report ""
    append_report "**Workflow Completed**: $(date '+%Y-%m-%d %H:%M:%S')"
    append_report "**Total Duration**: $SECONDS seconds"

    # Update index
    cat >> "${INDEX_FILE}" <<EOF
- [Workflow Report](WORKFLOW-REPORT.md)

## Summary

- **Status**: ✅ Completed
- **Duration**: ${SECONDS} seconds
- **Report Location**: ${REPORT_FILE}

## Quick Links

- [View Report](WORKFLOW-REPORT.md)
- [Project Root](../../)
- [Documentation](../../docs/README.md)

EOF

    log_success "Workflow complete!"
    log_info "Report saved to: ${REPORT_FILE}"
    log_info "Index saved to: ${INDEX_FILE}"
}

# =============================================================================
# EXECUTION
# =============================================================================

# Ensure we're in project root
if [[ ! -f "CLAUDE.md" ]]; then
    log_error "Must be run from project root directory"
    exit 1
fi

# Check dependencies
if ! command_exists curl; then
    log_error "curl is required but not installed"
    exit 1
fi

# Run main workflow
main

exit 0
