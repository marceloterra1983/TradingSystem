#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

echo "[docs] Building site before link verification..."
npm --prefix "${DOCS_DIR}" run docs:build "$@"

LINK_TARGET="${DOCS_DIR}/build/index.html"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found in PATH" >&2
  exit 1
fi

echo "[docs] Running linkinator against build output..."
SKIP_PATTERNS=("mailto:*" "https://github.com/TradingSystem/TradingSystem*")
if [[ -n "${EXTRA_SKIP:-}" ]]; then
  # Allow callers to append custom skip patterns separated by space
  read -r -a EXTRA_ARRAY <<<"${EXTRA_SKIP}"
  SKIP_PATTERNS=("${SKIP_PATTERNS[@]}" "${EXTRA_ARRAY[@]}")
fi

LINK_ARGS=("--silent" "--retry" "--retries" "2")
for pattern in "${SKIP_PATTERNS[@]}"; do
  LINK_ARGS+=("--skip" "${pattern}")
done

OUTPUT=$(npx --yes linkinator "${LINK_TARGET}" "${LINK_ARGS[@]}" 2>&1)
STATUS=$?
echo "${OUTPUT}"

if [[ ${STATUS} -ne 0 ]] || echo "${OUTPUT}" | grep -q "BROKEN"; then
  echo "[docs] Broken links detected" >&2
  exit 1
fi

echo "[docs] Link check passed"
