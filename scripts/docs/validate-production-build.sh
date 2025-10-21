#!/bin/bash
# Phase 4 - Validate production build and serve
# Usage: ./validate-production-build.sh [--serve-port PORT] [--verbose]

set -euo pipefail

# Configuration
DOCUSAURUS_DIR="/home/marce/projetos/TradingSystem/docs/docusaurus"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BUILD_VALIDATION_LOG="${DOCUSAURUS_DIR}/BUILD-VALIDATION-${TIMESTAMP}.md"
SERVE_PORT=3000
VERBOSE=false
SERVE_PID=""

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
step() { echo -e "${CYAN}🏗️  $1${NC}"; }
header() { echo -e "${MAGENTA}=== $1 ===${NC}"; }

# Parse arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --serve-port)
                SERVE_PORT="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--serve-port PORT] [--verbose]"
                echo "  --serve-port PORT    Production serve port (default: 3000)"
                echo "  --verbose            Detailed output"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Pre-build checks
pre_build_checks() {
    header "Pre-Build Checks"

    # Check Phase 3 completion
    if [[ -d "node_modules" ]]; then
        success "Dependencies installed"
    else
        error "Dependencies not installed"
        return 1
    fi

    if [[ -f "package-lock.json" ]]; then
        success "Lock file present"
    else
        error "Lock file missing"
        return 1
    fi

    # Check disk space
    local disk_space=$(df -h . | tail -1 | awk '{print $4}')
    info "Disk space: $disk_space"
    if (( $(df . | tail -1 | awk '{print $4}') < 524288 )); then  # 500MB in KB
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

# Run production build
run_production_build() {
    header "Running Production Build"

    # Always remove existing build directory
    if [[ -d "build" ]]; then
        info "Removing existing build directory"
        rm -rf build
    fi

    step "Running: npm run build"

    # Run build and capture output
    if npm run build >> "${BUILD_VALIDATION_LOG}" 2>&1; then
        success "Production build completed successfully"
        return 0
    else
        local exit_code=$?
        error "Production build failed with exit code ${exit_code}"

        # Show last 30 lines of build output
        info "Last 30 lines of build output:"
        tail -30 "${BUILD_VALIDATION_LOG}" || true

        info "Troubleshooting tips:"
        info "  - Increase memory: NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build"
        info "  - Clear cache: npm run clear"
        info "  - Check for TypeScript errors in build log"

        return 1
    fi
}

# Validate build output
validate_build_output() {
    header "Validating Build Output"

    # Check build directory exists
    if [[ ! -d "build" ]]; then
        error "Build directory not created"
        return 1
    fi

    success "Build directory created"

    # Check expected structure
    local checks=(
        "build/index.html:index.html present"
        "build/docs/:docs/ directory present"
        "build/search/:search/ directory present"
        "build/health/:health/ directory present"
        "build/assets/:assets/ directory present"
        "build/img/:img/ directory present"
    )

    for check in "${checks[@]}"; do
        IFS=':' read -r path description <<< "$check"
        if [[ -e "$path" ]]; then
            success "$description"
        else
            error "$description"
        fi
    done

    # Count generated files
    local file_count=$(find build -type f | wc -l)
    info "Files generated: $file_count"

    # Expected: 1500-2000 files
    if [[ $file_count -lt 1000 ]]; then
        warning "Low file count (expected 1500+)"
    elif [[ $file_count -gt 2500 ]]; then
        warning "High file count (expected < 2500)"
    else
        success "File count within expected range"
    fi

    # Calculate build size
    local build_size=$(du -sh build | cut -f1)
    info "Build size: $build_size"

    # Expected: 8-10 MB
    local build_kb=$(du -sk build | cut -f1)
    if [[ $build_kb -lt 8192 ]]; then  # 8MB in KB
        warning "Small build size (< 8MB)"
    elif [[ $build_kb -gt 10240 ]]; then  # 10MB in KB
        warning "Large build size (> 10MB)"
    else
        success "Build size within expected range"
    fi

    return 0
}

# Validate static assets
validate_static_assets() {
    header "Validating Static Assets"

    # Count JS bundles
    local js_count=$(find build/assets -name '*.js' 2>/dev/null | wc -l || echo "0")
    info "JS bundles: $js_count"

    # Expected: 40-50 files
    if [[ $js_count -lt 30 ]]; then
        warning "Low JS bundle count (expected 40+)"
    elif [[ $js_count -gt 60 ]]; then
        warning "High JS bundle count (expected < 60)"
    else
        success "JS bundle count within expected range"
    fi

    # Count CSS bundles
    local css_count=$(find build/assets -name '*.css' 2>/dev/null | wc -l || echo "0")
    info "CSS bundles: $css_count"

    # Expected: 10-15 files
    if [[ $css_count -lt 5 ]]; then
        warning "Low CSS bundle count (expected 10+)"
    elif [[ $css_count -gt 20 ]]; then
        warning "High CSS bundle count (expected < 20)"
    else
        success "CSS bundle count within expected range"
    fi

    # Check critical assets
    local critical_assets=(
        "build/assets/js/main.*.js:Main JS bundle"
        "build/assets/css/styles.*.css:Main CSS bundle"
    )

    for asset_check in "${critical_assets[@]}"; do
        IFS=':' read -r pattern description <<< "$asset_check"
        if compgen -G "$pattern" > /dev/null; then
            success "$description present"
        else
            error "$description missing"
        fi
    done

    # Check images
    local image_checks=(
        "build/img/logo.svg:Logo"
        "build/img/logo-dark.svg:Dark logo"
        "build/img/favicon.svg:Favicon"
    )

    for image_check in "${image_checks[@]}"; do
        IFS=':' read -r path description <<< "$image_check"
        if [[ -f "$path" ]]; then
            success "$description present"
        else
            warning "$description missing"
        fi
    done

    return 0
}

# Validate HTML pages
validate_html_pages() {
    header "Validating HTML Pages"

    # Check critical pages
    local critical_pages=(
        "build/index.html:Homepage HTML"
        "build/search/index.html:Search page HTML"
        "build/health/index.html:Health page HTML"
        "build/docs/intro/index.html:Docs intro HTML"
    )

    for page_check in "${critical_pages[@]}"; do
        IFS=':' read -r path description <<< "$page_check"
        if [[ -f "$path" ]]; then
            success "$description present"
        else
            error "$description missing"
        fi
    done

    # Count total HTML files
    local html_count=$(find build -name 'index.html' | wc -l)
    info "HTML pages: $html_count"

    return 0
}

# Start serve
start_serve() {
    header "Starting Production Server"

    # Check port availability with fallback
    local port_in_use=false
    if command -v netstat >/dev/null 2>&1; then
        if netstat -tlnp 2>/dev/null | grep -q ":${SERVE_PORT} "; then
            port_in_use=true
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tlnp 2>/dev/null | grep -q ":${SERVE_PORT} "; then
            port_in_use=true
        fi
    elif command -v lsof >/dev/null 2>&1; then
        if lsof -i :${SERVE_PORT} >/dev/null 2>&1; then
            port_in_use=true
        fi
    else
        warning "No port checking tool available (netstat, ss, lsof)"
    fi

    if [[ $port_in_use == true ]]; then
        warning "Port ${SERVE_PORT} in use. Attempting to stop existing process..."
        pkill -f "docusaurus serve" || true
        sleep 2
    fi

    step "Running: npm run serve -- --port ${SERVE_PORT}"

    # Start serve in background
    npm run serve -- --port ${SERVE_PORT} >> "${BUILD_VALIDATION_LOG}" 2>&1 &
    SERVE_PID=$!

    # Store PID
    echo $SERVE_PID > .serve.pid

    # Wait for server startup (30 seconds timeout)
    local elapsed=0
    while [[ $elapsed -lt 30 ]]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/" | grep -q "200"; then
            success "Production server started"
            info "PID: $SERVE_PID"
            info "URL: http://localhost:${SERVE_PORT}"
            return 0
        fi
        sleep 1
        ((elapsed++))
    done

    error "Server failed to start within 30 seconds"
    return 1
}

# Validate served pages
validate_served_pages() {
    header "Validating Served Pages"

    local pages=(
        "Homepage:http://localhost:${SERVE_PORT}/"
        "Search:http://localhost:${SERVE_PORT}/search"
        "Health:http://localhost:${SERVE_PORT}/health"
        "Docs:http://localhost:${SERVE_PORT}/docs/intro"
    )

    for page_info in "${pages[@]}"; do
        IFS=':' read -r page_name page_url <<< "$page_info"

        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$page_url")
        local time_total=$(curl -s -o /dev/null -w "%{time_total}" "$page_url")

        if [[ $http_code -eq 200 ]]; then
            success "$page_name: $http_code OK (${time_total}s)"
        else
            error "$page_name: $http_code (${time_total}s)"
        fi

        # Use awk for numeric comparisons to avoid bc dependency
        if awk "BEGIN {exit !($time_total > 2.0)}"; then
            warning "$page_name slow response: ${time_total}s"
        fi
    done

    return 0
}

# Validate SPA routing
validate_spa_routing() {
    header "Validating SPA Routing"

    info "Testing SPA fallback (try_files for client-side routing)"

    # Test non-existent route (should fallback to index.html)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/non-existent-page")

    if [[ $http_code -eq 200 ]]; then
        success "SPA fallback working (200 OK for non-existent route)"
        return 0
    else
        warning "SPA fallback not working (${http_code}) (may cause issues on page refresh)"
        return 1
    fi
}

# Test production performance
test_production_performance() {
    header "Testing Production Performance"

    local pages=(
        "Homepage:http://localhost:${SERVE_PORT}/"
        "Search:http://localhost:${SERVE_PORT}/search"
        "Health:http://localhost:${SERVE_PORT}/health"
    )

    for page_info in "${pages[@]}"; do
        IFS=':' read -r page_name page_url <<< "$page_info"

        local start_time=$(date +%s.%3N)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$page_url")
        local end_time=$(date +%s.%3N)
        # Use awk for numeric comparisons to avoid bc dependency
        local load_time=$(awk "BEGIN {printf \"%.3f\", $end_time - $start_time}" 2>/dev/null || echo "0")

        if [[ $http_code -eq 200 ]]; then
            if awk "BEGIN {exit !($load_time < 0.5)}"; then
                success "$page_name: ${load_time}s (excellent)"
            elif awk "BEGIN {exit !($load_time < 1.0)}"; then
                success "$page_name: ${load_time}s (good)"
            else
                warning "$page_name: ${load_time}s (slow)"
            fi
        else
            warning "$page_name: Failed (${http_code})"
        fi
    done

    # Calculate average using awk to avoid bc dependency
    local total_time=0
    local count=0
    for page_info in "${pages[@]}"; do
        IFS=':' read -r page_name page_url <<< "$page_info"
        local time=$(curl -s -w "%{time_total}" -o /dev/null "$page_url" 2>/dev/null || echo "0")
        total_time=$(awk "BEGIN {print $total_time + $time}" 2>/dev/null || echo "$total_time")
        ((count++))
    done

    if [[ $count -gt 0 ]]; then
        local avg_time=$(awk "BEGIN {printf \"%.3f\", $total_time / $count}" 2>/dev/null || echo "0")
        info "Average load time: ${avg_time}s"
    fi

    return 0
}

# Check Lighthouse metrics
check_lighthouse_metrics() {
    header "Lighthouse Metrics (Manual)"

    info "Please run Lighthouse audit in browser:"
    info "  1. Open http://localhost:${SERVE_PORT} in Chrome"
    info "  2. Open DevTools (F12)"
    info "  3. Go to Lighthouse tab"
    info "  4. Select 'Desktop' and 'Performance'"
    info "  5. Click 'Analyze page load'"
    info "Expected scores:"
    info "  - Performance: > 90"
    info "  - Accessibility: > 95"
    info "  - Best Practices: > 90"
    info "  - SEO: > 90"
    info "Press Enter when Lighthouse audit is complete..."
    read -r

    return 0
}

# Cleanup serve
cleanup_serve() {
    if [[ -n "$SERVE_PID" ]]; then
        info "Stopping production server (PID: ${SERVE_PID})..."
        kill $SERVE_PID 2>/dev/null || true
        rm -f .serve.pid
        success "Production server stopped"
    fi
}

# Generate build validation report
generate_build_validation_report() {
    header "Generating Build Validation Report"

    local report_file="${DOCUSAURUS_DIR}/BUILD-VALIDATION-${TIMESTAMP}.md"

    cat > "$report_file" << EOF
# Production Build Validation - Phase 4

**Timestamp:** ${TIMESTAMP}
**Serve Port:** ${SERVE_PORT}

## Build Status
- Build Completed: $([[ -d "build" ]] && echo "Yes" || echo "No")
- Exit Code: $(grep -o "npm ERR! code" "${BUILD_VALIDATION_LOG}" 2>/dev/null || echo "0")

## Build Output Structure
- index.html: $([[ -f "build/index.html" ]] && echo "Present" || echo "Missing")
- docs/ directory: $([[ -d "build/docs" ]] && echo "Present" || echo "Missing")
- search/ directory: $([[ -d "build/search" ]] && echo "Present" || echo "Missing")
- health/ directory: $([[ -d "build/health" ]] && echo "Present" || echo "Missing")
- assets/ directory: $([[ -d "build/assets" ]] && echo "Present" || echo "Missing")
- img/ directory: $([[ -d "build/img" ]] && echo "Present" || echo "Missing")

## Build Statistics
- Files Generated: $(find build -type f 2>/dev/null | wc -l || echo "0")
- Build Size: $(du -sh build 2>/dev/null | cut -f1 || echo "0")
- JS Bundles: $(find build/assets -name '*.js' 2>/dev/null | wc -l || echo "0")
- CSS Bundles: $(find build/assets -name '*.css' 2>/dev/null | wc -l || echo "0")
- HTML Pages: $(find build -name 'index.html' 2>/dev/null | wc -l || echo "0")

## Static Assets
- Main JS Bundle: $(compgen -G "build/assets/js/main.*.js" > /dev/null && echo "Present" || echo "Missing")
- Main CSS Bundle: $(compgen -G "build/assets/css/styles.*.css" > /dev/null && echo "Present" || echo "Missing")
- Logo: $([[ -f "build/img/logo.svg" ]] && echo "Present" || echo "Missing")
- Dark Logo: $([[ -f "build/img/logo-dark.svg" ]] && echo "Present" || echo "Missing")
- Favicon: $([[ -f "build/img/favicon.svg" ]] && echo "Present" || echo "Missing")

## Production Server
- Port: ${SERVE_PORT}
- Started: $([[ -n "$SERVE_PID" ]] && ps -p $SERVE_PID > /dev/null 2>&1 && echo "Yes" || echo "No")
- PID: ${SERVE_PID:-"N/A"}

## Served Pages
- Homepage: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/" 2>/dev/null || echo "N/A") ($(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${SERVE_PORT}/" 2>/dev/null || echo "N/A")s)
- Search: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/search" 2>/dev/null || echo "N/A") ($(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${SERVE_PORT}/search" 2>/dev/null || echo "N/A")s)
- Health: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/health" 2>/dev/null || echo "N/A") ($(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${SERVE_PORT}/health" 2>/dev/null || echo "N/A")s)
- Docs: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/docs/intro" 2>/dev/null || echo "N/A") ($(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${SERVE_PORT}/docs/intro" 2>/dev/null || echo "N/A")s)

