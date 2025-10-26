#!/bin/bash
# Docusaurus File Integrity Validation Script
# Purpose: Validates Docusaurus installation integrity before backup
# Usage: ./validate-docusaurus-integrity.sh [--verbose] [--json]

set -euo pipefail

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly DOCUSAURUS_DIR="${PROJECT_ROOT}/docs"
readonly TIMESTAMP=$(date +%Y%m%d-%H%M%S)
readonly VALIDATION_REPORT="${DOCUSAURUS_DIR}/VALIDATION-REPORT-${TIMESTAMP}.md"
readonly VALIDATION_JSON="${DOCUSAURUS_DIR}/VALIDATION-REPORT-${TIMESTAMP}.json"

# Flags
VERBOSE=false
JSON_OUTPUT=false

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Arrays for storing results
declare -a FAILED_ITEMS=()
declare -a WARNING_ITEMS=()

# Helper functions for colored output
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

verbose() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${BLUE}  → $1${NC}"
    fi
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--verbose] [--json]"
                echo ""
                echo "Options:"
                echo "  --verbose    Enable verbose output"
                echo "  --json       Generate JSON report in addition to markdown"
                echo "  --help       Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Check if file exists and calculate metadata
check_file_exists() {
    local file_path="$1"
    local description="$2"
    
    ((TOTAL_CHECKS++))
    
    if [[ -f "$file_path" ]]; then
        local size=$(stat -c%s "$file_path" 2>/dev/null || stat -f%z "$file_path" 2>/dev/null)
        local modified=$(stat -c%y "$file_path" 2>/dev/null || stat -f%Sm "$file_path" 2>/dev/null)
        local checksum=$(md5sum "$file_path" 2>/dev/null | awk '{print $1}' || md5 -q "$file_path" 2>/dev/null)
        
        ((PASSED_CHECKS++))
        success "$description: Present (${size} bytes)"
        verbose "Path: $file_path"
        verbose "Modified: $modified"
        verbose "MD5: $checksum"
        echo "| \`${file_path##*/}\` | ✅ Present | ${size} | ${modified} | ${checksum} |" >> "$VALIDATION_REPORT"
        return 0
    else
        ((FAILED_CHECKS++))
        FAILED_ITEMS+=("$description: $file_path")
        error "$description: Missing"
        echo "| \`${file_path##*/}\` | ❌ Missing | - | - | - |" >> "$VALIDATION_REPORT"
        return 1
    fi
}

# Check if directory exists
check_directory_exists() {
    local dir_path="$1"
    local description="$2"
    
    ((TOTAL_CHECKS++))
    
    if [[ -d "$dir_path" ]]; then
        local file_count=$(find "$dir_path" -type f 2>/dev/null | wc -l)
        local dir_size=$(du -sh "$dir_path" 2>/dev/null | awk '{print $1}')
        
        ((PASSED_CHECKS++))
        success "$description: Present (${file_count} files, ${dir_size})"
        verbose "Path: $dir_path"
        return 0
    else
        ((FAILED_CHECKS++))
        FAILED_ITEMS+=("$description: $dir_path")
        error "$description: Missing"
        return 1
    fi
}

