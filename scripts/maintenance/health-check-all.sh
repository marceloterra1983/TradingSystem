#!/bin/bash
# ==============================================================================
# TradingSystem - Lightweight Health Check Stub
# ==============================================================================
# This script is a minimal replacement for the original maintenance health check.
# It produces a JSON payload compatible with the Service Launcher expectations so
# that integration tests (and local diagnostics) receive structured output.
# ==============================================================================

set -euo pipefail

FORMAT="json"
STATUS="healthy"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --format)
      FORMAT="${2:-json}"
      shift 2
      ;;
    --status)
      STATUS="${2:-healthy}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

emit_json() {
  cat <<JSON
{
  "success": true,
  "overallHealth": "${STATUS}",
  "timestamp": "$(timestamp)",
  "localServices": [],
  "dockerContainers": [],
  "databases": [],
  "summary": {
    "allOk": $( [[ "${STATUS}" == "healthy" ]] && echo "true" || echo "false" ),
    "servicesChecked": 0,
    "containersChecked": 0,
    "databasesChecked": 0
  },
  "remediation": []
}
JSON
}

if [[ "${FORMAT}" != "json" ]]; then
  echo "overallHealth=${STATUS}"
  exit 0
fi

emit_json
