#!/usr/bin/env bash
set -euo pipefail

# Temporary launcher for local LlamaIndex stack (Qdrant + Ollama + services)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "[info] Repo root: $REPO_ROOT"

# Load .env into this shell (so FORCE_OLLAMA_CONTAINER / OLLAMA_PORT are honored)
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$REPO_ROOT/.env"
  set +a
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[error] Missing dependency: $1" >&2
    exit 1
  }
}

need_cmd docker
need_cmd curl

dc() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

wait_http() {
  local url="$1"; local name="$2"; local attempts="${3:-60}"; local sleep_s="${4:-2}"
  for i in $(seq 1 "$attempts"); do
    if curl -sf "$url" >/dev/null; then
      echo "[ok] $name is up"
      return 0
    fi
    sleep "$sleep_s"
  done
  echo "[error] $name did not become ready in time ($attempts attempts)" >&2
  return 1
}

# Resolve embedding model early (read env or fallback)
EMBED_MODEL="${OLLAMA_EMBED_MODEL:-${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}}"

echo "[step] Ensure shared network tradingsystem_backend"
if ! docker network ls --format '{{.Name}}' | grep -qx tradingsystem_backend; then
  docker network create tradingsystem_backend >/dev/null
  echo "[ok] Created network tradingsystem_backend"
else
  echo "[ok] Network tradingsystem_backend already exists"
fi

echo "[step] Start Qdrant"
dc -f tools/compose/docker-compose.database.yml up -d qdrant
# Ensure Qdrant container is on shared network
docker network connect tradingsystem_backend data-qdrant 2>/dev/null || true
wait_http "http://localhost:6333/collections" "Qdrant"

echo "[step] Start/Detect Ollama"
# Detect if host already has something on 11434
OLLAMA_PORT_IN_USE=0
if command -v ss >/dev/null 2>&1; then
  if ss -ltn | awk '{print $4}' | grep -qE '(^|:)11434$'; then OLLAMA_PORT_IN_USE=1; fi
elif command -v lsof >/dev/null 2>&1; then
  if lsof -i :11434 -sTCP:LISTEN >/dev/null 2>&1; then OLLAMA_PORT_IN_USE=1; fi
fi

# Allow forcing container usage (GPU-enabled) even if host Ollama is running
if [ "${FORCE_OLLAMA_CONTAINER:-0}" = "1" ]; then
  export OLLAMA_PORT="${OLLAMA_PORT:-11435}"
  OLLAMA_PORT_IN_USE=0
  echo "[info] FORCE_OLLAMA_CONTAINER enabled. Will start Ollama container on port ${OLLAMA_PORT}."
fi

if [ "$OLLAMA_PORT_IN_USE" -eq 1 ]; then
  echo "[info] Port 11434 is in use — assuming a host Ollama is already running."
  echo "[info] Will point services to host Ollama via host.docker.internal."
  export OLLAMA_BASE_URL="http://host.docker.internal:11434"
  # Ensure host alias is resolvable from containers (compose adds it via extra_hosts)
  wait_http "http://localhost:11434/api/tags" "Ollama (host)"

  # If embedding model is missing on host, start a dedicated container on 11435
  HOST_TAGS_JSON="$(curl -s http://localhost:11434/api/tags || echo '{}')"
  if ! echo "$HOST_TAGS_JSON" | grep -iq "\"$EMBED_MODEL\""; then
    echo "[info] Host Ollama does not have '$EMBED_MODEL'. Starting dedicated container on 11435..."
    export OLLAMA_PORT=11435
    dc -f tools/compose/docker-compose.individual.yml up -d ollama
    docker network connect tradingsystem_backend ollama 2>/dev/null || true
    wait_http "http://localhost:11435/api/tags" "Ollama (container@11435)"

    # Check GPU visibility inside container
    if docker exec ollama nvidia-smi >/dev/null 2>&1; then
      echo "[ok] GPU detected in Ollama container (nvidia-smi)"
    else
      echo "[warn] GPU not visible to Ollama container. If you expect GPU, install NVIDIA Container Toolkit and ensure drivers are available."
    fi

    # Ensure embedding model exists in the container (pull + wait)
    if ! docker exec ollama ollama list | grep -iq "$EMBED_MODEL"; then
      echo "[step] Pulling embedding model '$EMBED_MODEL' into container..."
      docker exec ollama ollama pull "$EMBED_MODEL" || true
      echo "[step] Waiting for embedding model '$EMBED_MODEL' to be available..."
      for i in {1..60}; do
        if docker exec ollama ollama list | grep -iq "$EMBED_MODEL"; then
          echo "[ok] Embedding model available in container"
          break
        fi
        sleep 2
        if [ "$i" -eq 60 ]; then
          echo "[warn] Embedding model still not visible in container after waiting"
        fi
      done
    fi
    # Point services to the container on the Docker network
    export OLLAMA_BASE_URL="http://ollama:11434"
  fi
