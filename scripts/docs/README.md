# Documentation Audit Tools

Comprehensive documentation validation and audit tooling for maintaining high-quality documentation standards across the project.

## Overview

The documentation audit tools provide automated validation for markdown documentation, ensuring consistency, completeness, and integrity across all documentation files.

### Features

- **Frontmatter Validation**: Ensures all markdown files have complete and valid YAML frontmatter
- **Link Validation**: Checks internal and external links for broken references
- **Duplicate Detection**: Identifies potential duplicate content that may need consolidation
- **Comprehensive Reporting**: Generates detailed markdown reports with actionable recommendations
- **AI-Optimized**: Validates documentation structure for optimal AI agent consumption

## Prerequisites

- Python 3.11+
- Required Python packages (see `requirements-docs.txt`)

### Installation

```bash
# Install dependencies
pip install -r requirements-docs.txt

# Or install individual packages
pip install PyYAML requests tenacity
```

## Quick Start

### Run Complete Audit

```bash
# Run full documentation audit on default directories (docs/context and docs/docusaurus)
bash scripts/docs/audit-documentation.sh

# Run with a custom output location
bash scripts/docs/audit-documentation.sh \
  --output ./docs/reports/custom-audit.md

# Run on a single custom directory
bash scripts/docs/audit-documentation.sh \
  --docs-dir ./my-docs

# Skip external link validation (faster)
bash scripts/docs/audit-documentation.sh \
  --skip-external-links

# Verbose mode with custom thresholds
bash scripts/docs/audit-documentation.sh \
  --verbose \
  --threshold-days 60 \
  --title-threshold 0.9
```

### Individual Scripts

#### Frontmatter Validation

Validates YAML frontmatter across all markdown files. Can scan multiple directories.

```bash
python scripts/docs/validate-frontmatter.py \
  --docs-dir ./docs/context ./docs/docusaurus \
  --output ./docs/reports/frontmatter-validation.json \
  --threshold-days 90 \
  --verbose
```

**What it checks:**
- Required fields: `title`, `sidebar_position`, `tags`, `domain`, `type`, `summary`, `status`, `last_review`
  - **Note:** `sidebar_position` is required per project documentation standard for Docusaurus navigation
  - Use `--strict` flag to enforce all field validations (enabled by default)
- Field types and formats
- Valid domain values: `frontend`, `backend`, `ops`, `shared`
- Valid type values: `guide`, `reference`, `adr`, `prd`, `rfc`, `runbook`, `overview`, `index`, `glossary`, `template`, `feature`
- Date format validation (YYYY-MM-DD)
- Document freshness (compares `last_review` to threshold)

**Strict Mode:**
- By default, all required fields are validated (strict mode)
- This ensures consistency with project documentation standards
- All fields listed above are mandatory for proper Docusaurus integration

**Output:** JSON file with detailed validation results

#### Link Validation

Validates internal and external links in documentation. Can scan multiple directories.

```bash
python scripts/docs/check-links.py \
  --docs-dir ./docs/context ./docs/docusaurus \
  --output ./docs/reports/link-validation.json \
  --skip-external \
  --timeout 5 \
  --verbose
```

**What it checks:**
- Internal links: File existence and anchor validity
- External links: HTTP status code validation
- Image links: Target file existence
- Directory links: Index file existence (`index.md`, `README.md`, or `_category_.json`)
  - **Note:** Supports Docusaurus `_category_.json` files as valid directory targets

**Output:** JSON file with broken link details and statistics

#### Duplicate Detection

Identifies potential duplicate content across documentation. Can scan multiple directories.

```bash
python scripts/docs/detect-duplicates.py \
  --docs-dir ./docs/context ./docs/docusaurus \
  --output ./docs/reports/duplicate-detection.json \
  --title-threshold 0.8 \
  --summary-threshold 0.7 \
  --verbose
```

**What it detects:**
- Exact duplicates (identical content hash)
- Similar titles (fuzzy string matching)
- Similar summaries (fuzzy string matching)
- Similar filenames in different directories
- Cross-domain duplicate patterns

**Output:** JSON file with duplicate analysis and recommendations

#### Report Generation

Transforms JSON validation outputs into human-readable markdown reports.

```bash
python scripts/docs/generate-audit-report.py \
  --frontmatter-json /tmp/audit/frontmatter.json \
  --links-json /tmp/audit/links.json \
  --duplicates-json /tmp/audit/duplicates.json \
  --output ./docs/reports/2025-10-17-documentation-audit.md \
  --date 2025-10-17
```

