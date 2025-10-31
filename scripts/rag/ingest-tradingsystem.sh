#!/usr/bin/env bash
set -euo pipefail

# Ingest the full TradingSystem repository into a dedicated Qdrant collection.
#
# Usage:
#   scripts/rag/ingest-tradingsystem.sh \
#       --dir /data/tradingsystem \
#       --collection tradingsystem \
#       --allowed '*' \
#       --exclude '.git,.github,node_modules,dist,build,.cache,.venv' \
#       --max-mb 16
#
# All options are optional; sensible defaults are provided for the TradingSystem stack.

HOST=${LLAMAINDEX_INGEST_HOST:-http://localhost:8201}
DIR="/data/tradingsystem"
COLLECTION="tradingsystem"
ALLOWED="*"
EXCLUDE=".git,.github,.gitlab,.vscode,.idea,node_modules,dist,build,.cache,.next,.nuxt,tmp,temp,.venv,venv"
MAX_MB="16"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST="$2"
      shift 2
      ;;
    --dir)
      DIR="$2"
      shift 2
      ;;
    --collection)
      COLLECTION="$2"
      shift 2
      ;;
    --allowed)
      ALLOWED="$2"
      shift 2
      ;;
    --exclude)
      EXCLUDE="$2"
      shift 2
      ;;
    --max-mb)
      MAX_MB="$2"
      shift 2
      ;;
    --help|-h)
      cat <<'USAGE'
Usage: ingest-tradingsystem.sh [options]

Options:
  --host URL           LlamaIndex ingestion service URL (default: http://localhost:8201)
  --dir PATH           Directory to ingest (default: /data/tradingsystem)
  --collection NAME    Target Qdrant collection (default: tradingsystem)
  --allowed LIST       Comma-separated extensions or '*' (default: *)
  --exclude LIST       Comma-separated directories to skip (default: common build/cache dirs)
  --max-mb VALUE       Max file size in MB (<=0 disables, default: 16)
  -h, --help           Show this help
USAGE
      exit 0
      ;;
    *)
      echo "[error] Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$DIR" ]]; then
  echo "[warn] Directory not found locally: $DIR (expecting volume inside ingestion service)" >&2
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[error] curl is required" >&2
  exit 1
fi

PYTHON_BIN=${PYTHON_BIN:-python3}
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  if command -v python >/dev/null 2>&1; then
    PYTHON_BIN=python
  else
    echo "[error] python3 (or python) is required to build the payload" >&2
    exit 1
  fi
fi

PAYLOAD=$(
  DIR_PATH="$DIR" \
  COLLECTION_NAME="$COLLECTION" \
  ALLOWED_INPUT="$ALLOWED" \
  EXCLUDE_INPUT="$EXCLUDE" \
  MAX_MB_VALUE="$MAX_MB" \
  "$PYTHON_BIN" - <<'PY'
import json
import os

dir_path = os.environ["DIR_PATH"]
collection = os.environ["COLLECTION_NAME"]
allowed_raw = os.environ.get("ALLOWED_INPUT", "").strip()
exclude_raw = os.environ.get("EXCLUDE_INPUT", "").strip()
max_mb_raw = os.environ.get("MAX_MB_VALUE", "").strip()

payload = {
    "directory_path": dir_path,
    "collection_name": collection,
}

if allowed_raw:
    lowered = allowed_raw.lower()
    if lowered in {"*", "all"}:
        payload["allowed_extensions"] = ["*"]
    else:
        payload["allowed_extensions"] = [
            item.strip() for item in allowed_raw.split(",") if item.strip()
        ]

if exclude_raw:
    payload["exclude_dirs"] = [
        item.strip() for item in exclude_raw.split(",") if item.strip()
    ]

if max_mb_raw:
    try:
        payload["max_file_size_mb"] = float(max_mb_raw)
    except ValueError:
        raise SystemExit(f"Invalid --max-mb value: {max_mb_raw}")

print(json.dumps(payload))
PY
)

echo "[info] Triggering ingestion"
echo "        host:        $HOST"
echo "        directory:   $DIR"
echo "        collection:  $COLLECTION"
echo "        allowed:     $ALLOWED"
echo "        exclude:     $EXCLUDE"
echo "        max size MB: $MAX_MB"

HTTP_BODY=$(mktemp)
HTTP_STATUS=$(curl -s -w "%{http_code}" -o "$HTTP_BODY" \
  -X POST "$HOST/ingest/directory" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD")

echo "[info] Response status: $HTTP_STATUS"
if command -v jq >/dev/null 2>&1; then
  jq . "$HTTP_BODY"
else
  cat "$HTTP_BODY"
fi

rm -f "$HTTP_BODY"

if [[ "$HTTP_STATUS" != "200" ]]; then
  exit 1
fi
