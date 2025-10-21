#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ROOT_DIR_TMP=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "")
if [[ -n "$ROOT_DIR_TMP" ]]; then
  ROOT_DIR="$ROOT_DIR_TMP"
else
  ROOT_DIR="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
fi

ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env file not found at project root ($ROOT_DIR)."
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' command is required but not installed."
    exit 1
  fi
}

require_cmd psql
require_cmd jq
require_cmd python

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

EXPORT_DIR="${WEBSCRAPER_EXPORT_DIR:-/tmp/webscraper-exports}"
DATABASE_URL="${WEBSCRAPER_DATABASE_URL:-}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: WEBSCRAPER_DATABASE_URL is not defined in .env."
  exit 1
fi

parse_output="$(python - <<'PY'
import os
from urllib.parse import urlparse, unquote

url = os.environ["WEBSCRAPER_DATABASE_URL"]
parsed = urlparse(url)
print(
  (parsed.username or "postgres"),
  unquote(parsed.password or ""),
  (parsed.hostname or "localhost"),
  (parsed.port or 5432),
  (parsed.path.lstrip("/") or "webscraper")
)
PY
)"

read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME <<<"$parse_output"
export PGPASSWORD="$DB_PASSWORD"

timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

echo "[$(timestamp)] Starting export cleanup..."

EXPIRED_JSON=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At -F $'\t' <<'SQL'
SELECT id, coalesce(file_paths, '{}')::text, coalesce(file_size_bytes, 0)
FROM export_jobs
WHERE status = 'completed'
  AND expires_at < NOW();
SQL
)

if [[ -z "$EXPIRED_JSON" ]]; then
  echo "[$(timestamp)] No expired exports found. Nothing to clean."
  unset PGPASSWORD
  exit 0;
fi

total_exports=0
total_files=0
total_bytes=0

while IFS=$'\t' read -r export_id file_paths_json file_size; do
  ((total_exports++))
  total_bytes=$((total_bytes + file_size))

  if [[ -n "$file_paths_json" && "$file_paths_json" != "{}" ]]; then
    mapfile -t files < <(echo "$file_paths_json" | jq -r '.[]?')
    for file in "${files[@]}"; do
      if [[ -n "$file" ]]; then
        if rm -f "$file" 2>/dev/null; then
          ((total_files++))
        fi
      fi
    done
  fi

  export_dir="$EXPORT_DIR/$export_id"
  if [[ -d "$export_dir" ]]; then
    rm -rf "$export_dir"
  fi

  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "DELETE FROM export_jobs WHERE id = '${export_id}';" >/dev/null
done <<<"$EXPIRED_JSON"

human_bytes=$(python - <<PY
bytes_ = ${total_bytes}
suffixes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
if bytes_ == 0:
    print("0 Bytes")
else:
    import math
    i = min(int(math.log(bytes_, 1024)), len(suffixes) - 1)
    value = bytes_ / (1024 ** i)
    print(f"{value:.2f} {suffixes[i]}")
PY
)

echo "[$(timestamp)] Cleanup summary:"
echo "  • Exports removed:  $total_exports"
echo "  • Files deleted:    $total_files"
echo "  • Space reclaimed:  $human_bytes"

unset PGPASSWORD
