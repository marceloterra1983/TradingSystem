#!/bin/bash

# Phase 2 - Safe cleanup of Docusaurus build artifacts
# Removes build artifacts while preserving all source code

set -euo pipefail

# Configuration
DOCUSAURUS_DIR="/home/marce/projetos/TradingSystem/docs/docusaurus"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CLEANUP_LOG="${DOCUSAURUS_DIR}/CLEANUP-LOG-${TIMESTAMP}.md"
DRY_RUN=false
VERBOSE=false
BACKUP_REFERENCE=""

# Size tracking (pre-cleanup state)
NODE_MODULES_SIZE=0
DOCUSAURUS_SIZE=0
BUILD_SIZE=0
PACKAGE_LOCK_SIZE=0
CACHE_LOADER_SIZE=0
SPEC_SIZE=0

# Freed space tracking (actual bytes freed)
NODE_MODULES_FREED=0
DOCUSAURUS_FREED=0
BUILD_FREED=0
PACKAGE_LOCK_FREED=0
CACHE_LOADER_FREED=0
SPEC_FREED=0
TOTAL_SPACE_FREED=0

# Action tracking
NODE_MODULES_REMOVED=false
DOCUSAURUS_REMOVED=false
BUILD_REMOVED=false
PACKAGE_LOCK_REMOVED=false
CACHE_LOADER_REMOVED=false
SPEC_REMOVED=false
NPM_CLEAR_RAN=false
VALIDATION_STATUS="unknown"

# Pre-cleanup state tracking
NODE_MODULES_PRESENT=false
DOCUSAURUS_PRESENT=false
BUILD_PRESENT=false
PACKAGE_LOCK_PRESENT=false
CACHE_LOADER_PRESENT=false
SPEC_PRESENT=false

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --backup-ref)
                BACKUP_REFERENCE="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [--dry-run] [--verbose] [--backup-ref PATH]"
                echo "  --dry-run     Simulate cleanup without actual deletion"
                echo "  --verbose     Show detailed output"
                echo "  --backup-ref  Reference to Phase 1 backup location"
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

# Pre-cleanup validation
pre_cleanup_validation() {
    step "Pre-Cleanup Validation"

    # Verify we're in correct directory
    if [[ ! -f "package.json" ]]; then
        error "package.json not found. Are you in the docusaurus directory?"
        return 1
    fi

    # Verify backup exists if reference provided
    if [[ -n "$BACKUP_REFERENCE" ]]; then
        if [[ ! -d "$BACKUP_REFERENCE" ]]; then
            error "Backup reference directory not found: $BACKUP_REFERENCE"
            return 1
        fi
        info "Backup verified: $BACKUP_REFERENCE"
    fi

    # Document current state and record sizes
    if [[ -d "node_modules" ]]; then
        NODE_MODULES_SIZE=$(du -b node_modules | cut -f1)
        NODE_MODULES_PRESENT=true
        info "node_modules/: Present ($(du -sh node_modules | cut -f1))"
    else
        info "node_modules/: Not present (already clean)"
    fi

    if [[ -d ".docusaurus" ]]; then
        DOCUSAURUS_SIZE=$(du -b .docusaurus | cut -f1)
        DOCUSAURUS_PRESENT=true
        info ".docusaurus/: Present ($(du -sh .docusaurus | cut -f1))"
    else
        info ".docusaurus/: Not present (already clean)"
    fi

    if [[ -d "build" ]]; then
        BUILD_SIZE=$(du -b build | cut -f1)
        BUILD_PRESENT=true
        info "build/: Present ($(du -sh build | cut -f1))"
    else
        info "build/: Not present (already clean)"
    fi

    if [[ -f "package-lock.json" ]]; then
        PACKAGE_LOCK_SIZE=$(stat -f%z package-lock.json 2>/dev/null || stat -c%s package-lock.json)
        PACKAGE_LOCK_PRESENT=true
        info "package-lock.json: Present ($(ls -lh package-lock.json | awk '{print $5}'))"
    else
        info "package-lock.json: Not present (already clean)"
    fi

    if [[ -d ".cache-loader" ]]; then
        CACHE_LOADER_SIZE=$(du -b .cache-loader | cut -f1)
        CACHE_LOADER_PRESENT=true
        info ".cache-loader/: Present ($(du -sh .cache-loader | cut -f1))"
    else
        info ".cache-loader/: Not present (already clean)"
    fi

    if [[ -d "static/spec" ]]; then
        SPEC_SIZE=$(du -b static/spec | cut -f1)
        SPEC_PRESENT=true
        info "static/spec/: Present ($(du -sh static/spec | cut -f1))"
    else
        info "static/spec/: Not present (already clean)"
    fi

    return 0
}

