#!/usr/bin/env bash
# Technical References Validation Script
#
# Validates that all legacy documentation references (docs_legacy/, docs_legacy/docusaurus, port 3004)
# have been migrated to docs (docs/, port 3205) across the repository.
# Dependencies: ripgrep (preferred) or GNU grep; falls back to a portable find+grep
# implementation when only BSD grep is available.
# Usage: bash docs/scripts/validate-technical-references.sh [--strict] [--verbose]
# Options:
#   --strict   Treat warnings as failures (exit code 1)
#   --verbose  Emit detailed informational logs
#   --help     Show usage information

set -euo pipefail

# Globals
STRICT_MODE=0
VERBOSE_MODE=0
ERROR_COUNT=0
WARNING_COUNT=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

EXCLUDE_DIRS=("node_modules" ".git" "docs_legacy/context" "docs/governance" "docs/migration")
EXCLUDE_FILES=("*.log" "COMPLETE-REFERENCE-INVENTORY.md" "REFERENCE-UPDATE-TRACKING.md" "reference-inventory.json")

SEARCH_TOOL=""

EXCLUDE_ARGS=()
for dir in "${EXCLUDE_DIRS[@]}"; do
  EXCLUDE_ARGS+=(--exclude-dir="${dir}")
done
for file in "${EXCLUDE_FILES[@]}"; do
  EXCLUDE_ARGS+=(--exclude="${file}")
done

ALLOWED_DOCS_V2_MAX=${ALLOWED_DOCS_V2_MAX:-0}
EXPECTED_3205_MIN=${EXPECTED_3205_MIN:-20}

usage() {
  cat <<'USAGE'
Usage: validate-technical-references.sh [--strict] [--verbose] [--help]
  --strict    Treat warnings as fatal (exit code 1)
  --verbose   Emit additional informational logs
  --help      Display this help message
USAGE
}

log_info() {
  if (( VERBOSE_MODE )); then
    printf '[INFO] %s\n' "$1"
  fi
}

log_success() {
  printf '[SUCCESS] %s\n' "$1"
}

log_warning() {
  printf '[WARNING] %s\n' "$1"
  (( WARNING_COUNT++ ))
}

log_error() {
  printf '[ERROR] %s\n' "$1" >&2
  (( ERROR_COUNT++ ))
}

check_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    log_error "Required command not found: ${cmd}"
    exit 1
  fi
}

detect_search_tool() {
  if command -v rg >/dev/null 2>&1; then
    SEARCH_TOOL="rg"
    log_info "Using ripgrep for repository searches"
    return
  fi
  if grep --version >/dev/null 2>&1 && grep --version 2>/dev/null | grep -qi 'gnu'; then
    SEARCH_TOOL="gnu_grep"
    log_info "Using GNU grep for repository searches"
  else
    SEARCH_TOOL="bsd_grep"
    log_info "Using portable find+grep fallback for repository searches"
  fi
}

perform_bsd_search() {
  local pattern="$1"
  local regex_mode="$2"
  shift 2 || true
  local include_patterns=("$@")

  mapfile -t all_files < <(find . -type f)
  local filtered=()
  for file in "${all_files[@]}"; do
    local relative="${file#./}"
    local skip_dir=0
    for dir in "${EXCLUDE_DIRS[@]}"; do
      if [[ "${relative}" == ${dir}/* ]]; then
        skip_dir=1
        break
      fi
    done
    if (( skip_dir )); then
      continue
    fi
    local base="${relative##*/}"
    local exclude_file=0
    for file_pattern in "${EXCLUDE_FILES[@]}"; do
      if [[ "${base}" == ${file_pattern} ]]; then
        exclude_file=1
        break
      fi
    done
    if (( exclude_file )); then
      continue
    fi
    if ((${#include_patterns[@]} > 0)); then
      local include_match=0
      for include_pattern in "${include_patterns[@]}"; do
        if [[ "${base}" == ${include_pattern} ]]; then
          include_match=1
          break
        fi
      done
      if (( ! include_match )); then
        continue
      fi
    fi
    filtered+=("${file}")
  done

  if ((${#filtered[@]} == 0)); then
    return 1
  fi

  local cmd=(grep -n)
  if (( regex_mode )); then
    cmd+=(-E)
  fi
  cmd+=("${pattern}")
  "${cmd[@]}" "${filtered[@]}"
}

perform_grep() {
  local pattern="$1"
  shift || true

  local regex_mode=0
  local include_patterns=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -E)
        regex_mode=1
        shift
        ;;
      --include=*)
        include_patterns+=("${1#--include=}")
        shift
        ;;
      --include)
        include_patterns+=("$2")
        shift 2
        ;;
      *)
        log_info "Ignoring unsupported grep option: $1"
        shift
        ;;
    esac
  done

  case "${SEARCH_TOOL}" in
    rg)
      local cmd=(rg --line-number --no-heading --color=never --hidden --no-ignore)
      for dir in "${EXCLUDE_DIRS[@]}"; do
        cmd+=(--glob "!${dir}/**")
      done
      for file_pattern in "${EXCLUDE_FILES[@]}"; do
        if [[ "${file_pattern}" == *'*'* ]]; then
          cmd+=(--glob "!${file_pattern}")
        else
          cmd+=(--glob "!**/${file_pattern}")
        fi
      done
      for include_pattern in "${include_patterns[@]}"; do
        cmd+=(-g "${include_pattern}")
      done
      cmd+=("${pattern}" ".")
      "${cmd[@]}"
      ;;
    gnu_grep)
      local cmd=(grep -R --line-number --color=never "${EXCLUDE_ARGS[@]}")
      for include_pattern in "${include_patterns[@]}"; do
        cmd+=(--include="${include_pattern}")
      done
      if (( regex_mode )); then
        cmd+=(-E)
      fi
      cmd+=("${pattern}" .)
      "${cmd[@]}"
      ;;
    *)
      perform_bsd_search "${pattern}" "${regex_mode}" "${include_patterns[@]}"
      ;;
  esac
}

