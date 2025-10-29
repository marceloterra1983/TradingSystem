#!/usr/bin/env bash
set -euo pipefail

# Ingest local docs into LlamaIndex ingestion service.
# Requires the compose volume mapping: ../../docs/content -> /data/docs

DIR="${1:-/data/docs}"
HOST="${LLAMAINDEX_INGEST_HOST:-http://localhost:8201}"

echo "[info] Ingesting directory: $DIR"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$HOST/ingest/directory" \
  -H 'Content-Type: application/json' \
  -d "{\"directory_path\":\"$DIR\"}")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" != "200" ]; then
  echo "[error] Ingestion request failed (HTTP $CODE)"
  echo "$BODY"
  exit 1
fi
if command -v jq >/dev/null 2>&1; then echo "$BODY" | jq .; else echo "$BODY"; fi
