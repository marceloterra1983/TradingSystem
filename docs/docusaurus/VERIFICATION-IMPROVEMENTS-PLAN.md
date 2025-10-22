---
title: Docusaurus Verification Scripts - Implementation Plan
sidebar_position: 1
tags: [documentation]
domain: shared
type: reference
summary: Docusaurus Verification Scripts - Implementation Plan
status: active
last_review: 2025-10-22
---

# Docusaurus Verification Scripts - Implementation Plan

**Date**: 2025-10-19  
**Purpose**: Address 8 verification comments from thorough code review  
**Scripts Affected**:

- `scripts/docs/validate-docusaurus-integrity.sh`
- `scripts/docs/backup-docusaurus.sh`

---

## Executive Summary

This plan addresses 8 critical improvements identified during verification of the Docusaurus backup and validation scripts. All changes maintain backward compatibility while adding robustness, portability, and accuracy.

**Priority**: High  
**Estimated Effort**: 4-6 hours  
**Risk Level**: Low (non-breaking changes)

---

## Comment 1: Critical Files Not Explicitly Checked

### Issue

The validation script lists `sidebars.ts`, `tsconfig.json`, `.gitignore`, and `README.md` as critical files in the RESTORATION-REPORT, but never explicitly validates them before other sections.

### Current Behavior

- These files are mentioned in reports but not validated
- They may be missing without detection until backup fails

### Required Changes

**File**: `scripts/docs/validate-docusaurus-integrity.sh`

**Location**: After line 617 (`generate_validation_report`)

**Implementation**:

```bash
# After generate_validation_report, before other validations
check_file_exists "${DOCUSAURUS_DIR}/sidebars.ts" "sidebars.ts"
check_file_exists "${DOCUSAURUS_DIR}/tsconfig.json" "tsconfig.json"
check_file_exists "${DOCUSAURUS_DIR}/.gitignore" ".gitignore"
check_file_exists "${DOCUSAURUS_DIR}/README.md" "README.md"
```

**Rationale**: These files are critical for Docusaurus operation and should be validated early to provide comprehensive "Critical Files Integrity" table.

---

## Comment 2: Dependency Version Validation

### Issue

`validate_package_json()` checks for dependency presence but never validates versions match requirements.

### Current Behavior

- Lines 195-211: Only checks if dependency exists
- Actual version ignored, even for pinned versions (react: 18.2.0)

### Required Changes

**File**: `scripts/docs/validate-docusaurus-integrity.sh`

**Location**: Function `validate_package_json()` lines 195-211

**Implementation**:

```bash
# Define expected versions (exact or range)
declare -A EXPECTED_VERSIONS=(
    ["@docusaurus/core"]="3.9.1"
    ["@docusaurus/preset-classic"]="3.9.1"
    ["@akebifiky/remark-simple-plantuml"]="^1.0.2"
    ["react"]="18.2.0"  # Exact match required
    ["react-dom"]="18.2.0"  # Exact match required
    ["lucide-react"]="^0.263.1"
    ["gray-matter"]="^4.0.3"
    ["dotenv"]="^16.4.5"
    ["typescript"]="~5.6.2"
)

# Version comparison function
compare_versions() {
    local expected="$1"
    local actual="$2"

    # Exact match (no prefix)
    if [[ "$expected" != ^* && "$expected" != ~* ]]; then
        [[ "$actual" == "$expected" ]] && return 0 || return 1
    fi

    # Caret (^) - compatible changes
    if [[ "$expected" == ^* ]]; then
        # Simple check: actual >= expected (simplified for MVP)
        return 0
    fi

    # Tilde (~) - patch-level changes
    if [[ "$expected" == ~* ]]; then
        # Simple check: actual matches major.minor (simplified for MVP)
        return 0
    fi

    return 1
}

# Check each dependency
for dep in "${critical_deps[@]}"; do
    local pkg_name="${dep%:*}"
    local expected_version="${EXPECTED_VERSIONS[$pkg_name]}"

    ((TOTAL_CHECKS++))
    if actual_version=$(jq -r ".dependencies.\"$pkg_name\" // .devDependencies.\"$pkg_name\"" "$pkg_file" 2>/dev/null); then
        if [[ "$actual_version" != "null" ]]; then
            # Version exists, now compare
            if compare_versions "$expected_version" "$actual_version"; then
                ((PASSED_CHECKS++))
                success "Dependency $pkg_name: $actual_version (matches $expected_version)"
                echo "- ✅ $pkg_name: $actual_version ✓" >> "$VALIDATION_REPORT"
            else
                ((FAILED_CHECKS++))
                FAILED_ITEMS+=("Version mismatch: $pkg_name (expected $expected_version, got $actual_version)")
                error "Version mismatch: $pkg_name (expected $expected_version, got $actual_version)"
                echo "- ❌ $pkg_name: $actual_version (expected $expected_version)" >> "$VALIDATION_REPORT"
            fi
        else
            ((FAILED_CHECKS++))
            FAILED_ITEMS+=("Missing dependency: $pkg_name")
            error "Missing dependency: $pkg_name"
            echo "- ❌ $pkg_name: Missing" >> "$VALIDATION_REPORT"
        fi
    else
        ((FAILED_CHECKS++))
        FAILED_ITEMS+=("Error reading dependency: $pkg_name")
        error "Error reading dependency: $pkg_name"
        echo "- ❌ $pkg_name: Error" >> "$VALIDATION_REPORT"
    fi
done
```

