#!/bin/bash

# Service Launcher bridge for Codex.
# Manages the local Service Launcher API (apps/status) with start/stop/restart/status commands.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVICE_DIR="${REPO_ROOT}/apps/status"
LOG_FILE="/tmp/service-launcher.log"
PID_FILE="/tmp/service-launcher.pid"
PORT="${SERVICE_LAUNCHER_PORT:-3500}"

usage() {
  cat <<EOF
Usage: $(basename "$0") <action>

Actions:
  start            Start the Service Launcher (npm run dev)
  stop             Stop the running Service Launcher process
  restart          Restart the Service Launcher
  status           Check health and show PID/log info
  logs             Tail the launcher log file
  help             Show this message

Examples:
  $(basename "$0") status
  $(basename "$0") start
  $(basename "$0") restart
EOF
}

require_service_dir() {
  if [[ ! -d "${SERVICE_DIR}" ]]; then
    echo "Service Launcher directory not found at ${SERVICE_DIR}. Update SERVICE_DIR in scripts/codex/service-launcher.sh." >&2
    exit 1
  fi
}

ensure_dependencies() {
  require_service_dir
  if [[ ! -d "${SERVICE_DIR}/node_modules" ]]; then
    echo "Installing Service Launcher dependencies..."
    (cd "${SERVICE_DIR}" && npm install >/dev/null)
  fi
}

detect_pid() {
  if [[ -f "${PID_FILE}" ]]; then
    local pid
    pid=$(cat "${PID_FILE}")
    if [[ -n "${pid}" ]] && ps -p "${pid}" >/dev/null 2>&1; then
      echo "${pid}"
      return
    fi
  fi

  local found
  found=$(pgrep -f "apps/status.*server.js" 2>/dev/null || true)
  if [[ -n "${found}" ]]; then
    echo "${found}" | head -n 1
  fi
}

stop_launcher() {
  local pid
  pid=$(detect_pid || true)
  if [[ -z "${pid}" ]]; then
    echo "Service Launcher is not running."
    return
  fi

  echo "Stopping Service Launcher (PID ${pid})..."
  kill "${pid}" >/dev/null 2>&1 || true
  sleep 1
  if ps -p "${pid}" >/dev/null 2>&1; then
    echo "Force killing PID ${pid}..."
    kill -9 "${pid}" >/dev/null 2>&1 || true
  fi
  rm -f "${PID_FILE}"
  echo "Service Launcher stopped."
}

wait_for_health() {
  echo "Waiting for Service Launcher on port ${PORT}..."
  for _ in {1..20}; do
    if curl -sf "http://localhost:${PORT}/health" >/dev/null 2>&1; then
      echo "Service Launcher is healthy."
      return 0
    fi
    sleep 1
  done
  echo "Service Launcher did not become healthy in time. Check logs: tail -f ${LOG_FILE}" >&2
  return 1
}

start_launcher() {
  ensure_dependencies

  if [[ -n "$(detect_pid || true)" ]]; then
    echo "Service Launcher already running. Use restart to relaunch."
    return 0
  fi

  echo "Starting Service Launcher (npm run dev)..."
  (
    cd "${SERVICE_DIR}"
    nohup npm run dev > "${LOG_FILE}" 2>&1 &
    echo $! > "${PID_FILE}"
  )
  sleep 1
  wait_for_health
  echo "Logs: tail -f ${LOG_FILE}"
}

show_status() {
  local pid
  pid=$(detect_pid || true)
  if [[ -n "${pid}" ]]; then
    echo "PID: ${pid}"
  else
    echo "PID: not running"
  fi

  if curl -sf "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    echo "Health: ✅ http://localhost:${PORT}/health"
  else
    echo "Health: ❌ unreachable"
  fi

  if [[ -f "${LOG_FILE}" ]]; then
    echo "Log file: ${LOG_FILE}"
    tail -n 20 "${LOG_FILE}"
  else
    echo "Log file: ${LOG_FILE} (no entries yet)"
  fi
}

tail_logs() {
  if [[ ! -f "${LOG_FILE}" ]]; then
    echo "Log file ${LOG_FILE} not found. Start the launcher first." >&2
    exit 1
  fi
  tail -f "${LOG_FILE}"
}

ACTION="${1:-help}"
shift || true

case "${ACTION}" in
  help|-h|--help)
    usage
    ;;
  start)
    start_launcher
    ;;
  stop)
    stop_launcher
    ;;
  restart)
    stop_launcher
    start_launcher
    ;;
  status)
    show_status
    ;;
  logs)
    tail_logs
    ;;
  *)
    echo "Unknown action: ${ACTION}" >&2
    usage
    exit 1
    ;;
esac