## SPA Routing
- Fallback Working: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/non-existent-page" 2>/dev/null | grep -q "200" && echo "Yes" || echo "No")

## Performance Metrics
- Average Load Time: $(if [[ -n "$SERVE_PID" ]] && ps -p $SERVE_PID > /dev/null 2>&1; then
    local total_time=0
    local count=0
    for page in "/" "/search" "/health"; do
        local time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:${SERVE_PORT}${page}" 2>/dev/null || echo "0")
        total_time=$(echo "$total_time + $time" | bc 2>/dev/null || echo "$total_time")
        ((count++))
    done
    if [[ $count -gt 0 ]]; then
        echo "scale=3; $total_time / $count" | bc 2>/dev/null || echo "N/A"
    else
        echo "N/A"
    fi
else
    echo "N/A"
fi)s

## Lighthouse Metrics
- Manual Audit: Completed
- Performance: > 90 (expected)
- Accessibility: > 95 (expected)
- Best Practices: > 90 (expected)
- SEO: > 90 (expected)

## Next Steps
1. Generate final restoration report
2. Run: \`bash scripts/docs/generate-restoration-report.sh --format both --verbose\`

---
*Generated by validate-production-build.sh*
EOF

    success "Build validation report: $report_file"

    # Generate JSON report
    local json_file="${DOCUSAURUS_DIR}/BUILD-VALIDATION-${TIMESTAMP}.json"

    cat > "$json_file" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "phase": "4",
  "validation": "production-build",
  "build": {
    "completed": $([[ -d "build" ]] && echo "true" || echo "false"),
    "exit_code": $(grep -o "npm ERR! code" "${BUILD_VALIDATION_LOG}" 2>/dev/null || echo "0"),
    "structure": {
      "index_html": $([[ -f "build/index.html" ]] && echo "true" || echo "false"),
      "docs_dir": $([[ -d "build/docs" ]] && echo "true" || echo "false"),
      "search_dir": $([[ -d "build/search" ]] && echo "true" || echo "false"),
      "health_dir": $([[ -d "build/health" ]] && echo "true" || echo "false"),
      "assets_dir": $([[ -d "build/assets" ]] && echo "true" || echo "false"),
      "img_dir": $([[ -d "build/img" ]] && echo "true" || echo "false")
    },
    "statistics": {
      "files_generated": $(find build -type f 2>/dev/null | wc -l || echo "0"),
      "build_size": "$(du -sh build 2>/dev/null | cut -f1 || echo "0")",
      "js_bundles": $(find build/assets -name '*.js' 2>/dev/null | wc -l || echo "0"),
      "css_bundles": $(find build/assets -name '*.css' 2>/dev/null | wc -l || echo "0"),
      "html_pages": $(find build -name 'index.html' 2>/dev/null | wc -l || echo "0")
    },
    "assets": {
      "main_js": $(compgen -G "build/assets/js/main.*.js" > /dev/null && echo "true" || echo "false"),
      "main_css": $(compgen -G "build/assets/css/styles.*.css" > /dev/null && echo "true" || echo "false"),
      "logo": $([[ -f "build/img/logo.svg" ]] && echo "true" || echo "false"),
      "dark_logo": $([[ -f "build/img/logo-dark.svg" ]] && echo "true" || echo "false"),
      "favicon": $([[ -f "build/img/favicon.svg" ]] && echo "true" || echo "false")
    }
  },
  "server": {
    "port": ${SERVE_PORT},
    "started": $([[ -n "$SERVE_PID" ]] && ps -p $SERVE_PID > /dev/null 2>&1 && echo "true" || echo "false"),
    "pid": "${SERVE_PID:-"null"}"
  },
  "pages": {
    "homepage": {
      "status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/" 2>/dev/null || echo "null"),
      "response_time": "$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${SERVE_PORT}/" 2>/dev/null || echo "null")"
    },
    "search": {
      "status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/search" 2>/dev/null || echo "null"),
      "response_time": "$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${SERVE_PORT}/search" 2>/dev/null || echo "null")"
    },
    "health": {
      "status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/health" 2>/dev/null || echo "null"),
      "response_time": "$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${SERVE_PORT}/health" 2>/dev/null || echo "null")"
    },
    "docs": {
      "status": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/docs/intro" 2>/dev/null || echo "null"),
      "response_time": "$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:${SERVE_PORT}/docs/intro" 2>/dev/null || echo "null")"
    }
  },
  "spa_routing": {
    "fallback_working": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/non-existent-page" 2>/dev/null | grep -q "200" && echo "true" || echo "false")
  },
  "performance": {
    "average_load_time": $(if [[ -n "$SERVE_PID" ]] && ps -p $SERVE_PID > /dev/null 2>&1; then
        local total_time=0
        local count=0
        for page in "/" "/search" "/health"; do
            local time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:${SERVE_PORT}${page}" 2>/dev/null || echo "0")
            total_time=$(echo "$total_time + $time" | bc 2>/dev/null || echo "$total_time")
            ((count++))
        done
        if [[ $count -gt 0 ]]; then
            echo "scale=3; $total_time / $count" | bc 2>/dev/null || echo "null"
        else
            echo "null"
        fi
    else
        echo "null"
    fi)
  },
  "lighthouse": {
    "manual_audit": true,
    "expected_scores": {
      "performance": "> 90",
      "accessibility": "> 95",
      "best_practices": "> 90",
      "seo": "> 90"
    }
  },
  "logs": {
    "validation_report": "$report_file"
  }
}
EOF

    success "JSON report: $json_file"
}

# Print build validation summary
print_build_validation_summary() {
    header "Production Build Validation Summary"

    local build_success=$( [[ -d "build" ]] && echo "✅ Success" || echo "❌ Failed" )
    local file_count=$(find build -type f 2>/dev/null | wc -l || echo "0")
    local build_size=$(du -sh build 2>/dev/null | cut -f1 || echo "0")
    local js_count=$(find build/assets -name '*.js' 2>/dev/null | wc -l || echo "0")
    local css_count=$(find build/assets -name '*.css' 2>/dev/null | wc -l || echo "0")

    echo -e "${GREEN}Build:${NC} ${build_success}"
    echo -e "${GREEN}Build output:${NC} ${file_count} files, ${build_size}"
    echo -e "${GREEN}Static assets:${NC} ${js_count} JS, ${css_count} CSS"

    local html_count=$(find build -name 'index.html' 2>/dev/null | wc -l || echo "0")
    echo -e "${GREEN}HTML pages:${NC} ${html_count} pages"

    local server_status=$( [[ -n "$SERVE_PID" ]] && ps -p $SERVE_PID > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running" )
    echo -e "${GREEN}Production server:${NC} ${server_status} on http://localhost:${SERVE_PORT}"

    local pages_accessible=0
    for page in "/" "/search" "/health"; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}${page}" 2>/dev/null | grep -q "200"; then
            ((pages_accessible++))
        fi
    done
    echo -e "${GREEN}Pages accessible:${NC} ${pages_accessible}/3 pages"

    local spa_working=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SERVE_PORT}/non-existent-page" 2>/dev/null | grep -q "200" && echo "✅ Working" || echo "⚠️  Not working")
    echo -e "${GREEN}SPA routing:${NC} ${spa_working}"

    # Calculate average performance
    if [[ -n "$SERVE_PID" ]] && ps -p $SERVE_PID > /dev/null 2>&1; then
        local total_time=0
        local count=0
        for page in "/" "/search" "/health"; do
            local time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:${SERVE_PORT}${page}" 2>/dev/null || echo "0")
            total_time=$(echo "$total_time + $time" | bc 2>/dev/null || echo "$total_time")
            ((count++))
        done
        if [[ $count -gt 0 ]]; then
            local avg_time=$(echo "scale=3; $total_time / $count" | bc 2>/dev/null || echo "0")
            echo -e "${GREEN}Performance:${NC} Avg ${avg_time}s"
        fi
    fi

    echo -e "${GREEN}Lighthouse:${NC} Manual validation completed"
    echo ""
    echo -e "${CYAN}📄 Validation Report:${NC}"
    echo "  - BUILD-VALIDATION-${TIMESTAMP}.md"
    echo "  - BUILD-VALIDATION-${TIMESTAMP}.json"
    echo ""
    echo -e "${BLUE}✅ Production build validation completed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Generate final restoration report"
    echo "  2. Run: bash scripts/docs/generate-restoration-report.sh --format both --verbose"
}

# Main execution
main() {
    parse_arguments "$@"

    echo -e "${MAGENTA}🏗️ Production Build Validation - Phase 4${NC}"
    echo "=========================================="
    echo ""
    echo "Configuration:"
    echo "  Directory: ${DOCUSAURUS_DIR}"
    echo "  Serve port: ${SERVE_PORT}"
    echo "  Verbose: ${VERBOSE}"
    echo ""

    # Set trap for cleanup
    trap cleanup_serve EXIT

    cd "${DOCUSAURUS_DIR}"

    pre_build_checks || exit 1
    run_production_build || exit 1
    validate_build_output || exit 1
    validate_static_assets || exit 1
    validate_html_pages || exit 1
    start_serve || exit 1
    validate_served_pages || exit 1
    validate_spa_routing
    test_production_performance
    check_lighthouse_metrics
    generate_build_validation_report
    print_build_validation_summary

    exit 0
}

main "$@"