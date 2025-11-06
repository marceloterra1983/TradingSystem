#!/usr/bin/env bash
# scripts/setup/install-github-cli.sh
# Instala e configura o GitHub CLI (gh)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Instalando GitHub CLI (gh)...${NC}"
echo ""

# Detectar sistema operacional
if [[ -f /etc/os-release ]]; then
  source /etc/os-release
  OS=$ID
else
  echo -e "${RED}❌ Não foi possível detectar o sistema operacional${NC}"
  exit 1
fi

# Verificar se já está instalado
if command -v gh &> /dev/null; then
  echo -e "${GREEN}✅ GitHub CLI já está instalado!${NC}"
  gh --version
  echo ""
  
  # Verificar autenticação
  if gh auth status &> /dev/null; then
    echo -e "${GREEN}✅ GitHub CLI já está autenticado!${NC}"
    gh auth status
    exit 0
  else
    echo -e "${YELLOW}⚠️  GitHub CLI não está autenticado${NC}"
    echo ""
    echo "Execute:"
    echo "  gh auth login"
    exit 0
  fi
fi

# Instalação baseada no SO
case "$OS" in
  ubuntu|debian)
    echo -e "${BLUE}📦 Instalando via apt (Ubuntu/Debian)...${NC}"
    
    # Adicionar repositório oficial do GitHub
    type -p curl >/dev/null || sudo apt install curl -y
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    
    sudo apt update
    sudo apt install gh -y
    ;;
    
  fedora|rhel|centos)
    echo -e "${BLUE}📦 Instalando via dnf (Fedora/RHEL/CentOS)...${NC}"
    sudo dnf install 'dnf-command(config-manager)'
    sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
    sudo dnf install gh -y
    ;;
    
  arch|manjaro)
    echo -e "${BLUE}📦 Instalando via pacman (Arch/Manjaro)...${NC}"
    sudo pacman -S github-cli --noconfirm
    ;;
    
  *)
    echo -e "${YELLOW}⚠️  Sistema operacional não suportado automaticamente: $OS${NC}"
    echo ""
    echo "Instale manualmente:"
    echo "  - macOS: brew install gh"
    echo "  - Windows: scoop install gh"
    echo "  - Ou veja: https://github.com/cli/cli#installation"
    exit 1
    ;;
esac

# Verificar instalação
if command -v gh &> /dev/null; then
  echo ""
  echo -e "${GREEN}✅ GitHub CLI instalado com sucesso!${NC}"
  gh --version
  echo ""
  
  echo -e "${BLUE}🔐 Agora você precisa autenticar...${NC}"
  echo ""
  echo "Execute:"
  echo "  gh auth login"
  echo ""
  echo "Escolha:"
  echo "  - GitHub.com"
  echo "  - HTTPS"
  echo "  - Login via browser (mais fácil)"
  echo ""
  
  # Perguntar se quer autenticar agora
  read -p "Deseja autenticar agora? (s/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Ss]$ ]]; then
    gh auth login
  fi
else
  echo -e "${RED}❌ Falha na instalação${NC}"
  exit 1
fi

