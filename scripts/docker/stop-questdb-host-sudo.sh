#!/bin/bash
# Script para parar processo QuestDB rodando diretamente no host (requer sudo)
# Necessário quando há conflito de portas com container Docker

set -e

echo "🛑 Parando processo QuestDB no host (requer privilégios de administrador)..."

# Encontrar processo QuestDB
QUESTDB_PID=$(ps aux | grep -i "questdb.ServerMain" | grep -v grep | awk '{print $2}' | head -1)

if [ -z "$QUESTDB_PID" ]; then
    echo "✅ Nenhum processo QuestDB encontrado"
    exit 0
fi

echo "   Processo encontrado: PID $QUESTDB_PID"
echo "   Usuário: $(ps -p $QUESTDB_PID -o user= 2>/dev/null || echo 'desconhecido')"

# Tentar parar graciosamente
echo "   Enviando SIGTERM..."
sudo kill -TERM "$QUESTDB_PID" 2>/dev/null || true

# Aguardar 5 segundos
sleep 5

# Verificar se ainda está rodando
if ps -p "$QUESTDB_PID" > /dev/null 2>&1; then
    echo "   Processo ainda rodando, forçando parada com SIGKILL..."
    sudo kill -9 "$QUESTDB_PID" 2>/dev/null || true
    sleep 2
fi

# Verificar se parou
if ps -p "$QUESTDB_PID" > /dev/null 2>&1; then
    echo "❌ Erro: Não foi possível parar o processo"
    exit 1
else
    echo "✅ Processo QuestDB parado com sucesso"
fi

# Verificar portas
echo ""
echo "🔍 Verificando portas..."
if ss -tuln 2>/dev/null | grep -qE ":8812|:9009"; then
    echo "⚠️  Portas 8812 ou 9009 ainda em uso (pode ser outro processo)"
    ss -tuln 2>/dev/null | grep -E ":8812|:9009" || true
else
    echo "✅ Portas 8812 e 9009 liberadas"
fi

