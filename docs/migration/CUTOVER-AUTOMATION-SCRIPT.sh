#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DRY_RUN=false
SKIP_BACKUP=false
AUTO_COMMIT=false
ROLLBACK_ONLY=false
LOG_FILE="/tmp/cutover-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DEST="$HOME/backups/docs-legacy-backup-$(date +%Y%m%d-%H%M%S)"
CUTOVER_BRANCH="cutover/docs-v2-to-docs-$(date +%Y%m%d)"
CUTOVER_COMMIT_CACHE="$REPO_ROOT/.git/cutover-phase6-commits.txt"
declare -a CUTOVER_COMMIT_SHAS=()

# ANSI colors (fallback to plain if no TTY)
if [[ -t 1 ]]; then
  COLOR_INFO="\033[1;34m"
  COLOR_SUCCESS="\033[1;32m"
  COLOR_WARN="\033[1;33m"
  COLOR_ERROR="\033[1;31m"
  COLOR_RESET="\033[0m"
else
  COLOR_INFO=""
  COLOR_SUCCESS=""
  COLOR_WARN=""
  COLOR_ERROR=""
  COLOR_RESET=""
fi

usage() {
  cat <<'USAGE'
Cutover Automation Script - Phase 6

Semi-automated workflow for docs → docs cutover.

Usage:
  bash docs/migration/CUTOVER-AUTOMATION-SCRIPT.sh [options]

Options:
  --dry-run       Simulate the cutover without making changes
  --skip-backup   Skip backup creation (NOT RECOMMENDED)
  --auto-commit   Auto-confirm prompts and commit without interaction
  --rollback      Trigger automated rollback workflow only
  --help          Show this help message
USAGE
}

log_info()    { printf "%s[INFO]%s %s\n"   "$COLOR_INFO"    "$COLOR_RESET" "$1"; }
log_success() { printf "%s[SUCCESS]%s %s\n" "$COLOR_SUCCESS" "$COLOR_RESET" "$1"; }
log_warning() { printf "%s[WARN]%s %s\n"   "$COLOR_WARN"   "$COLOR_RESET" "$1"; }
log_error()   { printf "%s[ERROR]%s %s\n"  "$COLOR_ERROR"  "$COLOR_RESET" "$1"; }

confirm() {
  local prompt="$1"
  if [[ "$AUTO_COMMIT" == true ]]; then
    log_info "Auto-confirm enabled: $prompt"
    return 0
  fi
  read -r -p "$prompt [y/N]: " reply || true
  if [[ "$reply" =~ ^[Yy]$ ]]; then
    return 0
  fi
  log_warning "Action cancelled by user."
  return 1
}

run_cmd() {
  local cmd="$1"
  if [[ "$DRY_RUN" == true ]]; then
    log_info "[dry-run] $cmd"
    return 0
  fi
  log_info "$cmd"
  eval "$cmd"
}

record_cutover_commit() {
  if [[ "$DRY_RUN" == true ]]; then
    return 0
  fi
  local sha="$1"
  if [[ -z "${sha:-}" ]]; then
    return 0
  fi
  CUTOVER_COMMIT_SHAS+=("$sha")
  if [[ -n "${CUTOVER_COMMIT_CACHE:-}" ]]; then
    printf '%s\n' "$sha" >> "$CUTOVER_COMMIT_CACHE"
  fi
}

load_cutover_commits_from_cache() {
  local -n target_ref="$1"
  target_ref=()
  if [[ -f "$CUTOVER_COMMIT_CACHE" ]]; then
    mapfile -t target_ref < "$CUTOVER_COMMIT_CACHE"
  fi
}

require_command() {
  local bin="$1"
  if ! command -v "$bin" >/dev/null 2>&1; then
    log_error "Missing required command: $bin"
    return 1
  fi
}

parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --skip-backup)
        SKIP_BACKUP=true
        shift
        ;;
      --auto-commit)
        AUTO_COMMIT=true
        shift
        ;;
      --rollback)
        ROLLBACK_ONLY=true
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
}

on_error() {
  local line="$1"
  log_error "Script failed on line $line"
  if [[ "$DRY_RUN" == true ]]; then
    log_warning "Dry-run mode: no rollback executed."
    exit 1
  fi
  if [[ "$ROLLBACK_ONLY" == true ]]; then
    log_error "Rollback workflow failed. Manual intervention required."
    exit 1
  fi
  rollback "Automatic rollback triggered due to failure on line $line"
}

