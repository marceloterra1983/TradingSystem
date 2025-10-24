#!/bin/bash

# Simple database migration using pg_dump/restore
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }

DB_USER="timescale"

echo "=========================================="
echo "  Simple Database Migration"
echo "=========================================="
echo ""

# 1. Create new databases
log_info "Creating new databases..."
docker exec data-timescaledb psql -U "$DB_USER" -d postgres -c 'CREATE DATABASE "APPS-TPCAPITAL";' 2>&1 | grep -v "already exists" || true
docker exec data-timescaledb psql -U "$DB_USER" -d postgres -c 'CREATE DATABASE "APPS-WORKSPACE";' 2>&1 | grep -v "already exists" || true
log_success "Databases created"

# 2. Enable TimescaleDB extension
log_info "Enabling TimescaleDB extensions..."
docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-TPCAPITAL" -c 'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;' >/dev/null 2>&1
docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-WORKSPACE" -c 'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;' >/dev/null 2>&1
log_success "Extensions enabled"

# 3. Migrate APPS-TPCAPITAL
log_info "Migrating APPS-TPCAPITAL..."
docker exec data-timescaledb pg_dump -U "$DB_USER" -d tradingsystem -F c > /tmp/tradingsystem.dump
docker exec -i data-timescaledb pg_restore -U "$DB_USER" -d "APPS-TPCAPITAL" --no-owner --no-acl < /tmp/tradingsystem.dump 2>&1 | grep -v "already exists" | grep -v "^$" || true
rm /tmp/tradingsystem.dump

# Create tp-capital schema and move tables
docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-TPCAPITAL" <<'SQL' 2>&1 | grep -v "already exists" | grep -v "^$" || true
CREATE SCHEMA IF NOT EXISTS "tp-capital";
ALTER TABLE public.tp_capital_signals SET SCHEMA "tp-capital";
ALTER TABLE public.telegram_bots SET SCHEMA "tp-capital";
ALTER TABLE public.telegram_channels SET SCHEMA "tp-capital";
SQL

COUNT=$(docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-TPCAPITAL" -tAc 'SELECT COUNT(*) FROM "tp-capital".tp_capital_signals;')
log_success "APPS-TPCAPITAL migrated ($COUNT signals)"

# 4. Migrate APPS-WORKSPACE
log_info "Migrating APPS-WORKSPACE..."
docker exec data-timescaledb pg_dump -U "$DB_USER" -d frontend_apps -F c > /tmp/frontend_apps.dump
docker exec -i data-timescaledb pg_restore -U "$DB_USER" -d "APPS-WORKSPACE" --no-owner --no-acl < /tmp/frontend_apps.dump 2>&1 | grep -v "already exists" | grep -v "^$" || true
rm /tmp/frontend_apps.dump

COUNT=$(docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-WORKSPACE" -tAc 'SELECT COUNT(*) FROM workspace.workspace_items;')
log_success "APPS-WORKSPACE migrated ($COUNT items)"

echo ""
echo "=========================================="
log_success "Migration completed successfully!"
echo "=========================================="
echo ""

