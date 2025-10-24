#!/usr/bin/env bash
set -euo pipefail

# Monitor and Report Temporary Files
# Finds temporary files that should be cleaned up

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "🔍 Monitoramento de Arquivos Temporários"
echo "========================================"
echo ""

# Define patterns to search
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

# Build find command with excludes
FIND_CMD="find \"$ROOT_DIR\" -type f \\("

# Add temp patterns
for i in "${!TEMP_PATTERNS[@]}"; do
  if [ $i -eq 0 ]; then
    FIND_CMD+=" -name \"${TEMP_PATTERNS[$i]}\""
  else
    FIND_CMD+=" -o -name \"${TEMP_PATTERNS[$i]}\""
  fi
done

FIND_CMD+=" \\)"

# Add excludes
for dir in "${EXCLUDE_DIRS[@]}"; do
  FIND_CMD+=" -not -path \"*/$dir/*\""
done

# Execute find
echo "📂 Buscando arquivos temporários..."
echo ""

TEMP_FILES=$(eval "$FIND_CMD" 2>/dev/null || true)

if [ -z "$TEMP_FILES" ]; then
  echo "✅ Nenhum arquivo temporário encontrado!"
  echo ""
  exit 0
fi

# Count and display results
FILE_COUNT=$(echo "$TEMP_FILES" | wc -l)
echo "⚠️  Encontrados $FILE_COUNT arquivo(s) temporário(s):"
echo ""

# Group by extension
declare -A extensions
while IFS= read -r file; do
  ext="${file##*.}"
  if [ "$ext" = "$file" ]; then
    ext="(sem extensão)"
  fi
  extensions["$ext"]=$((${extensions["$ext"]:-0} + 1))
done <<< "$TEMP_FILES"

# Display grouped results
for ext in "${!extensions[@]}"; do
  count=${extensions[$ext]}
  echo "  📄 .$ext: $count arquivo(s)"
done

echo ""
echo "📋 Arquivos encontrados:"
echo "$TEMP_FILES" | sed 's|'"$ROOT_DIR/"'||' | while read -r file; do
  echo "  - $file"
done

echo ""
echo "💡 Para limpar estes arquivos, execute:"
echo "   bash scripts/maintenance/cleanup-temp-files.sh"
echo ""

