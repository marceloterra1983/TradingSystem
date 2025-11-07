#!/bin/bash
# Script para corrigir e sincronizar todos os containers database-ui
# Sincroniza com http://localhost:3103/#/knowledge-database

set -e

echo "🔧 Corrigindo e sincronizando containers database-ui..."
echo ""

# Portas esperadas pelo dashboard
PGADMIN_PORT=5050
PGWEB_PORT=8081
ADMINER_PORT=8082
QUESTDB_PORT=9002

# 1. Verificar processos usando as portas
echo "1️⃣ Verificando portas em uso..."
for port in $PGADMIN_PORT $PGWEB_PORT $ADMINER_PORT $QUESTDB_PORT; do
    if ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "   ⚠️  Porta $port está em uso"
        # Tentar identificar processo
        pid=$(sudo lsof -ti:$port 2>/dev/null | head -1 || echo "")
        if [ -n "$pid" ]; then
            echo "      Processo: PID $pid"
            ps -p $pid -o pid,cmd --no-headers 2>/dev/null || echo "      Não foi possível obter detalhes"
        fi
    else
        echo "   ✅ Porta $port livre"
    fi
done

echo ""

# 2. Parar containers antigos
echo "2️⃣ Parando containers antigos..."
docker compose -f tools/compose/docker-compose.database-ui.yml down 2>/dev/null || true
docker rm -f dbui-pgadmin dbui-pgweb dbui-adminer dbui-questdb 2>/dev/null || true
echo "   ✅ Containers parados"

echo ""

# 3. Verificar se portas podem ser liberadas (processos não-Docker)
echo "3️⃣ Tentando liberar portas..."
for port in $PGADMIN_PORT $PGWEB_PORT $ADMINER_PORT; do
    pid=$(sudo lsof -ti:$port 2>/dev/null | head -1 || echo "")
    if [ -n "$pid" ]; then
        echo "   Tentando parar processo na porta $port (PID $pid)..."
        sudo kill -TERM $pid 2>/dev/null || true
        sleep 2
        if ps -p $pid > /dev/null 2>&1; then
            echo "   ⚠️  Processo ainda rodando, pode precisar de intervenção manual"
        else
            echo "   ✅ Porta $port liberada"
        fi
    fi
done

echo ""

# 4. Parar processo QuestDB órfão
echo "4️⃣ Verificando processo QuestDB órfão..."
QUESTDB_PID=$(ps aux | grep -i "questdb.ServerMain" | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$QUESTDB_PID" ]; then
    echo "   Processo encontrado: PID $QUESTDB_PID"
    echo "   Parando processo..."
    sudo kill -TERM $QUESTDB_PID 2>/dev/null || true
    sleep 3
    if ps -p $QUESTDB_PID > /dev/null 2>&1; then
        echo "   Forçando parada..."
        sudo kill -9 $QUESTDB_PID 2>/dev/null || true
        sleep 2
    fi
    if ps -p $QUESTDB_PID > /dev/null 2>&1; then
        echo "   ⚠️  Não foi possível parar o processo"
    else
        echo "   ✅ Processo QuestDB parado"
    fi
else
    echo "   ✅ Nenhum processo QuestDB encontrado"
fi

echo ""

# 5. Aguardar liberação de portas
echo "5️⃣ Aguardando liberação de portas (5s)..."
sleep 5

echo ""

# 6. Iniciar containers
echo "6️⃣ Iniciando containers..."
docker compose -f tools/compose/docker-compose.database-ui.yml up -d
echo "   ✅ Containers iniciados"

echo ""

# 7. Aguardar inicialização
echo "7️⃣ Aguardando inicialização (10s)..."
sleep 10

echo ""

# 8. Verificar status
echo "8️⃣ Status final:"
docker ps --filter "name=dbui-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""

# 9. Verificar healthchecks
echo "9️⃣ Healthchecks:"
for container in dbui-launcher-api dbui-pgadmin dbui-pgweb dbui-adminer dbui-questdb; do
    health=$(docker inspect $container --format '{{.State.Health.Status}}' 2>/dev/null || docker inspect $container --format '{{.State.Status}}' 2>/dev/null)
    project=$(docker inspect $container --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null || echo "sem projeto")
    echo "   $container: $health (projeto: $project)"
done

echo ""

# 10. Testar conectividade
echo "🔟 Testes de conectividade:"
echo "   Launcher API:" && curl -s http://localhost:3909/healthz | jq -r '.status' 2>/dev/null && echo "      ✅" || echo "      ❌"
echo "   pgAdmin:" && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:$PGADMIN_PORT/misc/ping 2>/dev/null | grep -q "200" && echo "      ✅" || echo "      ❌"
echo "   pgweb:" && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:$PGWEB_PORT 2>/dev/null | grep -q "200" && echo "      ✅" || echo "      ❌"
echo "   Adminer:" && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:$ADMINER_PORT 2>/dev/null | grep -q "200" && echo "      ✅" || echo "      ❌"
echo "   QuestDB:" && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:$QUESTDB_PORT 2>/dev/null | grep -q "200\|302\|401" && echo "      ✅" || echo "      ❌"

echo ""
echo "✅ Processo concluído!"
echo ""
echo "📋 URLs esperadas pelo dashboard:"
echo "   - pgAdmin: http://localhost:$PGADMIN_PORT"
echo "   - pgweb: http://localhost:$PGWEB_PORT"
echo "   - Adminer: http://localhost:$ADMINER_PORT"
echo "   - QuestDB: http://localhost:$QUESTDB_PORT"

