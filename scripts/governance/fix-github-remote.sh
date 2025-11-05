#!/usr/bin/env bash
# ============================================
# fix-github-remote.sh
# ============================================
# 
# Remove token exposto da URL do remote do Git
# e configura autenticação via SSH (mais seguro)
#
# USAGE:
#   bash scripts/governance/fix-github-remote.sh
#
# ============================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔧 TradingSystem - Limpeza de Token GitHub Exposto"
echo "Política: POL-0002 | Padrão: STD-010"
echo ""

# Verificar URL atual
echo "📋 URL atual do remote 'origin':"
git remote get-url origin
echo ""

# Perguntar confirmação
echo "⚠️  ATENÇÃO: Este script irá:"
echo "  1. Remover o token da URL do remote"
echo "  2. Configurar autenticação via SSH (recomendado)"
echo ""
echo "Você JÁ REVOGOU o token no GitHub? (https://github.com/settings/tokens)"
read -p "Digite 'sim' para continuar: " confirm

if [[ "$confirm" != "sim" ]]; then
  echo "❌ Operação cancelada. Revogue o token primeiro!"
  exit 1
fi

echo ""
echo "🔄 Atualizando remote para SSH..."

# Alterar para SSH
git remote set-url origin git@github.com:marceloterra1983/TradingSystem.git

echo "✅ Remote atualizado com sucesso!"
echo ""

# Verificar nova URL
echo "📋 Nova URL do remote 'origin':"
git remote get-url origin
echo ""

# Verificar se há token em .git/config
if grep -q "ghp_" .git/config 2>/dev/null; then
  echo "⚠️  Token ainda detectado em .git/config"
  echo "Limpando..."
  
  # Backup do config
  cp .git/config .git/config.backup
  
  # Remover linhas com token (sed)
  sed -i.bak '/ghp_/d' .git/config
  
  echo "✅ Token removido de .git/config"
  echo "   Backup salvo em: .git/config.backup"
else
  echo "✅ Nenhum token detectado em .git/config"
fi

echo ""
echo "🔐 Configurando SSH (se necessário)..."
echo ""
echo "Se você ainda não tem chave SSH configurada:"
echo "  1. Gerar chave: ssh-keygen -t ed25519 -C 'your_email@example.com'"
echo "  2. Adicionar ao ssh-agent: ssh-add ~/.ssh/id_ed25519"
echo "  3. Copiar chave pública: cat ~/.ssh/id_ed25519.pub"
echo "  4. Adicionar no GitHub: https://github.com/settings/keys"
echo ""
echo "Testar conexão SSH:"
echo "  ssh -T git@github.com"
echo ""

echo "✅ CONCLUÍDO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "  1. Registrar incidente de exposição de token"
echo "  2. Commit das correções de governança"
echo "  3. Push para o repositório (via SSH agora)"

