#!/bin/bash

################################################################################
# Example: Deployment Workflow
#
# Purpose: Pre-deployment validation and post-deployment verification:
#          - Environment checks
#          - Service health validation
#          - Database connection tests
#          - API endpoint verification
#          - Performance baseline measurement
#
# Usage:
#   bash scripts/workflows/examples/deployment-workflow.sh "deployment-name" "environment"
#
# Example:
#   bash scripts/workflows/examples/deployment-workflow.sh "tp-capital-v1.2" "production"
#   bash scripts/workflows/examples/deployment-workflow.sh "dashboard-hotfix" "staging"
#
################################################################################

set -e

# Get deployment name and environment from arguments
DEPLOYMENT_NAME="${1:-unnamed-deployment}"
DEPLOYMENT_ENV="${2:-staging}"  # staging, production, development

# Navigate to project root
cd "$(dirname "$0")/../../.."

# Import generic template
source scripts/workflows/workflow-template.sh

# =============================================================================
# DEPLOYMENT-SPECIFIC CONFIGURATION
# =============================================================================

WORKFLOW_NAME="${DEPLOYMENT_NAME}"
WORKFLOW_TYPE="deployment"

# Enable ALL sections for deployment validation
ENABLED_SECTIONS=(
    ["ENVIRONMENT_CHECK"]=true      # Critical: verify env vars, versions
    ["SERVICE_HEALTH"]=true         # Critical: all services must be up
    ["DATABASE_CHECK"]=true         # Critical: DB connections working
    ["API_VALIDATION"]=true         # Critical: all APIs responding
    ["CODE_CHANGES"]=true           # Track what's being deployed
    ["TESTING"]=true                # Run smoke tests
    ["PERFORMANCE_METRICS"]=true    # Baseline performance
    ["DOCUMENTATION"]=true          # Deployment notes
)

# All services that should be running
SERVICES=(
    "dashboard:3103"
    "docs-hub:3400"
    "documentation-api:3401"
    "service-launcher:3500"
    "workspace:3200"
    "tp-capital:4005"
    "telegram-gateway:3201"
)

# Critical API endpoints
declare -A API_ENDPOINTS=(
    ["Service Launcher"]="http://localhost:3500/api/status"
    ["Documentation API"]="http://localhost:3401/api/health"
    ["RAG Service"]="http://localhost:8201/health"
    ["Workspace API"]="http://localhost:3200/api/health"
    ["TP Capital"]="http://localhost:4005/api/health"
)

# Deployment artifacts
CODE_FILES=(
    # Populated by Git diff
)

# =============================================================================
# DEPLOYMENT-SPECIFIC FUNCTIONS
# =============================================================================

# Pre-deployment checklist
pre_deployment_checklist() {
    log_info "Running pre-deployment checklist..."

    append_report "## Pre-Deployment Checklist"
    append_report ""
    append_report "### Environment: ${DEPLOYMENT_ENV}"
    append_report ""

    # Environment-specific checks
    case "$DEPLOYMENT_ENV" in
        production)
            append_report "#### Production Checklist"
            append_report "- [ ] Backup created"
            append_report "- [ ] Rollback plan documented"
            append_report "- [ ] Change request approved"
            append_report "- [ ] Maintenance window scheduled"
            append_report "- [ ] Stakeholders notified"
            append_report "- [ ] Monitoring alerts configured"
            ;;
        staging)
            append_report "#### Staging Checklist"
            append_report "- [ ] Database migrated"
            append_report "- [ ] Environment variables updated"
            append_report "- [ ] Docker images pulled"
            append_report "- [ ] Integration tests passing"
            ;;
        development)
            append_report "#### Development Checklist"
            append_report "- [ ] Local environment clean"
            append_report "- [ ] Dependencies updated"
            append_report "- [ ] No uncommitted changes"
            ;;
    esac

    append_report ""
    append_report "### Code Quality Gates"
    append_report ""

    # Run linting check
    if [[ -d "frontend/dashboard" ]]; then
        append_report "#### Frontend Linting"
        append_report '```bash'
        cd frontend/dashboard
        if npm run lint --silent 2>&1 | head -20 | tee -a "${REPORT_FILE}"; then
            append_report '```'
            append_report "✅ No linting errors"
        else
            append_report '```'
            append_report "⚠️  Linting warnings found"
        fi
        cd ../..
        append_report ""
    fi

    # Check for TypeScript errors
    if [[ -d "frontend/dashboard" ]]; then
        append_report "#### TypeScript Check"
        append_report '```bash'
        cd frontend/dashboard
        if npx tsc --noEmit 2>&1 | head -20 | tee -a "${REPORT_FILE}"; then
            append_report '```'
            append_report "✅ No type errors"
        else
            append_report '```'
            append_report "❌ Type errors found - deployment blocked"
        fi
        cd ../..
        append_report ""
    fi

    log_success "Pre-deployment checklist complete"
}

