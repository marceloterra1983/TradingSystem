#/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <local-name> <source-image[:tag]>"
  echo "Example: $0 data-timescaledb timescale/timescaledb:2.15.2-pg15"
  exit 1
fi

name="$1"
source="$2"
version="${IMG_VERSION:-2025.10.19}"

echo "Retagging ${source} -> img-${name}:${version}"
docker pull "${source}"
docker tag "${source}" "img-${name}:${version}"
