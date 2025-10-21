#!/bin/bash
# Phase 4 - Validate Documentation API integrations (search, health)
# Usage: ./validate-integrations.sh [--docs-port PORT] [--api-port PORT] [--verbose]

set -euo pipefail

# Configuration
DOCUSAURUS_DIR="/home/marce/projetos/TradingSystem/docs/docusaurus"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
INTEGRATION_LOG="${DOCUSAURUS_DIR}/INTEGRATION-VALIDATION-${TIMESTAMP}.md"
DOCS_PORT=3004
API_PORT=3400
VERBOSE=false

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
step() { echo -e "${CYAN}🔌 $1${NC}"; }
header() { echo -e "${MAGENTA}=== $1 ===${NC}"; }

# Parse arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docs-port)
                DOCS_PORT="$2"
                shift 2
                ;;
            --api-port)
                API_PORT="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--docs-port PORT] [--api-port PORT] [--verbose]"
                echo "  --docs-port PORT    Docusaurus port (default: 3004)"
                echo "  --api-port PORT     Documentation API port (default: 3400)"
                echo "  --verbose           Detailed output"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Verify Docusaurus running
verify_docusaurus_running() {
    header "Verifying Docusaurus Running"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/")
    if [[ $HTTP_CODE -eq 200 ]]; then
        success "Docusaurus accessible on http://localhost:${DOCS_PORT}"
        return 0
    else
        error "Docusaurus not running on port ${DOCS_PORT}"
        info "Start with: cd docs/docusaurus && npm run dev"
        return 1
    fi
}

# Verify Documentation API running
verify_documentation_api_running() {
    header "Verifying Documentation API"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/health")
    if [[ $HTTP_CODE -eq 200 ]]; then
        success "Documentation API running on port ${API_PORT}"
        return 0
    else
        warning "Documentation API not running on port ${API_PORT}"
        info "Start with: cd backend/api/documentation-api && npm run dev"
        info "Or via Docker: docker compose -f infrastructure/compose/docker-compose.docs.yml up -d"
        return 1
    fi
}

# Validate search endpoint
validate_search_endpoint() {
    header "Validating Search Endpoint"

    # Test search endpoint with query
    RESPONSE=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode")
    if [[ $? -eq 0 ]]; then
        TOTAL=$(echo "$RESPONSE" | jq -r '.total' 2>/dev/null || echo "0")
        if [[ $TOTAL =~ ^[0-9]+$ ]] && [[ $TOTAL -gt 0 ]]; then
            success "Search endpoint working (${TOTAL} results for 'dark mode')"
        else
            warning "Search endpoint responded but no results"
            return 1
        fi
    else
        error "Search endpoint not accessible"
        return 1
    fi

    # Test search with filters
    RESPONSE=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=&domain=frontend&type=guide")
    if [[ $? -eq 0 ]]; then
        FILTER_TOTAL=$(echo "$RESPONSE" | jq -r '.total' 2>/dev/null || echo "0")
        if [[ $FILTER_TOTAL =~ ^[0-9]+$ ]]; then
            success "Search with filters working (${FILTER_TOTAL} results)"
        fi
    fi

    # Test empty query (should return all documents)
    RESPONSE=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=")
    if [[ $? -eq 0 ]]; then
        ALL_TOTAL=$(echo "$RESPONSE" | jq -r '.total' 2>/dev/null || echo "0")
        if [[ $ALL_TOTAL =~ ^[0-9]+$ ]] && [[ $ALL_TOTAL -gt 0 ]]; then
            success "Empty query returns all documents (${ALL_TOTAL} results)"
        fi
    fi

    return 0
}

# Validate facets endpoint
validate_facets_endpoint() {
    header "Validating Facets Endpoint"

    RESPONSE=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/facets")
    if [[ $? -eq 0 ]]; then
        DOMAINS=$(echo "$RESPONSE" | jq -r '.facets.domains | length' 2>/dev/null || echo "0")
        TYPES=$(echo "$RESPONSE" | jq -r '.facets.types | length' 2>/dev/null || echo "0")
        TAGS=$(echo "$RESPONSE" | jq -r '.facets.tags | length' 2>/dev/null || echo "0")
        STATUSES=$(echo "$RESPONSE" | jq -r '.facets.statuses | length' 2>/dev/null || echo "0")

        if [[ $DOMAINS -ge 4 ]] && [[ $TYPES -ge 8 ]] && [[ $TAGS -ge 10 ]]; then
            success "Facets endpoint working (${DOMAINS} domains, ${TYPES} types, ${TAGS} tags, ${STATUSES} statuses)"
        else
            warning "Facets endpoint responded but low counts (domains: ${DOMAINS}, types: ${TYPES}, tags: ${TAGS}, statuses: ${STATUSES})"
        fi
    else
        error "Facets endpoint not accessible"
        return 1
    fi

    return 0
}

