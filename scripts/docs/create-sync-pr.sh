#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMON_SH="${SCRIPT_DIR}/common.sh"
if [[ -r "${COMMON_SH}" ]]; then
  # shellcheck source=scripts/docs/common.sh
  source "${COMMON_SH}"
else
  if ! command -v git >/dev/null 2>&1; then
    echo "[ERROR] scripts/docs/common.sh not found and git is unavailable to resolve repository root." >&2
    exit 1
  fi
  REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ -z "${REPO_ROOT}" ]]; then
    echo "[ERROR] Failed to determine repository root. Run inside a git repository or restore scripts/docs/common.sh." >&2
    exit 1
  fi
  DOCS_DIR="${REPO_ROOT}/docs/content"
  export REPO_ROOT DOCS_DIR
fi

cd "${REPO_ROOT}"

log_info() { printf '[INFO] %s\n' "$*"; }
log_warn() { printf '[WARN] %s\n' "$*" >&2; }
log_error() { printf '[ERROR] %s\n' "$*" >&2; }
log_success() { printf '[OK] %s\n' "$*"; }

usage() {
  cat <<'USAGE'
Usage: create-sync-pr.sh --report-file <path> [--branch-name name] [--dry-run]

Options:
  --report-file PATH   Path to the daily MDX report containing sync suggestions (required)
  --branch-name NAME   Explicit branch name to use for the PR (default: docs/sync-YYYYmmdd-HHMMSS)
  --dry-run            Preview actions without creating git branches or PRs
  --help               Show this help message
USAGE
  exit 1
}

REPORT_FILE=""
BRANCH_NAME=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --report-file)
      REPORT_FILE="${2:-}"
      shift 2
      ;;
    --branch-name)
      BRANCH_NAME="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      usage
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      ;;
  esac
done

[[ -n "${REPORT_FILE}" ]] || { log_error "--report-file is required"; usage; }

if [[ ! -f "${REPORT_FILE}" ]]; then
  log_error "Report file not found: ${REPORT_FILE}"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  log_error "'gh' CLI is required. Install from https://cli.github.com/."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  log_error "'jq' is required for parsing JSON."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  log_error "GitHub CLI is not authenticated. Run 'gh auth login' first."
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  log_error "Working tree is not clean. Commit or stash changes before running this script."
  exit 1
fi

REPORT_FILE_ABS="$(python3 - <<'PY' "${REPORT_FILE}"
import os, sys
print(os.path.abspath(sys.argv[1]))
PY
)"

REPORT_REL="${REPORT_FILE_ABS#"${REPO_ROOT}/"}"

SUGGESTIONS_FILE="$(mktemp)"
PR_BODY_FILE=""
RESTORE_BRANCH=""

cleanup() {
  rm -f "${SUGGESTIONS_FILE}"
  if [[ -n "${PR_BODY_FILE}" ]]; then
    rm -f "${PR_BODY_FILE}"
  fi
  if [[ -n "${RESTORE_BRANCH}" ]]; then
    current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
    if [[ -n "${current_branch}" && "${current_branch}" != "${RESTORE_BRANCH}" ]]; then
      git checkout "${RESTORE_BRANCH}" >/dev/null 2>&1 || true
    fi
  fi
}
trap cleanup EXIT

python3 - "${REPORT_FILE_ABS}" > "${SUGGESTIONS_FILE}" <<'PY'
import json
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
content = path.read_text(encoding='utf-8')
match = re.search(r'## 📝 Documentation Updates Required(.*?)(?:\n## |\n#### |\Z)', content, re.S)
counts = {key: 0 for key in ('critical', 'high', 'medium', 'low')}
by_severity = {key: [] for key in counts}
items = []
section_markdown = ''

