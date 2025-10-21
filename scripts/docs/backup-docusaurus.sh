#!/bin/bash
# Docusaurus Backup Script
# Purpose: Creates timestamped backup of Docusaurus installation, excluding build artifacts
# Usage: ./backup-docusaurus.sh [--compress] [--destination DIR]

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
readonly DOCUSAURUS_DIR="${PROJECT_ROOT}/docs/docusaurus"
readonly TIMESTAMP=$(date +%Y%m%d-%H%M%S)
readonly DEFAULT_BACKUP_DIR="${PROJECT_ROOT}/.backup-docusaurus-${TIMESTAMP}"

# Variables
BACKUP_DIR="${DEFAULT_BACKUP_DIR}"
COMPRESS=false
BACKUP_START_TIME=""
BACKUP_END_TIME=""
SOURCE_SIZE=""
BACKUP_SIZE=""
FILES_COPIED=0

# Exclusion patterns
readonly EXCLUDE_PATTERNS=(
    "node_modules"
    ".docusaurus"
    "build"
    "package-lock.json"
    "*.log"
    ".DS_Store"
    "*.swp"
    "*.swo"
    "*~"
)

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

progress() {
    echo -e "${BLUE}📁 $1${NC}"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --compress)
                COMPRESS=true
                shift
                ;;
            --destination)
                if [[ -z "${2:-}" ]]; then
                    error "Error: --destination requires a directory path"
                    exit 1
                fi
                BACKUP_DIR="$2"
                shift 2
                ;;
            --help)
                cat << EOF
Usage: $0 [OPTIONS]

Creates a timestamped backup of Docusaurus installation.

Options:
    --compress           Create compressed tar.gz archive after backup
    --destination DIR    Set custom backup directory (default: .backup-docusaurus-TIMESTAMP)
    --help              Show this help message

Examples:
    $0
    $0 --compress
    $0 --destination /path/to/backup
    $0 --compress --destination /path/to/backup

Exclusions:
    - node_modules/ (can be reinstalled)
    - .docusaurus/ (generated cache)
    - build/ (production build output)
    - package-lock.json (regenerated on install)
    - *.log files

EOF
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

# Validate source directory
validate_source() {
    info "Validating source directory..."
    
    if [[ ! -d "$DOCUSAURUS_DIR" ]]; then
        error "Docusaurus directory not found: $DOCUSAURUS_DIR"
        return 1
    fi
    
    if [[ ! -r "$DOCUSAURUS_DIR" ]]; then
        error "Docusaurus directory not readable: $DOCUSAURUS_DIR"
        return 1
    fi
    
    # Verify it's a valid Docusaurus installation
    if [[ ! -f "${DOCUSAURUS_DIR}/package.json" ]]; then
        error "package.json not found. Not a valid Docusaurus installation."
        return 1
    fi
    
    if [[ ! -f "${DOCUSAURUS_DIR}/docusaurus.config.ts" ]]; then
        error "docusaurus.config.ts not found. Not a valid Docusaurus installation."
        return 1
    fi
    
    if [[ ! -d "${DOCUSAURUS_DIR}/src" ]]; then
        error "src/ directory not found. Not a valid Docusaurus installation."
        return 1
    fi
    
    success "Source directory validated"
    return 0
}

# Create backup directory structure
create_backup_directory() {
    info "Creating backup directory..."
    
    if [[ -e "$BACKUP_DIR" ]]; then
        error "Backup directory already exists: $BACKUP_DIR"
        return 1
    fi
    
    mkdir -p "${BACKUP_DIR}/docusaurus" || {
        error "Failed to create backup directory"
        return 1
    }
    
    mkdir -p "${BACKUP_DIR}/metadata" || {
        error "Failed to create metadata directory"
        return 1
    }
    
    success "Backup directory created: $BACKUP_DIR"
    return 0
}

