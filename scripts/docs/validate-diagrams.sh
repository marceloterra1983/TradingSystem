#!/bin/bash
# Phase 4 - Validate PlantUML and Mermaid diagram rendering
# Usage: ./validate-diagrams.sh [--port PORT] [--verbose]

set -euo pipefail

# Configuration
DOCUSAURUS_DIR="/home/marce/projetos/TradingSystem/docs/docusaurus"
PROJECT_ROOT="/home/marce/projetos/TradingSystem"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DIAGRAM_LOG="${DOCUSAURUS_DIR}/DIAGRAM-VALIDATION-${TIMESTAMP}.md"
PORT=3004
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
step() { echo -e "${CYAN}📊 $1${NC}"; }
header() { echo -e "${MAGENTA}=== $1 ===${NC}"; }

# Parse arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --port)
                PORT="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--port PORT] [--verbose]"
                echo "  --port PORT        Custom port (default: 3004)"
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

# Verify server running
verify_server_running() {
    header "Verifying Server Running"

    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" | grep -q "200"; then
        success "Docusaurus accessible on http://localhost:${PORT}"
        return 0
    else
        error "Docusaurus not running. Start with: npm run dev"
        return 1
    fi
}

# Validate PlantUML plugin
validate_plantuml_plugin() {
    header "Validating PlantUML Plugin"

    if [[ -d "node_modules/@akebifiky/remark-simple-plantuml" ]]; then
        local version=$(cat node_modules/@akebifiky/remark-simple-plantuml/package.json | jq -r '.version' 2>/dev/null || echo "unknown")
        success "PlantUML plugin installed (version ${version})"
    else
        error "PlantUML plugin not installed"
        return 1
    fi

    if grep -q 'remarkSimplePlantuml' docusaurus.config.ts; then
        success "PlantUML plugin configured"
    else
        error "PlantUML plugin not configured in docusaurus.config.ts"
        return 1
    fi

    if grep -q 'PLANTUML_BASE_URL' docusaurus.config.ts; then
        success "PlantUML server URL configured"
    else
        warning "PlantUML server URL not configured"
    fi

    return 0
}

# Validate Mermaid plugin
validate_mermaid_plugin() {
    header "Validating Mermaid Plugin"

    if [[ -d "node_modules/@docusaurus/theme-mermaid" ]]; then
        local version=$(cat node_modules/@docusaurus/theme-mermaid/package.json | jq -r '.version' 2>/dev/null || echo "unknown")
        success "Mermaid theme installed (version ${version})"
    else
        error "Mermaid theme not installed"
        return 1
    fi

    if grep -q 'mermaid: true' docusaurus.config.ts; then
        success "Mermaid enabled"
    else
        warning "Mermaid not enabled in docusaurus.config.ts"
    fi

    if grep -q '@docusaurus/theme-mermaid' docusaurus.config.ts; then
        success "Mermaid theme loaded"
    else
        warning "Mermaid theme not loaded in docusaurus.config.ts"
    fi

    return 0
}

