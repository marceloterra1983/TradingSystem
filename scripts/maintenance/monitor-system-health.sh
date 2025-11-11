#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - System Health Monitor
# ==============================================================================
# Automated monitoring script that checks system health and sends alerts
# when issues are detected.
#
# Part of: Phase 1.7 - Health Checks (Improvement Plan v1.0)
#
# Usage:
#   bash scripts/maintenance/monitor-system-health.sh
#   bash scripts/maintenance/monitor-system-health.sh --alert slack
#   bash scripts/maintenance/monitor-system-health.sh --alert email
#
# Environment Variables:
#   HEALTH_CHECK_INTERVAL - Check interval in seconds (default: 60)
#   HEALTH_ALERT_THRESHOLD - Failed checks before alert (default: 3)
#   SLACK_WEBHOOK_URL - Slack webhook for alerts
#   ALERT_EMAIL - Email address for alerts
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

# Load environment variables
if [[ -f "${ENV_FILE}" ]]; then
  set -o allexport
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +o allexport
fi

# Monitoring configuration
INTERVAL="${HEALTH_CHECK_INTERVAL:-60}"
ALERT_THRESHOLD="${HEALTH_ALERT_THRESHOLD:-3}"
ALERT_METHOD="${1:-none}"
LOG_DIR="${REPO_ROOT}/logs/health-monitoring"
STATE_FILE="${LOG_DIR}/health-state.json"

# Create log directory
mkdir -p "${LOG_DIR}"

# Initialize state file if it doesn't exist
if [[ ! -f "${STATE_FILE}" ]]; then
  echo '{"consecutiveFailures": 0, "lastAlertTime": 0, "lastCheckTime": 0}' > "${STATE_FILE}"
fi

# Timestamp function
timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Log function
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp_str="$(timestamp)"

  case "${level}" in
    INFO)
      echo -e "${BLUE}[${timestamp_str}] INFO:${NC} ${message}"
      ;;
    SUCCESS)
      echo -e "${GREEN}[${timestamp_str}] SUCCESS:${NC} ${message}"
      ;;
    WARNING)
      echo -e "${YELLOW}[${timestamp_str}] WARNING:${NC} ${message}"
      ;;
    ERROR)
      echo -e "${RED}[${timestamp_str}] ERROR:${NC} ${message}"
      ;;
    *)
      echo "[${timestamp_str}] ${message}"
      ;;
  esac

  # Also log to file
  echo "[${timestamp_str}] [${level}] ${message}" >> "${LOG_DIR}/monitor-$(date +%Y-%m-%d).log"
}

# Check system health
check_health() {
  local endpoint="${1:-http://localhost:3200/api/health/system}"

  log "INFO" "Checking system health..."

  local response
  local http_code
  local health_data

  # Make HTTP request
  response=$(curl -s -w "\n%{http_code}" "${endpoint}" 2>&1 || echo "000")
  http_code=$(echo "${response}" | tail -n1)
  health_data=$(echo "${response}" | sed '$d')

  if [[ "${http_code}" != "200" ]]; then
    log "ERROR" "Health check failed: HTTP ${http_code}"
    return 1
  fi

  # Parse JSON response
  local overall_health
  overall_health=$(echo "${health_data}" | jq -r '.overallHealth' 2>/dev/null || echo "unknown")

  if [[ "${overall_health}" == "unhealthy" ]]; then
    log "ERROR" "System health: UNHEALTHY"

    # Log unhealthy services
    local unhealthy_services
    unhealthy_services=$(echo "${health_data}" | jq -r '.services[] | select(.status=="unhealthy") | .name' 2>/dev/null || echo "")

    if [[ -n "${unhealthy_services}" ]]; then
      log "ERROR" "Unhealthy services:"
      echo "${unhealthy_services}" | while read -r service; do
        log "ERROR" "  - ${service}"
      done
    fi

    # Log unhealthy infrastructure
    local unhealthy_infra
    unhealthy_infra=$(echo "${health_data}" | jq -r '.infrastructure[] | select(.status=="unhealthy") | .name' 2>/dev/null || echo "")

    if [[ -n "${unhealthy_infra}" ]]; then
      log "ERROR" "Unhealthy infrastructure:"
      echo "${unhealthy_infra}" | while read -r component; do
        log "ERROR" "  - ${component}"
      done
    fi

    return 1
  elif [[ "${overall_health}" == "degraded" ]]; then
    log "WARNING" "System health: DEGRADED"
    return 2
  else
    log "SUCCESS" "System health: HEALTHY"

    # Log summary
    local summary
    summary=$(echo "${health_data}" | jq -r '.summary | "Total: \(.total), Healthy: \(.healthy), Degraded: \(.degraded), Unhealthy: \(.unhealthy)"' 2>/dev/null || echo "")
    if [[ -n "${summary}" ]]; then
      log "INFO" "Summary: ${summary}"
    fi

    return 0
  fi
}

