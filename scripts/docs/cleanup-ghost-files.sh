#!/bin/bash
# Remove ghost file entries from frontmatter validation reports.
# Usage: ./cleanup-ghost-files.sh [--dry-run] [--prune] [--report <path>]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${PROJECT_ROOT}/docs/reports"
DEFAULT_REPORT="${REPORT_DIR}/frontmatter-validation-latest.json"
TODAY="$(date +%Y-%m-%d)"
GHOST_REPORT="${REPORT_DIR}/ghost-files-${TODAY}.txt"

DRY_RUN=false
PRUNE=false
REPORT_PATH="${DEFAULT_REPORT}"

usage() {
    cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --dry-run            Show actions without writing reports or modifying JSON.
  --prune              Remove ghost file entries from the validation report.
  --report <path>      Path to validation JSON (default: ${DEFAULT_REPORT}).
  -h, --help           Display this help and exit.

The script scans the validation report for file entries that no longer exist
on disk, writes a ghost file report, and can optionally prune those entries
from the JSON source.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --prune)
            PRUNE=true
            shift
            ;;
        --report)
            REPORT_PATH="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required but not installed. Aborting." >&2
    exit 1
fi

if [[ ! -f "${REPORT_PATH}" ]]; then
    echo "Validation report not found: ${REPORT_PATH}" >&2
    exit 1
fi

mkdir -p "${REPORT_DIR}"

mapfile -t reported_files < <(
    jq -r '
        .. | objects
        | if has("path") then .path
          elif has("file") then .file
          elif has("filepath") then .filepath
          else empty end
    ' "${REPORT_PATH}" | sed '/^$/d' | sort -u
)

if [[ ${#reported_files[@]} -eq 0 ]]; then
    echo "No file entries found in ${REPORT_PATH}."
    exit 0
fi

ghost_files=()
ghost_resolved=()

for rel_path in "${reported_files[@]}"; do
    if [[ "${rel_path}" == /* ]]; then
        candidate_path="${rel_path}"
    else
        candidate_path="${PROJECT_ROOT}/${rel_path}"
    fi

    normalized_path="$(realpath -m "${candidate_path}" 2>/dev/null || printf '%s' "${candidate_path}")"

    if [[ ! -f "${normalized_path}" ]]; then
        ghost_files+=("${rel_path}")
        ghost_resolved+=("${normalized_path}")
    fi
done

if [[ ${#ghost_files[@]} -eq 0 ]]; then
    echo "No ghost files detected in ${REPORT_PATH}."
    exit 0
fi

echo "Ghost files detected (${#ghost_files[@]}):"
printf ' - %s\n' "${ghost_files[@]}"

if [[ "${DRY_RUN}" == "false" ]]; then
    {
        echo "# Ghost File Report (${TODAY})"
        echo
        echo "Source report: $(realpath --relative-to="${PROJECT_ROOT}" "${REPORT_PATH}")"
        echo "Detected ghost files: ${#ghost_files[@]}"
        echo
        for idx in "${!ghost_files[@]}"; do
            rel_path="${ghost_files[$idx]}"
            resolved_path="${ghost_resolved[$idx]}"
            if [[ "${rel_path}" == "${resolved_path}" ]]; then
                echo "${rel_path} (missing on disk)"
            else
                echo "${rel_path} (missing on disk; resolved: ${resolved_path})"
            fi
        done
    } > "${GHOST_REPORT}"
    echo "Ghost file report written to ${GHOST_REPORT}"
else
    echo "[dry-run] Skipping writing ghost file report."
fi

if [[ "${PRUNE}" == "true" ]]; then
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo "[dry-run] Would prune ghost entries from ${REPORT_PATH}"
    else
        tmp_json="$(mktemp)"
        ghosts_json="$(printf '%s\n' "${ghost_files[@]}" | jq -R . | jq -s .)"

        if jq -e '.files' "${REPORT_PATH}" >/dev/null 2>&1; then
            jq --argjson ghosts "${ghosts_json}" '
                def isGhost($p):
                    $p != null and ($ghosts | index($p)) != null;
                .files = (.files // [])
                    | [ .[] | select(
                        (isGhost(.path // null) or isGhost(.file // null) or isGhost(.filepath // null)) | not
                      ) ]
            ' "${REPORT_PATH}" > "${tmp_json}"
            mv "${tmp_json}" "${REPORT_PATH}"
            echo "Pruned ghost entries from .files array."
        else
            jq --argjson ghosts "${ghosts_json}" '
                def isGhost($p):
                    $p != null and ($ghosts | index($p)) != null;
                walk(
                    if type == "array" then
                        [ .[] | if type == "object" then
                            (isGhost(.path // null) or isGhost(.file // null) or isGhost(.filepath // null))
                            | not
                            | if . then . else empty end
                        else . end ]
                    else .
                    end
                )
            ' "${REPORT_PATH}" > "${tmp_json}"
            mv "${tmp_json}" "${REPORT_PATH}"
            echo "Pruned ghost entries from arrays containing path/file references."
        fi
    fi
else
    echo "Use --prune to remove ghost entries from the validation report."
fi