# Validate package.json
validate_package_json() {
    info "Validating package.json dependencies..."
    echo "" >> "$VALIDATION_REPORT"
    echo "### package.json Validation" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    local pkg_file="${DOCUSAURUS_DIR}/package.json"
    
    # File existence already checked in main(), just verify it's still accessible
    if [[ ! -f "$pkg_file" ]]; then
        error "package.json not accessible"
        return 1
    fi
    
    # Validate JSON syntax
    ((TOTAL_CHECKS++))
    if jq . "$pkg_file" > /dev/null 2>&1; then
        ((PASSED_CHECKS++))
        success "package.json: Valid JSON syntax"
    else
        ((FAILED_CHECKS++))
        FAILED_ITEMS+=("package.json: Invalid JSON syntax")
        error "package.json: Invalid JSON syntax"
        return 1
    fi
    
    # Check required fields
    local required_fields=("name" "version" "dependencies" "devDependencies")
    for field in "${required_fields[@]}"; do
        ((TOTAL_CHECKS++))
        if jq -e ".$field" "$pkg_file" > /dev/null 2>&1; then
            ((PASSED_CHECKS++))
            verbose "package.json has field: $field"
        else
            ((FAILED_CHECKS++))
            FAILED_ITEMS+=("package.json missing field: $field")
            error "package.json missing field: $field"
        fi
    done
    
    # Verify critical dependencies with version checking
    local critical_deps=(
        "@docusaurus/core:3.9.1"
        "@docusaurus/preset-classic:3.9.1"
        "@akebifiky/remark-simple-plantuml"
        "react:18.2.0"
        "react-dom:18.2.0"
        "lucide-react"
        "gray-matter"
        "dotenv"
    )
    
    echo "" >> "$VALIDATION_REPORT"
    echo "**Critical Dependencies:**" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    for dep in "${critical_deps[@]}"; do
        local pkg_name="${dep%:*}"
        local expected_version="${dep#*:}"
        
        # If no expected version specified (name equals full string)
        if [[ "$pkg_name" == "$dep" ]]; then
            expected_version=""
        fi
        
        ((TOTAL_CHECKS++))
        
        # Check in dependencies first, then devDependencies
        local actual_version=""
        if jq -e ".dependencies.\"$pkg_name\"" "$pkg_file" > /dev/null 2>&1; then
            actual_version=$(jq -r ".dependencies.\"$pkg_name\"" "$pkg_file")
        elif jq -e ".devDependencies.\"$pkg_name\"" "$pkg_file" > /dev/null 2>&1; then
            actual_version=$(jq -r ".devDependencies.\"$pkg_name\"" "$pkg_file")
        fi
        
        if [[ -z "$actual_version" ]]; then
            ((FAILED_CHECKS++))
            FAILED_ITEMS+=("Missing dependency: $pkg_name")
            error "Missing dependency: $pkg_name"
            echo "- ❌ $pkg_name: Missing" >> "$VALIDATION_REPORT"
            continue
        fi
        
        # Version comparison if expected version is specified
        if [[ -n "$expected_version" ]]; then
            # Remove leading ^ or ~ from actual version for comparison
            local actual_clean="${actual_version#^}"
            actual_clean="${actual_clean#~}"
            
            # For exact version requirements (no ^ or ~)
            if [[ ! "$expected_version" =~ ^[\^~] ]]; then
                # Exact match required
                if [[ "$actual_clean" == "$expected_version" ]] || [[ "$actual_version" == "^$expected_version" ]] || [[ "$actual_version" == "~$expected_version" ]]; then
                    ((PASSED_CHECKS++))
                    success "Dependency version OK: $pkg_name ($actual_version)"
                    echo "- ✅ $pkg_name: $actual_version" >> "$VALIDATION_REPORT"
                else
                    ((FAILED_CHECKS++))
                    FAILED_ITEMS+=("Version mismatch: $pkg_name (expected $expected_version, got $actual_version)")
                    error "Version mismatch: $pkg_name (expected $expected_version, got $actual_version)"
                    echo "- ❌ $pkg_name: $actual_version (expected $expected_version)" >> "$VALIDATION_REPORT"
                fi
            else
                # Range version (^ or ~) - basic prefix match
                local expected_clean="${expected_version#^}"
                expected_clean="${expected_clean#~}"
                if [[ "$actual_clean" == "$expected_clean"* ]] || [[ "$actual_version" == "$expected_version" ]]; then
                    ((PASSED_CHECKS++))
                    success "Dependency version OK: $pkg_name ($actual_version)"
                    echo "- ✅ $pkg_name: $actual_version" >> "$VALIDATION_REPORT"
                else
                    ((FAILED_CHECKS++))
                    FAILED_ITEMS+=("Version mismatch: $pkg_name (expected $expected_version, got $actual_version)")
                    error "Version mismatch: $pkg_name (expected $expected_version, got $actual_version)"
                    echo "- ❌ $pkg_name: $actual_version (expected $expected_version)" >> "$VALIDATION_REPORT"
                fi
            fi
        else
            # No expected version, just check presence
            ((PASSED_CHECKS++))
            success "Dependency present: $pkg_name ($actual_version)"
            echo "- ✅ $pkg_name: $actual_version" >> "$VALIDATION_REPORT"
        fi
    done
    
    # Count total dependencies
    local dep_count=$(jq '.dependencies | length' "$pkg_file")
    info "Total dependencies: $dep_count"
    echo "" >> "$VALIDATION_REPORT"
    echo "**Total Dependencies**: $dep_count" >> "$VALIDATION_REPORT"
    
    return 0
}