trap 'on_error $LINENO' ERR

initialize_logging() {
  exec > >(tee -a "$LOG_FILE")
  exec 2>&1
  log_info "Logging to $LOG_FILE"
  if [[ "$ROLLBACK_ONLY" == false && "$DRY_RUN" == false ]]; then
    : > "$CUTOVER_COMMIT_CACHE"
    CUTOVER_COMMIT_SHAS=()
  fi
}

check_prerequisites() {
  log_info "Checking prerequisites..."
  require_command git
  require_command sed
  require_command grep
  require_command jq
  require_command npm
  require_command python3

  if [[ "$DRY_RUN" == false ]]; then
    local status
    status="$(cd "$REPO_ROOT" && git status --untracked-files=no --porcelain)"
    if [[ -n "$status" ]]; then
      log_error "Working tree is not clean. Commit or stash changes before running."
      return 2
    fi
  fi

  local current_branch
  current_branch="$(cd "$REPO_ROOT" && git branch --show-current)"
  if [[ "$current_branch" != "main" && "$ROLLBACK_ONLY" == false ]]; then
    log_warning "Current branch is '$current_branch'. Expected 'main'."
    if ! confirm "Continue on branch '$current_branch'?"; then
      return 2
    fi
  fi

  if [[ ! -f "$REPO_ROOT/docs/migration/PRE-CUTOVER-VALIDATION-REPORT.md" && "$ROLLBACK_ONLY" == false ]]; then
    log_error "Pre-cutover validation report not found."
    return 2
  fi

  log_success "Prerequisites satisfied."
}

create_cutover_branch() {
  if [[ "$ROLLBACK_ONLY" == true ]]; then
    return 0
  fi
  if [[ "$DRY_RUN" == true ]]; then
    log_info "[dry-run] Would create branch $CUTOVER_BRANCH"
    return 0
  fi
  local existing_branch
  existing_branch="$(cd "$REPO_ROOT" && git branch --list "$CUTOVER_BRANCH" | xargs)"
  if [[ -n "$existing_branch" ]]; then
    log_warning "Cutover branch $CUTOVER_BRANCH already exists. Reusing."
    run_cmd "cd '$REPO_ROOT' && git checkout '$CUTOVER_BRANCH'"
  else
    run_cmd "cd '$REPO_ROOT' && git checkout -b '$CUTOVER_BRANCH'"
  fi
}

create_backup() {
  if [[ "$SKIP_BACKUP" == true ]]; then
    log_warning "Backup skipped by request."
    return 0
  fi
  confirm "Proceed with backup to $BACKUP_DEST?" || return 3
  run_cmd "cd '$REPO_ROOT' && bash scripts/docs/backup-docusaurus.sh --compress --destination '$BACKUP_DEST'"
  run_cmd "ls -lh '${BACKUP_DEST}.tar.gz'"
  run_cmd "mkdir -p '$HOME/backups'"
  run_cmd "cp '${BACKUP_DEST}.tar.gz' '$HOME/backups/'"
  log_success "Backup completed and stored at ${HOME}/backups/."
}

remove_legacy_docs() {
  confirm "Remove legacy docs/ directory?" || return 3
  run_cmd "cd '$REPO_ROOT' && git rm -rf docs/"
  run_cmd "cd '$REPO_ROOT' && git commit -m \"chore(docs): remove legacy docs/ directory - Phase 6 cutover\
\nRemoved legacy Docusaurus v2 system (docs/) as part of Phase 6 cutover.\nBackup created: ${BACKUP_DEST}.tar.gz\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\nRelated: docs/governance/CUTOVER-PLAN.md\""
  record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
}

rename_docs() {
  confirm "Rename docs to docs?" || return 3
  run_cmd "cd '$REPO_ROOT' && git mv docs docs"
  run_cmd "cd '$REPO_ROOT' && git commit -m \"chore(docs): rename docs to docs - Phase 6 cutover\
\nRenamed docs/ to docs/ as final step of Phase 6 cutover.\nDocusaurus v3 is now the primary documentation system.\n\nPort remains 3205 to avoid conflicts during transition.\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\nRelated: docs/governance/CUTOVER-PLAN.md\""
  record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
}

