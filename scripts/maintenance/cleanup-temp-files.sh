#!/usr/bin/env bash
set -euo pipefail

# Cleanup Temporary Files
# Removes temporary files safely

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "🧹 Limpeza de Arquivos Temporários"
echo "==================================="
echo ""

# Define patterns to delete
TEMP_PATTERNS=(
  "*.tmp"
  "*.temp"
  "*.bak"
  "*.backup"
  "*.old"
  "*.swp"
  "*.swo"
  "*~"
  ".DS_Store"
  "Thumbs.db"
  "desktop.ini"
)

# Directories to exclude
EXCLUDE_DIRS=(
  "node_modules"
  ".git"
  "dist"
  "build"
  ".next"
  ".vite"
  "coverage"
)

# Build find command
FIND_CMD="find \"$ROOT_DIR\" -type f \\("

for i in "${!TEMP_PATTERNS[@]}"; do
  if [ $i -eq 0 ]; then
    FIND_CMD+=" -name \"${TEMP_PATTERNS[$i]}\""
  else
    FIND_CMD+=" -o -name \"${TEMP_PATTERNS[$i]}\""
  fi
done

FIND_CMD+=" \\)"

for dir in "${EXCLUDE_DIRS[@]}"; do
  FIND_CMD+=" -not -path \"*/$dir/*\""
done

# Find temp files
TEMP_FILES=$(eval "$FIND_CMD" 2>/dev/null || true)

if [ -z "$TEMP_FILES" ]; then
  echo "✅ Nenhum arquivo temporário encontrado!"
  echo ""
  exit 0
fi

FILE_COUNT=$(echo "$TEMP_FILES" | wc -l)
echo "⚠️  Encontrados $FILE_COUNT arquivo(s) temporário(s)"
echo ""
echo "$TEMP_FILES" | sed 's|'"$ROOT_DIR/"'||' | while read -r file; do
  echo "  - $file"
done
echo ""

read -p "❓ Deseja deletar estes arquivos? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "❌ Operação cancelada"
  exit 0
fi

# Delete files
echo ""
echo "🗑️  Deletando arquivos..."
deleted_count=0

while IFS= read -r file; do
  if rm "$file" 2>/dev/null; then
    echo "  ✅ $(basename "$file")"
    ((deleted_count++))
  else
    echo "  ❌ Falha ao deletar: $(basename "$file")"
  fi
done <<< "$TEMP_FILES"

echo ""
echo "✅ Limpeza concluída!"
echo "   $deleted_count arquivo(s) deletado(s)"
echo ""

