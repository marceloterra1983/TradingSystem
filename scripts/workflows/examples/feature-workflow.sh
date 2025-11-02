#!/bin/bash

################################################################################
# Example: Feature Implementation Workflow
#
# Purpose: Document a complete feature implementation including:
#          - Requirements validation
#          - Code implementation tracking
#          - Testing coverage
#          - Documentation generation
#
# Usage:
#   bash scripts/workflows/examples/feature-workflow.sh "feature-name"
#
# Example:
#   bash scripts/workflows/examples/feature-workflow.sh "telegram-bot-integration"
#
################################################################################

set -e

# Get feature name from argument
FEATURE_NAME="${1:-unnamed-feature}"

# Navigate to project root
cd "$(dirname "$0")/../../.."

# Import generic template
source scripts/workflows/workflow-template.sh

# =============================================================================
# FEATURE-SPECIFIC CONFIGURATION
# =============================================================================

WORKFLOW_NAME="${FEATURE_NAME}"
WORKFLOW_TYPE="feature"

# Enable sections relevant to feature workflows
ENABLED_SECTIONS=(
    ["ENVIRONMENT_CHECK"]=true      # Always check environment
    ["SERVICE_HEALTH"]=true         # New features may add services
    ["DATABASE_CHECK"]=true         # Features may need DB changes
    ["API_VALIDATION"]=true         # Validate new API endpoints
    ["CODE_CHANGES"]=true           # Track all implementation files
    ["TESTING"]=true                # Verify feature works
    ["PERFORMANCE_METRICS"]=true    # Measure feature impact
    ["DOCUMENTATION"]=true          # Document new feature
)

# Services (include new ones if added)
SERVICES=(
    "dashboard:3103"
    "docs-hub:3400"
    "documentation-api:3401"
    "service-launcher:3500"
    # Add new service ports here
)

# API endpoints (include new ones)
declare -A API_ENDPOINTS=(
    ["Service Launcher"]="http://localhost:3500/api/status"
    ["Documentation API"]="http://localhost:3401/api/health"
    # Add new endpoints here
)

# Implementation files
CODE_FILES=(
    # Add files here as you create them
    # Example:
    # "apps/telegram-bot/src/index.js"
    # "apps/telegram-bot/src/handlers/messageHandler.js"
    # "docs/content/apps/telegram-bot/overview.mdx"
)

# =============================================================================
# FEATURE-SPECIFIC FUNCTIONS
# =============================================================================

# Document feature requirements
document_requirements() {
    log_info "Documenting feature requirements..."

    append_report "## Feature Requirements"
    append_report ""
    append_report "### Functional Requirements"
    append_report ""
    append_report "- [ ] Requirement 1"
    append_report "- [ ] Requirement 2"
    append_report "- [ ] Requirement 3"
    append_report ""
    append_report "### Non-Functional Requirements"
    append_report ""
    append_report "- [ ] Performance: Response time < 500ms"
    append_report "- [ ] Security: Authentication/authorization implemented"
    append_report "- [ ] Reliability: Error handling and logging"
    append_report "- [ ] Maintainability: Code documented and tested"
    append_report ""

    log_success "Requirements documented"
}

# Validate feature implementation
validate_feature_implementation() {
    log_info "Validating feature implementation..."

    append_report "## Implementation Validation"
    append_report ""

    # Check if new routes/endpoints are accessible
    append_report "### API Endpoints Check"
    append_report ""
    append_report "| Endpoint | Method | Status | Response Time |"
    append_report "|----------|--------|--------|---------------|"

    # Add your endpoint checks here
    # Example:
    # start_time=$(date +%s%N)
    # if http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3201/api/telegram/status); then
    #     end_time=$(date +%s%N)
    #     response_time=$(( (end_time - start_time) / 1000000 ))
    #     append_report "| /api/telegram/status | GET | ${http_code} | ${response_time}ms |"
    # fi

    append_report ""

    # Check database migrations if applicable
    if [[ "${ENABLED_SECTIONS[DATABASE_CHECK]}" == "true" ]]; then
        append_report "### Database Migrations"
        append_report ""
        append_report "- [ ] Migrations created"
        append_report "- [ ] Migrations tested"
        append_report "- [ ] Rollback script available"
        append_report ""
    fi

    # Check test coverage
    append_report "### Test Coverage"
    append_report ""
    append_report "- [ ] Unit tests written (target: 80%)"
    append_report "- [ ] Integration tests added"
    append_report "- [ ] E2E tests configured"
    append_report ""

    log_success "Implementation validation complete"
}

