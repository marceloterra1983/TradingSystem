#!/bin/bash
# Script para corrigir e iniciar todos os containers da stack database-ui

set -e

echo "🔧 Corrigindo containers da stack database-ui..."
echo ""

# 1. Parar processo QuestDB órfão se existir
echo "1️⃣ Verificando processo QuestDB órfão..."
QUESTDB_PID=$(ps aux | grep -i "questdb.ServerMain" | grep -v grep | awk '{print $2}' | head -1)

if [ -n "$QUESTDB_PID" ]; then
    echo "   Processo encontrado: PID $QUESTDB_PID"
    echo "   Parando processo..."
    sudo kill -TERM "$QUESTDB_PID" 2>/dev/null || true
    sleep 3
    
    if ps -p "$QUESTDB_PID" > /dev/null 2>&1; then
        echo "   Forçando parada..."
        sudo kill -9 "$QUESTDB_PID" 2>/dev/null || true
        sleep 2
    fi
    
    if ps -p "$QUESTDB_PID" > /dev/null 2>&1; then
        echo "   ⚠️  Não foi possível parar o processo (pode precisar de intervenção manual)"
    else
        echo "   ✅ Processo parado"
    fi
else
    echo "   ✅ Nenhum processo QuestDB encontrado"
fi

echo ""

# 2. Parar todos os containers da stack
echo "2️⃣ Parando containers existentes..."
docker compose -f tools/compose/docker-compose.database-ui.yml down 2>/dev/null || true
echo "   ✅ Containers parados"

echo ""

# 3. Rebuild launcher-api (com Docker CLI)
echo "3️⃣ Rebuild dbui-launcher-api (com Docker CLI)..."
docker compose -f tools/compose/docker-compose.database-ui.yml build dbui-launcher-api
echo "   ✅ Build concluído"

echo ""

# 4. Iniciar todos os containers
echo "4️⃣ Iniciando todos os containers..."
docker compose -f tools/compose/docker-compose.database-ui.yml up -d
echo "   ✅ Containers iniciados"

echo ""

# 5. Aguardar inicialização
echo "5️⃣ Aguardando inicialização (10s)..."
sleep 10

echo ""

# 6. Verificar status
echo "6️⃣ Status dos containers:"
docker ps --filter "name=dbui-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""

# 7. Verificar healthchecks
echo "7️⃣ Healthchecks:"
for container in dbui-launcher-api dbui-pgadmin dbui-pgweb dbui-adminer dbui-questdb; do
    health=$(docker inspect $container --format '{{.State.Health.Status}}' 2>/dev/null || docker inspect $container --format '{{.State.Status}}' 2>/dev/null)
    echo "   $container: $health"
done

echo ""
echo "✅ Processo concluído!"
echo ""
echo "Para ver logs de um container específico:"
echo "  docker logs dbui-<nome-do-container>"
echo ""
echo "Para verificar healthcheck detalhado:"
echo "  docker inspect dbui-<nome-do-container> --format '{{json .State.Health}}' | jq"

