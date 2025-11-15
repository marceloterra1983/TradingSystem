#!/bin/bash
###############################################################################
# Docker Control CLI
#
# Cliente CLI para interagir com o Docker Control Server
# Facilita reiniciar containers sem precisar de sudo
###############################################################################

SERVER="http://127.0.0.1:9880"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_usage() {
  cat <<EOF
Usage: $(basename "$0") <action> [container]

Actions:
  list                    List running containers
  restart <container>     Restart a container
  stop <container>        Stop a container
  start <container>       Start a container
  logs <container>        Show container logs
  health <container>      Check container health

Examples:
  $(basename "$0") list
  $(basename "$0") restart dashboard
  $(basename "$0") logs docs-hub

EOF
}

function check_server() {
  if ! curl -s "${SERVER}/health" >/dev/null 2>&1; then
    echo -e "${RED}✗ Docker Control Server is not running${NC}"
    echo ""
    echo "Start it with:"
    echo "  node tools/docker-launcher/docker-control-server.js"
    echo ""
    echo "Or run in background:"
    echo "  node tools/docker-launcher/docker-control-server.js > /tmp/docker-control.log 2>&1 &"
    exit 1
  fi
}

function list_containers() {
  echo -e "${YELLOW}Fetching containers...${NC}"
  response=$(curl -s "${SERVER}/containers")

  if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
    echo ""
    echo "$response" | jq -r '.containers'
    echo ""
    echo -e "${GREEN}Allowed containers:${NC}"
    echo "$response" | jq -r '.allowed[]' | sed 's/^/  - /'
  else
    echo -e "${RED}✗ Failed to fetch containers${NC}"
    echo "$response" | jq -r '.error // .'
    exit 1
  fi
}

function execute_action() {
  local action="$1"
  local container="$2"

  if [[ -z "$container" ]]; then
    echo -e "${RED}✗ Container name required${NC}"
    print_usage
    exit 1
  fi

  echo -e "${YELLOW}Executing ${action} on ${container}...${NC}"

  response=$(curl -s -X POST "${SERVER}" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"${action}\",\"container\":\"${container}\"}")

  if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Success${NC}"
    echo ""
    echo "$response" | jq -r '.output // "No output"'
  else
    echo -e "${RED}✗ Failed${NC}"
    echo "$response" | jq -r '.error // .'
    exit 1
  fi
}

# Main
if [[ $# -lt 1 ]]; then
  print_usage
  exit 1
fi

check_server

case "$1" in
  list)
    list_containers
    ;;
  restart|stop|start|logs|health)
    execute_action "$1" "$2"
    ;;
  *)
    echo -e "${RED}✗ Unknown action: $1${NC}"
    print_usage
    exit 1
    ;;
esac
