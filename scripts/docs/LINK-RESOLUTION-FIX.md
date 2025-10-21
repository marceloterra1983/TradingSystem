# Documentation Audit Report Link Resolution Fix

## Problem

The documentation audit report generator (`generate-audit-report.py`) was generating incorrect relative links when saving reports to `docs/reports/`. 

### Issue Details

- **Input paths from JSON**: `docs/context/SUMMARY.md`
- **Previous link output**: `../docs/context/SUMMARY.md` (❌ broken)
- **Resolved path**: `docs/docs/context/SUMMARY.md` (invalid - double `docs/`)
- **Correct link output**: `../context/SUMMARY.md` (✅ correct)
- **Correct resolved path**: `docs/context/SUMMARY.md`

## Root Cause

The original implementation used a naive approach of prefixing `--docs-base ../` to file paths from JSON reports. This assumed paths in JSON were already relative to `docs/`, but they were actually repo-root relative (e.g., `docs/context/...`), causing incorrect double-prefixing.

## Solution

Implemented robust relative path computation using Python's `os.path.relpath()`:

1. **Capture report output directory** from `--output` argument
2. **Compute absolute path** to target file (repo-root / file_path)
3. **Calculate relative path** from report directory to target file
4. **Remove naive prefix logic** (deprecated `--docs-base` prefixing)

### Key Changes

#### 1. Modified `generate-audit-report.py`

**Updated `AuditReportGenerator.__init__()`**:
```python
def __init__(self, report_dir: Optional[Path] = None, strip_prefix: str = "", 
             docs_base: Optional[str] = None) -> None:
    self.report_dir = report_dir  # New: capture report output directory
    self.strip_prefix = strip_prefix  # New: optional prefix stripping (not used currently)
    self.docs_base = Path(docs_base) if docs_base else None  # Legacy override
    self.repo_root = Path.cwd().resolve()  # New: repository root reference
```

**Rewrote `_format_path()` method**:
```python
def _format_path(self, file_path: str) -> str:
    # If docs_base is explicitly provided, use legacy behavior (backward compatibility)
    if self.docs_base is not None:
        # ... legacy logic ...
        
    # Compute absolute path to target file (file_path is repo-root relative)
    target_file = self.repo_root / file_path
    
    # Compute relative path from report directory to target file
    relative_path = os.path.relpath(target_file, self.report_dir)
    return relative_path
```

**Updated `main()` function**:
```python
# Capture report output directory from --output argument
output_path = Path(args.output).resolve()
report_dir = output_path.parent

# Pass report_dir to generator for automatic relative path computation
generator = AuditReportGenerator(
    report_dir=report_dir,
    strip_prefix=args.strip_prefix,
    docs_base=args.docs_base  # Only used if explicitly provided
)
```

**Added CLI arguments**:
- `--strip-prefix`: Optional prefix stripping (default: empty, available for future use)
- Updated `--docs-base`: Now optional legacy override (default: None)

#### 2. Updated `audit-documentation.sh`

**Before**:
```bash
local cmd=(
    python3 "$script_path"
    --output "$OUTPUT_FILE"
    --docs-base "../"  # ❌ Caused incorrect paths
)
```

**After**:
```bash
local cmd=(
    python3 "$script_path"
    --output "$OUTPUT_FILE"
    # No --docs-base argument - uses automatic relative path computation
)
```

## Verification

### 1. Unit Tests

Created `scripts/docs/test-link-resolution.py` to validate path computation:

```bash
$ python3 scripts/docs/test-link-resolution.py

✅ All tests passed!
- docs/context/SUMMARY.md → ../context/SUMMARY.md
- docs/context/backend/README.md → ../context/backend/README.md
- docs/context/frontend/guides/dark-mode.md → ../context/frontend/guides/dark-mode.md
- docs/reports/other-report.md → other-report.md (edge case)
- README.md → ../../README.md (root level)
```

### 2. Report Verification

Regenerated `docs/reports/2025-10-17-documentation-audit.md` and verified:

```bash
$ cd docs/reports
$ ls -la ../context/SUMMARY.md  # ✅ File exists
$ ls -la ../context/backend/README.md  # ✅ File exists
$ ls -la ../context/frontend/guides/dark-mode.md  # ✅ File exists
```

### 3. Link Format Check

```bash
$ grep -o '](../[^)]*' docs/reports/2025-10-17-documentation-audit.md | head -5

](../context/SUMMARY.md
](../context/backend/api/documentation-api/implementation-plan.md
](../context/backend/api/documentation-api/openspec-proposal-summary.md
](../context/backend/architecture/b3-integration-plan.md
](../context/backend/architecture/b3-inventory.md
```

All links now correctly use `../context/...` format instead of broken `../docs/context/...`.

## Backward Compatibility

The solution maintains backward compatibility:

1. **Legacy `--docs-base` argument**: Still available as an override if needed
2. **Fallback behavior**: If `report_dir` is not set, returns paths as-is
3. **Graceful handling**: Catches `ValueError` for cross-drive paths (Windows edge case)

## Benefits

1. ✅ **Correct link resolution**: Links now properly resolve from report location to target files
2. ✅ **Flexible output location**: Works regardless of where the report is saved
3. ✅ **Maintainable**: Uses standard Python path computation instead of manual string manipulation
4. ✅ **Testable**: Includes comprehensive test suite for validation
5. ✅ **Future-proof**: Supports arbitrary report output locations and repository structures

## Files Modified

- `scripts/docs/generate-audit-report.py` - Rewrote link resolution logic
- `scripts/docs/audit-documentation.sh` - Removed `--docs-base "../"` argument
- `docs/reports/2025-10-17-documentation-audit.md` - Regenerated with correct links

## Files Added

- `scripts/docs/test-link-resolution.py` - Test suite for link resolution validation
- `scripts/docs/LINK-RESOLUTION-FIX.md` - This documentation

## Testing Checklist

- [x] Unit tests pass (`test-link-resolution.py`)
- [x] Report regenerated successfully
- [x] Links resolve to actual files (verified with `ls -la`)
- [x] Link format correct throughout all sections (frontmatter, links, duplicates)
- [x] No linter errors in modified Python files
- [x] Backward compatibility maintained (`--docs-base` still works)
- [x] Edge cases tested (same directory, deeply nested paths, root level files)

## Usage

### Generate Report (New Method - Automatic)

```bash
# Report directory is auto-detected from --output path
bash scripts/docs/audit-documentation.sh \
  --output ./docs/reports/2025-10-17-documentation-audit.md

# Links will automatically be relative from docs/reports/ to target files
```

### Generate Report (Legacy Method - Manual Override)

```bash
# Explicitly provide docs_base for custom behavior
python3 scripts/docs/generate-audit-report.py \
  --frontmatter-json /tmp/audit/frontmatter.json \
  --links-json /tmp/audit/links.json \
  --duplicates-json /tmp/audit/duplicates.json \
  --output ./custom/location/report.md \
  --docs-base "../../docs"  # Manual override
```

### Run Tests

```bash
# Run link resolution test suite
python3 scripts/docs/test-link-resolution.py

# Expected output: 🎉 All tests passed!
```

## Conclusion

The link resolution fix ensures that all documentation audit reports generate correct, clickable links that properly resolve from the report location to target files. The solution is robust, testable, and maintains backward compatibility while providing a better default behavior.