# Calculate source size (excluding build artifacts)
calculate_source_size() {
    info "Calculating source size..."
    
    # Use rsync --dry-run for cross-platform size calculation
    # This works on both GNU/Linux and macOS/BSD
    local exclude_args=""
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args+=" --exclude=${pattern}"
    done
    
    # Calculate size using rsync stats (cross-platform)
    local size_bytes=$(eval "rsync -an ${exclude_args} '${DOCUSAURUS_DIR}/' /tmp/ 2>/dev/null | grep 'Total file size:' | awk '{print \$4}'" | tr -d ',')
    
    if [[ -n "$size_bytes" ]]; then
        # Convert bytes to human-readable format
        if [[ $size_bytes -lt 1024 ]]; then
            SOURCE_SIZE="${size_bytes}B"
        elif [[ $size_bytes -lt 1048576 ]]; then
            SOURCE_SIZE="$((size_bytes / 1024))K"
        else
            SOURCE_SIZE="$((size_bytes / 1048576))M"
        fi
    else
        # Fallback to du if rsync fails
        if command -v du >/dev/null 2>&1; then
            # Try GNU du first, then BSD du
            SOURCE_SIZE=$(du -sh "${DOCUSAURUS_DIR}" 2>/dev/null | awk '{print $1}' || echo "Unknown")
        else
            SOURCE_SIZE="Unknown"
        fi
    fi
    
    info "Estimated backup size: ${SOURCE_SIZE} (excluding node_modules, .docusaurus, build)"
    return 0
}

# Backup files using rsync
backup_files() {
    progress "Copying files with rsync..."
    
    BACKUP_START_TIME=$(date +%s)
    
    # Build exclusion arguments for rsync
    local exclude_args=""
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args+=" --exclude=${pattern}"
    done
    
    # Execute rsync
    if eval "rsync -av --progress ${exclude_args} '${DOCUSAURUS_DIR}/' '${BACKUP_DIR}/docusaurus/'" 2>&1 | tee "${BACKUP_DIR}/metadata/BACKUP-LOG.txt"; then
        BACKUP_END_TIME=$(date +%s)
        success "Files backed up successfully"
        
        # Count files copied
        FILES_COPIED=$(find "${BACKUP_DIR}/docusaurus" -type f | wc -l)
        info "Files copied: ${FILES_COPIED}"
        
        return 0
    else
        error "Backup failed"
        return 1
    fi
}