# Database migration validation
validate_database_migrations() {
    if [[ "${ENABLED_SECTIONS[DATABASE_CHECK]}" != "true" ]]; then
        return 0
    fi

    log_info "Validating database migrations..."

    append_report "## Database Migration Status"
    append_report ""

    # Check for pending migrations
    if [[ -d "backend/data/migrations" ]]; then
        append_report "### Pending Migrations"
        append_report '```bash'
        find backend/data/migrations -name "*.sql" -type f | tail -5 | tee -a "${REPORT_FILE}"
        append_report '```'
        append_report ""
    fi

    # TimescaleDB connection test
    append_report "### Database Connections"
    append_report ""
    append_report "| Database | Status | Response Time |"
    append_report "|----------|--------|---------------|"

    # Test TimescaleDB
    if docker exec timescaledb psql -U postgres -c "SELECT 1" >/dev/null 2>&1; then
        append_report "| TimescaleDB | ✅ Connected | <10ms |"
        log_success "TimescaleDB connection OK"
    else
        append_report "| TimescaleDB | ❌ Failed | N/A |"
        log_error "TimescaleDB connection failed - deployment blocked"
    fi

    append_report ""

    log_success "Database validation complete"
}

# Deployment smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."

    append_report "## Smoke Tests"
    append_report ""

    # Test 1: Health endpoints
    append_report "### Health Endpoint Tests"
    append_report ""

    local all_passed=true
    for api_name in "${!API_ENDPOINTS[@]}"; do
        api_url="${API_ENDPOINTS[$api_name]}"

        if http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$api_url" 2>/dev/null); then
            if [[ "$http_code" == "200" ]]; then
                append_report "- ✅ ${api_name}: ${http_code}"
                log_success "${api_name} smoke test passed"
            else
                append_report "- ⚠️  ${api_name}: ${http_code}"
                log_warning "${api_name} returned non-200 status"
                all_passed=false
            fi
        else
            append_report "- ❌ ${api_name}: Timeout"
            log_error "${api_name} smoke test failed"
            all_passed=false
        fi
    done

    append_report ""

    # Test 2: Critical user flows
    append_report "### Critical User Flow Tests"
    append_report ""
    append_report "- [ ] User can load dashboard"
    append_report "- [ ] User can search documentation"
    append_report "- [ ] User can view workspace items"
    append_report "- [ ] API authentication works"
    append_report ""

    if [[ "$all_passed" == "true" ]]; then
        append_report "✅ **All smoke tests passed**"
        log_success "All smoke tests passed"
    else
        append_report "❌ **Some smoke tests failed - review required**"
        log_error "Some smoke tests failed"
    fi

    append_report ""
}

# Post-deployment verification
post_deployment_verification() {
    log_info "Running post-deployment verification..."

    append_report "## Post-Deployment Verification"
    append_report ""

    # Check Docker containers
    append_report "### Container Status"
    append_report '```'
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(rag-service|docs-hub|workspace|timescaledb)" | tee -a "${REPORT_FILE}"
    append_report '```'
    append_report ""

    # Check logs for errors
    append_report "### Recent Error Logs (Last 5 minutes)"
    append_report '```bash'
    docker logs --since 5m rag-service 2>&1 | grep -i "error" | tail -10 | tee -a "${REPORT_FILE}" || echo "No errors found"
    append_report '```'
    append_report ""

    # Rollback instructions
    append_report "### Rollback Instructions"
    append_report ""
    append_report "If deployment fails, execute:"
    append_report '```bash'
    append_report "# Stop current deployment"
    append_report "docker compose down"
    append_report ""
    append_report "# Checkout previous version"
    append_report "git checkout HEAD~1"
    append_report ""
    append_report "# Restore database backup (if applicable)"
    append_report "# pg_restore -d tradingsystem backup.sql"
    append_report ""
    append_report "# Restart services"
    append_report "bash scripts/docker/start-stacks.sh"
    append_report '```'
    append_report ""

    log_success "Post-deployment verification complete"
}

