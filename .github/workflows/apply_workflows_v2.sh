#!/bin/bash
# Script para aplicar a nova arquitetura de workflows v2

set -e

echo "=================================================="
echo "Aplicando Workflows v2 - TradingSystem"
echo "=================================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -d ".github/workflows" ]; then
    echo "❌ Erro: Este script deve ser executado na raiz do repositório TradingSystem"
    exit 1
fi

echo "📦 Fazendo backup dos workflows antigos..."
mkdir -p .github/workflows_backup
cp .github/workflows/*.yml .github/workflows_backup/ 2>/dev/null || true
echo "✅ Backup criado em .github/workflows_backup/"
echo ""

echo "🗑️  Removendo workflows antigos..."
rm -f .github/workflows/*.yml
echo "✅ Workflows antigos removidos"
echo ""

echo "📥 Aplicando patch com novos workflows..."
if [ -f "0001-chore-ci-implementa-nova-arquitetura-de-workflows-v2.patch" ]; then
    git apply 0001-chore-ci-implementa-nova-arquitetura-de-workflows-v2.patch
    echo "✅ Patch aplicado com sucesso"
else
    echo "❌ Erro: Arquivo patch não encontrado"
    exit 1
fi
echo ""

echo "📊 Resumo das mudanças:"
git status --short | grep ".github/workflows"
echo ""

echo "=================================================="
echo "✅ Workflows v2 aplicados com sucesso!"
echo "=================================================="
echo ""
echo "Próximos passos:"
echo "1. Revisar as mudanças: git diff"
echo "2. Fazer commit: git add . && git commit"
echo "3. Fazer push: git push origin main"
echo ""
echo "Documentação disponível em:"
echo "- .github/WORKFLOWS_README.md"
echo "- .github/MIGRATION_GUIDE.md"
echo "- .github/COMPARISON.md"
