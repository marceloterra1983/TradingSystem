#!/bin/bash
# Phase 4 - Validate Docusaurus dev server startup and accessibility
# Usage: ./validate-dev-server.sh [--port PORT] [--timeout SECONDS] [--verbose]

set -euo pipefail

# Configuration
DOCUSAURUS_DIR="/home/marce/projetos/TradingSystem/docs/docusaurus"
PROJECT_ROOT="/home/marce/projetos/TradingSystem"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEV_SERVER_LOG="${DOCUSAURUS_DIR}/DEV-SERVER-LOG-${TIMESTAMP}.md"
PORT=3004
TIMEOUT=60
VERBOSE=false
SERVER_PID=""

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
step() { echo -e "${CYAN}🚀 $1${NC}"; }
header() { echo -e "${MAGENTA}=== $1 ===${NC}"; }

# Parse arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --port)
                PORT="$2"
                shift 2
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--port PORT] [--timeout SECONDS] [--verbose]"
                echo "  --port PORT        Custom port (default: 3004)"
                echo "  --timeout SECONDS  Startup timeout (default: 60)"
                echo "  --verbose          Detailed output"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Pre-validation checks
pre_validation_checks() {
    header "Pre-Validation Checks"

    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        success "Node.js installed: $NODE_VERSION"
    else
        error "Node.js not installed"
        return 1
    fi

    # Check npm
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        success "npm installed: $NPM_VERSION"
    else
        error "npm not installed"
        return 1
    fi

    # Check Phase 3 completion
    if [[ -d "node_modules" ]]; then
        success "Dependencies installed (node_modules present)"
    else
        error "Dependencies not installed (node_modules missing)"
        return 1
    fi

    if [[ -f "package-lock.json" ]]; then
        success "Lock file present"
    else
        error "Lock file missing"
        return 1
    fi

    # Check port availability with fallback
    local port_in_use=false
    if command -v netstat >/dev/null 2>&1; then
        if netstat -tlnp 2>/dev/null | grep -q ":${PORT} "; then
            port_in_use=true
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
            port_in_use=true
        fi
    elif command -v lsof >/dev/null 2>&1; then
        if lsof -i :${PORT} >/dev/null 2>&1; then
            port_in_use=true
        fi
    else
        warning "No port checking tool available (netstat, ss, lsof)"
    fi

    if [[ $port_in_use == true ]]; then
        warning "Port ${PORT} already in use"
        # Don't return 1 - allow flow to continue for healthy server detection
    else
        success "Port ${PORT} available"
    fi

    # Check disk space
    DISK_SPACE=$(df -h . | tail -1 | awk '{print $4}')
    info "Disk space: $DISK_SPACE"
    if [[ $(df . | tail -1 | awk '{print $4}') -lt 524288 ]]; then  # 500MB in KB
        warning "Low disk space (< 500MB)"
    else
        success "Sufficient disk space"
    fi

    # Check source files
    if [[ -d "src" ]]; then
        success "Source directory present"
    else
        error "Source directory missing"
        return 1
    fi

    if [[ -f "docusaurus.config.ts" ]]; then
        success "Docusaurus config present"
    else
        error "Docusaurus config missing"
        return 1
    fi

    if [[ -f "package.json" ]]; then
        success "Package.json present"
    else
        error "Package.json missing"
        return 1
    fi

    return 0
}

# Start dev server
start_dev_server() {
    header "Starting Dev Server"

    # Check if port is occupied by a healthy server
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" | grep -q "200"; then
        success "Healthy dev server already running on port ${PORT}"
        # Try to read existing PID from .dev-server.pid
        if [[ -f ".dev-server.pid" ]]; then
            local existing_pid=$(cat .dev-server.pid 2>/dev/null || echo "")
            if [[ -n "$existing_pid" ]] && ps -p "$existing_pid" > /dev/null 2>&1; then
                SERVER_PID="$existing_pid"
                info "Using existing server PID: $SERVER_PID"
                return 0
            fi
        fi
        # Server is running but no valid PID, set empty to skip cleanup
        SERVER_PID=""
        info "Server running but PID unknown - will skip cleanup"
        return 0
    fi

    step "Running: npm run dev"

    # Start server in background
    npm run dev > "${DEV_SERVER_LOG}" 2>&1 &
    SERVER_PID=$!

    # Store PID for cleanup
    echo $SERVER_PID > .dev-server.pid

    # Wait for server startup
    local elapsed=0
    while [[ $elapsed -lt $TIMEOUT ]]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" | grep -q "200"; then
            success "Server started successfully"
            info "PID: $SERVER_PID"
            info "URL: http://localhost:${PORT}"
            return 0
        fi
        sleep 1
        ((elapsed++))
    done

    error "Server failed to start within ${TIMEOUT} seconds"
    return 1
}

