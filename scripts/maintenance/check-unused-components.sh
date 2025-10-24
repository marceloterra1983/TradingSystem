#!/usr/bin/env bash
set -euo pipefail

# Check for Unused React Components
# Identifies components that are not imported anywhere

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend/dashboard/src"

echo "🔍 Verificação de Componentes Não Usados"
echo "========================================="
echo ""

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "❌ Diretório frontend não encontrado: $FRONTEND_DIR"
  exit 1
fi

# Find all component files
echo "📂 Analisando componentes em: $FRONTEND_DIR"
echo ""

declare -a unused_components=()
total_components=0

# Find all .tsx and .ts files (excluding tests, node_modules, and config files)
while IFS= read -r component_file; do
  ((total_components++))
  
  # Extract component name from filename
  component_name=$(basename "$component_file" .tsx)
  component_name=$(basename "$component_name" .ts)
  
  # Skip certain files
  if [[ "$component_name" =~ ^(index|types|constants|utils|api|config|setup)$ ]]; then
    continue
  fi
  
  # Skip main entry points
  if [[ "$component_file" =~ (main\.tsx|App\.tsx|vite-env\.d\.ts)$ ]]; then
    continue
  fi
  
  # Search for imports of this component
  # Look for: import ... from './ComponentName' or import ... from '../ComponentName'
  import_count=$(grep -r "import.*from.*['\"].*$component_name['\"]" "$FRONTEND_DIR" \
    --include="*.tsx" \
    --include="*.ts" \
    --exclude="$(basename "$component_file")" \
    2>/dev/null | wc -l)
  
  # Also check for dynamic imports
  dynamic_count=$(grep -r "import(['\"].*$component_name['\"])" "$FRONTEND_DIR" \
    --include="*.tsx" \
    --include="*.ts" \
    2>/dev/null | wc -l)
  
  total_refs=$((import_count + dynamic_count))
  
  if [ "$total_refs" -eq 0 ]; then
    relative_path="${component_file#$FRONTEND_DIR/}"
    unused_components+=("$relative_path")
  fi
done < <(find "$FRONTEND_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/__tests__/*" \
  -not -path "*/test/*")

echo "📊 Resultados:"
echo "  Total de componentes analisados: $total_components"
echo "  Componentes não usados: ${#unused_components[@]}"
echo ""

if [ ${#unused_components[@]} -eq 0 ]; then
  echo "✅ Todos os componentes estão sendo utilizados!"
  echo ""
  exit 0
fi

echo "⚠️  Componentes potencialmente não usados:"
echo ""
for component in "${unused_components[@]}"; do
  echo "  - $component"
done

echo ""
echo "💡 Notas:"
echo "  - Alguns componentes podem ser importados dinamicamente"
echo "  - Verifique manualmente antes de remover"
echo "  - Componentes de teste e utilitários foram excluídos"
echo ""

