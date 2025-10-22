#!/bin/bash

# =============================================================================
# Copy Terminal Output - Copia comando + saída do terminal
# =============================================================================
# Uso:
#   copyout              - Copia último comando + saída (últimas 50 linhas)
#   copyout 100          - Copia último comando + últimas 100 linhas
#   copyout "comando"    - Executa comando e copia resultado
#   copyout --all        - Copia todo o histórico da sessão
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para copiar para clipboard (WSL + Linux)
copy_to_clipboard() {
    local content="$1"
    
    # Tentar clip.exe (WSL)
    if command -v clip.exe &> /dev/null; then
        echo -n "$content" | clip.exe
        return 0
    fi
    
    # Tentar xclip (Linux)
    if command -v xclip &> /dev/null; then
        echo -n "$content" | xclip -selection clipboard
        return 0
    fi
    
    # Tentar wl-copy (Wayland)
    if command -v wl-copy &> /dev/null; then
        echo -n "$content" | wl-copy
        return 0
    fi
    
    # Tentar pbcopy (macOS)
    if command -v pbcopy &> /dev/null; then
        echo -n "$content" | pbcopy
        return 0
    fi
    
    echo -e "${RED}❌ Erro: Nenhum comando de clipboard encontrado!${NC}"
    echo -e "${YELLOW}Instale: clip.exe (WSL) ou xclip (Linux) ou wl-clipboard (Wayland)${NC}"
    return 1
}

# Função para obter último comando do histórico
get_last_command() {
    # Pegar último comando (removendo o próprio copyout se for o caso)
    local cmd=$(history | tail -2 | head -1 | sed 's/^[ ]*[0-9]*[ ]*//')
    
    # Se o comando é copyout, pegar o anterior
    if [[ "$cmd" == copyout* ]]; then
        cmd=$(history | tail -3 | head -1 | sed 's/^[ ]*[0-9]*[ ]*//')
    fi
    
    echo "$cmd"
}

# Função para capturar saída do terminal
capture_terminal_output() {
    local lines="${1:-50}"
    
    # Verificar se temos script/typescript disponível
    if command -v script &> /dev/null; then
        # Usar últimas N linhas da tela
        tput rmcup 2>/dev/null || true
        local output=$(tty < /dev/tty | xargs -I {} sh -c "tail -n $lines {}")
    else
        # Fallback: usar tail em /dev/pts/*
        local tty_dev=$(tty)
        local output=$(tail -n "$lines" "$tty_dev" 2>/dev/null || echo "")
    fi
    
    echo "$output"
}

# Função principal
main() {
    local mode="${1:-default}"
    
    case "$mode" in
        --help|-h)
            echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}  Copy Terminal Output - Atalho: copyout${NC}"
            echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
            echo ""
            echo -e "${YELLOW}Uso:${NC}"
            echo -e "  ${GREEN}copyout${NC}              - Copia último comando + saída (50 linhas)"
            echo -e "  ${GREEN}copyout 100${NC}          - Copia último comando + últimas 100 linhas"
            echo -e "  ${GREEN}copyout --cmd${NC}        - Copia apenas o último comando"
            echo -e "  ${GREEN}copyout --out${NC}        - Copia apenas a saída (50 linhas)"
            echo -e "  ${GREEN}copyout --out 100${NC}    - Copia apenas a saída (100 linhas)"
            echo -e "  ${GREEN}copyout --all${NC}        - Copia todo o histórico da sessão"
            echo ""
            echo -e "${YELLOW}Exemplos:${NC}"
            echo -e "  $ ${BLUE}ls -la${NC}"
            echo -e "  $ ${GREEN}copyout${NC}              → Copia 'ls -la' + resultado"
            echo -e "  $ ${GREEN}copyout --cmd${NC}        → Copia apenas 'ls -la'"
            echo -e "  $ ${GREEN}copyout --out 20${NC}     → Copia últimas 20 linhas"
            echo ""
            return 0
            ;;
            
        --cmd)
            # Copiar apenas o comando
            local cmd=$(get_last_command)
            
            echo -e "${BLUE}📋 Comando:${NC}"
            echo "$cmd"
            echo ""
            
            copy_to_clipboard "$cmd"
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Comando copiado para clipboard!${NC}"
            fi
            return 0
            ;;
            
        --out)
            # Copiar apenas a saída
            local lines="${2:-50}"
            
            if ! [[ "$lines" =~ ^[0-9]+$ ]]; then
                lines=50
            fi
            
            echo -e "${BLUE}📋 Capturando últimas $lines linhas...${NC}"
            
            # Método alternativo: usar buffer do terminal
            local output=""
            
            # Tentar pegar do buffer do tmux se estiver em tmux
            if [ -n "$TMUX" ]; then
                output=$(tmux capture-pane -p -S -"$lines")
            else
                # Fallback: usar history do bash
                output=$(fc -ln -"$lines" -0)
            fi
            
            if [ -z "$output" ]; then
                echo -e "${RED}❌ Não foi possível capturar saída${NC}"
                return 1
            fi
            
            copy_to_clipboard "$output"
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Saída copiada para clipboard! ($lines linhas)${NC}"
            fi
            return 0
            ;;
            
        --all)
            # Copiar todo o histórico
            local output=$(history)
            
            copy_to_clipboard "$output"
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Histórico completo copiado para clipboard!${NC}"
            fi
            return 0
            ;;
            
        *)
            # Modo padrão: comando + saída
            local lines=50
            
            if [[ "$1" =~ ^[0-9]+$ ]]; then
                lines="$1"
            fi
            
            local cmd=$(get_last_command)
            
            echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}📋 Capturando comando + saída...${NC}"
            echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
            echo ""
            echo -e "${YELLOW}Comando:${NC}"
            echo "$cmd"
            echo ""
            
            # Montar output final
            local final_output="$ $cmd"
            final_output+="\n\n"
            
            # Tentar capturar saída
            if [ -n "$TMUX" ]; then
                local output=$(tmux capture-pane -p -S -"$lines")
                final_output+="$output"
            else
                final_output+="[Saída: últimas $lines linhas do terminal]\n"
                final_output+=$(fc -ln -"$lines" -0)
            fi
            
            copy_to_clipboard "$final_output"
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Comando + saída copiados para clipboard!${NC}"
                echo -e "${BLUE}  Linhas capturadas: $lines${NC}"
            fi
            ;;
    esac
}

# Executar
main "$@"




