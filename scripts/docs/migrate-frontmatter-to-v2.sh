#!/bin/bash
# Migrate documentation frontmatter to the V2 schema.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${PROJECT_ROOT}/docs/reports"
DEFAULT_LIST=""
DEFAULT_LIST_DESC="latest missing-frontmatter report in ${REPORT_DIR}"
TODAY="$(date +%Y-%m-%d)"
REPORT_FILE="${REPORT_DIR}/frontmatter-migration-${TODAY}.md"
BACKUP_ROOT="${REPORT_DIR}/backups/frontmatter-${TODAY}"

DRY_RUN=false
VALIDATE=false
SOURCE_LIST=""
declare -a INPUT_FILES=()

usage() {
    cat <<EOF
Usage: $(basename "$0") [options] [file ...]

Options:
  --dry-run              Preview changes without modifying files.
  --validate             Run validate-frontmatter.py --schema v2 after migration.
  --files-from <path>    Read file list from report (default: ${DEFAULT_LIST_DESC}).
  --report <path>        Custom migration report output.
  --backup-dir <path>    Custom backup root (default: ${BACKUP_ROOT}).
  -h, --help             Show this help message.

If no files are provided, the script will read from the default report list.
EOF
}

find_latest_missing_list() {
    REPORT_DIR="${REPORT_DIR}" python3 <<'PY'
import glob
import os

report_dir = os.environ.get("REPORT_DIR", "")
pattern = os.path.join(report_dir, "missing-frontmatter-*.txt")
paths = [path for path in glob.glob(pattern) if os.path.isfile(path)]

if not paths:
    print("")
else:
    latest = max(paths, key=os.path.getmtime)
    print(latest)
PY
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --validate)
            VALIDATE=true
            shift
            ;;
        --files-from)
            SOURCE_LIST="$2"
            shift 2
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

if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required but not available. Aborting." >&2
    exit 1
fi

if ! python3 - <<'PY' >/dev/null 2>&1
import yaml
PY
then
    echo "PyYAML is required but not installed for python3. Aborting." >&2
    exit 1
fi

if [[ -z "${SOURCE_LIST}" ]]; then
    DEFAULT_LIST="$(find_latest_missing_list || true)"
fi

mkdir -p "${REPORT_DIR}"

if [[ "${DRY_RUN}" == "false" ]]; then
    mkdir -p "${BACKUP_ROOT}"
fi

