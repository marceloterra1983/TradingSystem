#!/bin/bash
# Script de validação rápida de links em documentação de onboarding
# Uso: bash scripts/docs/validate-links.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ONBOARDING_DIR="$PROJECT_ROOT/docs/context/ops/onboarding"
ERRORS=0

echo "🔍 Validando links em documentação de onboarding..."
echo ""

# Função para verificar se arquivo existe
check_file() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        echo "✅ $description"
    else
        echo "❌ $description - ARQUIVO NÃO ENCONTRADO: $file"
        ((ERRORS++))
    fi
}

# Verificar arquivos principais de onboarding
echo "📁 Verificando arquivos principais..."
check_file "$ONBOARDING_DIR/QUICK-START-LINUX-WSL.md" "QUICK-START-LINUX-WSL.md"
check_file "$ONBOARDING_DIR/SYSTEM-OVERVIEW.md" "SYSTEM-OVERVIEW.md"
check_file "$ONBOARDING_DIR/START-SERVICES.md" "START-SERVICES.md"
check_file "$ONBOARDING_DIR/GUIA-INICIO-DEFINITIVO.md" "GUIA-INICIO-DEFINITIVO.md"
echo ""

# Verificar arquivo de configuração de ambiente
echo "⚙️  Verificando arquivos de configuração..."
check_file "$PROJECT_ROOT/docs/context/ops/ENVIRONMENT-CONFIGURATION.md" "ENVIRONMENT-CONFIGURATION.md"
check_file "$PROJECT_ROOT/ENV-RULES.md" "ENV-RULES.md (root)"
check_file "$PROJECT_ROOT/CONTRIBUTING.md" "CONTRIBUTING.md (root)"
echo ""

# Verificar âncora no README.md
echo "🔗 Verificando âncoras no README.md..."
HTML_ANCHOR_FOUND=$(grep -q '<a id="quick-start-linux--wsl"></a>' "$PROJECT_ROOT/README.md" && echo "true" || echo "false")
MARKDOWN_HEADER_FOUND=$(grep -q '### Quick Start (Linux/WSL)' "$PROJECT_ROOT/README.md" && echo "true" || echo "false")

if [ "$HTML_ANCHOR_FOUND" = "true" ] || [ "$MARKDOWN_HEADER_FOUND" = "true" ]; then
    if [ "$HTML_ANCHOR_FOUND" = "true" ]; then
        echo "✅ Âncora HTML #quick-start-linux--wsl existe no README.md"
    else
        echo "✅ Cabeçalho Markdown '### Quick Start (Linux/WSL)' encontrado no README.md"
    fi
else
    echo "❌ Âncora #quick-start-linux--wsl NÃO ENCONTRADA no README.md"
    echo "   (Nem <a id=\"quick-start-linux--wsl\"> nem ### Quick Start (Linux/WSL) encontrados)"
    ((ERRORS++))
fi
echo ""

# Verificar que arquivos de onboarding NÃO referenciam README.md#quick-start
echo "🔍 Verificando ausência de links para README.md#quick-start..."
if grep -r "README.md#quick-start" "$ONBOARDING_DIR/" 2>/dev/null; then
    echo "⚠️  AVISO: Encontrados links para README.md#quick-start (devem usar arquivo local)"
    ((ERRORS++))
else
    echo "✅ Nenhum link para README.md#quick-start encontrado (correto)"
fi
echo ""

# Resultado final
if [ $ERRORS -eq 0 ]; then
    echo "✅ Validação concluída com sucesso! Todos os links estão corretos."
    exit 0
else
    echo "❌ Validação falhou com $ERRORS erro(s)."
    exit 1
fi