# Send Slack alert
send_slack_alert() {
  local message="$1"
  local severity="${2:-danger}" # success, warning, danger

  if [[ -z "${SLACK_WEBHOOK_URL:-}" ]]; then
    log "WARNING" "SLACK_WEBHOOK_URL not configured, skipping Slack alert"
    return 0
  fi

  log "INFO" "Sending Slack alert..."

  local payload
  payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "${severity}",
      "title": "🚨 TradingSystem Health Alert",
      "text": "${message}",
      "footer": "System Health Monitor",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

  if curl -X POST -H 'Content-type: application/json' --data "${payload}" "${SLACK_WEBHOOK_URL}" -s > /dev/null; then
    log "SUCCESS" "Slack alert sent"
  else
    log "ERROR" "Failed to send Slack alert"
  fi
}

# Send email alert
send_email_alert() {
  local message="$1"
  local subject="${2:-TradingSystem Health Alert}"

  if [[ -z "${ALERT_EMAIL:-}" ]]; then
    log "WARNING" "ALERT_EMAIL not configured, skipping email alert"
    return 0
  fi

  log "INFO" "Sending email alert to ${ALERT_EMAIL}..."

  if command -v mail &> /dev/null; then
    echo "${message}" | mail -s "${subject}" "${ALERT_EMAIL}"
    log "SUCCESS" "Email alert sent"
  elif command -v sendmail &> /dev/null; then
    echo -e "Subject: ${subject}\n\n${message}" | sendmail "${ALERT_EMAIL}"
    log "SUCCESS" "Email alert sent via sendmail"
  else
    log "ERROR" "No mail command available (mail or sendmail)"
  fi
}

# Send alert based on method
send_alert() {
  local message="$1"
  local severity="${2:-danger}"

  case "${ALERT_METHOD}" in
    slack)
      send_slack_alert "${message}" "${severity}"
      ;;
    email)
      send_email_alert "${message}" "TradingSystem Health Alert: ${severity}"
      ;;
    both)
      send_slack_alert "${message}" "${severity}"
      send_email_alert "${message}" "TradingSystem Health Alert: ${severity}"
      ;;
    none)
      log "INFO" "Alert method: none (no alert sent)"
      ;;
    *)
      log "WARNING" "Unknown alert method: ${ALERT_METHOD}"
      ;;
  esac
}

# Update state
update_state() {
  local failures="$1"
  local last_alert_time="${2:-0}"

  cat > "${STATE_FILE}" <<EOF
{
  "consecutiveFailures": ${failures},
  "lastAlertTime": ${last_alert_time},
  "lastCheckTime": $(date +%s)
}
EOF
}

# Read state
read_state() {
  if [[ -f "${STATE_FILE}" ]]; then
    cat "${STATE_FILE}"
  else
    echo '{"consecutiveFailures": 0, "lastAlertTime": 0, "lastCheckTime": 0}'
  fi
}