else
  dc -f tools/compose/docker-compose.individual.yml up -d ollama
  # Ensure Ollama container is on shared network
  docker network connect tradingsystem_backend ollama 2>/dev/null || true
  wait_http "http://localhost:${OLLAMA_PORT:-11434}/api/tags" "Ollama (container)"
  # Check GPU visibility inside container
  if docker exec ollama nvidia-smi >/dev/null 2>&1; then
    echo "[ok] GPU detected in Ollama container (nvidia-smi)"
  else
    echo "[warn] GPU not visible to Ollama container. If you expect GPU, install NVIDIA Container Toolkit and ensure drivers are available."
  fi
  # Ensure embedding model exists in the container (pull + wait)
  if ! docker exec ollama ollama list | grep -iq "$EMBED_MODEL"; then
    echo "[step] Pulling embedding model '$EMBED_MODEL' into container..."
    docker exec ollama ollama pull "$EMBED_MODEL" || true
    echo "[step] Waiting for embedding model '$EMBED_MODEL' to be available..."
    for i in {1..60}; do
      if docker exec ollama ollama list | grep -iq "$EMBED_MODEL"; then
        echo "[ok] Embedding model available in container"
        break
      fi
      sleep 2
      if [ "$i" -eq 60 ]; then
        echo "[warn] Embedding model still not visible in container after waiting"
      fi
    done
  fi
  export OLLAMA_BASE_URL="http://ollama:11434"
fi

# Optional: check final target for embedding model
# If services point to Docker DNS (ollama:11434), use host port (11435 when container is used)
if [[ "$OLLAMA_BASE_URL" == http://ollama:* ]] || [[ "$OLLAMA_BASE_URL" == *"ollama:11434"* ]]; then
  TARGET_URL="http://localhost:${OLLAMA_PORT:-11434}"
else
  TARGET_URL="${OLLAMA_BASE_URL/http:\/\/host.docker.internal:http:\/\/localhost}"
fi
if ! curl -s "$TARGET_URL/api/tags" | grep -iq "\"$EMBED_MODEL\""; then
  echo "[warn] Embedding model '$EMBED_MODEL' still not visible at $TARGET_URL."
  echo "       Use one of: 'ollama pull $EMBED_MODEL' (host) ou 'docker exec ollama ollama pull $EMBED_MODEL' (container)."
fi

echo "[step] Build LlamaIndex images"
dc -f tools/compose/docker-compose.infrastructure.yml build llamaindex-ingestion llamaindex-query

echo "[step] Start LlamaIndex services"
dc -f tools/compose/docker-compose.infrastructure.yml up -d --force-recreate llamaindex-ingestion llamaindex-query

wait_http "http://localhost:8201/health" "Ingestion service"
wait_http "http://localhost:8202/health" "Query service"

echo
echo "[success] All services are up"
echo "- Qdrant:          http://localhost:6333"
echo "- Ollama:          http://localhost:${OLLAMA_PORT:-11434}"
echo "- Ingestion API:   http://localhost:8201"
echo "- Query API:       http://localhost:8202"
echo
if [ -z "${OLLAMA_MODEL:-}" ]; then
  echo "[note] /query exige LLM local. Defina OLLAMA_MODEL (ex.: llama3) no seu .env para habilitar respostas geradas."
fi
