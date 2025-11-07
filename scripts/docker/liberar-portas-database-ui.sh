#!/bin/bash
# Script para liberar portas usadas pelos containers database-ui
# REQUER SUDO

set -e

echo "🔓 Liberando portas para containers database-ui..."
echo ""

PORTS=(5050 8081 8082 9002 8812 9009)

for port in "${PORTS[@]}"; do
    echo "=== Porta $port ==="
    
    # Encontrar processos usando a porta
    pids=$(sudo lsof -ti:$port 2>/dev/null || echo "")
    
    if [ -z "$pids" ]; then
        echo "   ✅ Porta $port já está livre"
        continue
    fi
    
    for pid in $pids; do
        # Verificar se é um container Docker
        container=$(docker ps --format "{{.ID}}" --filter "publish=$port" 2>/dev/null || echo "")
        
        if [ -n "$container" ]; then
            echo "   Container Docker encontrado: $container"
            echo "   Parando container..."
            docker stop $container 2>/dev/null || true
            docker rm $container 2>/dev/null || true
        else
            # Verificar informações do processo
            cmd=$(ps -p $pid -o cmd --no-headers 2>/dev/null || echo "desconhecido")
            echo "   Processo encontrado: PID $pid"
            echo "   Comando: $cmd"
            
            # Tentar parar graciosamente
            echo "   Enviando SIGTERM..."
            sudo kill -TERM $pid 2>/dev/null || true
            sleep 2
            
            # Verificar se ainda está rodando
            if ps -p $pid > /dev/null 2>&1; then
                echo "   Processo ainda rodando, forçando parada..."
                sudo kill -9 $pid 2>/dev/null || true
                sleep 1
            fi
            
            if ps -p $pid > /dev/null 2>&1; then
                echo "   ⚠️  Não foi possível parar o processo (pode precisar de intervenção manual)"
            else
                echo "   ✅ Processo parado"
            fi
        fi
    done
    
    # Verificar se porta foi liberada
    sleep 1
    if ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "   ⚠️  Porta $port ainda em uso"
    else
        echo "   ✅ Porta $port liberada"
    fi
    
    echo ""
done

echo "✅ Processo concluído!"
echo ""
echo "Agora você pode iniciar os containers:"
echo "  docker compose -f tools/compose/docker-compose.database-ui.yml up -d"