# Generate feature documentation
generate_feature_docs() {
    log_info "Generating feature documentation..."

    append_report "## Feature Documentation"
    append_report ""
    append_report "### Documentation Files Created"
    append_report ""

    # Check for documentation files
    local docs_created=false
    for file in "${CODE_FILES[@]}"; do
        if [[ "$file" == *"docs/content/"* ]] && [[ -f "$file" ]]; then
            append_report "- ✅ [$(basename "$file")]($file)"
            docs_created=true
        fi
    done

    if [[ "$docs_created" == "false" ]]; then
        append_report "⚠️  **No documentation files found**"
        append_report ""
        append_report "Documentation should include:"
        append_report "- Overview/README"
        append_report "- API documentation"
        append_report "- Usage examples"
        append_report "- Configuration guide"
    fi

    append_report ""
    append_report "### Documentation Checklist"
    append_report ""
    append_report "- [ ] Feature overview written"
    append_report "- [ ] API endpoints documented"
    append_report "- [ ] Configuration options listed"
    append_report "- [ ] Usage examples provided"
    append_report "- [ ] Troubleshooting guide added"
    append_report "- [ ] Updated main README if needed"
    append_report ""

    log_success "Feature documentation generated"
}

# =============================================================================
# CUSTOM WORKFLOW EXECUTION
# =============================================================================

custom_main() {
    log_info "Starting feature implementation workflow: ${FEATURE_NAME}"

    # Initialize output directory
    init_output_dir

    # Create report header
    cat > "${REPORT_FILE}" <<EOF
# Feature Implementation Report: ${FEATURE_NAME}

**Type**: Feature
**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Generated By**: feature-workflow.sh

---

EOF

    # Document requirements first
    document_requirements

    # Execute standard sections
    check_environment
    check_service_health
    check_databases
    validate_apis
    document_code_changes
    run_tests
    collect_performance_metrics
    generate_documentation

    # Execute feature-specific validations
    validate_feature_implementation
    generate_feature_docs

    # Add completion footer
    append_report "---"
    append_report ""
    append_report "## Summary"
    append_report ""
    append_report "- **Feature**: ${FEATURE_NAME}"
    append_report "- **Status**: ✅ Implementation Completed"
    append_report "- **Duration**: ${SECONDS} seconds"
    append_report "- **Files Created/Modified**: ${#CODE_FILES[@]}"
    append_report ""
    append_report "### Definition of Done Checklist"
    append_report ""
    append_report "- [ ] All functional requirements met"
    append_report "- [ ] All non-functional requirements met"
    append_report "- [ ] Code reviewed and approved"
    append_report "- [ ] Tests passing (unit, integration, E2E)"
    append_report "- [ ] Documentation complete"
    append_report "- [ ] Performance benchmarks met"
    append_report "- [ ] Security review passed"
    append_report "- [ ] Feature deployed to staging"
    append_report ""
    append_report "### Next Steps"
    append_report ""
    append_report "1. Complete Definition of Done checklist"
    append_report "2. Create pull request"
    append_report "3. Request code review"
    append_report "4. Deploy to staging for QA"
    append_report "5. Monitor performance metrics"
    append_report ""

    # Update index
    cat >> "${INDEX_FILE}" <<EOF
- [Feature Implementation Report](WORKFLOW-REPORT.md)

## Feature Summary

- **Name**: ${FEATURE_NAME}
- **Status**: ✅ Implementation Completed
- **Duration**: ${SECONDS} seconds
- **Files**: ${#CODE_FILES[@]} created/modified

## Implementation Details

- [Requirements](#feature-requirements)
- [Validation](#implementation-validation)
- [Documentation](#feature-documentation)
- [Definition of Done](#definition-of-done-checklist)

## Quick Links

- [View Report](WORKFLOW-REPORT.md)
- [Code Changes](#code-changes)
- [Test Results](#test-results)
- [Performance Metrics](#performance-metrics)

EOF

    log_success "Feature implementation workflow complete!"
    log_info "Report: ${REPORT_FILE}"
    log_info "Index: ${INDEX_FILE}"
}

# =============================================================================
# EXECUTION
# =============================================================================

# Validate we're in project root
if [[ ! -f "CLAUDE.md" ]]; then
    log_error "Must be run from project root directory"
    exit 1
fi

# Run custom workflow
custom_main

exit 0
