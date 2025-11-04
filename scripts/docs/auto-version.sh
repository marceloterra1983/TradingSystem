#!/usr/bin/env bash
#
# TradingSystem Documentation Automation Toolkit
# -----------------------------------------------
# Automated documentation versioning with validation and reporting.
# Version: 1.0.0
# Author: TradingSystem DocsOps
#
# Usage examples:
#   bash scripts/docs/auto-version.sh --version 1.0.0
#   bash scripts/docs/auto-version.sh --version 1.0.0 --auto-commit
#   bash scripts/docs/auto-version.sh --version 1.0.0 --dry-run
#   bash scripts/docs/auto-version.sh --version 1.0.0 --skip-validation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

cd "${REPO_ROOT}"

# -----------------------------------------------------------------------------
# Styling & logging helpers
# -----------------------------------------------------------------------------
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
CYAN="\033[36m"
NC="\033[0m"

log_info()    { printf "%b[INFO]%b %s\n" "${BLUE}" "${NC}" "$*"; }
log_success() { printf "%b[SUCCESS]%b %s\n" "${GREEN}" "${NC}" "$*"; }
log_warning() { printf "%b[WARNING]%b %s\n" "${YELLOW}" "${NC}" "$*"; }
log_error()   { printf "%b[ERROR]%b %s\n" "${RED}" "${NC}" "$*"; }
log_header()  { printf "\n%b==>%b %s\n" "${CYAN}" "${NC}" "$*"; }

usage() {
  cat <<'EOF'
Automated documentation versioning script.

Required arguments:
  --version <X.Y.Z>      Semantic version to create (e.g., 1.2.3)

Optional flags:
  --auto-commit          Commit and push changes automatically (CI usage)
  --skip-build-validation  Skip build validations (use when CI already ran full builds)
  --skip-validation      Skip validation suite (not recommended)
  --dry-run              Preview actions without executing them
  -h, --help             Show this help message
EOF
}

# -----------------------------------------------------------------------------
# Globals set during execution
# -----------------------------------------------------------------------------
VERSION=""
AUTO_COMMIT=false
SKIP_VALIDATION=false
SKIP_BUILD_VALIDATION=false
DRY_RUN=false
VERSIONED_FILE_COUNT=0
SIDEBAR_CATEGORY_COUNT=0
BUILD_DURATION=""
REPORT_PATH=""
VALIDATION_SUMMARY=()
PYTHON_CMD=""

# -----------------------------------------------------------------------------
# Utility helpers
# -----------------------------------------------------------------------------
ensure_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    log_error "Required command '${cmd}' not found in PATH."
    exit 1
  fi
}

detect_python() {
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
    return
  fi

  if command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
    log_warning "python3 not found; falling back to 'python'. Ensure it points to Python 3."
    return
  fi

  log_error "Neither 'python3' nor 'python' found in PATH."
  exit 1
}

run_cmd() {
  local description="$1"
  shift
  if "${DRY_RUN}"; then
    log_info "[dry-run] ${description}: $*"
    return 0
  fi
  log_info "${description}"
  "$@"
}

validate_version_format() {
  if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log_error "Invalid version '${VERSION}'. Use semantic versioning (X.Y.Z) without prefix."
    exit 1
  fi
  log_success "Version format validated (${VERSION})."
}