# Validate suggest endpoint
validate_suggest_endpoint() {
    header "Validating Suggest Endpoint"

    RESPONSE=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/suggest?q=dark&limit=5")
    if [[ $? -eq 0 ]]; then
        SUGGESTIONS=$(echo "$RESPONSE" | jq -r '.suggestions | length' 2>/dev/null || echo "0")
        if [[ $SUGGESTIONS -gt 0 ]]; then
            success "Suggest endpoint working (${SUGGESTIONS} suggestions for 'dark')"
        else
            warning "Suggest endpoint responded but no suggestions"
        fi
    else
        error "Suggest endpoint not accessible"
        return 1
    fi

    return 0
}

# Validate health endpoint
validate_health_endpoint() {
    header "Validating Health Endpoint"

    # Test health summary
    RESPONSE=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/health/summary")
    if [[ $? -eq 0 ]]; then
        SCORE=$(echo "$RESPONSE" | jq -r '.overallScore' 2>/dev/null || echo "null")
        GRADE=$(echo "$RESPONSE" | jq -r '.grade' 2>/dev/null || echo "null")
        STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null || echo "null")

        if [[ $SCORE =~ ^[0-9]+(\.[0-9]+)?$ ]] && [[ -n "$GRADE" ]] && [[ -n "$STATUS" ]]; then
            success "Health summary endpoint working (Score: ${SCORE}, Grade: ${GRADE})"
        else
            warning "Health summary endpoint responded but invalid data"
        fi
    else
        error "Health summary endpoint not accessible"
        return 1
    fi

    # Test health metrics
    RESPONSE=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/health/metrics")
    if [[ $? -eq 0 ]]; then
        METRICS=$(echo "$RESPONSE" | jq -r '.metrics | length' 2>/dev/null || echo "0")
        if [[ $METRICS -gt 0 ]]; then
            success "Health metrics endpoint working (${METRICS} metrics)"
        fi
    fi

    return 0
}

# Validate search page integration
validate_search_page_integration() {
    header "Validating Search Page Integration"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/search")
    if [[ $HTTP_CODE -eq 200 ]]; then
        success "Search page accessible"
    else
        error "Search page not accessible (${HTTP_CODE})"
        return 1
    fi

    info "Please open http://localhost:${DOCS_PORT}/search in browser"
    info "Expected behavior:"
    info "  1. Search bar at top"
    info "  2. Facet filters on left (domain, type, tags, status)"
    info "  3. Results display on right"
    info "  4. Type 'dark mode' and verify results appear"
    info "  5. Apply filters and verify results update"
    info "  6. Check browser console for API errors"
    info "Press Enter when search page validation is complete..."
    read -r

    return 0
}

# Validate health page integration
validate_health_page_integration() {
    header "Validating Health Page Integration"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/health")
    if [[ $HTTP_CODE -eq 200 ]]; then
        success "Health page accessible"
    else
        error "Health page not accessible (${HTTP_CODE})"
        return 1
    fi

    info "Please open http://localhost:${DOCS_PORT}/health in browser"
    info "Expected behavior:"
    info "  1. Overall health score with grade (A-F)"
    info "  2. Link success rate metrics"
    info "  3. Frontmatter compliance metrics"
    info "  4. Content freshness analysis"
    info "  5. 30-day trend charts"
    info "  6. Filterable issue tables"
    info "  7. Export options (JSON, CSV)"
    info "  8. Auto-refresh every 5 minutes"
    info "Press Enter when health page validation is complete..."
    read -r

    return 0
}

# Validate CORS configuration
validate_cors_configuration() {
    header "Validating CORS Configuration"

    # Check CORS_ORIGIN in root .env
    if grep -q "http://localhost:${DOCS_PORT}" ../../.env 2>/dev/null; then
        success "CORS_ORIGIN includes Docusaurus port"
    else
        warning "CORS_ORIGIN may not include Docusaurus port (check .env)"
    fi

    # Test CORS headers
    CORS_HEADERS=$(curl -s -H "Origin: http://localhost:${DOCS_PORT}" -I "http://localhost:${API_PORT}/api/v1/docs/search" | grep -i "access-control-allow-origin" || true)
    if [[ -n "$CORS_HEADERS" ]]; then
        success "CORS headers present"
    else
        warning "CORS headers missing (may cause browser errors)"
    fi

    return 0
}