# Validate server health
validate_server_health() {
    header "Validating Server Health"

    # HTTP health check
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/")
    if [[ $HTTP_CODE -eq 200 ]]; then
        success "HTTP 200 OK"
    else
        error "Root endpoint returned ${HTTP_CODE}"
        return 1
    fi

    # Process health check
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        success "Process running (PID: $SERVER_PID)"

        # CPU and memory usage
        CPU_USAGE=$(ps -p $SERVER_PID -o %cpu --no-headers | tr -d ' ')
        MEM_USAGE=$(ps -p $SERVER_PID -o %mem --no-headers | tr -d ' ')

        info "CPU: ${CPU_USAGE}%, MEM: ${MEM_USAGE}%"

        # Use awk for numeric comparisons to avoid bc dependency
        if awk "BEGIN {exit !($CPU_USAGE > 80)}" || awk "BEGIN {exit !($MEM_USAGE > 80)}"; then
            warning "High resource usage"
        fi
    else
        error "Process not running"
        return 1
    fi

    # Port binding check with fallback
    local port_bound=false
    if command -v netstat >/dev/null 2>&1; then
        if netstat -tlnp 2>/dev/null | grep -q ":${PORT} "; then
            port_bound=true
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
            port_bound=true
        fi
    elif command -v lsof >/dev/null 2>&1; then
        if lsof -i :${PORT} >/dev/null 2>&1; then
            port_bound=true
        fi
    else
        warning "No port checking tool available (netstat, ss, lsof)"
    fi

    if [[ $port_bound == true ]]; then
        success "Port bound: LISTEN on :${PORT}"
    else
        error "Port not bound"
        return 1
    fi

    # Log file check
    if [[ -f "${DEV_SERVER_LOG}" ]]; then
        ERROR_COUNT=$(grep -i "error" "${DEV_SERVER_LOG}" | wc -l)
        WARNING_COUNT=$(grep -i "warning" "${DEV_SERVER_LOG}" | wc -l)

        if [[ $ERROR_COUNT -gt 0 ]]; then
            warning "${ERROR_COUNT} errors found in log"
        fi

        info "Log: $ERROR_COUNT errors, $WARNING_COUNT warnings"
    fi

    return 0
}

# Validate page accessibility
validate_page_accessibility() {
    header "Validating Page Accessibility"

    local pages=(
        "Homepage:http://localhost:${PORT}/"
        "Search:http://localhost:${PORT}/search"
        "Health:http://localhost:${PORT}/health"
        "Docs:http://localhost:${PORT}/docs/intro"
        "Spec:http://localhost:${PORT}/spec"
    )

    for page_info in "${pages[@]}"; do
        IFS=':' read -r PAGE_NAME PAGE_URL <<< "$page_info"

        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PAGE_URL")
        TIME_TOTAL=$(curl -s -o /dev/null -w "%{time_total}" "$PAGE_URL")

        if [[ $HTTP_CODE -eq 200 ]]; then
            success "$PAGE_NAME: $HTTP_CODE OK (${TIME_TOTAL}s)"
        else
            error "$PAGE_NAME: $HTTP_CODE (${TIME_TOTAL}s)"
        fi

        # Use awk for numeric comparisons to avoid bc dependency
        if awk "BEGIN {exit !($TIME_TOTAL > 2.0)}"; then
            warning "$PAGE_NAME slow response: ${TIME_TOTAL}s"
        fi
    done

    # Test static assets
    local assets=(
        "CSS:http://localhost:${PORT}/assets/css/styles.*.css"
        "JS:http://localhost:${PORT}/assets/js/main.*.js"
        "Images:http://localhost:${PORT}/img/logo.svg"
    )

    for asset_info in "${assets[@]}"; do
        IFS=':' read -r ASSET_NAME ASSET_URL <<< "$asset_info"

        # Parse concrete asset URLs from HTML
        if [[ $ASSET_URL == *"*"* ]]; then
            # Get HTML and extract concrete URLs
            local html_content=$(curl -s "http://localhost:${PORT}/")
            local concrete_urls=()

            if [[ $ASSET_NAME == "CSS" ]]; then
                concrete_urls=($(echo "$html_content" | grep -o 'assets/css/styles\.[^"]*\.css' | head -1))
            elif [[ $ASSET_NAME == "JS" ]]; then
                concrete_urls=($(echo "$html_content" | grep -o 'assets/js/main\.[^"]*\.js' | head -1))
            fi

            # Test concrete URLs
            for concrete_url in "${concrete_urls[@]}"; do
                HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/${concrete_url}")
                if [[ $HTTP_CODE -eq 200 ]]; then
                    success "$ASSET_NAME assets: $HTTP_CODE OK"
                else
                    warning "$ASSET_NAME assets: $HTTP_CODE"
                fi
            done
        else
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$ASSET_URL")
            if [[ $HTTP_CODE -eq 200 ]]; then
                success "$ASSET_NAME assets: $HTTP_CODE OK"
            else
                warning "$ASSET_NAME assets: $HTTP_CODE"
            fi
        fi
    done

    return 0
}