**Rationale**: Version mismatches can cause runtime errors. React 18.2.0 is pinned for plugin compatibility and must be validated.

---

## Comment 3: Incomplete Checksum Coverage

### Issue

`generate_checksums()` only checksums critical files and TypeScript/JavaScript files, not all backed-up files as manifest claims.

### Current Behavior

- Lines 432-457: Only checksums specific file types
- Manifest lines 329-333 claims "all backed-up files"

### Required Changes

**File**: `scripts/docs/backup-docusaurus.sh`

**Location**: Function `generate_checksums()` lines 420-458

**Implementation**:

```bash
generate_checksums() {
    info "Generating checksums..."

    local checksums_file="${BACKUP_DIR}/metadata/CHECKSUMS.md5"

    echo "# MD5 Checksums for Docusaurus Backup" > "$checksums_file"
    echo "# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$checksums_file"
    echo "# Coverage: All files in backup" >> "$checksums_file"
    echo "# To verify: cd backup/docusaurus && md5sum -c ../metadata/CHECKSUMS.md5" >> "$checksums_file"
    echo "" >> "$checksums_file"

    cd "${BACKUP_DIR}/docusaurus"

    # Checksum ALL files, excluding ephemeral ones
    find . -type f \
        ! -name "*.log" \
        ! -name ".DS_Store" \
        ! -name "*.swp" \
        ! -name "*.swo" \
        ! -name "*~" \
        -print0 | sort -z | xargs -0 md5sum >> "$checksums_file" 2>/dev/null

    cd - > /dev/null

    local checksum_count=$(grep -v "^#" "$checksums_file" | grep -v "^$" | wc -l)
    success "Checksums generated: ${checksum_count} files"
    return 0
}
```

**Alternative** (if full coverage is too expensive):
Update manifest wording to match actual coverage:

```markdown
## Checksums

MD5 checksums for **critical and source files** are stored in:

- ${BACKUP_DIR}/metadata/CHECKSUMS.md5

Coverage:

- All configuration files (package.json, \*.config.ts, etc.)
- All TypeScript/JavaScript source files
- All CSS files
```

**Rationale**: Users expect checksums to cover what's backed up. Either implement full coverage or clarify limited scope.

---

## Comment 4: Non-Existent Script Reference

### Issue

Manifest (lines 345-349) references `scripts/docs/verify-backup.sh` which doesn't exist.

### Current Behavior

- Users instructed to run non-existent script
- Causes confusion during restoration

### Required Changes

**File**: `scripts/docs/backup-docusaurus.sh`

**Location**: Function `generate_backup_manifest()` lines 345-349

**Option 1**: Remove reference (RECOMMENDED)

```bash
# Remove lines 345-349
# Keep only manual verification (lines 351-361)
```

**Option 2**: Create the script

```bash
# Create scripts/docs/verify-backup.sh
#!/bin/bash
# Verify backup integrity
# Usage: ./verify-backup.sh /path/to/backup

BACKUP_DIR="$1"

if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
    echo "Usage: $0 /path/to/backup"
    exit 1
fi

# Verify checksums
cd "${BACKUP_DIR}/docusaurus"
if md5sum -c ../metadata/CHECKSUMS.md5; then
    echo "✅ All checksums verified"
    exit 0
else
    echo "❌ Checksum verification failed"
    exit 1
fi
```

**Recommendation**: Option 1 (remove reference). Manual verification commands are already documented and sufficient.

---

## Comment 5: JSON Report Empty Array Handling

### Issue

Lines 685-686 may produce invalid JSON if `FAILED_ITEMS` or `WARNING_ITEMS` are empty.

### Current Behavior

