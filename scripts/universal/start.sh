#!/bin/bash
# Compatibility wrapper - delegates to scripts/start.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/../start.sh" "$@"
