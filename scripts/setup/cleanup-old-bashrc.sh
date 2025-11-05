#!/usr/bin/env bash
# Cleanup old .bashrc auto-activation code
# This removes the old venv activation logic that conflicts with direnv

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "🧹 Cleanup Old .bashrc Auto-Activation"
echo "========================================="
echo ""

BASHRC="$HOME/.bashrc"

# Backup first
BACKUP="$BASHRC.backup-$(date +%Y%m%d-%H%M%S)"
echo -e "${YELLOW}📦 Creating backup...${NC}"
cp "$BASHRC" "$BACKUP"
echo -e "${GREEN}✅ Backup created: $BACKUP${NC}"
echo ""

# Check what we're removing
echo -e "${YELLOW}🔍 Código antigo encontrado:${NC}"
echo ""
grep -n "Ambiente virtual ativado automaticamente\|Auto-cd to TradingSystem" "$BASHRC" || true
echo ""

# Ask for confirmation
read -p "Remover código antigo de ativação do venv do ~/.bashrc? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Cancelado pelo usuário${NC}"
    exit 0
fi

# Remove old venv activation block
echo -e "${YELLOW}🗑️  Removendo código antigo...${NC}"

# Create temp file without old activation code
sed -i.tmp '/# Auto-activate venv if in TradingSystem/,/fi$/d' "$BASHRC" 2>/dev/null || true
sed -i.tmp '/# Ativação automática do venv/,/^fi$/d' "$BASHRC" 2>/dev/null || true
sed -i.tmp '/# Auto-cd to TradingSystem project folder/d' "$BASHRC" 2>/dev/null || true
sed -i.tmp '/^cd \/home\/marce\/Projetos\/TradingSystem$/d' "$BASHRC" 2>/dev/null || true

# Remove temp files
rm -f "$BASHRC.tmp" 2>/dev/null || true

echo -e "${GREEN}✅ Código antigo removido!${NC}"
echo ""

echo "========================================="
echo "✅ Limpeza concluída!"
echo "========================================="
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1️⃣  Recarregar shell:"
echo "    source ~/.bashrc"
echo ""
echo "2️⃣  Permitir .envrc:"
echo "    direnv allow"
echo ""
echo "3️⃣  Testar navegação:"
echo "    cd .. && cd ~/Projetos/TradingSystem"
echo ""
echo "💡 Agora apenas o direnv gerenciará a ativação do venv!"
echo ""
echo "🔙 Para restaurar (se necessário):"
echo "    cp $BACKUP ~/.bashrc"
echo ""

