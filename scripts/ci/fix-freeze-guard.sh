#!/bin/bash
# Corrige o Freeze Guard em todos os workflows
# Adiciona verificação de existência do arquivo FREEZE-NOTICE.md

set -euo pipefail

WORKFLOWS_DIR=".github/workflows"
FIXED=0

echo "🔧 Corrigindo Freeze Guard nos workflows..."
echo ""

# Lista de workflows que usam FREEZE-NOTICE.md
WORKFLOWS=(
    "docs-audit-scheduled.yml"
    "code-quality.yml"
    "docs-code-sync-validation.yml"
    "docs-deploy.yml"
    "docs-link-validation.yml"
    "tp-capital-signals.yml"
    "shellcheck.yml"
    "docs-validation.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    file="$WORKFLOWS_DIR/$workflow"
    
    if [ ! -f "$file" ]; then
        echo "⚠️  Arquivo não encontrado: $workflow"
        continue
    fi
    
    # Verificar se já tem a correção
    if grep -q "if \[ ! -f FREEZE-NOTICE.md \]; then" "$file"; then
        echo "✅ $workflow - já corrigido"
        continue
    fi
    
    echo "🔄 Corrigindo $workflow..."
    
    # Fazer backup
    cp "$file" "$file.bak"
    
    # Criar arquivo temporário com a correção
    awk '
    /status_line=\$\(grep -i/ {
        # Adicionar verificação ANTES do grep
        print "          if [ ! -f FREEZE-NOTICE.md ]; then"
        print "            echo \"active=false\" >> \"$GITHUB_OUTPUT\""
        print "            echo \"No FREEZE-NOTICE.md file found - proceeding normally\""
        print "            exit 0"
        print "          fi"
        # Adicionar || echo "" ao final do grep para evitar exit code 1
        sub(/\)/, " || echo \\\"\\\")");
        print
        next
    }
    { print }
    ' "$file" > "$file.tmp"
    
    # Substituir arquivo original
    mv "$file.tmp" "$file"
    
    echo "   ✅ Corrigido"
    ((FIXED++))
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Workflows corrigidos: $FIXED / ${#WORKFLOWS[@]}"
echo ""

if [ "$FIXED" -gt 0 ]; then
    echo "Arquivos modificados:"
    for workflow in "${WORKFLOWS[@]}"; do
        file="$WORKFLOWS_DIR/$workflow"
        if [ -f "$file.bak" ]; then
            echo "  - $workflow (backup: $file.bak)"
        fi
    done
    echo ""
    echo "Próximos passos:"
    echo "  1. Revisar: git diff .github/workflows/"
    echo "  2. Testar: Commit e push para testar no CI"
    echo "  3. Limpar backups: rm .github/workflows/*.bak"
fi

echo ""