# Create source manifest for integrity verification
create_source_manifest() {
    step "Creating Source Manifest"

    # Create manifest of all source files that must be preserved
    find src static scripts -type f -not -path 'static/spec/*' -exec md5sum {} \; > .source-manifest-pre-cleanup.txt

    if [[ "$VERBOSE" == "true" ]]; then
        info "Source manifest created: .source-manifest-pre-cleanup.txt"
        info "Files tracked: $(wc -l < .source-manifest-pre-cleanup.txt)"
    fi

    return 0
}

# Remove node_modules
remove_node_modules() {
    if [[ -d "node_modules" ]]; then
        SIZE=$(du -sh node_modules | cut -f1)
        BYTES=$(du -b node_modules 2>/dev/null | cut -f1 || echo 0)
        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would remove node_modules/ (${SIZE})"
            echo "- Would remove node_modules/ (${SIZE})" >> "$CLEANUP_LOG"
        else
            if rm -rf node_modules/; then
                NODE_MODULES_FREED=$BYTES
                NODE_MODULES_REMOVED=true
                success "Removed node_modules/ (${SIZE})"
                echo "- Removed node_modules/ (${SIZE})" >> "$CLEANUP_LOG"
            else
                error "Failed to remove node_modules/"
                echo "- Failed to remove node_modules/" >> "$CLEANUP_LOG"
            fi
        fi
    else
        info "node_modules/ already clean (not present)"
        echo "- node_modules/ already clean (not present)" >> "$CLEANUP_LOG"
    fi
}

# Remove .docusaurus cache
remove_docusaurus_cache() {
    if [[ -d ".docusaurus" ]]; then
        SIZE=$(du -sh .docusaurus | cut -f1)
        BYTES=$(du -b .docusaurus 2>/dev/null | cut -f1 || echo 0)
        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would remove .docusaurus/ (${SIZE})"
            echo "- Would remove .docusaurus/ (${SIZE})" >> "$CLEANUP_LOG"
        else
            if rm -rf .docusaurus/; then
                DOCUSAURUS_FREED=$BYTES
                DOCUSAURUS_REMOVED=true
                success "Removed .docusaurus/ (${SIZE})"
                echo "- Removed .docusaurus/ (${SIZE})" >> "$CLEANUP_LOG"
            else
                error "Failed to remove .docusaurus/"
                echo "- Failed to remove .docusaurus/" >> "$CLEANUP_LOG"
            fi
        fi
    else
        info ".docusaurus/ already clean (not present)"
        echo "- .docusaurus/ already clean (not present)" >> "$CLEANUP_LOG"
    fi
}

# Remove build directory
remove_build_directory() {
    if [[ -d "build" ]]; then
        SIZE=$(du -sh build | cut -f1)
        BYTES=$(du -b build 2>/dev/null | cut -f1 || echo 0)
        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would remove build/ (${SIZE})"
            echo "- Would remove build/ (${SIZE})" >> "$CLEANUP_LOG"
        else
            if rm -rf build/; then
                BUILD_FREED=$BYTES
                BUILD_REMOVED=true
                success "Removed build/ (${SIZE})"
                echo "- Removed build/ (${SIZE})" >> "$CLEANUP_LOG"
            else
                error "Failed to remove build/"
                echo "- Failed to remove build/" >> "$CLEANUP_LOG"
            fi
        fi
    else
        info "build/ already clean (not present)"
        echo "- build/ already clean (not present)" >> "$CLEANUP_LOG"
    fi
}

