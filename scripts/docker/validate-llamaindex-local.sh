#!/usr/bin/env bash
set -euo pipefail

# Validation script for local LlamaIndex stack (Qdrant + Ollama + services)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "[info] Repo root: $REPO_ROOT"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[error] Missing dependency: $1" >&2
    exit 1
  }
}

need_cmd docker
need_cmd curl

json_get() {
  # Simple JSON field extractor (without jq) for flat key
  local key="$1"
  sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\{0,1\}\([^\",}]*\)\"\{0,1\}.*/\1/p"
}

status() {
  echo "[step] $*"
}

ok() {
  echo "[ok] $*"
}

warn() {
  echo "[warn] $*"
}

err() {
  echo "[error] $*" >&2
}

assert_http_ok() {
  local url="$1"; local name="$2"
  if curl -sf "$url" >/dev/null; then
    ok "$name reachable"
  else
    err "$name not reachable: $url"
    exit 1
  fi
}

# 1) Check Qdrant
status "Check Qdrant"
assert_http_ok "http://localhost:6333/collections" "Qdrant"

# 2) Determine Ollama endpoint
status "Determine Ollama endpoint"
OLLAMA_HTTP=""
if curl -sf http://localhost:11434/api/tags >/dev/null; then
  OLLAMA_HTTP="http://localhost:11434"
elif curl -sf http://localhost:11435/api/tags >/dev/null; then
  OLLAMA_HTTP="http://localhost:11435"
fi

if [ -z "$OLLAMA_HTTP" ]; then
  warn "No local Ollama detected on 11434/11435. Proceeding, but services may not work."
else
  ok "Ollama detected at $OLLAMA_HTTP"
fi

# 3) Check embedding model presence
EMBED_MODEL="${OLLAMA_EMBED_MODEL:-${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}}"
if [ -n "$OLLAMA_HTTP" ]; then
  TAGS_JSON="$(curl -s "$OLLAMA_HTTP/api/tags" || echo '{"models":[]}')"
  if echo "$TAGS_JSON" | grep -iq "\"$EMBED_MODEL\""; then
    ok "Embedding model present: $EMBED_MODEL"
  else
    warn "Embedding model not found at $OLLAMA_HTTP: $EMBED_MODEL"
  fi
fi

# 4) Verify containers are up
status "Check containers"
docker ps --format 'table {{.Names}}\t{{.Status}}' | sed -n '1,200p'

# 5) Check services health
status "Check ingestion service health"
if curl -sf http://localhost:8201/health >/dev/null; then
  ok "Ingestion service reachable"
else
  err "Ingestion service not reachable: http://localhost:8201/health"
  echo "--- logs: tools-llamaindex-ingestion (last 200 lines) ---"
  docker logs --tail 200 tools-llamaindex-ingestion || true
  exit 1
fi

status "Check query service health"
if curl -sf http://localhost:8202/health >/dev/null; then
  ok "Query service reachable"
else
  err "Query service not reachable: http://localhost:8202/health"
  echo "--- logs: tools-llamaindex-query (last 200 lines) ---"
  docker logs --tail 200 tools-llamaindex-query || true
  exit 1
fi

# 6) Connectivity to Ollama from inside query container
status "Check OLLAMA_BASE_URL from query container"
if docker ps --format '{{.Names}}' | grep -qx tools-llamaindex-query; then
  Q_OLLAMA_URL="$(docker exec tools-llamaindex-query printenv OLLAMA_BASE_URL || true)"
  echo "Query container OLLAMA_BASE_URL: ${Q_OLLAMA_URL:-<unset>}"
  if [ -n "$Q_OLLAMA_URL" ]; then
    docker exec tools-llamaindex-query bash -lc "curl -sf \"$Q_OLLAMA_URL/api/tags\" | head -c 200 >/dev/null" \
      && ok "Query container reaches Ollama" \
      || warn "Query container cannot reach Ollama at $Q_OLLAMA_URL"
  fi
fi

# 7) Ingest a temp document inside ingestion container
status "Ingest a small test document"
if docker ps --format '{{.Names}}' | grep -qx tools-llamaindex-ingestion; then
  docker exec tools-llamaindex-ingestion bash -lc "cat >/tmp/li_validation.md <<'EOF'
# Teste
Documento de validação LlamaIndex.
EOF"
  if curl -sf -X POST http://localhost:8201/ingest/document \
    -H 'Content-Type: application/json' \
    -d '{"file_path":"/tmp/li_validation.md"}' >/dev/null; then
    ok "Ingestion ok"
  else
    warn "Ingestion failed"
    echo "--- logs: tools-llamaindex-ingestion (last 200 lines) ---"
    docker logs --tail 200 tools-llamaindex-ingestion || true
  fi
else
  warn "Ingestion container not found"
fi

# 8) Create auth token from query container and test /search
status "Test /search (semantic search without LLM)"
if docker ps --format '{{.Names}}' | grep -qx tools-llamaindex-query; then
  SECRET=$(docker exec tools-llamaindex-query printenv JWT_SECRET_KEY || true)
  if [ -z "$SECRET" ]; then
    warn "JWT_SECRET_KEY not set in query container; skipping /search auth test."
  else
    TOKEN="$(docker exec -i tools-llamaindex-query python3 - <<'PY'
from jose import jwt
import os, time
secret=os.environ.get('JWT_SECRET_KEY')
alg=os.environ.get('JWT_ALGORITHM','HS256')
print(jwt.encode({'sub':'dev','exp':int(time.time())+3600}, secret, algorithm=alg))
PY
    )"
  if [ -n "$TOKEN" ]; then
      # Use ASCII-only query to avoid HTTP parser issues
      RESP=$(curl -s -w "\n%{http_code}" "http://localhost:8202/search?query=test&max_results=2" -H "Authorization: Bearer $TOKEN")
      BODY=$(echo "$RESP" | sed '$d')
      CODE=$(echo "$RESP" | tail -n1)
      if [ "$CODE" = "200" ]; then
        ok "/search ok"
      else
        warn "/search failed (HTTP $CODE)"
        echo "$BODY"
        echo "--- logs: tools-llamaindex-query (last 200 lines) ---"
        docker logs --tail 200 tools-llamaindex-query || true
        echo "--- env JWT in query container ---"
        docker exec tools-llamaindex-query /bin/sh -lc 'printenv | grep -E "^JWT_|^OLLAMA_"' || true
      fi
    else
      warn "Failed to mint JWT (python/jose missing or other error)."
    fi
  fi
else
  warn "Query container not found"
fi

# 9) Test /query if LLM is configured
status "Test /query (only if OLLAMA_MODEL configured)"
if docker ps --format '{{.Names}}' | grep -qx tools-llamaindex-query; then
  OMODEL="$(docker exec tools-llamaindex-query printenv OLLAMA_MODEL || true)"
  if [ -n "$OMODEL" ] && [ -n "${TOKEN:-}" ]; then
    RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8202/query \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"query":"resuma o documento de teste","max_results":2}')
    BODY=$(echo "$RESP" | sed '$d')
    CODE=$(echo "$RESP" | tail -n1)
    if [ "$CODE" = "200" ]; then
      ok "/query ok (LLM: $OMODEL)"
    else
      warn "/query failed (HTTP $CODE)"
      echo "$BODY"
      echo "--- logs: tools-llamaindex-query (last 200 lines) ---"
      docker logs --tail 200 tools-llamaindex-query || true
      echo "--- env LLM in query container ---"
      docker exec tools-llamaindex-query /bin/sh -lc 'printenv | grep -E "^JWT_|^OLLAMA_"' || true
    fi
  else
    warn "OLLAMA_MODEL not set or TOKEN missing; skipping /query test."
  fi
fi

echo
ok "Validation complete"