check_version_exists() {
  local versions_file="${DOCS_DIR}/versions.json"
  if [[ ! -f "${versions_file}" ]]; then
    return 0
  fi

  local exit_code=0
VERSIONS_FILE="${versions_file}" VERSION_CHECK="${VERSION}" node <<'NODE' || exit_code=$?
const fs = require('fs');
const file = process.env.VERSIONS_FILE;
if (!fs.existsSync(file)) { process.exit(0); }
const versions = JSON.parse(fs.readFileSync(file, 'utf8'));
if (Array.isArray(versions) && versions.includes(process.env.VERSION_CHECK)) {
  process.exit(10);
}
NODE

  if [[ ${exit_code} -eq 10 ]]; then
    if [[ "${CI:-false}" == "true" ]] || "${AUTO_COMMIT}"; then
      log_error "Version ${VERSION} already exists in versions.json. Aborting."
      exit 2
    fi
    log_warning "Version ${VERSION} already exists."
    read -r -p "Overwrite existing version? [y/N]: " response
    response="${response:-N}"
    if [[ ! "${response}" =~ ^[Yy]$ ]]; then
      log_error "Version creation cancelled by user."
      exit 2
    fi
  elif [[ ${exit_code} -ne 0 ]]; then
    log_error "Failed to inspect versions.json (exit code ${exit_code})."
    exit ${exit_code}
  fi
}

check_git_status() {
  local status
  status="$(git status --porcelain)"
  if [[ -n "${status}" ]]; then
    log_error "Working tree is dirty. Please commit or stash changes before creating a version."
    echo "${status}"
    exit 1
  fi
  log_success "Git working tree is clean."
}

validate_frontmatter() {
  if "${SKIP_VALIDATION}"; then
    log_warning "Skipping frontmatter validation (--skip-validation)."
    VALIDATION_SUMMARY+=("Frontmatter: skipped")
    return
  fi

  local output_file="/tmp/frontmatter-validation-${VERSION}.json"
  run_cmd "Validating documentation frontmatter (schema v2)" \
    "${PYTHON_CMD}" "${SCRIPT_DIR}/validate-frontmatter.py" \
    --schema v2 \
    --docs-dir "${DOCS_DIR}/content" \
    --output "${output_file}"
  VALIDATION_SUMMARY+=("Frontmatter: passed")
  log_success "Frontmatter validation passed."
}

validate_maintenance_audit() {
  if "${SKIP_VALIDATION}"; then
    log_warning "Skipping maintenance audit (--skip-validation)."
    VALIDATION_SUMMARY+=("Maintenance audit: skipped")
    return
  fi

  run_cmd "Running maintenance audit (threshold=5)" \
    bash "${SCRIPT_DIR}/maintenance-audit.sh" --ci-mode --ci-threshold 5
  VALIDATION_SUMMARY+=("Maintenance audit: passed")
  log_success "Maintenance audit passed."
}

validate_build() {
  if "${SKIP_VALIDATION}"; then
    log_warning "Skipping docs:check validation (--skip-validation)."
    VALIDATION_SUMMARY+=("Docs build: skipped (full validation skipped)")
    return
  fi

  if "${SKIP_BUILD_VALIDATION}"; then
    log_warning "Skipping docs:check validation (--skip-build-validation)."
    VALIDATION_SUMMARY+=("Docs build: skipped (--skip-build-validation)")
    return
  fi

  run_cmd "Executing full documentation validation suite (npm run docs:check)" \
    npm --prefix "${DOCS_DIR}" run docs:check
  VALIDATION_SUMMARY+=("Docs build: passed")
  log_success "Documentation validation suite completed successfully."
}

create_version_snapshot() {
  log_header "Creating documentation version snapshot (${VERSION})"
  if "${DRY_RUN}"; then
    log_info "[dry-run] Would execute: npx docusaurus docs:version ${VERSION}"
    return
  fi

  ensure_command npx
  (cd "${DOCS_DIR}" && npx docusaurus docs:version "${VERSION}")

  local version_dir="${DOCS_DIR}/versioned_docs/version-${VERSION}"
  local sidebar_file="${DOCS_DIR}/versioned_sidebars/version-${VERSION}-sidebars.json"

  if [[ ! -d "${version_dir}" ]]; then
    log_error "Versioned docs directory not created (${version_dir})."
    exit 1
  fi
  if [[ ! -f "${sidebar_file}" ]]; then
    log_error "Versioned sidebar file missing (${sidebar_file})."
    exit 1
  fi

  VERSIONED_FILE_COUNT="$(find "${version_dir}" -name "*.mdx" -type f | wc -l | tr -d ' ')"
  SIDEBAR_CATEGORY_COUNT="$(SIDEBAR_PATH="${sidebar_file}" node <<'NODE'
const fs = require('fs');
const path = process.env.SIDEBAR_PATH;
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
function countCategories(node) {
  if (Array.isArray(node)) return node.reduce((acc, item) => acc + countCategories(item), 0);
  if (!node || typeof node !== 'object') return 0;
  if (node.type === 'category' && node.items) {
    return 1 + countCategories(node.items);
  }
  if (node.type && node.type !== 'category') return 0;
  return Object.values(node).reduce((acc, item) => acc + countCategories(item), 0);
}
console.log(countCategories(data));
NODE
)"

  log_success "Version snapshot created with ${VERSIONED_FILE_COUNT} MDX files and ${SIDEBAR_CATEGORY_COUNT} categories."
}

