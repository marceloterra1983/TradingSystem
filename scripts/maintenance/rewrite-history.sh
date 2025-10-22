#!/usr/bin/env bash
#
# Repository history cleanup helper.
# Purges dependency artifacts (node_modules, dist, build caches) and updates submodules.
# NOTE: Run from a clean clone inside a maintenance window.
#
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [[ -z "${ROOT:-}" ]]; then
  echo "Run this script inside the TradingSystem repository." >&2
  exit 1
fi

cd "${ROOT}"

echo "=== TradingSystem History Rewrite ==="
echo "Repository: ${ROOT}"
echo ""

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty. Commit or stash changes before running the cleanup." >&2
  exit 1
fi

echo "1) Verifying git-filter-repo availability..."
if ! command -v git-filter-repo >/dev/null 2>&1 && ! command -v git filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo is required. Install from https://github.com/newren/git-filter-repo" >&2
  exit 1
fi

FILTER_REPO=("git" "filter-repo")
if command -v git-filter-repo >/dev/null 2>&1; then
  FILTER_REPO=("git-filter-repo")
fi

echo "2) Taking safety snapshot (mirror clone)..."
MIRROR_PATH="${ROOT}/../TradingSystem-mirror-$(date +%Y%m%d%H%M%S)"
git clone --mirror "${ROOT}" "${MIRROR_PATH}"
echo "   Mirror saved at: ${MIRROR_PATH}"

echo "3) Running git filter-repo..."
"${FILTER_REPO[@]}" \
  --force \
  --invert-paths \
  --paths-from-file <(cat <<'EOF'
node_modules
dist
build
.turbo
.next
pnpm-lock.yaml
package-lock.json
yarn.lock
EOF
) \
  --path-rename package-lock.json:package-lock.json \
  --path-rename pnpm-lock.yaml:pnpm-lock.yaml

echo "4) Cleaning reflog..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "5) Verifying repository size..."
git count-objects -vH

echo ""
echo "History rewrite complete. Force-push main branch when ready:"
echo "  git push origin main --force-with-lease"
echo ""
echo "Share contributor reset instructions:"
cat <<'EOM'
git fetch --all --prune
git reset --hard origin/main
git submodule sync --recursive
git submodule update --init --recursive
EOM
