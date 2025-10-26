#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DOCS_CMD=(npm --prefix "${REPO_ROOT}/docs" run docs:dev)
DASHBOARD_CMD=(npm --prefix "${REPO_ROOT}/frontend/dashboard" run dev)

cleanup() {
  local exit_code=$?
  if [[ -n "${DOCS_PID:-}" ]]; then
    kill "$DOCS_PID" 2>/dev/null || true
  fi
  if [[ -n "${DASHBOARD_PID:-}" ]]; then
    kill "$DASHBOARD_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "$exit_code"
}

trap cleanup INT TERM EXIT

echo "▶ Starting docs dev server..."
"${DOCS_CMD[@]}" &
DOCS_PID=$!

sleep 2

echo "▶ Starting dashboard dev server..."
"${DASHBOARD_CMD[@]}" &
DASHBOARD_PID=$!

wait -n "$DOCS_PID" "$DASHBOARD_PID"

cleanup
