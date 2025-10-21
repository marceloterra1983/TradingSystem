#!/bin/bash

# Documentation Audit Orchestration Script
#
# Master script to run complete documentation audit with all validation checks.
# Executes all audit scripts in sequence and generates final markdown report.
#
# Usage:
#   bash scripts/docs/audit-documentation.sh \
#     --docs-dir ./docs/context \
#     --output ./docs/reports/2025-10-17-documentation-audit.md \
#     --skip-external-links \
#     --verbose

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SCRIPT_NAME="$(basename "$0")"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Default values
DOCS_DIR="${PROJECT_ROOT}/docs/context ${PROJECT_ROOT}/docs/docusaurus"
OUTPUT_DIR="${PROJECT_ROOT}/docs/reports"
OUTPUT_FILE=""
TEMP_DIR="/tmp/docs-audit-${TIMESTAMP}"
SKIP_EXTERNAL_LINKS=false
VERBOSE=false
FRONTMATTER_THRESHOLD=90
TITLE_THRESHOLD=0.8
SUMMARY_THRESHOLD=0.7
HTTP_TIMEOUT=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Print usage information
print_usage() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Runs complete documentation audit with all validation checks.

OPTIONS:
    --docs-dir PATH          Documentation directory to scan (default: ./docs/context and ./docs/docusaurus). Provide a single path or a space-separated list in quotes.
    --output PATH            Output markdown report file (default: ./docs/reports/YYYY-MM-DD-documentation-audit.md)
    --skip-external-links    Skip external link validation (faster execution)
    --threshold-days N       Days threshold for outdated documents (default: 90)
    --title-threshold N      Title similarity threshold 0.0-1.0 (default: 0.8)
    --summary-threshold N    Summary similarity threshold 0.0-1.0 (default: 0.7)
    --timeout N              HTTP request timeout in seconds (default: 5)
    --verbose, -v            Enable verbose logging
    --help, -h               Show this help message

