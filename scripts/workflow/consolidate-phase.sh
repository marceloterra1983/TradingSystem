#!/bin/bash
# Script de Consolidação Automática de Fase
# Agrega outputs de uma fase e gera CONSOLIDACAO-FASE-XX.md
# Data: 2025-11-02

set -u

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Validar argumentos
if [ $# -lt 2 ]; then
    echo "Usage: $0 <phase_number> <phase_dir>"
    echo ""
    echo "Example: $0 1 outputs/workflow-auditoria-2025-11-02/fase-01-inventario"
    exit 1
fi

PHASE_NUM=$1
PHASE_DIR=$2
OUTPUT_FILE="$PHASE_DIR/CONSOLIDACAO-FASE-$(printf '%02d' $PHASE_NUM).md"
TEMPLATE_FILE="templates/workflow/05-phase-consolidation.md"

# Validar diretório
if [ ! -d "$PHASE_DIR" ]; then
    echo -e "${RED}❌ Diretório não existe: $PHASE_DIR${NC}"
    exit 1
fi

# Validar template
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${YELLOW}⚠️  Template não encontrado, criando consolidação simples${NC}"
    USE_TEMPLATE=false
else
    USE_TEMPLATE=true
fi

echo "=================================================="
echo "  Consolidação de Fase - Workflow Auditoria"
echo "=================================================="
echo ""
echo "Fase: $PHASE_NUM"
echo "Diretório: $PHASE_DIR"
echo "Output: $OUTPUT_FILE"
echo ""

# Mapear nome da fase
case $PHASE_NUM in
    1) PHASE_NAME="Inventário e Diagnóstico" ;;
    2) PHASE_NAME="Auditoria de Dados" ;;
    3) PHASE_NAME="Análise Arquitetural" ;;
    4) PHASE_NAME="Revisão de Código" ;;
    5) PHASE_NAME="Testes e Qualidade" ;;
    6) PHASE_NAME="Performance" ;;
    7) PHASE_NAME="Documentação" ;;
    8) PHASE_NAME="Consolidação e Roadmap" ;;
    *) PHASE_NAME="Fase $PHASE_NUM" ;;
esac

# Função para extrair métricas de tabelas markdown
extract_metrics() {
    local file=$1
    if [ -f "$file" ]; then
        # Procurar por tabelas com métricas (formato: | Metric | Value |)
        grep -E '^\|.*\|.*\|' "$file" | grep -v '^|---' | head -20
    fi
}

