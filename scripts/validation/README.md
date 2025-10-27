# Validation Scripts

Automated validation tools for TradingSystem project organization and configuration.

## 📋 Available Scripts

### 1. validate-manifest.sh
**Purpose:** Validates `config/services-manifest.json` for correctness

**Checks:**
- ✓ JSON syntax validity
- ✓ Service paths exist on filesystem
- ✓ Port conflicts between services
- ✓ Required fields present (id, type, path, start)
- ✓ Valid service types (backend, frontend, docs, infra, external)

**Usage:**
```bash
bash scripts/validation/validate-manifest.sh
```

**Example Output:**
```
✓ Manifest file exists
✓ JSON syntax is valid
✗ ERROR: Service 'tp-capital-signals': Port 3200 conflicts with 'workspace-api'
✓ Service 'dashboard': All required fields present
```

---

### 2. detect-port-conflicts.sh
**Purpose:** Comprehensive port conflict detection across the entire project

**Scans:**
- services-manifest.json
- All Docker Compose files
- .env and .env.local files
- package.json npm scripts
- Running processes (with --include-running flag)

**Usage:**
```bash
# Basic scan (configuration files only)
bash scripts/validation/detect-port-conflicts.sh

# Include currently running processes
bash scripts/validation/detect-port-conflicts.sh --include-running
```

**Example Output:**
```
═══════════════════════════════════════
  Port Allocation Map
═══════════════════════════════════════

PORT     SERVICE                   SOURCE
────     ───────                   ──────
3103     dashboard                 services-manifest.json
3200     workspace-api             docker-compose.apps.yml
3200     tp-capital-signals        services-manifest.json  ← CONFLICT!
```

---

### 3. validate-readmes.sh
**Purpose:** Ensures README files are consistent and complete

**Checks:**
- ✓ README.md exists in key directories
- ✓ Service READMEs have required sections (Installation, Quick Start, Configuration)
- ✓ Port numbers match services-manifest.json
- ✓ CLAUDE.md mentions all key services
- ✓ No broken internal links

**Usage:**
```bash
bash scripts/validation/validate-readmes.sh
```

**Example Output:**
```
✓ apps/README.md exists
✗ ERROR: apps/tp-capital/README.md is missing
⚠ WARNING: Service 'workspace-api': Port 3200 NOT mentioned in README
✓ Section 'Quick Start' found in backend/api/workspace/README.md
```

---

### 4. detect-docker-duplicates.sh
**Purpose:** Detects duplicate service definitions across Docker Compose files

**Checks:**
- ✓ Duplicate service names
- ✓ Duplicate container names
- ✓ Network definition conflicts
- ⓘ Organizational analysis

**Usage:**
```bash
bash scripts/validation/detect-docker-duplicates.sh
```

**Example Output:**
```
✓ No duplicate service names found (15 services checked)
✗ DUPLICATE: Container 'workspace-service' defined in multiple files:
  • docker-compose.apps.yml
  • docker-compose.workspace.yml
⚠ WARNING: Network 'tradingsystem_backend' defined in 3 files
```

---

## 🚀 Quick Start

### Run All Validations

```bash
# Navigate to project root
cd /home/marce/Projetos/TradingSystem

# Make scripts executable (one-time setup)
chmod +x scripts/validation/*.sh

# Run all validations
bash scripts/validation/validate-manifest.sh
bash scripts/validation/detect-port-conflicts.sh
bash scripts/validation/validate-readmes.sh
bash scripts/validation/detect-docker-duplicates.sh
```

### Run Comprehensive Check (All Scripts)

```bash
# One-liner to run all validations
for script in scripts/validation/*.sh; do
    echo "Running $script..."
    bash "$script"
    echo ""
done
```

---

## 🔧 Dependencies

### Required
- `bash` (version 4.0+)
- `jq` - JSON processor

**Install jq:**
```bash
# Ubuntu/Debian
sudo apt install jq

# macOS
brew install jq
```

### Optional (Improves Accuracy)
- `yq` - YAML processor (for Docker Compose analysis)

**Install yq:**
```bash
# Ubuntu/Debian
sudo snap install yq

# macOS
brew install yq
```

**Note:** Scripts will use grep fallback if yq is not available.

---

## 📊 Understanding Exit Codes

All scripts follow standard exit code conventions:

- `0` - Validation passed (no errors)
- `1` - Validation failed (errors found)

**Warnings do not cause failure** - only errors do.

```bash
# Example: Check if validation passed
if bash scripts/validation/validate-manifest.sh; then
    echo "Manifest is valid!"
else
    echo "Manifest has errors - fix before deploying"
    exit 1
fi
```

---

## 🎯 Integration with CI/CD

### GitHub Actions Example

Create `.github/workflows/validate-config.yml`:

```yaml
name: Validate Configuration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y jq
          sudo snap install yq

      - name: Make scripts executable
        run: chmod +x scripts/validation/*.sh

      - name: Validate services manifest
        run: bash scripts/validation/validate-manifest.sh

      - name: Detect port conflicts
        run: bash scripts/validation/detect-port-conflicts.sh

      - name: Validate READMEs
        run: bash scripts/validation/validate-readmes.sh

      - name: Check Docker duplicates
        run: bash scripts/validation/detect-docker-duplicates.sh
```

### Pre-commit Hook Example

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running configuration validations..."

# Run validations
bash scripts/validation/validate-manifest.sh || exit 1
bash scripts/validation/detect-port-conflicts.sh || exit 1

echo "✓ All validations passed"
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 🐛 Troubleshooting

### Issue: "jq: command not found"

**Solution:**
```bash
sudo apt install jq
```

### Issue: "Permission denied"

**Solution:**
```bash
chmod +x scripts/validation/*.sh
```

### Issue: "Manifest file not found"

**Cause:** Running from wrong directory

**Solution:**
```bash
# Always run from project root
cd /home/marce/Projetos/TradingSystem
bash scripts/validation/validate-manifest.sh
```

### Issue: False positives in port detection

**Cause:** Comments or documentation mentioning port numbers

**Solution:** Scripts use regex to find actual port assignments. False positives should be rare. If encountered, file an issue with details.

---

## 📝 Maintenance

### Adding New Validations

1. Create new script in `scripts/validation/`
2. Follow naming convention: `validate-*.sh` or `detect-*.sh`
3. Use consistent output format (colors, logging functions)
4. Add documentation to this README
5. Update CI/CD workflows

### Script Template

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_error() { echo -e "${RED}✗ ERROR: $1${NC}"; }
log_success() { echo -e "${GREEN}✓ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠ WARNING: $1${NC}"; }

main() {
    # Your validation logic here
    echo "Running validation..."
}

main "$@"
```

---

## 📚 Related Documentation

- **Full Audit Report:** `docs/reports/project-audit-2025-10-27.md`
- **Service Manifest:** `config/services-manifest.json`
- **Project Guidelines:** `CLAUDE.md`

---

## 🤝 Contributing

When modifying these scripts:

1. Test thoroughly before committing
2. Update this README if behavior changes
3. Maintain backward compatibility when possible
4. Follow bash best practices (shellcheck)

---

## 📄 License

MIT License - Part of TradingSystem project

---

**Last Updated:** 2025-10-27
**Version:** 1.0.0
