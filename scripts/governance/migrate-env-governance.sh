#!/usr/bin/env bash
###############################################################################
# SCRIPT: migrate-env-governance.sh
# DESCRIÇÃO: Migra .env para novo modelo de governança (separação secrets/defaults)
# AUTOR: Claude Code
# DATA: 2025-11-07
# VERSÃO: 1.0.0
#
# USO:
#   bash scripts/governance/migrate-env-governance.sh [--dry-run] [--force]
#
# OPÇÕES:
#   --dry-run    Simula mudanças sem aplicar
#   --force      Sobrescreve arquivos existentes sem perguntar
#   --help       Mostra esta ajuda
#
# SAÍDA:
#   - config/.env.defaults (valores não-sensíveis commitáveis)
#   - .env (apenas secrets, gitignored)
#   - .env.local.example (template de overrides)
#   - .env.backup-TIMESTAMP (backup do .env original)
#
# PRÉ-REQUISITOS:
#   - .env existente no diretório raiz
#   - Permissões de escrita no diretório
###############################################################################

set -euo pipefail

# Cores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Diretórios
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly CONFIG_DIR="$PROJECT_ROOT/config"
readonly ENV_FILE="$PROJECT_ROOT/.env"
readonly ENV_DEFAULTS="$CONFIG_DIR/.env.defaults"
readonly ENV_LOCAL_EXAMPLE="$PROJECT_ROOT/.env.local.example"
readonly TIMESTAMP=$(date +%Y%m%d-%H%M%S)
readonly BACKUP_FILE="$PROJECT_ROOT/.env.backup-$TIMESTAMP"

# Flags
DRY_RUN=false
FORCE=false

# Funções de Output
log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*" >&2
}

# Banner
print_banner() {
    cat << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║       🔧 MIGRAÇÃO DE GOVERNANÇA DE VARIÁVEIS DE AMBIENTE      ║
║                                                                ║
║  Separa .env em:                                              ║
║    • config/.env.defaults (valores não-sensíveis)            ║
║    • .env (apenas secrets)                                    ║
║    • .env.local.example (template de overrides)              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
}

# Help
show_help() {
    print_banner
    echo
    cat << 'EOF'
USO: bash scripts/governance/migrate-env-governance.sh [OPTIONS]

OPÇÕES:
    --dry-run       Simula mudanças sem aplicar
    --force         Sobrescreve arquivos existentes sem perguntar
    --help          Mostra esta ajuda

EXEMPLOS:
    # Simular migração
    bash scripts/governance/migrate-env-governance.sh --dry-run

    # Executar migração (modo interativo)
    bash scripts/governance/migrate-env-governance.sh

    # Executar migração (force)
    bash scripts/governance/migrate-env-governance.sh --force

IMPORTANTE:
    1. Backup automático criado em: .env.backup-TIMESTAMP
    2. Revisão manual recomendada após migração
    3. Commitar config/.env.defaults após validar
    4. NUNCA commitar .env (secrets)

REFERÊNCIAS:
    • Governance Policy: governance/controls/ENVIRONMENT-VARIABLES-POLICY.md
    • Analysis Report: outputs/GOVERNANCE-CONFLICTS-ANALYSIS-2025-11-07.md
EOF
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                log_info "Modo DRY-RUN ativado (nenhuma mudança será aplicada)"
                shift
                ;;
            --force)
                FORCE=true
                log_warning "Modo FORCE ativado (sobrescreverá arquivos existentes)"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Opção desconhecida: $1"
                echo "Use --help para ver opções disponíveis"
                exit 1
                ;;
        esac
    done
}