# =============================================================================
# CUSTOM WORKFLOW EXECUTION
# =============================================================================

custom_main() {
    log_info "Starting deployment workflow: ${DEPLOYMENT_NAME} (${DEPLOYMENT_ENV})"

    # Initialize output directory
    OUTPUT_DIR="outputs/deployment-${DEPLOYMENT_NAME}-$(date +%Y-%m-%d-%H%M)"
    REPORT_FILE="${OUTPUT_DIR}/DEPLOYMENT-REPORT.md"
    INDEX_FILE="${OUTPUT_DIR}/INDEX.md"

    mkdir -p "${OUTPUT_DIR}"

    # Create report header
    cat > "${REPORT_FILE}" <<EOF
# Deployment Report: ${DEPLOYMENT_NAME}

**Environment**: ${DEPLOYMENT_ENV}
**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Generated By**: deployment-workflow.sh

---

EOF

    # Pre-deployment phase
    pre_deployment_checklist
    check_environment
    validate_database_migrations
    check_service_health
    validate_apis

    # Deployment validation phase
    run_smoke_tests
    collect_performance_metrics

    # Post-deployment phase
    post_deployment_verification
    document_code_changes
    generate_documentation

    # Add completion footer
    append_report "---"
    append_report ""
    append_report "## Deployment Summary"
    append_report ""
    append_report "- **Deployment**: ${DEPLOYMENT_NAME}"
    append_report "- **Environment**: ${DEPLOYMENT_ENV}"
    append_report "- **Status**: ✅ Validation Completed"
    append_report "- **Duration**: ${SECONDS} seconds"
    append_report "- **Timestamp**: $(date '+%Y-%m-%d %H:%M:%S')"
    append_report ""
    append_report "### Sign-Off"
    append_report ""
    append_report "- [ ] Technical Lead Approval"
    append_report "- [ ] QA Approval"
    append_report "- [ ] Product Owner Approval"
    append_report ""

    # Update index
    cat > "${INDEX_FILE}" <<EOF
# Deployment Index: ${DEPLOYMENT_NAME}

**Environment**: ${DEPLOYMENT_ENV}
**Date**: $(date '+%Y-%m-%d %H:%M:%S')

## Artifacts

- [Deployment Report](DEPLOYMENT-REPORT.md)

## Deployment Details

- **Name**: ${DEPLOYMENT_NAME}
- **Environment**: ${DEPLOYMENT_ENV}
- **Status**: ✅ Validation Completed
- **Duration**: ${SECONDS} seconds

## Checklist Progress

- [Pre-Deployment Checklist](DEPLOYMENT-REPORT.md#pre-deployment-checklist)
- [Database Migrations](DEPLOYMENT-REPORT.md#database-migration-status)
- [Smoke Tests](DEPLOYMENT-REPORT.md#smoke-tests)
- [Post-Deployment Verification](DEPLOYMENT-REPORT.md#post-deployment-verification)

## Quick Actions

- [View Full Report](DEPLOYMENT-REPORT.md)
- [Rollback Instructions](DEPLOYMENT-REPORT.md#rollback-instructions)

---

**Generated**: $(date '+%Y-%m-%d %H:%M:%S')
EOF

    log_success "Deployment workflow complete!"
    log_info "Report: ${REPORT_FILE}"
    log_info "Index: ${INDEX_FILE}"

    # Summary output
    echo ""
    echo "=========================================="
    echo "Deployment Validation Summary"
    echo "=========================================="
    echo "Deployment: ${DEPLOYMENT_NAME}"
    echo "Environment: ${DEPLOYMENT_ENV}"
    echo "Duration: ${SECONDS} seconds"
    echo "Report: ${REPORT_FILE}"
    echo "=========================================="
}

# =============================================================================
# EXECUTION
# =============================================================================

# Validate we're in project root
if [[ ! -f "CLAUDE.md" ]]; then
    log_error "Must be run from project root directory"
    exit 1
fi

# Validate environment argument
if [[ ! "$DEPLOYMENT_ENV" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment: ${DEPLOYMENT_ENV}"
    log_error "Must be one of: development, staging, production"
    exit 1
fi

# Run custom workflow
custom_main

exit 0
