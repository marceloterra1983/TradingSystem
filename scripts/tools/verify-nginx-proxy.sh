#!/usr/bin/env bash
set -euo pipefail

# Verify that the Nginx proxy for documentation-api is reachable and that the RAG proxy works.
# Usage: scripts/tools/verify-nginx-proxy.sh [base_url] [query]
#   base_url: http://tradingsystem.local or https://mysite:8443 (default: http://tradingsystem.local)
#   query: test (default)

RAW_BASE="${1:-http://tradingsystem.local}"
Q="${2:-test}"

# Normalize base to include scheme
if ! printf %s "$RAW_BASE" | grep -qE '^[a-z]+://'; then
  BASE="http://$RAW_BASE"
else
  BASE="$RAW_BASE"
fi

echo "[info] Base URL: $BASE"

req() {
  local method="$1"; shift
  local url="$1"; shift
  local data="${1:-}"
  if [ -n "$data" ]; then
    curl -s -X "$method" -H 'Content-Type: application/json' -w "\n%{http_code}" "$url" -d "$data"
  } else
    curl -s -X "$method" -w "\n%{http_code}" "$url"
  fi
}

echo "[step] Check /api/v1/docs/health (documentation-api)"
RESP=$(req GET "$BASE/api/v1/docs/health")
BODY=$(printf "%s" "$RESP" | sed '$d')
CODE=$(printf "%s" "$RESP" | tail -n1)
echo "HTTP $CODE"
if [ "$CODE" != "200" ]; then
  echo "[warn] /api/v1/docs/health returned HTTP $CODE"
  echo "[body] ${BODY:0:500}"
else
  echo "[ok] documentation-api reachable via proxy"
fi

echo "[step] Check RAG proxy /api/v1/rag/search"
RESP=$(req GET "$BASE/api/v1/rag/search?query=$(printf %s "$Q" | sed 's/ /%20/g')&max_results=1")
BODY=$(printf "%s" "$RESP" | sed '$d')
CODE=$(printf "%s" "$RESP" | tail -n1)
echo "HTTP $CODE"
if [ "$CODE" = "200" ]; then
  echo "[ok] RAG proxy search OK"
else
  echo "[warn] RAG proxy search failed (HTTP $CODE)"
  echo "[body] ${BODY:0:500}"
fi

echo "[step] Optional: RAG proxy /api/v1/rag/query"
RESP=$(req POST "$BASE/api/v1/rag/query" '{"query":"ping","max_results":1}')
BODY=$(printf "%s" "$RESP" | sed '$d')
CODE=$(printf "%s" "$RESP" | tail -n1)
echo "HTTP $CODE"
if [ "$CODE" = "200" ]; then
  echo "[ok] RAG proxy query OK"
else
  echo "[warn] RAG proxy query failed (HTTP $CODE)"
  echo "[body] ${BODY:0:500}"
fi

echo "[done] Verification complete"
