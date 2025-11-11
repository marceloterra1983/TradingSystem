#!/usr/bin/env bash
# ==============================================================================
# Setup Health Monitoring
# ==============================================================================
# Configures system health monitoring using either systemd or cron
#
# Part of: Phase 1.7 - Health Checks (Improvement Plan v1.0)
#
# Usage:
#   sudo bash tools/systemd/setup-health-monitoring.sh [systemd|cron]
# ==============================================================================

set -euo pipefail

METHOD="${1:-systemd}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🏥 TradingSystem Health Monitoring Setup${NC}"
echo "=========================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${YELLOW}⚠️  This script needs to be run as root (use sudo)${NC}"
   exit 1
fi

# Setup systemd service
setup_systemd() {
  echo -e "\n${BLUE}📦 Setting up systemd service...${NC}"

  # Copy service file
  cp "${SCRIPT_DIR}/system-health-monitor.service" /etc/systemd/system/

  # Reload systemd
  systemctl daemon-reload

  # Enable and start service
  systemctl enable system-health-monitor.service
  systemctl start system-health-monitor.service

  echo -e "${GREEN}✅ Systemd service installed and started${NC}"
  echo ""
  echo "Useful commands:"
  echo "  systemctl status system-health-monitor   - Check status"
  echo "  systemctl stop system-health-monitor     - Stop monitoring"
  echo "  systemctl restart system-health-monitor  - Restart monitoring"
  echo "  journalctl -u system-health-monitor -f   - View logs"
}

# Setup cron job
setup_cron() {
  echo -e "\n${BLUE}📦 Setting up cron job...${NC}"

  # Create cron entry (runs every minute)
  CRON_ENTRY="* * * * * cd ${REPO_ROOT} && bash ${REPO_ROOT}/scripts/maintenance/monitor-system-health.sh oneshot --alert slack >> ${REPO_ROOT}/logs/health-monitoring/cron.log 2>&1"

  # Check if cron entry already exists
  if crontab -l 2>/dev/null | grep -q "monitor-system-health.sh"; then
    echo -e "${YELLOW}⚠️  Cron entry already exists, updating...${NC}"
    crontab -l 2>/dev/null | grep -v "monitor-system-health.sh" | crontab -
  fi

  # Add new cron entry
  (crontab -l 2>/dev/null; echo "${CRON_ENTRY}") | crontab -

  echo -e "${GREEN}✅ Cron job installed${NC}"
  echo ""
  echo "Useful commands:"
  echo "  crontab -l                  - List cron jobs"
  echo "  crontab -e                  - Edit cron jobs"
  echo "  tail -f ${REPO_ROOT}/logs/health-monitoring/cron.log  - View logs"
}

# Create log directory
mkdir -p "${REPO_ROOT}/logs/health-monitoring"
chown -R marce:marce "${REPO_ROOT}/logs/health-monitoring"

# Setup based on method
case "${METHOD}" in
  systemd)
    setup_systemd
    ;;
  cron)
    setup_cron
    ;;
  *)
    echo -e "${YELLOW}❌ Unknown method: ${METHOD}${NC}"
    echo "Usage: $0 [systemd|cron]"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✅ Health monitoring setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure alerts in .env:"
echo "   - SLACK_WEBHOOK_URL=https://hooks.slack.com/..."
echo "   - ALERT_EMAIL=admin@example.com"
echo "2. Test the monitoring:"
echo "   bash ${REPO_ROOT}/scripts/maintenance/monitor-system-health.sh check"
echo "3. View dashboard:"
echo "   http://localhost:9080/health"