update_docusaurus_config() {
  log_header "Updating Docusaurus version configuration"
  if "${DRY_RUN}"; then
    log_info "[dry-run] Would run update-version-config.mjs for ${VERSION}"
    return
  fi

  ensure_command node
  node "${SCRIPT_DIR}/update-version-config.mjs" \
    --version "${VERSION}" \
    --versions-json "${DOCS_DIR}/versions.json"
  log_success "docusaurus.config.js updated for version ${VERSION}."
}

verify_version_created() {
  log_header "Verifying version integrity"
  if "${DRY_RUN}"; then
    log_info "[dry-run] Would verify version artifacts and build."
    return
  fi

  local version_dir="${DOCS_DIR}/versioned_docs/version-${VERSION}"
  local sidebar_file="${DOCS_DIR}/versioned_sidebars/version-${VERSION}-sidebars.json"

  [[ -d "${version_dir}" ]] || { log_error "Missing version directory ${version_dir}"; exit 1; }
  [[ -f "${sidebar_file}" ]] || { log_error "Missing sidebar file ${sidebar_file}"; exit 1; }

  if "${SKIP_BUILD_VALIDATION}"; then
    log_warning "Skipping production docs build verification (--skip-build-validation)."
    BUILD_DURATION=""
    return
  fi

  log_info "Running production build verification..."
  local start_time=$SECONDS
  npm --prefix "${DOCS_DIR}" run docs:build >/tmp/docs-build-${VERSION}.log 2>&1 || {
    cat /tmp/docs-build-${VERSION}.log
    log_error "Documentation build failed. See log above."
    exit 1
  }
  BUILD_DURATION=$(( SECONDS - start_time ))
  log_success "Documentation build completed in ${BUILD_DURATION}s."
}

