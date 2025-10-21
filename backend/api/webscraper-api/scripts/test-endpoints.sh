#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3700}"
JQ_BIN="${JQ_BIN:-jq}"

RED="$(tput setaf 1 2>/dev/null || true)"
GREEN="$(tput setaf 2 2>/dev/null || true)"
YELLOW="$(tput setaf 3 2>/dev/null || true)"
BLUE="$(tput setaf 4 2>/dev/null || true)"
RESET="$(tput sgr0 2>/dev/null || true)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' command not found."
    exit 1
  fi
}

require_cmd curl
require_cmd "$JQ_BIN"

print_header() {
  printf "\n${BLUE}==> %s${RESET}\n" "$1"
}

successes=0
failures=0

run_test() {
  local method=$1
  local path=$2
  local body=${3:-}
  local description=${4:-$path}

  printf "\n${YELLOW}%s %s${RESET}\n" "$method" "$path"
  local response
  if [[ -n "$body" ]]; then
    printf "  Payload: %s\n" "$body"
    response=$(curl -s -o /tmp/webscraper-api-test.json -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "$BASE_URL$path")
  else
    response=$(curl -s -o /tmp/webscraper-api-test.json -w "%{http_code}" -X "$method" \
      "$BASE_URL$path")
  fi
  local status="$response"
  printf "  Status: %s\n" "$status"
  printf "  Response:\n"
  if [[ -s /tmp/webscraper-api-test.json ]]; then
    "$JQ_BIN" . /tmp/webscraper-api-test.json || cat /tmp/webscraper-api-test.json
  else
    echo "  (empty response body)"
  fi

  if [[ "$status" =~ ^2[0-9][0-9]$ ]]; then
    printf "${GREEN}  ✓ %s${RESET}\n" "$description"
    successes=$((successes + 1))
  else
    printf "${RED}  ✗ %s${RESET}\n" "$description"
    failures=$((failures + 1))
  fi
}

print_header "Health checks"
run_test GET "/"
run_test GET "/health"
run_test GET "/metrics"

print_header "Templates API"
create_template_payload='{"name":"CLI Template","description":"Created via test script","urlPattern":".*/cli/.*","options":{"formats":["markdown"],"onlyMainContent":true}}'
run_test POST "/api/v1/templates" "$create_template_payload" "Create template"
TEMPLATE_ID=$("$JQ_BIN" -r '.data.id // empty' /tmp/webscraper-api-test.json)
run_test GET "/api/v1/templates"
run_test GET "/api/v1/templates/${TEMPLATE_ID}"
update_template_payload='{"description":"Updated via CLI","options":{"formats":["markdown","html"],"onlyMainContent":true}}'
run_test PUT "/api/v1/templates/${TEMPLATE_ID}" "$update_template_payload" "Update template"
run_test GET "/api/v1/templates/export"
import_payload='[{"name":"CLI Imported","description":"Imported via script","options":{"formats":["markdown"],"onlyMainContent":true}}]'
run_test POST "/api/v1/templates/import" "$import_payload" "Import templates"

print_header "Jobs API"
create_job_payload=$(cat <<'JSON'
{
  "type": "scrape",
  "url": "https://cli.example.com/article",
  "status": "completed",
  "options": {
    "formats": ["markdown"],
    "onlyMainContent": true
  },
  "results": {
    "markdown": "# CLI Job"
  }
}
JSON
)
run_test POST "/api/v1/jobs" "$create_job_payload" "Create job"
JOB_ID=$("$JQ_BIN" -r '.data.id // empty' /tmp/webscraper-api-test.json)
run_test GET "/api/v1/jobs"
run_test GET "/api/v1/jobs?status=completed&type=scrape"
run_test GET "/api/v1/jobs/${JOB_ID}"
run_test POST "/api/v1/jobs/${JOB_ID}/rerun" "" "Rerun job"
run_test DELETE "/api/v1/jobs/${JOB_ID}"

print_header "Statistics API"
run_test GET "/api/v1/statistics"
run_test GET "/api/v1/statistics?dateFrom=2024-01-01&dateTo=2024-12-31"

print_header "Error handling"
run_test GET "/api/v1/jobs/invalid-id" "" "Invalid UUID"
run_test GET "/api/v1/jobs/00000000-0000-0000-0000-000000000000" "" "Missing resource"
invalid_payload='{"type":"crawl","url":"bad-url","status":"unknown","options":"invalid"}'
run_test POST "/api/v1/jobs" "$invalid_payload" "Validation error"

TOTAL=$((successes + failures))
printf "\n${BLUE}Summary:${RESET} %d tests, ${GREEN}%d passed${RESET}, ${RED}%d failed${RESET}\n" "$TOTAL" "$successes" "$failures"

[[ $failures -eq 0 ]]