if match:
  section_block = match.group(1)
  section_markdown = '## 📝 Documentation Updates Required' + section_block
  severity_map = {
    'critical updates': 'critical',
    'high priority updates': 'high',
    'medium priority updates': 'medium',
    'low priority updates': 'low'
  }
  current = None
  for line in section_block.splitlines():
    stripped = line.strip()
    if not stripped:
      continue
    if stripped.startswith('### '):
      key = stripped[4:].strip().lower()
      current = severity_map.get(key)
      continue
    if stripped.startswith('- [') and current:
      text = stripped
      owner = None
      if ' — Owner:' in text:
        text, owner_part = text.split(' — Owner:', 1)
        owner = owner_part.strip()
        if owner.startswith('@'):
          owner = owner[1:]
        owner = owner or None
      m = re.match(r"- \[[xX ]\] Update `([^`]+)`(?: \(sections: ([^)]+)\))? — (.+)", text)
      if not m:
        continue
      target, sections_str, description = m.groups()
      description = description.strip()
      source = None
      source_match = re.search(r'\(source:\s*`([^`]+)`\)', description)
      if source_match:
        source = source_match.group(1)
        description = re.sub(r'\s*\(source:\s*`[^`]+`\)\s*', '', description).strip()
      sections = [s.strip() for s in sections_str.split(',')] if sections_str else []
      item = {
        'severity': current,
        'targetFile': target,
        'sections': sections,
        'description': description,
        'owner': owner,
        'sourceFile': source
      }
      items.append(item)
      by_severity[current].append(item)
      counts[current] += 1

data = {
  'items': items,
  'by_severity': by_severity,
  'counts': counts,
  'sectionMarkdown': section_markdown.strip()
}
print(json.dumps(data, ensure_ascii=False))
PY

ITEM_COUNT=$(jq '.items | length' "${SUGGESTIONS_FILE}")

if [[ "${ITEM_COUNT}" -eq 0 ]]; then
  log_info "No documentation sync suggestions found in ${REPORT_REL}. Nothing to do."
  exit 0
fi

CRITICAL_COUNT=$(jq '.counts.critical' "${SUGGESTIONS_FILE}")
HIGH_COUNT=$(jq '.counts.high' "${SUGGESTIONS_FILE}")
MEDIUM_COUNT=$(jq '.counts.medium' "${SUGGESTIONS_FILE}")
LOW_COUNT=$(jq '.counts.low' "${SUGGESTIONS_FILE}")

DATE_UTC="$(date -u +%Y-%m-%d)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEFAULT_BRANCH="${BASE_BRANCH:-main}"
BRANCH_NAME="${BRANCH_NAME:-docs/sync-${TIMESTAMP}}"

log_info "Preparing documentation sync PR"
log_info "Report: ${REPORT_REL}"
log_info "Detected items: ${ITEM_COUNT} (critical: ${CRITICAL_COUNT}, high: ${HIGH_COUNT}, medium: ${MEDIUM_COUNT}, low: ${LOW_COUNT})"

PR_BODY_FILE="$(mktemp)"
SUMMARY_SECTION="$(jq -r '.sectionMarkdown' "${SUGGESTIONS_FILE}")"

python3 - "${SUGGESTIONS_FILE}" "${REPORT_REL}" "${DATE_UTC}" > "${PR_BODY_FILE}" <<'PY'
import json
import sys

data = json.load(open(sys.argv[1]))
report_rel = sys.argv[2]
date_str = sys.argv[3]
counts = data["counts"]
total = len(data["items"])

severity_titles = {
    "critical": "### Critical Updates Required",
    "high": "### High Priority Updates",
    "medium": "### Medium Priority Updates",
    "low": "### Low Priority Updates"
}

lines = []
lines.append("## 📝 Documentation Synchronization Required")
lines.append("")
lines.append("This PR tracks documentation updates needed for recent code changes.")
lines.append("")
lines.append("**Generated by**: Docusaurus Daily Agent")
lines.append(f"**Report**: `{report_rel}`")
lines.append(f"**Date**: {date_str}")
lines.append(f"**Violations**: {total} (critical: {counts['critical']}, high: {counts['high']}, medium: {counts['medium']}, low: {counts['low']})")
lines.append("")

for severity in ("critical", "high", "medium", "low"):
    items = data["by_severity"][severity]
    if not items:
        continue
    lines.append(severity_titles[severity])
    lines.append("")
    for item in items:
        sections = item.get("sections") or []
        section_label = f" (sections: {', '.join(sections)})" if sections else ""
        lines.append(f"- [ ] **{item['targetFile']}**{section_label}")
        lines.append(f"  - Detail: {item['description']}")
        source = item.get("sourceFile")
        if source:
            lines.append(f"  - Source: `{source}`")
        owner = item.get("owner")
        if owner:
            lines.append(f"  - Owner: @{owner}")
        lines.append("")

