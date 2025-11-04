#!/bin/bash
# Bulk update lastReviewed fields in documentation frontmatter.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${PROJECT_ROOT}/docs/reports"
TODAY="$(date +%Y-%m-%d)"
REPORT_FILE="${REPORT_DIR}/last-reviewed-updates-${TODAY}.md"
BACKUP_ROOT="${REPORT_DIR}/backups/last-reviewed-${TODAY}"

DRY_RUN=false
TARGET_DATE="${TODAY}"
SOURCE_LIST=""
TARGET_DIR=""
ALL_REVIEWED=false
declare -a INPUT_FILES=()

usage() {
    cat <<EOF
Usage: $(basename "$0") [options] [file ...]

Options:
  --date <YYYY-MM-DD>   Set the lastReviewed date (default: today).
  --dry-run             Preview updates without modifying files.
  --files-from <path>   Read newline-delimited list of files to update.
  --dir <path>          Update all .md/.mdx files recursively from directory.
  --all-reviewed        Use the latest frontmatter migration report to determine files.
  --report <path>       Custom report output path.
  --backup-dir <path>   Custom backup directory.
  -h, --help            Show this help message.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --date)
            TARGET_DATE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --files-from)
            SOURCE_LIST="$2"
            shift 2
            ;;
        --dir)
            TARGET_DIR="$2"
            shift 2
            ;;
        --all-reviewed)
            ALL_REVIEWED=true
            shift
            ;;
        --report)
            REPORT_FILE="$2"
            shift 2
            ;;
        --backup-dir)
            BACKUP_ROOT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            INPUT_FILES+=("$1")
            shift
            ;;
    esac
done