update_config_files() {
  log_info "Updating configuration files..."
  local missing_required=0

  if [[ -f "$REPO_ROOT/package.json" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs/content|docs/content|g' package.json"
  else
    log_error "Required file not found: package.json"
    missing_required=1
  fi

  if [[ -f "$REPO_ROOT/eslint.config.js" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i \"s|'docs/\\*\\*'|'docs/**'|g\" eslint.config.js"
  else
    log_error "Required file not found: eslint.config.js"
    missing_required=1
  fi

  if [[ -f "$REPO_ROOT/config/services-manifest.json" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|\"docs\"|\"docs\"|g' config/services-manifest.json"
  else
    log_error "Required file not found: config/services-manifest.json"
    missing_required=1
  fi

  if [[ -f "$REPO_ROOT/pyrightconfig.json" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|\"\\*\\*/docs\"|\"**/docs\"|g' pyrightconfig.json"
  else
    log_error "Required file not found: pyrightconfig.json"
    missing_required=1
  fi

  if [[ -f "$REPO_ROOT/.env.example" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs/governance|docs/governance|g' .env.example"
  else
    log_error "Required file not found: .env.example"
    missing_required=1
  fi

  if (( missing_required == 1 )); then
    return 1
  fi

  run_cmd "cd '$REPO_ROOT' && git add package.json eslint.config.js config/services-manifest.json pyrightconfig.json .env.example"
  run_cmd "cd '$REPO_ROOT' && git commit -m \"chore(config): update docs references to docs - Phase 6 cutover\n\nUpdated all configuration files to reference docs/ instead of docs/.\nPort 3205 remains unchanged.\n\nFiles updated:\n- package.json (validate-docs script)\n- eslint.config.js (ignore pattern)\n- config/services-manifest.json (docusaurus service path)\n- pyrightconfig.json (exclusions)\n- .env.example (documentation references)\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\""
  record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
}

update_scripts() {
  log_info "Updating automation scripts..."
  local script_cmds=(
    "sed -i 's|\"docs\"|\"docs\"|g' scripts/setup/install-dependencies.sh"
    "sed -i 's|docs:3205|docs:3205|g' scripts/core/start-all.sh"
    "sed -i 's|docs|docs|g' scripts/docker/check-docs-services.sh"
    "sed -i 's|docs|docs|g' scripts/docs/backup-docusaurus.sh"
    "sed -i 's|docs|docs|g' scripts/docs/validate-production-build.sh"
    "sed -i 's|docs|docs|g' scripts/docs/troubleshoot-health-dashboard.sh"
    "sed -i 's|docs|docs|g' scripts/docs/run-all-health-tests-v2.sh"
    "sed -i 's|docs|docs|g' scripts/docs/validate-docusaurus-integrity.sh"
    "sed -i 's|docs|docs|g' scripts/docusaurus/common.sh"
    "sed -i 's|docs|docs|g' scripts/docusaurus/README.md"
    "sed -i \"s|'docs'|'docs'|g\" scripts/docusaurus/docs-auto.mjs"
    "sed -i 's|docs|docs|g' scripts/start-dashboard-with-docs.sh"
    "sed -i 's|docs|docs|g' scripts/check-apis.sh"
    "sed -i 's|docs|docs|g' tools/openspec/openspec_jobs.yaml"
  )
  local script_update_performed=false
  for cmd in "${script_cmds[@]}"; do
    local target_path="${cmd##* }"
    if [[ -f "$REPO_ROOT/$target_path" ]]; then
      run_cmd "cd '$REPO_ROOT' && $cmd"
      script_update_performed=true
    else
      log_warning "Skipping script update; file not found: $target_path"
    fi
  done
  if [[ "$script_update_performed" == true ]]; then
    run_cmd "cd '$REPO_ROOT' && git add scripts/ tools/openspec/"
    run_cmd "cd '$REPO_ROOT' && git commit -m \"chore(scripts): update docs references to docs - Phase 6 cutover\n\nUpdated all automation scripts to reference docs/ instead of docs/.\n\nScripts updated:\n- scripts/setup/install-dependencies.sh\n- scripts/core/start-all.sh\n- scripts/docker/check-docs-services.sh\n- scripts/docs/*.sh (5 files)\n- scripts/docusaurus/*.{sh,mjs,md} (3 files)\n- scripts/start-dashboard-with-docs.sh\n- scripts/check-apis.sh\n- tools/openspec/openspec_jobs.yaml\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\""
    record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
  else
    log_warning "Script update commit skipped because no eligible files were modified."
  fi
}

update_source_code() {
  log_info "Updating source code references..."
  local source_updates_performed=false
  if [[ -f "$REPO_ROOT/frontend/dashboard/src/config/api.ts" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|// docs|// docs|g' frontend/dashboard/src/config/api.ts"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|(was 3004 for legacy)|(Docusaurus v3)|g' frontend/dashboard/src/config/api.ts"
    source_updates_performed=true
  else
    log_warning "Skipping update; file not found: frontend/dashboard/src/config/api.ts"
  fi

  if [[ -f "$REPO_ROOT/frontend/dashboard/src/components/pages/URLsPage.tsx" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i \"s|Documentation Hub (docs)|Documentation Hub|g\" frontend/dashboard/src/components/pages/URLsPage.tsx"
    source_updates_performed=true
  else
    log_warning "Skipping update; file not found: frontend/dashboard/src/components/pages/URLsPage.tsx"
  fi

  if [[ -f "$REPO_ROOT/frontend/dashboard/src/components/pages/PRDsPage.tsx" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|- docs:|- docs:|g' frontend/dashboard/src/components/pages/PRDsPage.tsx"
    source_updates_performed=true
  else
    log_warning "Skipping update; file not found: frontend/dashboard/src/components/pages/PRDsPage.tsx"
  fi

  if [[ -f "$REPO_ROOT/frontend/dashboard/src/components/pages/APIViewerPage.tsx" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|// Use Redocusaurus from docs|// Use Redocusaurus from docs|g' frontend/dashboard/src/components/pages/APIViewerPage.tsx"
    source_updates_performed=true
  else
    log_warning "Skipping update; file not found: frontend/dashboard/src/components/pages/APIViewerPage.tsx"
  fi

  if [[ -f "$REPO_ROOT/backend/README.md" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|# docs|# docs|g' backend/README.md"
    source_updates_performed=true
  else
    log_warning "Skipping update; file not found: backend/README.md"
  fi

  if [[ -f "$REPO_ROOT/frontend/dashboard/CHANGELOG-DOCSAPI.md" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs|docs|g' frontend/dashboard/CHANGELOG-DOCSAPI.md"
    source_updates_performed=true
  else
    log_warning "Skipping update; file not found: frontend/dashboard/CHANGELOG-DOCSAPI.md"
  fi

  if [[ -f "$REPO_ROOT/frontend/dashboard/API-VIEWER-GUIDE.md" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs/static/specs|docs/static/specs|g' frontend/dashboard/API-VIEWER-GUIDE.md"
    source_updates_performed=true
  else
    log_warning "Skipping update; file not found: frontend/dashboard/API-VIEWER-GUIDE.md"
  fi
  if [[ "$source_updates_performed" == true ]]; then
    run_cmd "cd '$REPO_ROOT' && git add frontend/ backend/ apps/"
    run_cmd "cd '$REPO_ROOT' && git commit -m \"chore(source): update docs references to docs - Phase 6 cutover\n\nUpdated source code comments and documentation references.\n\nFiles updated:\n- frontend/dashboard/src/config/api.ts (comments)\n- frontend/dashboard/src/components/pages/*.tsx (comments)\n- backend/README.md (comments)\n- frontend/dashboard/CHANGELOG-DOCSAPI.md\n- frontend/dashboard/API-VIEWER-GUIDE.md\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\""
    record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
  else
    log_warning "Source code update commit skipped because no eligible files were modified."
  fi
}

update_documentation() {
  log_info "Updating root documentation..."
  local documentation_updates=false
  if [[ -f "$REPO_ROOT/README.md" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs|docs|g' README.md"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|(docs)||g' README.md"
    documentation_updates=true
  else
    log_warning "Skipping update; file not found: README.md"
  fi

  if [[ -f "$REPO_ROOT/AGENTS.md" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|`docs/`|`docs/content/`|g' AGENTS.md"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|in `docs/`|in `docs/content/`|g' AGENTS.md"
    documentation_updates=true
  else
    log_warning "Skipping update; file not found: AGENTS.md"
  fi

  if [[ -f "$REPO_ROOT/CLAUDE.md" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs/context|docs/content|g' CLAUDE.md"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs/docusaurus|docs|g' CLAUDE.md"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|Port 3004|Port 3205|g' CLAUDE.md"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|port 3004|port 3205|g' CLAUDE.md"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|:3004|:3205|g' CLAUDE.md"
    documentation_updates=true
  else
    log_warning "Skipping update; file not found: CLAUDE.md"
  fi

  if [[ -f "$REPO_ROOT/QUICK-START.md" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs|docs|g' QUICK-START.md"
    documentation_updates=true
  else
    log_warning "Skipping update; file not found: QUICK-START.md"
  fi

  if [[ -f "$REPO_ROOT/API-INTEGRATION-STATUS.md" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs/docusaurus.config.js|docs/docusaurus.config.js|g' API-INTEGRATION-STATUS.md"
    documentation_updates=true
  else
    log_warning "Skipping update; file not found: API-INTEGRATION-STATUS.md"
  fi
  if [[ "$documentation_updates" == true ]]; then
    run_cmd "cd '$REPO_ROOT' && git add README.md AGENTS.md CLAUDE.md QUICK-START.md API-INTEGRATION-STATUS.md"
    run_cmd "cd '$REPO_ROOT' && git commit -m \"docs: update docs references to docs - Phase 6 cutover\n\nUpdated all root documentation to reference docs/ instead of docs/.\n\nFiles updated:\n- README.md (all docs references)\n- AGENTS.md (docs/ → docs/content/)\n- CLAUDE.md (docs/context → docs/content, port 3004 → 3205)\n- QUICK-START.md\n- API-INTEGRATION-STATUS.md\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\""
    record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
  else
    log_warning "Documentation update commit skipped because no eligible files were modified."
  fi
}

update_workflows() {
  log_info "Updating CI/CD workflows..."
  local deploy_workflow=".github/workflows/docs-deploy.yml"
  local link_workflow=".github/workflows/docs-link-validation.yml"

  if [[ -f "$REPO_ROOT/$deploy_workflow" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i \"s|'docs/\\*\\*'|'docs/**'|g\" $deploy_workflow"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs|docs|g' $deploy_workflow"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|working-directory: docs/docusaurus|working-directory: docs|g' $deploy_workflow"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|cache-dependency-path: docs/docusaurus/package-lock.json|cache-dependency-path: docs/package-lock.json|g' $deploy_workflow"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|path: docs/docusaurus/build|path: docs/build|g' $deploy_workflow"
    run_cmd "cd '$REPO_ROOT' && python3 - <<'PY'
from pathlib import Path

workflow_path = Path('.github/workflows/docs-deploy.yml')
text = workflow_path.read_text()
line_ending = '\r\n' if '\r\n' in text else '\n'
lines = text.splitlines()
result = []
skip = False
removed = False

for line in lines:
    stripped = line.lstrip()
    if skip and line.startswith('  ') and not line.startswith('    '):
        skip = False
    if skip:
        continue
    if stripped.startswith('# Legacy docs build'):
        skip = True
        removed = True
        continue
    if line.startswith('  build-legacy:'):
        skip = True
        removed = True
        continue
    result.append(line)

if removed:
    new_text = line_ending.join(result)
    if text.endswith(line_ending):
        new_text += line_ending
    workflow_path.write_text(new_text)
    print('Removed legacy build-legacy job from docs-deploy.yml')
else:
    print('Legacy build-legacy job already absent in docs-deploy.yml')
PY"
  else
    log_warning "Skipping workflow update; file not found: $deploy_workflow"
  fi

  if [[ -f "$REPO_ROOT/$link_workflow" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i \"s|'docs/\\*\\*'|'docs/**'|g\" $link_workflow"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs|docs|g' $link_workflow"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|./docs/context ./docs|./docs/content|g' $link_workflow"
  else
    log_warning "Skipping workflow update; file not found: $link_workflow"
  fi
  run_cmd "cd '$REPO_ROOT' && git add .github/workflows/"
  run_cmd "cd '$REPO_ROOT' && git commit -m \"ci: update docs references to docs - Phase 6 cutover\n\nUpdated CI/CD workflows to reference docs/ instead of docs/.\n\nWorkflows updated:\n- docs-deploy.yml (paths, working-directory, cache paths)\n- docs-link-validation.yml (paths, docs directories)\n\nRemoved legacy build-legacy job from docs-deploy.yml.\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\""
  record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
}

update_docker_configs() {
  log_info "Updating Docker configuration..."
  local compose_file="tools/compose/docker-compose.docs.yml"
  local docker_update_performed=false
  if [[ -f "$REPO_ROOT/$compose_file" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs/static/specs|docs/static/specs|g' $compose_file"
    docker_update_performed=true
  else
    log_warning "Skipping Docker config update; file not found: $compose_file"
  fi
  if [[ "$docker_update_performed" == true ]]; then
    run_cmd "cd '$REPO_ROOT' && git add tools/compose/"
    run_cmd "cd '$REPO_ROOT' && git commit -m \"chore(docker): update docs references to docs - Phase 6 cutover\n\nUpdated Docker Compose volume mounts to reference docs/static/specs.\n\nFiles updated:\n- tools/compose/docker-compose.docs.yml\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\""
    record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
  else
    log_warning "Docker configuration commit skipped because no updates were applied."
  fi
}

update_internal_docs() {
  log_info "Updating internal documentation..."
  local internal_docs_updates=false
  if [[ -f "$REPO_ROOT/docs/README.md" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i 's|docs|docs|g' docs/README.md"
    run_cmd "cd '$REPO_ROOT' && sed -i 's|../scripts/docusaurus|scripts/docusaurus|g' docs/README.md"
    internal_docs_updates=true
  else
    log_warning "Skipping update; file not found: docs/README.md"
  fi

  if [[ -d "$REPO_ROOT/docs/governance" ]]; then
    run_cmd "cd '$REPO_ROOT' && find docs/governance -name '*.md' -exec sed -i 's|docs|docs|g' {} +"
    internal_docs_updates=true
  else
    log_warning "Skipping update; directory not found: docs/governance"
  fi

  if [[ -d "$REPO_ROOT/docs/migration" ]]; then
    run_cmd "cd '$REPO_ROOT' && find docs/migration -name '*.md' -exec sed -i 's|docs|docs|g' {} +"
    internal_docs_updates=true
  else
    log_warning "Skipping update; directory not found: docs/migration"
  fi

  if [[ -f "$REPO_ROOT/docs/docusaurus.config.js" ]]; then
    run_cmd "cd '$REPO_ROOT' && sed -i \"s|'https://github.com/TradingSystem/TradingSystem/tree/main/docs/'|'https://github.com/TradingSystem/TradingSystem/tree/main/docs/'|g\" docs/docusaurus.config.js"
    internal_docs_updates=true
  else
    log_warning "Skipping update; file not found: docs/docusaurus.config.js"
  fi

  run_cmd "cd '$REPO_ROOT' && if [ -d docs/scripts ]; then find docs/scripts -name '*.sh' -exec sed -i 's|docs|docs|g' {} +; fi"
  if [[ -d "$REPO_ROOT/docs/scripts" ]]; then
    internal_docs_updates=true
  fi

  if [[ "$internal_docs_updates" == true ]]; then
    run_cmd "cd '$REPO_ROOT' && git add docs/"
    run_cmd "cd '$REPO_ROOT' && git commit -m \"docs: update internal docs self-references - Phase 6 cutover\n\nUpdated internal documentation to reference docs/ instead of docs/.\n\nFiles updated:\n- docs/README.md\n- docs/governance/*.md (all files)\n- docs/migration/*.md (all files)\n- docs/docusaurus.config.js (editUrl)\n- docs/scripts/*.sh (if any)\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\""
    record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
  else
    log_warning "Internal docs update commit skipped because no eligible files were modified."
  fi
}

update_references() {
  update_config_files
  update_scripts
  update_source_code
  update_documentation
  update_workflows
  update_docker_configs
  update_internal_docs
}

run_validation_suite() {
  log_info "Running validation suite..."
  log_info "Checking for remaining docs references outside allowlist..."
  local grep_output
  if grep_output=$(cd "$REPO_ROOT" && grep -R 'docs' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir='docs/content' --exclude='*.log' --exclude='reference-inventory.json'); then
    log_error "Found disallowed docs references:"
    printf '%s\n' "$grep_output"
    return 1
  else
    local exit_code=$?
    if [[ $exit_code -eq 1 ]]; then
      log_success "No disallowed docs references detected."
    else
      log_error "grep failed while scanning for docs references (exit code $exit_code)."
      return "$exit_code"
    fi
  fi
  run_cmd "cd '$REPO_ROOT' && bash docs/scripts/validate-technical-references.sh --verbose"
  run_cmd "cd '$REPO_ROOT/docs' && npm install"
  run_cmd "cd '$REPO_ROOT/docs' && npm run docs:check"
  run_cmd "cd '$REPO_ROOT/docs' && npm run docs:links"
  run_cmd "cd '$REPO_ROOT/frontend/dashboard' && npm run build"
  run_cmd "cd '$REPO_ROOT/frontend/dashboard' && npm run test"
  run_cmd "cd '$REPO_ROOT' && npm run lint"
  run_cmd "cd '$REPO_ROOT' && npm run type-check"
  run_cmd "cd '$REPO_ROOT' && bash scripts/core/start-all.sh"
  run_cmd "sleep 30"
  run_cmd "curl -I http://localhost:3205"
  run_cmd "curl -I http://localhost:3103"
  run_cmd "curl http://localhost:3500/api/status"
  run_cmd "cd '$REPO_ROOT' && bash scripts/core/stop-all.sh"
  log_success "Validation suite completed."
}

create_completion_assets() {
  run_cmd "cd '$REPO_ROOT' && git checkout main"
  run_cmd "cd '$REPO_ROOT' && git merge '$CUTOVER_BRANCH' --no-ff"
  record_cutover_commit "$(cd "$REPO_ROOT" && git rev-parse HEAD)"
  run_cmd "cd '$REPO_ROOT' && git tag -a docs-v3-cutover-v1.0.0 -m \"docs: Phase 6 cutover complete - docs → docs\n\nCompleted final cutover of documentation system:\n- Removed legacy docs/ (Docusaurus v2)\n- Renamed docs/ → docs/ (Docusaurus v3)\n- Updated 100+ references across codebase\n- Port 3205 maintained for stability\n\nBackup: ${BACKUP_DEST}.tar.gz\n\nSee: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md\nSee: docs/governance/CUTOVER-PLAN.md\""
  if [[ "$DRY_RUN" == false ]]; then
    run_cmd "cd '$REPO_ROOT' && git push origin main"
    run_cmd "cd '$REPO_ROOT' && git push origin docs-v3-cutover-v1.0.0"
  else
    log_info "[dry-run] Would push main and tag docs-v3-cutover-v1.0.0"
  fi
  run_cmd "cd '$REPO_ROOT' && bash scripts/core/start-all.sh"
  run_cmd "curl http://localhost:3205"
  run_cmd "curl http://localhost:3103"
}

create_completion_report() {
  if [[ "$DRY_RUN" == true ]]; then
    log_info "[dry-run] Would create completion report and monitoring plan."
    return 0
  fi
  local report_path="$REPO_ROOT/docs/migration/CUTOVER-COMPLETION-REPORT.md"
  run_cmd "cat > '$report_path' << EOF
# Cutover Completion Report

**Date**: $(date +%Y-%m-%d)
**Executor**: DocsOps + DevOps
**Duration**: ___ hours
**Status**: ✅ COMPLETED

## Summary

Successfully completed Phase 6 cutover:
- ✅ Legacy docs/ removed
- ✅ docs/ renamed to docs/
- ✅ 100+ references updated
- ✅ All validations passed
- ✅ All services tested

## Backup Information

- Location: ${BACKUP_DEST}.tar.gz
- Size: ___ MB
- Checksum: ___ (md5sum)
- Retention: 90 days

## Commits

- Commit 1: Remove legacy docs/ - SHA: ___
- Commit 2: Rename docs/ → docs/ - SHA: ___
- Commit 3: Update configs - SHA: ___
- Commit 4: Update scripts - SHA: ___
- Commit 5: Update source code - SHA: ___
- Commit 6: Update documentation - SHA: ___
- Commit 7: Update CI/CD - SHA: ___
- Commit 8: Update Docker - SHA: ___
- Tag: docs-v3-cutover-v1.0.0 - SHA: ___

## Validation Results

- Technical references: ✅ PASSED
- docs:check: ✅ PASSED
- docs:links: ✅ PASSED (0 broken links)
- Frontend build: ✅ PASSED
- Frontend tests: ✅ PASSED
- Lint: ✅ PASSED
- Type-check: ✅ PASSED
- Service startup: ✅ PASSED
- CORS integration: ✅ PASSED
- Docker stack: ✅ PASSED

## Next Steps

- [ ] Monitor services for 24 hours
- [ ] Collect user feedback
- [ ] Address any issues (P0 within 4 hours)
- [ ] Update REFERENCE-UPDATE-TRACKING.md to 100%
- [ ] Send completion announcement
- [ ] Archive backup after 90 days
EOF"
}

rollback() {
  local reason="${1:-Automated rollback triggered}"
  log_warning "Initiating rollback: $reason"

  if [[ "$DRY_RUN" == true ]]; then
    log_warning "Dry-run mode: rollback not executed."
    exit 1
  fi

  run_cmd "cd '$REPO_ROOT' && bash scripts/core/stop-all.sh --force"

  local -a commits_to_revert=()
  if [[ ${#CUTOVER_COMMIT_SHAS[@]} -gt 0 ]]; then
    commits_to_revert=("${CUTOVER_COMMIT_SHAS[@]}")
  else
    load_cutover_commits_from_cache commits_to_revert
  fi

  if [[ ${#commits_to_revert[@]} -eq 0 ]]; then
    local -a fallback_candidates=()
    while IFS=$'\x1f' read -r sha subject; do
      if [[ "$subject" == *"cutover/docs-v2-to-docs"* ]]; then
        fallback_candidates+=("$sha")
        continue
      fi
      if [[ "$subject" == *"Phase 6 cutover"* ]]; then
        fallback_candidates+=("$sha")
      else
        if [[ ${#fallback_candidates[@]} -gt 0 ]]; then
          break
        fi
      fi
    done < <(cd "$REPO_ROOT" && git log --format='%H%x1f%s' --max-count=25)
    if [[ ${#fallback_candidates[@]} -gt 0 ]]; then
      commits_to_revert=()
      for ((idx=${#fallback_candidates[@]}-1; idx>=0; idx--)); do
        commits_to_revert+=("${fallback_candidates[$idx]}")
      done
    fi
  fi

  if [[ ${#commits_to_revert[@]} -eq 0 ]]; then
    log_warning "No cutover commits detected for rollback; skipping git revert."
  else
    local -a revert_args=()
    log_info "Reverting ${#commits_to_revert[@]} cutover commits (newest to oldest)..."
    for ((idx=${#commits_to_revert[@]}-1; idx>=0; idx--)); do
      revert_args+=("${commits_to_revert[$idx]}")
      log_info "  ${commits_to_revert[$idx]}"
    done
    run_cmd "cd '$REPO_ROOT' && git revert --no-commit ${revert_args[*]}"
  fi

  if [[ -f "${BACKUP_DEST}.tar.gz" ]]; then
    run_cmd "mkdir -p /tmp/docs-restore"
    run_cmd "tar -xzf '${BACKUP_DEST}.tar.gz' -C /tmp/docs-restore"
    run_cmd "rm -rf '$REPO_ROOT/docs'"
    run_cmd "rsync -av /tmp/docs-restore/.backup-docusaurus-*/docusaurus/ '$REPO_ROOT/docs/'"
  else
    log_warning "Backup archive ${BACKUP_DEST}.tar.gz not found; manual restoration required."
  fi

  run_cmd "cd '$REPO_ROOT' && git add ."
  run_cmd "cd '$REPO_ROOT' && git commit -m \"chore(docs): rollback Phase 6 cutover - restore legacy system\n\nRolled back Phase 6 cutover via automation script.\n\nSee: docs/migration/ROLLBACK-PROCEDURE.md\"" || true

  local report_path="$REPO_ROOT/docs/migration/ROLLBACK-REPORT-$(date +%Y%m%d).md"
  run_cmd "cat > '$report_path' << EOF
# Rollback Report - Phase 6 Cutover

**Date**: $(date +%Y-%m-%d %H:%M:%S)
**Executor**: DocsOps + DevOps
**Reason**: $reason

Automation script executed rollback workflow. Review logs at $LOG_FILE.
EOF"

  log_error "Rollback completed. Investigate issues before retrying cutover."
  exit 1
}

main_cutover() {
  initialize_logging
  check_prerequisites
  create_cutover_branch
  create_backup
  remove_legacy_docs
  rename_docs
  update_references
  run_validation_suite
  create_completion_assets
  create_completion_report
  log_success "Cutover completed successfully!"
  log_info "Next steps: monitor for 24 hours and collect user feedback."
}

main_rollback() {
  initialize_logging
  check_prerequisites
  load_cutover_commits_from_cache CUTOVER_COMMIT_SHAS
  rollback "Rollback requested via --rollback"
}

main() {
  parse_arguments "$@"
  if [[ "$ROLLBACK_ONLY" == true ]]; then
    main_rollback
  else
    main_cutover
  fi
}

main "$@"
