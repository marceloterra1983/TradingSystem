#!/usr/bin/env bash
set -euo pipefail

# Helper: Mint a JWT and call LlamaIndex /search and /query

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

QUERY_HOST="${LLAMAINDEX_QUERY_HOST:-http://localhost:8202}"
JWT_SECRET_KEY="${JWT_SECRET_KEY:-dev-secret}"
JWT_ALGORITHM="${JWT_ALGORITHM:-HS256}"

QUERY_TEXT="${1:-test query}"
MAX_RESULTS="${2:-3}"

echo "[info] Query host: $QUERY_HOST"
echo "[info] Query text: $QUERY_TEXT"

# Mint token using python-jose via a throwaway inline script
TOKEN=$(python3 - <<PY
from jose import jwt
import os, time
secret=os.environ.get('JWT_SECRET_KEY','dev-secret')
alg=os.environ.get('JWT_ALGORITHM','HS256')
print(jwt.encode({'sub':'dev','exp':int(time.time())+3600}, secret, algorithm=alg))
PY
)

if [ -z "$TOKEN" ]; then
  echo "[error] Failed to mint JWT token" >&2
  exit 1
fi

echo "[step] /search"
curl -sS "$QUERY_HOST/search?query=$(printf %s "$QUERY_TEXT" | sed 's/ /%20/g')&max_results=$MAX_RESULTS" \
  -H "Authorization: Bearer $TOKEN" | sed -e 's/{"headers":{[^}]*}}//' | head -c 2000; echo

echo "[step] /query"
curl -sS -X POST "$QUERY_HOST/query" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\":\"$QUERY_TEXT\",\"max_results\":$MAX_RESULTS}" | head -c 2000; echo

