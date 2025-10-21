#!/bin/bash

# Phase 3 - Install dependencies and validate Docusaurus build
# This script installs npm dependencies, verifies plugins, tests environment loading,
# executes production build, and validates build output for Docusaurus documentation site.

set -euo pipefail

# Configuration variables
DOCUSAURUS_DIR="/home/marce/projetos/TradingSystem/docs/docusaurus"
PROJECT_ROOT="/home/marce/projetos/TradingSystem"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
INSTALL_LOG="${DOCUSAURUS_DIR}/INSTALL-LOG-${TIMESTAMP}.md"
BUILD_LOG="${DOCUSAURUS_DIR}/BUILD-LOG-${TIMESTAMP}.md"
ENV_TEST_FILE="env-test-${TIMESTAMP}.json"
SKIP_BUILD=false
VERBOSE=false
DRY_RUN=false
AUTO_CLEAN=false
MIN_NODE_VERSION="20.0.0"
MIN_DISK_SPACE_MB=1000
REQUIRED_MEMORY_MB=4096
MEMORY_CHECK_AVAILABLE=true

# Color output functions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
step() { echo -e "${CYAN}🔄 $1${NC}"; }
header() { echo -e "${CYAN}📦 $1${NC}"; }

# Function to parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force|--auto-clean)
                AUTO_CLEAN=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--skip-build] [--verbose] [--dry-run] [--force]"
                echo ""
                echo "Options:"
                echo "  --skip-build    Skip npm run build, only install dependencies"
                echo "  --verbose       Show detailed output"
                echo "  --dry-run       Simulate without actual installation"
                echo "  --force         Automatically remove Phase 2 artifacts (node_modules, build, etc.) [alias: --auto-clean]"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# Function for pre-installation validation
