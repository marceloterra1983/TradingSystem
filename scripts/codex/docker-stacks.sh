#!/bin/bash

# Docker stack bridge for Codex.
# Supports the subset of `/docker-compose` actions that are most frequently
# referenced in CLAUDE.md: start, stop, restart, ps/status, and logs.
# Stacks map to compose files under tools/compose or tools/monitoring.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

declare -A STACK_TO_COMPOSE=(
  [tp-capital]="tools/compose/docker-compose.4-1-tp-capital-stack.yml"
  [data]="tools/compose/docker-compose.data.yml"
  [docs]="tools/compose/docker-compose.2-docs-stack.yml"
  [infra]="tools/compose/docker-compose.infra.yml"
  [monitoring]="tools/monitoring/docker-compose.yml"
  [rag]="tools/compose/docker-compose.rag.yml"
  [rag-gpu]="tools/compose/docker-compose.rag-gpu.yml"
  [timescale]="tools/compose/docker-compose.timescale.yml"
  [frontend-apps]="tools/compose/docker-compose.frontend-apps.yml"
  [firecrawl]="tools/compose/docker-compose.firecrawl.yml"
  [workspace]="tools/compose/docker-compose.4-3-workspace-stack.yml"
  [telegram]="tools/compose/docker-compose.4-2-telegram-stack.yml"
)

STACK_LIST=$(IFS=,; echo "${!STACK_TO_COMPOSE[*]}" | tr ' ' ',')

service_in_list() {
  local needle="$1"
  shift
  for item in "$@"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

build_container_map() {
  local compose_file="$1"
  node <<'NODE' "$compose_file"
const fs = require('fs');
const path = process.argv[2];
const YAML = require('yaml');
const doc = YAML.parse(fs.readFileSync(path, 'utf8')) || {};
const services = doc.services || {};
for (const [name, cfg] of Object.entries(services)) {
  const container = cfg && cfg.container_name ? cfg.container_name : name;
  console.log(`${name}\t${container}`);
}
NODE
}

detect_compose() {
  if command -v docker >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then
      COMPOSE_CMD=(docker compose)
      return 0
    fi
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  echo "❌ Docker Compose not found. Install the compose plugin or docker-compose binary." >&2
  exit 1
}

compose() {
  "${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" "$@"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") <action> [args...]

Actions:
  start [stack...]             Start all stacks (default) or the provided list.
  stop [stack...]              Stop all stacks (default) or the provided list.
  restart [stack...]           Stop + start the target stacks.
  ps [stack]                   Show running containers (optionally filtered by stack).
  logs <stack> [service|container...]
                               Tail logs for the entire stack or specific services/containers.
  help                 Show this message.

Known stacks: ${STACK_LIST}
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

ACTION="$1"
shift || true

detect_compose
COMPOSE_ARGS=()
if [[ -f "${ENV_FILE}" ]]; then
  COMPOSE_ARGS+=(--env-file "${ENV_FILE}")
fi

ensure_stack() {
  local stack="$1"
  if [[ -z "${STACK_TO_COMPOSE[${stack}]+x}" ]]; then
    echo "Unknown stack '${stack}'. Known values: ${STACK_LIST}" >&2
    exit 1
  fi
}

compose_file_for() {
  local stack="$1"
  ensure_stack "${stack}"
  echo "${REPO_ROOT}/${STACK_TO_COMPOSE[$stack]}"
}

stack_prefix() {
  local stack="$1"
  case "${stack}" in
    infra) echo "infra-" ;;
    data) echo "data-" ;;
    docs) echo "docs-" ;;
    monitoring) echo "mon-" ;;
    rag) echo "rag-" ;;
    tools) echo "tools-" ;;
    apps) echo "apps-" ;;
    frontend-apps) echo "frontend-apps-" ;;
    timescale) echo "timescale-" ;;
    firecrawl) echo "firecrawl-" ;;
    *) echo "${stack}-" ;;
  esac
}

