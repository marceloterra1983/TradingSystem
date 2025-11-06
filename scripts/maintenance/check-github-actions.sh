#!/usr/bin/env bash
# scripts/maintenance/check-github-actions.sh
# Verifica e baixa logs de workflows do GitHub Actions

set -euo pipefail

REPO="marceloterra1983/TradingSystem"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOGS_DIR="${PROJECT_ROOT}/outputs/github-actions"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
  cat << EOF
Usage: $(basename "$0") [COMMAND] [OPTIONS]

Commands:
  list                    Lista workflows recentes
  logs <run-id>          Baixa logs de um workflow específico
  failed                 Mostra apenas workflows que falharam
  watch <workflow>       Monitora status de um workflow específico
  artifacts <run-id>     Lista artefatos disponíveis
  download <run-id>      Baixa artefatos de um workflow

Examples:
  $(basename "$0") list
  $(basename "$0") failed
  $(basename "$0") logs 12345678
  $(basename "$0") watch "CI/CD"
  $(basename "$0") download 12345678

EOF
  exit 1
}

check_gh_cli() {
  if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) não está instalado${NC}"
    echo ""
    echo "Instale com:"
    echo "  sudo apt install gh"
    echo "  # ou"
    echo "  brew install gh"
    echo ""
    echo "Depois autentique:"
    echo "  gh auth login"
    exit 1
  fi

  # Verifica autenticação
  if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI não está autenticado${NC}"
    echo ""
    echo "Execute:"
    echo "  gh auth login"
    exit 1
  fi
}

list_workflows() {
  echo -e "${BLUE}📋 Workflows recentes:${NC}"
  echo ""
  gh run list --repo "${REPO}" --limit 10
}

list_failed_workflows() {
  echo -e "${RED}❌ Workflows que falharam:${NC}"
  echo ""
  gh run list --repo "${REPO}" --limit 20 --status failure
}

get_workflow_logs() {
  local run_id="$1"
  
  echo -e "${BLUE}📥 Baixando logs do workflow ${run_id}...${NC}"
  
  # Criar diretório de logs
  mkdir -p "${LOGS_DIR}/${run_id}"
  
  # Baixar logs
  gh run view "${run_id}" --repo "${REPO}" --log > "${LOGS_DIR}/${run_id}/full.log"
  
  echo -e "${GREEN}✅ Logs salvos em: ${LOGS_DIR}/${run_id}/full.log${NC}"
  echo ""
  echo "Para visualizar:"
  echo "  less ${LOGS_DIR}/${run_id}/full.log"
  echo "  # ou"
  echo "  code ${LOGS_DIR}/${run_id}/full.log"
}

watch_workflow() {
  local workflow_name="$1"
  
  echo -e "${BLUE}👀 Monitorando workflow: ${workflow_name}${NC}"
  gh run watch --repo "${REPO}" || true
}

list_artifacts() {
  local run_id="$1"
  
  echo -e "${BLUE}📦 Artefatos disponíveis para workflow ${run_id}:${NC}"
  echo ""
  gh run view "${run_id}" --repo "${REPO}"
}

download_artifacts() {
  local run_id="$1"
  
  echo -e "${BLUE}📥 Baixando artefatos do workflow ${run_id}...${NC}"
  
  # Criar diretório de artefatos
  mkdir -p "${LOGS_DIR}/${run_id}/artifacts"
  cd "${LOGS_DIR}/${run_id}/artifacts"
  
  # Baixar todos os artefatos
  gh run download "${run_id}" --repo "${REPO}" || {
    echo -e "${YELLOW}⚠️  Nenhum artefato disponível para este workflow${NC}"
    return 0
  }
  
  echo -e "${GREEN}✅ Artefatos salvos em: ${LOGS_DIR}/${run_id}/artifacts/${NC}"
  ls -lah "${LOGS_DIR}/${run_id}/artifacts/"
}

view_workflow_details() {
  local run_id="$1"
  
  echo -e "${BLUE}🔍 Detalhes do workflow ${run_id}:${NC}"
  echo ""
  gh run view "${run_id}" --repo "${REPO}"
}

main() {
  check_gh_cli
  
  local command="${1:-list}"
  
  case "$command" in
    list)
      list_workflows
      ;;
    failed)
      list_failed_workflows
      ;;
    logs)
      if [[ -z "${2:-}" ]]; then
        echo -e "${RED}❌ Informe o run ID${NC}"
        echo "Usage: $0 logs <run-id>"
        exit 1
      fi
      get_workflow_logs "$2"
      ;;
    watch)
      if [[ -z "${2:-}" ]]; then
        watch_workflow ""
      else
        watch_workflow "$2"
      fi
      ;;
    artifacts)
      if [[ -z "${2:-}" ]]; then
        echo -e "${RED}❌ Informe o run ID${NC}"
        echo "Usage: $0 artifacts <run-id>"
        exit 1
      fi
      list_artifacts "$2"
      ;;
    download)
      if [[ -z "${2:-}" ]]; then
        echo -e "${RED}❌ Informe o run ID${NC}"
        echo "Usage: $0 download <run-id>"
        exit 1
      fi
      download_artifacts "$2"
      ;;
    view)
      if [[ -z "${2:-}" ]]; then
        echo -e "${RED}❌ Informe o run ID${NC}"
        echo "Usage: $0 view <run-id>"
        exit 1
      fi
      view_workflow_details "$2"
      ;;
    help|--help|-h)
      usage
      ;;
    *)
      echo -e "${RED}❌ Comando desconhecido: $command${NC}"
      usage
      ;;
  esac
}

main "$@"

