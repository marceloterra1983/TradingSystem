#!/usr/bin/env bash
set -euo pipefail

# Verify that the Nginx proxy for documentation-api is reachable and that the RAG proxy works.
# Usage: scripts/tools/verify-nginx-proxy.sh [base] [query]
#   base:  tradingsystem.local (default)
#   query: test (default)

BASE="${1:-tradingsystem.local}"
Q="${2:-test}"

echo "[info] Base domain: http://$BASE"

echo "[step] Check /health (documentation-api)"
code=$(curl -s -o /dev/null -w "%{http_code}" "http://$BASE/api/v1/docs/health") || true
echo "HTTP $code"
if [ "$code" != "200" ]; then
  echo "[warn] /api/v1/docs/health returned HTTP $code (check Nginx proxy to documentation-api)"
else
  echo "[ok] documentation-api reachable via proxy"
fi

echo "[step] Check RAG proxy /api/v1/rag/search"
code=$(curl -s -o /dev/null -w "%{http_code}" "http://$BASE/api/v1/rag/search?query=$(printf %s "$Q" | sed 's/ /%20/g')&max_results=1") || true
echo "HTTP $code"
if [ "$code" = "200" ]; then
  echo "[ok] RAG proxy search OK"
else
  echo "[warn] RAG proxy search failed (HTTP $code). Check JWT config and target LLAMAINDEX_QUERY_URL."
fi

echo "[step] Optional: RAG proxy /api/v1/rag/query"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://$BASE/api/v1/rag/query" -H 'Content-Type: application/json' -d '{"query":"ping","max_results":1}') || true
echo "HTTP $code"
if [ "$code" = "200" ]; then
  echo "[ok] RAG proxy query OK"
else
  echo "[warn] RAG proxy query failed (HTTP $code). If LLM is disabled, set OLLAMA_MODEL and pull it."
fi

echo "[done] Verification complete"

