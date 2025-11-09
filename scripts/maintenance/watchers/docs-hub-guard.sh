#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Docs Hub Guard
# ==============================================================================
# Monitora continuamente o container docs-hub e o build do Docusaurus.
# Quando detecta falhas repetidas, dispara o script de recuperação automática
# (`scripts/docs/emergency-recovery.sh`).
#
# Uso:
#   bash scripts/maintenance/watchers/docs-hub-guard.sh
#
# Variáveis de ambiente opcionais:
#   DOCS_GUARD_INTERVAL    -> intervalo entre verificações (segundos, padrão: 60)
#   DOCS_GUARD_FAIL_LIMIT  -> número de falhas consecutivas antes de acionar recovery (padrão: 3)
# ==============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$PROJECT_ROOT"

LOG_DIR="$PROJECT_ROOT/outputs/logs/docs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/docs-hub-guard.log"

INTERVAL="${DOCS_GUARD_INTERVAL:-60}"
FAIL_LIMIT="${DOCS_GUARD_FAIL_LIMIT:-3}"
FAIL_COUNT=0
LAST_STATUS="unknown"
SLACK_WEBHOOK="${DOCS_GUARD_SLACK_WEBHOOK:-}"
SENTRY_ENV="${DOCS_GUARD_SENTRY_ENV:-development}"
SENTRY_RELEASE="${DOCS_GUARD_SENTRY_RELEASE:-docs-hub-guard}"

log() {
  local level="$1"
  shift
  local timestamp
  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$timestamp] [$level] $*" | tee -a "$LOG_FILE"
}

send_alert() {
  local level="$1"
  local message="$2"

  if [ -n "$SLACK_WEBHOOK" ]; then
    if ! curl -s -X POST -H 'Content-type: application/json' --data "{\"text\":\"$message\",\"mrkdwn\":true}" "$SLACK_WEBHOOK" >/dev/null; then
      log "WARN" "Falha ao enviar alerta para Slack"
    fi
  fi

  if command -v sentry-cli >/dev/null 2>&1; then
    SENTRY_DSN="${DOCS_GUARD_SENTRY_DSN:-}"
    if [ -n "$SENTRY_DSN" ]; then
      SENTRY_DSN="$SENTRY_DSN" sentry-cli send-event \
        --message "$message" \
        --level "$level" \
        --env "$SENTRY_ENV" \
        --release "$SENTRY_RELEASE" \
        --tag watcher=docs-hub-guard >/dev/null || log "WARN" "Falha ao enviar alerta para Sentry"
    fi
  fi
}

health_check() {
  local has_issue=0

  if [ ! -f "$PROJECT_ROOT/docs/build/index.html" ]; then
    log "WARN" "docs/build/index.html ausente"
    has_issue=1
  fi

  if ! docker ps --filter "name=docs-hub" --format '{{.Names}}' | grep -qx "docs-hub"; then
    log "WARN" "container docs-hub não está em execução"
    has_issue=1
  else
    if ! docker exec docs-hub test -f /usr/share/nginx/html/index.html >/dev/null 2>&1; then
      log "WARN" "mount /usr/share/nginx/html vazio dentro do container"
      has_issue=1
    fi

    if ! curl -sf http://localhost:3404/health >/dev/null 2>&1; then
      log "WARN" "health check http://localhost:3404/health falhou"
      has_issue=1
    fi
  fi

  return "$has_issue"
}

trigger_recovery() {
  log "INFO" "Acionando scripts/docs/emergency-recovery.sh"
  if bash "$PROJECT_ROOT/scripts/docs/emergency-recovery.sh" >>"$LOG_FILE" 2>&1; then
    log "INFO" "Recuperação concluída"
    send_alert "info" "docs-hub-guard executou recuperação automática com sucesso às $(date '+%Y-%m-%d %H:%M:%S')."
  else
    log "ERROR" "Recuperação falhou - verifique o log em $LOG_FILE"
    send_alert "error" "docs-hub-guard falhou ao recuperar o Docusaurus. Verifique $LOG_FILE."
  fi
}

trap 'log "INFO" "Watcher interrompido"; exit 0' INT TERM

log "INFO" "Iniciando Docs Hub Guard (intervalo=${INTERVAL}s, fail_limit=${FAIL_LIMIT})"

while true; do
  if health_check; then
    if [ "$LAST_STATUS" != "healthy" ]; then
      log "INFO" "docs-hub saudável"
      LAST_STATUS="healthy"
    fi
    FAIL_COUNT=0
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    LAST_STATUS="unhealthy"
    log "WARN" "Falha detectada (${FAIL_COUNT}/${FAIL_LIMIT})"

    if [ "$FAIL_COUNT" -ge "$FAIL_LIMIT" ]; then
      trigger_recovery
      FAIL_COUNT=0
    fi
  fi

  sleep "$INTERVAL"
done