# Validate docusaurus.config.ts
validate_docusaurus_config() {
    info "Validating docusaurus.config.ts..."
    echo "" >> "$VALIDATION_REPORT"
    echo "### docusaurus.config.ts Validation" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    local config_file="${DOCUSAURUS_DIR}/docusaurus.config.ts"
    
    if ! check_file_exists "$config_file" "docusaurus.config.ts"; then
        return 1
    fi
    
    # Verify root .env loading
    ((TOTAL_CHECKS++))
    if grep -q 'dotenv.config.*\.\./\.\./\.env' "$config_file"; then
        ((PASSED_CHECKS++))
        success "Root .env loading: Configured"
        echo "- ✅ Root .env loading configured (lines 8-10)" >> "$VALIDATION_REPORT"
    else
        ((FAILED_CHECKS++))
        FAILED_ITEMS+=("Root .env loading not configured")
        error "Root .env loading: Not configured"
        echo "- ❌ Root .env loading not configured" >> "$VALIDATION_REPORT"
    fi
    
    # Verify Mermaid support
    ((TOTAL_CHECKS++))
    if grep -q 'mermaid: true' "$config_file"; then
        ((PASSED_CHECKS++))
        success "Mermaid support: Enabled"
        echo "- ✅ Mermaid support enabled" >> "$VALIDATION_REPORT"
    else
        ((WARNINGS++))
        WARNING_ITEMS+=("Mermaid support not enabled")
        warning "Mermaid support: Not enabled"
        echo "- ⚠️  Mermaid support not enabled" >> "$VALIDATION_REPORT"
    fi
    
    # Verify PlantUML plugin
    ((TOTAL_CHECKS++))
    if grep -q 'remarkSimplePlantuml' "$config_file"; then
        ((PASSED_CHECKS++))
        success "PlantUML plugin: Configured"
        echo "- ✅ PlantUML plugin configured" >> "$VALIDATION_REPORT"
    else
        ((WARNINGS++))
        WARNING_ITEMS+=("PlantUML plugin not configured")
        warning "PlantUML plugin: Not configured"
        echo "- ⚠️  PlantUML plugin not configured" >> "$VALIDATION_REPORT"
    fi
    
    # Verify i18n config
    ((TOTAL_CHECKS++))
    if grep -q "defaultLocale: 'pt'" "$config_file"; then
        ((PASSED_CHECKS++))
        success "i18n config: Portuguese default"
        echo "- ✅ i18n configured (PT default)" >> "$VALIDATION_REPORT"
    else
        ((WARNINGS++))
        WARNING_ITEMS+=("i18n not configured with PT default")
        warning "i18n config: Not configured with PT default"
        echo "- ⚠️  i18n not configured with PT default" >> "$VALIDATION_REPORT"
    fi
    
    # Verify custom fields
    local custom_fields=("searchApiUrl" "healthApiUrl" "grafanaUrl")
    for field in "${custom_fields[@]}"; do
        ((TOTAL_CHECKS++))
        if grep -q "$field" "$config_file"; then
            ((PASSED_CHECKS++))
            verbose "Custom field present: $field"
        else
            ((WARNINGS++))
            WARNING_ITEMS+=("Custom field missing: $field")
            warning "Custom field missing: $field"
        fi
    done
    
    return 0
}

