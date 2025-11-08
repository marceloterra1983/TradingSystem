#!/bin/bash

###############################################################################
# Documentation Maintenance - Cron Schedule Setup
# Version: 1.0
# Description: Configure automated documentation maintenance jobs
###############################################################################

set -euo pipefail

# Color codes
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $*"
}

###############################################################################
# Cron Job Definitions
###############################################################################

# Daily quick check (Monday-Friday at 9 AM)
DAILY_JOB="0 9 * * 1-5 cd ${PROJECT_ROOT} && bash scripts/docs/comprehensive-maintenance.sh quick >> /tmp/docs-maintenance-daily.log 2>&1"

# Weekly full maintenance (Friday at 3 PM)
WEEKLY_JOB="0 15 * * 5 cd ${PROJECT_ROOT} && bash scripts/docs/comprehensive-maintenance.sh full && python3 scripts/docs/generate-dashboard.py docs/reports >> /tmp/docs-maintenance-weekly.log 2>&1"

# Monthly deep dive (1st of month at 10 AM)
MONTHLY_JOB="0 10 1 * * cd ${PROJECT_ROOT} && bash scripts/docs/comprehensive-maintenance.sh full && python3 scripts/docs/validate-external-links.py docs/content && python3 scripts/docs/generate-dashboard.py docs/reports >> /tmp/docs-maintenance-monthly.log 2>&1"

###############################################################################
# Main Functions
###############################################################################

show_schedule() {
    echo "Documentation Maintenance - Cron Schedule"
    echo "=========================================="
    echo ""
    echo "Proposed Cron Jobs:"
    echo ""
    echo "1. DAILY QUICK CHECK (Mon-Fri 9 AM):"
    echo "   ${DAILY_JOB}"
    echo ""
    echo "2. WEEKLY FULL MAINTENANCE (Fri 3 PM):"
    echo "   ${WEEKLY_JOB}"
    echo ""
    echo "3. MONTHLY DEEP DIVE (1st of month 10 AM):"
    echo "   ${MONTHLY_JOB}"
    echo ""
}

check_existing() {
    log_info "Checking for existing documentation maintenance cron jobs..."

    local existing
    existing=$(crontab -l 2>/dev/null | grep -c "docs-maintenance" || echo "0")

    if [ "$existing" -gt 0 ]; then
        log_warn "Found ${existing} existing documentation maintenance job(s)"
        echo ""
        echo "Existing jobs:"
        crontab -l 2>/dev/null | grep "docs-maintenance"
        echo ""
        return 1
    else
        log_success "No existing documentation maintenance jobs found"
        return 0
    fi
}

install_jobs() {
    log_info "Installing cron jobs..."

    # Get current crontab (or empty if none exists)
    local current_crontab
    current_crontab=$(crontab -l 2>/dev/null || echo "")

    # Create new crontab with our jobs
    {
        echo "$current_crontab"
        echo ""
        echo "# Documentation Maintenance - Automated Schedule"
        echo "# Added: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "# Daily quick check (Mon-Fri 9 AM)"
        echo "$DAILY_JOB"
        echo ""
        echo "# Weekly full maintenance (Fri 3 PM)"
        echo "$WEEKLY_JOB"
        echo ""
        echo "# Monthly deep dive (1st of month 10 AM)"
        echo "$MONTHLY_JOB"
        echo ""
    } | crontab -

    log_success "Cron jobs installed successfully"
}

remove_jobs() {
    log_info "Removing documentation maintenance cron jobs..."

    local current_crontab
    current_crontab=$(crontab -l 2>/dev/null || echo "")

    # Remove our jobs
    echo "$current_crontab" | grep -v "docs-maintenance" | grep -v "Documentation Maintenance" | crontab -

    log_success "Documentation maintenance jobs removed"
}

show_logs() {
    echo "Log Locations:"
    echo "=============="
    echo ""
    echo "Daily logs:   /tmp/docs-maintenance-daily.log"
    echo "Weekly logs:  /tmp/docs-maintenance-weekly.log"
    echo "Monthly logs: /tmp/docs-maintenance-monthly.log"
    echo ""

    if [ -f /tmp/docs-maintenance-daily.log ]; then
        echo "Recent daily log entries:"
        tail -20 /tmp/docs-maintenance-daily.log
    fi
}

create_systemd_timer() {
    log_info "Creating systemd timer unit files..."

    # Create service unit
    cat > /tmp/docs-maintenance.service << EOF
[Unit]
Description=Documentation Maintenance Weekly Full Run
After=network.target

[Service]
Type=oneshot
User=${USER}
WorkingDirectory=${PROJECT_ROOT}
ExecStart=/bin/bash -c 'cd ${PROJECT_ROOT} && bash scripts/docs/comprehensive-maintenance.sh full && python3 scripts/docs/generate-dashboard.py docs/reports'
StandardOutput=append:/tmp/docs-maintenance-weekly.log
StandardError=append:/tmp/docs-maintenance-weekly.log

[Install]
WantedBy=multi-user.target
EOF

    # Create timer unit
    cat > /tmp/docs-maintenance.timer << EOF
[Unit]
Description=Documentation Maintenance Weekly Timer
Requires=docs-maintenance.service

[Timer]
OnCalendar=Fri *-*-* 15:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    echo ""
    log_success "Systemd unit files created in /tmp/"
    echo ""
    echo "To install (requires sudo):"
    echo "  sudo cp /tmp/docs-maintenance.service /etc/systemd/system/"
    echo "  sudo cp /tmp/docs-maintenance.timer /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable --now docs-maintenance.timer"
    echo ""
    echo "To check status:"
    echo "  systemctl status docs-maintenance.timer"
    echo "  systemctl list-timers docs-maintenance.timer"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    local action="${1:-show}"

    case "$action" in
        show)
            show_schedule
            echo ""
            echo "Actions:"
            echo "  $0 install  - Install cron jobs"
            echo "  $0 remove   - Remove cron jobs"
            echo "  $0 check    - Check existing jobs"
            echo "  $0 logs     - Show log locations and recent entries"
            echo "  $0 systemd  - Generate systemd timer units (alternative to cron)"
            ;;

        check)
            check_existing
            ;;

        install)
            show_schedule
            echo ""

            if ! check_existing; then
                read -p "Existing jobs found. Remove and reinstall? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    remove_jobs
                else
                    log_warn "Installation cancelled"
                    exit 0
                fi
            fi

            read -p "Install these cron jobs? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_jobs
                echo ""
                log_success "Installation complete!"
                echo ""
                echo "Verify with: crontab -l"
                echo "View logs with: $0 logs"
            else
                log_warn "Installation cancelled"
            fi
            ;;

        remove)
            if check_existing; then
                log_info "No jobs to remove"
            else
                read -p "Remove all documentation maintenance cron jobs? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    remove_jobs
                else
                    log_warn "Removal cancelled"
                fi
            fi
            ;;

        logs)
            show_logs
            ;;

        systemd)
            create_systemd_timer
            ;;

        *)
            echo "Usage: $0 {show|install|remove|check|logs|systemd}"
            exit 1
            ;;
    esac
}

# Run main
main "$@"
