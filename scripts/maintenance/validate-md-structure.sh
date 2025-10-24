#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Validate Markdown Structure
# ==============================================================================
# This script validates the markdown file structure according to project guidelines.
#
# Usage:
#   bash scripts/maintenance/validate-md-structure.sh [OPTIONS]
#   --fix          Automatically fix violations (move files to reports/)
#   --verbose      Show detailed output
#   --help         Display help
#
# Author: TradingSystem Team
# Last Modified: 2025-10-23
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/reports"

# Options
FIX_VIOLATIONS=false
VERBOSE=false

# Allowed files in root
ALLOWED_ROOT_MD=("README.md" "CHANGELOG.md" "CLAUDE.md")

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show help
show_help() {
    cat << EOF
TradingSystem - Validate Markdown Structure

This script validates the markdown file structure according to project guidelines.

USAGE:
    bash scripts/maintenance/validate-md-structure.sh [OPTIONS]

OPTIONS:
    --fix          Automatically fix violations (move files to reports/)
    --verbose      Show detailed output
    --help         Display this help message

VALIDATION RULES:
    ✅ Allowed in root: README.md, CHANGELOG.md, CLAUDE.md
    ❌ Forbidden in root: ANALISE-*.md, REPORTE-*.md, PHASE-*.md, etc.
    📁 Generated files should go to reports/YYYY-MM-DD/
    📚 Each directory should have a README.md

EXAMPLES:
    # Validate structure
    bash scripts/maintenance/validate-md-structure.sh

    # Fix violations automatically
    bash scripts/maintenance/validate-md-structure.sh --fix

    # Verbose output
    bash scripts/maintenance/validate-md-structure.sh --verbose

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_VIOLATIONS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_status $RED "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Function to check if file is allowed in root
is_allowed_in_root() {
    local file=$1
    local basename=$(basename "$file")
    
    for allowed in "${ALLOWED_ROOT_MD[@]}"; do
        if [[ "$basename" == "$allowed" ]]; then
            return 0
        fi
    done
    return 1
}

# Function to check if file should be in reports/
should_be_in_reports() {
    local file=$1
    local basename=$(basename "$file")
    
    # Patterns that should be in reports/
    local patterns=(
        "ANALISE-*.md"
        "REPORTE-*.md"
        "PHASE-*.md"
        "SUMMARY-*.md"
        "PROPOSTA-*.md"
        "REVISAO-*.md"
        "LIMPEZA-*.md"
        "TEMP-*.md"
        "*-COMPLETE.md"
        "*-SUMMARY.md"
        "*-ANALYSIS.md"
        "*-REPORT.md"
    )
    
    for pattern in "${patterns[@]}"; do
        if [[ "$basename" == $pattern ]]; then
            return 0
        fi
    done
    return 1
}

# Function to move file to reports/
move_to_reports() {
    local file=$1
    local basename=$(basename "$file")
    local today=$(date +%Y-%m-%d)
    local reports_today="$REPORTS_DIR/$today"
    
    # Create reports directory for today
    mkdir -p "$reports_today"
    
    # Generate new filename
    local new_name="${today}-${basename}"
    local new_path="$reports_today/$new_name"
    
    # Move file
    mv "$file" "$new_path"
    
    print_status $GREEN "✅ Moved: $file → $new_path"
    
    # Update reports/README.md
    update_reports_index "$new_path"
}

# Function to update reports index
update_reports_index() {
    local new_file=$1
    local relative_path=${new_file#$PROJECT_ROOT/}
    local basename=$(basename "$new_file")
    local today=$(date +%Y-%m-%d)
    
    # Check if entry already exists
    if grep -q "$basename" "$REPORTS_DIR/README.md" 2>/dev/null; then
        return 0
    fi
    
    # Add entry to reports/README.md
    local entry="- [$basename]($relative_path) - Moved from root during validation"
    
    # Find the right section or create it
    if ! grep -q "### $today" "$REPORTS_DIR/README.md" 2>/dev/null; then
        echo "" >> "$REPORTS_DIR/README.md"
        echo "### $today" >> "$REPORTS_DIR/README.md"
        echo "" >> "$REPORTS_DIR/README.md"
    fi
    
    echo "$entry" >> "$REPORTS_DIR/README.md"
    
    print_status $BLUE "📝 Updated reports/README.md"
}

# Function to validate directory READMEs
validate_directory_readmes() {
    local missing_readmes=()
    
    # Directories that should have README.md
    local required_dirs=(
        "docs"
        "scripts"
        "frontend"
        "backend"
        "config"
        "tools"
        "apps"
        "reports"
    )
    
    for dir in "${required_dirs[@]}"; do
        local readme_path="$PROJECT_ROOT/$dir/README.md"
        if [[ ! -f "$readme_path" ]]; then
            missing_readmes+=("$dir")
        fi
    done
    
    if [[ ${#missing_readmes[@]} -gt 0 ]]; then
        print_status $YELLOW "⚠️  Missing README.md in directories:"
        for dir in "${missing_readmes[@]}"; do
            echo "   - $dir/"
        done
        return 1
    fi
    
    return 0
}

# Main validation function
validate_structure() {
    local violations=()
    local fixed_count=0
    
    print_status $BLUE "🔍 Validating markdown file structure..."
    
    # Check root directory for forbidden files
    while IFS= read -r -d '' file; do
        if ! is_allowed_in_root "$file"; then
            violations+=("$file")
            
            if [[ "$VERBOSE" == "true" ]]; then
                print_status $RED "❌ Forbidden in root: $file"
            fi
            
            if [[ "$FIX_VIOLATIONS" == "true" ]]; then
                if should_be_in_reports "$file"; then
                    move_to_reports "$file"
                    ((fixed_count++))
                else
                    print_status $YELLOW "⚠️  Cannot auto-fix: $file (not a reports pattern)"
                fi
            fi
        fi
    done < <(find "$PROJECT_ROOT" -maxdepth 1 -name "*.md" -print0)
    
    # Check for files that should be in reports/ but aren't
    while IFS= read -r -d '' file; do
        if should_be_in_reports "$file"; then
            local dir=$(dirname "$file")
            if [[ "$dir" != "$REPORTS_DIR"* ]]; then
                violations+=("$file")
                
                if [[ "$VERBOSE" == "true" ]]; then
                    print_status $YELLOW "⚠️  Should be in reports/: $file"
                fi
                
                if [[ "$FIX_VIOLATIONS" == "true" ]]; then
                    move_to_reports "$file"
                    ((fixed_count++))
                fi
            fi
        fi
    done < <(find "$PROJECT_ROOT" -name "*.md" -print0)
    
    # Validate directory READMEs
    if ! validate_directory_readmes; then
        violations+=("missing-readmes")
    fi
    
    # Summary
    echo ""
    if [[ ${#violations[@]} -eq 0 ]]; then
        print_status $GREEN "✅ All markdown files are properly organized!"
    else
        print_status $RED "❌ Found ${#violations[@]} violations"
        
        if [[ "$FIX_VIOLATIONS" == "true" ]]; then
            print_status $GREEN "🔧 Fixed $fixed_count violations automatically"
        else
            print_status $YELLOW "💡 Run with --fix to automatically fix violations"
        fi
    fi
    
    # Show reports structure
    if [[ -d "$REPORTS_DIR" ]]; then
        echo ""
        print_status $BLUE "📁 Reports structure:"
        find "$REPORTS_DIR" -name "*.md" | head -10 | while read -r file; do
            echo "   - ${file#$PROJECT_ROOT/}"
        done
        
        local total_reports=$(find "$REPORTS_DIR" -name "*.md" | wc -l)
        if [[ $total_reports -gt 10 ]]; then
            echo "   ... and $((total_reports - 10)) more files"
        fi
    fi
    
    return ${#violations[@]}
}

# Function to show guidelines
show_guidelines() {
    cat << EOF

📝 MARKDOWN FILE GUIDELINES:

✅ ALLOWED in root:
   - README.md (project overview)
   - CHANGELOG.md (version history)
   - CLAUDE.md (AI instructions)

❌ FORBIDDEN in root:
   - ANALISE-*.md, REPORTE-*.md, PHASE-*.md
   - SUMMARY-*.md, PROPOSTA-*.md, REVISAO-*.md
   - LIMPEZA-*.md, TEMP-*.md
   - *-COMPLETE.md, *-SUMMARY.md

📁 REPORTS directory structure:
   reports/
   ├── README.md                    # Index of all reports
   ├── YYYY-MM-DD/                 # Reports by date
   │   ├── 2025-10-23-analysis.md
   │   └── 2025-10-23-cleanup.md
   ├── session-reports/             # Session reports
   ├── ai-generated/                # AI-generated files
   └── proposals/                   # Temporary proposals

📚 DIRECTORY READMEs:
   Each major directory should have a README.md:
   - docs/README.md
   - scripts/README.md
   - frontend/README.md
   - backend/README.md
   - config/README.md
   - tools/README.md
   - apps/README.md
   - reports/README.md

EOF
}

# Main execution
main() {
    cd "$PROJECT_ROOT"
    
    print_status $BLUE "🚀 TradingSystem Markdown Structure Validator"
    print_status $BLUE "=============================================="
    
    if [[ "$VERBOSE" == "true" ]]; then
        show_guidelines
    fi
    
    # Run validation
    if validate_structure; then
        print_status $GREEN "🎉 Validation passed!"
        exit 0
    else
        print_status $RED "💥 Validation failed!"
        exit 1
    fi
}

# Run main function
main "$@"