lines.append("### Instructions")
lines.append("")
lines.append("1. Review each checklist item.")
lines.append("2. Update the referenced documentation files.")
lines.append("3. Check off the items once completed.")
lines.append("4. Request review from the listed owners.")
lines.append("5. Merge after all updates and validations pass.")
lines.append("")
lines.append("### Validation")
lines.append("")
lines.append("```bash")
lines.append("npm run docs:check")
lines.append("python scripts/docs/validate-frontmatter.py --schema v2")
lines.append("bash scripts/maintenance/health-check-all.sh")
lines.append("```")
lines.append("")
lines.append("---")
lines.append("")
lines.append("**Automation**: Generated by the documentation sync system.")
lines.append("**Mapping**: See `docs/governance/CODE-DOCS-MAPPING.json` for rules.")
lines.append("**Guide**: See `docs/governance/CODE-DOCS-SYNC.md` for process details.")

print("\n".join(lines).strip())
PY

PR_BODY="$(cat "${PR_BODY_FILE}")"

if "${DRY_RUN}"; then
  log_info "Dry run enabled. PR body preview:"
  echo "------------------------------------------------------------"
  printf '%s\n' "${PR_BODY}"
  echo "------------------------------------------------------------"
  exit 0
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
RESTORE_BRANCH="${CURRENT_BRANCH}"

if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
  BRANCH_NAME="${BRANCH_NAME}-${TIMESTAMP}"
  log_warn "Branch already exists. Using ${BRANCH_NAME} instead."
fi

git checkout -b "${BRANCH_NAME}"
git commit --allow-empty -m "docs: sync required for code changes ${DATE_UTC}"
git push --set-upstream origin "${BRANCH_NAME}"

PR_TITLE="docs: sync required for code changes ${DATE_UTC}"
PR_URL="$(gh pr create --title "${PR_TITLE}" --body-file "${PR_BODY_FILE}" --base "${DEFAULT_BRANCH}" --head "${BRANCH_NAME}" --label documentation --label sync --label automated)"

if [[ -z "${PR_URL}" ]]; then
  log_error "Failed to create PR."
  exit 2
fi

PR_URL="$(echo "${PR_URL}" | tail -n1 | tr -d '[:space:]')"
log_success "Pull request created: ${PR_URL}"

resolve_reviewer() {
  local owner="$1"
  [[ -n "${owner}" ]] || return 0
  local var_name="DOCS_SYNC_REVIEWER_${owner//[^A-Za-z0-9]/_}"
  local resolved="${!var_name:-}"
  if [[ -n "${resolved}" ]]; then
    echo "${resolved}"
    return 0
  fi
  if [[ "${owner}" == @* ]]; then
    echo "${owner}"
    return 0
  fi
  if [[ -n "${DOCS_SYNC_DEFAULT_ORG:-}" ]]; then
    echo "${DOCS_SYNC_DEFAULT_ORG}/${owner}"
    return 0
  fi
  return 1
}

mapfile -t OWNERS < <(jq -r '.items[].owner | select(. != null and . != "")' "${SUGGESTIONS_FILE}" | sort -u)
declare -a REVIEWERS=()
for owner in "${OWNERS[@]}"; do
  if resolved="$(resolve_reviewer "${owner}")"; then
    REVIEWERS+=("${resolved}")
  else
    log_warn "Unable to resolve reviewer for owner '${owner}'."
  fi
done

for reviewer in "${REVIEWERS[@]}"; do
  if ! gh pr edit "${PR_URL}" --add-reviewer "${reviewer}" >/dev/null 2>&1; then
    log_warn "Failed to add reviewer ${reviewer}."
  else
    log_info "Assigned reviewer ${reviewer}."
  fi
done

REPORTS_DIR="${DOCS_DIR}/reports"
mkdir -p "${REPORTS_DIR}"
SUMMARY_FILE="${REPORTS_DIR}/sync-pr-${TIMESTAMP}.md"

cat > "${SUMMARY_FILE}" <<EOF
---
title: Docs Sync Pending ${DATE_UTC}
description: Documentation updates required for code changes detected on ${DATE_UTC}.
tags: [automation, sync]
owner: DocsOps
lastReviewed: ${DATE_UTC}
---

${SUMMARY_SECTION}

**PR**: ${PR_URL}  
**Branch**: \`${BRANCH_NAME}\`
EOF

log_info "Summary written to ${SUMMARY_FILE#${REPO_ROOT}/}"
