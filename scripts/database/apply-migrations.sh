#!/bin/bash

#
# Database Migration Runner
#
# Applies SQL migrations to TimescaleDB databases
# Supports: APPS-WORKSPACE, APPS-TPCAPITAL
#
# Usage:
#   bash scripts/database/apply-migrations.sh [database] [migration]
#   bash scripts/database/apply-migrations.sh workspace all
#   bash scripts/database/apply-migrations.sh tp-capital 001
#   bash scripts/database/apply-migrations.sh all all
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env if not already set
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E 'TIMESCALE|TIMESCALEDB' | xargs)
fi

# Database connection details (from .env or defaults)
TIMESCALE_HOST=${TIMESCALE_HOST:-localhost}
TIMESCALE_PORT=${TIMESCALE_PORT:-5433}
TIMESCALE_USER=${TIMESCALE_USER:-timescale}
TIMESCALE_PASSWORD=${TIMESCALEDB_PASSWORD:-${TIMESCALE_PASSWORD:-pass_timescale}}

# Migration directories
WORKSPACE_MIGRATIONS_DIR="backend/data/migrations/workspace"
TP_CAPITAL_MIGRATIONS_DIR="backend/data/migrations/tp-capital"

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

# Function to print status
print_status() {
  local status=$1
  local message=$2

  if [ "$status" == "SUCCESS" ]; then
    echo -e "${GREEN}✓ SUCCESS${NC}: $message"
  elif [ "$status" == "ERROR" ]; then
    echo -e "${RED}✗ ERROR${NC}: $message"
  elif [ "$status" == "INFO" ]; then
    echo -e "${YELLOW}ℹ INFO${NC}: $message"
  fi
}

# Function to execute SQL migration
execute_migration() {
  local database=$1
  local migration_file=$2
  local migration_name=$(basename "$migration_file")

  echo -e "\n${YELLOW}Applying migration: $migration_name${NC}"
  echo "Database: $database"
  echo "File: $migration_file"

  # Execute migration using psql
  PGPASSWORD=$TIMESCALE_PASSWORD psql \
    -h $TIMESCALE_HOST \
    -p $TIMESCALE_PORT \
    -U $TIMESCALE_USER \
    -d $database \
    -f "$migration_file" \
    -v ON_ERROR_STOP=1

  if [ $? -eq 0 ]; then
    print_status "SUCCESS" "Migration $migration_name applied successfully"
    return 0
  else
    print_status "ERROR" "Failed to apply migration $migration_name"
    return 1
  fi
}

# Function to apply all migrations in a directory
apply_migrations() {
  local database=$1
  local migrations_dir=$2

  if [ ! -d "$migrations_dir" ]; then
    print_status "ERROR" "Migrations directory not found: $migrations_dir"
    return 1
  fi

  local migration_files=$(find "$migrations_dir" -name "*.sql" -type f | sort)

  if [ -z "$migration_files" ]; then
    print_status "INFO" "No migrations found in $migrations_dir"
    return 0
  fi

  # Debug: Print number of migrations found
  local total_migrations=$(echo "$migration_files" | wc -l)
  echo "DEBUG: Found $total_migrations migration files"
  echo "DEBUG: Files: $migration_files"

  local count=0
  local failed=0

  for migration_file in $migration_files; do
    echo "DEBUG: Processing migration: $migration_file"
    if execute_migration "$database" "$migration_file"; then
      ((count++))
      echo "DEBUG: Migration succeeded, count=$count"
    else
      ((failed++))
      echo "DEBUG: Migration failed, failed=$failed"
    fi
  done
  echo "DEBUG: Loop completed, count=$count, failed=$failed"

  echo ""
  print_status "INFO" "Applied $count migrations successfully, $failed failed"

  if [ $failed -gt 0 ]; then
    return 1
  fi

  return 0
}