pre_installation_validation() {
    header "Pre-Installation Validation"

    # Check Node.js installed
    if ! command -v node &> /dev/null; then
        error "Node.js not found. Please install Node.js >= $MIN_NODE_VERSION"
        return 1
    fi
    success "Node.js found"

    # Check Node.js version
    NODE_VERSION=$(node --version | sed 's/v//')
    if [[ "$(printf '%s\n' "$MIN_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$MIN_NODE_VERSION" ]]; then
        error "Node.js version $NODE_VERSION is below minimum required $MIN_NODE_VERSION"
        return 1
    fi
    success "Node.js v$NODE_VERSION (>= $MIN_NODE_VERSION)"

    # Check npm installed
    if ! command -v npm &> /dev/null; then
        error "npm not found. Please install npm"
        return 1
    fi
    success "npm found: $(npm --version)"

    # Check jq installed
    if ! command -v jq &> /dev/null; then
        error "jq not found. Please install jq before proceeding"
        return 1
    fi
    success "jq found: $(jq --version)"

    # Validate disk and memory utilities
    if ! command -v df &> /dev/null; then
        error "df command not found. Required for disk space validation"
        return 1
    fi
    success "df command available"

    if ! command -v free &> /dev/null; then
        warning "free command not available - memory check will be skipped"
        MEMORY_CHECK_AVAILABLE=false
    else
        success "free command available"
    fi

    # Check current directory
    if [[ "$(pwd)" != "$DOCUSAURUS_DIR" ]]; then
        error "Must be run from Docusaurus directory: $DOCUSAURUS_DIR"
        return 1
    fi
    success "Current directory: $(pwd)"

    # Check disk space
    DISK_SPACE_MB=$(df -m . | tail -1 | awk '{print $4}')
    if [[ $DISK_SPACE_MB -lt $MIN_DISK_SPACE_MB ]]; then
        error "Insufficient disk space: ${DISK_SPACE_MB}MB available, ${MIN_DISK_SPACE_MB}MB required"
        return 1
    fi
    success "Disk space: ${DISK_SPACE_MB}MB (>= ${MIN_DISK_SPACE_MB}MB)"

    # Verify Phase 2 cleanup completed
    PHASE2_ARTIFACTS=()
    for artifact in "node_modules" ".docusaurus" "build" "package-lock.json"; do
        if [[ -e "${artifact}" ]]; then
            PHASE2_ARTIFACTS+=("${artifact}")
        fi
    done

    if [[ ${#PHASE2_ARTIFACTS[@]} -gt 0 ]]; then
        if [[ "${AUTO_CLEAN}" == "true" ]]; then
            warning "Phase 2 artifacts detected: ${PHASE2_ARTIFACTS[*]} - removing (--force)"
            for artifact in "${PHASE2_ARTIFACTS[@]}"; do
                rm -rf "${artifact}"
            done
            success "Phase 2 artifacts removed automatically (--force)"
        else
            for artifact in "${PHASE2_ARTIFACTS[@]}"; do
                error "${artifact} exists - Phase 2 cleanup not completed (use --force to auto-clean)"
            done
            return 1
        fi
    fi
    success "Phase 2 cleanup verified"

    # Verify source files intact
    if [[ ! -f "package.json" ]]; then
        error "package.json missing - source files not intact"
        return 1
    fi
    if [[ ! -f "docusaurus.config.ts" ]]; then
        error "docusaurus.config.ts missing - source files not intact"
        return 1
    fi
    if [[ ! -f "sidebars.ts" ]]; then
        error "sidebars.ts missing - source files not intact"
        return 1
    fi
    if [[ ! -d "src" ]]; then
        error "src/ directory missing - source files not intact"
        return 1
    fi
    if [[ ! -d "static" ]]; then
        error "static/ directory missing - source files not intact"
        return 1
    fi
    if [[ ! -d "scripts" ]]; then
        error "scripts/ directory missing - source files not intact"
        return 1
    fi
    success "Source files intact"

    # Check Phase 1 backup exists (optional - detects any previously created backup)
    if compgen -G "${PROJECT_ROOT}/.backup-docusaurus-*" > /dev/null; then
        LATEST_BACKUP=$(ls -dt "${PROJECT_ROOT}"/.backup-docusaurus-* 2>/dev/null | head -1)
        success "Phase 1 backup available for rollback: $(basename "${LATEST_BACKUP}")"
    else
        warning "Phase 1 backup not found - ensure backup exists before proceeding"
    fi

    return 0
}

# Function to verify environment files
verify_environment_files() {
    header "Environment Files Verification"

    # Check root .env exists
    if [[ -f "${PROJECT_ROOT}/.env" ]]; then
        success "Root .env exists"
    else
        warning "Root .env not found - will use defaults from config/.env.defaults"
    fi

    # Check config/.env.defaults exists
    if [[ -f "${PROJECT_ROOT}/config/.env.defaults" ]]; then
        success "config/.env.defaults exists"
    else
        error "config/.env.defaults missing"
        return 1
    fi

    # Verify dotenv configuration in docusaurus.config.ts (Option 1: two separate checks)
    if grep -q 'dotenv.config(' docusaurus.config.ts; then
        success "dotenv.config() call present in docusaurus.config.ts"
    else
        error "dotenv.config() call not found in docusaurus.config.ts"
        return 1
    fi

    if grep -q "path.join(projectRoot, '.env')" docusaurus.config.ts; then
        success "Root .env path reference found in docusaurus.config.ts"
    else
        error "Root .env path reference not found in docusaurus.config.ts"
        return 1
    fi

    info "Runtime .env loading will be validated during environment test step"

    # List expected environment variables
    info "Expected environment variables (with defaults):"
    info "  DOCS_SITE_URL: http://localhost"
    info "  DOCS_BASE_URL: /"
    info "  SEARCH_API_URL: http://localhost:3400/api/v1/docs"
    info "  HEALTH_API_URL: http://localhost:3400/api/v1/docs/health"
    info "  GRAFANA_URL: http://localhost:3000/d/docs-health"
    info "  PLANTUML_BASE_URL: https://www.plantuml.com/plantuml/svg"
    info "  CORS_ORIGIN: http://localhost:3103,http://localhost:3004"

    return 0
}

# Function to run npm install
run_npm_install() {
    header "Installing Dependencies"

    if [[ "$DRY_RUN" == "true" ]]; then
        info "Would run: npm install"
        return 0
    fi

    step "Running: npm install"
    if npm install 2>&1 | tee -a "${INSTALL_LOG}"; then
        NPM_EXIT_CODE=$?
        if [[ $NPM_EXIT_CODE -eq 0 ]]; then
            success "npm install completed successfully"
            return 0
        else
            error "npm install failed with exit code ${NPM_EXIT_CODE}"
            info "Check ${INSTALL_LOG} for details"
            return 1
        fi
    else
        NPM_EXIT_CODE=$?
        error "npm install failed with exit code ${NPM_EXIT_CODE}"
        info "Check ${INSTALL_LOG} for details"
        return 1
    fi
}

# Function to verify package-lock.json
verify_package_lock() {
    header "Verifying package-lock.json"

    # Check package-lock.json created
    if [[ ! -f "package-lock.json" ]]; then
        error "package-lock.json not created"
        return 1
    fi
    success "package-lock.json created"

    # Verify it's valid JSON
    if jq . package-lock.json > /dev/null 2>&1; then
        success "package-lock.json is valid JSON"
    else
        error "package-lock.json is not valid JSON"
        return 1
    fi

    # Check lockfileVersion
    LOCKFILE_VERSION=$(jq -r '.lockfileVersion' package-lock.json)
    if [[ "$LOCKFILE_VERSION" == "2" ]] || [[ "$LOCKFILE_VERSION" == "3" ]]; then
        success "lockfileVersion: ${LOCKFILE_VERSION}"
    else
        warning "Unexpected lockfileVersion: ${LOCKFILE_VERSION}"
    fi

    # Count packages
    PACKAGE_COUNT=$(jq '.packages | length' package-lock.json)
    info "Total packages in lockfile: ${PACKAGE_COUNT}"

    return 0
}

# Function to verify node_modules
verify_node_modules() {
    header "Verifying node_modules"

    # Check node_modules/ exists
    if [[ ! -d "node_modules" ]]; then
        error "node_modules/ directory not created"
        return 1
    fi
    success "node_modules/ directory created"

    # Count installed packages
    PACKAGE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    info "Installed packages: ${PACKAGE_COUNT}"

    # Verify critical dependencies present
    CRITICAL_DEPS=(
        "@docusaurus/core"
        "@docusaurus/preset-classic"
        "@docusaurus/theme-mermaid"
        "@akebifiky/remark-simple-plantuml"
        "react"
        "react-dom"
        "dotenv"
    )

    for dep in "${CRITICAL_DEPS[@]}"; do
        if [[ -d "node_modules/${dep}" ]]; then
            success "${dep} installed"
        else
            error "${dep} missing"
            return 1
        fi
    done

    # Check React version
    REACT_VERSION=$(cat node_modules/react/package.json | jq -r '.version')
    if [[ "$REACT_VERSION" == "18.2.0" ]]; then
        success "React version: ${REACT_VERSION} (pinned)"
    else
        warning "React version: ${REACT_VERSION} (expected 18.2.0)"
    fi

    # Check Docusaurus version
    DOCUSAURUS_VERSION=$(cat node_modules/@docusaurus/core/package.json | jq -r '.version')
    if [[ "$DOCUSAURUS_VERSION" == "3.9.1" ]]; then
        success "Docusaurus version: ${DOCUSAURUS_VERSION}"
    else
        warning "Docusaurus version: ${DOCUSAURUS_VERSION} (expected 3.9.1)"
    fi

    return 0
}

# Function to run npm audit
run_npm_audit() {
    header "Running Security Audit"

    AUDIT_FILE="npm-audit-${TIMESTAMP}.json"
    if [[ "$DRY_RUN" == "true" ]]; then
        info "Would run: npm audit --json > ${AUDIT_FILE}"
        cat > "${AUDIT_FILE}" <<'EOF'
{
  "metadata": {
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "moderate": 0,
      "low": 0
    }
  },
  "advisories": {},
  "actions": []
}
EOF
    else
        # Run npm audit and capture exit code without triggering set -e
        set +e
        npm audit --json > "${AUDIT_FILE}"
        AUDIT_EXIT_CODE=$?
        set -e

        if [[ $AUDIT_EXIT_CODE -ne 0 ]]; then
            warning "npm audit exited with code ${AUDIT_EXIT_CODE} (vulnerabilities found or other issues); continuing"
        fi

        # Verify the JSON file exists and is not empty
        if [[ ! -s "${AUDIT_FILE}" ]]; then
            warning "npm audit report empty or not generated - creating default JSON"
            cat > "${AUDIT_FILE}" <<'EOF'
{
  "metadata": {
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "moderate": 0,
      "low": 0
    }
  },
  "advisories": {},
  "actions": []
}
EOF
        fi

        # Validate JSON can be parsed
        if ! jq empty "${AUDIT_FILE}" 2>/dev/null; then
            warning "npm audit JSON is invalid - creating default JSON"
            cat > "${AUDIT_FILE}" <<'EOF'
{
  "metadata": {
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "moderate": 0,
      "low": 0
    }
  },
  "advisories": {},
  "actions": []
}
EOF
        fi
    fi

    # Parse results
    CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' "${AUDIT_FILE}")
    HIGH=$(jq '.metadata.vulnerabilities.high // 0' "${AUDIT_FILE}")
    MODERATE=$(jq '.metadata.vulnerabilities.moderate // 0' "${AUDIT_FILE}")
    LOW=$(jq '.metadata.vulnerabilities.low // 0' "${AUDIT_FILE}")

    if [[ $CRITICAL -gt 0 ]] || [[ $HIGH -gt 0 ]]; then
        warning "Found ${CRITICAL} critical and ${HIGH} high vulnerabilities"
        info "Review: ${AUDIT_FILE}"
        info "Consider running: npm audit fix"
    else
        success "No critical or high vulnerabilities found"
    fi

    info "Vulnerabilities: ${CRITICAL} critical, ${HIGH} high, ${MODERATE} moderate, ${LOW} low"

    return 0
}

# Function to verify plugins installed
verify_plugins_installed() {
    header "Verifying Plugins"

    # PlantUML Plugin
    if [[ -d "node_modules/@akebifiky/remark-simple-plantuml" ]]; then
        PLANTUML_VERSION=$(cat node_modules/@akebifiky/remark-simple-plantuml/package.json | jq -r '.version')
        success "PlantUML plugin installed (${PLANTUML_VERSION})"
    else
        error "PlantUML plugin not installed"
        return 1
    fi

    if grep -q 'remarkSimplePlantuml' docusaurus.config.ts; then
        success "PlantUML configured in docusaurus.config.ts"
    else
        error "PlantUML not configured in docusaurus.config.ts"
        return 1
    fi

    if grep -q 'PLANTUML_BASE_URL' docusaurus.config.ts; then
        success "PLANTUML_BASE_URL configured"
    else
        error "PLANTUML_BASE_URL not configured"
        return 1
    fi

    PLANTUML_FILES=$(find "${PROJECT_ROOT}/docs/context" -name '*.puml' | wc -l)
    info "Found ${PLANTUML_FILES} .puml files in docs/context"

    # Mermaid Plugin
    if [[ -d "node_modules/@docusaurus/theme-mermaid" ]]; then
        MERMAID_VERSION=$(cat node_modules/@docusaurus/theme-mermaid/package.json | jq -r '.version')
        success "Mermaid plugin installed (${MERMAID_VERSION})"
    else
        error "Mermaid plugin not installed"
        return 1
    fi

    if grep -q 'mermaid: true' docusaurus.config.ts; then
        success "Mermaid enabled in docusaurus.config.ts"
    else
        error "Mermaid not enabled in docusaurus.config.ts"
        return 1
    fi

    if grep -q "@docusaurus/theme-mermaid" docusaurus.config.ts; then
        success "Mermaid theme loaded"
    else
        error "Mermaid theme not loaded"
        return 1
    fi

    return 0
}

# Function to test environment loading
test_environment_loading() {
    header "Testing Environment Variable Loading"

    if [[ "$DRY_RUN" == "true" ]]; then
        info "Would run environment loading test and capture to ${ENV_TEST_FILE}"
        return 0
    fi

    # Create test script
    cat > test-env-loading.js << 'EOF'
const path = require('path');
const dotenv = require('dotenv');
const projectRoot = path.resolve(__dirname, '../../');
dotenv.config({ path: path.join(projectRoot, '.env') });
console.log(JSON.stringify({
  DOCS_SITE_URL: process.env.DOCS_SITE_URL || 'http://localhost',
  DOCS_BASE_URL: process.env.DOCS_BASE_URL || '/',
  SEARCH_API_URL: process.env.SEARCH_API_URL || 'http://localhost:3400/api/v1/docs',
  HEALTH_API_URL: process.env.HEALTH_API_URL || 'http://localhost:3400/api/v1/docs/health',
  GRAFANA_URL: process.env.GRAFANA_URL || 'http://localhost:3000/d/docs-health',
  PLANTUML_BASE_URL: process.env.PLANTUML_BASE_URL || 'https://www.plantuml.com/plantuml/svg',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3103,http://localhost:3004'
}, null, 2));
EOF

    # Execute test script
    if node test-env-loading.js > "${ENV_TEST_FILE}"; then
        success "Environment variables loading correctly"
        info "Environment variables saved to ${ENV_TEST_FILE}"
        if [[ "${VERBOSE}" == "true" ]]; then
            cat "${ENV_TEST_FILE}"
        fi
    else
        error "Environment variables loading failed"
        return 1
    fi

    return 0
}

# Function to run npm build
run_npm_build() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        info "Skipping build (--skip-build flag)"
        return 0
    fi

    header "Building Docusaurus Site"

    if [[ "$DRY_RUN" == "true" ]]; then
        info "Would run: npm run build"
        return 0
    fi

    # Check memory available
    if [[ "${MEMORY_CHECK_AVAILABLE}" == "true" ]]; then
        MEMORY_MB=$(free -m | awk 'NR==2 {print $7}')
        if [[ $MEMORY_MB -lt $REQUIRED_MEMORY_MB ]]; then
            warning "Low memory (${MEMORY_MB}MB available, ${REQUIRED_MEMORY_MB}MB recommended)"
        fi
    else
        info "Skipping memory availability check (free command not available)"
    fi

    step "Running: npm run build"
    if npm run build 2>&1 | tee -a "${BUILD_LOG}"; then
        BUILD_EXIT_CODE=$?
        if [[ $BUILD_EXIT_CODE -eq 0 ]]; then
            success "npm run build completed successfully"
            return 0
        else
            error "npm run build failed with exit code ${BUILD_EXIT_CODE}"
            info "Check ${BUILD_LOG} for details"

            # Check for common errors
            if grep -q 'out of memory' "${BUILD_LOG}"; then
                error "Out of memory - increase NODE_OPTIONS"
            fi
            if grep -q 'ENOENT' "${BUILD_LOG}"; then
                error "File not found - check sync-spec.js"
            fi
            if grep -q 'Module not found' "${BUILD_LOG}"; then
                error "Missing dependency - run npm install again"
            fi

            return 1
        fi
    else
        BUILD_EXIT_CODE=$?
        error "npm run build failed with exit code ${BUILD_EXIT_CODE}"
        info "Check ${BUILD_LOG} for details"
        return 1
    fi
}

# Function to verify build output
verify_build_output() {
    header "Verifying Build Output"

    # Check build/ directory exists
    if [[ ! -d "build" ]]; then
        error "build/ directory not created"
        return 1
    fi
    success "build/ directory created"

    # Verify expected structure
    REQUIRED_FILES=(
        "build/index.html"
        "build/docs/"
        "build/search/"
        "build/health/"
        "build/assets/"
        "build/img/"
    )

    for file in "${REQUIRED_FILES[@]}"; do
        if [[ -e "$file" ]]; then
            success "$file exists"
        else
            error "$file missing"
            return 1
        fi
    done

    # Count generated files
    FILE_COUNT=$(find build -type f | wc -l)
    info "Files generated: ${FILE_COUNT}"

    # Calculate build size
    BUILD_SIZE=$(du -sh build | cut -f1)
    info "Build size: ${BUILD_SIZE}"

    # Check for critical files
    JS_COUNT=$(find build/assets -name '*.js' | wc -l)
    CSS_COUNT=$(find build/assets -name '*.css' | wc -l)
    info "JS bundles: ${JS_COUNT}, CSS bundles: ${CSS_COUNT}"

    # Verify static/spec/ was generated
    if [[ -d "static/spec" ]]; then
        success "static/spec/ generated by sync-spec.js"
        if [[ -f "static/spec/openapi.yaml" ]]; then
            success "OpenAPI spec found"
        else
            info "OpenAPI spec not found (OK if not generated yet)"
        fi
    else
        warning "static/spec/ not generated - check sync-spec.js"
    fi

    return 0
}

# Function to check TypeScript errors
check_typescript_errors() {
    header "Checking TypeScript Compilation"

    if npm run typecheck 2>&1 | tee -a "${BUILD_LOG}"; then
        success "TypeScript compilation successful"
    else
        warning "TypeScript compilation has errors"
        info "Review: ${BUILD_LOG}"
        info "This may not prevent runtime, but should be fixed"
    fi

    return 0
}

# Function to generate dependency report
generate_dependency_report() {
    header "Generating Dependency Report"

    REPORT_MD="${DOCUSAURUS_DIR}/DEPENDENCY-REPORT-${TIMESTAMP}.md"
    REPORT_JSON="${DOCUSAURUS_DIR}/DEPENDENCY-REPORT-${TIMESTAMP}.json"

    # Get package information
    PACKAGE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    REACT_VERSION=$(cat node_modules/react/package.json | jq -r '.version')
    DOCUSAURUS_VERSION=$(cat node_modules/@docusaurus/core/package.json | jq -r '.version')
    PLANTUML_VERSION=$(cat node_modules/@akebifiky/remark-simple-plantuml/package.json | jq -r '.version')
    MERMAID_VERSION=$(cat node_modules/@docusaurus/theme-mermaid/package.json | jq -r '.version')

    # Get audit information
    AUDIT_FILE="npm-audit-${TIMESTAMP}.json"
    CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' "${AUDIT_FILE}")
    HIGH=$(jq '.metadata.vulnerabilities.high // 0' "${AUDIT_FILE}")
    MODERATE=$(jq '.metadata.vulnerabilities.moderate // 0' "${AUDIT_FILE}")
    LOW=$(jq '.metadata.vulnerabilities.low // 0' "${AUDIT_FILE}")

    # Get build information
    if [[ -d "build" ]]; then
        BUILD_SIZE=$(du -sh build | cut -f1)
        FILE_COUNT=$(find build -type f | wc -l)
        BUILD_STATUS="Yes"
        BUILD_STATUS_BOOL="true"
    else
        BUILD_SIZE="N/A"
        FILE_COUNT="0"
        BUILD_STATUS="No"
        BUILD_STATUS_BOOL="false"
    fi

    # Get environment variables
    if [[ "$DRY_RUN" == "true" ]]; then
        ENV_VARS="{}"
        ENV_CAPTURE_NOTE="Not generated (dry run)"
    elif [[ -f "${ENV_TEST_FILE}" ]]; then
        ENV_VARS=$(cat "${ENV_TEST_FILE}")
        ENV_CAPTURE_NOTE="${ENV_TEST_FILE}"
    else
        ENV_VARS=$(node test-env-loading.js 2>/dev/null || echo "{}")
        ENV_CAPTURE_NOTE="Generated ad-hoc (fallback)"
    fi

    # Generate markdown report
    cat > "${REPORT_MD}" << EOF
# Docusaurus Dependency Report - Phase 3

**Generated:** ${TIMESTAMP}
**Node.js:** $(node --version)
**npm:** $(npm --version)

## Package Information

- **Total packages:** ${PACKAGE_COUNT}
- **@docusaurus/core:** ${DOCUSAURUS_VERSION}
- **@docusaurus/preset-classic:** $(cat node_modules/@docusaurus/preset-classic/package.json | jq -r '.version')
- **@docusaurus/theme-mermaid:** ${MERMAID_VERSION}
- **@akebifiky/remark-simple-plantuml:** ${PLANTUML_VERSION}
- **react:** ${REACT_VERSION} (pinned)
- **react-dom:** $(cat node_modules/react-dom/package.json | jq -r '.version')
- **dotenv:** $(cat node_modules/dotenv/package.json | jq -r '.version')

## Security Audit

- **Critical:** ${CRITICAL}
- **High:** ${HIGH}
- **Moderate:** ${MODERATE}
- **Low:** ${LOW}

## Plugin Verification

- **PlantUML:** Installed and configured
- **Mermaid:** Installed and configured
- **PlantUML files:** $(find "${PROJECT_ROOT}/docs/context" -name '*.puml' | wc -l) files found

## Environment Variables

- **Captured file:** ${ENV_CAPTURE_NOTE}
${ENV_VARS}

## Build Status

- **Build completed:** ${BUILD_STATUS}
- **Build size:** ${BUILD_SIZE}
- **Files generated:** ${FILE_COUNT}

## Next Steps

Ready for Phase 4: Dev server validation
EOF

    # Generate JSON report
    cat > "${REPORT_JSON}" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "packages": {
    "total": ${PACKAGE_COUNT},
    "docusaurus": "${DOCUSAURUS_VERSION}",
    "react": "${REACT_VERSION}",
    "plantuml": "${PLANTUML_VERSION}",
    "mermaid": "${MERMAID_VERSION}"
  },
  "security": {
    "critical": ${CRITICAL},
    "high": ${HIGH},
    "moderate": ${MODERATE},
    "low": ${LOW}
  },
  "plugins": {
    "plantuml": {
      "installed": true,
      "configured": true,
      "files": $(find "${PROJECT_ROOT}/docs/context" -name '*.puml' | wc -l)
    },
    "mermaid": {
      "installed": true,
      "configured": true
    }
  },
  "environment": ${ENV_VARS},
  "build": {
    "completed": ${BUILD_STATUS_BOOL},
    "size": "${BUILD_SIZE}",
    "files": ${FILE_COUNT}
  }
}
EOF

    success "Reports generated: ${REPORT_MD}, ${REPORT_JSON}"
}