if [[ ${#INPUT_FILES[@]} -eq 0 ]]; then
    if [[ -n "${SOURCE_LIST}" ]]; then
        LIST_PATH="${SOURCE_LIST}"
    else
        LIST_PATH="${DEFAULT_LIST}"
    fi

    if [[ -z "${LIST_PATH}" ]]; then
        echo "No files provided and no missing-frontmatter report found in ${REPORT_DIR}. Supply files or use --files-from." >&2
        exit 1
    fi

    if [[ ! -f "${LIST_PATH}" ]]; then
        echo "File list not found: ${LIST_PATH}" >&2
        exit 1
    fi
    while IFS= read -r line; do
        clean_line="$(echo "${line}" | tr -d '\r')"
        if [[ -n "${clean_line}" ]] && [[ ! "${clean_line}" =~ ^# ]]; then
            INPUT_FILES+=("${clean_line}")
        fi
    done < "${LIST_PATH}"
fi

if [[ ${#INPUT_FILES[@]} -eq 0 ]]; then
    echo "No files provided for migration." >&2
    exit 1
fi

OWNER_MAP_JSON='{"frontend":"FrontendGuild","backend":"BackendGuild","ops":"ToolingGuild","shared":"DocsOps"}'
DEFAULT_OWNER="DocsOps"

declare -i processed=0
declare -i migrated=0
declare -i skipped=0
declare -i owner_inferred=0
declare -i placeholders_added=0

declare -a DETAIL_ROWS=()
declare -a VALIDATION_TARGETS=()

for relative_path in "${INPUT_FILES[@]}"; do
    ((processed++))
    absolute_path="${PROJECT_ROOT}/${relative_path}"

    if [[ ! -f "${absolute_path}" ]]; then
        DETAIL_ROWS+=("${relative_path}|missing|File does not exist")
        ((skipped++))
        continue
    fi

    backup_dir="${BACKUP_ROOT}"
    if [[ "${DRY_RUN}" == "true" ]]; then
        backup_dir=""
    fi

    result_json="$(
        TARGET_FILE="${absolute_path}" \
        RELATIVE_FILE="${relative_path}" \
        PROJECT_ROOT="${PROJECT_ROOT}" \
        OWNER_MAP_JSON="${OWNER_MAP_JSON}" \
        DEFAULT_OWNER="${DEFAULT_OWNER}" \
        DRY_RUN="${DRY_RUN}" \
        BACKUP_DIR="${backup_dir}" \
        python3 <<'PY'
import json
import os
import shutil
from datetime import datetime

import yaml

target = os.environ["TARGET_FILE"]
relative = os.environ["RELATIVE_FILE"]
dry_run = os.environ["DRY_RUN"].lower() == "true"
owner_map = json.loads(os.environ["OWNER_MAP_JSON"])
default_owner = os.environ.get("DEFAULT_OWNER", "DocsOps")
backup_root = os.environ.get("BACKUP_DIR", "")

result = {
    "file": relative,
    "status": "ok",
    "changed": False,
    "actions": [],
    "notes": []
}

with open(target, encoding="utf-8") as fh:
    original = fh.read()

if not original.startswith("---"):
    result["status"] = "no_frontmatter"
    result["notes"].append("Missing frontmatter block")
    print(json.dumps(result))
    raise SystemExit

parts = original.split('---', 2)
if len(parts) < 3:
    result["status"] = "malformed_frontmatter"
    result["notes"].append("Unable to parse frontmatter block")
    print(json.dumps(result))
    raise SystemExit

frontmatter_raw = parts[1]
body = parts[2]
try:
    data = yaml.safe_load(frontmatter_raw) or {}
except yaml.YAMLError as exc:
    result["status"] = "invalid_yaml"
    result["notes"].append(f"YAML error: {exc}")
    print(json.dumps(result))
    raise SystemExit

if not isinstance(data, dict):
    result["status"] = "invalid_yaml"
    result["notes"].append("Frontmatter is not a mapping")
    print(json.dumps(result))
    raise SystemExit

actions = result["actions"]

# Handle summary -> description
summary_value = data.pop("summary", None)
if "description" not in data and summary_value:
    data["description"] = summary_value
    actions.append("description derived from summary")

# Handle last_review -> lastReviewed
legacy_last_review = data.pop("last_review", None)
if "lastReviewed" not in data and legacy_last_review:
    data["lastReviewed"] = str(legacy_last_review)
    actions.append("lastReviewed derived from last_review")

# Normalize tags
tags = data.get("tags")
if isinstance(tags, str):
    normalized = [token.strip() for token in tags.replace(";", ",").split(",") if token.strip()]
    data["tags"] = normalized
    actions.append("tags normalized from string")

if "tags" not in data or data["tags"] is None:
    data["tags"] = []
    actions.append("tags initialized as empty list")

# Normalize owner using domain inference
domain_value = data.get("domain")
owner_value = data.get("owner")
if not owner_value:
    inferred = None
    if isinstance(domain_value, str):
        inferred = owner_map.get(domain_value.lower())
    if inferred:
        data["owner"] = inferred
        actions.append(f"owner inferred from domain:{domain_value}")
        result["ownerInferred"] = True
    else:
        data["owner"] = default_owner
        actions.append("owner defaulted to DocsOps")

# Ensure description present
if not data.get("description"):
    data["description"] = "TODO: add description"
    actions.append("description placeholder added")
    result["placeholderAdded"] = True

# Ensure lastReviewed present
if not data.get("lastReviewed"):
    data["lastReviewed"] = datetime.utcnow().strftime("%Y-%m-%d")
    actions.append("lastReviewed set to today")

# Remove legacy fields that should no longer be persisted
for legacy_key in ("domain", "type", "status"):
    if legacy_key in data:
        data.pop(legacy_key, None)
        actions.append(f"removed {legacy_key}")

# Ensure all required fields exist
required_keys = ["title", "description", "tags", "owner", "lastReviewed"]
for required in required_keys:
    if required not in data:
        data[required] = "TODO" if required != "tags" else []
        actions.append(f"{required} placeholder added")
        result.setdefault("placeholders", []).append(required)

# Preserve additional frontmatter fields while prioritizing required keys
ordered_frontmatter = {}
for key in required_keys:
    if key in data:
        ordered_frontmatter[key] = data[key]
for key, value in data.items():
    if key not in ordered_frontmatter:
        ordered_frontmatter[key] = value

final_frontmatter = ordered_frontmatter

dumped = yaml.safe_dump(final_frontmatter, sort_keys=False).strip()
body_content = body.lstrip('\n')
new_content = f"---\n{dumped}\n---\n\n{body_content}"

if new_content != original:
    result["changed"] = True
    if not dry_run:
        if backup_root:
            backup_target = os.path.join(backup_root, relative)
            os.makedirs(os.path.dirname(backup_target), exist_ok=True)
            shutil.copy2(target, backup_target)
        with open(target, "w", encoding="utf-8") as fh:
            fh.write(new_content)

print(json.dumps(result))
PY
    )"

    if [[ -z "${result_json}" ]]; then
        DETAIL_ROWS+=("${relative_path}|error|Migration produced no output")
        ((skipped++))
        continue
    fi

    status="$(echo "${result_json}" | jq -r '.status')"
    changed="$(echo "${result_json}" | jq -r '.changed')"
    actions="$(echo "${result_json}" | jq -r '.actions | join("; ")')"
    notes="$(echo "${result_json}" | jq -r 'if .notes then .notes | join("; ") else "" end')"
    owner_hint="$(echo "${result_json}" | jq -r 'if has("ownerInferred") then "yes" else "no" end')"
    placeholder_hint="$(echo "${result_json}" | jq -r 'if has("placeholderAdded") then "yes" else "no" end')"

    if [[ "${status}" != "ok" ]]; then
        DETAIL_ROWS+=("${relative_path}|${status}|${notes}")
        ((skipped++))
        continue
    fi

    if [[ "${changed}" == "true" ]]; then
        DETAIL_ROWS+=("${relative_path}|${actions}|${notes}")
        ((migrated++))
        VALIDATION_TARGETS+=("${relative_path}")
        if [[ "${owner_hint}" == "yes" ]]; then
            ((owner_inferred++))
        fi
        if [[ "${placeholder_hint}" == "yes" ]]; then
            ((placeholders_added++))
        fi
    else
        DETAIL_ROWS+=("${relative_path}|no changes needed|${notes}")
        ((skipped++))
    fi
done

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] Migration summary:"
else
    {
        echo "# Frontmatter Migration Report (${TODAY})"
        echo
        echo "Files processed: ${processed}"
        echo "Files migrated: ${migrated}"
        echo "Files skipped: ${skipped}"
        echo "Owners inferred: ${owner_inferred}"
        echo "Placeholders added: ${placeholders_added}"
        echo
        echo "## Migration Details"
        echo ""
        echo "| File | Actions | Notes |"
        echo "|------|---------|-------|"
        for row in "${DETAIL_ROWS[@]}"; do
            IFS='|' read -r file actions notes <<< "${row}"
            echo "| ${file} | ${actions:-n/a} | ${notes:-} |"
        done
    } > "${REPORT_FILE}"
    echo "Migration report written to ${REPORT_FILE}"
fi

if [[ "${DRY_RUN}" == "true" ]]; then
    printf ' - Files processed: %d\n' "${processed}"
    printf ' - Files migrated : %d\n' "${migrated}"
    printf ' - Files skipped  : %d\n' "${skipped}"
    printf ' - Owners inferred: %d\n' "${owner_inferred}"
    printf ' - Placeholders   : %d\n' "${placeholders_added}"
    echo ""
    if [[ ${#DETAIL_ROWS[@]} -gt 0 ]]; then
        echo "| File | Actions | Notes |"
        echo "|------|---------|-------|"
        for row in "${DETAIL_ROWS[@]}"; do
            IFS='|' read -r file actions notes <<< "${row}"
            echo "| ${file} | ${actions:-n/a} | ${notes:-} |"
        done
    fi
fi

if [[ "${VALIDATE}" == "true" ]]; then
    VALIDATE_SCRIPT="${PROJECT_ROOT}/scripts/docs/validate-frontmatter.py"
    if [[ ! -f "${VALIDATE_SCRIPT}" ]]; then
        echo "Validation script not found: ${VALIDATE_SCRIPT}" >&2
        exit 1
    fi

    if [[ ${#VALIDATION_TARGETS[@]} -eq 0 ]]; then
        echo "No files changed; skipping validation."
    else
        if [[ "${DRY_RUN}" == "true" ]]; then
            echo "[dry-run] Would execute: python3 ${VALIDATE_SCRIPT} --schema v2 ${VALIDATION_TARGETS[*]}"
        else
            echo "Running frontmatter validation on migrated files..."
            python3 "${VALIDATE_SCRIPT}" --schema v2 "${VALIDATION_TARGETS[@]}"
        fi
    fi
fi
