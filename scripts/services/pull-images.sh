#!/usr/bin/env bash
set -euo pipefail

version="${IMG_VERSION:-2025.10.19}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for docker inspect parsing. Install jq and retry."
  exit 1
fi

images=($(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^img-' || true))

if [[ ${#images[@]} -eq 0 ]]; then
  echo "No img-* images found locally."
  exit 0
fi

for image in "${images[@]}"; do
  repo="${image%%:*}"
  echo "Pulling ${repo}:${version}"
  docker pull "${repo}:${version}" || echo "Failed to pull ${repo}:${version}"
done
