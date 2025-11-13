#!/usr/bin/env bash
#
# WSL2 Port Forwarding Workaround for Docker Desktop
# Creates socat tunnels to forward ports from WSL2 to Docker containers
#
# Usage:
#   bash scripts/docker/wsl2-port-forward.sh start
#   bash scripts/docker/wsl2-port-forward.sh stop
#   bash scripts/docker/wsl2-port-forward.sh status
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="/tmp/wsl2-port-forward.pid"

# Port mappings: HOST_PORT:CONTAINER_IP:CONTAINER_PORT
declare -A PORT_MAPPINGS=(
    ["9082"]="172.20.0.14:9080"  # API Gateway (web)
    ["9083"]="172.20.0.14:8080"  # API Gateway (dashboard)
    ["3601"]="172.23.0.2:3601"   # Course Crawler API
)

start_forwarding() {
    echo "🚀 Iniciando port forwarding WSL2 → Docker containers"
    echo ""

    # Check if socat is installed
    if ! command -v socat &> /dev/null; then
        echo "❌ socat não está instalado"
        echo "   Instalando socat..."
        sudo apt-get update -qq && sudo apt-get install -y socat
    fi

    # Get current container IPs (may change after restarts)
    TRAEFIK_IP=$(docker inspect api-gateway | jq -r '.[0].NetworkSettings.Networks.tradingsystem_backend.IPAddress')
    COURSE_CRAWLER_IP=$(docker inspect course-crawler-api | jq -r '.[0].NetworkSettings.Networks | to_entries[0].value.IPAddress')

    if [[ -z "$TRAEFIK_IP" || "$TRAEFIK_IP" == "null" ]]; then
        echo "❌ Container api-gateway não encontrado ou não está na rede tradingsystem_backend"
        exit 1
    fi

    echo "✅ Traefik container IP: $TRAEFIK_IP"

    if [[ -n "$COURSE_CRAWLER_IP" && "$COURSE_CRAWLER_IP" != "null" ]]; then
        echo "✅ Course Crawler container IP: $COURSE_CRAWLER_IP"
    else
        echo "⚠️  Course Crawler container não encontrado (será ignorado)"
    fi
    echo ""

    # Update mappings with current IPs
    PORT_MAPPINGS["9082"]="$TRAEFIK_IP:9080"
    PORT_MAPPINGS["9083"]="$TRAEFIK_IP:8080"

    if [[ -n "$COURSE_CRAWLER_IP" && "$COURSE_CRAWLER_IP" != "null" ]]; then
        PORT_MAPPINGS["3601"]="$COURSE_CRAWLER_IP:3601"
    fi

    # Kill existing socat processes for our managed ports
    pkill -f "socat TCP-LISTEN:(9082|9083|3601)" 2>/dev/null || true

    # Start port forwarding
    for HOST_PORT in "${!PORT_MAPPINGS[@]}"; do
        TARGET="${PORT_MAPPINGS[$HOST_PORT]}"

        echo "📡 Forwarding localhost:$HOST_PORT → $TARGET"

        socat TCP-LISTEN:$HOST_PORT,fork,reuseaddr TCP:$TARGET &
        echo $! >> "$PID_FILE"
    done

    echo ""
    echo "✅ Port forwarding ativo!"
    echo ""
    echo "Teste com:"
    echo "  curl http://localhost:9082/"
    echo "  curl http://localhost:9082/api/channels"
    echo "  open http://localhost:9083/dashboard/"
    echo "  curl http://localhost:3601/health"
    echo ""
}

stop_forwarding() {
    echo "🛑 Parando port forwarding..."

    if [[ -f "$PID_FILE" ]]; then
        while read -r pid; do
            kill "$pid" 2>/dev/null || true
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi

    pkill -f "socat TCP-LISTEN:(9082|9083|3601)" 2>/dev/null || true

    echo "✅ Port forwarding parado"
}

status_forwarding() {
    echo "📊 Status do port forwarding WSL2"
    echo ""

    if pgrep -f "socat TCP-LISTEN:(9082|9083|3601)" > /dev/null; then
        echo "✅ Port forwarding ATIVO"
        echo ""
        echo "Processos:"
        ps aux | grep "socat TCP-LISTEN:" | grep -E "(9082|9083|3601)" | grep -v grep
        echo ""
        echo "Testando conectividade:"
        for HOST_PORT in "${!PORT_MAPPINGS[@]}"; do
            if nc -z localhost "$HOST_PORT" 2>/dev/null; then
                echo "  ✅ localhost:$HOST_PORT está acessível"
            else
                echo "  ❌ localhost:$HOST_PORT NÃO está acessível"
            fi
        done
    else
        echo "❌ Port forwarding INATIVO"
        echo ""
        echo "Execute: bash $0 start"
    fi
}

case "${1:-}" in
    start)
        stop_forwarding  # Clean up first
        start_forwarding
        ;;
    stop)
        stop_forwarding
        ;;
    restart)
        stop_forwarding
        sleep 1
        start_forwarding
        ;;
    status)
        status_forwarding
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "Este script cria túneis socat para contornar problemas de port binding"
        echo "do Docker Desktop no WSL2."
        echo ""
        exit 1
        ;;
esac
