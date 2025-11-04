#!/bin/bash
# Quick Win C1: Cleanup Console Logs
# Remove console.log e console.info, manter console.error e console.warn

echo "🔍 Procurando console.log e console.info..."

# Arquivos a processar
FILES=(
  "frontend/dashboard/src/components/pages/tp-capital/SignalsTable.tsx"
  "frontend/dashboard/src/components/pages/CollectionFormDialog.tsx"
  "frontend/dashboard/src/components/pages/MarkdownViewer.tsx"
  "frontend/dashboard/src/components/pages/TestModelsPage.tsx"
  "frontend/dashboard/src/components/pages/DocusaurusPage.tsx"
  "frontend/dashboard/src/components/pages/CollectionsManagementCard.tsx"
)

TOTAL_REMOVED=0

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Contar antes
    BEFORE=$(grep -c "console\.\(log\|info\)" "$file" 2>/dev/null || echo "0")
    
    if [ "$BEFORE" -gt 0 ]; then
      echo ""
      echo "📝 $file:"
      echo "   Antes: $BEFORE console.log/info"
      
      # Comentar console.log e console.info (manter console.error/warn)
      sed -i.bak -E 's/^(\s*)(console\.(log|info)\()/\1\/\/ \2/g' "$file"
      
      # Contar depois
      AFTER=$(grep -c "console\.\(log\|info\)" "$file" 2>/dev/null || echo "0")
      REMOVED=$((BEFORE - AFTER))
      TOTAL_REMOVED=$((TOTAL_REMOVED + REMOVED))
      
      echo "   Depois: $AFTER console.log/info"
      echo "   Removidos: $REMOVED"
    fi
  fi
done

echo ""
echo "✅ Cleanup completo!"
echo "   Total removido: $TOTAL_REMOVED console.log/info"
echo "   console.error e console.warn mantidos para debugging"

