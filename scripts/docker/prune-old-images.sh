#!/usr/bin/env bash
set -euo pipefail

KEEP_VERSIONS=${KEEP_VERSIONS:-3}

list_tags() {
  docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' \
    | awk '$1 ~ /^img-/ {print $1}' \
    | sed 's/^img-//' \
    | awk -F: '{print $1":"$2}'
}

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 1
fi

mapfile -t images < <(docker images --format '{{.Repository}}' | grep '^img-' | sort -u)

for repo in "${images[@]}"; do
  mapfile -t tags < <(docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' \
    | awk -v r="${repo}" '$1 ~ "^"r":" {print $1}' \
    | sort -t: -k2 -r)

  if (( ${#tags[@]} <= KEEP_VERSIONS )); then
    continue
  fi

  to_delete=("${tags[@]:KEEP_VERSIONS}")
  for tag in "${to_delete[@]}"; do
    echo "Removing old image ${tag}"
    docker rmi "${tag}" || echo "Failed to remove ${tag}"
  done
done
