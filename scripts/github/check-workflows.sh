#!/bin/bash
# GitHub Actions Workflow Monitor
# Monitora e exibe logs de workflows do GitHub Actions

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verifica se gh CLI está instalado
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI não está instalado${NC}"
    echo ""
    echo "Instalação:"
    echo "  Ubuntu/Debian: sudo apt install gh"
    echo "  macOS: brew install gh"
    echo "  Windows: winget install --id GitHub.cli"
    echo ""
    echo "Depois execute: gh auth login"
    exit 1
fi

# Verifica autenticação
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI não está autenticado${NC}"
    echo ""
    echo "Execute: gh auth login"
    exit 1
fi

# Função: Listar últimas execuções
list_runs() {
    echo -e "${BLUE}📊 Últimas 10 execuções de workflows:${NC}"
    echo ""
    gh run list --limit 10
}

# Função: Listar apenas falhas
list_failures() {
    echo -e "${RED}❌ Workflows com falhas:${NC}"
    echo ""
    gh run list --status failure --limit 20
}

# Função: Ver logs de um workflow específico
view_logs() {
    local run_id="$1"

    if [ -z "$run_id" ]; then
        echo -e "${YELLOW}💡 Uso: $0 logs <run-id>${NC}"
        echo ""
        echo "Para ver run IDs:"
        echo "  $0 list"
        return 1
    fi

    echo -e "${BLUE}📋 Logs do workflow #${run_id}:${NC}"
    echo ""
    gh run view "$run_id" --log
}

# Função: Re-executar workflow que falhou
rerun_workflow() {
    local run_id="$1"

    if [ -z "$run_id" ]; then
        echo -e "${YELLOW}💡 Uso: $0 rerun <run-id>${NC}"
        return 1
    fi

    echo -e "${BLUE}🔄 Re-executando workflow #${run_id}...${NC}"
    gh run rerun "$run_id"

    echo ""
    echo -e "${GREEN}✅ Workflow re-iniciado!${NC}"
    echo ""
    echo "Acompanhe em: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions/runs/$run_id"
}

# Função: Watch (acompanhar em tempo real)
watch_workflow() {
    local run_id="$1"

    if [ -z "$run_id" ]; then
        echo -e "${YELLOW}💡 Uso: $0 watch <run-id>${NC}"
        return 1
    fi

    echo -e "${BLUE}👀 Acompanhando workflow #${run_id}...${NC}"
    echo ""
    gh run watch "$run_id"
}

# Função: Download de artifacts
download_artifacts() {
    local run_id="$1"

    if [ -z "$run_id" ]; then
        echo -e "${YELLOW}💡 Uso: $0 download <run-id>${NC}"
        return 1
    fi

    echo -e "${BLUE}📦 Baixando artifacts do workflow #${run_id}...${NC}"
    echo ""

    # Criar diretório para artifacts
    ARTIFACT_DIR="./github-artifacts/$run_id"
    mkdir -p "$ARTIFACT_DIR"

    # Download
    gh run download "$run_id" --dir "$ARTIFACT_DIR"

    echo ""
    echo -e "${GREEN}✅ Artifacts baixados em: $ARTIFACT_DIR${NC}"
    ls -lh "$ARTIFACT_DIR"
}

# Função: Ver status de workflows em um PR específico
check_pr_workflows() {
    local pr_number="$1"

    if [ -z "$pr_number" ]; then
        echo -e "${YELLOW}💡 Uso: $0 pr <pr-number>${NC}"
        return 1
    fi

    echo -e "${BLUE}🔍 Workflows do PR #${pr_number}:${NC}"
    echo ""

    gh pr checks "$pr_number"
}

# Função: Listar workflows por status
workflows_by_status() {
    echo -e "${BLUE}📊 Status dos workflows:${NC}"
    echo ""

    echo -e "${GREEN}✅ Sucessos (últimos 5):${NC}"
    gh run list --status success --limit 5
    echo ""

    echo -e "${RED}❌ Falhas (últimos 5):${NC}"
    gh run list --status failure --limit 5
    echo ""

    echo -e "${YELLOW}⏳ Em execução:${NC}"
    gh run list --status in_progress --limit 5
}

# Função: Ajuda
show_help() {
    cat << EOF
${BLUE}GitHub Actions Workflow Monitor${NC}

${YELLOW}Uso:${NC}
  $0 <comando> [argumentos]

${YELLOW}Comandos:${NC}

  ${GREEN}list${NC}          Lista últimas 10 execuções de workflows
  ${GREEN}failures${NC}      Lista apenas workflows que falharam
  ${GREEN}status${NC}        Mostra resumo de status (sucessos/falhas/em execução)
  ${GREEN}logs <id>${NC}     Ver logs de um workflow específico
  ${GREEN}rerun <id>${NC}    Re-executar workflow que falhou
  ${GREEN}watch <id>${NC}    Acompanhar workflow em tempo real
  ${GREEN}download <id>${NC} Baixar artifacts de um workflow
  ${GREEN}pr <number>${NC}   Ver status de workflows em um PR

${YELLOW}Exemplos:${NC}

  # Listar workflows
  $0 list

  # Ver apenas falhas
  $0 failures

  # Ver logs de um workflow
  $0 logs 1234567890

  # Re-executar workflow que falhou
  $0 rerun 1234567890

  # Acompanhar workflow em tempo real
  $0 watch 1234567890

  # Baixar artifacts (relatórios, coverage, etc)
  $0 download 1234567890

  # Ver workflows de um PR
  $0 pr 42

${YELLOW}Instalação GitHub CLI:${NC}
  Ubuntu/Debian: sudo apt install gh
  macOS: brew install gh
  Windows: winget install --id GitHub.cli

  Autenticação: gh auth login

${YELLOW}Documentação:${NC}
  https://cli.github.com/manual/gh_run
EOF
}

# Main
case "${1:-}" in
    list)
        list_runs
        ;;
    failures)
        list_failures
        ;;
    status)
        workflows_by_status
        ;;
    logs)
        view_logs "$2"
        ;;
    rerun)
        rerun_workflow "$2"
        ;;
    watch)
        watch_workflow "$2"
        ;;
    download)
        download_artifacts "$2"
        ;;
    pr)
        check_pr_workflows "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