# Remove package-lock.json
remove_package_lock() {
    if [[ -f "package-lock.json" ]]; then
        SIZE=$(ls -lh package-lock.json | awk '{print $5}')
        BYTES=$(stat -f%z package-lock.json 2>/dev/null || stat -c%s package-lock.json 2>/dev/null || echo 0)
        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would remove package-lock.json (${SIZE})"
            echo "- Would remove package-lock.json (${SIZE})" >> "$CLEANUP_LOG"
        else
            if rm -f package-lock.json; then
                PACKAGE_LOCK_FREED=$BYTES
                PACKAGE_LOCK_REMOVED=true
                success "Removed package-lock.json (${SIZE})"
                echo "- Removed package-lock.json (${SIZE})" >> "$CLEANUP_LOG"
            else
                error "Failed to remove package-lock.json"
                echo "- Failed to remove package-lock.json" >> "$CLEANUP_LOG"
            fi
        fi
    else
        info "package-lock.json already clean (not present)"
        echo "- package-lock.json already clean (not present)" >> "$CLEANUP_LOG"
    fi
}

# Remove .cache-loader
remove_cache_loader() {
    if [[ -d ".cache-loader" ]]; then
        SIZE=$(du -sh .cache-loader | cut -f1)
        BYTES=$(du -b .cache-loader 2>/dev/null | cut -f1 || echo 0)
        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would remove .cache-loader/ (${SIZE})"
            echo "- Would remove .cache-loader/ (${SIZE})" >> "$CLEANUP_LOG"
        else
            if rm -rf .cache-loader/; then
                CACHE_LOADER_FREED=$BYTES
                CACHE_LOADER_REMOVED=true
                success "Removed .cache-loader/ (${SIZE})"
                echo "- Removed .cache-loader/ (${SIZE})" >> "$CLEANUP_LOG"
            else
                error "Failed to remove .cache-loader/"
                echo "- Failed to remove .cache-loader/" >> "$CLEANUP_LOG"
            fi
        fi
    else
        info ".cache-loader/ already clean (not present)"
        echo "- .cache-loader/ already clean (not present)" >> "$CLEANUP_LOG"
    fi
}

# Remove generated spec directory
remove_generated_spec() {
    if [[ -d "static/spec" ]]; then
        SIZE=$(du -sh static/spec | cut -f1)
        BYTES=$(du -b static/spec 2>/dev/null | cut -f1 || echo 0)
        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would remove static/spec/ (${SIZE})"
            echo "- Would remove static/spec/ (${SIZE})" >> "$CLEANUP_LOG"
        else
            if rm -rf static/spec/; then
                SPEC_FREED=$BYTES
                SPEC_REMOVED=true
                success "Removed static/spec/ (${SIZE})"
                echo "- Removed static/spec/ (${SIZE})" >> "$CLEANUP_LOG"
            else
                error "Failed to remove static/spec/"
                echo "- Failed to remove static/spec/" >> "$CLEANUP_LOG"
            fi
        fi
    else
        info "static/spec/ already clean (not present)"
        echo "- static/spec/ already clean (not present)" >> "$CLEANUP_LOG"
    fi
}

# Run npm clear
run_npm_clear() {
    if command -v npm >/dev/null 2>&1; then
        if grep -q '"clear"' package.json; then
            if [[ "$DRY_RUN" == "true" ]]; then
                info "Would run: npm run clear"
                echo "- Would run: npm run clear" >> "$CLEANUP_LOG"
            else
                step "Running npm run clear"
                if npm run clear 2>&1 | tee -a "$CLEANUP_LOG"; then
                    success "Executed npm run clear"
                    echo "- Executed npm run clear" >> "$CLEANUP_LOG"
                    NPM_CLEAR_RAN=true
                else
                    warning "npm run clear failed, but continuing"
                    echo "- npm run clear failed, but continuing" >> "$CLEANUP_LOG"
                fi
            fi
        else
            warning "Clear script not found in package.json"
            echo "- Clear script not found in package.json" >> "$CLEANUP_LOG"
        fi
    else
        warning "npm not available"
        echo "- npm not available" >> "$CLEANUP_LOG"
    fi
}

