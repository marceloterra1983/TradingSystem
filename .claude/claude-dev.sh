#!/bin/bash
#
# Claude Code - Development Mode (Full Permissions)
#
# Este script inicia o Claude Code com permissões completas para desenvolvimento.
# ⚠️  ATENÇÃO: Use apenas em ambientes de desenvolvimento confiáveis!
#

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀  Claude Code - Development Mode (Full Permissions)  🚀  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verificar se está no diretório do projeto
PROJECT_ROOT="/home/marce/projetos/TradingSystem"
if [ "$(pwd)" != "$PROJECT_ROOT" ]; then
    echo -e "${YELLOW}⚠️  Navegando para o diretório do projeto...${NC}"
    cd "$PROJECT_ROOT"
fi

# Verificar se Claude Code está instalado
if ! command -v claude &> /dev/null; then
    echo -e "${RED}❌ Erro: Claude Code não está instalado!${NC}"
    echo -e "${YELLOW}Execute: npm install -g @anthropic-ai/claude-code${NC}"
    exit 1
fi

# Verificar autenticação
echo -e "${BLUE}🔐 Verificando autenticação...${NC}"
if ! claude --print "test" &> /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Autenticação necessária. Iniciando flow...${NC}"
    claude
    exit 0
fi

# Avisos de segurança
echo -e "${YELLOW}"
cat << 'EOF'
⚠️  MODO DE DESENVOLVIMENTO ATIVO

Este modo concede PERMISSÕES COMPLETAS ao Claude Code:
  ✓ Executar comandos bash sem confirmação
  ✓ Ler/escrever arquivos sem confirmação
  ✓ Modificar código sem confirmação
  ✓ Acessar internet sem confirmação
  ✓ Executar scripts sem confirmação

📋 RECOMENDAÇÕES:
  • Use apenas em ambiente de desenvolvimento local
  • NÃO use com dados sensíveis ou produção
  • Sempre revise as alterações antes de commit
  • Tenha backup do código (Git)

EOF
echo -e "${NC}"

# Confirmar se deseja continuar
read -p "Deseja continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${RED}❌ Cancelado pelo usuário.${NC}"
    exit 0
fi

# Exibir configurações ativas
echo -e "${GREEN}"
cat << 'EOF'
✅ CONFIGURAÇÕES ATIVAS:
  • Permission Mode: bypassPermissions
  • Skip Permissions: true
  • Auto-approve Tools: 12 tools enabled
  • Allowed Directories: /home/marce/projetos/TradingSystem
  • MCP Servers: 7 configured
  • Custom Commands: 5 available

EOF
echo -e "${NC}"

# Iniciar Claude Code com flags apropriados
echo -e "${BLUE}🚀 Iniciando Claude Code em modo de desenvolvimento...${NC}"
echo

# Opções:
# --dangerously-skip-permissions: Pula todos os checks de permissão
# --permission-mode bypassPermissions: Usa modo bypass configurado
# --verbose: Mais detalhes (opcional)

claude --dangerously-skip-permissions "$@"

# Mensagem de saída
echo
echo -e "${GREEN}✅ Sessão Claude Code encerrada.${NC}"







