#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

npm --prefix "${DOCS_DIR}" run docs:build "$@"