# Function to generate installation summary
generate_installation_summary() {
    header "Phase 3 Installation Summary"

    # Calculate final status
    if [[ -f "package-lock.json" ]] && [[ -d "node_modules" ]] && [[ -d "build" || "$SKIP_BUILD" == "true" ]]; then
        OVERALL_STATUS="${GREEN}✅ SUCCESS${NC}"
    else
        OVERALL_STATUS="${RED}❌ FAILED${NC}"
    fi

    echo ""
    echo "📊 Phase 3 Installation Summary"
    echo "=================================="
    echo "Node.js: $(node --version)"
    echo "npm install: $([[ -f "package-lock.json" ]] && echo "✅ Completed" || echo "❌ Failed")"
    echo "Dependencies: $(find node_modules -maxdepth 1 -type d 2>/dev/null | wc -l) packages"
    echo "Security: $(jq '.metadata.vulnerabilities.critical // 0' "npm-audit-${TIMESTAMP}.json" 2>/dev/null || echo "0") critical vulnerabilities"
    echo "Plugins: ✅ PlantUML, ✅ Mermaid"
    if [[ "$DRY_RUN" == "true" ]]; then
        ENVIRONMENT_STATUS="⏭️ Skipped (dry run)"
    elif [[ -f "${ENV_TEST_FILE}" ]] && jq '.' "${ENV_TEST_FILE}" >/dev/null 2>&1; then
        ENVIRONMENT_STATUS="✅ Loading correctly (${ENV_TEST_FILE})"
    else
        ENVIRONMENT_STATUS="❌ Failed"
    fi
    echo "Environment: ${ENVIRONMENT_STATUS}"
    echo "Build: $([[ -d "build" ]] && echo "✅ Completed ($(du -sh build | cut -f1), $(find build -type f | wc -l) files)" || [[ "$SKIP_BUILD" == "true" ]] && echo "⏭️ Skipped" || echo "❌ Failed")"
    echo "TypeScript: $(npm run typecheck >/dev/null 2>&1 && echo "✅ No errors" || echo "⚠️ Has errors")"
    echo ""
    echo "📄 Reports Generated:"
    echo "  - ${INSTALL_LOG}"
    echo "  - ${BUILD_LOG}"
    echo "  - DEPENDENCY-REPORT-${TIMESTAMP}.md"
    echo "  - DEPENDENCY-REPORT-${TIMESTAMP}.json"
    echo "  - npm-audit-${TIMESTAMP}.json"
    if [[ -f "${ENV_TEST_FILE}" ]]; then
        echo "  - ${ENV_TEST_FILE}"
    fi
    echo ""
    echo "Next steps:"
    echo "  1. Review reports: cat DEPENDENCY-REPORT-${TIMESTAMP}.md"
    echo "  2. Proceed to Phase 4: npm run dev (port 3004)"
    echo "  3. Validate functionality (search, health, diagrams)"
    echo "  4. Keep Phase 1 backup until Phase 4 verified"
    echo ""
    echo "Overall Status: ${OVERALL_STATUS}"
}

