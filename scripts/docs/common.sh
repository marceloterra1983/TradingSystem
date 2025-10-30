#!/usr/bin/env bash

set -euo pipefail

# Resolve repository root relative to this script location.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCS_DIR="${REPO_ROOT}/docs"

export REPO_ROOT DOCS_DIR

if [[ ! -d "${DOCS_DIR}" ]]; then
  echo "docs workspace not found at ${DOCS_DIR}" >&2
  exit 1
fi