generate_commit_message() {
  local validation_text="completed"
  if [[ ${#VALIDATION_SUMMARY[@]} -gt 0 ]]; then
    validation_text="$(printf '%s; ' "${VALIDATION_SUMMARY[@]}")"
    validation_text="${validation_text%; }"
  fi

  local build_time_text
  if [[ -n "${BUILD_DURATION}" ]]; then
    build_time_text="${BUILD_DURATION}s"
  else
    build_time_text="skipped"
  fi

  read -r -d '' COMMIT_MESSAGE <<EOF || true
docs: version ${VERSION}

🚀 Automated documentation snapshot for version ${VERSION}.

Snapshot Details:
- Files versioned: ${VERSIONED_FILE_COUNT}
- Categories: ${SIDEBAR_CATEGORY_COUNT}
- Build time: ${build_time_text}
- Validation: ${validation_text:-completed}

Users can now:
- View current (Next) docs at /next/
- View stable (${VERSION}) docs at /
- Switch versions via navbar dropdown

🤖 Generated by GitHub Actions
Workflow: docs-versioning.yml
Trigger: Tag push v${VERSION}
EOF
}

commit_version_snapshot() {
  log_header "Committing documentation snapshot"
  if "${DRY_RUN}"; then
    log_info "[dry-run] Would stage versioned files and commit."
    return
  fi

  git add \
    "${DOCS_DIR}/versions.json" \
    "${DOCS_DIR}/versioned_docs/version-${VERSION}" \
    "${DOCS_DIR}/versioned_sidebars/version-${VERSION}-sidebars.json" \
    "${DOCS_DIR}/docusaurus.config.js"

  if git diff --cached --quiet; then
    log_warning "No changes detected to commit."
    return
  fi

  git commit -F - <<<"${COMMIT_MESSAGE}"
  log_success "Commit created for documentation version ${VERSION}."

  if "${AUTO_COMMIT}"; then
    log_info "Pushing commit to origin..."
    git push origin HEAD
    log_success "Changes pushed to remote."
  else
    log_info "Auto-commit disabled. Remember to push manually if desired."
  fi
}

generate_version_report() {
  log_header "Generating version report"
  if "${DRY_RUN}"; then
    log_info "[dry-run] Would generate version report in docs/reports."
    return
  fi

  local report_dir="${DOCS_DIR}/reports"
  mkdir -p "${report_dir}"
  REPORT_PATH="${report_dir}/version-${VERSION}-$(date +%Y%m%d-%H%M%S).md"

  local commit_sha
  commit_sha="$(git rev-parse HEAD)"
  local validation_text="completed"
  if [[ ${#VALIDATION_SUMMARY[@]} -gt 0 ]]; then
    validation_text="$(printf '%s; ' "${VALIDATION_SUMMARY[@]}")"
    validation_text="${validation_text%; }"
  fi
  local build_time_text
  if [[ -n "${BUILD_DURATION}" ]]; then
    build_time_text="${BUILD_DURATION}s"
  else
    build_time_text="skipped"
  fi

  cat <<EOF >"${REPORT_PATH}"
# Documentation Version Report: ${VERSION}

**Created**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Commit**: ${commit_sha}
**Workflow**: docs-versioning.yml

## Summary

- Version: ${VERSION}
- Files versioned: ${VERSIONED_FILE_COUNT}
- Sidebar categories: ${SIDEBAR_CATEGORY_COUNT}
- Build duration: ${build_time_text}
- Validation: ${validation_text}

## Validation Results

EOF

  if [[ ${#VALIDATION_SUMMARY[@]} -gt 0 ]]; then
    printf -- "- %s\n" "${VALIDATION_SUMMARY[@]}" >> "${REPORT_PATH}"
  else
    echo "- Validation suite executed successfully." >> "${REPORT_PATH}"
  fi

  cat <<EOF >>"${REPORT_PATH}"

## Artifacts

- versions.json
- versioned_docs/version-${VERSION}/
- versioned_sidebars/version-${VERSION}-sidebars.json
- docusaurus.config.js

## Next Steps

1. Ensure commit is pushed to main.
2. Create GitHub release with CHANGELOG notes.
3. Announce availability to the DocsOps channel.

EOF

  log_success "Version report generated at ${REPORT_PATH}."
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version)
        VERSION="${2:-}"
        shift 2
        ;;
      --auto-commit)
        AUTO_COMMIT=true
        shift
        ;;
      --skip-build-validation)
        SKIP_BUILD_VALIDATION=true
        shift
        ;;
      --skip-validation)
        SKIP_VALIDATION=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done

  if [[ -z "${VERSION}" ]]; then
    log_error "Missing required argument: --version <X.Y.Z>"
    usage
    exit 1
  fi

  ensure_command git
  ensure_command node
  detect_python

  validate_version_format
  check_version_exists
  check_git_status

  validate_frontmatter
  validate_maintenance_audit
  validate_build

  create_version_snapshot
  update_docusaurus_config
  verify_version_created
  generate_commit_message
  commit_version_snapshot
  generate_version_report

  log_success "Documentation version ${VERSION} completed successfully."
  if [[ -n "${REPORT_PATH}" ]]; then
    log_info "Report available at ${REPORT_PATH}"
  fi
}

main "$@"
