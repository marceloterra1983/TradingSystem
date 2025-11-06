#!/usr/bin/env bash
# Run actionlint and store logs under outputs/
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
LOG_DIR="$ROOT_DIR/outputs/reports/ci"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/actionlint-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"

echo "🔍 Running actionlint..."
if npx node-actionlint "$@" | tee "$LOG_FILE"; then
  echo "✅ actionlint completed successfully"
else
  status=$?
  echo "❌ actionlint reported issues (see $LOG_FILE)" >&2
  exit "$status"
fi
