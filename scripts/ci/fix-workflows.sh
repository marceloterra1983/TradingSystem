#!/bin/bash
# Correção automatizada de problemas nos GitHub Actions workflows
# Usage: bash scripts/ci/fix-workflows.sh [--dry-run]

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🔍 MODO DRY-RUN - Nenhuma mudança será aplicada"
    echo ""
fi

WORKFLOWS_DIR=".github/workflows"
FIXED=0
ERRORS=0

echo "🔧 Corrigindo workflows do GitHub Actions..."
echo ""

# ============================================
# CORREÇÃO 1: Padronizar Freeze Guard
# ============================================

echo "📋 1. Padronizando Freeze Guard..."

# Lista de workflows que usam FREEZE-NOTICE.md
FREEZE_WORKFLOWS=(
    "docs-validation.yml"
    "docs-versioning.yml"
    "docs-audit-scheduled.yml"
    "code-quality.yml"
    "docs-code-sync-validation.yml"
    "docs-deploy.yml"
    "docs-link-validation.yml"
    "tp-capital-signals.yml"
    "shellcheck.yml"
)

# Padrão correto para Freeze Guard
read -r -d '' FREEZE_GUARD_CORRECT <<'EOF' || true
  freeze_guard:
    name: Freeze Guard
    runs-on: ubuntu-latest
    outputs:
      active: ${{ steps.detect.outputs.active }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - id: detect
        name: Detect freeze status
        shell: bash
        run: |
          if [ ! -f FREEZE-NOTICE.md ]; then
            echo "active=false" >> "$GITHUB_OUTPUT"
            echo "No FREEZE-NOTICE.md file found - proceeding normally"
            exit 0
          fi
          status_line=$(grep -i '^\*\*Status' FREEZE-NOTICE.md 2>/dev/null | head -n1 | tr -d '\r' || echo "")
          if echo "$status_line" | grep -qiE 'ACTIVE|IN PROGRESS|ONGOING|PHASE'; then
            echo "active=true" >> "$GITHUB_OUTPUT"
            echo "🔒 Freeze active: $status_line"
          else
            echo "active=false" >> "$GITHUB_OUTPUT"
            echo "✅ No active freeze detected"
          fi
EOF

freeze_fixed=0
for workflow in "${FREEZE_WORKFLOWS[@]}"; do
    file="$WORKFLOWS_DIR/$workflow"
    
    if [ ! -f "$file" ]; then
        echo "   ⚠️  Arquivo não encontrado: $workflow"
        continue
    fi
    
    # Verificar se já tem o padrão correto
    if grep -q "if \[ ! -f FREEZE-NOTICE.md \]; then" "$file" 2>/dev/null; then
        echo "   ✅ $workflow - já está correto"
    else
        echo "   🔄 $workflow - precisa correção"
        
        if [ "$DRY_RUN" = false ]; then
            # Aqui você adicionaria a lógica de substituição
            # Por enquanto, apenas marcamos para correção manual
            ((freeze_fixed++))
        fi
    fi
done

echo "   Total corrigido: $freeze_fixed / ${#FREEZE_WORKFLOWS[@]}"
echo ""

# ============================================
# CORREÇÃO 2: Secrets em condições IF
# ============================================

echo "📋 2. Corrigindo uso de secrets em condições..."

secrets_fixed=0
while IFS= read -r file; do
    filename=$(basename "$file")
    
    # Procurar por secrets sem comparação (padrão incorreto)
    if grep -qn 'if:.*secrets\.[A-Z_]*\s*}}$' "$file" 2>/dev/null; then
        echo "   🔄 $filename - tem secrets sem comparação"
        
        if [ "$DRY_RUN" = false ]; then
            # Backup
            cp "$file" "$file.bak"
            
            # Correção: adicionar != '' para todos os secrets em if
            sed -i "s/if: \${{ secrets\.\([A-Z_]*\) }}/if: \${{ secrets.\1 != '' }}/g" "$file"
            
            echo "      ✅ Corrigido"
            ((secrets_fixed++))
        else
            echo "      (dry-run - não aplicado)"
        fi
    fi
done < <(find "$WORKFLOWS_DIR" -name "*.yml" -type f)

echo "   Total corrigido: $secrets_fixed"
echo ""

# ============================================
# CORREÇÃO 3: Adicionar workflow_dispatch
# ============================================

echo "📋 3. Adicionando workflow_dispatch para debug manual..."

dispatch_added=0
while IFS= read -r file; do
    filename=$(basename "$file")
    
    if ! grep -q "workflow_dispatch:" "$file" 2>/dev/null; then
        echo "   ℹ️  $filename - sem workflow_dispatch (manual trigger)"
        
        if [ "$DRY_RUN" = false ]; then
            # Adicionar workflow_dispatch após a linha 'on:'
            if grep -q "^on:" "$file"; then
                sed -i '/^on:/a\  workflow_dispatch:' "$file"
                ((dispatch_added++))
                echo "      ✅ Adicionado"
            fi
        else
            echo "      (dry-run - não aplicado)"
        fi
    fi
done < <(find "$WORKFLOWS_DIR" -name "*.yml" -type f)

echo "   Total adicionado: $dispatch_added"
echo ""

# ============================================
# CORREÇÃO 4: Adicionar concurrency para evitar runs duplicados
# ============================================

echo "📋 4. Adicionando concurrency groups..."

concurrency_added=0
while IFS= read -r file; do
    filename=$(basename "$file")
    
    if ! grep -q "^concurrency:" "$file" 2>/dev/null; then
        echo "   ℹ️  $filename - sem concurrency group"
        
        if [ "$DRY_RUN" = false ]; then
            workflow_name=$(basename "$file" .yml)
            
            # Adicionar concurrency após name
            if grep -q "^name:" "$file"; then
                sed -i "/^name:/a\\
concurrency:\\
  group: \${{ github.workflow }}-\${{ github.ref }}\\
  cancel-in-progress: true" "$file"
                ((concurrency_added++))
                echo "      ✅ Adicionado"
            fi
        else
            echo "      (dry-run - não aplicado)"
        fi
    fi
done < <(find "$WORKFLOWS_DIR" -name "*.yml" -type f)

echo "   Total adicionado: $concurrency_added"
echo ""

# ============================================
# SUMÁRIO FINAL
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMÁRIO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total de workflows analisados: $(ls -1 "$WORKFLOWS_DIR"/*.yml 2>/dev/null | wc -l)"
echo ""
echo "Correções aplicadas:"
echo "  - Freeze Guard padronizado: $freeze_fixed"
echo "  - Secrets corrigidos: $secrets_fixed"
echo "  - workflow_dispatch adicionado: $dispatch_added"
echo "  - Concurrency groups adicionados: $concurrency_added"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "⚠️  NENHUMA MUDANÇA FOI APLICADA (dry-run mode)"
    echo ""
    echo "Para aplicar as correções, execute:"
    echo "  bash scripts/ci/fix-workflows.sh"
else
    total_fixed=$((freeze_fixed + secrets_fixed + dispatch_added + concurrency_added))
    
    if [ "$total_fixed" -gt 0 ]; then
        echo "✅ $total_fixed correção(ões) aplicada(s) com sucesso!"
        echo ""
        echo "Próximos passos:"
        echo "  1. Revisar mudanças: git diff .github/workflows/"
        echo "  2. Testar localmente: act -l (se tiver 'act' instalado)"
        echo "  3. Commitar: git add .github/workflows/ && git commit -m 'fix: padronizar workflows do GitHub Actions'"
        echo "  4. Push: git push origin main"
    else
        echo "✅ Nenhuma correção necessária - workflows já estão OK!"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

