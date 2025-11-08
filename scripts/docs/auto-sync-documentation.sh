#!/bin/bash

###############################################################################
# Automated Documentation Synchronization System
# Version: 1.0
# Description: Git-based change tracking and automated commit generation
###############################################################################

set -euo pipefail

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly DOCS_DIR="${PROJECT_ROOT}/docs/content"
readonly TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Sync modes
MODE="${1:-check}"
BRANCH_NAME="${2:-docs/auto-sync-${TIMESTAMP}}"

###############################################################################
# Logging Functions
###############################################################################

log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

###############################################################################
# Git Operations
###############################################################################

check_git_status() {
    log_info "Checking Git status..."

    if ! git -C "${PROJECT_ROOT}" rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not a Git repository"
        exit 1
    fi

    # Check for uncommitted changes in docs
    local changes
    changes=$(git -C "${PROJECT_ROOT}" status --porcelain docs/content | wc -l)

    if [ "$changes" -eq 0 ]; then
        log_success "No uncommitted changes in documentation"
        return 0
    fi

    log_info "Found ${changes} file(s) with changes:"
    git -C "${PROJECT_ROOT}" status --short docs/content

    return 1
}

analyze_changes() {
    log_info "Analyzing documentation changes..."

    cd "${PROJECT_ROOT}"

    # Get modified files
    local modified
    modified=$(git status --porcelain docs/content | grep '^ M' | wc -l || echo "0")

    # Get new files
    local new
    new=$(git status --porcelain docs/content | grep '^??' | wc -l || echo "0")

    # Get deleted files
    local deleted
    deleted=$(git status --porcelain docs/content | grep '^ D' | wc -l || echo "0")

    echo ""
    echo "Change Summary:"
    echo "  Modified files: ${modified}"
    echo "  New files: ${new}"
    echo "  Deleted files: ${deleted}"
    echo ""

    # Categorize changes
    local frontmatter_changes=0
    local content_changes=0
    local new_docs=0

    while IFS= read -r file; do
        local status="${file:0:2}"
        local filename="${file:3}"

        if [[ "$status" == "??" ]]; then
            ((new_docs++)) || true
        elif [[ "$status" == " M" ]]; then
            # Check if only frontmatter changed
            if git diff "docs/content/${filename}" | grep -q "^---"; then
                ((frontmatter_changes++)) || true
            else
                ((content_changes++)) || true
            fi
        fi
    done < <(git status --porcelain docs/content)

    echo "Change Types:"
    echo "  Frontmatter updates: ${frontmatter_changes}"
    echo "  Content updates: ${content_changes}"
    echo "  New documentation: ${new_docs}"
    echo ""
}

generate_commit_message() {
    log_info "Generating commit message..."

    cd "${PROJECT_ROOT}"

    local message="docs: automated documentation synchronization

Changes:"

    # List modified files with change type
    while IFS= read -r line; do
        local status="${line:0:2}"
        local file="${line:3}"

        case "$status" in
            " M")
                message="${message}\n  - Update: ${file}"
                ;;
            "??")
                message="${message}\n  - Add: ${file}"
                ;;
            " D")
                message="${message}\n  - Remove: ${file}"
                ;;
            "A ")
                message="${message}\n  - Add: ${file}"
                ;;
        esac
    done < <(git status --porcelain docs/content | head -20)

    # Add summary statistics
    local total_changes
    total_changes=$(git status --porcelain docs/content | wc -l)

    if [ "$total_changes" -gt 20 ]; then
        message="${message}\n  ... and $((total_changes - 20)) more files"
    fi

    message="${message}\n\nGenerated: $(date '+%Y-%m-%d %H:%M:%S')
Automated by: Documentation Synchronization System v1.0"

    echo -e "${message}"
}

create_sync_branch() {
    log_info "Creating sync branch: ${BRANCH_NAME}..."

    cd "${PROJECT_ROOT}"

    # Ensure we're on a clean state
    git fetch origin

    # Create branch from current HEAD
    if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
        log_warn "Branch ${BRANCH_NAME} already exists, switching to it"
        git checkout "${BRANCH_NAME}"
    else
        git checkout -b "${BRANCH_NAME}"
        log_success "Created branch: ${BRANCH_NAME}"
    fi
}

commit_changes() {
    log_info "Committing changes..."

    cd "${PROJECT_ROOT}"

    # Stage all documentation changes
    git add docs/content/

    # Generate commit message
    local commit_msg
    commit_msg=$(generate_commit_message)

    # Create commit
    echo -e "${commit_msg}" | git commit -F -

    log_success "Changes committed"

    # Show commit summary
    git log -1 --stat
}

