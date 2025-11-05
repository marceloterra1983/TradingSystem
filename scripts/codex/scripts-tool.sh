#!/bin/bash

# Project scripts helper for Codex.
# Lists, searches, inspects, or runs entries under the top-level scripts/ folder.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SCRIPTS_ROOT="${REPO_ROOT}/scripts"

usage() {
  cat <<EOF
Usage: $(basename "$0") <action> [args...]

Actions:
  list [path]             List scripts (default: top-level entries)
  search <pattern>        Search script paths matching pattern
  info <relative-path>    Show the first 40 lines of a script
  run <relative-path> [args...]
                          Execute a script relative to repo root
  summary                 Print the curated cheatsheet from scripts/README.md
  help                    Show this message

Examples:
  $(basename "$0") list
  $(basename "$0") search docker
  $(basename "$0") info docker/start-stacks.sh
  $(basename "$0") run maintenance/health-check-all.sh --format json
EOF
}

ensure_path() {
  local rel="$1"
  local abs
  abs=$(realpath -m "$SCRIPTS_ROOT/$rel")
  if [[ "${abs}" != ${SCRIPTS_ROOT}* ]]; then
    echo "Path '$rel' escapes the scripts directory." >&2
    exit 1
  fi
  if [[ ! -e "$abs" ]]; then
    echo "Script path '$rel' not found under scripts/." >&2
    exit 1
  fi
  echo "$abs"
}

list_scripts() {
  local target="${1:-$SCRIPTS_ROOT}"
  if [[ "${target}" != /* ]]; then
    target="${SCRIPTS_ROOT}/${target}"
  fi
  if [[ ! -d "$target" ]]; then
    echo "Directory '$target' not found." >&2
    exit 1
  fi
  echo "Listing scripts in ${target#${REPO_ROOT}/}:"
  find "$target" -maxdepth 1 -mindepth 1 -printf "%P\t%y\n" | sort
}

search_scripts() {
  local pattern="$1"
  find "$SCRIPTS_ROOT" \( -type f -name "*.sh" -o -type f -name "*.mjs" -o -type f -name "*.py" \) -print \
    | sed "s#${REPO_ROOT}/##" \
    | grep -i --color=never "$pattern" || true
}

show_info() {
  local rel="$1"
  local abs
  abs=$(ensure_path "$rel")
  echo "File: ${abs#${REPO_ROOT}/}"
  echo "-----"
  head -n 40 "$abs"
}

run_script() {
  local rel="$1"
  shift
  local abs
  abs=$(ensure_path "$rel")
  if [[ -d "$abs" ]]; then
    echo "Cannot run directory '$rel'." >&2
    exit 1
  fi
  if [[ "$abs" != *.sh && "$abs" != *.mjs && "$abs" != *.py ]]; then
    echo "Only shell, mjs, or python scripts can be executed via this helper." >&2
    exit 1
  fi
  if [[ "$abs" == *.py ]]; then
    exec python3 "$abs" "$@"
  elif [[ "$abs" == *.mjs ]]; then
    exec node "$abs" "$@"
  else
    exec bash "$abs" "$@"
  fi
}

show_summary() {
  local summary_file="${SCRIPTS_ROOT}/README.md"
  if [[ -f "$summary_file" ]]; then
    sed -n '1,120p' "$summary_file"
  else
    echo "scripts/README.md not found."
  fi
}

ACTION="${1:-help}"
shift || true

case "$ACTION" in
  help|-h|--help)
    usage
    ;;
  list)
    list_scripts "${1:-}"
    ;;
  search)
    if [[ $# -lt 1 ]]; then
      echo "search action requires a pattern." >&2
      usage
      exit 1
    fi
    search_scripts "$1"
    ;;
  info)
    if [[ $# -lt 1 ]]; then
      echo "info action requires a relative path." >&2
      usage
      exit 1
    fi
    show_info "$1"
    ;;
  run)
    if [[ $# -lt 1 ]]; then
      echo "run action requires a relative path." >&2
      usage
      exit 1
    fi
    run_script "$@"
    ;;
  summary)
    show_summary
    ;;
  *)
    echo "Unknown action '$ACTION'." >&2
    usage
    exit 1
    ;;
esac
