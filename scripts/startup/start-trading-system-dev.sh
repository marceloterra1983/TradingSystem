#!/bin/bash
# Starts the TradingSystem dev services (Workspace, Dashboard, Documentation)
# Each service is launched in its own terminal tab and dependencies are installed on first run.

set -e

# Parse arguments
SKIP_FRONTEND=false
SKIP_WORKSPACE=false
SKIP_DOCS=false
START_MONITORING=false
START_DOCS_DOCKER=false
SKIP_SERVICE_LAUNCHER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-idea-bank|--skip-workspace)
            SKIP_WORKSPACE=true
            shift
            ;;
        --skip-docs)
            SKIP_DOCS=true
            shift
            ;;
        --start-monitoring)
            START_MONITORING=true
            shift
            ;;
        --start-docs-docker)
            START_DOCS_DOCKER=true
            shift
            ;;
        --skip-service-launcher)
            SKIP_SERVICE_LAUNCHER=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-frontend] [--skip-workspace] [--skip-docs] [--start-monitoring] [--start-docs-docker] [--skip-service-launcher]"
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRASTRUCTURE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$INFRASTRUCTURE_DIR")"
ENV_FILE="$REPO_ROOT/.env"

# Start service launcher if not skipped
if [ "$SKIP_SERVICE_LAUNCHER" = false ]; then
    SERVICE_LAUNCHER_SCRIPT="$SCRIPT_DIR/start-service-launcher.sh"
    if [ -f "$SERVICE_LAUNCHER_SCRIPT" ]; then
        echo "[Init] Ensuring Laucher API is running (port 3500)..."
        bash "$SERVICE_LAUNCHER_SCRIPT"
    else
        echo "⚠️  [Init] Service launcher script not found at $SERVICE_LAUNCHER_SCRIPT"
    fi
fi

# Function to start a service in a new terminal
start_service() {
    local NAME="$1"
    local WORKING_DIR="$2"
    local START_CMD="$3"
    
    if [ ! -d "$WORKING_DIR" ]; then
        echo "⚠️  [$NAME] Skipping (directory not found): $WORKING_DIR"
        return
    fi
    
    # Check if gnome-terminal is available (common on Ubuntu/Debian)
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --tab --title="$NAME" -- bash -c "
            cd '$WORKING_DIR'
            if [ ! -d 'node_modules' ]; then
                echo '[$NAME] Installing dependencies (npm install)...'
                npm install
            fi
            echo '[$NAME] Starting service...'
            $START_CMD
            exec bash
        "
    # Check if konsole is available (KDE)
    elif command -v konsole &> /dev/null; then
        konsole --new-tab --workdir "$WORKING_DIR" -e bash -c "
            if [ ! -d 'node_modules' ]; then
                echo '[$NAME] Installing dependencies (npm install)...'
                npm install
            fi
            echo '[$NAME] Starting service...'
            $START_CMD
            exec bash
        " &
    # Check if xterm is available (fallback)
    elif command -v xterm &> /dev/null; then
        xterm -T "$NAME" -e bash -c "
            cd '$WORKING_DIR'
            if [ ! -d 'node_modules' ]; then
                echo '[$NAME] Installing dependencies (npm install)...'
                npm install
            fi
            echo '[$NAME] Starting service...'
            $START_CMD
            exec bash
        " &
    else
        echo "⚠️  [$NAME] No suitable terminal emulator found. Install gnome-terminal, konsole, or xterm."
        echo "    Alternatively, manually run: cd '$WORKING_DIR' && $START_CMD"
        return
    fi
    
    echo "[$NAME] launch command dispatched."
}

# Start services
if [ "$SKIP_WORKSPACE" = false ]; then
    start_service "Workspace API" "$REPO_ROOT/backend/api/workspace" "npm run dev"
fi

if [ "$SKIP_FRONTEND" = false ]; then
    start_service "Dashboard Frontend" "$REPO_ROOT/frontend/apps/dashboard" "npm run dev"
fi

if [ "$SKIP_DOCS" = false ]; then
    start_service "Docs (Docusaurus)" "$REPO_ROOT/docs" "npm run start -- --port 3004 --host 0.0.0.0"
fi

# Start monitoring stack with Docker
if [ "$START_MONITORING" = true ]; then
    MONITORING_PATH="$REPO_ROOT/infrastructure/monitoring"
    if ! command -v docker &> /dev/null; then
        echo "⚠️  [Monitoring] Docker is not available. Skipping monitoring stack startup."
    elif [ ! -d "$MONITORING_PATH" ]; then
        echo "⚠️  [Monitoring] Directory not found: $MONITORING_PATH"
    else
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal --tab --title="Monitoring Stack" -- bash -c "
                cd '$MONITORING_PATH'
                echo '[Monitoring] Starting Prometheus stack (docker compose up -d)...'
                COMPOSE_PROFILES=linux docker compose --env-file '$ENV_FILE' -f '$REPO_ROOT/infrastructure/monitoring/docker-compose.yml' up -d --build
                exec bash
            "
        else
            echo "[Monitoring] Starting Prometheus stack..."
            COMPOSE_PROFILES=linux docker compose --env-file "$ENV_FILE" -f "$REPO_ROOT/infrastructure/monitoring/docker-compose.yml" up -d --build
        fi
        echo "[Monitoring] launch command dispatched."
    fi
fi

# Start docs Docker container
if [ "$START_DOCS_DOCKER" = true ]; then
    DOCS_DOCKER_PATH="$REPO_ROOT/docs"
    if ! command -v docker &> /dev/null; then
        echo "⚠️  [Docs Docker] Docker is not available. Skipping documentation container startup."
    elif [ ! -d "$DOCS_DOCKER_PATH" ]; then
        echo "⚠️  [Docs Docker] Directory not found: $DOCS_DOCKER_PATH"
    else
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal --tab --title="Docs Docker" -- bash -c "
                cd '$DOCS_DOCKER_PATH'
                echo '[Docs Docker] Starting stack (docker compose up -d docs-api)...'
                docker compose --env-file '$ENV_FILE' -f '$REPO_ROOT/infrastructure/compose/docker-compose.docs.yml' up -d --build docs-api
                exec bash
            "
        else
            echo "[Docs Docker] Starting stack..."
            docker compose --env-file "$ENV_FILE" -f "$REPO_ROOT/infrastructure/compose/docker-compose.docs.yml" up -d --build docs-api
        fi
        echo "[Docs Docker] launch command dispatched."
    fi
fi

echo ""
echo "========================================"
echo "All requested services were triggered!"
echo "========================================"
echo ""
echo "Services running:"
[ "$SKIP_WORKSPACE" = false ] && echo "  - Workspace:          http://localhost:3100"
[ "$SKIP_FRONTEND" = false ] && echo "  - Dashboard:          http://localhost:5173"
[ "$SKIP_DOCS" = false ] && echo "  - Docs (Docusaurus):  http://localhost:3004"
[ "$START_DOCS_DOCKER" = true ] && echo "  - Docs (Docker):      http://localhost:3004"
echo ""
