#!/bin/bash
# Análise profunda dos GitHub Actions workflows
# Identifica problemas comuns e sugere correções

set -euo pipefail

WORKFLOWS_DIR=".github/workflows"
REPORT_FILE="outputs/reports/ci/workflow-analysis-$(date +%Y%m%d-%H%M%S).md"

mkdir -p "$(dirname "$REPORT_FILE")"

echo "🔍 Analisando workflows do GitHub Actions..."
echo ""

# Criar relatório
cat > "$REPORT_FILE" <<EOF
# GitHub Actions Workflows - Análise Profunda

**Data:** $(date +"%Y-%m-%d %H:%M:%S")
**Total de workflows:** $(ls -1 "$WORKFLOWS_DIR"/*.yml 2>/dev/null | wc -l)

## 📊 Problemas Identificados

EOF

# 1. Verificar uso incorreto de secrets
echo "### 1. Uso Incorreto de Secrets" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

secret_issues=0
while IFS= read -r file; do
    # Buscar uso direto de secrets em if (sem comparação)
    if grep -n 'if:.*secrets\.[A-Z_]*\s*}}$' "$file" 2>/dev/null; then
        echo "❌ **$file** - secrets usado sem comparação" >> "$REPORT_FILE"
        ((secret_issues++))
    fi
done < <(find "$WORKFLOWS_DIR" -name "*.yml" -type f)

if [ "$secret_issues" -eq 0 ]; then
    echo "✅ Nenhum problema encontrado" >> "$REPORT_FILE"
else
    echo "" >> "$REPORT_FILE"
    echo "**Total:** $secret_issues arquivo(s)" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# 2. Verificar FREEZE-NOTICE.md patterns
echo "### 2. Padrões FREEZE-NOTICE.md" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

freeze_files=$(grep -l "FREEZE-NOTICE\.md" "$WORKFLOWS_DIR"/*.yml 2>/dev/null | wc -l)
echo "**Workflows usando FREEZE-NOTICE.md:** $freeze_files" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Verificar padrões diferentes de grep
echo "**Padrões de detecção encontrados:**" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

grep -h "grep.*FREEZE-NOTICE" "$WORKFLOWS_DIR"/*.yml 2>/dev/null | sort -u | while read -r pattern; do
    echo "- \`$pattern\`" >> "$REPORT_FILE"
done
echo "" >> "$REPORT_FILE"

# 3. Verificar actions deprecated ou com versões antigas
echo "### 3. Actions Deprecated ou Antigas" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

deprecated_count=0
while IFS= read -r file; do
    filename=$(basename "$file")
    
    # Verificar versões antigas de actions/checkout
    if grep -q "actions/checkout@v[12]" "$file" 2>/dev/null; then
        echo "⚠️ **$filename** - usando actions/checkout@v1 ou v2 (atual: v4)" >> "$REPORT_FILE"
        ((deprecated_count++))
    fi
    
    # Verificar actions/setup-node antigas
    if grep -q "actions/setup-node@v[12]" "$file" 2>/dev/null; then
        echo "⚠️ **$filename** - usando actions/setup-node@v1 ou v2 (atual: v4)" >> "$REPORT_FILE"
        ((deprecated_count++))
    fi
done < <(find "$WORKFLOWS_DIR" -name "*.yml" -type f)

if [ "$deprecated_count" -eq 0 ]; then
    echo "✅ Todas as actions estão atualizadas" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# 4. Verificar jobs que dependem de FREEZE-NOTICE.md
echo "### 4. Jobs com Dependência de Freeze Guard" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

jobs_with_freeze=0
while IFS= read -r file; do
    filename=$(basename "$file")
    
    if grep -q "needs:.*freeze" "$file" 2>/dev/null; then
        echo "- **$filename** - depende do freeze_guard" >> "$REPORT_FILE"
        ((jobs_with_freeze++))
    fi
done < <(find "$WORKFLOWS_DIR" -name "*.yml" -type f)

echo "" >> "$REPORT_FILE"
echo "**Total:** $jobs_with_freeze workflow(s)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 5. Verificar triggers (on:)
echo "### 5. Triggers dos Workflows" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "| Workflow | push | pull_request | schedule | workflow_dispatch |" >> "$REPORT_FILE"
echo "|----------|------|--------------|----------|-------------------|" >> "$REPORT_FILE"

while IFS= read -r file; do
    filename=$(basename "$file" .yml)
    
    has_push=$(grep -q "^  push:" "$file" && echo "✅" || echo "❌")
    has_pr=$(grep -q "^  pull_request:" "$file" && echo "✅" || echo "❌")
    has_schedule=$(grep -q "^  schedule:" "$file" && echo "✅" || echo "❌")
    has_dispatch=$(grep -q "^  workflow_dispatch:" "$file" && echo "✅" || echo "❌")
    
    echo "| $filename | $has_push | $has_pr | $has_schedule | $has_dispatch |" >> "$REPORT_FILE"
done < <(find "$WORKFLOWS_DIR" -name "*.yml" -type f | sort)

echo "" >> "$REPORT_FILE"

# 6. Verificar cache e dependencies
echo "### 6. Otimizações de Cache" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

workflows_with_cache=$(grep -l "actions/cache" "$WORKFLOWS_DIR"/*.yml 2>/dev/null | wc -l)
workflows_total=$(ls -1 "$WORKFLOWS_DIR"/*.yml 2>/dev/null | wc -l)

echo "**Workflows usando cache:** $workflows_with_cache / $workflows_total" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 7. Sumário e Recomendações
cat >> "$REPORT_FILE" <<'EOF'

## 🎯 Recomendações de Correção

### Prioridade Alta (P0)

1. **Corrigir uso de secrets** em condições `if`
   - Padrão incorreto: `if: ${{ secrets.VAR }}`
   - Padrão correto: `if: ${{ secrets.VAR != '' }}`

2. **Padronizar Freeze Guard** em todos os workflows
   - Usar padrão consistente de grep
   - Adicionar fallback se arquivo não existir
   - Documentar formato esperado

### Prioridade Média (P1)

3. **Atualizar actions deprecated**
   - `actions/checkout@v4`
   - `actions/setup-node@v4`
   - `actions/cache@v4`

4. **Adicionar error handling** robusto
   - `set -e` em scripts bash
   - `continue-on-error: true` para steps não críticos
   - Timeout explícito para jobs longos

### Prioridade Baixa (P2)

5. **Otimizar performance**
   - Adicionar cache para node_modules
   - Usar `concurrency` para cancelar runs duplicados
   - Paralelizar jobs independentes

6. **Melhorar observabilidade**
   - Adicionar step summaries
   - Notificações consistentes
   - Artifacts para debug

## 🔧 Próximos Passos

Execute o script de correção automática:

```bash
bash scripts/ci/fix-workflows.sh --dry-run  # Preview
bash scripts/ci/fix-workflows.sh            # Aplicar correções
```

EOF

echo "✅ Análise completa salva em: $REPORT_FILE"
cat "$REPORT_FILE"