EXAMPLES:
    # Basic audit
    $SCRIPT_NAME

    # Audit with custom output and skip external links
    $SCRIPT_NAME --output ./custom-report.md --skip-external-links

    # Verbose audit with custom thresholds
    $SCRIPT_NAME --verbose --threshold-days 60 --title-threshold 0.9

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docs-dir)
                DOCS_DIR="$2"
                shift 2
                ;;
            --output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            --skip-external-links)
                SKIP_EXTERNAL_LINKS=true
                shift
                ;;
            --threshold-days)
                FRONTMATTER_THRESHOLD="$2"
                shift 2
                ;;
            --title-threshold)
                TITLE_THRESHOLD="$2"
                shift 2
                ;;
            --summary-threshold)
                SUMMARY_THRESHOLD="$2"
                shift 2
                ;;
            --timeout)
                HTTP_TIMEOUT="$2"
                shift 2
                ;;
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Set default output file if not specified
    if [[ -z "${OUTPUT_FILE:-}" ]]; then
        OUTPUT_FILE="${OUTPUT_DIR}/$(date +%Y-%m-%d)-documentation-audit.md"
    fi

    # Convert to absolute paths
    OUTPUT_FILE="$(cd "$(dirname "$OUTPUT_FILE")" && pwd)/$(basename "$OUTPUT_FILE")"
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."

    # Check if docs directories exist
    for dir in $DOCS_DIR; do
        if [[ ! -d "$dir" ]]; then
            log_error "Documentation directory does not exist: $dir"
            exit 1
        fi
    done

    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi

    # Check if required Python packages are available
    local missing_packages=()

    if ! python3 -c "import yaml" 2>/dev/null; then
        missing_packages+=("PyYAML")
    fi

    if ! python3 -c "import requests" 2>/dev/null; then
        missing_packages+=("requests")
    fi

    if [[ ${#missing_packages[@]} -gt 0 ]]; then
        log_error "Missing required Python packages: ${missing_packages[*]}"
        log_info "Install with: pip install ${missing_packages[*]}"
        log_info "Or install all requirements: pip install -r requirements-docs.txt"
        exit 1
    fi

    # Check if audit scripts exist
    local scripts=(
        "validate-frontmatter.py"
        "check-links.py"
        "detect-duplicates.py"
        "generate-audit-report.py"
    )

    for script in "${scripts[@]}"; do
        if [[ ! -f "${SCRIPT_DIR}/${script}" ]]; then
            log_error "Audit script not found: ${script}"
            exit 1
        fi
    done

    log_success "Prerequisites validated"
}

# Create temporary directory
create_temp_dir() {
    log_debug "Creating temporary directory: $TEMP_DIR"
    mkdir -p "$TEMP_DIR"
}

# Cleanup function
cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        log_debug "Cleaning up temporary directory: $TEMP_DIR"
        rm -rf "$TEMP_DIR"
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Run frontmatter validation
run_frontmatter_validation() {
    log_info "Running frontmatter validation..."

    local output_file="${TEMP_DIR}/frontmatter.json"
    local script_path="${SCRIPT_DIR}/validate-frontmatter.py"

    local cmd=(
        python3 "$script_path"
        --docs-dir $DOCS_DIR
        --output "$output_file"
        --threshold-days "$FRONTMATTER_THRESHOLD"
    )

    if [[ "$VERBOSE" == "true" ]]; then
        cmd+=(--verbose)
    fi

    log_debug "Running: ${cmd[*]}"

    if "${cmd[@]}"; then
        log_success "Frontmatter validation completed"
    else
        log_warning "Frontmatter validation completed with issues"
    fi
}

# Run link validation
run_link_validation() {
    log_info "Running link validation..."

    local output_file="${TEMP_DIR}/links.json"
    local script_path="${SCRIPT_DIR}/check-links.py"

    local cmd=(
        python3 "$script_path"
        --docs-dir $DOCS_DIR
        --output "$output_file"
        --timeout "$HTTP_TIMEOUT"
    )

    if [[ "$SKIP_EXTERNAL_LINKS" == "true" ]]; then
        cmd+=(--skip-external)
        log_info "Skipping external link validation"
    fi

    if [[ "$VERBOSE" == "true" ]]; then
        cmd+=(--verbose)
    fi

    log_debug "Running: ${cmd[*]}"

    if "${cmd[@]}"; then
        log_success "Link validation completed"
    else
        log_warning "Link validation completed with issues"
    fi
}

# Run duplicate detection
run_duplicate_detection() {
    log_info "Running duplicate detection..."

    local output_file="${TEMP_DIR}/duplicates.json"
    local script_path="${SCRIPT_DIR}/detect-duplicates.py"

    local cmd=(
        python3 "$script_path"
        --docs-dir $DOCS_DIR
        --output "$output_file"
        --title-threshold "$TITLE_THRESHOLD"
        --summary-threshold "$SUMMARY_THRESHOLD"
    )

    if [[ "$VERBOSE" == "true" ]]; then
        cmd+=(--verbose)
    fi

    log_debug "Running: ${cmd[*]}"

    if "${cmd[@]}"; then
        log_success "Duplicate detection completed"
    else
        log_warning "Duplicate detection completed with findings"
    fi
}

# Generate final report
generate_final_report() {
    log_info "Generating final audit report..."

    local script_path="${SCRIPT_DIR}/generate-audit-report.py"
    local frontmatter_json="${TEMP_DIR}/frontmatter.json"
    local links_json="${TEMP_DIR}/links.json"
    local duplicates_json="${TEMP_DIR}/duplicates.json"

    local cmd=(
        python3 "$script_path"
        --output "$OUTPUT_FILE"
    )

    # Add JSON inputs if they exist
    if [[ -f "$frontmatter_json" ]]; then
        cmd+=(--frontmatter-json "$frontmatter_json")
    fi

    if [[ -f "$links_json" ]]; then
        cmd+=(--links-json "$links_json")
    fi

    if [[ -f "$duplicates_json" ]]; then
        cmd+=(--duplicates-json "$duplicates_json")
    fi

    if [[ "$VERBOSE" == "true" ]]; then
        cmd+=(--verbose)
    fi

    log_debug "Running: ${cmd[*]}"

    # Create output directory if it doesn't exist
    mkdir -p "$(dirname "$OUTPUT_FILE")"

    if "${cmd[@]}"; then
        log_success "Final report generated: $OUTPUT_FILE"
    else
        log_error "Failed to generate final report"
        exit 1
    fi
}

# Display summary statistics
display_summary() {
    log_info "Audit Summary:"

    # Show file counts if JSON files exist
    if [[ -f "${TEMP_DIR}/frontmatter.json" ]]; then
        local total_files=$(python3 -c "
import json
with open('${TEMP_DIR}/frontmatter.json', 'r') as f:
    data = json.load(f)
    print(data['summary']['total_files'])
")
        local missing_frontmatter=$(python3 -c "
import json
with open('${TEMP_DIR}/frontmatter.json', 'r') as f:
    data = json.load(f)
    print(data['summary']['files_missing_frontmatter'])
")
        echo "  - Files scanned: $total_files"
        echo "  - Files missing frontmatter: $missing_frontmatter"
    fi

    if [[ -f "${TEMP_DIR}/links.json" ]]; then
        local broken_links=$(python3 -c "
import json
with open('${TEMP_DIR}/links.json', 'r') as f:
    data = json.load(f)
    print(data['summary']['broken_links'])
")
        echo "  - Broken links: $broken_links"
    fi

    if [[ -f "${TEMP_DIR}/duplicates.json" ]]; then
        local exact_duplicates=$(python3 -c "
import json
with open('${TEMP_DIR}/duplicates.json', 'r') as f:
    data = json.load(f)
    print(data['summary']['exact_duplicates'])
")
        echo "  - Exact duplicate groups: $exact_duplicates"
    fi

    echo ""
    log_success "Complete audit report available at: $OUTPUT_FILE"

    # Show health score if available
    if [[ -f "$OUTPUT_FILE" ]]; then
        local health_score=$(grep -o "Overall Health Score: [0-9.]*" "$OUTPUT_FILE" | head -1 || echo "N/A")
        echo "Health Score: $health_score"
    fi
}

# Main execution function
main() {
    log_info "Starting documentation audit..."
    log_info "Documentation directory: $DOCS_DIR"
    log_info "Output file: $OUTPUT_FILE"

    # Parse arguments
    parse_arguments "$@"

    # Validate prerequisites
    validate_prerequisites

    # Create temporary directory
    create_temp_dir

    # Run validation steps
    run_frontmatter_validation
    run_link_validation
    run_duplicate_detection

    # Generate final report
    generate_final_report

    # Display summary
    display_summary

    log_success "Documentation audit completed successfully!"
}

# Execute main function
main "$@"