# Post-cleanup validation
post_cleanup_validation() {
    step "Post-Cleanup Validation"

    # Verify artifacts removed
    local validation_passed=true

    if [[ -d "node_modules" ]]; then
        error "node_modules/ still exists!"
        validation_passed=false
    fi

    if [[ -d ".docusaurus" ]]; then
        error ".docusaurus/ still exists!"
        validation_passed=false
    fi

    if [[ -d "build" ]]; then
        error "build/ still exists!"
        validation_passed=false
    fi

    if [[ -f "package-lock.json" ]]; then
        error "package-lock.json still exists!"
        validation_passed=false
    fi

    if [[ -d ".cache-loader" ]]; then
        error ".cache-loader/ still exists!"
        validation_passed=false
    fi

    if [[ -d "static/spec" ]]; then
        info "static/spec/ removed (will be regenerated)"
    fi

    # Verify source files preserved
    find src static scripts -type f -not -path 'static/spec/*' -exec md5sum {} \; > .source-manifest-post-cleanup.txt

    if diff .source-manifest-pre-cleanup.txt .source-manifest-post-cleanup.txt >/dev/null; then
        success "All source files preserved (checksums match)"
    else
        error "Source files were modified or deleted!"
        validation_passed=false
    fi

    # Verify critical config files
    local critical_files=("package.json" "docusaurus.config.ts" "sidebars.ts" "tsconfig.json")
    for file in "${critical_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "$file missing!"
            validation_passed=false
        fi
    done

    # Count preserved files
    local src_count=$(find src -type f | wc -l)
    local static_count=$(find static -type f -not -path 'static/spec/*' | wc -l)
    local scripts_count=$(find scripts -type f | wc -l)

    if [[ "$VERBOSE" == "true" ]]; then
        info "File counts - src: $src_count, static: $static_count, scripts: $scripts_count"
    fi

    if [[ "$validation_passed" == "true" ]]; then
        success "Post-cleanup validation passed"
        VALIDATION_STATUS="passed"
        return 0
    else
        error "Post-cleanup validation failed"
        VALIDATION_STATUS="failed"
        return 1
    fi
}

# Calculate space freed
calculate_space_freed() {
    TOTAL_SPACE_FREED=$((NODE_MODULES_FREED + DOCUSAURUS_FREED + BUILD_FREED + PACKAGE_LOCK_FREED + CACHE_LOADER_FREED + SPEC_FREED))
    return 0
}

# Generate cleanup report
generate_cleanup_report() {
    step "Generating Cleanup Report"

    # Generate JSON report
    CLEANUP_REPORT_JSON="${DOCUSAURUS_DIR}/CLEANUP-REPORT-${TIMESTAMP}.json"
    cat > "$CLEANUP_REPORT_JSON" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "directory": "$DOCUSAURUS_DIR",
  "dryRun": $DRY_RUN,
  "backupReference": "${BACKUP_REFERENCE:-null}",
  "preCleanupState": {
    "nodeModules": {
      "present": $NODE_MODULES_PRESENT,
      "size": $NODE_MODULES_SIZE
    },
    "docusaurus": {
      "present": $DOCUSAURUS_PRESENT,
      "size": $DOCUSAURUS_SIZE
    },
    "build": {
      "present": $BUILD_PRESENT,
      "size": $BUILD_SIZE
    },
    "packageLock": {
      "present": $PACKAGE_LOCK_PRESENT,
      "size": $PACKAGE_LOCK_SIZE
    },
    "cacheLoader": {
      "present": $CACHE_LOADER_PRESENT,
      "size": $CACHE_LOADER_SIZE
    },
    "spec": {
      "present": $SPEC_PRESENT,
      "size": $SPEC_SIZE
    }
  },
  "actionsTaken": {
    "nodeModulesRemoved": $NODE_MODULES_REMOVED,
    "docusaurusRemoved": $DOCUSAURUS_REMOVED,
    "buildRemoved": $BUILD_REMOVED,
    "packageLockRemoved": $PACKAGE_LOCK_REMOVED,
    "cacheLoaderRemoved": $CACHE_LOADER_REMOVED,
    "specRemoved": $SPEC_REMOVED,
    "npmClearRan": $NPM_CLEAR_RAN
  },
  "postCleanupState": {
    "artifactsRemoved": $([[ ! -d node_modules && ! -d .docusaurus && ! -d build && ! -f package-lock.json && ! -d .cache-loader ]] && echo true || echo false),
    "sourcePreserved": $(diff .source-manifest-pre-cleanup.txt .source-manifest-post-cleanup.txt >/dev/null && echo true || echo false),
    "spaceFreed": $TOTAL_SPACE_FREED
  },
  "validationStatus": "$VALIDATION_STATUS"
}
EOF

    # Append to Markdown log
    {
        echo ""
        echo "## Space Freed"
        if [[ "$DRY_RUN" == "true" ]]; then
            echo "**Note:** Running in dry-run mode - no space actually freed (spaceFreed reported as 0)"
        fi
        echo "**Total space freed:** $(numfmt --to=iec-i --suffix=B $TOTAL_SPACE_FREED)"
        echo ""

        echo "## JSON Report"
        echo "Generated: $CLEANUP_REPORT_JSON"
        echo ""

        echo "## Next Steps"
        echo "1. Review this cleanup log"
        echo "2. Proceed to Phase 3: npm install"
        echo "3. Keep Phase 1 backup until restoration verified"
        echo ""

        if [[ -n "$BACKUP_REFERENCE" ]]; then
            echo "## Rollback Instructions"
            echo "If needed, restore from: $BACKUP_REFERENCE"
            echo "Command: rsync -av \"$BACKUP_REFERENCE/docusaurus/\" \"$DOCUSAURUS_DIR/\""
            echo ""
        fi

    } >> "$CLEANUP_LOG"

    success "Cleanup log created: $CLEANUP_LOG"
    success "JSON report created: $CLEANUP_REPORT_JSON"
}

