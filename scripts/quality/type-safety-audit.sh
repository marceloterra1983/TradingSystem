#!/usr/bin/env bash
set -euo pipefail

# Type Safety Audit Script
# Detecta type mismatches, conversões incorretas e inconsistências de tipos

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/reports/type-safety"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
REPORT_FILE="$REPORT_DIR/audit-$TIMESTAMP.md"

# Cores
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
CRITICAL=0
WARNINGS=0
INFO=0

# Criar diretório de reports
mkdir -p "$REPORT_DIR"

# Scope (padrão: all)
SCOPE="${1:-all}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                          ║${NC}"
echo -e "${BLUE}║              🔍  TYPE SAFETY AUDIT - TradingSystem  🔍                   ║${NC}"
echo -e "${BLUE}║                                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📋 Scope: ${GREEN}$SCOPE${NC}"
echo -e "📁 Report will be saved to: $REPORT_FILE"
echo ""

# Iniciar relatório
cat > "$REPORT_FILE" << EOF
# Type Safety Audit Report

**Data**: $(date '+%Y-%m-%d %H:%M:%S')
**Scope**: $SCOPE
**Executado por**: $(whoami)

## Resumo Executivo

EOF

# Função para adicionar issue ao relatório
add_issue() {
  local severity=$1
  local title=$2
  local file=$3
  local line=$4
  local problem=$5
  local solution=$6
  
  case $severity in
    CRITICAL)
      ((CRITICAL++))
      echo -e "${RED}🔴 CRÍTICO${NC}: $title"
      echo -e "   📄 $file:$line"
      echo ""
      cat >> "$REPORT_FILE" << EOF