# Main monitoring loop
monitor() {
  log "INFO" "Starting system health monitoring..."
  log "INFO" "Check interval: ${INTERVAL}s"
  log "INFO" "Alert threshold: ${ALERT_THRESHOLD} consecutive failures"
  log "INFO" "Alert method: ${ALERT_METHOD}"

  while true; do
    local check_result=0
    check_health || check_result=$?

    # Read current state
    local state
    state=$(read_state)
    local consecutive_failures
    consecutive_failures=$(echo "${state}" | jq -r '.consecutiveFailures' 2>/dev/null || echo 0)
    local last_alert_time
    last_alert_time=$(echo "${state}" | jq -r '.lastAlertTime' 2>/dev/null || echo 0)

    if [[ ${check_result} -ne 0 ]]; then
      # Health check failed
      consecutive_failures=$((consecutive_failures + 1))
      log "WARNING" "Consecutive failures: ${consecutive_failures}/${ALERT_THRESHOLD}"

      # Send alert if threshold reached
      if [[ ${consecutive_failures} -ge ${ALERT_THRESHOLD} ]]; then
        local current_time
        current_time=$(date +%s)
        local time_since_alert=$((current_time - last_alert_time))

        # Only send alert if at least 5 minutes have passed since last alert
        if [[ ${time_since_alert} -gt 300 ]]; then
          if [[ ${check_result} -eq 1 ]]; then
            send_alert "System health is UNHEALTHY after ${consecutive_failures} consecutive failures" "danger"
          else
            send_alert "System health is DEGRADED after ${consecutive_failures} consecutive failures" "warning"
          fi

          # Update last alert time
          update_state "${consecutive_failures}" "${current_time}"
        else
          log "INFO" "Skipping alert (last alert sent ${time_since_alert}s ago)"
          update_state "${consecutive_failures}" "${last_alert_time}"
        fi
      else
        update_state "${consecutive_failures}" "${last_alert_time}"
      fi
    else
      # Health check passed
      if [[ ${consecutive_failures} -gt 0 ]]; then
        log "SUCCESS" "System recovered after ${consecutive_failures} failures"

        # Send recovery notification if we were in alert state
        if [[ ${consecutive_failures} -ge ${ALERT_THRESHOLD} ]]; then
          send_alert "System health recovered and is now HEALTHY" "good"
        fi
      fi

      # Reset failures
      update_state 0 "${last_alert_time}"
    fi

    # Sleep until next check
    log "INFO" "Next check in ${INTERVAL}s..."
    sleep "${INTERVAL}"
  done
}

# One-shot mode for cron
oneshot() {
  log "INFO" "Running one-shot health check..."

  local check_result=0
  check_health || check_result=$?

  # Read current state
  local state
  state=$(read_state)
  local consecutive_failures
  consecutive_failures=$(echo "${state}" | jq -r '.consecutiveFailures' 2>/dev/null || echo 0)

  if [[ ${check_result} -ne 0 ]]; then
    consecutive_failures=$((consecutive_failures + 1))

    if [[ ${consecutive_failures} -ge ${ALERT_THRESHOLD} ]]; then
      if [[ ${check_result} -eq 1 ]]; then
        send_alert "System health is UNHEALTHY" "danger"
      else
        send_alert "System health is DEGRADED" "warning"
      fi
    fi

    update_state "${consecutive_failures}" "$(date +%s)"
    exit 1
  else
    if [[ ${consecutive_failures} -ge ${ALERT_THRESHOLD} ]]; then
      send_alert "System health recovered" "good"
    fi

    update_state 0 0
    exit 0
  fi
}

# Parse command line arguments
case "${1:-monitor}" in
  monitor)
    monitor
    ;;
  oneshot)
    oneshot
    ;;
  check)
    check_health
    ;;
  --help|-h)
    cat <<EOF
TradingSystem - System Health Monitor

Usage:
  $0 [command] [options]

Commands:
  monitor      - Continuous monitoring (default)
  oneshot      - Single check (for cron)
  check        - Single check with output

Options:
  --alert slack   - Send alerts via Slack
  --alert email   - Send alerts via email
  --alert both    - Send alerts via both Slack and email
  --alert none    - No alerts (default)

Environment Variables:
  HEALTH_CHECK_INTERVAL   - Check interval in seconds (default: 60)
  HEALTH_ALERT_THRESHOLD  - Failed checks before alert (default: 3)
  SLACK_WEBHOOK_URL       - Slack webhook URL
  ALERT_EMAIL             - Email address for alerts

Examples:
  $0 monitor --alert slack
  $0 oneshot --alert email
  $0 check

EOF
    exit 0
    ;;
  *)
    log "ERROR" "Unknown command: $1"
    log "INFO" "Use --help for usage information"
    exit 1
    ;;
esac
