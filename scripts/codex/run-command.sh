#!/bin/bash

# Codex Command Bridge
# ---------------------
# Provides a stable entrypoint so Codex (or any other CLI-only assistant)
# can invoke the same high-value workflows that were previously exposed
# as Claude slash-commands. Commands are dispatched to dedicated scripts
# that encapsulate the original automation logic.
#
# Usage:
#   bash scripts/codex/run-command.sh <command> [args...]
#
# Supported commands:
#   quality-check   -> scripts/maintenance/code-quality-check.sh
#   health-check    -> scripts/maintenance/health-check-all.sh
#   docker          -> scripts/codex/docker-stacks.sh (start/stop/ps/logs)
#   scripts         -> scripts/codex/scripts-tool.sh (list/search/run helpers)
#
# When invoked via npm, remember to pass arguments after `--`, e.g.
#   npm run codex:quality-check -- --full --format html

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [args...]

Commands:
  quality-check   Run scripts/maintenance/code-quality-check.sh
  health-check    Run scripts/maintenance/health-check-all.sh
  docker          Manage compose stacks via docker-stacks bridge
  scripts         List/search/run entries in scripts/
  help            Show this message

Examples:
  $(basename "$0") quality-check --full --format html
  $(basename "$0") health-check --format json
  $(basename "$0") docker start infra monitoring
  $(basename "$0") docker ps apps
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

COMMAND="$1"
shift || true

case "${COMMAND}" in
  help|-h|--help)
    usage
    ;;
  quality-check)
    exec bash "${REPO_ROOT}/scripts/maintenance/code-quality-check.sh" "$@"
    ;;
  health-check)
    exec bash "${REPO_ROOT}/scripts/maintenance/health-check-all.sh" "$@"
    ;;
  docker)
    exec bash "${SCRIPT_DIR}/docker-stacks.sh" "$@"
    ;;
  scripts)
    exec bash "${SCRIPT_DIR}/scripts-tool.sh" "$@"
    ;;
  *)
    echo "Unknown command: ${COMMAND}" >&2
    usage
    exit 1
    ;;
esac
