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
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    LOG_REL="${LOG_FILE#"$ROOT_DIR/"}"
    {
      echo "## Workflow Lint"
      echo ""
      echo "- Status: ✅ Passed"
      echo "- Log: \`$LOG_REL\`"
      if [ "$#" -gt 0 ]; then
        echo "- Args: \`$*\`"
      fi
    } >> "$GITHUB_STEP_SUMMARY"
  fi
else
  status=$?
  echo "❌ actionlint reported issues (see $LOG_FILE)" >&2
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    LOG_REL="${LOG_FILE#"$ROOT_DIR/"}"
    {
      echo "## Workflow Lint"
      echo ""
      echo "- Status: ❌ Failed"
      echo "- Log: \`$LOG_REL\`"
      echo ""
      echo "### Last 20 log lines"
      echo '```'
      tail -n 20 "$LOG_FILE"
      echo '```'
    } >> "$GITHUB_STEP_SUMMARY"
  fi
  exit "$status"
fi