start_stacks() {
  local stacks=("$@")
  if [[ ${#stacks[@]} -eq 0 ]]; then
    bash "${REPO_ROOT}/scripts/docker/start-stacks.sh"
    return
  fi

  for stack in "${stacks[@]}"; do
    if [[ "${stack}" == "all" ]]; then
      bash "${REPO_ROOT}/scripts/docker/start-stacks.sh"
      continue
    fi

    local compose_file
    compose_file="$(compose_file_for "${stack}")"
    if [[ ! -f "${compose_file}" ]]; then
      echo "⚠️  Compose file not found for stack '${stack}' (${compose_file}). Skipping." >&2
      continue
    fi
    echo "▶ Starting stack '${stack}' (${compose_file})..."
    compose -f "${compose_file}" up -d --remove-orphans
  done
}

stop_stacks() {
  local stacks=("$@")
  if [[ ${#stacks[@]} -eq 0 ]]; then
    bash "${REPO_ROOT}/scripts/docker/stop-stacks.sh"
    return
  fi

  for stack in "${stacks[@]}"; do
    if [[ "${stack}" == "all" ]]; then
      bash "${REPO_ROOT}/scripts/docker/stop-stacks.sh"
      continue
    fi

    local compose_file
    compose_file="$(compose_file_for "${stack}")"
    if [[ ! -f "${compose_file}" ]]; then
      echo "⚠️  Compose file not found for stack '${stack}' (${compose_file}). Skipping." >&2
      continue
    fi
    echo "⏹  Stopping stack '${stack}'..."
    compose -f "${compose_file}" down
  done
}

show_ps() {
  local stack="${1:-}"
  if [[ -z "${stack}" ]]; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    return
  fi

  local prefix
  prefix="$(stack_prefix "${stack}")"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" \
    | (head -n 1 && grep "^${prefix}" || true)
}

tail_logs() {
  if [[ $# -lt 1 ]]; then
    echo "logs action requires at least the stack name." >&2
    usage
    exit 1
  fi

  local stack="$1"
  shift
  local compose_file
  compose_file="$(compose_file_for "${stack}")"

  if [[ ! -f "${compose_file}" ]]; then
    echo "Compose file not found for stack '${stack}' (${compose_file})." >&2
    exit 1
  fi

  local -a service_list=()
  mapfile -t service_list < <(compose -f "${compose_file}" config --services 2>/dev/null || true)

  declare -A container_map=()
  while IFS=$'\t' read -r svc container; do
    [[ -z "$svc" ]] && continue
    container_map["$container"]="$svc"
  done < <(build_container_map "${compose_file}" 2>/dev/null || true)

  local -a selectors=("$@")
  if [[ ${#selectors[@]} -eq 0 ]]; then
    compose -f "${compose_file}" logs -f
    return
  fi

  local -a service_targets=()
  local -a container_targets=()
  for sel in "${selectors[@]}"; do
    if service_in_list "$sel" "${service_list[@]}"; then
      service_targets+=("$sel")
      continue
    fi
    local trimmed="${sel#${stack}-}"
    if service_in_list "$trimmed" "${service_list[@]}"; then
      service_targets+=("$trimmed")
      continue
    fi
    if [[ -n "${container_map[$sel]+x}" ]]; then
      service_targets+=("${container_map[$sel]}")
      continue
    fi
    container_targets+=("$sel")
  done

  if [[ ${#service_targets[@]} -eq 0 && ${#container_targets[@]} -eq 0 ]]; then
    compose -f "${compose_file}" logs -f
    return
  fi

  local -a pids=()
  if [[ ${#service_targets[@]} -gt 0 ]]; then
    compose -f "${compose_file}" logs -f "${service_targets[@]}" &
    pids+=($!)
  fi

  for container in "${container_targets[@]}"; do
    echo "Following docker logs for container ${container}..."
    docker logs -f "${container}" &
    pids+=($!)
  done

  if [[ ${#pids[@]} -gt 0 ]]; then
    trap 'for pid in "${pids[@]}"; do kill "$pid" >/dev/null 2>&1 || true; done; exit 0' INT TERM
    wait "${pids[@]}"
  fi
}

case "${ACTION}" in
  help|-h|--help)
    usage
    ;;
  start)
    start_stacks "$@"
    ;;
  stop)
    stop_stacks "$@"
    ;;
  restart)
    stop_stacks "$@"
    start_stacks "$@"
    ;;
  ps|status)
    show_ps "$@"
    ;;
  logs)
    tail_logs "$@"
    ;;
  *)
    echo "Unknown action '${ACTION}'." >&2
    usage
    exit 1
    ;;
esac