# Function to apply workspace migrations
apply_workspace_migrations() {
  print_header "Applying APPS-WORKSPACE Migrations"

  # Test connection first
  print_status "INFO" "Testing connection to APPS-WORKSPACE..."
  PGPASSWORD=$TIMESCALE_PASSWORD psql \
    -h $TIMESCALE_HOST \
    -p $TIMESCALE_PORT \
    -U $TIMESCALE_USER \
    -d APPS-WORKSPACE \
    -c "SELECT 1" \
    --quiet > /dev/null 2>&1

  if [ $? -ne 0 ]; then
    print_status "ERROR" "Cannot connect to APPS-WORKSPACE database"
    return 1
  fi

  print_status "SUCCESS" "Connected to APPS-WORKSPACE"

  apply_migrations "APPS-WORKSPACE" "$WORKSPACE_MIGRATIONS_DIR"
}

# Function to apply tp-capital migrations
apply_tp_capital_migrations() {
  print_header "Applying APPS-TPCAPITAL Migrations"

  # Test connection first
  print_status "INFO" "Testing connection to APPS-TPCAPITAL..."
  PGPASSWORD=$TIMESCALE_PASSWORD psql \
    -h $TIMESCALE_HOST \
    -p $TIMESCALE_PORT \
    -U $TIMESCALE_USER \
    -d APPS-TPCAPITAL \
    -c "SELECT 1" \
    --quiet > /dev/null 2>&1

  if [ $? -ne 0 ]; then
    print_status "ERROR" "Cannot connect to APPS-TPCAPITAL database"
    return 1
  fi

  print_status "SUCCESS" "Connected to APPS-TPCAPITAL"

  apply_migrations "APPS-TPCAPITAL" "$TP_CAPITAL_MIGRATIONS_DIR"
}

# Main script
print_header "Database Migration Runner"

# Parse arguments
DATABASE=$1
MIGRATION=$2

if [ -z "$DATABASE" ]; then
  echo "Usage: bash scripts/database/apply-migrations.sh [database] [migration]"
  echo ""
  echo "Arguments:"
  echo "  database: workspace | tp-capital | all"
  echo "  migration: all | 001 | 002 | ... (optional, defaults to all)"
  echo ""
  echo "Examples:"
  echo "  bash scripts/database/apply-migrations.sh workspace all"
  echo "  bash scripts/database/apply-migrations.sh tp-capital 001"
  echo "  bash scripts/database/apply-migrations.sh all all"
  exit 1
fi

# Apply migrations based on arguments
if [ "$DATABASE" == "workspace" ]; then
  apply_workspace_migrations
  exit $?
elif [ "$DATABASE" == "tp-capital" ]; then
  apply_tp_capital_migrations
  exit $?
elif [ "$DATABASE" == "all" ]; then
  apply_workspace_migrations
  WORKSPACE_STATUS=$?

  apply_tp_capital_migrations
  TP_CAPITAL_STATUS=$?

  print_header "Migration Summary"

  if [ $WORKSPACE_STATUS -eq 0 ]; then
    print_status "SUCCESS" "APPS-WORKSPACE migrations completed"
  else
    print_status "ERROR" "APPS-WORKSPACE migrations failed"
  fi

  if [ $TP_CAPITAL_STATUS -eq 0 ]; then
    print_status "SUCCESS" "APPS-TPCAPITAL migrations completed"
  else
    print_status "ERROR" "APPS-TPCAPITAL migrations failed"
  fi

  if [ $WORKSPACE_STATUS -eq 0 ] && [ $TP_CAPITAL_STATUS -eq 0 ]; then
    echo ""
    print_status "SUCCESS" "All migrations completed successfully!"
    exit 0
  else
    echo ""
    print_status "ERROR" "Some migrations failed. Please review the errors above."
    exit 1
  fi
else
  print_status "ERROR" "Invalid database: $DATABASE (must be workspace, tp-capital, or all)"
  exit 1
fi
