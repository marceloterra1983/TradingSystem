#!/usr/bin/env bash
set -euo pipefail

# Filesystem MCP launcher for TradingSystem
# Uses MCP_FS_ROOT if provided; otherwise defaults to repo root.

ROOT_DIR=${MCP_FS_ROOT:-}
if [[ -z "${ROOT_DIR}" ]]; then
  # Try to resolve repo root; fallback to current directory
  if command -v git >/dev/null 2>&1; then
    ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
  else
    ROOT_DIR=$(pwd)
  fi
fi

echo "[MCP] Starting Filesystem server at: ${ROOT_DIR}"
exec npx -y @modelcontextprotocol/server-filesystem "${ROOT_DIR}"

