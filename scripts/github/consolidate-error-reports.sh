#!/bin/bash
# Consolidate Multiple Error Reports
# Consolida múltiplos relatórios de erro em um único arquivo

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuração
ERRORS_DIR="./workflow-errors"
OUTPUT_FILE="$ERRORS_DIR/CONSOLIDATED-REPORT-$(date +%Y%m%d-%H%M%S).md"

echo -e "${BLUE}📚 Error Reports Consolidator${NC}"
echo ""

# Verificar se diretório existe
if [ ! -d "$ERRORS_DIR" ]; then
    echo -e "${RED}❌ Diretório $ERRORS_DIR não encontrado${NC}"
    echo "Execute primeiro: bash scripts/github/collect-workflow-errors.sh"
    exit 1
fi

# Contar relatórios
REPORT_COUNT=$(find "$ERRORS_DIR" -name "ERROR-REPORT-*.md" | wc -l)

if [ "$REPORT_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ Nenhum relatório encontrado em $ERRORS_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Encontrados $REPORT_COUNT relatórios${NC}"
echo ""

# Iniciar relatório consolidado
cat > "$OUTPUT_FILE" << 'EOF'
# 📊 Relatório Consolidado de Erros - GitHub Actions

**Gerado em:** TIMESTAMP
**Repositório:** REPO_NAME
**Período de Análise:** Últimos REPORT_COUNT relatórios

---

## 📈 Estatísticas Gerais

EOF

# Substituir placeholders
sed -i "s/TIMESTAMP/$(date '+%Y-%m-%d %H:%M:%S')/" "$OUTPUT_FILE"
sed -i "s/REPO_NAME/$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo 'TradingSystem')/" "$OUTPUT_FILE"
sed -i "s/REPORT_COUNT/$REPORT_COUNT/" "$OUTPUT_FILE"

# Analisar padrões de falhas
echo -e "${YELLOW}🔍 Analisando padrões de falhas...${NC}"

# Workflows que mais falharam
echo "### 🔴 Workflows com Mais Falhas" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

grep -h "^| " "$ERRORS_DIR"/ERROR-REPORT-*.md 2>/dev/null | \
    grep -v "Workflow" | \
    awk -F'|' '{print $2}' | \
    sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | \
    sort | uniq -c | sort -rn | head -10 | \
    while read count workflow; do
        echo "- **$workflow**: $count falhas" >> "$OUTPUT_FILE"
    done

echo "" >> "$OUTPUT_FILE"

# Erros mais comuns
echo "### ⚠️ Erros Mais Comuns" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

grep -h "error\|failed\|exception" "$ERRORS_DIR"/ERROR-REPORT-*.md 2>/dev/null | \
    grep -v "ERROR-REPORT\|Logs de Erro" | \
    sed 's/^[[:space:]]*//' | \
    sort | uniq -c | sort -rn | head -15 | \
    while read count error; do
        echo "- [$count ocorrências] \`${error:0:100}\`" >> "$OUTPUT_FILE"
    done

echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Adicionar cada relatório individual
echo "## 📄 Relatórios Individuais" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find "$ERRORS_DIR" -name "ERROR-REPORT-*.md" -type f | sort -r | while read report; do
    echo -e "${BLUE}📝 Processando: $(basename "$report")${NC}"

    REPORT_DATE=$(basename "$report" | sed 's/ERROR-REPORT-//;s/.md//')

    cat >> "$OUTPUT_FILE" << EOF

### 📋 Relatório: $REPORT_DATE

<details>
<summary>Clique para expandir</summary>

EOF

    # Adicionar conteúdo do relatório (exceto cabeçalho duplicado)
    tail -n +3 "$report" >> "$OUTPUT_FILE"

    cat >> "$OUTPUT_FILE" << 'EOF'

</details>

---

EOF
done

# Adicionar seção de recomendações
cat >> "$OUTPUT_FILE" << 'EOF'

## 🎯 Recomendações de Ação

### 🔴 Prioridade Alta

1. **Workflows que falham consistentemente**
   - Identificar workflows com > 3 falhas
   - Investigar causa raiz
   - Aplicar correções definitivas

2. **Erros recorrentes**
   - Padronizar soluções para erros comuns
   - Atualizar documentação
   - Criar scripts de auto-correção

3. **Dependências problemáticas**
   - Revisar `npm audit`
   - Atualizar versões conflitantes
   - Remover dependências não utilizadas

### 🟡 Prioridade Média

1. **Otimização de workflows**
   - Reduzir tempo de execução
   - Melhorar cache
   - Paralelizar jobs quando possível

2. **Testes flaky**
   - Identificar testes instáveis
   - Adicionar retry logic
   - Melhorar setup/teardown

3. **Documentação**
   - Documentar soluções aplicadas
   - Criar runbooks para erros comuns
   - Atualizar README de workflows

### 🟢 Prioridade Baixa

1. **Monitoramento proativo**
   - Setup de alertas antecipados
   - Dashboard de métricas
   - Análise de tendências

2. **Automação**
   - Auto-fix para erros simples
   - Scripts de diagnóstico
   - Health checks preventivos

## 🛠️ Scripts Úteis

```bash
# Gerar novo relatório
bash scripts/github/collect-workflow-errors.sh 10

# Consolidar relatórios existentes
bash scripts/github/consolidate-error-reports.sh

# Monitorar em tempo real
bash scripts/github/monitor-workflows.sh 30

# Ver status atual
bash scripts/github/check-workflows.sh status

# Limpar relatórios antigos (> 30 dias)
find workflow-errors -name "*.md" -mtime +30 -delete
```

## 📚 Documentação de Referência

- **Workflows**: `.github/workflows/README.md`
- **Bundle Optimization**: `frontend/dashboard/BUNDLE-OPTIMIZATION.md`
- **Environment Config**: `docs/content/tools/security-config/env.mdx`
- **Proxy Guide**: `docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md`

---

**Gerado por:** `scripts/github/consolidate-error-reports.sh`
**Última atualização:** FINAL_TIMESTAMP

EOF

sed -i "s/FINAL_TIMESTAMP/$(date '+%Y-%m-%d %H:%M:%S')/" "$OUTPUT_FILE"

# Estatísticas finais
echo ""
echo -e "${GREEN}✅ Relatório consolidado gerado!${NC}"
echo ""
echo -e "${BLUE}📄 Arquivo: $OUTPUT_FILE${NC}"
echo ""
echo -e "${YELLOW}📊 Estatísticas:${NC}"
echo "   - Relatórios analisados: $REPORT_COUNT"
echo "   - Tamanho: $(wc -c < "$OUTPUT_FILE" | numfmt --to=iec-i)B"
echo "   - Linhas: $(wc -l < "$OUTPUT_FILE")"
echo ""

# Criar link para último consolidado
ln -sf "$(basename "$OUTPUT_FILE")" "$ERRORS_DIR/CONSOLIDATED-LATEST.md"
echo -e "${GREEN}📌 Última versão: $ERRORS_DIR/CONSOLIDATED-LATEST.md${NC}"
echo ""
echo -e "${BLUE}🌐 Abrir:${NC} code $OUTPUT_FILE"
