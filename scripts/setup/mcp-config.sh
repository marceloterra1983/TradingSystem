#!/usr/bin/env bash
set -euo pipefail

# Print a ready-to-paste MCP servers block for user-level config (e.g., ~/.claude.json)
# It reads .claude/mcp-servers.json from repo root and performs optional env substitution.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
TEMPLATE_FILE="$ROOT_DIR/.claude/mcp-servers.json"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Template not found: $TEMPLATE_FILE" 1>&2
  exit 1
fi

echo "# --- MCP servers (TradingSystem) ---"
echo "# Paste under your client's servers section (e.g., ~/.claude.json)."
echo "# Ensure you have set: GITHUB_TOKEN, MCP_GITHUB_REPO or MCP_GITHUB_ORG, MCP_POSTGRES_URL."

if command -v envsubst >/dev/null 2>&1; then
  MCP_FS_ROOT_ABS="${MCP_FS_ROOT:-$ROOT_DIR}"
  export MCP_FS_ROOT="$MCP_FS_ROOT_ABS"
  envsubst < "$TEMPLATE_FILE"
else
  # Fallback: emit as-is
  cat "$TEMPLATE_FILE"
fi

