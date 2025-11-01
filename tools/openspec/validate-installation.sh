#!/bin/bash
#
# Validate OpenSpec Installation
# Usage: bash tools/openspec/validate-installation.sh
#

set -e

echo "🔍 Validando instalação do OpenSpec..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
CURRENT_DIR=$(pwd -P)

if [ "$CURRENT_DIR" != "$PROJECT_ROOT" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    echo "   Diretório atual: $CURRENT_DIR"
    echo "   Diretório esperado: $PROJECT_ROOT"
    exit 1
fi

echo -e "${GREEN}✅ Diretório correto${NC}"
echo ""

# Check OpenSpec directory
echo "📁 Verificando estrutura de diretórios..."

if [ -d "tools/openspec" ]; then
    echo -e "${GREEN}✅ tools/openspec/ existe${NC}"
else
    echo -e "${RED}❌ tools/openspec/ não encontrado${NC}"
    exit 1
fi

# Check for old duplicate directory
if [ -d "openspec" ]; then
    echo -e "${RED}❌ Diretório duplicado 'openspec/' ainda existe!${NC}"
    echo "   Execute: rm -rf openspec/"
    exit 1
else
    echo -e "${GREEN}✅ Sem diretórios duplicados${NC}"
fi

echo ""

# Check essential files
echo "📋 Verificando arquivos essenciais..."

check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}   ✅ $file${NC}"
        return 0
    else
        echo -e "${RED}   ❌ $file não encontrado${NC}"
        return 1
    fi
}

check_file "tools/openspec/README.md"
check_file "tools/openspec/AGENTS.md"
check_file "tools/openspec/CLAUDE.md"
check_file "tools/openspec/project.md"
check_file "tools/openspec/cli.mjs"
check_file "tools/openspec/.openspec.json"

echo ""

# Check CLI functionality
echo "🖥️  Verificando CLI do OpenSpec..."

if [ -f "tools/openspec/cli.mjs" ]; then
    echo -e "${GREEN}✅ CLI encontrado${NC}"
    
    # Test basic command
    if npm run openspec -- --help &> /dev/null; then
        echo -e "${GREEN}✅ CLI executável${NC}"
    else
        echo -e "${YELLOW}⚠️  CLI pode não estar funcionando corretamente${NC}"
    fi
else
    echo -e "${RED}❌ CLI não encontrado${NC}"
fi

echo ""

# Check specs directory
echo "📚 Verificando especificações..."

if [ -d "tools/openspec/specs" ]; then
    SPEC_COUNT=$(find tools/openspec/specs -type d -mindepth 1 -maxdepth 1 | wc -l)
    echo -e "${GREEN}✅ $SPEC_COUNT capabilities encontradas${NC}"
    
    # List top 5 specs
    if [ $SPEC_COUNT -gt 0 ]; then
        echo "   Primeiras capabilities:"
        find tools/openspec/specs -type d -mindepth 1 -maxdepth 1 | head -5 | while read dir; do
            echo "      • $(basename $dir)"
        done
    fi
else
    echo -e "${YELLOW}⚠️  Diretório specs/ não encontrado${NC}"
fi

echo ""

# Check changes directory
echo "🔄 Verificando mudanças ativas..."

if [ -d "tools/openspec/changes" ]; then
    CHANGE_COUNT=$(find tools/openspec/changes -type d -mindepth 1 -maxdepth 1 ! -name "archive" | wc -l)
    echo -e "${GREEN}✅ $CHANGE_COUNT mudanças ativas${NC}"
    
    if [ $CHANGE_COUNT -gt 0 ]; then
        echo "   Mudanças ativas:"
        find tools/openspec/changes -type d -mindepth 1 -maxdepth 1 ! -name "archive" | head -5 | while read dir; do
            echo "      • $(basename $dir)"
        done
    fi
else
    echo -e "${YELLOW}⚠️  Diretório changes/ não encontrado${NC}"
fi

echo ""

# Check proposals moved
echo "📦 Verificando proposals antigas..."

if [ -d "docs/proposals/PROP-003-rag-containerization" ]; then
    PROP_COUNT=$(find docs/proposals/PROP-003-rag-containerization -name "PROP-003-*.md" | wc -l)
    echo -e "${GREEN}✅ $PROP_COUNT proposals arquivadas em docs/proposals/${NC}"
else
    echo -e "${YELLOW}⚠️  Proposals antigas não encontradas (OK se não havia)${NC}"
fi

echo ""

# Check references in CLAUDE.md
echo "🔗 Verificando referências no projeto..."

if grep -q "@tools/openspec/AGENTS.md" CLAUDE.md; then
    echo -e "${GREEN}✅ Referência correta em CLAUDE.md${NC}"
else
    if grep -q "@/openspec/AGENTS.md" CLAUDE.md; then
        echo -e "${RED}❌ Referência antiga em CLAUDE.md (@/openspec)${NC}"
        echo "   Deveria ser: @tools/openspec/AGENTS.md"
    else
        echo -e "${YELLOW}⚠️  Referência não encontrada em CLAUDE.md${NC}"
    fi
fi

echo ""

# Summary
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✨ Validação da instalação do OpenSpec concluída!${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}💡 Próximos passos:${NC}"
echo "   1. Listar mudanças: npm run openspec -- list"
echo "   2. Listar specs: npm run openspec -- list --specs"
echo "   3. Ver detalhes: npm run openspec -- show [item]"
echo "   4. Criar nova mudança: ver tools/openspec/README.md"
echo ""
echo -e "${BLUE}📚 Documentação:${NC}"
echo "   • Guia completo: tools/openspec/README.md"
echo "   • Para IA: tools/openspec/AGENTS.md"
echo "   • Convenções: tools/openspec/project.md"
echo ""

