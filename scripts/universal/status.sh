#!/bin/bash
# Compatibility wrapper - delegates to scripts/status.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/../status.sh" "$@"
