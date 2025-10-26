#!/bin/bash

# Script para visualizar o tema Gemini CLI no Docusaurus
# Uso: bash scripts/preview-theme.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                                            ║${NC}"
echo -e "${PURPLE}║  🎨  TEMA GEMINI CLI - DOCUSAURUS TRADINGSYSTEM  🎨      ║${NC}"
echo -e "${PURPLE}║                                                            ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está no diretório correto
if [ ! -f "$DOCS_DIR/package.json" ]; then
    echo -e "${RED}❌ Erro: package.json não encontrado!${NC}"
    echo -e "${YELLOW}📂 Navegue para: /home/marce/projetos/TradingSystem/docs/docusaurus${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Diretório correto: $DOCS_DIR${NC}"
echo ""

# Verificar Node.js
echo -e "${BLUE}🔍 Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado!${NC}"
    echo -e "${YELLOW}💡 Instale Node.js 20+: https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js instalado: $NODE_VERSION${NC}"
echo ""

# Verificar npm
echo -e "${BLUE}🔍 Verificando npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não encontrado!${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm instalado: $NPM_VERSION${NC}"
echo ""

# Verificar node_modules
echo -e "${BLUE}🔍 Verificando dependências...${NC}"
if [ ! -d "$DOCS_DIR/node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules não encontrado${NC}"
    echo -e "${BLUE}📦 Instalando dependências...${NC}"
    cd "$DOCS_DIR"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependências instaladas com sucesso!${NC}"
    else
        echo -e "${RED}❌ Erro ao instalar dependências${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Dependências já instaladas${NC}"
fi
echo ""

# Verificar custom.css
echo -e "${BLUE}🔍 Verificando tema Gemini CLI...${NC}"
CUSTOM_CSS="$DOCS_DIR/src/css/custom.css"
if [ ! -f "$CUSTOM_CSS" ]; then
    echo -e "${RED}❌ custom.css não encontrado!${NC}"
    exit 1
fi

CSS_LINES=$(wc -l < "$CUSTOM_CSS")
echo -e "${GREEN}✅ custom.css encontrado ($CSS_LINES linhas)${NC}"

# Verificar se tem as cores corretas
if grep -q "#0f1419" "$CUSTOM_CSS" && grep -q "#8e24aa" "$CUSTOM_CSS"; then
    echo -e "${GREEN}✅ Cores Gemini CLI detectadas!${NC}"
    echo -e "   ${PURPLE}• Background dark: #0f1419${NC}"
    echo -e "   ${PURPLE}• Active item: #8e24aa${NC}"
else
    echo -e "${YELLOW}⚠️  Cores Gemini CLI não detectadas${NC}"
fi
echo ""

# Verificar porta disponível
echo -e "${BLUE}🔍 Verificando porta 3004...${NC}"
if lsof -Pi :3004 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Porta 3004 já está em uso${NC}"
    echo -e "${BLUE}💡 Você pode usar outra porta com: npm run start -- --port 3005${NC}"
    PORT_TO_USE=3005
else
    echo -e "${GREEN}✅ Porta 3004 disponível${NC}"
    PORT_TO_USE=3004
fi
echo ""

# Criar diretório static/spec se não existir
echo -e "${BLUE}🔍 Verificando diretório static/spec...${NC}"
SPEC_DIR="$DOCS_DIR/static/spec"
if [ ! -d "$SPEC_DIR" ]; then
    echo -e "${YELLOW}⚠️  Criando diretório static/spec...${NC}"
    mkdir -p "$SPEC_DIR"
fi
echo -e "${GREEN}✅ Diretório static/spec pronto${NC}"
echo ""

# Resumo antes de iniciar
echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                    RESUMO DO TEMA                          ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🎨 Tema:${NC} Gemini CLI (100% match)"
echo -e "${BLUE}🌑 Dark Mode:${NC}"
echo -e "   • Background: ${PURPLE}#0f1419${NC} (ultra dark)"
echo -e "   • Sidebar: ${PURPLE}#0a0e17${NC} (ainda mais dark)"
echo -e "   • Active: ${PURPLE}#8e24aa${NC} (roxo/magenta)"
echo -e "   • Primary: ${PURPLE}#8ab4f8${NC} (azul claro)"
echo ""
echo -e "${BLUE}🔤 Typography:${NC} Inter (Google Fonts)"
echo -e "${BLUE}📐 Layout:${NC} Navbar + Sidebar + Content + TOC"
echo -e "${BLUE}🌐 Porta:${NC} $PORT_TO_USE"
echo ""

# Perguntar se quer iniciar
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Pronto para iniciar o Docusaurus!${NC}"
echo ""
read -p "$(echo -e ${BLUE}Deseja iniciar o servidor agora? [Y/n]: ${NC})" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo ""
    echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                  INICIANDO DOCUSAURUS                      ║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}🚀 Iniciando servidor na porta $PORT_TO_USE...${NC}"
    echo -e "${BLUE}📖 Acesse: http://localhost:$PORT_TO_USE${NC}"
    echo ""
    echo -e "${YELLOW}💡 Dicas:${NC}"
    echo -e "   • Pressione ${GREEN}Ctrl+C${NC} para parar o servidor"
    echo -e "   • O navegador abrirá automaticamente"
    echo -e "   • Teste o toggle dark/light (canto superior direito)"
    echo ""
    echo -e "${PURPLE}════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    cd "$DOCS_DIR"
    npm run start -- --port "$PORT_TO_USE"
else
    echo ""
    echo -e "${YELLOW}ℹ️  Servidor não iniciado${NC}"
    echo -e "${BLUE}💡 Para iniciar manualmente:${NC}"
    echo -e "   ${GREEN}cd $DOCS_DIR${NC}"
    echo -e "   ${GREEN}npm run start -- --port $PORT_TO_USE${NC}"
    echo ""
fi