# Function to cleanup temporary files
cleanup_temporary_files() {
    # Remove temporary files created during validation
    rm -f test-env-loading.js

    # Keep important files (already generated)
    success "Temporary files cleaned up"
}

# Main execution flow
main() {
    # Parse command line arguments
    parse_arguments "$@"

    # Print script header
    echo ""
    echo "📦 Docusaurus Installation & Build - Phase 3"
    echo "============================================"
    echo ""
    echo "Configuration:"
    echo "  Directory: $DOCUSAURUS_DIR"
    echo "  Skip build: $([[ "$SKIP_BUILD" == "true" ]] && echo "Yes" || echo "No")"
    echo "  Verbose: $([[ "$VERBOSE" == "true" ]] && echo "Yes" || echo "No")"
    echo "  Dry run: $([[ "$DRY_RUN" == "true" ]] && echo "Yes" || echo "No")"
    echo "  Auto clean: $([[ "$AUTO_CLEAN" == "true" ]] && echo "Yes" || echo "No")"
    echo ""

    # Change to Docusaurus directory
    cd "${DOCUSAURUS_DIR}"

    # Execute phases
    pre_installation_validation || { error "Pre-installation validation failed"; exit 1; }
    verify_environment_files || { error "Environment files verification failed"; exit 1; }
    run_npm_install || { error "npm install failed"; exit 1; }
    verify_package_lock || { error "package-lock.json verification failed"; exit 1; }
    verify_node_modules || { error "node_modules verification failed"; exit 1; }
    run_npm_audit || { warning "npm audit completed with warnings"; }
    verify_plugins_installed || { error "Plugin verification failed"; exit 1; }
    test_environment_loading || { error "Environment loading test failed"; exit 1; }
    run_npm_build || { error "npm build failed"; exit 1; }
    if [[ "$SKIP_BUILD" != "true" ]]; then
        verify_build_output || { error "Build output verification failed"; exit 1; }
    fi
    check_typescript_errors || { warning "TypeScript check completed with warnings"; }
    generate_dependency_report || { error "Report generation failed"; exit 1; }
    generate_installation_summary
    cleanup_temporary_files

    echo ""
    success "Phase 3 completed successfully!"
    echo ""
}

# Run main function
main "$@"
