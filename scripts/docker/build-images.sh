#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_VERSION="2025.10.19"
IMG_VERSION="${IMG_VERSION:-$DEFAULT_VERSION}"
PLATFORM="${IMG_PLATFORM:-linux/amd64}"

log() { echo -e "[$(date +'%H:%M:%S')] $*"; }

retag_image() {
  local name="$1"
  local source="$2"
  log "Retagging ${source} -> img-${name}:${IMG_VERSION}"
  docker pull "${source}" >/dev/null
  docker tag "${source}" "img-${name}:${IMG_VERSION}"
}

build_image() {
  local name="$1"
  local context="$2"
  local dockerfile="${3:-Dockerfile}"
  local absolute_context="${REPO_ROOT}/${context}"
  log "Building img-${name}:${IMG_VERSION} from ${context}/${dockerfile}"
  docker build \
    --platform "${PLATFORM}" \
    -f "${absolute_context}/${dockerfile}" \
    -t "img-${name}:${IMG_VERSION}" \
    "${absolute_context}"
}

main() {
  log "Using IMG_VERSION=${IMG_VERSION} PLATFORM=${PLATFORM}"

  # Base images retagged from upstream registries
  local base_images=(
    "data-frontend-apps=timescale/timescaledb:2.16.1-pg16"
    "infra-postgres-dev=postgres:16-alpine"
    "data-qdrant=qdrant/qdrant:v1.15.1"
    "data-questdb=questdb/questdb:8.2.1"
    "mon-prometheus=prom/prometheus:v2.54.1"
    "mon-alertmanager=prom/alertmanager:v0.27.0"
    "mon-grafana=grafana/grafana:11.3.0"
    "mon-node-exporter=prom/node-exporter:v1.8.2"
    "outros-containers-registry=registry:2"
    "ollama=ollama/ollama:latest"
    "firecrawl-redis=redis:alpine"
  )

  for item in "${base_images[@]}"; do
    IFS="=" read -r name source <<<"${item}"
    retag_image "${name}" "${source}"
  done

  # Custom builds (Node/Python services)
  build_image "docs-api" "backend/api/documentation-api" "Dockerfile.simple"
  build_image "docs-api-viewer" "tools/docs-api"
  build_image "infra-llamaindex-ingestion" "tools/llamaindex" "Dockerfile.ingestion"
  build_image "infra-llamaindex-query" "tools/llamaindex" "Dockerfile.query"
  build_image "mon-alert-router" "tools/monitoring/alert-router"
  build_image "firecrawl-api" "tools/firecrawl/firecrawl-source/apps/api"
  build_image "firecrawl-playwright" "tools/firecrawl/firecrawl-source/apps/playwright-service-ts"
  build_image "firecrawl-postgres" "tools/firecrawl/firecrawl-source/apps/nuq-postgres"

  log "Image build/retag complete."
}

main "$@"
