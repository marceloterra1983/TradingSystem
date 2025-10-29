#!/usr/bin/env bash
set -euo pipefail

# Installer + runner: NVIDIA Container Toolkit, GPU-enabled Ollama, LlamaIndex services, and validation.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

step() { echo -e "\n[step] $*"; }
ok() { echo "[ok] $*"; }
warn() { echo "[warn] $*"; }
err() { echo "[error] $*" >&2; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || { err "Missing: $1"; exit 1; }; }

need_cmd sudo
need_cmd curl
need_cmd docker

install_toolkit() {
  step "Install NVIDIA Container Toolkit (attempt Ubuntu repo first)"
  if sudo apt-get update -y && sudo apt-get install -y nvidia-container-toolkit; then
    ok "Installed from Ubuntu repositories"
    return 0
  fi

  warn "Ubuntu repo install failed. Falling back to NVIDIA official repository (stable)."
  sudo rm -f /etc/apt/sources.list.d/nvidia-container-toolkit.list || true
  sudo install -d /usr/share/keyrings
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
    | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  # Use stable 22.04 list as a fallback (works for 24.04 in practice)
  curl -fsSL https://nvidia.github.io/libnvidia-container/stable/ubuntu22.04/amd64/nvidia-container-toolkit.list \
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#' \
    | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y nvidia-container-toolkit
}

configure_docker_runtime() {
  step "Configure Docker runtime for NVIDIA and restart"
  if command -v nvidia-ctk >/dev/null 2>&1; then
    sudo nvidia-ctk runtime configure --runtime=docker || true
  else
    warn "nvidia-ctk not found; assuming Docker already configured or using legacy runtime"
  fi
  sudo systemctl restart docker
}

validate_gpu_docker() {
  step "Validate GPU in Docker"
  if docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi >/dev/null 2>&1; then
    ok "GPU visible to Docker"
  else
    warn "GPU not visible in Docker. Ensure drivers and NVIDIA Container Toolkit are installed and Docker restarted."
  fi
}

persist_env() {
  step "Persist GPU + LLM + JWT preferences in .env"
  touch .env
  set_kv() {
    local key="$1"; shift; local val="$1"
    if grep -q "^${key}=" .env; then
      sed -i "s#^${key}=.*#${key}=${val}#" .env
    else
      echo "${key}=${val}" >> .env
    fi
  }
  set_kv FORCE_OLLAMA_CONTAINER 1
  set_kv OLLAMA_PORT 11435
  set_kv OLLAMA_EMBEDDING_MODEL nomic-embed-text
  set_kv OLLAMA_MODEL llama3
  set_kv JWT_SECRET_KEY dev-secret
  set_kv JWT_ALGORITHM HS256
}

start_stack() {
  step "Start full stack (Qdrant, Ollama GPU, LlamaIndex services)"
  export FORCE_OLLAMA_CONTAINER=1
  export OLLAMA_PORT=11435
  bash scripts/docker/start-llamaindex-local.sh
}

ensure_models() {
  step "Ensure embeddings model inside Ollama container"
  local embed_model="${OLLAMA_EMBED_MODEL:-${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}}"
  if ! docker exec ollama ollama list | grep -iq "^${embed_model}\b"; then
    docker exec ollama ollama pull "$embed_model" || true
  fi

  # Also ensure chat/completion model if configured
  if [ -n "${OLLAMA_MODEL:-}" ]; then
    step "Ensure chat model '$OLLAMA_MODEL' inside Ollama container"
    if ! docker exec ollama ollama list | grep -iq "^${OLLAMA_MODEL}\b"; then
      docker exec ollama ollama pull "$OLLAMA_MODEL" || true
    fi
  fi
}

run_ingest_and_validate() {
  step "Run ingestion of local docs"
  bash scripts/docker/ingest-local-docs.sh || true

  step "Validate services and sample queries"
  bash scripts/docker/validate-llamaindex-local.sh || true
}

install_toolkit
configure_docker_runtime
validate_gpu_docker
persist_env
start_stack
ensure_models
run_ingest_and_validate

ok "GPU installation + stack startup + validation finished"