count_matches() {
  local pattern="$1"
  shift || true
  local output
  if output=$(perform_grep "${pattern}" "$@" 2>/dev/null); then
    printf '%s\n' "${output}" | wc -l
  else
    echo 0
  fi
}

# Argument parsing
while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict)
      STRICT_MODE=1
      shift
      ;;
    --verbose)
      VERBOSE_MODE=1
      shift
      ;;
    --help|-h)
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

log_info "Repository root: ${REPO_ROOT}"

# Pre-flight checks
check_command grep
check_command wc
check_command jq

detect_search_tool
if [[ "${SEARCH_TOOL}" == "rg" ]]; then
  check_command rg
fi

#######################################
# Validation 1: Legacy docs/docusaurus references
#######################################
log_info "Checking for docs/docusaurus references..."
legacy_output=""
if legacy_output=$(perform_grep "docs/docusaurus" 2>/dev/null); then
  log_error "Legacy docs/docusaurus references found"
  printf '%s\n' "${legacy_output}"
else
  log_success "No legacy docs/docusaurus references detected (outside excluded paths)"
fi

#######################################
# Validation 2: Legacy port 3004 references
#######################################
log_info "Checking for port 3004 references..."
port3004_output=""
if port3004_output=$(perform_grep '\b3004\b' -E 2>/dev/null); then
  log_error "Legacy port 3004 references found"
  printf '%s\n' "${port3004_output}"
else
  log_success "No legacy port 3004 references detected (outside excluded paths)"
fi

#######################################
# Validation 3: No docs_v2 references remain
#######################################
log_info "Checking for deprecated docs_v2 references..."
docs_v2_total=$(count_matches "docs_v2")
if (( docs_v2_total > ALLOWED_DOCS_V2_MAX )); then
  log_error "Found ${docs_v2_total} references to docs_v2 (allowed: ${ALLOWED_DOCS_V2_MAX})"
else
  log_success "No deprecated docs_v2 references detected (outside excluded paths)"
fi

#######################################
# Validation 4: Port 3205 references present
#######################################
log_info "Counting port 3205 references..."
port3205_total=$(count_matches '\b3205\b' -E)
if (( port3205_total < EXPECTED_3205_MIN )); then
  log_warning "Only ${port3205_total} port 3205 references detected (expected >= ${EXPECTED_3205_MIN})"
else
  log_success "Found ${port3205_total} references to port 3205 (threshold ${EXPECTED_3205_MIN})"
fi

#######################################
# Validation 5: CORS configurations updated
#######################################
log_info "Validating CORS configurations..."
cors_output=""
if cors_output=$(perform_grep 'CORS_ORIGIN' --include='*.js' --include='*.ts' --include='.env.example' 2>/dev/null); then
  if grep -q '3004' <<<"${cors_output}"; then
    log_error "CORS_ORIGIN still references port 3004"
    printf '%s\n' "${cors_output}"
  elif grep -q '3205' <<<"${cors_output}"; then
    log_success "CORS_ORIGIN definitions reference port 3205"
  else
    log_warning "CORS_ORIGIN definitions found but do not mention port 3205"
    printf '%s\n' "${cors_output}"
  fi
else
  log_warning "No CORS_ORIGIN definitions found in scanned files"
fi

#######################################
# Validation 6: services-manifest.json
#######################################
log_info "Checking services-manifest.json..."
if jq -e '.services[] | select(.id == "docusaurus" and .path == "docs" and .port == 3205)' \
  config/services-manifest.json >/dev/null 2>&1; then
  log_success "services-manifest.json references docs on port 3205"
else
  current_path=$(jq -r '.services[] | select(.id == "docusaurus") | (.path // "missing")' \
    config/services-manifest.json 2>/dev/null || echo "missing")
  current_port=$(jq -r '.services[] | select(.id == "docusaurus") | (.port // "missing")' \
    config/services-manifest.json 2>/dev/null || echo "missing")
  if [[ "${current_path}" == "missing" ]]; then
    log_error "services-manifest.json does not define a docusaurus service entry"
  else
    log_error "services-manifest.json expected path=docs and port=3205 but found path=${current_path}, port=${current_port}"
  fi
fi

#######################################
# Validation 7: package.json
#######################################
log_info "Checking package.json validate-docs script..."
if grep -q 'docs/content' package.json; then
  log_success "package.json validate-docs script references docs/content"
else
  log_error "package.json validate-docs script not updated to docs/content"
fi

#######################################
# Validation 8: .env.example guidance
#######################################
log_info "Checking .env.example documentation hints..."
if grep -q 'docs/governance' .env.example && grep -q '3205' .env.example; then
  log_success ".env.example references docs governance guidance and port 3205"
else
  log_warning ".env.example missing docs governance guidance or port 3205 references"
fi

#######################################
# Summary
#######################################
echo ""
log_info "Validation summary"
printf 'Errors: %d\n' "${ERROR_COUNT}"
printf 'Warnings: %d\n' "${WARNING_COUNT}"

if (( ERROR_COUNT > 0 )); then
  printf 'Result: FAILED (errors present)\n'
  exit 1
fi

if (( STRICT_MODE )) && (( WARNING_COUNT > 0 )); then
  printf 'Result: FAILED (warnings treated as fatal under --strict)\n'
  exit 1
fi

if (( WARNING_COUNT > 0 )); then
  printf 'Result: PASSED with warnings\n'
else
  printf 'Result: PASSED\n'
fi
