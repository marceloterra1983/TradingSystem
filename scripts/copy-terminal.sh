#!/bin/bash

# Script para copiar comandos do terminal
# Uso: ./copy-terminal.sh [comando]

if [ $# -eq 0 ]; then
    # Se não passou comando, copiar último comando do histórico
    LAST_COMMAND=$(history | tail -1 | sed 's/^[ ]*[0-9]*[ ]*//')
    echo "Último comando: $LAST_COMMAND"
    echo "$LAST_COMMAND" | xclip -selection clipboard 2>/dev/null || echo "$LAST_COMMAND" | clip.exe 2>/dev/null
    echo "Comando copiado para clipboard!"
else
    # Se passou comando, copiar o comando
    echo "Copiando comando: $*"
    echo "$*" | xclip -selection clipboard 2>/dev/null || echo "$*" | clip.exe 2>/dev/null
    echo "Comando copiado para clipboard!"
fi