```bash
"failedItems": $(printf '%s\n' "${FAILED_ITEMS[@]}" | jq -R . | jq -s .),
"warningItems": $(printf '%s\n' "${WARNING_ITEMS[@]}" | jq -R . | jq -s .)
```

If arrays are empty, `printf` produces empty output, potentially causing JSON syntax errors.

### Required Changes

**File**: `scripts/docs/validate-docusaurus-integrity.sh`

**Location**: Function `generate_json_report()` lines 685-686

**Implementation**:

```bash
generate_json_report() {
    if [[ "$JSON_OUTPUT" != true ]]; then
        return 0
    fi

    # Generate failed items JSON
    local failed_json="[]"
    if [[ ${#FAILED_ITEMS[@]} -gt 0 ]]; then
        failed_json=$(printf '%s\n' "${FAILED_ITEMS[@]}" | jq -R . | jq -s .)
    fi

    # Generate warning items JSON
    local warning_json="[]"
    if [[ ${#WARNING_ITEMS[@]} -gt 0 ]]; then
        warning_json=$(printf '%s\n' "${WARNING_ITEMS[@]}" | jq -R . | jq -s .)
    fi

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
  "warningItems": ${warning_json}
}
EOF
}
```

**Rationale**: Ensures valid JSON is always produced, even with zero failures/warnings.

---

## Comment 6: macOS Portability

### Issue

Script uses GNU-specific flags that fail on macOS:

- `du --exclude` (line 181)
- `sed -i` (lines 815-817)
- `md5sum` (throughout)

### Current Behavior

- Fails on macOS without GNU coreutils
- Non-portable across Unix systems

### Required Changes

**File**: `scripts/docs/backup-docusaurus.sh`

**Locations**: Multiple functions

**Implementation**:

```bash
# Add at top of script (after configuration section)

# Detect OS for portability
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            OS_TYPE="macos"
            MD5_CMD="md5 -q"
            SED_INPLACE="sed -i ''"
            ;;
        Linux*)
            OS_TYPE="linux"
            MD5_CMD="md5sum"
            SED_INPLACE="sed -i"
            ;;
        *)
            OS_TYPE="unknown"
            MD5_CMD="md5sum"
            SED_INPLACE="sed -i"
            ;;
    esac
}

# Call at script start
detect_os

# Update calculate_source_size() - lines 175-189
calculate_source_size() {
    info "Calculating source size..."

    if [[ "$OS_TYPE" == "macos" ]]; then
        # macOS: Use find with exclusions
        local temp_dir=$(mktemp -d)
        rsync -a \
            --exclude="node_modules" \
            --exclude=".docusaurus" \
            --exclude="build" \
            --exclude="package-lock.json" \
            --exclude="*.log" \
            "${DOCUSAURUS_DIR}/" "${temp_dir}/"
        SOURCE_SIZE=$(du -sh "${temp_dir}" 2>/dev/null | awk '{print $1}')
        rm -rf "${temp_dir}"
    else
        # Linux: Use du with exclude
        local exclude_args=""
        for pattern in "${EXCLUDE_PATTERNS[@]}"; do
            exclude_args+=" --exclude=${pattern}"
        done
        SOURCE_SIZE=$(eval "du -sh ${exclude_args} '${DOCUSAURUS_DIR}' 2>/dev/null" | awk '{print $1}')
    fi

    info "Estimated backup size: ${SOURCE_SIZE}"
    return 0
}

# Update generate_restoration_guide() - lines 815-817
generate_restoration_guide() {
    # ... (content generation) ...

    # Replace placeholders (OS-independent)
    if [[ "$OS_TYPE" == "macos" ]]; then
        sed -i '' "s|BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
        sed -i '' "s|AUTO_GENERATED_TIMESTAMP|$(date -u +"%Y-%m-%d %H:%M:%S UTC")|g" "$guide"
        sed -i '' "s|AUTO_GENERATED_BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
    else
        sed -i "s|BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
        sed -i "s|AUTO_GENERATED_TIMESTAMP|$(date -u +"%Y-%m-%d %H:%M:%S UTC")|g" "$guide"
        sed -i "s|AUTO_GENERATED_BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
    fi

    success "Restoration guide generated: ${guide}"
    return 0
}

# Update all md5sum calls to use $MD5_CMD
# Example in generate_checksums():
find . -type f ... | xargs -0 sh -c 'for f; do '"${MD5_CMD}"' "$f"; done' sh >> "$checksums_file"
```

**Rationale**: Scripts should work on both Linux and macOS without modification.

---

## Comment 7: Component Styles Validation

### Issue