# Find PlantUML files
find_plantuml_files() {
    header "Finding PlantUML Files"

    # Find all .puml files in docs/context
    mapfile -t PLANTUML_FILES < <(find "${PROJECT_ROOT}/docs/context" -name '*.puml' 2>/dev/null || true)
    PLANTUML_COUNT=${#PLANTUML_FILES[@]}

    info "Found ${PLANTUML_COUNT} PlantUML files"

    if [[ $VERBOSE == true ]] && [[ $PLANTUML_COUNT -gt 0 ]]; then
        info "PlantUML files:"
        for file in "${PLANTUML_FILES[@]}"; do
            info "  - ${file#${PROJECT_ROOT}/}"
        done
    fi

    return 0
}

# Find Mermaid diagrams
find_mermaid_diagrams() {
    header "Finding Mermaid Diagrams"

    # Find all mermaid code blocks in markdown files
    MERMAID_COUNT=$(grep -r '```mermaid' "${PROJECT_ROOT}/docs/context" --include='*.md' 2>/dev/null | wc -l || echo "0")

    info "Found ${MERMAID_COUNT} Mermaid diagrams"

    return 0
}

# Validate PlantUML syntax
validate_plantuml_syntax() {
    header "Validating PlantUML Syntax"

    local valid_count=0
    local invalid_count=0

    for file in "${PLANTUML_FILES[@]}"; do
        local filename=$(basename "$file")

        # Check if file is readable
        if [[ ! -r "$file" ]]; then
            warning "Cannot read: ${filename}"
            ((invalid_count++))
            continue
        fi

        # Check if file is not empty
        if [[ ! -s "$file" ]]; then
            warning "Empty file: ${filename}"
            ((invalid_count++))
            continue
        fi

        # Check for @startuml
        if ! grep -q '@startuml' "$file"; then
            warning "Missing @startuml: ${filename}"
            ((invalid_count++))
            continue
        fi

        # Check for @enduml
        if ! grep -q '@enduml' "$file"; then
            warning "Missing @enduml: ${filename}"
            ((invalid_count++))
            continue
        fi

        success "Valid syntax: ${filename}"
        ((valid_count++))
    done

    info "Valid: ${valid_count}/${PLANTUML_COUNT}, Invalid: ${invalid_count}/${PLANTUML_COUNT}"

    if [[ $invalid_count -eq 0 ]]; then
        success "All PlantUML files have valid syntax"
        return 0
    else
        warning "Some PlantUML files have invalid syntax"
        return 1
    fi
}

# Test PlantUML server
test_plantuml_server() {
    header "Testing PlantUML Server"

    # Get PLANTUML_BASE_URL from .env or use default
    local plantuml_url="https://www.plantuml.com/plantuml/svg"
    if [[ -f "../../.env" ]]; then
        plantuml_url=$(grep '^PLANTUML_BASE_URL=' ../../.env | cut -d'=' -f2- || echo "$plantuml_url")
    fi

    # Test server with a simple diagram
    local test_url="${plantuml_url}/~1UDfSKh30AmFp0tlF1hSYdDimW980W00"
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$test_url")

    if [[ $http_code -eq 200 ]]; then
        success "PlantUML server accessible: ${plantuml_url}"
        return 0
    else
        warning "PlantUML server not accessible (${http_code}): ${plantuml_url}"
        info "Diagrams may not render. Consider using local PlantUML server."
        return 1
    fi
}

# Validate PlantUML rendering
validate_plantuml_rendering() {
    header "Validating PlantUML Rendering"

    # Find a documentation page with PlantUML diagram
    local plantuml_guide_page="http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide"

    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$plantuml_guide_page")
    if [[ $http_code -eq 200 ]]; then
        success "PlantUML guide page accessible"
    else
        warning "PlantUML guide page not accessible (${http_code})"
        return 1
    fi

    info "Please open http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide in browser"
    info "Expected behavior:"
    info "  1. PlantUML diagrams render as SVG images"
    info "  2. Diagrams are clear and readable"
    info "  3. No broken image icons"
    info "  4. Diagrams match .puml source files"
    info "Press Enter when PlantUML rendering validation is complete..."
    read -r

    return 0
}

# Validate Mermaid rendering
validate_mermaid_rendering() {
    header "Validating Mermaid Rendering"

    if [[ $MERMAID_COUNT -eq 0 ]]; then
        info "No Mermaid diagrams found in documentation"
        info "Mermaid support is enabled but not currently used"
        return 0
    fi

    # Find one markdown file containing mermaid
    local mermaid_file=$(grep -r '```mermaid' "${PROJECT_ROOT}/docs/context" --include='*.md' | head -1 | cut -d: -f1)
    if [[ -n "$mermaid_file" ]]; then
        # Map file path to URL (docs base path rules)
        local rel_path=${mermaid_file#${PROJECT_ROOT}/docs/context/}
        local mermaid_page="/docs/${rel_path%.md}"

        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}${mermaid_page}")
        if [[ $http_code -eq 200 ]]; then
            success "Mermaid page accessible: ${mermaid_page}"
        else
            warning "Mermaid page not accessible (${http_code}): ${mermaid_page}"
        fi

        info "Please open http://localhost:${PORT}${mermaid_page} in browser"
        info "Expected behavior:"
        info "  1. Mermaid diagrams render inline"
        info "  2. Diagrams are interactive (if applicable)"
        info "  3. Diagrams match markdown source"
        info "Press Enter when Mermaid rendering validation is complete..."
        read -r
    else
        info "No Mermaid diagrams found to validate"
    fi

    return 0
}

# Check diagram performance
check_diagram_performance() {
    header "Checking Diagram Performance"

    local plantuml_guide_page="http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide"

    # Measure page load time
    local start_time=$(date +%s.%3N)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$plantuml_guide_page")
    local end_time=$(date +%s.%3N)
    local load_time=$(awk "BEGIN {print $end_time - $start_time}" 2>/dev/null || echo "0")

    if [[ $http_code -eq 200 ]]; then
        if awk "BEGIN {exit !($load_time < 1.0)}"; then
            success "Page load with diagrams: ${load_time}s (fast)"
        elif awk "BEGIN {exit !($load_time < 2.0)}"; then
            success "Page load with diagrams: ${load_time}s (acceptable)"
        else
            warning "Page load with diagrams: ${load_time}s (slow)"
        fi
    else
        warning "Cannot measure diagram performance (page not accessible)"
    fi

    return 0
}

# Generate diagram report
generate_diagram_report() {
    header "Generating Diagram Report"

    local report_file="${DOCUSAURUS_DIR}/DIAGRAM-VALIDATION-${TIMESTAMP}.md"

    cat > "$report_file" << EOF
# Diagram Validation - Phase 4

**Timestamp:** ${TIMESTAMP}
**Server Port:** ${PORT}

## Plugin Status
- PlantUML Plugin: $([[ -d "node_modules/@akebifiky/remark-simple-plantuml" ]] && echo "Installed ($(cat node_modules/@akebifiky/remark-simple-plantuml/package.json | jq -r '.version' 2>/dev/null || echo "unknown"))" || echo "Not installed")
- PlantUML Configured: $(grep -q 'remarkSimplePlantuml' docusaurus.config.ts && echo "Yes" || echo "No")
- PlantUML Server URL: $(grep -q 'PLANTUML_BASE_URL' docusaurus.config.ts && echo "Configured" || echo "Not configured")
- Mermaid Plugin: $([[ -d "node_modules/@docusaurus/theme-mermaid" ]] && echo "Installed ($(cat node_modules/@docusaurus/theme-mermaid/package.json | jq -r '.version' 2>/dev/null || echo "unknown"))" || echo "Not installed")
- Mermaid Enabled: $(grep -q 'mermaid: true' docusaurus.config.ts && echo "Yes" || echo "No")
- Mermaid Theme: $(grep -q '@docusaurus/theme-mermaid' docusaurus.config.ts && echo "Loaded" || echo "Not loaded")

## PlantUML Files
- Total Files: ${PLANTUML_COUNT}
$(if [[ $VERBOSE == true ]] && [[ $PLANTUML_COUNT -gt 0 ]]; then
    echo "- Files:"
    for file in "${PLANTUML_FILES[@]}"; do
        local filename=$(basename "$file")
        local valid=true

        if [[ ! -r "$file" ]] || [[ ! -s "$file" ]] || ! grep -q '@startuml' "$file" || ! grep -q '@enduml' "$file"; then
            valid=false
        fi

        echo "  - ${filename}: $([[ $valid == true ]] && echo "Valid" || echo "Invalid")"
    done
else
    echo "- Validation: $(validate_plantuml_syntax >/dev/null 2>&1 && echo "All valid" || echo "Some invalid")"
fi)

## Mermaid Diagrams
- Total Diagrams: ${MERMAID_COUNT}
- Status: $([[ $MERMAID_COUNT -eq 0 ]] && echo "Not currently used" || echo "Present in documentation")

## PlantUML Server
- URL: $(grep '^PLANTUML_BASE_URL=' ../../.env 2>/dev/null | cut -d'=' -f2- || echo "https://www.plantuml.com/plantuml/svg (default)")
- Accessible: $(curl -s -o /dev/null -w "%{http_code}" "$(grep '^PLANTUML_BASE_URL=' ../../.env 2>/dev/null | cut -d'=' -f2- || echo "https://www.plantuml.com/plantuml/svg")/~1UDfSKh30AmFp0tlF1hSYdDimW980W00" | grep -q "200" && echo "Yes" || echo "No")

## Rendering Validation
- PlantUML Guide Page: $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide" | grep -q "200" && echo "Accessible" || echo "Not accessible")
- PlantUML Rendering: Manually validated
- Mermaid Rendering: $([[ $MERMAID_COUNT -eq 0 ]] && echo "Not applicable" || echo "Manually validated")

## Performance
- Page Load Time: $(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide" | grep -q "200"; then
    local start_time=$(date +%s.%3N)
    curl -s "http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide" > /dev/null
    local end_time=$(date +%s.%3N)
    local load_time=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
    echo "${load_time}s"
else
    echo "N/A"
fi)

## PlantUML Files List
$(if [[ $PLANTUML_COUNT -gt 0 ]]; then
    for file in "${PLANTUML_FILES[@]}"; do
        local rel_path=${file#${PROJECT_ROOT}/}
        local valid=true

        if [[ ! -r "$file" ]] || [[ ! -s "$file" ]] || ! grep -q '@startuml' "$file" || ! grep -q '@enduml' "$file"; then
            valid=false
        fi

        echo "- ${rel_path}: $([[ $valid == true ]] && echo "✅ Valid" || echo "❌ Invalid")"
    done
else
    echo "No PlantUML files found"
fi)

## Next Steps
1. Proceed to production build validation
2. Run: \`bash scripts/docs/validate-production-build.sh --verbose\`

---
*Generated by validate-diagrams.sh*
EOF

    success "Diagram report: $report_file"

    # Generate JSON report
    local json_file="${DOCUSAURUS_DIR}/DIAGRAM-VALIDATION-${TIMESTAMP}.json"

    cat > "$json_file" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "phase": "4",
  "validation": "diagrams",
  "server": {
    "port": ${PORT}
  },
  "plugins": {
    "plantuml": {
      "installed": $([[ -d "node_modules/@akebifiky/remark-simple-plantuml" ]] && echo "true" || echo "false"),
      "version": "$(cat node_modules/@akebifiky/remark-simple-plantuml/package.json 2>/dev/null | jq -r '.version' 2>/dev/null || echo "unknown")",
      "configured": $(grep -q 'remarkSimplePlantuml' docusaurus.config.ts && echo "true" || echo "false"),
      "server_url_configured": $(grep -q 'PLANTUML_BASE_URL' docusaurus.config.ts && echo "true" || echo "false")
    },
    "mermaid": {
      "installed": $([[ -d "node_modules/@docusaurus/theme-mermaid" ]] && echo "true" || echo "false"),
      "version": "$(cat node_modules/@docusaurus/theme-mermaid/package.json 2>/dev/null | jq -r '.version' 2>/dev/null || echo "unknown")",
      "enabled": $(grep -q 'mermaid: true' docusaurus.config.ts && echo "true" || echo "false"),
      "theme_loaded": $(grep -q '@docusaurus/theme-mermaid' docusaurus.config.ts && echo "true" || echo "false")
    }
  },
  "files": {
    "plantuml": {
      "count": ${PLANTUML_COUNT},
      "files": [
$(if [[ $PLANTUML_COUNT -gt 0 ]]; then
    for file in "${PLANTUML_FILES[@]}"; do
        local rel_path=${file#${PROJECT_ROOT}/}
        local valid=true

        if [[ ! -r "$file" ]] || [[ ! -s "$file" ]] || ! grep -q '@startuml' "$file" || ! grep -q '@enduml' "$file"; then
            valid=false
        fi

        echo "        {\"path\": \"${rel_path}\", \"valid\": ${valid}},"
    done | sed '$ s/,$//'
else
    echo ""
fi)
      ]
    },
    "mermaid": {
      "count": ${MERMAID_COUNT}
    }
  },
  "server": {
    "plantuml_url": "$(grep '^PLANTUML_BASE_URL=' ../../.env 2>/dev/null | cut -d'=' -f2- || echo "https://www.plantuml.com/plantuml/svg")",
    "accessible": $(curl -s -o /dev/null -w "%{http_code}" "$(grep '^PLANTUML_BASE_URL=' ../../.env 2>/dev/null | cut -d'=' -f2- || echo "https://www.plantuml.com/plantuml/svg")/~1UDfSKh30AmFp0tlF1hSYdDimW980W00" | grep -q "200" && echo "true" || echo "false")
  },
  "rendering": {
    "plantuml_guide_accessible": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide" | grep -q "200" && echo "true" || echo "false"),
    "plantuml_validated": true,
    "mermaid_applicable": $([[ $MERMAID_COUNT -gt 0 ]] && echo "true" || echo "false"),
    "mermaid_validated": $([[ $MERMAID_COUNT -gt 0 ]] && echo "true" || echo "false")
  },
  "performance": {
    "page_load_time": $(if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide" | grep -q "200"; then
        local start_time=$(date +%s.%3N)
        curl -s "http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide" > /dev/null
        local end_time=$(date +%s.%3N)
        echo "$end_time - $start_time" | bc 2>/dev/null || echo "null"
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

# Print diagram summary
print_diagram_summary() {
    header "Diagram Validation Summary"

    # PlantUML plugin
    if [[ -d "node_modules/@akebifiky/remark-simple-plantuml" ]]; then
        local version=$(cat node_modules/@akebifiky/remark-simple-plantuml/package.json | jq -r '.version' 2>/dev/null || echo "unknown")
        echo -e "${GREEN}PlantUML plugin:${NC} ✅ Installed (${version})"
    else
        echo -e "${GREEN}PlantUML plugin:${NC} ❌ Not installed"
    fi

    # Mermaid plugin
    if [[ -d "node_modules/@docusaurus/theme-mermaid" ]]; then
        local version=$(cat node_modules/@docusaurus/theme-mermaid/package.json | jq -r '.version' 2>/dev/null || echo "unknown")
        echo -e "${GREEN}Mermaid plugin:${NC} ✅ Installed (${version})"
    else
        echo -e "${GREEN}Mermaid plugin:${NC} ❌ Not installed"
    fi

    echo -e "${GREEN}PlantUML files:${NC} ${PLANTUML_COUNT} found"

    # PlantUML syntax validation
    local valid_count=0
    local invalid_count=0
    for file in "${PLANTUML_FILES[@]}"; do
        if [[ -r "$file" ]] && [[ -s "$file" ]] && grep -q '@startuml' "$file" && grep -q '@enduml' "$file"; then
            ((valid_count++))
        else
            ((invalid_count++))
        fi
    done
    echo -e "${GREEN}PlantUML syntax:${NC} ✅ ${valid_count} valid, ❌ ${invalid_count} invalid"

    # PlantUML server
    local plantuml_url=$(grep '^PLANTUML_BASE_URL=' ../../.env 2>/dev/null | cut -d'=' -f2- || echo "https://www.plantuml.com/plantuml/svg")
    local server_accessible=$(curl -s -o /dev/null -w "%{http_code}" "${plantuml_url}/~1UDfSKh30AmFp0tlF1hSYdDimW980W00" | grep -q "200" && echo "✅ Accessible" || echo "⚠️  Not accessible")
    echo -e "${GREEN}PlantUML server:${NC} ${server_accessible}"

    echo -e "${GREEN}PlantUML rendering:${NC} ✅ Validated"
    echo -e "${GREEN}Mermaid diagrams:${NC} ${MERMAID_COUNT} found"
    echo -e "${GREEN}Mermaid rendering:${NC} $([[ $MERMAID_COUNT -eq 0 ]] && echo "ℹ️  Not applicable" || echo "✅ Validated")"

    # Performance
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide" | grep -q "200"; then
        local load_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:${PORT}/docs/shared/diagrams/plantuml-guide")
        echo -e "${GREEN}Performance:${NC} ${load_time}s"
    else
        echo -e "${GREEN}Performance:${NC} N/A"
    fi

    echo ""
    echo -e "${CYAN}📄 Validation Report:${NC}"
    echo "  - DIAGRAM-VALIDATION-${TIMESTAMP}.md"
    echo "  - DIAGRAM-VALIDATION-${TIMESTAMP}.json"
    echo ""
    echo -e "${BLUE}✅ Diagram validation completed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Run production build validation: bash scripts/docs/validate-production-build.sh"
    echo "  2. Test production build and serve"
    echo "  3. Generate final restoration report"
}

# Main execution
main() {
    parse_arguments "$@"

    echo -e "${MAGENTA}📊 Diagram Validation - Phase 4${NC}"
    echo "================================="
    echo ""
    echo "Configuration:"
    echo "  Directory: ${DOCUSAURUS_DIR}"
    echo "  Port: ${PORT}"
    echo "  Verbose: ${VERBOSE}"
    echo ""

    cd "${DOCUSAURUS_DIR}"

    verify_server_running || exit 1
    validate_plantuml_plugin || exit 1
    validate_mermaid_plugin || exit 1
    find_plantuml_files
    find_mermaid_diagrams
    validate_plantuml_syntax
    test_plantuml_server
    validate_plantuml_rendering
    validate_mermaid_rendering
    check_diagram_performance
    generate_diagram_report
    print_diagram_summary

    exit 0
}

main "$@"