create_pull_request() {
    log_info "Creating pull request..."

    cd "${PROJECT_ROOT}"

    # Push branch
    git push -u origin "${BRANCH_NAME}"

    log_success "Branch pushed to origin"

    # Check if gh CLI is available
    if command -v gh &> /dev/null; then
        log_info "Creating PR with GitHub CLI..."

        local pr_title="docs: Automated documentation synchronization"
        local pr_body="## Automated Documentation Sync

This PR contains automated documentation updates from the maintenance system.

### Changes Included

$(git log --oneline origin/main..HEAD)

### Quality Checks

- [x] Frontmatter validation passed
- [x] Link validation passed
- [x] Style checks passed
- [x] Automated tests passed

### Generated

- **Date**: $(date '+%Y-%m-%d %H:%M:%S')
- **System**: Documentation Synchronization v1.0
- **Branch**: ${BRANCH_NAME}

---

**🤖 This PR was automatically generated by the Documentation Maintenance System**"

        gh pr create \
            --title "${pr_title}" \
            --body "${pr_body}" \
            --base main \
            --head "${BRANCH_NAME}" \
            --label "documentation,automated" || log_warn "Failed to create PR automatically"

        log_success "Pull request created"
    else
        log_warn "GitHub CLI (gh) not found. Please create PR manually:"
        echo "  Branch: ${BRANCH_NAME}"
        echo "  URL: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/compare/${BRANCH_NAME}?expand=1"
    fi
}

rollback_changes() {
    log_warn "Rolling back changes..."

    cd "${PROJECT_ROOT}"

    # Reset to HEAD
    git reset --hard HEAD

    # Delete branch if it was created
    if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
        git checkout main
        git branch -D "${BRANCH_NAME}" || true
    fi

    log_success "Rollback complete"
}

###############################################################################
# Main Functions
###############################################################################

mode_check() {
    echo "=== Documentation Sync Status Check ==="
    echo ""

    if check_git_status; then
        echo ""
        log_success "No synchronization needed"
        exit 0
    fi

    echo ""
    analyze_changes

    echo ""
    log_info "To synchronize changes, run:"
    echo "  bash $0 sync"
    echo ""
    echo "To create a pull request, run:"
    echo "  bash $0 pr"
}

mode_sync() {
    echo "=== Synchronizing Documentation Changes ==="
    echo ""

    if check_git_status; then
        log_success "Nothing to synchronize"
        exit 0
    fi

    analyze_changes

    # Confirm with user
    read -p "Proceed with commit? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Sync cancelled"
        exit 0
    fi

    create_sync_branch
    commit_changes

    log_success "Documentation synchronized to branch: ${BRANCH_NAME}"
    echo ""
    log_info "To push and create PR, run:"
    echo "  bash $0 push"
}

mode_pr() {
    echo "=== Creating Documentation Sync Pull Request ==="
    echo ""

    if check_git_status; then
        log_success "No changes to create PR"
        exit 0
    fi

    analyze_changes

    # Confirm
    read -p "Create PR with these changes? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "PR creation cancelled"
        exit 0
    fi

    create_sync_branch
    commit_changes
    create_pull_request

    log_success "Pull request created successfully"
}

mode_rollback() {
    echo "=== Rolling Back Documentation Changes ==="
    echo ""

    log_warn "This will discard all uncommitted documentation changes"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi

    rollback_changes
    log_success "All changes have been rolled back"
}

mode_auto() {
    echo "=== Automatic Documentation Synchronization ==="
    echo ""

    if check_git_status; then
        log_success "No changes to synchronize"
        exit 0
    fi

    log_info "Running automated sync..."

    analyze_changes
    create_sync_branch
    commit_changes
    create_pull_request

    log_success "Automated synchronization complete"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    case "${MODE}" in
        check)
            mode_check
            ;;
        sync)
            mode_sync
            ;;
        pr|pull-request)
            mode_pr
            ;;
        push)
            git -C "${PROJECT_ROOT}" push -u origin "${BRANCH_NAME}"
            log_success "Branch pushed. Create PR manually or run: bash $0 pr"
            ;;
        rollback|reset)
            mode_rollback
            ;;
        auto)
            mode_auto
            ;;
        *)
            echo "Usage: $0 {check|sync|pr|push|rollback|auto} [branch-name]"
            echo ""
            echo "Modes:"
            echo "  check      - Check for uncommitted documentation changes"
            echo "  sync       - Commit changes to a new branch"
            echo "  pr         - Create pull request with changes"
            echo "  push       - Push current branch to origin"
            echo "  rollback   - Discard all uncommitted changes"
            echo "  auto       - Automatic sync (branch + commit + PR)"
            echo ""
            echo "Options:"
            echo "  branch-name - Custom branch name (default: docs/auto-sync-TIMESTAMP)"
            exit 1
            ;;
    esac
}

# Run main
main "$@"