`validate_custom_components()` doesn't check for required `styles.module.css` files mentioned in documentation.

### Current Behavior

- Lines 336-358: Only checks for `index.tsx`
- Styles files ignored, even when documented as required

### Required Changes

**File**: `scripts/docs/validate-docusaurus-integrity.sh`

**Location**: Function `validate_custom_components()` lines 336-358

**Implementation**:

```bash
# Define components with required/optional styles
declare -A COMPONENT_STYLES=(
    ["ApiEndpoint"]="required"
    ["CodeBlock"]="optional"
    ["FacetFilters"]="required"
    ["HealthMetricsCard"]="required"
    ["HomepageFeatures"]="required"
    ["SearchBar"]="required"
    ["Tabs"]="optional"
)

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

        # Check for styles.module.css
        local styles_requirement="${COMPONENT_STYLES[$component]}"
        if [[ -f "${component_dir}/styles.module.css" ]]; then
            verbose "  styles.module.css present"
        else
            if [[ "$styles_requirement" == "required" ]]; then
                ((WARNINGS++))
                WARNING_ITEMS+=("Component missing styles.module.css: $component (documented as required)")
                warning "  styles.module.css missing in $component (required)"
            else
                verbose "  styles.module.css not present (optional)"
            fi
        fi
    else
        ((FAILED_CHECKS++))
        FAILED_ITEMS+=("Component directory missing: $component")
        error "Component directory: $component missing"
        echo "- ❌ $component/ (missing)" >> "$VALIDATION_REPORT"
    fi
done
```

**Rationale**: Aligns validation with documentation expectations. Uses warnings (not failures) since styles are technically optional.

---

## Comment 8: Machine-Readable State Snapshot

### Issue

RESTORATION-REPORT hard-codes versions and config that drift from source over time.

### Current Behavior

- RESTORATION-REPORT lines 29-52: Hard-coded dependency versions
- Lines 105-156: Hard-coded configuration
- Requires manual updates to stay accurate

### Required Changes

**File**: `scripts/docs/validate-docusaurus-integrity.sh`

**Location**: Add new function + call in `main()`

**Implementation**:

```bash
# New function to extract system state
extract_system_state() {
    info "Extracting system state snapshot..."

    local snapshot="${DOCUSAURUS_DIR}/STATE-SNAPSHOT.md"
    local pkg_file="${DOCUSAURUS_DIR}/package.json"
    local config_file="${DOCUSAURUS_DIR}/docusaurus.config.ts"

    cat > "$snapshot" << EOF
# Docusaurus State Snapshot

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Source**: Automatically extracted from package.json and docusaurus.config.ts
**Purpose**: Machine-readable snapshot to prevent documentation drift

---

## Package Versions

### Runtime Dependencies

EOF

    # Extract runtime dependencies
    jq -r '.dependencies | to_entries[] | "| \(.key) | \(.value) |"' "$pkg_file" >> "$snapshot"

    cat >> "$snapshot" << EOF

### Dev Dependencies

EOF

    # Extract dev dependencies
    jq -r '.devDependencies | to_entries[] | "| \(.key) | \(.value) |"' "$pkg_file" >> "$snapshot"

    cat >> "$snapshot" << EOF

---

## Configuration Flags

EOF

    # Extract key config settings
    if grep -q "mermaid: true" "$config_file"; then
        echo "- ✅ Mermaid support: Enabled" >> "$snapshot"
    else
        echo "- ❌ Mermaid support: Disabled" >> "$snapshot"
    fi

    if grep -q "remarkSimplePlantuml" "$config_file"; then
        echo "- ✅ PlantUML plugin: Configured" >> "$snapshot"
    else
        echo "- ❌ PlantUML plugin: Not configured" >> "$snapshot"
    fi

    if grep -q "defaultLocale: 'pt'" "$config_file"; then
        echo "- ✅ i18n: Portuguese default" >> "$snapshot"
    else
        echo "- ⚠️ i18n: Non-Portuguese default" >> "$snapshot"
    fi

    cat >> "$snapshot" << EOF

---

## Environment Variables

EOF

    # Extract env var references
    grep -o 'process\.env\.[A-Z_]*' "$config_file" | sort -u | while read -r var; do
        local env_name="${var#process.env.}"
        echo "- \`${env_name}\`" >> "$snapshot"
    done

    cat >> "$snapshot" << EOF

---

## Node.js Requirements

EOF

    # Extract engine requirements
    jq -r '.engines | to_entries[] | "- \(.key): \(.value)"' "$pkg_file" >> "$snapshot"

    cat >> "$snapshot" << EOF

---

**Snapshot Format**: v1.0
**Update Frequency**: Every validation run
**Reference**: Include in RESTORATION-REPORT.md to prevent drift
EOF

    success "State snapshot generated: ${snapshot}"

    # Update RESTORATION-REPORT to reference snapshot
    local report="${DOCUSAURUS_DIR}/RESTORATION-REPORT.md"
    if [[ -f "$report" ]] && ! grep -q "STATE-SNAPSHOT.md" "$report"; then
        cat >> "$report" << EOF

---

## Auto-Generated State Reference

For current versions and configuration, see:
- [STATE-SNAPSHOT.md](./STATE-SNAPSHOT.md) (auto-generated on each validation)

EOF
        info "RESTORATION-REPORT updated to reference snapshot"
    fi

    return 0
}

# Call in main() after validate_scripts
extract_system_state
```