# Função para contar findings por prioridade
count_findings() {
    local file=$1
    local priority=$2
    if [ -f "$file" ]; then
        grep -c "**${priority}:**" "$file" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Função para extrair scores
extract_score() {
    local file=$1
    if [ -f "$file" ]; then
        # Procurar por "Score: X/100" ou "Overall Score: X/100"
        grep -oP '(?<=Score: )\d+(?=/100)' "$file" | head -1
    fi
}

# Iniciar consolidação
echo -e "${BLUE}Coletando dados da fase...${NC}"

# Listar arquivos da fase
FILES=$(find "$PHASE_DIR" -name "*.md" -o -name "*.json" | grep -v "CONSOLIDACAO" | sort)
FILE_COUNT=$(echo "$FILES" | wc -l)

echo "Arquivos encontrados: $FILE_COUNT"

# Contar métricas agregadas
TOTAL_P0=0
TOTAL_P1=0
TOTAL_P2=0
SCORES=()

for file in $FILES; do
    if [ -f "$file" ]; then
        # Contar findings
        P0=$(count_findings "$file" "P0")
        P1=$(count_findings "$file" "P1")
        P2=$(count_findings "$file" "P2")
        
        TOTAL_P0=$((TOTAL_P0 + P0))
        TOTAL_P1=$((TOTAL_P1 + P1))
        TOTAL_P2=$((TOTAL_P2 + P2))
        
        # Extrair score
        SCORE=$(extract_score "$file")
        if [ -n "$SCORE" ]; then
            SCORES+=($SCORE)
        fi
    fi
done

# Calcular score médio
if [ ${#SCORES[@]} -gt 0 ]; then
    AVG_SCORE=$(awk 'BEGIN {sum=0; for(i=1;i<ARGC;i++) sum+=ARGV[i]; print int(sum/(ARGC-1))}' "${SCORES[@]}")
else
    AVG_SCORE="N/A"
fi

echo ""
echo "Métricas agregadas:"
echo "  - P0 (Critical): $TOTAL_P0"
echo "  - P1 (High): $TOTAL_P1"
echo "  - P2 (Medium): $TOTAL_P2"
echo "  - Score médio: $AVG_SCORE"
echo ""

# Gerar consolidação
echo -e "${BLUE}Gerando consolidação...${NC}"

if [ "$USE_TEMPLATE" = true ]; then
    # Copiar template
    cp "$TEMPLATE_FILE" "$OUTPUT_FILE"
    
    # Substituir placeholders
    DATE=$(date +"%Y-%m-%d")
    sed -i "s/\[X\]/$PHASE_NUM/g" "$OUTPUT_FILE"
    sed -i "s/\[Phase Name\]/$PHASE_NAME/g" "$OUTPUT_FILE"
    sed -i "s/YYYY-MM-DD/$DATE/g" "$OUTPUT_FILE"
else
    # Criar consolidação simples
    cat > "$OUTPUT_FILE" << EOF
# Phase $PHASE_NUM Consolidation - $PHASE_NAME

**Date:** $(date +"%Y-%m-%d")
**Phase:** $PHASE_NUM
**Status:** ⏳ In Progress

---

## Executive Summary

**Phase Status:** ⏳ In Progress

**Key Metrics:**
- Files Generated: $FILE_COUNT
- Critical Issues (P0): $TOTAL_P0
- High Priority (P1): $TOTAL_P1
- Medium Priority (P2): $TOTAL_P2
- Average Score: $AVG_SCORE/100

---

## Outputs Generated

EOF

    # Listar arquivos
    for file in $FILES; do
        FILENAME=$(basename "$file")
        FILESIZE=$(du -h "$file" | cut -f1)
        echo "- \`$FILENAME\` ($FILESIZE)" >> "$OUTPUT_FILE"
    done
    
    cat >> "$OUTPUT_FILE" << 'EOF'

---

## Key Findings Summary

### Critical (P0)
EOF
    echo "" >> "$OUTPUT_FILE"
    echo "**Total:** $TOTAL_P0 items" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    # Extrair P0 findings de todos os arquivos
    for file in $FILES; do
        if [ -f "$file" ]; then
            grep -A 3 "\*\*P0:\*\*" "$file" 2>/dev/null | head -20 >> "$OUTPUT_FILE" || true
        fi
    done
    
    cat >> "$OUTPUT_FILE" << 'EOF'

### High (P1)
EOF
    echo "" >> "$OUTPUT_FILE"
    echo "**Total:** $TOTAL_P1 items" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    cat >> "$OUTPUT_FILE" << 'EOF'

### Medium (P2)
EOF
    echo "" >> "$OUTPUT_FILE"
    echo "**Total:** $TOTAL_P2 items" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    cat >> "$OUTPUT_FILE" << 'EOF'

---

## Metrics Collected

EOF

    # Extrair métricas de arquivos JSON
    for file in $FILES; do
        if [[ "$file" == *.json ]]; then
            echo "### $(basename "$file")" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            echo '```json' >> "$OUTPUT_FILE"
            head -50 "$file" >> "$OUTPUT_FILE"
            echo '```' >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        fi
    done
    
    cat >> "$OUTPUT_FILE" << 'EOF'

---

## Approval Criteria Check

### Go/No-Go Checklist

- [ ] All objectives completed
- [ ] All outputs generated and reviewed
- [ ] Critical issues (P0) have action plan
- [ ] Quality threshold met
- [ ] No blockers for next phase

**Decision:** ⏳ PENDING REVIEW

---

## Next Steps

1. Review all outputs
2. Address P0 issues
3. Answer mandatory questions
4. Get stakeholder approval
5. Proceed to next phase

---

**Consolidation Status:** ✅ Generated automatically
**Generated By:** consolidate-phase.sh
**Manual Review Required:** Yes
EOF
fi

# Adicionar anexo com lista de arquivos
cat >> "$OUTPUT_FILE" << 'EOF'

---

## Appendix A: File List

EOF

echo "" >> "$OUTPUT_FILE"
for file in $FILES; do
    FILENAME=$(basename "$file")
    FILEPATH=$(realpath --relative-to="$PHASE_DIR" "$file")
    FILESIZE=$(du -h "$file" | cut -f1)
    LINES=$(wc -l < "$file" 2>/dev/null || echo "N/A")
    echo "- **$FILENAME** ($FILESIZE, $LINES lines)" >> "$OUTPUT_FILE"
    echo "  - Path: \`$FILEPATH\`" >> "$OUTPUT_FILE"
done

echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Total Files:** $FILE_COUNT" >> "$OUTPUT_FILE"
echo "**Generated:** $(date +'%Y-%m-%d %H:%M:%S')" >> "$OUTPUT_FILE"

# Sumário final
echo ""
echo "=================================================="
echo "            CONSOLIDAÇÃO COMPLETA"
echo "=================================================="
echo -e "${GREEN}✅ Arquivo gerado: $OUTPUT_FILE${NC}"
echo ""
echo "Estatísticas:"
echo "  - Outputs processados: $FILE_COUNT"
echo "  - Findings P0: $TOTAL_P0"
echo "  - Findings P1: $TOTAL_P1"
echo "  - Findings P2: $TOTAL_P2"
echo "  - Score médio: $AVG_SCORE/100"
echo ""
echo "Próximos passos:"
echo "  1. Revisar o arquivo gerado"
echo "  2. Completar seções manualmente"
echo "  3. Responder questionamentos obrigatórios"
echo "  4. Obter aprovação Go/No-Go"
echo "=================================================="