if ! [[ "${TARGET_DATE}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "Invalid date format: ${TARGET_DATE}. Use YYYY-MM-DD." >&2
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required but not available. Aborting." >&2
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required but not installed. Aborting." >&2
    exit 1
fi

if ! python3 - <<'PY' >/dev/null 2>&1; then
import yaml
PY
then
    echo "PyYAML is required but not installed. Aborting." >&2
    exit 1
fi

mkdir -p "${REPORT_DIR}"

if [[ "${DRY_RUN}" == "false" ]]; then
    mkdir -p "${BACKUP_ROOT}"
fi

if [[ -n "${SOURCE_LIST}" ]]; then
    if [[ ! -f "${SOURCE_LIST}" ]]; then
        echo "File list not found: ${SOURCE_LIST}" >&2
        exit 1
    fi
    while IFS= read -r line; do
        clean_line="$(echo "${line}" | tr -d '\r')"
        if [[ -n "${clean_line}" ]] && [[ ! "${clean_line}" =~ ^# ]]; then
            INPUT_FILES+=("${clean_line}")
        fi
    done < "${SOURCE_LIST}"
fi

if [[ -n "${TARGET_DIR}" ]]; then
    while IFS= read -r file; do
        rel_path="$(realpath --relative-to="${PROJECT_ROOT}" "${file}")"
        INPUT_FILES+=("${rel_path}")
    done < <(find "${TARGET_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \))
fi

if [[ "${ALL_REVIEWED}" == "true" ]]; then
    latest_report="$(ls -1t "${REPORT_DIR}"/frontmatter-migration-*.md 2>/dev/null | head -n 1 || true)"
    if [[ -z "${latest_report}" ]]; then
        echo "No migration report found for --all-reviewed." >&2
        exit 1
    fi
    while IFS= read -r line; do
        if [[ "${line}" =~ ^\|\ ([^|]+)\ \| ]]; then
            candidate="$(echo "${BASH_REMATCH[1]}" | xargs)"
            [[ -n "${candidate}" && "${candidate}" != "File" ]] && INPUT_FILES+=("${candidate}")
        fi
    done < "${latest_report}"
fi

if [[ ${#INPUT_FILES[@]} -eq 0 ]]; then
    echo "No files supplied for lastReviewed update." >&2
    exit 1
fi

declare -A seen_files=()
declare -a UNIQUE_FILES=()
for file in "${INPUT_FILES[@]}"; do
    if [[ -n "${file}" ]] && [[ -z "${seen_files[${file}]}" ]]; then
        UNIQUE_FILES+=("${file}")
        seen_files["${file}"]=1
    fi
done

declare -i processed=0
declare -i updated=0
declare -i skipped=0
declare -a DETAILS=()

for relative in "${UNIQUE_FILES[@]}"; do
    ((processed++))
    absolute="${PROJECT_ROOT}/${relative}"

    if [[ ! -f "${absolute}" ]]; then
        DETAILS+=("${relative}|missing|File not found")
        ((skipped++))
        continue
    fi

    backup_dir="${BACKUP_ROOT}"
    if [[ "${DRY_RUN}" == "true" ]]; then
        backup_dir=""
    fi

    result_json="$(
        TARGET_FILE="${absolute}" \
        RELATIVE_FILE="${relative}" \
        UPDATE_DATE="${TARGET_DATE}" \
        DRY_RUN="${DRY_RUN}" \
        BACKUP_ROOT="${backup_dir}" \
        python3 <<'PY'
import json
import os
import shutil

import yaml

target = os.environ["TARGET_FILE"]
relative = os.environ["RELATIVE_FILE"]
update_date = os.environ["UPDATE_DATE"]
dry_run = os.environ["DRY_RUN"].lower() == "true"
backup_root = os.environ.get("BACKUP_ROOT", "")

result = {
    "file": relative,
    "status": "ok",
    "changed": False,
    "previous": None
}

with open(target, encoding="utf-8") as fh:
    original = fh.read()

if not original.startswith("---"):
    result["status"] = "no_frontmatter"
    print(json.dumps(result))
    raise SystemExit

parts = original.split('---', 2)
if len(parts) < 3:
    result["status"] = "malformed_frontmatter"
    print(json.dumps(result))
    raise SystemExit

frontmatter_raw = parts[1]
body = parts[2]

try:
    data = yaml.safe_load(frontmatter_raw) or {}
except yaml.YAMLError as exc:
    result["status"] = "invalid_yaml"
    result["error"] = str(exc)
    print(json.dumps(result))
    raise SystemExit

if not isinstance(data, dict):
    result["status"] = "invalid_yaml"
    result["error"] = "Frontmatter is not a mapping"
    print(json.dumps(result))
    raise SystemExit

previous = data.get("lastReviewed")
if previous == update_date:
    print(json.dumps(result))
    raise SystemExit

result["previous"] = previous
data["lastReviewed"] = update_date

dumped = yaml.safe_dump(data, sort_keys=False).strip()
body_content = body.lstrip('\n')
new_content = f"---\n{dumped}\n---\n\n{body_content}"

if new_content != original:
    result["changed"] = True
    if not dry_run:
        if backup_root:
            backup_path = os.path.join(backup_root, relative)
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)
            shutil.copy2(target, backup_path)
        with open(target, "w", encoding="utf-8") as fh:
            fh.write(new_content)

print(json.dumps(result))
PY
    )"

    status="$(echo "${result_json}" | jq -r '.status')"
    changed="$(echo "${result_json}" | jq -r '.changed')"
    previous="$(echo "${result_json}" | jq -r '.previous // "n/a"')"

    if [[ "${status}" != "ok" ]]; then
        error_msg="$(echo "${result_json}" | jq -r '.error // "Unhandled condition"')"
        DETAILS+=("${relative}|${status}|${error_msg}")
        ((skipped++))
        continue
    fi

    if [[ "${changed}" == "true" ]]; then
        DETAILS+=("${relative}|updated|${previous} -> ${TARGET_DATE}")
        ((updated++))
    else
        DETAILS+=("${relative}|no change|Already ${TARGET_DATE}")
        ((skipped++))
    fi
done

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] Files processed: ${processed}"
    echo "[dry-run] Files updated  : ${updated}"
    echo "[dry-run] Files skipped  : ${skipped}"
    echo ""
    echo "| File | Status | Notes |"
    echo "|------|--------|-------|"
    for row in "${DETAILS[@]}"; do
        IFS='|' read -r file status notes <<< "${row}"
        echo "| ${file} | ${status} | ${notes} |"
    done
    exit 0
fi

{
    echo "# Last Reviewed Updates (${TODAY})"
    echo
    echo "Update date: ${TARGET_DATE}"
    echo "Files processed: ${processed}"
    echo "Files updated: ${updated}"
    echo "Files skipped: ${skipped}"
    echo
    echo "## Details"
    echo
    echo "| File | Status | Notes |"
    echo "|------|--------|-------|"
    for row in "${DETAILS[@]}"; do
        IFS='|' read -r file status notes <<< "${row}"
        echo "| ${file} | ${status} | ${notes} |"
    done
} > "${REPORT_FILE}"

echo "Last reviewed report written to ${REPORT_FILE}"