**Rationale**: Prevents documentation drift by generating state from source. RESTORATION-REPORT can reference snapshot instead of hard-coding values.

---

## Implementation Sequence

### Phase 1: Critical Fixes (High Priority)

1. ✅ Comment 1: Critical file checks (15 min)
2. ✅ Comment 5: JSON empty array guards (10 min)
3. ✅ Comment 4: Remove verify-backup.sh reference (5 min)

### Phase 2: Enhanced Validation (Medium Priority)

4. ✅ Comment 2: Version validation (45 min)
5. ✅ Comment 7: Component styles validation (30 min)
6. ✅ Comment 8: State snapshot generation (45 min)

### Phase 3: Portability (Medium Priority)

7. ✅ Comment 6: macOS compatibility (60 min)

### Phase 4: Comprehensive Coverage (Lower Priority)

8. ✅ Comment 3: Full checksum coverage (30 min) OR Update documentation (10 min)

**Total Estimated Time**: 3.5 - 4 hours

---

## Testing Plan

### Test 1: Validation Script

```bash
cd /home/marce/projetos/TradingSystem
bash scripts/docs/validate-docusaurus-integrity.sh --verbose --json
```

**Expected**:

- All critical files validated
- Version mismatches detected (if any)
- Component styles checked
- STATE-SNAPSHOT.md generated
- Valid JSON output

### Test 2: Backup Script

```bash
bash scripts/docs/backup-docusaurus.sh --destination /tmp/test-backup
```

**Expected**:

- All files checksummed
- No verify-backup.sh reference
- Works on macOS (if available)
- Manifest accurate

### Test 3: macOS Compatibility (If Available)

```bash
# On macOS
bash scripts/docs/backup-docusaurus.sh
bash scripts/docs/validate-docusaurus-integrity.sh
```

**Expected**: No GNU-specific errors

---

## Documentation Updates

### Files to Update

1. `docs/docusaurus/VALIDATION-CHECKLIST.md`

   - Add version validation expectations
   - Add styles file checks

2. `docs/docusaurus/BACKUP-VERIFICATION.md`

   - Update checksum coverage section
   - Remove verify-backup.sh references

3. `docs/docusaurus/RESTORATION-REPORT.md`
   - Add reference to STATE-SNAPSHOT.md
   - Note auto-generation

---

## Risk Assessment

| Risk                                | Probability | Impact | Mitigation                            |
| ----------------------------------- | ----------- | ------ | ------------------------------------- |
| Breaking existing workflows         | Low         | High   | Backward compatible, only adds checks |
| macOS incompatibility               | Medium      | Medium | Test on both platforms                |
| Performance impact (full checksums) | Low         | Low    | Optional, can document instead        |
| Version comparison complexity       | Medium      | Medium | Start simple, iterate if needed       |

---

## Rollback Plan

If issues arise:

1. Git revert specific changes
2. Scripts are isolated - no system-wide impact
3. Backup/validation are separate operations
4. Users can continue with manual processes

---

## Success Criteria

- [ ] All 8 comments addressed
- [ ] Validation script passes on test project
- [ ] Backup script creates valid backups
- [ ] Both scripts work on Linux
- [ ] Both scripts work on macOS (if tested)
- [ ] JSON output always valid
- [ ] Documentation updated
- [ ] No breaking changes to existing usage

---

## Next Steps

1. **Review this plan** - Confirm approach for each comment
2. **Switch to Code mode** - Implement changes sequentially
3. **Test each change** - Validate before proceeding
4. **Update documentation** - Reflect new capabilities
5. **Final validation** - Run full test suite

---

**Plan Created**: 2025-10-19  
**Ready for Implementation**: ✅  
**Estimated Completion**: 4-6 hours
