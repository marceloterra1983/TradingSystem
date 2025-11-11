#!/bin/bash
# ==============================================================================
# Course Crawler Database Backup Script
# ==============================================================================
# Automatically backs up PostgreSQL database with rotation
# Usage: ./backup-database.sh [--keep-days 7]
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="course-crawler-db"
DATABASE_NAME="coursecrawler"
DATABASE_USER="postgres"
BACKUP_DIR="/home/marce/Projetos/TradingSystem/backups/course-crawler"
KEEP_DAYS=${1:-7}  # Default: keep backups for 7 days
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/coursecrawler_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Course Crawler Database Backup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${RED}❌ Error: Container ${CONTAINER_NAME} is not running${NC}"
  exit 1
fi

# Check if database is healthy
echo -e "${YELLOW}🔍 Checking database health...${NC}"
if ! docker exec "${CONTAINER_NAME}" pg_isready -U "${DATABASE_USER}" -d "${DATABASE_NAME}" > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Database is not ready${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Database is healthy${NC}"
echo ""

# Create backup
echo -e "${YELLOW}📦 Creating backup: ${BACKUP_FILE}${NC}"
docker exec "${CONTAINER_NAME}" pg_dump \
  -U "${DATABASE_USER}" \
  -d "${DATABASE_NAME}" \
  --clean \
  --if-exists \
  --create \
  --verbose \
  > "${BACKUP_FILE}" 2>&1

# Check if backup was created successfully
if [ ! -f "${BACKUP_FILE}" ]; then
  echo -e "${RED}❌ Error: Backup file was not created${NC}"
  exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo -e "${GREEN}✅ Backup created: ${BACKUP_SIZE}${NC}"
echo ""

# Compress backup
echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
gzip -9 "${BACKUP_FILE}"

COMPRESSED_SIZE=$(du -h "${BACKUP_FILE_GZ}" | cut -f1)
echo -e "${GREEN}✅ Compressed: ${COMPRESSED_SIZE}${NC}"
echo ""

# Remove old backups
echo -e "${YELLOW}🧹 Removing backups older than ${KEEP_DAYS} days...${NC}"
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "*.sql.gz" -type f -mtime +${KEEP_DAYS} -delete -print | wc -l)
echo -e "${GREEN}✅ Removed ${DELETED_COUNT} old backup(s)${NC}"
echo ""

# List current backups
echo -e "${BLUE}📋 Current backups:${NC}"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | awk '{print "   "$9" ("$5")"}'
echo ""

# Summary
TOTAL_BACKUPS=$(ls "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "📁 Backup location: ${BACKUP_FILE_GZ}"
echo -e "📊 Total backups: ${TOTAL_BACKUPS}"
echo -e "💾 Total size: ${TOTAL_SIZE}"
echo -e "⏰ Retention: ${KEEP_DAYS} days"
echo ""

# Restore instructions
echo -e "${YELLOW}📝 To restore this backup:${NC}"
echo -e "   gunzip -c ${BACKUP_FILE_GZ} | docker exec -i ${CONTAINER_NAME} psql -U ${DATABASE_USER}"
echo ""