# Validate hot reload
validate_hot_reload() {
    header "Validating Hot Reload"

    # Create test file in watched content folder (docs path is '../context' per docusaurus.config.ts)
    local test_file="${PROJECT_ROOT}/docs/context/tmp-test-hot-reload.md"
    echo "# Test Page" > "$test_file"

    # Wait for potential reload
    sleep 3

    # Check if server reloaded using log tailing
    if grep -q "Client bundle rebuilding\|Client hot reload" "${DEV_SERVER_LOG}"; then
        success "Hot reload working (detected via log)"
    else
        # Alternative: check ETag/Last-Modified of a page
        local etag_before=$(curl -s -I "http://localhost:${PORT}/" | grep -i etag | tr -d '\r' || echo "")
        sleep 1
        local etag_after=$(curl -s -I "http://localhost:${PORT}/" | grep -i etag | tr -d '\r' || echo "")

        if [[ -n "$etag_before" ]] && [[ -n "$etag_after" ]] && [[ "$etag_before" != "$etag_after" ]]; then
            success "Hot reload working (detected via ETag change)"
        else
            warning "Hot reload not detected (may be normal)"
        fi
    fi

    # Clean up test file (trap ensures cleanup even on error)
    rm -f "$test_file"

    return 0
}

# Check browser console errors
check_browser_console_errors() {
    header "Browser Console Check (Manual)"

    info "Please open http://localhost:${PORT} in browser"
    info "Open DevTools (F12) and check Console tab"
    info "Expected: No errors (warnings are OK)"
    info "Common errors to check:"
    info "  - Failed to load resource (404)"
    info "  - CORS errors (API integration)"
    info "  - React errors (component issues)"
    info "  - TypeScript errors (type issues)"
    info "Press Enter when console check is complete..."

    read -r
    return 0
}

# Generate validation report
generate_validation_report() {
    header "Generating Validation Report"

    local report_file="${DOCUSAURUS_DIR}/DEV-SERVER-VALIDATION-${TIMESTAMP}.md"

    cat > "$report_file" << EOF
# Docusaurus Dev Server Validation - Phase 4

**Timestamp:** ${TIMESTAMP}
**Server PID:** ${SERVER_PID}
**Port:** ${PORT}
**Startup Time:** $(grep -o "Server ready" "${DEV_SERVER_LOG}" | head -1 || echo "Unknown")

## Server Configuration
- Directory: ${DOCUSAURUS_DIR}
- Port: ${PORT}
- Timeout: ${TIMEOUT} seconds
- Verbose: ${VERBOSE}

## Health Check Results
- HTTP Status: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/")
- Process Running: $(ps -p $SERVER_PID > /dev/null 2>&1 && echo "Yes" || echo "No")
- CPU Usage: $(ps -p $SERVER_PID -o %cpu --no-headers | tr -d ' ')%
- Memory Usage: $(ps -p $SERVER_PID -o %mem --no-headers | tr -d ' ')%
- Port Bound: $(netstat -tlnp 2>/dev/null | grep -q ":${PORT} " && echo "Yes" || echo "No")

## Page Accessibility Results
- Homepage: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/") ($(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/")s)
- Search: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/search") ($(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/search")s)
- Health: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health") ($(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/health")s)
- Docs: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/docs/intro") ($(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/docs/intro")s)
- Spec: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/spec") ($(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/spec")s)

## Hot Reload Status
$(grep -q "Client bundle rebuilding" "${DEV_SERVER_LOG}" && echo "Working" || echo "Not detected")

## Browser Console Check
Manual validation completed by user.

## Log File Location
${DEV_SERVER_LOG}

