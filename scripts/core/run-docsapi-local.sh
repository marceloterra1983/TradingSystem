#!/usr/bin/env bash
# ==============================================================================
# Run DocsAPI locally (no Docker)
# ------------------------------------------------------------------------------
# Starts backend/api/documentation-api on a local port with minimal friction.
# Defaults to PORT=3401 to match the dashboard proxy.
#
# Usage:
#   bash scripts/core/run-docsapi-local.sh [--port 3401] [--watch] [--background] [--no-install]
#
# Examples:
#   bash scripts/core/run-docsapi-local.sh
#   bash scripts/core/run-docsapi-local.sh --port 3400 --background
#   bash scripts/core/run-docsapi-local.sh --watch
#
# After start:
#   - Health:  http://localhost:<PORT>/health
#   - Facets:  http://localhost:<PORT>/api/v1/docs/facets
# ==============================================================================
set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

script_dir="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
service_dir="$repo_root/backend/api/documentation-api"

PORT=3401
USE_WATCH=false
RUN_BACKGROUND=false
DO_INSTALL=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"; shift 2 ;;
    --watch)
      USE_WATCH=true; shift ;;
    --background)
      RUN_BACKGROUND=true; shift ;;
    --no-install)
      DO_INSTALL=false; shift ;;
    -h|--help)
      grep '^#' "$0" | sed -E 's/^# ?//' ; exit 0 ;;
    *)
      echo -e "${YELLOW}[warn] Unknown flag:$NC $1" ; shift ;;
  esac
done

echo -e "${BLUE}▶ DocsAPI local runner${NC}"
echo "  Repo:     $repo_root"
echo "  Service:  $service_dir"
echo "  Port:     $PORT"
echo "  Mode:     $([[ "$USE_WATCH" == true ]] && echo dev --watch || echo start)"
echo "  Install:  $([[ "$DO_INSTALL" == true ]] && echo yes || echo no)"
echo "  Daemon:   $([[ "$RUN_BACKGROUND" == true ]] && echo background || echo foreground)"

if [[ ! -d "$service_dir" ]]; then
  echo -e "${RED}[error] Service directory not found:${NC} $service_dir" >&2
  exit 1
fi

# Node version check (recommend >=18)
if command -v node >/dev/null 2>&1; then
  NODE_MAJ="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
else
  NODE_MAJ=0
fi

if [[ "$NODE_MAJ" -lt 18 ]]; then
  echo -e "${YELLOW}[warn] Node >= 18 is recommended. Detected: $(node -v 2>/dev/null || echo unknown)${NC}"
fi

# Port availability check
if lsof -i ":$PORT" >/dev/null 2>&1; then
  echo -e "${YELLOW}[warn] Port $PORT appears to be in use. Choose another with --port or stop the process.${NC}"
  exit 2
fi

pushd "$service_dir" >/dev/null

if [[ "$DO_INSTALL" == true ]]; then
  echo -e "${BLUE}▶ Installing dependencies (npm install)${NC}"
  npm install
fi

export PORT
export DOCUMENTATION_DB_STRATEGY=${DOCUMENTATION_DB_STRATEGY:-none}

LOG_FILE="$service_dir/.devserver.log"
PID_FILE="$service_dir/.devserver.pid"

start_cmd=(npm start)
if [[ "$USE_WATCH" == true ]]; then
  start_cmd=(npm run dev)
fi

if [[ "$RUN_BACKGROUND" == true ]]; then
  echo -e "${BLUE}▶ Starting DocsAPI in background${NC}"
  ("${start_cmd[@]}" >"$LOG_FILE" 2>&1 & echo $! >"$PID_FILE")
  sleep 2
else
  echo -e "${BLUE}▶ Starting DocsAPI (foreground)${NC}"
  # Start in a subshell so we can readiness-check in parallel only when backgrounding
  "${start_cmd[@]}" &
  echo $! >"$PID_FILE"
  # Allow a moment to boot before readiness check
  sleep 1
fi

# Readiness check
echo -e "${BLUE}▶ Waiting for health endpoint${NC}"
ready=false
for i in {1..30}; do
  if curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1; then
    ready=true; break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  echo -e "${RED}[error] DocsAPI did not become healthy on port $PORT within timeout.${NC}"
  echo -e "Log tail (last 80 lines):"
  [[ -f "$LOG_FILE" ]] && tail -n 80 "$LOG_FILE" || echo "(no log captured)"
  exit 3
fi

echo -e "${GREEN}✔ DocsAPI running on http://localhost:$PORT${NC}"

echo -e "${BLUE}▶ Quick checks${NC}"
curl -fsS "http://localhost:$PORT/health" | sed -E 's/^/  /'
if curl -fsS "http://localhost:$PORT/api/v1/docs/facets" >/dev/null 2>&1; then
  echo "  Facets endpoint: OK"
else
  echo "  Facets endpoint: unavailable (check logs)"
fi

echo ""
echo -e "${BLUE}▶ Next steps${NC}"
if [[ "$PORT" == 3401 ]]; then
  echo "  - Dashboard proxy já aponta para 3401 por padrão."
else
  echo "  - Defina no dashboard (frontend/dashboard/.env.local):"
  echo "      VITE_DOCUMENTATION_PROXY_TARGET=http://localhost:$PORT"
fi
echo "  - Em seguida: cd frontend/dashboard && npm run dev"

if [[ "$RUN_BACKGROUND" != true ]]; then
  echo ""
  echo -e "${YELLOW}Pressione Ctrl+C para encerrar.${NC}"
  wait "$(cat "$PID_FILE" 2>/dev/null || echo 0)" || true
fi

popd >/dev/null

