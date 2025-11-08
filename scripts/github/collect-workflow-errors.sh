#!/bin/bash
# Workflow Error Collector
# Coleta todos os logs de erros de workflows e gera um relatório consolidado em Markdown

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuração
OUTPUT_DIR="./workflow-errors"
OUTPUT_FILE="$OUTPUT_DIR/ERROR-REPORT-$(date +%Y%m%d-%H%M%S).md"
LIMIT="${1:-10}" # Número de workflows com falha para analisar

echo -e "${BLUE}📊 GitHub Actions Error Collector${NC}"
echo ""

# Verifica gh CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI não instalado${NC}"
    echo "Instale: sudo apt install gh"
    exit 1
fi

# Verifica autenticação
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI não está autenticado${NC}"
    echo "Execute: gh auth login"
    exit 1
fi

# Criar diretório de output
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}🔍 Coletando workflows com falhas...${NC}"

# Obter workflows com falha
FAILURES=$(gh run list --status failure --json databaseId,displayTitle,event,createdAt,headBranch,headSha,conclusion,workflowName,url --limit "$LIMIT")

if [ "$(echo "$FAILURES" | jq '. | length')" -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhuma falha encontrada!${NC}"
    exit 0
fi

FAILURE_COUNT=$(echo "$FAILURES" | jq '. | length')
echo -e "${YELLOW}📋 Encontradas ${FAILURE_COUNT} falhas${NC}"
echo ""

# Iniciar arquivo Markdown
cat > "$OUTPUT_FILE" << 'EOF'
# 🚨 GitHub Actions - Relatório de Erros

**Gerado em:** TIMESTAMP
**Repositório:** REPO_NAME
**Total de Falhas Analisadas:** FAILURE_COUNT

---

## 📊 Resumo Executivo

| Workflow | Branch | Data | Status |
|----------|--------|------|--------|
EOF

# Substituir placeholders
CURRENT_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPO_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "TradingSystem")

sed -i "s|TIMESTAMP|${CURRENT_TIMESTAMP}|" "$OUTPUT_FILE"
sed -i "s|REPO_NAME|${REPO_NAME}|" "$OUTPUT_FILE"
sed -i "s|FAILURE_COUNT|${FAILURE_COUNT}|" "$OUTPUT_FILE"

# Adicionar resumo na tabela
echo "$FAILURES" | jq -r '.[] | "| \(.displayTitle) | \(.headBranch) | \(.createdAt) | ❌ Failed |"' >> "$OUTPUT_FILE"

# Adicionar seção de detalhes
cat >> "$OUTPUT_FILE" << 'EOF'

---

## 🔍 Detalhes dos Erros

EOF

# Processar cada falha
echo "$FAILURES" | jq -c '.[]' | while IFS= read -r workflow; do
    RUN_ID=$(echo "$workflow" | jq -r '.databaseId')
    WORKFLOW_NAME=$(echo "$workflow" | jq -r '.displayTitle')
    BRANCH=$(echo "$workflow" | jq -r '.headBranch')
    SHA=$(echo "$workflow" | jq -r '.headSha')
    URL=$(echo "$workflow" | jq -r '.url')
    CREATED_AT=$(echo "$workflow" | jq -r '.createdAt')

    echo -e "${BLUE}📝 Processando: $WORKFLOW_NAME (ID: $RUN_ID)${NC}"

    # Adicionar cabeçalho do workflow
    cat >> "$OUTPUT_FILE" << EOF

### 🔴 $WORKFLOW_NAME