### 🔴 CRÍTICO: $title
**Arquivo**: \`$file\`
**Linha**: $line
**Problema**: $problem
**Solução**: $solution

---
EOF
      ;;
    WARNING)
      ((WARNINGS++))
      echo -e "${YELLOW}🟡 WARNING${NC}: $title"
      echo -e "   📄 $file:$line"
      echo ""
      cat >> "$REPORT_FILE" << EOF

### 🟡 WARNING: $title
**Arquivo**: \`$file\`
**Linha**: $line
**Problema**: $problem
**Solução**: $solution

---
EOF
      ;;
    INFO)
      ((INFO++))
      ;;
  esac
}

# Definir diretórios baseado no scope
case $SCOPE in
  backend)
    SEARCH_PATHS=("$PROJECT_ROOT/backend" "$PROJECT_ROOT/apps")
    ;;
  frontend)
    SEARCH_PATHS=("$PROJECT_ROOT/frontend")
    ;;
  database)
    SEARCH_PATHS=("$PROJECT_ROOT/backend/data" "$PROJECT_ROOT/apps/*/src/*Client.js")
    ;;
  tp-capital)
    SEARCH_PATHS=("$PROJECT_ROOT/apps/tp-capital" "$PROJECT_ROOT/frontend/dashboard/src/components/pages/tp-capital")
    ;;
  workspace)
    SEARCH_PATHS=("$PROJECT_ROOT/apps/workspace" "$PROJECT_ROOT/backend/api/workspace")
    ;;
  *)
    SEARCH_PATHS=("$PROJECT_ROOT")
    ;;
esac

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  TIMESTAMP TYPE MISMATCHES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Pattern 1: new Date() sendo passado para query SQL (provável BIGINT)
for path in "${SEARCH_PATHS[@]}"; do
  if [ -e "$path" ]; then
    while IFS= read -r match; do
      file=$(echo "$match" | cut -d':' -f1)
      line=$(echo "$match" | cut -d':' -f2)
      content=$(echo "$match" | cut -d':' -f3-)
      
      # Verificar se é um push para query params
      if echo "$content" | grep -q "values.push.*new Date"; then
        add_issue "CRITICAL" \
          "Date object sendo passado para SQL query" \
          "$file" \
          "$line" \
          "Date object passado para query SQL (provável coluna BIGINT)" \
          "Use: values.push(new Date(...).getTime()) ou timestamp em milissegundos"
      fi
    done < <(grep -rn "values.push.*new Date" "$path" 2>/dev/null || true)
  fi
done

# Pattern 2: ts como string em sample data
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  SAMPLE DATA TYPE INCONSISTENCIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for path in "${SEARCH_PATHS[@]}"; do
  if [ -e "$path" ]; then
    while IFS= read -r match; do
      file=$(echo "$match" | cut -d':' -f1)
      line=$(echo "$match" | cut -d':' -f2)
      
      # Verificar se está em um array de sample/mock data
      if echo "$file" | grep -qE "(Client\.js|mock|sample|fixture)"; then
        add_issue "WARNING" \
          "Timestamp como string em dados de exemplo" \
          "$file" \
          "$line" \
          "Sample data usa string ISO8601 enquanto dados reais usam number" \
          "Use: ts: new Date('...').getTime() para consistência"
      fi
    done < <(grep -rn "ts:.*['\"]20[0-9][0-9]-" "${SEARCH_PATHS[@]}" 2>/dev/null || true)
  fi
done

# Pattern 3: Missing type guards em formatters
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  MISSING TYPE GUARDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Buscar funções format* que não validam tipo do input
for path in "${SEARCH_PATHS[@]}"; do
  if [ -e "$path" ]; then
    while IFS= read -r file; do
      if grep -q "function format.*(" "$file" || grep -q "export.*function format" "$file"; then
        # Verificar se tem validação de tipo
        if ! grep -q "typeof.*===" "$file" && ! grep -q "Number.isNaN" "$file"; then
          line=$(grep -n "function format" "$file" | head -1 | cut -d':' -f1)
          add_issue "WARNING" \
            "Função formatter sem type guard" \
            "$file" \
            "$line" \
            "Função format* não valida tipo do input antes de processar" \
            "Adicione validação: if (!value || typeof value !== 'expected') return fallback;"
        fi
      fi
    done < <(find "$path" -type f \( -name "*.ts" -o -name "*.js" \) 2>/dev/null || true)
  fi
done

# Pattern 4: Comparações SQL incorretas
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  SQL TYPE COMPARISONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Buscar queries com comparações de timestamp
for path in "${SEARCH_PATHS[@]}"; do
  if [ -e "$path" ]; then
    while IFS= read -r match; do
      file=$(echo "$match" | cut -d':' -f1)
      line=$(echo "$match" | cut -d':' -f2)
      
      # Verificar contexto (próximas 5 linhas) para values.push
      context=$(sed -n "${line},$((line+5))p" "$file")
      
      if echo "$context" | grep -q "new Date" && ! echo "$context" | grep -q ".getTime()"; then
        add_issue "CRITICAL" \
          "Comparação SQL de timestamp sem conversão" \
          "$file" \
          "$line" \
          "Query compara BIGINT com Date object" \
          "Converta para timestamp: new Date(...).getTime()"
      fi
    done < <(grep -rn "ts.*>=" "${SEARCH_PATHS[@]}" 2>/dev/null || true)
  fi
done

# Adicionar resumo ao relatório
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "   ${RED}🔴 Críticos: $CRITICAL${NC}"
echo -e "   ${YELLOW}🟡 Warnings: $WARNINGS${NC}"
echo -e "   ${GREEN}🟢 Info: $INFO${NC}"
echo ""
echo -e "📄 Relatório completo: ${BLUE}$REPORT_FILE${NC}"
echo ""

# Atualizar resumo no relatório
sed -i "s/## Resumo Executivo/## Resumo Executivo\n\n- 🔴 Críticos: $CRITICAL\n- 🟡 Warnings: $WARNINGS\n- 🟢 Info: $INFO\n/" "$REPORT_FILE"

# Criar symlink para último report
ln -sf "$REPORT_FILE" "$REPORT_DIR/latest.md"

# Exit code baseado em issues
if [ "$CRITICAL" -gt 0 ]; then
  echo -e "${RED}⚠️  FALHA: Issues críticos encontrados!${NC}"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  ATENÇÃO: Warnings encontrados${NC}"
  exit 0
else
  echo -e "${GREEN}✅  SUCESSO: Nenhum issue encontrado!${NC}"
  exit 0
fi