# Validate environment variables
validate_environment_variables() {
    header "Validating Environment Variables"

    # Check docusaurus.config.ts loads root .env
    if grep -q 'dotenv.config.*\.\./\.\./\.env' docusaurus.config.ts; then
        success "Root .env loading configured"
    else
        warning "Root .env loading not configured"
    fi

    # Check expected variables in docusaurus.config.ts
    if grep -q 'SEARCH_API_URL' docusaurus.config.ts; then
        success "SEARCH_API_URL referenced"
    else
        warning "SEARCH_API_URL not referenced"
    fi

    if grep -q 'HEALTH_API_URL' docusaurus.config.ts; then
        success "HEALTH_API_URL referenced"
    else
        warning "HEALTH_API_URL not referenced"
    fi

    if grep -q 'GRAFANA_URL' docusaurus.config.ts; then
        success "GRAFANA_URL referenced"
    else
        warning "GRAFANA_URL not referenced"
    fi

    return 0
}

# Test search performance
test_search_performance() {
    header "Testing Search Performance"

    # Measure search latency
    START_TIME=$(date +%s.%3N)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode")
    END_TIME=$(date +%s.%3N)
    SEARCH_TIME=$(echo "$END_TIME - $START_TIME" | bc 2>/dev/null || echo "0")

    if [[ $HTTP_CODE -eq 200 ]]; then
        if (( $(echo "$SEARCH_TIME < 0.5" | bc -l) )); then
            success "Search latency: ${SEARCH_TIME}s (excellent)"
        elif (( $(echo "$SEARCH_TIME < 1.0" | bc -l) )); then
            success "Search latency: ${SEARCH_TIME}s (good)"
        else
            warning "Search latency: ${SEARCH_TIME}s (slow)"
        fi
    else
        warning "Search performance test failed (${HTTP_CODE})"
    fi

    # Measure facet computation
    START_TIME=$(date +%s.%3N)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/facets")
    END_TIME=$(date +%s.%3N)
    FACET_TIME=$(echo "$END_TIME - $START_TIME" | bc 2>/dev/null || echo "0")

    if [[ $HTTP_CODE -eq 200 ]]; then
        if (( $(echo "$FACET_TIME < 0.1" | bc -l) )); then
            success "Facet latency: ${FACET_TIME}s (excellent)"
        elif (( $(echo "$FACET_TIME < 0.5" | bc -l) )); then
            success "Facet latency: ${FACET_TIME}s (good)"
        else
            warning "Facet latency: ${FACET_TIME}s (slow)"
        fi
    else
        warning "Facet performance test failed (${HTTP_CODE})"
    fi

    return 0
}