**Features:**
- Executive summary with health scores
- Detailed findings by category
- Prioritized recommendations
- Actionable checklist
- AI-optimization insights

## Output Formats

### JSON Outputs

Individual scripts generate structured JSON outputs with:
- Summary statistics
- Detailed findings
- File-specific issues
- Metadata and timestamps

### Markdown Report

The final audit report includes:
- Executive summary with health score
- Frontmatter validation results
- Link validation findings
- Duplicate detection analysis
- Prioritized recommendations
- Action items checklist
- Methodology appendix

## Configuration

### Environment Variables

No environment variables required. All configuration is done via command-line arguments.

### Default Thresholds

- **Document Freshness**: 90 days (configurable with `--threshold-days`)
- **Title Similarity**: 0.8 (80% similarity)
- **Summary Similarity**: 0.7 (70% similarity)
- **HTTP Timeout**: 5 seconds

### Customization

All scripts support extensive customization through command-line arguments. Use `--help` to see all available options.

## Integration

### CI/CD Pipeline

Add to your CI/CD workflow:

```yaml
# .github/workflows/docs-audit.yml
name: Documentation Audit
on: [push, pull_request]

jobs:
  docs-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements-docs.txt
      - name: Run documentation audit
        run: bash scripts/docs/audit-documentation.sh --verbose
      - name: Upload audit report
        uses: actions/upload-artifact@v3
        with:
          name: docs-audit-report
          path: docs/reports/*-documentation-audit.md
```

### Pre-commit Hook

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: docs-audit
        name: Documentation Audit
        entry: bash scripts/docs/audit-documentation.sh --skip-external-links
        language: system
        files: '^docs/.*\.md$'
        pass_filenames: false
```

## Troubleshooting

### Common Issues

1. **Missing Python packages**
   ```
   Error: Missing required Python packages: PyYAML requests
   Solution: pip install -r requirements-docs.txt
   ```

2. **Permission denied on audit script**
   ```
   Error: Permission denied
   Solution: chmod +x scripts/docs/audit-documentation.sh
   ```

3. **External link timeouts**
   ```
   Warning: Many external link timeouts
   Solution: Use --skip-external-links or increase --timeout
   ```

4. **Memory usage with large documentation sets**
   ```
   Error: Memory exhaustion
   Solution: Process subsets of documentation separately
   ```

### Debug Mode

Enable verbose logging for detailed execution information:

```bash
bash scripts/docs/audit-documentation.sh --verbose
```

### Temporary Files

Scripts use temporary directories in `/tmp/docs-audit-*` for intermediate JSON files. These are automatically cleaned up on completion.

## Examples

### Basic Audit

```bash
# Run audit on default docs directory
bash scripts/docs/audit-documentation.sh

# Output: docs/reports/2025-10-17-documentation-audit.md
```

### Custom Configuration

```bash
# Audit with custom settings
bash scripts/docs/audit-documentation.sh \
  --docs-dir ./custom-docs \
  --output ./reports/custom-audit.md \
  --threshold-days 30 \
  --title-threshold 0.9 \
  --skip-external-links \
  --verbose
```

### Individual Validation

```bash
# Only validate frontmatter
python scripts/docs/validate-frontmatter.py \
  --docs-dir ./docs/context \
  --output ./frontmatter-report.json

# Only check links
python scripts/docs/check-links.py \
  --docs-dir ./docs/context \
  --output ./links-report.json \
  --skip-external
```

## Architecture

### Script Dependencies

```
audit-documentation.sh (orchestrator)
├── validate-frontmatter.py
├── check-links.py
├── detect-duplicates.py
└── generate-audit-report.py
```

### Data Flow

1. **Input**: Markdown files in documentation directory
2. **Validation**: Individual scripts generate JSON outputs
3. **Processing**: Temporary directory stores intermediate JSON files
4. **Generation**: Report generator creates final markdown report
5. **Cleanup**: Temporary files automatically removed

### Error Handling

- Scripts continue execution even when individual validations find issues
- Non-zero exit codes indicate critical failures
- Warnings are logged for non-critical issues
- Detailed error messages included in reports

## Contributing

When adding new validation rules or modifying existing ones:

1. Update individual scripts with appropriate validation logic
2. Ensure JSON output format remains consistent
3. Update report generator to handle new validation types
4. Add documentation for new features
5. Test with various documentation scenarios

## License

These tools are part of the TradingSystem project and follow the same license terms.