**Run ID:** \`$RUN_ID\`
**Branch:** \`$BRANCH\`
**Commit:** \`${SHA:0:7}\`
**Data:** $CREATED_AT
**URL:** [$RUN_ID]($URL)

#### 📋 Logs de Erro:

\`\`\`
EOF

    echo -e "${YELLOW}   Baixando logs...${NC}"
    LOG_CONTENT=$(gh run view "$RUN_ID" --log 2>/dev/null || true)

    if [ -z "$LOG_CONTENT" ]; then
        echo "Não foi possível extrair logs de erro" >> "$OUTPUT_FILE"
    else
        printf "%s\n" "$LOG_CONTENT" | \
            grep -iE "(error|failed|failure|exception|fatal|✗|❌)" | \
            head -n 100 >> "$OUTPUT_FILE"
    fi

    cat >> "$OUTPUT_FILE" << EOF
\`\`\`

#### 🔧 Comandos para Reproduzir Localmente:

\`\`\`bash
# Ver logs completos
gh run view $RUN_ID --log

# Re-executar workflow
gh run rerun $RUN_ID

# Abrir no browser
gh run view $RUN_ID --web
\`\`\`

#### 💡 Possíveis Soluções:

EOF

    # Adicionar sugestões baseadas no tipo de workflow
    case "$WORKFLOW_NAME" in
        *"Code Quality"*)
            cat >> "$OUTPUT_FILE" << 'EOF'
- Executar linting: `npm run lint -- --fix`
- Verificar TypeScript: `npm run type-check`
- Formatar código: `npm run format`
EOF
            ;;
        *"Test"*)
            cat >> "$OUTPUT_FILE" << 'EOF'
- Executar testes: `npm run test -- --verbose`
- Verificar coverage: `npm run test -- --coverage`
- Executar testes específicos: `npm run test -- --testPathPattern=<file>`
EOF
            ;;
        *"Bundle Size"*)
            cat >> "$OUTPUT_FILE" << 'EOF'
- Verificar tamanho: `npm run check:bundle:size`
- Analisar bundle: `npm run analyze:bundle`
- Ver otimizações: `cat BUNDLE-OPTIMIZATION.md`
EOF
            ;;
        *"Docker"*)
            cat >> "$OUTPUT_FILE" << 'EOF'
- Testar build: `docker build -t test .`
- Scan vulnerabilidades: `trivy image test`
- Validar compose: `docker compose config`
EOF
            ;;
        *"Security"*)
            cat >> "$OUTPUT_FILE" << 'EOF'
- NPM audit: `npm audit fix`
- Verificar secrets: `git secrets --scan`
- Python Safety: `safety check`
EOF
            ;;
        *"Documentation"*)
            cat >> "$OUTPUT_FILE" << 'EOF'
- Build Docusaurus: `cd docs && npm run build`
- Validar frontmatter: `bash scripts/governance/validate-frontmatter.sh`
- Regenerar governance: `node governance/automation/governance-metrics.mjs`
EOF
            ;;
        *"Environment"*)
            cat >> "$OUTPUT_FILE" << 'EOF'
- Validar .env: `bash scripts/env/validate-env.sh`
- Verificar proxy config: Remover prefixo `VITE_` de proxy targets
- Checar localhost URLs: Usar paths relativos em vez de URLs absolutas
EOF
            ;;
        *)
            cat >> "$OUTPUT_FILE" << 'EOF'
- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`
EOF
            ;;
    esac

    cat >> "$OUTPUT_FILE" << 'EOF'

---

EOF

done

# Adicionar rodapé
cat >> "$OUTPUT_FILE" << 'EOF'

## 📚 Recursos Úteis

- **Workflows README**: `.github/workflows/README.md`
- **Bundle Optimization**: `frontend/dashboard/BUNDLE-OPTIMIZATION.md`
- **Environment Guide**: `docs/content/tools/security-config/env.mdx`
- **Proxy Best Practices**: `docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md`

## 🛠️ Scripts de Diagnóstico

```bash
# Monitorar workflows em tempo real
bash scripts/github/monitor-workflows.sh 30

# Ver status atual
bash scripts/github/check-workflows.sh status

# Listar apenas falhas
bash scripts/github/check-workflows.sh failures

# Download de artifacts
bash scripts/github/check-workflows.sh download <run-id>
```

## 🔄 Fluxo de Correção Recomendado

1. **Identificar** - Ler este relatório
2. **Reproduzir** - Executar comandos localmente
3. **Corrigir** - Aplicar soluções sugeridas
4. **Validar** - Rodar testes antes de commit
5. **Commit** - Fazer push das correções
6. **Verificar** - Acompanhar novo workflow

---

**Gerado por:** `scripts/github/collect-workflow-errors.sh`
**Próxima coleta:** Execute novamente o script para atualizar

EOF

echo ""
echo -e "${GREEN}✅ Relatório gerado com sucesso!${NC}"
echo ""
echo -e "${BLUE}📄 Arquivo: $OUTPUT_FILE${NC}"
echo ""
echo -e "${YELLOW}📊 Estatísticas:${NC}"
echo "   - Total de falhas: $FAILURE_COUNT"
echo "   - Tamanho do arquivo: $(wc -c < "$OUTPUT_FILE" | numfmt --to=iec-i)B"
echo "   - Linhas: $(wc -l < "$OUTPUT_FILE")"
echo ""
echo -e "${BLUE}🔗 Ver relatório:${NC}"
echo "   cat $OUTPUT_FILE"
echo ""
echo -e "${BLUE}🌐 Abrir no editor:${NC}"
echo "   code $OUTPUT_FILE"
echo ""

# REMOVED: Symlink creation causes "File name too long" errors in workflows
# Reports are accessible directly via timestamped files or GitHub Artifacts
echo -e "${GREEN}📌 Relatório disponível em: $OUTPUT_FILE${NC}"