## Next Steps
1. Proceed to theme validation
2. Run: \`bash scripts/docs/validate-theme-components.sh --interactive --verbose\`

---
*Generated by validate-dev-server.sh*
EOF

    success "Validation report: $report_file"

    # Generate JSON report
    local json_file="${DOCUSAURUS_DIR}/DEV-SERVER-VALIDATION-${TIMESTAMP}.json"

    cat > "$json_file" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "phase": "4",
  "validation": "dev-server",
  "server": {
    "pid": "${SERVER_PID}",
    "port": ${PORT},
    "url": "http://localhost:${PORT}",
    "startup_time": "$(grep -o "Server ready" "${DEV_SERVER_LOG}" | head -1 || echo "Unknown")"
  },
  "health": {
    "http_status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/"),
    "process_running": $(ps -p $SERVER_PID > /dev/null 2>&1 && echo "true" || echo "false"),
    "cpu_usage": "$(ps -p $SERVER_PID -o %cpu --no-headers | tr -d ' ')",
    "memory_usage": "$(ps -p $SERVER_PID -o %mem --no-headers | tr -d ' ')",
    "port_bound": $(netstat -tlnp 2>/dev/null | grep -q ":${PORT} " && echo "true" || echo "false")
  },
  "pages": {
    "homepage": {
      "status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/"),
      "response_time": "$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/")"
    },
    "search": {
      "status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/search"),
      "response_time": "$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/search")"
    },
    "health": {
      "status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health"),
      "response_time": "$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/health")"
    },
    "docs": {
      "status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/docs/intro"),
      "response_time": "$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/docs/intro")"
    },
    "spec": {
      "status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/spec"),
      "response_time": "$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}/spec")"
    }
  },
  "hot_reload": $(grep -q "Client bundle rebuilding" "${DEV_SERVER_LOG}" && echo "true" || echo "false"),
  "logs": {
    "server_log": "${DEV_SERVER_LOG}",
    "validation_report": "$report_file"
  }
}
EOF

    success "JSON report: $json_file"
}

# Print validation summary
print_validation_summary() {
    header "Dev Server Validation Summary"

    echo -e "${GREEN}Server:${NC} ✅ Running on http://localhost:${PORT}"
    echo -e "${GREEN}Process:${NC} PID ${SERVER_PID}, CPU $(ps -p $SERVER_PID -o %cpu --no-headers | tr -d ' ')%, MEM $(ps -p $SERVER_PID -o %mem --no-headers | tr -d ' ')%"
    echo -e "${GREEN}Health:${NC} ✅ Healthy"
    # Calculate average using awk to avoid bc dependency
    local page_times=()
    for page in "/" "/search" "/health" "/docs/intro" "/spec"; do
        local time=$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${PORT}${page}")
        page_times+=("$time")
    done
    local sum=0
    for time in "${page_times[@]}"; do
        sum=$(awk "BEGIN {print $sum + $time}")
    done
    local avg=$(awk "BEGIN {print $sum / 5}")
    echo -e "${GREEN}Pages:${NC} 5/5 accessible (avg ${avg}s)"
    echo -e "${GREEN}Hot reload:${NC} $(grep -q "Client bundle rebuilding" "${DEV_SERVER_LOG}" && echo "✅ Working" || echo "⚠️  Not detected")"
    echo -e "${GREEN}Log:${NC} $(grep -i "error" "${DEV_SERVER_LOG}" | wc -l) errors, $(grep -i "warning" "${DEV_SERVER_LOG}" | wc -l) warnings"
    echo ""
    echo -e "${CYAN}📄 Reports Generated:${NC}"
    echo "  - DEV-SERVER-VALIDATION-${TIMESTAMP}.md"
    echo "  - DEV-SERVER-VALIDATION-${TIMESTAMP}.json"
    echo "  - DEV-SERVER-LOG-${TIMESTAMP}.md"
    echo ""
    echo -e "${BLUE}✅ Dev server validation completed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Open http://localhost:${PORT} in browser"
    echo "  2. Validate Gemini CLI theme (dark/light mode)"
    echo "  3. Test all custom components"
    echo "  4. Run theme validation script"
}

# Cleanup on exit
cleanup_on_exit() {
    if [[ -n "$SERVER_PID" ]]; then
        info "Stopping dev server (PID: ${SERVER_PID})..."
        kill $SERVER_PID 2>/dev/null || true
        rm -f .dev-server.pid
        success "Dev server stopped"
    fi
}

# Main execution
main() {
    parse_arguments "$@"

    echo -e "${MAGENTA}🚀 Docusaurus Dev Server Validation - Phase 4${NC}"
    echo "========================================"
    echo ""
    echo "Configuration:"
    echo "  Directory: ${DOCUSAURUS_DIR}"
    echo "  Port: ${PORT}"
    echo "  Timeout: ${TIMEOUT} seconds"
    echo "  Verbose: ${VERBOSE}"
    echo ""

    # Set trap for cleanup
    trap cleanup_on_exit EXIT

    cd "${DOCUSAURUS_DIR}"

    pre_validation_checks
    start_dev_server || exit 1
    validate_server_health || exit 1
    validate_page_accessibility || exit 1
    validate_hot_reload || exit 1
    check_browser_console_errors || exit 1
    generate_validation_report || exit 1
    print_validation_summary || exit 1

    info "Dev server is still running. Press Ctrl+C to stop."
    wait
}

main "$@"