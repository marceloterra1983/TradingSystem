#!/bin/bash
# Mensagem de boas-vindas do TradingSystem
# Este script exibe os ambientes virtuais disponíveis

# Cores
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🚀 ${GREEN}TradingSystem${NC} - Local Trading Platform               ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está no diretório do projeto
if [ "$PWD" = "/home/marce/projetos/TradingSystem" ] || [[ "$PWD" == /home/marce/projetos/TradingSystem/* ]]; then
    echo -e "${YELLOW}📍 Localização:${NC} $PWD"
    echo ""
    echo -e "${BLUE}🐍 Ambientes Virtuais Disponíveis:${NC}"
    echo ""
    
    # Ambiente principal
    if [ -d ".venv" ]; then
        echo -e "  ${GREEN}1.${NC} .venv               → Ambiente principal (FastAPI, APIs Backend)"
        echo -e "     ${YELLOW}Ativar:${NC} source .venv/bin/activate"
    else
        echo -e "  ${YELLOW}Nenhum ambiente virtual encontrado.${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📝 Comandos Úteis:${NC}"
    echo -e "  ${GREEN}•${NC} Ver containers:    ${YELLOW}docker ps${NC}"
    echo -e "  ${GREEN}•${NC} Ver redes:         ${YELLOW}docker network ls${NC}"
    echo -e "  ${GREEN}•${NC} Logs de serviço:   ${YELLOW}docker logs -f <container_name>${NC}"
    echo -e "  ${GREEN}•${NC} Desativar venv:    ${YELLOW}deactivate${NC}"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
fi


