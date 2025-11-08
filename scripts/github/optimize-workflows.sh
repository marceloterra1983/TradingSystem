#!/bin/bash
# scripts/github/optimize-workflows.sh
# Remove workflows redundantes do GitHub Actions

set -e

WORKFLOWS_DIR=".github/workflows"
DISABLED_DIR="$WORKFLOWS_DIR/.disabled"

echo "🔧 Otimizando workflows do GitHub Actions..."
echo ""

# Criar pasta para workflows desabilitados
if [ ! -d "$DISABLED_DIR" ]; then
    mkdir -p "$DISABLED_DIR"
    echo "📁 Criado diretório: $DISABLED_DIR"
fi

echo ""
echo "🗑️  Removendo workflows redundantes..."
echo ""

# Função para desabilitar workflow
disable_workflow() {
    local workflow="$1"
    local reason="$2"

    if [ -f "$WORKFLOWS_DIR/$workflow" ]; then
        mv "$WORKFLOWS_DIR/$workflow" "$DISABLED_DIR/${workflow}.disabled"
        echo "✅ Desabilitado: $workflow"
        echo "   Motivo: $reason"
        echo ""
    else
        echo "⚠️  Workflow não encontrado: $workflow (já removido?)"
        echo ""
    fi
}

# 1. code-quality.yml (redundante com ci-core.yml)
disable_workflow "code-quality.yml" "Redundante com ci-core.yml (lint + type-check)"

# 2. pr-comment-on-failure.yml (redundante com pr-error-report.yml)
disable_workflow "pr-comment-on-failure.yml" "Redundante com pr-error-report.yml (mais completo)"

# 3. error-report-generator.yml (redundante com always-generate-error-report.yml)
disable_workflow "error-report-generator.yml" "Redundante com always-generate-error-report.yml"

# 4. notify-on-failure.yml (notificações externas opcionais)
disable_workflow "notify-on-failure.yml" "Notificações externas opcionais (Telegram/Discord/Slack)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Otimização completa!"
echo ""
echo "📊 Resultados:"

# Contar workflows
ACTIVE_COUNT=$(ls -1 "$WORKFLOWS_DIR"/*.yml 2>/dev/null | wc -l)
DISABLED_COUNT=$(ls -1 "$DISABLED_DIR"/*.disabled 2>/dev/null | wc -l)

echo "  - Workflows ativos: $ACTIVE_COUNT"
echo "  - Workflows desabilitados: $DISABLED_COUNT"
echo ""

# Listar workflows ativos
echo "📋 Workflows ativos:"
ls -1 "$WORKFLOWS_DIR"/*.yml 2>/dev/null | xargs -n1 basename | sed 's/^/  - /'
echo ""

# Listar workflows desabilitados
if [ $DISABLED_COUNT -gt 0 ]; then
    echo "🗃️  Workflows desabilitados:"
    ls -1 "$DISABLED_DIR"/*.disabled 2>/dev/null | xargs -n1 basename | sed 's/\.disabled$//' | sed 's/^/  - /'
    echo ""
fi

echo "💡 Para reativar um workflow desabilitado:"
echo "   mv $DISABLED_DIR/NOME.yml.disabled $WORKFLOWS_DIR/NOME.yml"
echo ""

echo "📖 Ver análise completa em:"
echo "   .github/workflows/WORKFLOW-OPTIMIZATION-ANALYSIS.md"
echo ""