# Validações pré-execução
validate_preconditions() {
    log_info "Validando pré-requisitos..."

    # Verifica se .env existe
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Arquivo .env não encontrado em: $ENV_FILE"
        exit 1
    fi

    # Verifica se config/ existe, se não cria
    if [[ ! -d "$CONFIG_DIR" ]]; then
        log_warning "Diretório config/ não existe, criando..."
        if [[ "$DRY_RUN" == false ]]; then
            mkdir -p "$CONFIG_DIR"
        fi
    fi

    # Verifica se arquivos já existem (sem --force)
    if [[ "$FORCE" == false ]]; then
        if [[ -f "$ENV_DEFAULTS" ]] || [[ -f "$ENV_LOCAL_EXAMPLE" ]]; then
            log_error "Arquivos de destino já existem!"
            echo
            [[ -f "$ENV_DEFAULTS" ]] && echo "  - $ENV_DEFAULTS"
            [[ -f "$ENV_LOCAL_EXAMPLE" ]] && echo "  - $ENV_LOCAL_EXAMPLE"
            echo
            echo "Use --force para sobrescrever ou mova os arquivos manualmente"
            exit 1
        fi
    fi

    log_success "Pré-requisitos OK"
}

# Classifica variáveis como SECRET ou DEFAULT
classify_variable() {
    local var_name="$1"
    local var_value="$2"

    # Padrões que identificam SECRETS
    local secret_patterns=(
        "_KEY$"
        "_TOKEN$"
        "_PASSWORD$"
        "_PASS$"
        "_SECRET$"
        "_API_KEY$"
        "_AUTH_TOKEN$"
        "OPENAI_"
        "ANTHROPIC_"
        "LANGSMITH_"
        "SENTRY_"
        "GITHUB_TOKEN"
        "FIRECRAWL_API_KEY"
        "SLACK_WEBHOOK"
        "JWT_"
        "ENCRYPTION_KEY"
        "SESSION_"
    )

    # Exceções: variáveis que PARECEM secrets mas são defaults
    local default_exceptions=(
        "INTER_SERVICE_SECRET"  # Se for valor exemplo
    )

    # Verifica padrões de secret
    for pattern in "${secret_patterns[@]}"; do
        if [[ "$var_name" =~ $pattern ]]; then
            # Verifica se é exceção
            for exception in "${default_exceptions[@]}"; do
                if [[ "$var_name" == "$exception" ]] && [[ "$var_value" == "CHANGE_ME"* ]]; then
                    echo "DEFAULT"
                    return
                fi
            done
            echo "SECRET"
            return
        fi
    done

    # Se chegou aqui, é DEFAULT
    echo "DEFAULT"
}

