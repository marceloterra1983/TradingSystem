#!/bin/bash
#
# Claude Code - Aliases para TradingSystem
#
# Para usar, adicione ao seu ~/.bashrc ou ~/.zshrc:
# source /home/marce/projetos/TradingSystem/.claude/aliases.sh
#

# Alias principal - Claude Code com permissões completas
alias claude-dev='bash /home/marce/projetos/TradingSystem/.claude/claude-dev.sh'

# Alias para modo padrão (com confirmações)
alias claude-safe='cd /home/marce/projetos/TradingSystem && claude'

# Alias para comandos rápidos (print mode)
alias claude-run='cd /home/marce/projetos/TradingSystem && claude --print --dangerously-skip-permissions'

# Alias para verificar MCP servers
alias claude-mcp='cd /home/marce/projetos/TradingSystem && claude mcp list'

# Alias para verificar configuração
alias claude-config='cat ~/.claude.json | jq ".projects.\"/home/marce/projetos/TradingSystem\""'

# Alias para debug mode
alias claude-debug='cd /home/marce/projetos/TradingSystem && claude --debug --dangerously-skip-permissions'

# Função helper para executar comandos Claude
claude-cmd() {
    if [ -z "$1" ]; then
        echo "Uso: claude-cmd <comando>"
        echo "Exemplo: claude-cmd '/health-check all'"
        return 1
    fi
    cd /home/marce/projetos/TradingSystem
    claude --print --dangerously-skip-permissions "$1"
}

# Função para iniciar Claude em diretório específico
claude-at() {
    if [ -z "$1" ]; then
        echo "Uso: claude-at <diretório>"
        echo "Exemplo: claude-at ~/projetos/outro-projeto"
        return 1
    fi
    cd "$1"
    claude --dangerously-skip-permissions
}

# Exibir mensagem de carregamento
echo "✅ Claude Code aliases carregados para TradingSystem"
echo "   • claude-dev    - Modo desenvolvimento (full permissions)"
echo "   • claude-safe   - Modo seguro (com confirmações)"
echo "   • claude-run    - Executar comando rápido"
echo "   • claude-mcp    - Listar MCP servers"
echo "   • claude-config - Ver configuração"
echo "   • claude-debug  - Modo debug"
echo "   • claude-cmd    - Executar custom command"
echo "   • claude-at     - Claude em outro diretório"







