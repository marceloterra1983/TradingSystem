#!/bin/bash
# ==============================================================================
# Setup Automated Qdrant Backups (Cron Job)
# ==============================================================================
# Description: Configures daily automated backups at 2 AM
# Usage: sudo bash scripts/qdrant/setup-automated-backups.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
BACKUP_SCRIPT="$PROJECT_ROOT/scripts/qdrant/backup-cluster.sh"
CRON_FILE="/etc/cron.d/qdrant-backup"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setup Automated Qdrant Backups${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==============================================================================
# Step 1: Verify Backup Script Exists
# ==============================================================================
echo -e "${GREEN}[1/4] Verifying backup script...${NC}"

if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}  ❌ Backup script not found: $BACKUP_SCRIPT${NC}"
    exit 1
fi

chmod +x "$BACKUP_SCRIPT"

echo -e "${GREEN}  ✅ Backup script ready${NC}"
echo ""

# ==============================================================================
# Step 2: Create Cron Job
# ==============================================================================
echo -e "${GREEN}[2/4] Creating cron job...${NC}"

# Create cron job file
cat > /tmp/qdrant-backup-cron <<EOF
# Qdrant Cluster Automated Backup
# Runs daily at 2:00 AM
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily backup at 2 AM
0 2 * * * root bash $BACKUP_SCRIPT >> /var/log/qdrant-backup.log 2>&1

# Weekly cleanup (keep last 30 days)
0 3 * * 0 root find $PROJECT_ROOT/backend/data/backups/qdrant -type d -mtime +30 -exec rm -rf {} + >> /var/log/qdrant-backup.log 2>&1
EOF

# Install cron job
mv /tmp/qdrant-backup-cron "$CRON_FILE"
chmod 644 "$CRON_FILE"

echo -e "${GREEN}  ✅ Cron job created: $CRON_FILE${NC}"
echo ""

# ==============================================================================
# Step 3: Create Log File
# ==============================================================================
echo -e "${GREEN}[3/4] Creating log file...${NC}"

touch /var/log/qdrant-backup.log
chmod 644 /var/log/qdrant-backup.log

echo -e "${GREEN}  ✅ Log file: /var/log/qdrant-backup.log${NC}"
echo ""

# ==============================================================================
# Step 4: Test Backup
# ==============================================================================
echo -e "${GREEN}[4/4] Running test backup...${NC}"
echo ""

bash "$BACKUP_SCRIPT"

echo ""

# ==============================================================================
# Setup Summary
# ==============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Automated Backups Configured!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Schedule:"
echo "  - Daily backup: 2:00 AM"
echo "  - Retention: 30 days"
echo "  - Log file: /var/log/qdrant-backup.log"
echo ""
echo "Cron job installed: $CRON_FILE"
echo ""
echo "To check cron job:"
echo "  cat $CRON_FILE"
echo ""
echo "To view backup log:"
echo "  tail -f /var/log/qdrant-backup.log"
echo ""
echo "To run manual backup:"
echo "  bash $BACKUP_SCRIPT"
echo ""
echo -e "${GREEN}✅ Automated backups are active!${NC}"
echo ""
