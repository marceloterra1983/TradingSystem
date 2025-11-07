#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$REPO_ROOT"

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "shellcheck não encontrado. Instale antes de executar este script." >&2
  exit 1
fi

mapfile -t shell_scripts < <(git ls-files '*.sh')

if [ "${#shell_scripts[@]}" -eq 0 ]; then
  echo "Nenhum arquivo .sh rastreado pelo git foi encontrado." >&2
  exit 0
fi

has_errors=0

for script_path in "${shell_scripts[@]}"; do
  if ! shellcheck "${script_path}"; then
    has_errors=1
  fi
done

if [ "$has_errors" -ne 0 ]; then
  echo "ShellCheck encontrou problemas em scripts shell." >&2
  exit 1
fi

echo "ShellCheck executado com sucesso em ${#shell_scripts[@]} scripts."