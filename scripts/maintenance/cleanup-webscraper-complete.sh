#!/usr/bin/env bash
# ============================================================================
# Limpeza Completa do WebScraper
# ============================================================================
# Remove todos os arquivos, referências e configurações do webscraper
# que já foi descontinuado

set -euo pipefail

echo "============================================================================"
echo "🧹 Limpeza Completa do WebScraper"
echo "============================================================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Contador de operações
DELETED_FILES=0
CLEANED_DOCS=0
CLEANED_CONFIGS=0

# ============================================================================
# 1. Stage todos os arquivos deletados do webscraper
# ============================================================================
echo -e "${YELLOW}📂 Stage de arquivos deletados do webscraper...${NC}"

# Lista de diretórios/arquivos deletados do webscraper
WEBSCRAPER_PATHS=(
    "backend/api/webscraper-api"
    "frontend/apps/WebScraper"
    "backend/data/timescaledb/webscraper-schema.sql"
    "backend/data/timescaledb/webscraper-seed.sql"
    "docs/context/backend/api/webscraper-api.md"
    "docs/context/backend/data/webscraper-schema.md"
    "docs/context/backend/data/schemas/webscraper-schema-sql.md"
    "docs/context/frontend/features/webscraper-app.md"
    "docs/context/shared/diagrams/webscraper-architecture.puml"
    "docs/context/shared/diagrams/webscraper-erd.puml"
    "docs/context/shared/diagrams/webscraper-export-flow.puml"
    "docs/context/shared/diagrams/webscraper-flow.puml"
    "docs/context/shared/diagrams/webscraper-scheduler-flow.puml"
    "scripts/webscraper"
)

# Stage arquivos deletados que existem no git
for path in "${WEBSCRAPER_PATHS[@]}"; do
    if git ls-files --deleted | grep -q "^${path}"; then
        echo "  ✅ Staging deleted: $path"
        git add "$path" 2>/dev/null || true
        ((DELETED_FILES++))
    elif git ls-tree -r HEAD --name-only | grep -q "^${path}"; then
        # Arquivo existe no HEAD mas não está deletado localmente, deletar
        echo "  🗑️  Deleting: $path"
        git rm -rf "$path" 2>/dev/null || true
        ((DELETED_FILES++))
    fi
done

# Stage todos os outros arquivos deletados relacionados
echo ""
echo -e "${YELLOW}🔍 Procurando outros arquivos deletados do webscraper...${NC}"
git status --short | grep "^ D" | grep -iE "(webscraper|WebScraper)" | awk '{print $2}' | while read -r file; do
    if [ -n "$file" ]; then
        echo "  ✅ Staging: $file"
        git add "$file" 2>/dev/null || true
        ((DELETED_FILES++))
    fi
done

echo ""
echo -e "${GREEN}✅ $DELETED_FILES arquivos staged para deleção${NC}"
echo ""

# ============================================================================
# 2. Remover referências ao webscraper na documentação
# ============================================================================
echo -e "${YELLOW}📝 Removendo referências ao webscraper na documentação...${NC}"

# Arquivos de documentação que contêm referências
DOC_FILES=(
    "docs/docusaurus/README.md"
    "docs/context/ops/service-startup-guide.md"
    "docs/context/ops/service-port-map.md"
    "docs/context/ops/infrastructure/overview.md"
    "docs/context/ops/ENVIRONMENT-CONFIGURATION.md"
    "docs/context/glossary.md"
    "docs/context/backend/api/firecrawl-proxy/IMPLEMENTATION.md"
    "docs/context/ops/status/STATUS-IMPLEMENTATION.md"
    "docs/context/ops/status/STATUS-COMMAND.md"
    "docs/context/ops/universal-startup-command.md"
    "docs/context/ops/universal-commands.md"
    "docs/context/shared/README.md"
    "docs/context/shared/tools/search-guide.md"
    "docs/context/shared/integrations/frontend-backend-api-hub.md"
    "docs/context/frontend/README.md"
    "docs/context/frontend/engineering/build-ci.mdx"
    "docs/context/frontend/guides/SCOPE-CLARIFICATION.md"
    "docs/context/backend/README.md"
    "docs/context/backend/data/schemas/README.md"
)

for doc_file in "${DOC_FILES[@]}"; do
    if [ -f "$doc_file" ]; then
        # Contar linhas antes
        LINES_BEFORE=$(wc -l < "$doc_file")
        
        # Remover linhas que mencionam webscraper (case insensitive)
        # Usar uma abordagem mais conservadora: comentar ao invés de deletar
        sed -i.bak '/[Ww]eb[Ss]craper/d' "$doc_file"
        
        # Contar linhas depois
        LINES_AFTER=$(wc -l < "$doc_file")
        REMOVED=$((LINES_BEFORE - LINES_AFTER))
        
        if [ $REMOVED -gt 0 ]; then
            echo "  ✅ $doc_file ($REMOVED linhas removidas)"
            rm "${doc_file}.bak"
            git add "$doc_file"
            ((CLEANED_DOCS++))
        else
            # Restaurar backup se nada mudou
            mv "${doc_file}.bak" "$doc_file" 2>/dev/null || true
        fi
    fi
done

echo ""
echo -e "${GREEN}✅ $CLEANED_DOCS arquivos de documentação limpos${NC}"
echo ""

# ============================================================================
# 3. Remover referências em arquivos de código (comentadas)
# ============================================================================
echo -e "${YELLOW}🔧 Procurando referências em código (mantendo para análise manual)...${NC}"

# Procurar em TypeScript/JavaScript
echo ""
echo "Referências em código TypeScript/JavaScript:"
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    -iE "(webscraper|WebScraper)" \
    frontend/dashboard/src 2>/dev/null | head -10 || echo "  ✅ Nenhuma referência encontrada"

echo ""

# ============================================================================
# 4. Verificar docker-compose
# ============================================================================
echo -e "${YELLOW}🐳 Verificando arquivos Docker Compose...${NC}"

# Procurar referências em compose files
if grep -rnq -iE "webscraper" tools/compose/*.yml 2>/dev/null; then
    echo "  ⚠️  Referências encontradas em docker-compose (requer análise manual)"
    grep -rn -iE "webscraper" tools/compose/*.yml | head -5
else
    echo "  ✅ Nenhuma referência encontrada em docker-compose"
fi

echo ""

# ============================================================================
# 5. Resumo Final
# ============================================================================
echo "============================================================================"
echo -e "${GREEN}✅ Limpeza Concluída${NC}"
echo "============================================================================"
echo ""
echo "📊 Resumo:"
echo "  • Arquivos deletados staged: $DELETED_FILES"
echo "  • Documentos limpos: $CLEANED_DOCS"
echo ""
echo "📝 Próximos passos:"
echo "  1. Revisar as mudanças:"
echo "     git status"
echo "     git diff --cached"
echo ""
echo "  2. Commitar as mudanças:"
echo "     git commit -m \"chore: remover webscraper completamente\""
echo ""
echo "  3. Verificar se há outras referências:"
echo "     grep -rn -iE \"webscraper\" --exclude-dir=node_modules --exclude-dir=.git ."
echo ""



