#!/usr/bin/env bash
# TradingSystem - Setup direnv for auto-activation
# This script installs direnv and configures it for the project

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "🔧 TradingSystem - direnv Setup"
echo "========================================="
echo ""

# Check if direnv is already installed
if command -v direnv &> /dev/null; then
    echo -e "${GREEN}✅ direnv já está instalado!${NC}"
    echo -e "   Versão: $(direnv version)"
    echo ""
else
    echo -e "${YELLOW}📦 Instalando direnv...${NC}"
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux (Ubuntu/Debian/WSL)
        if command -v apt &> /dev/null; then
            echo "   Usando apt (Debian/Ubuntu)..."
            sudo apt update
            sudo apt install -y direnv
        elif command -v dnf &> /dev/null; then
            echo "   Usando dnf (Fedora)..."
            sudo dnf install -y direnv
        elif command -v yum &> /dev/null; then
            echo "   Usando yum (CentOS/RHEL)..."
            sudo yum install -y direnv
        else
            echo -e "${RED}❌ Gerenciador de pacotes não detectado!${NC}"
            echo "   Instale manualmente: https://direnv.net/docs/installation.html"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "   Usando Homebrew..."
            brew install direnv
        else
            echo -e "${RED}❌ Homebrew não encontrado!${NC}"
            echo "   Instale Homebrew: https://brew.sh/"
            exit 1
        fi
    else
        echo -e "${RED}❌ Sistema operacional não suportado: $OSTYPE${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ direnv instalado com sucesso!${NC}"
    echo ""
fi

# Detect shell
SHELL_NAME=$(basename "$SHELL")
SHELL_RC=""

case "$SHELL_NAME" in
    bash)
        SHELL_RC="$HOME/.bashrc"
        HOOK_CMD='eval "$(direnv hook bash)"'
        ;;
    zsh)
        SHELL_RC="$HOME/.zshrc"
        HOOK_CMD='eval "$(direnv hook zsh)"'
        ;;
    fish)
        SHELL_RC="$HOME/.config/fish/config.fish"
        HOOK_CMD='direnv hook fish | source'
        ;;
    *)
        echo -e "${RED}❌ Shell não suportado: $SHELL_NAME${NC}"
        echo "   Shells suportados: bash, zsh, fish"
        exit 1
        ;;
esac

# Check if hook is already configured
if grep -q "direnv hook" "$SHELL_RC" 2>/dev/null; then
    echo -e "${GREEN}✅ Hook do direnv já configurado em $SHELL_RC${NC}"
else
    echo -e "${YELLOW}📝 Configurando hook do direnv em $SHELL_RC...${NC}"
    
    # Backup shell config
    cp "$SHELL_RC" "$SHELL_RC.backup-$(date +%Y%m%d-%H%M%S)"
    echo "   Backup criado: $SHELL_RC.backup-*"
    
    # Add hook to shell config
    cat >> "$SHELL_RC" << EOF

# direnv - Auto-load project environments
# Added by TradingSystem setup script on $(date)
$HOOK_CMD
EOF
    
    echo -e "${GREEN}✅ Hook do direnv adicionado!${NC}"
fi

echo ""
echo "========================================="
echo "🎉 Setup concluído!"
echo "========================================="
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1️⃣  Recarregue seu shell:"
echo "    source $SHELL_RC"
echo ""
echo "2️⃣  Navegue até o projeto:"
echo "    cd $(dirname "$(dirname "$(dirname "$(readlink -f "$0")")")")"
echo ""
echo "3️⃣  Permita o .envrc (primeira vez):"
echo "    direnv allow"
echo ""
echo "4️⃣  O ambiente virtual será ativado automaticamente! 🐍"
echo ""
echo "💡 Comandos úteis:"
echo "   direnv allow       - Permitir .envrc após mudanças"
echo "   direnv reload      - Recarregar configurações"
echo "   direnv deny        - Desabilitar auto-ativação"
echo "   direnv revoke      - Revogar permissão do .envrc"
echo ""
echo "📚 Documentação: https://direnv.net/"
echo ""

