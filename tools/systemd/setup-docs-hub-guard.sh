#!/usr/bin/env bash
# Configura o arquivo /etc/tradingsystem/docs-hub-guard.env usando variáveis de ambiente
# e executa o instalador do serviço docs-hub-guard.

set -euo pipefail

REQUIRED_VARS=(
  "DOCS_GUARD_SLACK_WEBHOOK"
  "DOCS_GUARD_SENTRY_DSN"
  "DOCS_GUARD_SENTRY_ENV"
  "DOCS_GUARD_SENTRY_RELEASE"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "[ERROR] Variável $var não definida. Exporte todas as variáveis antes de executar." >&2
    exit 1
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_DIR="/etc/tradingsystem"
ENV_FILE="$ENV_DIR/docs-hub-guard.env"

mkdir -p "$ENV_DIR"

cat > "$ENV_FILE" <<EOT
DOCS_GUARD_SLACK_WEBHOOK="${DOCS_GUARD_SLACK_WEBHOOK}"
DOCS_GUARD_SENTRY_DSN="${DOCS_GUARD_SENTRY_DSN}"
DOCS_GUARD_SENTRY_ENV="${DOCS_GUARD_SENTRY_ENV}"
DOCS_GUARD_SENTRY_RELEASE="${DOCS_GUARD_SENTRY_RELEASE}"
EOT

chmod 600 "$ENV_FILE"
chown root:root "$ENV_FILE"

echo "[INFO] Arquivo de variáveis atualizado em $ENV_FILE"

echo "[INFO] Instalando/atualizando serviço docs-hub-guard..."
bash "$SCRIPT_DIR/install-docs-hub-guard.sh"

echo "[INFO] Serviço configurado. Use 'systemctl status docs-hub-guard.service' para verificar."
