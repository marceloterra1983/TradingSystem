#!/bin/bash
# Analyze and repair broken internal documentation links.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${PROJECT_ROOT}/docs/reports"
TODAY="$(date +%Y-%m-%d)"
SUGGESTION_REPORT="${REPORT_DIR}/link-repair-suggestions-${TODAY}.md"
BACKUP_ROOT="${REPORT_DIR}/backups/link-fixes-${TODAY}"

DRY_RUN=false
APPLY_CHANGES=false
SOURCE_FILE=""

usage() {
    cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --source <path>    Source broken links list (default: latest broken-links-*.txt).
  --dry-run          Preview fixes without modifying files or writing report.
  --apply            Apply automatic fixes when a single clear target is found.
  -h, --help         Show this help message and exit.

Generated suggestions are written to ${SUGGESTION_REPORT}.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source)
            SOURCE_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --apply)
            APPLY_CHANGES=true
            shift
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

mkdir -p "${REPORT_DIR}"

if [[ -z "${SOURCE_FILE}" ]]; then
    SOURCE_FILE="$(ls -1t "${REPORT_DIR}"/broken-links-*.txt 2>/dev/null | head -n 1 || true)"
fi

if ! command -v rg >/dev/null 2>&1; then
    echo "rg (ripgrep) is required but not installed. Aborting." >&2
    exit 1
fi

if [[ "${APPLY_CHANGES}" == "true" && "${DRY_RUN}" == "false" ]]; then
    if ! command -v python3 >/dev/null 2>&1; then
        echo "python3 is required for --apply operations. Aborting." >&2
        exit 1
    fi
fi

if [[ -z "${SOURCE_FILE}" ]] || [[ ! -f "${SOURCE_FILE}" ]]; then
    echo "Broken links report not found. Provide one with --source." >&2
    exit 1
fi

if [[ "${DRY_RUN}" == "false" ]]; then
    mkdir -p "${BACKUP_ROOT}"
fi

declare -a SUGGESTIONS=()
declare -i broken_total=0
declare -i fixed_count=0
declare -i auto_suggestions=0

while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    if [[ ! "${line}" =~ ^(.+):[[:space:]]*broken[[:space:]]link[[:space:]]to[[:space:]](.+)$ ]]; then
        continue
    fi

    ((broken_total++))
    source_rel="${BASH_REMATCH[1]}"
    broken_link="${BASH_REMATCH[2]}"
    source_abs="${PROJECT_ROOT}/${source_rel}"

    if [[ ! -f "${source_abs}" ]]; then
        SUGGESTIONS+=("${source_rel}|${broken_link}|Source file missing|manual")
        continue
    fi

    # Resolve anchor-less component for matching.
    anchor=""
    if [[ "${broken_link}" == *"#"* ]]; then
        anchor="#${broken_link#*#}"
    fi
    link_path="${broken_link%%#*}"
    link_name="$(basename "${link_path}")"

    source_dir="$(dirname "${source_abs}")"
    candidate_path="$(realpath -m "${source_dir}/${link_path}" 2>/dev/null || true)"
    if [[ -n "${candidate_path}" && -f "${candidate_path}" ]]; then
        # Link already valid but flagged; treat as resolved.
        relative_target="$(realpath --relative-to="${source_dir}" "${candidate_path}")"
        SUGGESTIONS+=("${source_rel}|${broken_link}|Resolved path ${relative_target}|verify")
        continue
    fi

    mapfile -t matches < <(
        rg --files -g '*.md' -g '*.mdx' "${PROJECT_ROOT}/docs" 2>/dev/null \
        | awk -v name="${link_name}" '
            BEGIN { ignorecase=1 }
            {
                if (name == "" || basename($0) == name || basename($0) == name ".mdx" || basename($0) == name ".md") {
                    print
                }
            }
            function basename(path) {
                sub(/^.*\//, "", path)
                return path
            }
        '
    )

    if [[ ${#matches[@]} -eq 0 ]]; then
        SUGGESTIONS+=("${source_rel}|${broken_link}|No match found|manual")
        continue
    fi

    if [[ ${#matches[@]} -eq 1 ]]; then
        match_abs="${matches[0]}"
        relative_target="$(realpath --relative-to="${source_dir}" "${match_abs}")"
        suggestion="${relative_target}${anchor}"
        SUGGESTIONS+=("${source_rel}|${broken_link}|${suggestion}|suggested")
        ((auto_suggestions++))

        if [[ "${APPLY_CHANGES}" == "true" ]]; then
            if [[ "${DRY_RUN}" == "true" ]]; then
                echo "[dry-run] Would update ${source_rel}: ${broken_link} -> ${suggestion}"
            else
                backup_path="${BACKUP_ROOT}/${source_rel}"
                mkdir -p "$(dirname "${backup_path}")"
                if [[ ! -f "${backup_path}" ]]; then
                    cp "${source_abs}" "${backup_path}"
                fi
                python3 - "$source_abs" "$broken_link" "$suggestion" <<'PY'
import pathlib
import sys

file_path = pathlib.Path(sys.argv[1])
old_link = sys.argv[2]
new_link = sys.argv[3]
target = file_path.read_text(encoding="utf-8")
needle = f"]({old_link})"
replacement = f"]({new_link})"
if needle not in target:
    sys.exit(0)
updated = target.replace(needle, replacement, 1)
file_path.write_text(updated, encoding="utf-8")
PY
                ((fixed_count++))
            fi
        fi
    else
        preview="$(printf '%s\n' "${matches[@]}" | head -n 3 | sed "s#^${PROJECT_ROOT}/##")"
        SUGGESTIONS+=("${source_rel}|${broken_link}|Multiple matches:\n${preview}|manual")
    fi
done < "${SOURCE_FILE}"

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] Broken links analyzed: ${broken_total}"
    echo "[dry-run] Auto suggestions  : ${auto_suggestions}"
    echo "[dry-run] Auto fixes applied: ${fixed_count}"
    if [[ ${#SUGGESTIONS[@]} -gt 0 ]]; then
        echo ""
        echo "| File | Original Link | Suggestion | Status |"
        echo "|------|---------------|------------|--------|"
        for entry in "${SUGGESTIONS[@]}"; do
            IFS='|' read -r file link suggestion status <<< "${entry}"
            formatted_suggestion="$(echo -e "${suggestion}" | tr '\n' '; ')"
            echo "| ${file} | ${link} | ${formatted_suggestion} | ${status} |"
        done
    fi
    exit 0
fi

{
    echo "# Link Repair Suggestions (${TODAY})"
    echo
    echo "Source report: $(realpath --relative-to="${PROJECT_ROOT}" "${SOURCE_FILE}")"
    echo "Broken links analyzed: ${broken_total}"
    echo "Automatic suggestions: ${auto_suggestions}"
    echo "Automatic fixes applied: ${fixed_count}"
    echo
    echo "## Details"
    echo
    echo "| File | Original Link | Suggestion | Status |"
    echo "|------|---------------|------------|--------|"
    for entry in "${SUGGESTIONS[@]}"; do
        IFS='|' read -r file link suggestion status <<< "${entry}"
        formatted_suggestion="$(echo -e "${suggestion}" | tr '\n' '; ' | sed 's/|/\\|/g')"
        echo "| ${file} | ${link} | ${formatted_suggestion} | ${status} |"
    done
} > "${SUGGESTION_REPORT}"

echo "Link repair suggestions written to ${SUGGESTION_REPORT}"
if [[ "${APPLY_CHANGES}" == "true" ]]; then
    echo "Automatic fixes applied: ${fixed_count}"
fi