# Validate custom components
validate_custom_components() {
    info "Validating custom components..."
    echo "" >> "$VALIDATION_REPORT"
    echo "### Custom Components Validation" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    local components_dir="${DOCUSAURUS_DIR}/src/components"
    
    if ! check_directory_exists "$components_dir" "Components directory"; then
        return 1
    fi
    
    # Expected components
    local expected_components=(
        "ApiEndpoint"
        "CodeBlock"
        "FacetFilters"
        "HealthMetricsCard"
        "HomepageFeatures"
        "SearchBar"
        "Tabs"
    )
    
    local expected_files=(
        "CookiesBanner.tsx"
        "CopyButton.tsx"
    )
    
    # Components that require styles.module.css
    local components_requiring_styles=(
        "ApiEndpoint"
        "FacetFilters"
        "HealthMetricsCard"
        "HomepageFeatures"
        "SearchBar"
    )
    
    echo "**Component Directories:**" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    for component in "${expected_components[@]}"; do
        local component_dir="${components_dir}/${component}"
        ((TOTAL_CHECKS++))
        if [[ -d "$component_dir" ]]; then
            ((PASSED_CHECKS++))
            success "Component directory: $component"
            echo "- ✅ $component/" >> "$VALIDATION_REPORT"
            
            # Check for index.tsx
            if [[ -f "${component_dir}/index.tsx" ]]; then
                verbose "  index.tsx present"
            else
                ((WARNINGS++))
                WARNING_ITEMS+=("Component missing index.tsx: $component")
                warning "  index.tsx missing in $component"
            fi
        else
            ((FAILED_CHECKS++))
            FAILED_ITEMS+=("Component directory missing: $component")
            error "Component directory: $component missing"
            echo "- ❌ $component/ (missing)" >> "$VALIDATION_REPORT"
        fi
    done
    
    echo "" >> "$VALIDATION_REPORT"
    echo "**Component Styles:**" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    # Check for required styles.module.css files
    for component in "${components_requiring_styles[@]}"; do
        local component_dir="${components_dir}/${component}"
        local styles_file="${component_dir}/styles.module.css"
        
        ((TOTAL_CHECKS++))
        if [[ -f "$styles_file" ]]; then
            ((PASSED_CHECKS++))
            success "Component styles: $component/styles.module.css"
            echo "- ✅ $component/styles.module.css" >> "$VALIDATION_REPORT"
        else
            if [[ -d "$component_dir" ]]; then
                ((WARNINGS++))
                WARNING_ITEMS+=("Component missing required styles: $component/styles.module.css")
                warning "Component missing required styles: $component/styles.module.css"
                echo "- ⚠️  $component/styles.module.css (missing - required per documentation)" >> "$VALIDATION_REPORT"
            fi
        fi
    done
    
    echo "" >> "$VALIDATION_REPORT"
    echo "**Component Files:**" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    for file in "${expected_files[@]}"; do
        local file_path="${components_dir}/${file}"
        ((TOTAL_CHECKS++))
        if [[ -f "$file_path" ]]; then
            ((PASSED_CHECKS++))
            success "Component file: $file"
            echo "- ✅ $file" >> "$VALIDATION_REPORT"
        else
            ((FAILED_CHECKS++))
            FAILED_ITEMS+=("Component file missing: $file")
            error "Component file: $file missing"
            echo "- ❌ $file (missing)" >> "$VALIDATION_REPORT"
        fi
    done
    
    return 0
}

# Validate theme overrides
validate_theme_overrides() {
    info "Validating theme overrides..."
    echo "" >> "$VALIDATION_REPORT"
    echo "### Theme Overrides Validation" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    local theme_dir="${DOCUSAURUS_DIR}/src/theme"
    
    if ! check_directory_exists "$theme_dir" "Theme directory"; then
        return 1
    fi
    
    # Expected theme overrides
    local theme_overrides=(
        "Layout/index.tsx"
        "SearchBar/index.tsx"
        "SearchBar/styles.module.css"
    )
    
    for override in "${theme_overrides[@]}"; do
        local override_path="${theme_dir}/${override}"
        ((TOTAL_CHECKS++))
        if [[ -f "$override_path" ]]; then
            ((PASSED_CHECKS++))
            success "Theme override: $override"
            echo "- ✅ $override" >> "$VALIDATION_REPORT"
        else
            ((FAILED_CHECKS++))
            FAILED_ITEMS+=("Theme override missing: $override")
            error "Theme override: $override missing"
            echo "- ❌ $override (missing)" >> "$VALIDATION_REPORT"
        fi
    done
    
    return 0
}

# Validate custom pages
validate_custom_pages() {
    info "Validating custom pages..."
    echo "" >> "$VALIDATION_REPORT"
    echo "### Custom Pages Validation" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    local pages_dir="${DOCUSAURUS_DIR}/src/pages"
    
    if ! check_directory_exists "$pages_dir" "Pages directory"; then
        return 1
    fi
    
    # Expected pages
    local expected_pages=(
        "index.tsx"
        "health/index.tsx"
        "search/index.tsx"
        "spec/index.tsx"
    )
    
    for page in "${expected_pages[@]}"; do
        local page_path="${pages_dir}/${page}"
        ((TOTAL_CHECKS++))
        if [[ -f "$page_path" ]]; then
            ((PASSED_CHECKS++))
            success "Custom page: $page"
            echo "- ✅ $page" >> "$VALIDATION_REPORT"
        else
            ((WARNINGS++))
            WARNING_ITEMS+=("Custom page missing: $page")
            warning "Custom page: $page missing"
            echo "- ⚠️  $page (missing)" >> "$VALIDATION_REPORT"
        fi
    done
    
    return 0
}

