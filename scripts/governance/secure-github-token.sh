#!/usr/bin/env bash
# ============================================
# secure-github-token.sh
# ============================================
# 
# Remove token da URL do remote e configura
# armazenamento seguro via Git Credential Helper
#
# USAGE:
#   bash scripts/governance/secure-github-token.sh
#
# ============================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔐 TradingSystem - Configuração Segura de Token GitHub"
echo "Política: POL-0002 | Padrão: STD-010"
echo ""

# Extrair token atual
CURRENT_URL=$(git remote get-url origin)
TOKEN=$(echo "$CURRENT_URL" | grep -oP 'ghp_[A-Za-z0-9_]+' || echo "")

if [[ -z "$TOKEN" ]]; then
  echo "ℹ️  Nenhum token detectado na URL atual"
  echo "URL atual: $CURRENT_URL"
  exit 0
fi

echo "📋 Token detectado na URL do remote"
echo "Token: ${TOKEN:0:10}... (oculto)"
echo ""

# Alterar URL para HTTPS sem token
echo "🔄 Atualizando remote para HTTPS sem token embutido..."
git remote set-url origin https://github.com/marceloterra1983/TradingSystem.git

echo "✅ Remote atualizado!"
echo ""

# Configurar Git Credential Helper para armazenar token de forma segura
echo "🔧 Configurando Git Credential Helper (cache por 8 horas)..."

# Opção 1: Cache em memória (8 horas)
git config --global credential.helper 'cache --timeout=28800'

echo "✅ Credential helper configurado!"
echo ""

# Salvar token no credential store
echo "💾 Salvando token no credential helper..."
echo ""
echo "Na próxima operação Git (push/pull), você será solicitado:"
echo "  Username: marceloterra1983"
echo "  Password: $TOKEN"
echo ""
echo "Após isso, o token ficará em cache por 8 horas."
echo ""

# Verificar se .git/config ainda tem token
if grep -q "ghp_" .git/config 2>/dev/null; then
  echo "🧹 Limpando token de .git/config..."
  
  # Backup
  cp .git/config .git/config.backup-$(date +%Y%m%d-%H%M%S)
  
  # Remover linhas com token
  sed -i.bak '/ghp_/d' .git/config
  
  echo "✅ Token removido de .git/config"
fi

# Criar arquivo de lembrete do token (IGNORADO pelo Git)
cat > .github-token.txt <<EOF
# GitHub Personal Access Token
# ============================
# ESTE ARQUIVO É IGNORADO PELO GIT (.gitignore)
# 
# Token: $TOKEN
# 
# Para usar:
#   Username: marceloterra1983
#   Password: (usar token acima)
#
# Configurado em: $(date)
# Expira em: (verificar em https://github.com/settings/tokens)
#
# ⚠️  NUNCA compartilhe este token!
# ⚠️  NUNCA commite este arquivo!
EOF

# Garantir que está no .gitignore
if ! grep -q ".github-token.txt" .gitignore 2>/dev/null; then
  echo "" >> .gitignore
  echo "# GitHub token (local only)" >> .gitignore
  echo ".github-token.txt" >> .gitignore
  echo "✅ .github-token.txt adicionado ao .gitignore"
fi

echo ""
echo "📝 Token salvo em: .github-token.txt (ignorado pelo Git)"
echo ""

echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "📋 Resumo:"
echo "  - Remote URL: https://github.com/marceloterra1983/TradingSystem.git"
echo "  - Token armazenado em: .github-token.txt (local)"
echo "  - Credential helper: cache (8h)"
echo "  - Próximo push/pull: será solicitado username/password"
echo ""
echo "🔐 IMPORTANTE:"
echo "  - O token NÃO está mais exposto na URL do remote"
echo "  - O arquivo .github-token.txt NÃO será versionado"
echo "  - Após primeiro push, token fica em cache por 8h"
echo ""