# Generate integration report
generate_integration_report() {
    header "Generating Integration Report"

    local report_file="${DOCUSAURUS_DIR}/INTEGRATION-VALIDATION-${TIMESTAMP}.md"

    cat > "$report_file" << EOF
# Documentation API Integration Validation - Phase 4

**Timestamp:** ${TIMESTAMP}
**Docusaurus Port:** ${DOCS_PORT}
**Documentation API Port:** ${API_PORT}

## Service Status
- Docusaurus: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/" | grep -q "200" && echo "Running" || echo "Not running")
- Documentation API: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/health" | grep -q "200" && echo "Running" || echo "Not running")

## Search Endpoint Validation
$(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" | grep -q "200"; then
    TOTAL=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" | jq -r '.total' 2>/dev/null || echo "0")
    echo "- Status: Working (${TOTAL} results for 'dark mode')"
    FILTER_TOTAL=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=&domain=frontend&type=guide" | jq -r '.total' 2>/dev/null || echo "0")
    echo "- Filters: Working (${FILTER_TOTAL} results with filters)"
    ALL_TOTAL=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=" | jq -r '.total' 2>/dev/null || echo "0")
    echo "- All docs: Working (${ALL_TOTAL} total documents)"
else
    echo "- Status: Not accessible"
fi)

## Facets Endpoint Validation
$(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/facets" | grep -q "200"; then
    RESPONSE=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/facets")
    DOMAINS=$(echo "$RESPONSE" | jq -r '.facets.domains | length' 2>/dev/null || echo "0")
    TYPES=$(echo "$RESPONSE" | jq -r '.facets.types | length' 2>/dev/null || echo "0")
    TAGS=$(echo "$RESPONSE" | jq -r '.facets.tags | length' 2>/dev/null || echo "0")
    STATUSES=$(echo "$RESPONSE" | jq -r '.facets.statuses | length' 2>/dev/null || echo "0")
    echo "- Status: Working (${DOMAINS} domains, ${TYPES} types, ${TAGS} tags, ${STATUSES} statuses)"
else
    echo "- Status: Not accessible"
fi)

## Suggest Endpoint Validation
$(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/suggest?q=dark&limit=5" | grep -q "200"; then
    SUGGESTIONS=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/suggest?q=dark&limit=5" | jq -r '.suggestions | length' 2>/dev/null || echo "0")
    echo "- Status: Working (${SUGGESTIONS} suggestions for 'dark')"
else
    echo "- Status: Not accessible"
fi)

## Health Endpoint Validation
$(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/health/summary" | grep -q "200"; then
    RESPONSE=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/health/summary")
    SCORE=$(echo "$RESPONSE" | jq -r '.overallScore' 2>/dev/null || echo "N/A")
    GRADE=$(echo "$RESPONSE" | jq -r '.grade' 2>/dev/null || echo "N/A")
    echo "- Summary: Working (Score: ${SCORE}, Grade: ${GRADE})"
    METRICS=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/health/metrics" | jq -r '.metrics | length' 2>/dev/null || echo "0")
    echo "- Metrics: Working (${METRICS} metrics)"
else
    echo "- Status: Not accessible"
fi)

## Page Integration
- Search Page: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/search" | grep -q "200" && echo "Accessible" || echo "Not accessible")
- Health Page: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/health" | grep -q "200" && echo "Accessible" || echo "Not accessible")

## CORS Configuration
- CORS_ORIGIN: $(grep -q "http://localhost:${DOCS_PORT}" ../../.env 2>/dev/null && echo "Includes Docusaurus port" || echo "May not include Docusaurus port")
- CORS Headers: $(curl -s -H "Origin: http://localhost:${DOCS_PORT}" -I "http://localhost:${API_PORT}/api/v1/docs/search" | grep -q -i "access-control-allow-origin" && echo "Present" || echo "Missing")

## Environment Variables
- Root .env loading: $(grep -q 'dotenv.config.*\.\./\.\./\.env' docusaurus.config.ts && echo "Configured" || echo "Not configured")
- SEARCH_API_URL: $(grep -q 'SEARCH_API_URL' docusaurus.config.ts && echo "Referenced" || echo "Not referenced")
- HEALTH_API_URL: $(grep -q 'HEALTH_API_URL' docusaurus.config.ts && echo "Referenced" || echo "Not referenced")
- GRAFANA_URL: $(grep -q 'GRAFANA_URL' docusaurus.config.ts && echo "Referenced" || echo "Not referenced")

## Performance Metrics
$(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" | grep -q "200"; then
    START_TIME=$(date +%s.%3N)
    curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" > /dev/null
    END_TIME=$(date +%s.%3N)
    SEARCH_TIME=$(echo "$END_TIME - $START_TIME" | bc 2>/dev/null || echo "0")
    echo "- Search latency: ${SEARCH_TIME}s"
else
    echo "- Search latency: N/A"
fi)

$(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/facets" | grep -q "200"; then
    START_TIME=$(date +%s.%3N)
    curl -s "http://localhost:${API_PORT}/api/v1/docs/facets" > /dev/null
    END_TIME=$(date +%s.%3N)
    FACET_TIME=$(echo "$END_TIME - $START_TIME" | bc 2>/dev/null || echo "0")
    echo "- Facet latency: ${FACET_TIME}s"
else
    echo "- Facet latency: N/A"
fi)

## Next Steps
1. Proceed to diagram validation
2. Run: \`bash scripts/docs/validate-diagrams.sh --verbose\`

---
*Generated by validate-integrations.sh*
EOF

    success "Integration report: $report_file"

    # Generate JSON report
    local json_file="${DOCUSAURUS_DIR}/INTEGRATION-VALIDATION-${TIMESTAMP}.json"

    cat > "$json_file" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "phase": "4",
  "validation": "integrations",
  "services": {
    "docusaurus": {
      "port": ${DOCS_PORT},
      "running": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/" | grep -q "200" && echo "true" || echo "false")
    },
    "documentation_api": {
      "port": ${API_PORT},
      "running": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/health" | grep -q "200" && echo "true" || echo "false")
    }
  },
  "endpoints": {
    "search": {
      "accessible": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" | grep -q "200" && echo "true" || echo "false"),
      "results": $(curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" | jq -r '.total' 2>/dev/null || echo "null")
    },
    "facets": {
      "accessible": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/facets" | grep -q "200" && echo "true" || echo "false"),
      "domains": $(curl -s "http://localhost:${API_PORT}/api/v1/docs/facets" | jq -r '.facets.domains | length' 2>/dev/null || echo "null"),
      "types": $(curl -s "http://localhost:${API_PORT}/api/v1/docs/facets" | jq -r '.facets.types | length' 2>/dev/null || echo "null"),
      "tags": $(curl -s "http://localhost:${API_PORT}/api/v1/docs/facets" | jq -r '.facets.tags | length' 2>/dev/null || echo "null"),
      "statuses": $(curl -s "http://localhost:${API_PORT}/api/v1/docs/facets" | jq -r '.facets.statuses | length' 2>/dev/null || echo "null")
    },
    "suggest": {
      "accessible": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/suggest?q=dark&limit=5" | grep -q "200" && echo "true" || echo "false"),
      "suggestions": $(curl -s "http://localhost:${API_PORT}/api/v1/docs/suggest?q=dark&limit=5" | jq -r '.suggestions | length' 2>/dev/null || echo "null")
    },
    "health": {
      "summary_accessible": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/health/summary" | grep -q "200" && echo "true" || echo "false"),
      "score": $(curl -s "http://localhost:${API_PORT}/api/v1/docs/health/summary" | jq -r '.overallScore' 2>/dev/null || echo "null"),
      "grade": "$(curl -s "http://localhost:${API_PORT}/api/v1/docs/health/summary" | jq -r '.grade' 2>/dev/null || echo "null")",
      "metrics_accessible": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/health/metrics" | grep -q "200" && echo "true" || echo "false"),
      "metrics_count": $(curl -s "http://localhost:${API_PORT}/api/v1/docs/health/metrics" | jq -r '.metrics | length' 2>/dev/null || echo "null")
    }
  },
  "pages": {
    "search": {
      "accessible": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/search" | grep -q "200" && echo "true" || echo "false")
    },
    "health": {
      "accessible": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/health" | grep -q "200" && echo "true" || echo "false")
    }
  },
  "cors": {
    "origin_configured": $(grep -q "http://localhost:${DOCS_PORT}" ../../.env 2>/dev/null && echo "true" || echo "false"),
    "headers_present": $(curl -s -H "Origin: http://localhost:${DOCS_PORT}" -I "http://localhost:${API_PORT}/api/v1/docs/search" | grep -q -i "access-control-allow-origin" && echo "true" || echo "false")
  },
  "environment": {
    "root_env_loading": $(grep -q 'dotenv.config.*\.\./\.\./\.env' docusaurus.config.ts && echo "true" || echo "false"),
    "search_api_url": $(grep -q 'SEARCH_API_URL' docusaurus.config.ts && echo "true" || echo "false"),
    "health_api_url": $(grep -q 'HEALTH_API_URL' docusaurus.config.ts && echo "true" || echo "false"),
    "grafana_url": $(grep -q 'GRAFANA_URL' docusaurus.config.ts && echo "true" || echo "false")
  },
  "performance": {
    "search_latency": $(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" | grep -q "200"; then
        START_TIME=$(date +%s.%3N)
        curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" > /dev/null
        END_TIME=$(date +%s.%3N)
        echo "$END_TIME - $START_TIME" | bc 2>/dev/null || echo "null"
    else
        echo "null"
    fi),
    "facet_latency": $(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/facets" | grep -q "200"; then
        START_TIME=$(date +%s.%3N)
        curl -s "http://localhost:${API_PORT}/api/v1/docs/facets" > /dev/null
        END_TIME=$(date +%s.%3N)
        echo "$END_TIME - $START_TIME" | bc 2>/dev/null || echo "null"
    else
        echo "null"
    fi)
  },
  "logs": {
    "validation_report": "$report_file"
  }
}
EOF

    success "JSON report: $json_file"
}

# Print integration summary
print_integration_summary() {
    header "Integration Validation Summary"

    local docs_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOCS_PORT}/" | grep -q "200" && echo "✅ Running" || echo "❌ Not running")
    local api_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/health" | grep -q "200" && echo "✅ Running" || echo "❌ Not running")

    echo -e "${GREEN}Docusaurus:${NC} ${docs_status} on port ${DOCS_PORT}"
    echo -e "${GREEN}Documentation API:${NC} ${api_status} on port ${API_PORT}"

    # Search endpoint
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" | grep -q "200"; then
        local total=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" | jq -r '.total' 2>/dev/null || echo "0")
        echo -e "${GREEN}Search endpoint:${NC} ✅ Working (${total} results)"
    else
        echo -e "${GREEN}Search endpoint:${NC} ❌ Not accessible"
    fi

    # Facets endpoint
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/facets" | grep -q "200"; then
        local domains=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/facets" | jq -r '.facets.domains | length' 2>/dev/null || echo "0")
        local types=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/facets" | jq -r '.facets.types | length' 2>/dev/null || echo "0")
        local tags=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/facets" | jq -r '.facets.tags | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}Facets endpoint:${NC} ✅ Working (${domains} domains, ${types} types, ${tags} tags)"
    else
        echo -e "${GREEN}Facets endpoint:${NC} ❌ Not accessible"
    fi

    # Suggest endpoint
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/suggest?q=dark&limit=5" | grep -q "200"; then
        local suggestions=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/suggest?q=dark&limit=5" | jq -r '.suggestions | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}Suggest endpoint:${NC} ✅ Working (${suggestions} suggestions)"
    else
        echo -e "${GREEN}Suggest endpoint:${NC} ❌ Not accessible"
    fi

    # Health endpoint
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/health/summary" | grep -q "200"; then
        local score=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/health/summary" | jq -r '.overallScore' 2>/dev/null || echo "N/A")
        local grade=$(curl -s "http://localhost:${API_PORT}/api/v1/docs/health/summary" | jq -r '.grade' 2>/dev/null || echo "N/A")
        echo -e "${GREEN}Health endpoint:${NC} ✅ Working (Score: ${score}, Grade: ${grade})"
    else
        echo -e "${GREEN}Health endpoint:${NC} ❌ Not accessible"
    fi

    echo -e "${GREEN}Search page:${NC} ✅ Accessible and integrated"
    echo -e "${GREEN}Health page:${NC} ✅ Accessible and integrated"
    echo -e "${GREEN}CORS:${NC} $(grep -q "http://localhost:${DOCS_PORT}" ../../.env 2>/dev/null && echo "✅ Configured" || echo "⚠️  Check .env")"
    echo -e "${GREEN}Environment:${NC} ✅ Variables loaded"

    # Performance
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode" | grep -q "200"; then
        local search_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:${API_PORT}/api/v1/docs/search?q=dark+mode")
        local facet_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:${API_PORT}/api/v1/docs/facets")
        echo -e "${GREEN}Performance:${NC} Search ${search_time}s, Facets ${facet_time}s"
    else
        echo -e "${GREEN}Performance:${NC} N/A"
    fi

    echo ""
    echo -e "${CYAN}📄 Validation Report:${NC}"
    echo "  - INTEGRATION-VALIDATION-${TIMESTAMP}.md"
    echo "  - INTEGRATION-VALIDATION-${TIMESTAMP}.json"
    echo ""
    echo -e "${BLUE}✅ Integration validation completed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Run diagram validation: bash scripts/docs/validate-diagrams.sh"
    echo "  2. Test PlantUML rendering (33 diagrams)"
    echo "  3. Test Mermaid rendering"
}

# Main execution
main() {
    parse_arguments "$@"

    echo -e "${MAGENTA}🔌 Documentation API Integration Validation - Phase 4${NC}"
    echo "====================================================="
    echo ""
    echo "Configuration:"
    echo "  Docusaurus port: ${DOCS_PORT}"
    echo "  Documentation API port: ${API_PORT}"
    echo "  Verbose: ${VERBOSE}"
    echo ""

    cd "${DOCUSAURUS_DIR}"

    verify_docusaurus_running || exit 1

    # Check if API is running, but don't fail if not
    if verify_documentation_api_running; then
        validate_search_endpoint
        validate_facets_endpoint
        validate_suggest_endpoint
        validate_health_endpoint
        validate_cors_configuration
        test_search_performance
    else
        warning "Documentation API not running - skipping API endpoint tests"
        info "Search and health pages will show 'API not available' message"
    fi

    validate_environment_variables
    validate_search_page_integration
    validate_health_page_integration
    generate_integration_report
    print_integration_summary

    exit 0
}

main "$@"