# Validate static assets
validate_static_assets() {
    info "Validating static assets..."
    echo "" >> "$VALIDATION_REPORT"
    echo "### Static Assets Validation" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    local static_dir="${DOCUSAURUS_DIR}/static"
    
    if ! check_directory_exists "$static_dir" "Static directory"; then
        return 1
    fi
    
    # Expected images
    local expected_images=(
        "img/logo.svg"
        "img/logo-dark.svg"
        "img/favicon.svg"
        "img/favicon.ico"
    )
    
    echo "**Critical Images:**" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    for image in "${expected_images[@]}"; do
        local image_path="${static_dir}/${image}"
        ((TOTAL_CHECKS++))
        if [[ -f "$image_path" ]]; then
            ((PASSED_CHECKS++))
            success "Static asset: $image"
            echo "- ✅ $image" >> "$VALIDATION_REPORT"
        else
            ((FAILED_CHECKS++))
            FAILED_ITEMS+=("Static asset missing: $image")
            error "Static asset: $image missing"
            echo "- ❌ $image (missing)" >> "$VALIDATION_REPORT"
        fi
    done
    
    # Count total images
    local total_images=$(find "${static_dir}/img" -type f 2>/dev/null | wc -l)
    info "Total images found: $total_images"
    echo "" >> "$VALIDATION_REPORT"
    echo "**Total Images**: $total_images" >> "$VALIDATION_REPORT"
    
    return 0
}

# Validate scripts
validate_scripts() {
    info "Validating scripts..."
    echo "" >> "$VALIDATION_REPORT"
    echo "### Scripts Validation" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    local scripts_dir="${DOCUSAURUS_DIR}/scripts"
    
    if [[ ! -d "$scripts_dir" ]]; then
        ((WARNINGS++))
        WARNING_ITEMS+=("Scripts directory not found")
        warning "Scripts directory: Not found"
        echo "- ⚠️  scripts/ directory not found" >> "$VALIDATION_REPORT"
        return 0
    fi
    
    check_directory_exists "$scripts_dir" "Scripts directory"
    
    # Expected scripts
    local expected_scripts=(
        "sync-spec.js"
    )
    
    for script in "${expected_scripts[@]}"; do
        local script_path="${scripts_dir}/${script}"
        ((TOTAL_CHECKS++))
        if [[ -f "$script_path" && -r "$script_path" ]]; then
            ((PASSED_CHECKS++))
            success "Script: $script"
            echo "- ✅ $script (readable)" >> "$VALIDATION_REPORT"
        else
            ((WARNINGS++))
            WARNING_ITEMS+=("Script missing or not readable: $script")
            warning "Script: $script missing or not readable"
            echo "- ⚠️  $script (missing or not readable)" >> "$VALIDATION_REPORT"
        fi
    done
    
    return 0
}

