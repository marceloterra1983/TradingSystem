#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

PORT="${PORT:-3205}"

npm --prefix "${DOCS_DIR}" run docs:serve -- --host 0.0.0.0 --port "${PORT}"