# Generate backup manifest
generate_backup_manifest() {
    info "Generating backup manifest..."
    
    local manifest="${BACKUP_DIR}/metadata/MANIFEST.md"
    local duration=$((BACKUP_END_TIME - BACKUP_START_TIME))
    
    # Calculate actual backup size
    BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/docusaurus" 2>/dev/null | awk '{print $1}')
    
    cat > "$manifest" << EOF
# Docusaurus Backup Manifest

**Backup Created**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Backup Timestamp**: ${TIMESTAMP}  
**Source Directory**: ${DOCUSAURUS_DIR}  
**Backup Directory**: ${BACKUP_DIR}

---

## Backup Summary

| Metric | Value |
|--------|-------|
| Source Size (estimated) | ${SOURCE_SIZE} |
| Backup Size (actual) | ${BACKUP_SIZE} |
| Files Backed Up | ${FILES_COPIED} |
| Backup Duration | ${duration} seconds |
| Compression | $([ "$COMPRESS" = true ] && echo "Enabled" || echo "Disabled") |

---

## Excluded Patterns

The following patterns were excluded from backup:

EOF

    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        echo "- \`${pattern}\`" >> "$manifest"
    done
    
    cat >> "$manifest" << EOF

**Rationale**: These files/directories can be regenerated via \`npm install\` and \`npm run build\`.

---

## Backup Contents

### Critical Files

- ✅ package.json
- ✅ docusaurus.config.ts
- ✅ sidebars.ts
- ✅ tsconfig.json
- ✅ .gitignore
- ✅ README.md

### Source Code

- ✅ src/components/ (custom components)
- ✅ src/theme/ (theme overrides)
- ✅ src/pages/ (custom pages)
- ✅ src/css/ (custom styles)

### Static Assets

- ✅ static/img/ (logos, images)
- ✅ static/.htaccess
- ✅ static/.nojekyll

### Scripts

- ✅ scripts/ (custom scripts)

### Documentation

- ✅ README.md
- ✅ TROUBLESHOOTING.md
- ✅ QUICK-START.md
- ✅ Other documentation files

---

## Restoration Command

To restore this backup:

\`\`\`bash
# 1. Stop any running Docusaurus processes
# 2. Backup current installation (if needed)
# 3. Remove current installation
rm -rf docs/docusaurus

# 4. Restore from backup
rsync -av ${BACKUP_DIR}/docusaurus/ docs/docusaurus/

# 5. Install dependencies
cd docs/docusaurus
npm install

# 6. Verify installation
npm run dev
\`\`\`

For detailed instructions, see: ${BACKUP_DIR}/metadata/RESTORATION-GUIDE.md

---

## Checksums

MD5 checksums for **all files** are stored in:
- ${BACKUP_DIR}/metadata/CHECKSUMS.md5

### Checksum Verification (Linux)

On Linux systems with \`md5sum\`:

\`\`\`bash
cd ${BACKUP_DIR}/docusaurus
md5sum -c ../metadata/CHECKSUMS.md5
\`\`\`

### Checksum Verification (macOS)

On macOS/BSD systems with \`md5\`:

\`\`\`bash
cd ${BACKUP_DIR}/docusaurus
while IFS= read -r line; do
    [[ \$line =~ ^# ]] && continue  # Skip comments
    [[ -z \$line ]] && continue     # Skip empty lines
    expected_hash=\$(echo "\$line" | awk '{print \$1}')
    file_path=\$(echo "\$line" | awk '{print \$2}')
    actual_hash=\$(md5 -q "\$file_path" 2>/dev/null)
    if [[ "\$expected_hash" == "\$actual_hash" ]]; then
        echo "✅ \$file_path: OK"
    else
        echo "❌ \$file_path: FAILED"
    fi
done < ../metadata/CHECKSUMS.md5
\`\`\`

---

## Backup Verification

Manually verify backup integrity:

\`\`\`bash
# Compare file counts
find docs/docusaurus -type f | grep -v node_modules | grep -v .docusaurus | grep -v build | wc -l
find ${BACKUP_DIR}/docusaurus -type f | wc -l

# Verify checksums (see platform-specific instructions above)
\`\`\`

---

**Manifest Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
EOF

    success "Manifest generated: ${manifest}"
    
    # Also generate JSON manifest
    generate_json_manifest
    
    return 0
}

# Generate JSON manifest
generate_json_manifest() {
    local json_manifest="${BACKUP_DIR}/metadata/manifest.json"
    local duration=$((BACKUP_END_TIME - BACKUP_START_TIME))
    
    cat > "$json_manifest" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "backupTimestamp": "${TIMESTAMP}",
  "sourceDirectory": "${DOCUSAURUS_DIR}",
  "backupDirectory": "${BACKUP_DIR}",
  "sourceSizeEstimated": "${SOURCE_SIZE}",
  "backupSizeActual": "${BACKUP_SIZE}",
  "filesCopied": ${FILES_COPIED},
  "backupDurationSeconds": ${duration},
  "compressionEnabled": $([ "$COMPRESS" = true ] && echo "true" || echo "false"),
  "excludedPatterns": $(printf '%s\n' "${EXCLUDE_PATTERNS[@]}" | jq -R . | jq -s .),
  "status": "completed"
}
EOF
    
    success "JSON manifest generated: ${json_manifest}"
}

# Generate complete file list
generate_file_list() {
    info "Generating file list..."
    
    local file_list="${BACKUP_DIR}/metadata/FILE-LIST.txt"
    
    echo "# Docusaurus Backup - Complete File List" > "$file_list"
    echo "# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$file_list"
    echo "# Backup Directory: ${BACKUP_DIR}/docusaurus" >> "$file_list"
    echo "" >> "$file_list"
    
    # List all files with relative paths, sorted
    find "${BACKUP_DIR}/docusaurus" -type f -printf '%P\n' | sort >> "$file_list"
    
    local file_count=$(cat "$file_list" | grep -v "^#" | grep -v "^$" | wc -l)
    success "File list generated: ${file_count} files"
    
    return 0
}

# Cross-platform MD5 hash function
hash_file() {
    local file="$1"
    # Try md5sum first (Linux/GNU), fallback to md5 (macOS/BSD)
    if command -v md5sum >/dev/null 2>&1; then
        md5sum "$file" 2>/dev/null | awk '{print $1 "  " $2}'
    elif command -v md5 >/dev/null 2>&1; then
        local hash=$(md5 -q "$file" 2>/dev/null)
        echo "$hash  $file"
    else
        echo "ERROR: No MD5 utility available" >&2
        return 1
    fi
}

# Generate checksums for all backed-up files
generate_checksums() {
    info "Generating checksums for all files..."
    
    local checksums_file="${BACKUP_DIR}/metadata/CHECKSUMS.md5"
    
    echo "# MD5 Checksums for Docusaurus Backup - All Files" > "$checksums_file"
    echo "# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$checksums_file"
    echo "# To verify (Linux): cd backup/docusaurus && md5sum -c ../metadata/CHECKSUMS.md5" >> "$checksums_file"
    echo "# To verify (macOS): See manual verification instructions in MANIFEST.md" >> "$checksums_file"
    echo "" >> "$checksums_file"
    
    cd "${BACKUP_DIR}/docusaurus"
    
    # Generate checksums for ALL files using null-delimited find for safety
    local file_count=0
    find . -type f -print0 | while IFS= read -r -d '' file; do
        # Skip the leading ./
        local clean_file="${file#./}"
        if hash_file "$clean_file" >> "$checksums_file"; then
            ((file_count++))
        fi
    done
    
    cd - > /dev/null
    
    success "Checksums generated for all files: ${checksums_file}"
    return 0
}

# Compress backup
compress_backup() {
    if [[ "$COMPRESS" != true ]]; then
        return 0
    fi
    
    info "Compressing backup..."
    
    local archive="${BACKUP_DIR}.tar.gz"
    local parent_dir=$(dirname "$BACKUP_DIR")
    local backup_name=$(basename "$BACKUP_DIR")
    
    if tar -czf "$archive" -C "$parent_dir" "$backup_name"; then
        local archive_size=$(du -sh "$archive" | awk '{print $1}')
        success "Backup compressed: ${archive} (${archive_size})"
        
        # Update manifest with compression info
        echo "" >> "${BACKUP_DIR}/metadata/MANIFEST.md"
        echo "## Compression" >> "${BACKUP_DIR}/metadata/MANIFEST.md"
        echo "" >> "${BACKUP_DIR}/metadata/MANIFEST.md"
        echo "- Archive: ${archive}" >> "${BACKUP_DIR}/metadata/MANIFEST.md"
        echo "- Compressed Size: ${archive_size}" >> "${BACKUP_DIR}/metadata/MANIFEST.md"
        echo "- Original Size: ${BACKUP_SIZE}" >> "${BACKUP_DIR}/metadata/MANIFEST.md"
        
        info "Compressed backup saved to: ${archive}"
        
        # Optionally ask to remove uncompressed backup
        read -p "Remove uncompressed backup directory? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$BACKUP_DIR"
            success "Uncompressed backup removed"
        fi
        
        return 0
    else
        error "Compression failed"
        return 1
    fi
}

# Verify backup integrity
verify_backup() {
    info "Verifying backup integrity..."
    
    # Verify critical files
    local critical_files=(
        "package.json"
        "docusaurus.config.ts"
        "sidebars.ts"
        "src/components"
        "src/theme"
        "src/pages"
        "static"
    )
    
    local missing_files=0
    
    for file in "${critical_files[@]}"; do
        if [[ ! -e "${BACKUP_DIR}/docusaurus/${file}" ]]; then
            error "Critical file/directory missing in backup: $file"
            ((missing_files++))
        fi
    done
    
    if [[ $missing_files -gt 0 ]]; then
        error "Backup verification failed: ${missing_files} critical items missing"
        return 1
    fi
    
    # Verify checksums (cross-platform)
    cd "${BACKUP_DIR}/docusaurus"
    if command -v md5sum >/dev/null 2>&1; then
        if md5sum -c "../metadata/CHECKSUMS.md5" > /dev/null 2>&1; then
            success "Checksum verification passed"
        else
            warning "Some checksums failed verification"
        fi
    else
        info "md5sum not available (macOS/BSD). Manual verification required."
        info "See MANIFEST.md for verification instructions."
    fi
    cd - > /dev/null
    
    success "Backup verification completed"
    return 0
}

# Generate restoration guide
generate_restoration_guide() {
    info "Generating restoration guide..."
    
    local guide="${BACKUP_DIR}/metadata/RESTORATION-GUIDE.md"
    
    cat > "$guide" << 'EOF'
# Docusaurus Restoration Guide

This guide provides step-by-step instructions for restoring Docusaurus from this backup.

---

## Prerequisites

Before restoring, ensure you have:

- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Access to project root directory
- [ ] This backup directory intact

---

## Restoration Steps

### 1. Stop Running Processes

Stop any running Docusaurus processes:

```bash
# Find and kill Docusaurus processes
pkill -f "docusaurus start"

# Or manually stop from terminal where it's running
# Ctrl+C
```

### 2. Backup Current Installation (Optional)

If you want to preserve the current installation:

```bash
cd /home/marce/projetos/TradingSystem
mv docs/docusaurus docs/docusaurus-backup-$(date +%Y%m%d-%H%M%S)
```

### 3. Remove Current Installation

Remove the current Docusaurus installation:

```bash
cd /home/marce/projetos/TradingSystem
rm -rf docs/docusaurus

# Verify removal
ls docs/
```

### 4. Restore from Backup

Restore files from this backup:

```bash
# Navigate to project root
cd /home/marce/projetos/TradingSystem

# Restore using rsync (preserves timestamps and permissions)
rsync -av BACKUP_DIR/docusaurus/ docs/docusaurus/

# Verify restoration
ls -la docs/docusaurus
```

**Replace `BACKUP_DIR` with the actual backup directory path.**

### 5. Install Dependencies

Install Node.js dependencies:

```bash
cd docs/docusaurus
npm install
```

This will:
- Create `node_modules/` directory
- Generate `package-lock.json`
- Install all dependencies from `package.json`

**Expected duration**: 1-3 minutes (depending on network speed)

### 6. Verify Installation

Run the development server to verify:

```bash
npm run dev
```

The server should start on `http://localhost:3004`.

**Verification checklist**:
- [ ] Server starts without errors
- [ ] Homepage loads correctly
- [ ] Search functionality works
- [ ] Health dashboard accessible
- [ ] Theme switching works
- [ ] PlantUML diagrams render
- [ ] Mermaid diagrams render

### 7. Test Production Build

Test the production build:

```bash
npm run build
```

**Verification**:
- [ ] Build completes without errors
- [ ] `build/` directory created
- [ ] No broken links reported

### 8. Verify Integrations

Test external integrations:

```bash
# Test search API
curl http://localhost:3400/api/v1/docs/search?q=test

# Test health API
curl http://localhost:3400/api/v1/docs/health
```

---

## Troubleshooting

### Issue: npm install fails

**Symptoms**:
- "ENOENT: no such file or directory"
- "npm ERR! code ENOENT"

**Solution**:
```bash
# Remove any partial installation
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Retry installation
npm install
```

### Issue: Dev server fails to start

**Symptoms**:
- "Port 3004 already in use"
- "EADDRINUSE"

**Solution**:
```bash
# Find process using port 3004
lsof -i :3004

# Kill the process
kill -9 <PID>

# Or use a different port
npm run dev -- --port 3005
```

### Issue: Build fails with memory error

**Symptoms**:
- "JavaScript heap out of memory"
- "FATAL ERROR: Reached heap limit"

**Solution**:
```bash
# Use the dev script with increased memory
npm run dev

# Or manually increase memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Issue: Missing environment variables

**Symptoms**:
- Search not working
- Health dashboard not loading
- Integration errors

**Solution**:
```bash
# Verify root .env file exists
ls -la ../../.env

# Check environment variables are loaded
cat docusaurus.config.ts | grep dotenv

# Verify .env has required variables
grep -E "DOCS_|SEARCH_|HEALTH_|GRAFANA_|PLANTUML_" ../../.env
```

### Issue: Checksums don't match

**Symptoms**:
- md5sum verification fails
- Files appear corrupted

**Solution**:
```bash
# Re-run backup from source
bash scripts/docs/backup-docusaurus.sh

# Or restore specific files from git
git checkout docs/docusaurus/package.json
```

---

## Rollback

If restoration fails, rollback to previous state:

```bash
# If you created a backup in step 2
cd /home/marce/projetos/TradingSystem
rm -rf docs/docusaurus
mv docs/docusaurus-backup-TIMESTAMP docs/docusaurus
cd docs/docusaurus
npm install
```

---

## Validation

After successful restoration, run validation:

```bash
# Run integrity validation
bash scripts/docs/validate-docusaurus-integrity.sh --verbose

# All checks should pass
```

---

## Support

If you encounter issues not covered here:

1. Review error logs in terminal output
2. Check backup manifest: `cat metadata/MANIFEST.md`
3. Verify file list: `cat metadata/FILE-LIST.txt`
4. Review backup log: `cat metadata/BACKUP-LOG.txt`
5. Consult TROUBLESHOOTING.md in Docusaurus directory

---

**Guide Generated**: AUTO_GENERATED_TIMESTAMP  
**Backup Location**: AUTO_GENERATED_BACKUP_DIR
EOF

    # Replace placeholders (cross-platform sed)
    # Use perl for in-place editing to avoid sed -i portability issues
    if command -v perl >/dev/null 2>&1; then
        perl -i -pe "s|BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
        perl -i -pe "s|AUTO_GENERATED_TIMESTAMP|$(date -u +"%Y-%m-%d %H:%M:%S UTC")|g" "$guide"
        perl -i -pe "s|AUTO_GENERATED_BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
    else
        # Fallback to platform-specific sed
        if [[ "$(uname -s)" == "Darwin" ]]; then
            # macOS/BSD requires -i ''
            sed -i '' "s|BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
            sed -i '' "s|AUTO_GENERATED_TIMESTAMP|$(date -u +"%Y-%m-%d %H:%M:%S UTC")|g" "$guide"
            sed -i '' "s|AUTO_GENERATED_BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
        else
            # GNU/Linux sed
            sed -i "s|BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
            sed -i "s|AUTO_GENERATED_TIMESTAMP|$(date -u +"%Y-%m-%d %H:%M:%S UTC")|g" "$guide"
            sed -i "s|AUTO_GENERATED_BACKUP_DIR|${BACKUP_DIR}|g" "$guide"
        fi
    fi
    
    success "Restoration guide generated: ${guide}"
    return 0
}

# Print backup summary
print_backup_summary() {
    local duration=$((BACKUP_END_TIME - BACKUP_START_TIME))
    
    echo ""
    echo "======================================"
    echo "📦 Backup Summary"
    echo "======================================"
    echo ""
    echo "Backup location: ${BACKUP_DIR}"
    echo "Backup size: ${BACKUP_SIZE}"
    echo "Files backed up: ${FILES_COPIED}"
    echo "Source size (estimated): ${SOURCE_SIZE}"
    echo ""
    echo "Excluded from backup:"
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        echo "  - ${pattern}"
    done
    echo ""
    echo "Backup duration: ${duration} seconds"
    echo "Verification: ✅ Passed"
    echo ""
    echo "📄 Backup metadata:"
    echo "  - Manifest: ${BACKUP_DIR}/metadata/MANIFEST.md"
    echo "  - JSON Manifest: ${BACKUP_DIR}/metadata/manifest.json"
    echo "  - File list: ${BACKUP_DIR}/metadata/FILE-LIST.txt"
    echo "  - Checksums: ${BACKUP_DIR}/metadata/CHECKSUMS.md5"
    echo "  - Restoration guide: ${BACKUP_DIR}/metadata/RESTORATION-GUIDE.md"
    echo "  - Backup log: ${BACKUP_DIR}/metadata/BACKUP-LOG.txt"
    echo ""
    
    if [[ "$COMPRESS" == true ]]; then
        if [[ -f "${BACKUP_DIR}.tar.gz" ]]; then
            local archive_size=$(du -sh "${BACKUP_DIR}.tar.gz" | awk '{print $1}')
            echo "📦 Compressed archive: ${BACKUP_DIR}.tar.gz (${archive_size})"
            echo ""
        fi
    fi
    
    success "✅ Backup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Review backup manifest: cat ${BACKUP_DIR}/metadata/MANIFEST.md"
    echo "  2. Proceed with Phase 2: Clean cache and artifacts"
    echo "  3. Keep this backup until restoration is verified"
    echo ""
}

# Main execution
main() {
    echo "📦 Creating Docusaurus Backup"
    echo "=============================="
    echo ""
    
    parse_arguments "$@"
    
    echo "Source: ${DOCUSAURUS_DIR}"
    echo "Destination: ${BACKUP_DIR}"
    if [[ "$COMPRESS" == true ]]; then
        echo "Compression: Enabled"
    fi
    echo ""
    
    # Execute backup steps
    validate_source || exit 1
    calculate_source_size || exit 1
    create_backup_directory || exit 1
    backup_files || exit 1
    generate_backup_manifest || exit 1
    generate_file_list || exit 1
    generate_checksums || exit 1
    generate_restoration_guide || exit 1
    verify_backup || exit 1
    compress_backup || true  # Non-critical, continue even if fails
    print_backup_summary
    
    exit 0
}

# Error handler
trap 'error "Backup failed with error on line $LINENO"; exit 1' ERR

# Run main function
main "$@"