# Generate state snapshot to prevent drift
generate_state_snapshot() {
    info "Generating state snapshot..."
    
    local snapshot_file="${DOCUSAURUS_DIR}/STATE-SNAPSHOT.md"
    local pkg_file="${DOCUSAURUS_DIR}/package.json"
    local config_file="${DOCUSAURUS_DIR}/docusaurus.config.ts"
    
    cat > "$snapshot_file" << EOF
# Docusaurus State Snapshot

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Purpose**: Machine-generated snapshot of current configuration state  
**Reference**: Use this to verify configuration matches documentation

---

## Core Dependencies

Extracted from package.json:

EOF
    
    # Extract core dependency versions
    local core_deps=(
        "@docusaurus/core"
        "@docusaurus/preset-classic"
        "@docusaurus/theme-mermaid"
        "@akebifiky/remark-simple-plantuml"
        "react"
        "react-dom"
        "@mdx-js/react"
        "lucide-react"
        "gray-matter"
        "dotenv"
    )
    
    echo "| Package | Version |" >> "$snapshot_file"
    echo "|---------|---------|" >> "$snapshot_file"
    
    for dep in "${core_deps[@]}"; do
        if jq -e ".dependencies.\"$dep\"" "$pkg_file" > /dev/null 2>&1; then
            local version=$(jq -r ".dependencies.\"$dep\"" "$pkg_file")
            echo "| $dep | $version |" >> "$snapshot_file"
        elif jq -e ".devDependencies.\"$dep\"" "$pkg_file" > /dev/null 2>&1; then
            local version=$(jq -r ".devDependencies.\"$dep\"" "$pkg_file")
            echo "| $dep | $version (dev) |" >> "$snapshot_file"
        else
            echo "| $dep | ❌ Not found |" >> "$snapshot_file"
        fi
    done
    
    cat >> "$snapshot_file" << EOF

---

## Configuration Flags

Extracted from docusaurus.config.ts:

EOF
    
    # Extract configuration flags
    echo "| Setting | Status | Details |" >> "$snapshot_file"
    echo "|---------|--------|---------|" >> "$snapshot_file"
    
    # Root .env loading
    if grep -q 'dotenv.config.*\.\./\.\./\.env' "$config_file"; then
        echo "| Root .env loading | ✅ Configured | Lines 8-10 |" >> "$snapshot_file"
    else
        echo "| Root .env loading | ❌ Not configured | - |" >> "$snapshot_file"
    fi
    
    # Mermaid support
    if grep -q 'mermaid: true' "$config_file"; then
        echo "| Mermaid diagrams | ✅ Enabled | markdown.mermaid = true |" >> "$snapshot_file"
    else
        echo "| Mermaid diagrams | ❌ Disabled | - |" >> "$snapshot_file"
    fi
    
    # PlantUML plugin
    if grep -q 'remarkSimplePlantuml' "$config_file"; then
        echo "| PlantUML diagrams | ✅ Enabled | remarkPlugins includes remarkSimplePlantuml |" >> "$snapshot_file"
    else
        echo "| PlantUML diagrams | ❌ Disabled | - |" >> "$snapshot_file"
    fi
    
    # i18n default locale
    if grep -q "defaultLocale: 'pt'" "$config_file"; then
        echo "| i18n default locale | ✅ Portuguese | defaultLocale: 'pt' |" >> "$snapshot_file"
    else
        echo "| i18n default locale | ⚠️ Not PT | Check config |" >> "$snapshot_file"
    fi
    
    # i18n available locales
    if grep -q "locales: \['pt', 'en'\]" "$config_file"; then
        echo "| i18n locales | ✅ PT, EN | locales: ['pt', 'en'] |" >> "$snapshot_file"
    else
        echo "| i18n locales | ⚠️ Check config | - |" >> "$snapshot_file"
    fi
    
    cat >> "$snapshot_file" << EOF

---

## Custom Fields

Extracted from docusaurus.config.ts customFields:

EOF
    
    echo "| Field | Status |" >> "$snapshot_file"
    echo "|-------|--------|" >> "$snapshot_file"
    
    local custom_fields=("searchApiUrl" "healthApiUrl" "grafanaUrl")
    for field in "${custom_fields[@]}"; do
        if grep -q "$field" "$config_file"; then
            echo "| $field | ✅ Defined |" >> "$snapshot_file"
        else
            echo "| $field | ❌ Not defined |" >> "$snapshot_file"
        fi
    done
    
    cat >> "$snapshot_file" << EOF

---

## Environment Variables Referenced

From docusaurus.config.ts:

EOF
    
    echo "| Variable | Default Value |" >> "$snapshot_file"
    echo "|----------|---------------|" >> "$snapshot_file"
    
    # Extract environment variable references
    if grep -q 'DOCS_SITE_URL' "$config_file"; then
        local default=$(grep 'DOCS_SITE_URL' "$config_file" | grep -o "'http[^']*'" | head -1 || echo "'http://localhost'")
        echo "| DOCS_SITE_URL | $default |" >> "$snapshot_file"
    fi
    
    if grep -q 'SEARCH_API_URL' "$config_file"; then
        local default=$(grep 'SEARCH_API_URL' "$config_file" | grep -o "'http[^']*'" | head -1 || echo "'http://localhost:3400/api/v1/docs'")
        echo "| SEARCH_API_URL | $default |" >> "$snapshot_file"
    fi
    
    if grep -q 'HEALTH_API_URL' "$config_file"; then
        local default=$(grep 'HEALTH_API_URL' "$config_file" | grep -o "'http[^']*'" | head -1 || echo "'http://localhost:3400/api/v1/docs/health'")
        echo "| HEALTH_API_URL | $default |" >> "$snapshot_file"
    fi
    
    if grep -q 'GRAFANA_URL' "$config_file"; then
        local default=$(grep 'GRAFANA_URL' "$config_file" | grep -o "'http[^']*'" | head -1 || echo "'http://localhost:3000/d/docs-health'")
        echo "| GRAFANA_URL | $default |" >> "$snapshot_file"
    fi
    
    if grep -q 'PLANTUML_BASE_URL' "$config_file"; then
        local default=$(grep 'PLANTUML_BASE_URL' "$config_file" | grep -o "'http[^']*'" | head -1 || echo "'https://www.plantuml.com/plantuml/svg'")
        echo "| PLANTUML_BASE_URL | $default |" >> "$snapshot_file"
    fi
    
    cat >> "$snapshot_file" << EOF

---

## Usage

This snapshot is automatically generated during validation and provides:

1. **Current dependency versions** - Compare with RESTORATION-REPORT.md to detect drift
2. **Configuration flags** - Verify critical features are enabled
3. **Custom fields** - Ensure integrations are configured
4. **Environment variables** - Document expected values and defaults

**Note**: This file is regenerated on each validation run. Do not edit manually.

---

**Snapshot Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Validation Script**: scripts/docs/validate-docusaurus-integrity.sh
EOF
    
    success "State snapshot generated: ${snapshot_file}"
    info "Reference this file in RESTORATION-REPORT.md for accurate current state"
    
    return 0
}