# Processa .env e separa em secrets/defaults
process_env_file() {
    log_info "Processando $ENV_FILE..."

    local secrets_count=0
    local defaults_count=0
    local comments_count=0
    local empty_lines=0

    # Arrays temporários
    declare -a secrets_lines=()
    declare -a defaults_lines=()

    # Lê linha por linha
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Linha vazia
        if [[ -z "$line" ]]; then
            empty_lines=$((empty_lines + 1))
            secrets_lines+=("")
            defaults_lines+=("")
            continue
        fi

        # Comentário ou seção header
        if [[ "$line" =~ ^[[:space:]]*# ]]; then
            comments_count=$((comments_count + 1))
            secrets_lines+=("$line")
            defaults_lines+=("$line")
            continue
        fi

        # Variável (KEY=VALUE)
        if [[ "$line" =~ ^[[:space:]]*([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
            local var_name="${BASH_REMATCH[1]}"
            local var_value="${BASH_REMATCH[2]}"

            local classification=$(classify_variable "$var_name" "$var_value")

            if [[ "$classification" == "SECRET" ]]; then
                secrets_count=$((secrets_count + 1))
                secrets_lines+=("$line")
                defaults_lines+=("# $var_name=CHANGE_ME  # Secret - configure in .env")
            else
                defaults_count=$((defaults_count + 1))
                defaults_lines+=("$line")
                secrets_lines+=("# $line  # Default in config/.env.defaults")
            fi
        else
            # Linha desconhecida, preserva em ambos
            secrets_lines+=("$line")
            defaults_lines+=("$line")
        fi
    done < "$ENV_FILE"

    log_info "Classificação:"
    echo "  • Secrets: $secrets_count variáveis"
    echo "  • Defaults: $defaults_count variáveis"
    echo "  • Comentários: $comments_count linhas"
    echo "  • Linhas vazias: $empty_lines"

    # Exporta arrays para uso posterior
    printf '%s\n' "${secrets_lines[@]}" > /tmp/tradingsystem-secrets.tmp
    printf '%s\n' "${defaults_lines[@]}" > /tmp/tradingsystem-defaults.tmp
}

# Cria backup do .env original
create_backup() {
    log_info "Criando backup: $BACKUP_FILE"

    if [[ "$DRY_RUN" == false ]]; then
        cp "$ENV_FILE" "$BACKUP_FILE"
        log_success "Backup criado"
    else
        log_info "[DRY-RUN] Backup seria criado em: $BACKUP_FILE"
    fi
}

# Escreve config/.env.defaults
write_defaults_file() {
    log_info "Escrevendo config/.env.defaults..."

    local header="###############################################################################
# TRADINGSYSTEM – DEFAULT CONFIGURATION (.env.defaults)
#
# Este arquivo contém APENAS valores não-sensíveis (portas, URLs, flags).
# Secrets (API keys, passwords, tokens) devem estar em .env (não commitado).
#
# IMPORTANTE:
#   - Este arquivo É VERSIONADO (git add config/.env.defaults)
#   - NUNCA inclua secrets neste arquivo
#   - Para overrides locais, use .env.local (gitignored)
#
# Precedência de carregamento:
#   1. config/.env.defaults (este arquivo)
#   2. .env.local (overrides locais opcionais)
#   3. .env (secrets - maior prioridade)
#
# Última atualização: $TIMESTAMP
###############################################################################

"

    if [[ "$DRY_RUN" == false ]]; then
        echo "$header" > "$ENV_DEFAULTS"
        cat /tmp/tradingsystem-defaults.tmp >> "$ENV_DEFAULTS"
        log_success "Arquivo config/.env.defaults criado"
    else
        log_info "[DRY-RUN] Arquivo seria criado em: $ENV_DEFAULTS"
        echo "$header"
        head -n 20 /tmp/tradingsystem-defaults.tmp
        echo "... ($(wc -l < /tmp/tradingsystem-defaults.tmp) linhas total)"
    fi
}

# Escreve .env (apenas secrets)
write_secrets_file() {
    log_info "Atualizando .env (apenas secrets)..."

    local header="###############################################################################
# TRADINGSYSTEM – SENSITIVE CREDENTIALS (.env)
#
# Este arquivo contém APENAS secrets (API keys, passwords, tokens).
# Valores não-sensíveis (portas, URLs) estão em config/.env.defaults.
#
# IMPORTANTE:
#   - Este arquivo NÃO É VERSIONADO (gitignored)
#   - NUNCA commit este arquivo
#   - Um backup foi criado em: $BACKUP_FILE
#
# Para valores padrão, veja: config/.env.defaults
# Para overrides locais, crie: .env.local (opcional)
#
# Última atualização: $TIMESTAMP
###############################################################################

"

    if [[ "$DRY_RUN" == false ]]; then
        echo "$header" > "$ENV_FILE"
        cat /tmp/tradingsystem-secrets.tmp >> "$ENV_FILE"
        log_success "Arquivo .env atualizado (apenas secrets)"
    else
        log_info "[DRY-RUN] Arquivo seria atualizado em: $ENV_FILE"
        echo "$header"
        head -n 20 /tmp/tradingsystem-secrets.tmp
        echo "... ($(wc -l < /tmp/tradingsystem-secrets.tmp) linhas total)"
    fi
}

# Cria .env.local.example
create_local_example() {
    log_info "Criando .env.local.example..."

    local content="###############################################################################
# TRADINGSYSTEM – LOCAL OVERRIDES TEMPLATE (.env.local.example)
#
# Use este arquivo para overrides locais SEM modificar config/.env.defaults.
#
# COMO USAR:
#   1. Copie este arquivo: cp .env.local.example .env.local
#   2. Descomente e ajuste variáveis conforme necessário
#   3. .env.local é gitignored e nunca será commitado
#
# PRECEDÊNCIA:
#   config/.env.defaults < .env.local < .env (secrets)
#
# EXEMPLOS COMUNS:
###############################################################################

# ==== Portas Customizadas (exemplo) ====
# Descomente para usar portas diferentes das padrão

# WORKSPACE_PORT=3210
# DASHBOARD_PORT=3105
# DOCS_PORT=3405

# ==== URLs Customizadas (exemplo) ====
# Descomente para apontar para instâncias remotas

# WORKSPACE_API_URL=http://192.168.1.100:3200
# TP_CAPITAL_API_URL=http://192.168.1.100:4005

# ==== Debugging & Development (exemplo) ====
# Descomente para habilitar logs verbose

# LOG_LEVEL=debug
# VITE_APP_ENV=development
# NODE_ENV=development

# ==== Database Overrides (exemplo) ====
# Descomente para usar instâncias locais

# TIMESCALEDB_HOST=localhost
# TIMESCALEDB_PORT=5434
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6380

###############################################################################
# FIM DO TEMPLATE
###############################################################################
"

    if [[ "$DRY_RUN" == false ]]; then
        echo "$content" > "$ENV_LOCAL_EXAMPLE"
        log_success "Arquivo .env.local.example criado"
    else
        log_info "[DRY-RUN] Arquivo seria criado em: $ENV_LOCAL_EXAMPLE"
        echo "$content"
    fi
}

# Atualiza .gitignore
update_gitignore() {
    log_info "Atualizando .gitignore..."

    local gitignore="$PROJECT_ROOT/.gitignore"
    local entries=(
        ".env"
        ".env.local"
        ".env.backup-*"
        "config/.env.local"
    )

    if [[ ! -f "$gitignore" ]]; then
        log_warning ".gitignore não encontrado, criando..."
        if [[ "$DRY_RUN" == false ]]; then
            touch "$gitignore"
        fi
    fi

    local added=0
    for entry in "${entries[@]}"; do
        if ! grep -qF "$entry" "$gitignore" 2>/dev/null; then
            if [[ "$DRY_RUN" == false ]]; then
                echo "$entry" >> "$gitignore"
            fi
            log_info "  + Adicionado: $entry"
            added=$((added + 1))
        fi
    done

    if [[ $added -eq 0 ]]; then
        log_success ".gitignore já está atualizado"
    else
        log_success "Adicionadas $added entradas ao .gitignore"
    fi
}

# Cleanup arquivos temporários
cleanup() {
    rm -f /tmp/tradingsystem-secrets.tmp /tmp/tradingsystem-defaults.tmp
}

# Summary final
print_summary() {
    echo
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                     MIGRAÇÃO CONCLUÍDA                         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo
    log_success "Arquivos criados/atualizados:"
    echo "  • config/.env.defaults (valores não-sensíveis - COMMITÁVEL)"
    echo "  • .env (apenas secrets - GITIGNORED)"
    echo "  • .env.local.example (template de overrides)"
    echo "  • .env.backup-$TIMESTAMP (backup original)"
    echo
    log_warning "PRÓXIMOS PASSOS:"
    echo
    echo "1. VALIDAR arquivos gerados:"
    echo "   cat config/.env.defaults  # Verificar se não há secrets"
    echo "   cat .env                  # Verificar se só tem secrets"
    echo
    echo "2. TESTAR carregamento:"
    echo "   bash scripts/start.sh --validate-env"
    echo
    echo "3. COMMITAR apenas defaults:"
    echo "   git add config/.env.defaults"
    echo "   git add .env.local.example"
    echo "   git add .gitignore"
    echo "   git commit -m 'refactor(env): separate secrets from defaults'"
    echo
    echo "4. NUNCA COMMITAR:"
    echo "   .env (secrets)"
    echo "   .env.local (overrides pessoais)"
    echo "   .env.backup-* (backups)"
    echo
    log_info "Referências:"
    echo "  • Governance Policy: governance/controls/ENVIRONMENT-VARIABLES-POLICY.md"
    echo "  • Analysis Report: outputs/GOVERNANCE-CONFLICTS-ANALYSIS-2025-11-07.md"
    echo
}

# Main execution
main() {
    print_banner
    echo

    parse_args "$@"
    validate_preconditions
    create_backup
    process_env_file
    write_defaults_file
    write_secrets_file
    create_local_example
    update_gitignore
    cleanup

    if [[ "$DRY_RUN" == true ]]; then
        echo
        log_warning "MODO DRY-RUN: Nenhuma mudança foi aplicada"
        echo "Execute novamente sem --dry-run para aplicar mudanças"
    else
        print_summary
    fi
}

# Trap para cleanup em caso de erro
trap cleanup EXIT

# Execute
main "$@"
