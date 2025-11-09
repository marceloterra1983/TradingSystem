#!/usr/bin/env bash
# ============================================
# cleanup-exposed-secrets.sh
# ============================================
# 
# Remove arquivos com segredos expostos detectados pelo TruffleHog
# Implementa POL-0002 - Política de Gerenciamento de Segredos
#
# USAGE:
#   bash scripts/governance/cleanup-exposed-secrets.sh [--dry-run]
#
# ============================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - Nenhuma alteração será feita"
fi

echo "🧹 TradingSystem - Limpeza de Secrets Expostos"
echo "Política: POL-0002 | Padrão: STD-010"
echo ""

# Criar diretório de quarentena
QUARANTINE_DIR="$PROJECT_ROOT/.quarantine-secrets-$(date +%Y%m%d-%H%M%S)"

# Arquivos críticos detectados pelo TruffleHog
CRITICAL_FILES=(
  ".env"
  "docs/archive/2025-10-27/TELEGRAM-GATEWAY-REBUILD-COMPLETE.md"
  "docs/archive/2025-10-27/TELEGRAM-POLLING-ATIVADO.md"
  "docs/archive/2025-10-27/TELEGRAM-GATEWAY-COMPLETE.md"
  "docs/archive/2025-10-27/TELEGRAM-GATEWAY-DATABASE-FIX.md"
  "docs/archive/2025-10-27/TELEGRAM-GATEWAY-FINAL.md"
  "governance/evidence/audits/trufflehog-scan.json"
)

echo "📋 Arquivos a serem processados:"
for file in "${CRITICAL_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "  ✓ $file"
  else
    echo "  ⊘ $file (não existe)"
  fi
done
echo ""

if [[ "$DRY_RUN" == true ]]; then
  echo "🔍 DRY RUN - Ações que seriam executadas:"
  echo ""
fi

# Criar quarentena
if [[ "$DRY_RUN" == false ]]; then
  mkdir -p "$QUARANTINE_DIR"
  echo "📦 Quarentena criada: $QUARANTINE_DIR"
fi

# Processar cada arquivo
REMOVED_COUNT=0
MOVED_COUNT=0

for file in "${CRITICAL_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    continue
  fi
  
  echo ""
  echo "🔧 Processando: $file"
  
  # Verificar se está rastreado no Git
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    echo "  → Arquivo rastreado no Git"
    
    if [[ "$DRY_RUN" == false ]]; then
      # Remover do Git (mantém arquivo local)
      git rm --cached "$file" >/dev/null 2>&1 || true
      echo "  ✓ Removido do Git (git rm --cached)"
      ((REMOVED_COUNT++))
    else
      echo "  [DRY RUN] git rm --cached $file"
    fi
  else
    echo "  → Arquivo não rastreado no Git"
  fi
  
  # Mover para quarentena
  if [[ "$DRY_RUN" == false ]]; then
    file_dir=$(dirname "$file")
    mkdir -p "$QUARANTINE_DIR/$file_dir"
    cp "$file" "$QUARANTINE_DIR/$file"
    echo "  ✓ Copiado para quarentena"
    ((MOVED_COUNT++))
  else
    echo "  [DRY RUN] cp $file $QUARANTINE_DIR/$file"
  fi
done

echo ""
echo "="$(printf '=%.0s' {1..79})

if [[ "$DRY_RUN" == false ]]; then
  echo "✅ LIMPEZA CONCLUÍDA"
  echo ""
  echo "Estatísticas:"
  echo "  - Arquivos removidos do Git: $REMOVED_COUNT"
  echo "  - Arquivos movidos para quarentena: $MOVED_COUNT"
  echo "  - Localização da quarentena: $QUARANTINE_DIR"
  echo ""
  echo "⚠️  PRÓXIMOS PASSOS (OBRIGATÓRIO):"
  echo "  1. REVOGAR/ROTACIONAR todos os segredos expostos"
  echo "  2. Seguir SOP: governance/controls/secrets-rotation-sop.md"
  echo "  3. Registrar incidente: governance/evidence/audits/incident-$(date +%Y-%m-%d).json"
  echo "  4. Commit das alterações:"
  echo "     git add .gitignore governance/"
  echo "     git commit -m 'chore(security): remove exposed secrets detected by TruffleHog'"
  echo ""
  echo "📁 Arquivos originais preservados em:"
  echo "   $QUARANTINE_DIR"
  echo "   (EXCLUIR após confirmar que secrets foram rotacionados)"
else
  echo "🔍 DRY RUN CONCLUÍDO - Nenhuma alteração foi feita"
  echo ""
  echo "Execute sem --dry-run para aplicar as mudanças:"
  echo "  bash scripts/governance/cleanup-exposed-secrets.sh"
fi