# Check build artifacts
check_build_artifacts() {
    info "Checking build artifacts..."
    echo "" >> "$VALIDATION_REPORT"
    echo "### Build Artifacts Status" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    echo "**Note**: These will be excluded from backup" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    
    local artifacts=(
        "node_modules"
        ".docusaurus"
        "build"
        "package-lock.json"
    )
    
    for artifact in "${artifacts[@]}"; do
        local artifact_path="${DOCUSAURUS_DIR}/${artifact}"
        if [[ -e "$artifact_path" ]]; then
            local size=$(du -sh "$artifact_path" 2>/dev/null | awk '{print $1}')
            info "Build artifact found: $artifact ($size)"
            echo "- ℹ️  $artifact ($size) - Will be excluded" >> "$VALIDATION_REPORT"
        else
            verbose "Build artifact not found: $artifact (OK - will be generated later)"
            echo "- ℹ️  $artifact (not present)" >> "$VALIDATION_REPORT"
        fi
    done
    
    return 0
}

# Generate validation report
generate_validation_report() {
    info "Generating validation report..."
    
    # Report header
    cat > "$VALIDATION_REPORT" << EOF
# Docusaurus Validation Report

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Script**: scripts/docs/validate-docusaurus-integrity.sh  
**Docusaurus Directory**: ${DOCUSAURUS_DIR}

---

## Validation Summary

| Metric | Value |
|--------|-------|
| Total Checks | ${TOTAL_CHECKS} |
| Passed | ${PASSED_CHECKS} ✅ |
| Failed | ${FAILED_CHECKS} ❌ |
| Warnings | ${WARNINGS} ⚠️  |

EOF

    if [[ ${FAILED_CHECKS} -eq 0 ]]; then
        echo "**Status**: ✅ All validations passed" >> "$VALIDATION_REPORT"
    else
        echo "**Status**: ❌ Validation failed (${FAILED_CHECKS} critical issues)" >> "$VALIDATION_REPORT"
    fi
    
    echo "" >> "$VALIDATION_REPORT"
    echo "---" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    echo "## Critical Files Integrity" >> "$VALIDATION_REPORT"
    echo "" >> "$VALIDATION_REPORT"
    echo "| File | Status | Size | Modified | MD5 |" >> "$VALIDATION_REPORT"
    echo "|------|--------|------|----------|-----|" >> "$VALIDATION_REPORT"
}

