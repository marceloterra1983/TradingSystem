#!/bin/bash
# Script para migrar QuestDB de processo host para container database-ui
# Para processos órfãos ou containers antigos

set -e

echo "🔄 Migrando QuestDB para stack database-ui..."
echo ""

# 1. Encontrar e parar processos QuestDB
echo "1️⃣ Parando processos QuestDB existentes..."

QUESTDB_PIDS=$(ps aux | grep -i "questdb.ServerMain" | grep -v grep | awk '{print $2}')

if [ -z "$QUESTDB_PIDS" ]; then
    echo "   ✅ Nenhum processo QuestDB encontrado"
else
    for PID in $QUESTDB_PIDS; do
        echo "   Encontrado processo: PID $PID"
        echo "   Enviando SIGTERM..."
        sudo kill -TERM "$PID" 2>/dev/null || true
        sleep 3
        
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "   Forçando parada com SIGKILL..."
            sudo kill -9 "$PID" 2>/dev/null || true
            sleep 2
        fi
        
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "   ❌ Erro: Não foi possível parar PID $PID"
        else
            echo "   ✅ Processo $PID parado"
        fi
    done
fi

echo ""

# 2. Verificar portas
echo "2️⃣ Verificando portas..."
sleep 2

if ss -tuln 2>/dev/null | grep -qE ":8812|:9009"; then
    echo "   ⚠️  Portas ainda em uso:"
    ss -tuln 2>/dev/null | grep -E ":8812|:9009" || true
    echo ""
    echo "   Tentando identificar processo..."
    sudo lsof -i :8812 -i :9009 2>/dev/null | head -10 || echo "   Não foi possível identificar"
else
    echo "   ✅ Portas 8812 e 9009 liberadas"
fi

echo ""

# 3. Remover container antigo se existir
echo "3️⃣ Limpando containers antigos..."
docker rm -f dbui-questdb 2>/dev/null || true
docker rm -f data-questdb 2>/dev/null || true
echo "   ✅ Containers antigos removidos"

echo ""

# 4. Iniciar novo container
echo "4️⃣ Iniciando novo container dbui-questdb..."
if docker compose -f tools/compose/docker-compose.database-ui.yml up -d dbui-questdb; then
    echo "   ✅ Container iniciado com sucesso"
    sleep 3
    docker ps --filter "name=questdb" --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "   ❌ Erro ao iniciar container"
    echo ""
    echo "   Verifique se as portas estão realmente liberadas:"
    ss -tuln 2>/dev/null | grep -E ":8812|:9009|:9002" || echo "   Nenhuma porta QuestDB em uso"
    exit 1
fi

echo ""
echo "✅ Migração concluída!"

