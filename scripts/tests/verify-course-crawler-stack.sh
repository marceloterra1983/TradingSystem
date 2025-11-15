#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COURSE_STACK="$ROOT_DIR/tools/compose/docker-compose.4-5-course-crawler-stack.yml"
GATEWAY_STACK="$ROOT_DIR/tools/compose/docker-compose.0-gateway-stack.yml"

info() {
  echo -e "[$(date +'%H:%M:%S')] $*"
}

HOST_HEADER="${HOST_HEADER:-localhost}"

docker_curl() {
  docker run --rm --network tradingsystem_backend curlimages/curl:7.88.1 \
    -H "Host: ${HOST_HEADER}" "$@"
}

run_curl() {
  local url="$1"
  docker_curl -fsSL -o /dev/null -w "%{http_code}" "$url"
}

info "Ensuring Traefik gateway is running..."
docker compose -f "$GATEWAY_STACK" up -d traefik >/dev/null

info "Bringing Course Crawler stack online..."
docker compose -f "$COURSE_STACK" up -d \
  course-crawler-db \
  course-crawler-db-init \
  course-crawler-api \
  course-crawler-worker \
  course-crawler-ui \
  docker-control-server >/dev/null

info "Checking UI availability via gateway..."
ui_status="$(run_curl "http://api-gateway:9080/apps/course-crawler/")"
if [[ "$ui_status" != "200" ]]; then
  echo "❌ UI check failed. HTTP status: $ui_status"
  exit 1
fi

info "Checking hashed asset delivery..."
index_html="$(docker_curl -fsSL http://api-gateway:9080/apps/course-crawler/)"
asset_path="$(echo "$index_html" | grep -o 'assets/index-[^"]*\.js' | head -n1 || true)"
if [[ -z "$asset_path" ]]; then
  echo "❌ Could not determine hashed asset name from index.html"
  exit 1
fi
asset_status="$(run_curl "http://api-gateway:9080/apps/course-crawler/${asset_path}")"
if [[ "$asset_status" != "200" ]]; then
  echo "❌ Asset check failed. HTTP status: $asset_status"
  exit 1
fi

info "Checking API health through gateway..."
api_status="$(run_curl "http://api-gateway:9080/api/course-crawler/health")"
if [[ "$api_status" != "200" ]]; then
  echo "❌ API health check failed. HTTP status: $api_status"
  exit 1
fi

info "✅ Course Crawler stack validated successfully."