# Print summary to console
print_summary() {
    echo ""
    echo "======================================"
    echo "📊 Validation Summary"
    echo "======================================"
    echo ""
    echo "Total checks: ${TOTAL_CHECKS}"
    success "Passed: ${PASSED_CHECKS}"
    if [[ ${FAILED_CHECKS} -gt 0 ]]; then
        error "Failed: ${FAILED_CHECKS}"
    fi
    if [[ ${WARNINGS} -gt 0 ]]; then
        warning "Warnings: ${WARNINGS}"
    fi
    echo ""
    
    if [[ ${FAILED_CHECKS} -gt 0 ]]; then
        echo "❌ Failed Items:"
        for item in "${FAILED_ITEMS[@]}"; do
            error "  - $item"
        done
        echo ""
    fi
    
    if [[ ${WARNINGS} -gt 0 ]]; then
        echo "⚠️  Warning Items:"
        for item in "${WARNING_ITEMS[@]}"; do
            warning "  - $item"
        done
        echo ""
    fi
    
    if [[ ${FAILED_CHECKS} -eq 0 ]]; then
        success "✅ All validations passed! Ready for backup."
    else
        error "❌ Validation failed. Please fix critical issues before proceeding."
    fi
    
    echo ""
    echo "📄 Detailed report: ${VALIDATION_REPORT}"
    
    if [[ "$JSON_OUTPUT" == true ]]; then
        echo "📄 JSON report: ${VALIDATION_JSON}"
    fi
    echo ""
}

# Generate JSON report
generate_json_report() {
    if [[ "$JSON_OUTPUT" != true ]]; then
        return 0
    fi
    
    # Generate JSON arrays safely (handle empty arrays)
    local failed_json
    if [ ${#FAILED_ITEMS[@]} -eq 0 ]; then
        failed_json='[]'
    else
        failed_json=$(printf '%s\n' "${FAILED_ITEMS[@]}" | jq -R . | jq -s .)
    fi
    
    local warnings_json
    if [ ${#WARNING_ITEMS[@]} -eq 0 ]; then
        warnings_json='[]'
    else
        warnings_json=$(printf '%s\n' "${WARNING_ITEMS[@]}" | jq -R . | jq -s .)
    fi
    
    # Write JSON report
    cat > "$VALIDATION_JSON" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "docusaurusDir": "${DOCUSAURUS_DIR}",
  "summary": {
    "totalChecks": ${TOTAL_CHECKS},
    "passed": ${PASSED_CHECKS},
    "failed": ${FAILED_CHECKS},
    "warnings": ${WARNINGS},
    "status": "$([ ${FAILED_CHECKS} -eq 0 ] && echo "passed" || echo "failed")"
  },
  "failedItems": ${failed_json},
  "warningItems": ${warnings_json}
}
EOF
    
    # Validate generated JSON
    if jq . "$VALIDATION_JSON" > /dev/null 2>&1; then
        verbose "JSON report validated successfully"
    else
        error "Generated JSON is invalid"
        return 1
    fi
}

# Main execution
main() {
    echo "🔍 Validating Docusaurus Installation Integrity"
    echo "================================================"
    echo ""
    
    parse_arguments "$@"
    
    # Change to Docusaurus directory
    if [[ ! -d "$DOCUSAURUS_DIR" ]]; then
        error "Docusaurus directory not found: $DOCUSAURUS_DIR"
        exit 1
    fi
    
    cd "$DOCUSAURUS_DIR"
    
    # Initialize report
    generate_validation_report
    
    # Validate critical files (must come first to appear in the critical files table)
    info "Validating critical files..."
    check_file_exists "${DOCUSAURUS_DIR}/package.json" "package.json"
    check_file_exists "${DOCUSAURUS_DIR}/docusaurus.config.ts" "docusaurus.config.ts"
    check_file_exists "${DOCUSAURUS_DIR}/sidebars.ts" "sidebars.ts"
    check_file_exists "${DOCUSAURUS_DIR}/tsconfig.json" "tsconfig.json"
    check_file_exists "${DOCUSAURUS_DIR}/.gitignore" ".gitignore"
    check_file_exists "${DOCUSAURUS_DIR}/README.md" "README.md"
    
    # Run validation functions
    validate_package_json
    validate_docusaurus_config
    validate_custom_components
    validate_theme_overrides
    validate_custom_pages
    validate_static_assets
    validate_scripts
    check_build_artifacts
    
    # Generate state snapshot to prevent drift
    generate_state_snapshot
    
    # Generate reports
    generate_json_report
    print_summary
    
    # Exit with appropriate code
    if [[ ${FAILED_CHECKS} -gt 0 ]]; then
        exit 1
    elif [[ ${WARNINGS} -gt 0 ]]; then
        exit 2
    else
        exit 0
    fi
}

# Run main function
main "$@"
