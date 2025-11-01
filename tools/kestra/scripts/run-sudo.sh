#!/usr/bin/env bash
# Executa Kestra (modo docker run) usando sudo (para ambientes sem acesso ao socket Docker).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -o allexport
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +o allexport
fi

PORT="${KESTRA_HTTP_PORT:-8080}"
MANAGEMENT_PORT="${KESTRA_MANAGEMENT_PORT:-8081}"
NETWORK="${KESTRA_DOCKER_NETWORK:-tradingsystem_backend}"
CONTAINER_NAME="${KESTRA_CONTAINER_NAME:-tools-kestra}"
DEFAULT_STORAGE_DIR="${SCRIPT_DIR}/../storage"
DEFAULT_WORKDIR_DIR="${SCRIPT_DIR}/../workdir"
STORAGE_DIR="${KESTRA_STORAGE_DIR:-${DEFAULT_STORAGE_DIR}}"
WORKDIR_DIR="${KESTRA_WORKDIR_DIR:-${DEFAULT_WORKDIR_DIR}}"
DB_HOST="${KESTRA_DB_HOST:-kestra-postgres}"
DB_PORT="${KESTRA_DB_PORT:-5432}"
DB_NAME="${KESTRA_DB_NAME:-kestra}"
DB_USER="${KESTRA_DB_USER:-kestra}"
DB_PASSWORD="${KESTRA_DB_PASSWORD:-}"
BASIC_AUTH_USER="${KESTRA_BASICAUTH_USERNAME:-admin@tradingsystem.local}"
BASIC_AUTH_PASS="${KESTRA_BASICAUTH_PASSWORD:-ChangeMe123!}"
DETACH=0
EXTRA_ARGS=()
CUSTOM_PORT=""
CUSTOM_MANAGEMENT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --detach|-d)
      DETACH=1
      shift
      ;;
    --port|-p)
      shift
      [[ $# -gt 0 ]] || { echo "❌ --port requer um valor."; exit 1; }
      CUSTOM_PORT="$1"
      shift
      ;;
    --management-port)
      shift
      [[ $# -gt 0 ]] || { echo "❌ --management-port requer um valor."; exit 1; }
      CUSTOM_MANAGEMENT="$1"
      shift
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do
        EXTRA_ARGS+=("$1")
        shift
      done
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -n "${CUSTOM_PORT}" ]]; then
  if [[ ! "${CUSTOM_PORT}" =~ ^[0-9]+$ ]]; then
    echo "❌ Porta inválida: ${CUSTOM_PORT}" >&2
    exit 1
  fi
  PORT="${CUSTOM_PORT}"
fi

if [[ -n "${CUSTOM_MANAGEMENT}" ]]; then
  if [[ ! "${CUSTOM_MANAGEMENT}" =~ ^[0-9]+$ ]]; then
    echo "❌ Porta de management inválida: ${CUSTOM_MANAGEMENT}" >&2
    exit 1
  fi
  MANAGEMENT_PORT="${CUSTOM_MANAGEMENT}"
fi

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "❌ KESTRA_DB_PASSWORD não configurado. Atualize o .env antes de executar." >&2
  exit 1
fi

sudo mkdir -p "${STORAGE_DIR}" "${WORKDIR_DIR}/tmp"
sudo chown "$(id -u)":"$(id -g)" "${STORAGE_DIR}" "${WORKDIR_DIR}" "${WORKDIR_DIR}/tmp"

if ! sudo docker network inspect "${NETWORK}" >/dev/null 2>&1; then
  echo "ℹ️  Criando rede Docker ${NETWORK} (sudo)..."
  sudo docker network create "${NETWORK}" >/dev/null
fi

if command -v lsof >/dev/null 2>&1; then
  if lsof -iTCP -sTCP:LISTEN -P | awk '{print $9}' | grep -q ":${PORT}\$"; then
    echo "⚠️  Porta ${PORT} já está em uso. Informe uma nova porta com --port <valor> ou defina KESTRA_HTTP_PORT." >&2
    exit 1
  fi
  if lsof -iTCP -sTCP:LISTEN -P | awk '{print $9}' | grep -q ":${MANAGEMENT_PORT}\$"; then
    echo "⚠️  Porta de management ${MANAGEMENT_PORT} já está em uso. Ajuste --management-port ou KESTRA_MANAGEMENT_PORT." >&2
    exit 1
  fi
fi

existing_id="$(sudo docker ps -aq --filter "name=^${CONTAINER_NAME}$" | head -n1 || true)"
if [[ -n "${existing_id}" ]]; then
  echo "ℹ️  Parando contêiner existente ${CONTAINER_NAME} (ID ${existing_id})..."
  sudo docker stop "${existing_id}" >/dev/null 2>&1 || true
  sudo docker rm "${existing_id}" >/dev/null 2>&1 || true
fi

DOCKER_FLAGS=(--pull=always --rm)

if (( DETACH )); then
  DOCKER_FLAGS+=(-d)
else
  DOCKER_FLAGS+=(-it)
fi

KES_TRA_CONFIG=$(cat <<EOF
datasources:
  postgres:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}
    driverClassName: org.postgresql.Driver
    username: ${DB_USER}
    password: ${DB_PASSWORD}
kestra:
  repository:
    type: postgres
  storage:
    type: local
    local:
      basePath: "/app/storage"
  queue:
    type: postgres
  server:
    basicAuth:
      username: ${BASIC_AUTH_USER}
      password: ${BASIC_AUTH_PASS}
  tasks:
    tmpDir:
      path: /tmp/kestra-wd/tmp
  url: http://localhost:8080/
EOF
)

DOCKER_RUN=(
  sudo docker run "${DOCKER_FLAGS[@]}"
  -p "${PORT}:8080"
  -p "${MANAGEMENT_PORT}:8081"
  --name "${CONTAINER_NAME}"
  --network "${NETWORK}"
  --user=root
  -v "/var/run/docker.sock:/var/run/docker.sock"
  -v "${WORKDIR_DIR}:/tmp/kestra-wd"
  -v "${STORAGE_DIR}:/app/storage"
  -e "KESTRA_CONFIGURATION=${KES_TRA_CONFIG}"
  kestra/kestra:latest
)

if [[ ${#EXTRA_ARGS[@]} -eq 0 ]]; then
  EXTRA_ARGS=(server standalone)
fi

echo "▶️  Executando Kestra (sudo) na porta ${PORT}, management ${MANAGEMENT_PORT}, rede ${NETWORK}"
echo "    storage: ${STORAGE_DIR} | workdir: ${WORKDIR_DIR}"
echo "    comando: ${DOCKER_RUN[*]} ${EXTRA_ARGS[*]}"

exec "${DOCKER_RUN[@]}" "${EXTRA_ARGS[@]}"
