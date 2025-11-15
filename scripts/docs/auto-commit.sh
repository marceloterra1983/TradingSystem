#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

echo "🔄 Executando docs:auto + validações..."
npm --prefix docs run docs:auto
npm --prefix docs run docs:validate-generated

declare -a GENERATED_FILES=(
  "docs/content/tools/ports-services.mdx"
  "docs/content/frontend/design-system/tokens.mdx"
  "docs/content/reference/ports.mdx"
)

changed=()
for file in "${GENERATED_FILES[@]}"; do
  if ! git ls-files --error-unmatch "${file}" >/dev/null 2>&1; then
    continue
  fi
  if git diff --quiet -- "${file}"; then
    continue
  fi
  changed+=("${file}")
done

if [ "${#changed[@]}" -eq 0 ]; then
  echo "ℹ️  Nenhuma alteração gerada; nada a commitar."
  exit 0
fi

git add "${changed[@]}"
COMMIT_MSG="${1:-${DOCS_AUTO_COMMIT_MSG:-chore(docs): sync generated docs}}"
git commit -m "${COMMIT_MSG}"
echo "✅ Commit criado para arquivos gerados:"
printf '   - %s\n' "${changed[@]}"