# Print cleanup summary
print_cleanup_summary() {
    echo ""
    echo "🧹 Docusaurus Cleanup Summary"
    echo "============================"
    echo "Directory: $DOCUSAURUS_DIR"
    echo "Dry run: $DRY_RUN"
    echo "Verbose: $VERBOSE"
    echo ""
    echo "✅ Cleanup completed successfully!"
    echo ""
    echo "📄 Cleanup log: $CLEANUP_LOG"
    echo "📄 JSON report: ${DOCUSAURUS_DIR}/CLEANUP-REPORT-${TIMESTAMP}.json"
    echo "💾 Space freed: $(numfmt --to=iec-i --suffix=B $TOTAL_SPACE_FREED)"
    echo ""
    echo "Next steps:"
    echo "  1. Review cleanup log: cat \"$CLEANUP_LOG\""
    echo "  2. Proceed to Phase 3: npm install"
    echo "  3. Keep Phase 1 backup until Phase 4 validation complete"
}

# Main execution
main() {
    parse_arguments "$@"

    echo "🧹 Docusaurus Cleanup - Phase 2"
    echo "==============================="
    echo "Directory: $DOCUSAURUS_DIR"
    echo "Timestamp: $TIMESTAMP"
    echo "Dry run: $DRY_RUN"
    echo "Verbose: $VERBOSE"
    echo ""

    # Initialize cleanup log early
    {
        echo "# Docusaurus Cleanup Log - Phase 2"
        echo ""
        echo "**Timestamp:** $(date)"
        echo "**Directory:** $DOCUSAURUS_DIR"
        echo "**Dry Run:** $DRY_RUN"
        echo "**Backup Reference:** ${BACKUP_REFERENCE:-None}"
        echo ""
        echo "## Cleanup Actions"
        echo ""
    } > "$CLEANUP_LOG"

    # Change to docusaurus directory
    cd "$DOCUSAURUS_DIR"

    # Execute cleanup phases
    pre_cleanup_validation
    create_source_manifest

    remove_node_modules
    remove_docusaurus_cache
    remove_build_directory
    remove_package_lock
    remove_cache_loader
    remove_generated_spec
    run_npm_clear

    post_cleanup_validation
    calculate_space_freed
    generate_cleanup_report

    # Clean up temporary manifests
    rm -f .source-manifest-*.txt

    print_cleanup_summary

    if [[ "$DRY_RUN" == "true" ]]; then
        echo ""
        info "Dry run completed - no actual changes made"
        exit 2
    else
        echo ""
        success "Cleanup completed successfully!"
        exit 0
    fi
}

# Run main function with all arguments
main "$@"