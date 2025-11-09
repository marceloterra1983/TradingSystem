#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${TARGET_DIR:-/home/marce/Projetos/TradingSystem}"
TARGET_USER="${TARGET_USER:-marce}"
TARGET_GROUP="${TARGET_GROUP:-marce}"
SCRIPT_PATH="$(realpath "${BASH_SOURCE[0]}")"

if [[ $EUID -ne 0 ]]; then
  echo "Elevando privilégios com sudo..."
  exec sudo --preserve-env=TARGET_DIR,TARGET_USER,TARGET_GROUP,SCRIPT_PATH bash "$SCRIPT_PATH" "$@"
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Diretório alvo não encontrado: $TARGET_DIR" >&2
  exit 1
fi

echo "🧹 Varrendo itens AnythingLLM em: $TARGET_DIR"

mapfile -t hits < <(find "$TARGET_DIR" -iname '*anythingllm*' -print 2>/dev/null || true)

if [[ ${#hits[@]} -eq 0 ]]; then
  echo "Nenhum item AnythingLLM encontrado. Nada para remover."
  exit 0
fi

echo "Itens encontrados:"
printf '  %s\n' "${hits[@]}"
echo ""

for path in "${hits[@]}"; do
  if [[ "$path" == "$SCRIPT_PATH" ]]; then
    continue
  fi
  if [[ -e "$path" ]]; then
    rm -rf "$path"
    echo "Removido: $path"
  fi
done

if [[ -d "$TARGET_DIR/data" ]]; then
  chown -R "$TARGET_USER:$TARGET_GROUP" "$TARGET_DIR/data"
fi

if [[ -d "$TARGET_DIR/backend/data" ]]; then
  chown -R "$TARGET_USER:$TARGET_GROUP" "$TARGET_DIR/backend/data"
fi

echo ""
echo "✅ Limpeza concluída."
echo "Restos encontrados após a remoção (se houver):"
find "$TARGET_DIR" -iname '*anythingllm*' -print 2>/dev/null || true

