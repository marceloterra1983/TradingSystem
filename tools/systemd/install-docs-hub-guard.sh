#!/bin/bash
# Instalação do serviço docs-hub-guard como systemd

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVICE_FILE="/etc/systemd/system/docs-hub-guard.service"
ENV_DIR="/etc/tradingsystem"
ENV_FILE="$ENV_DIR/docs-hub-guard.env"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}Este script precisa ser executado com sudo/root.${NC}"
  echo "Uso: sudo bash install-docs-hub-guard.sh"
  exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Instalando docs-hub-guard.service${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "${GREEN}[1/4]${NC} Criando diretórios de log..."
mkdir -p "$PROJECT_ROOT/outputs/logs/docs"
chown -R marce:marce "$PROJECT_ROOT/outputs/logs/docs"

echo -e "${GREEN}[2/4]${NC} Copiando unidade systemd..."
cp "$SCRIPT_DIR/docs-hub-guard.service" "$SERVICE_FILE"
chmod 644 "$SERVICE_FILE"

if [ ! -d "$ENV_DIR" ]; then
  mkdir -p "$ENV_DIR"
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$SCRIPT_DIR/docs-hub-guard.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo -e "${YELLOW}Arquivo de variáveis criado em $ENV_FILE (edite antes de reiniciar o serviço).${NC}"
else
  echo -e "${YELLOW}Arquivo de variáveis já existe em $ENV_FILE (mantido).${NC}"
fi

if ! command -v sentry-cli >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  sentry-cli não encontrado. Alertas Sentry serão ignorados.${NC}"
fi

echo -e "${GREEN}[3/4]${NC} Recarregando systemd..."
systemctl daemon-reload

if systemctl is-enabled --quiet docs-hub-guard.service 2>/dev/null; then
  echo -e "${YELLOW}Serviço já habilitado.${NC}"
else
  systemctl enable docs-hub-guard.service
  echo -e "${GREEN}Serviço habilitado para iniciar no boot.${NC}"
fi

if systemctl is-active --quiet docs-hub-guard.service 2>/dev/null; then
  echo -e "${YELLOW}Serviço já em execução.${NC}"
else
  echo -e "${GREEN}[4/4]${NC} Iniciando serviço..."
  systemctl start docs-hub-guard.service
fi

sleep 2
systemctl status docs-hub-guard.service --no-pager

echo -e "${GREEN}Instalação concluída!${NC}"
echo "Comandos úteis:"
echo "  sudo systemctl restart docs-hub-guard.service"
echo "  sudo systemctl disable docs-hub-guard.service"
echo "  sudo journalctl -u docs-hub-guard.service -f"
