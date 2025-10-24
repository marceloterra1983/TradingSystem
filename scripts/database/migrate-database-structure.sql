-- =====================================================
-- Database Structure Migration Script
-- =====================================================
-- Migrates from:
--   tradingsystem (public schema) -> APPS-TPCAPITAL (tp-capital schema)
--   frontend_apps (workspace schema) -> APPS-WORKSPACE (workspace schema)
--
-- Author: TradingSystem Team
-- Date: 2025-10-24
-- =====================================================

\echo '=========================================='
\echo 'Starting Database Structure Migration'
\echo '=========================================='

-- =====================================================
-- PART 1: Create New Databases
-- =====================================================

\echo ''
\echo '1. Creating new databases...'

-- Create APPS-TPCAPITAL database
CREATE DATABASE "APPS-TPCAPITAL"
    WITH 
    OWNER = timescale
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    TEMPLATE template0;

\echo '  ✓ Database APPS-TPCAPITAL created'

-- Create APPS-WORKSPACE database
CREATE DATABASE "APPS-WORKSPACE"
    WITH 
    OWNER = timescale
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    TEMPLATE template0;

\echo '  ✓ Database APPS-WORKSPACE created'

-- =====================================================
-- PART 2: Setup APPS-TPCAPITAL
-- =====================================================

\echo ''
\echo '2. Setting up APPS-TPCAPITAL...'

\c "APPS-TPCAPITAL"

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
\echo '  ✓ TimescaleDB extension enabled'

-- Create tp-capital schema
CREATE SCHEMA IF NOT EXISTS "tp-capital" AUTHORIZATION timescale;
\echo '  ✓ Schema tp-capital created'

-- Set search path
SET search_path TO "tp-capital", public;

-- =====================================================
-- PART 3: Migrate TP-CAPITAL Data
-- =====================================================

\echo ''
\echo '3. Migrating TP-CAPITAL data...'

-- Connect to source database and export data
\c tradingsystem

-- Create temporary file with data
\copy (SELECT * FROM public.tp_capital_signals) TO '/tmp/tp_capital_signals.csv' WITH CSV HEADER;
\copy (SELECT * FROM public.telegram_bots) TO '/tmp/telegram_bots.csv' WITH CSV HEADER;
\copy (SELECT * FROM public.telegram_channels) TO '/tmp/telegram_channels.csv' WITH CSV HEADER;

\echo '  ✓ Data exported from tradingsystem'

-- Switch to new database
\c "APPS-TPCAPITAL"

SET search_path TO "tp-capital", public;

-- Create tp_capital_signals table
CREATE TABLE IF NOT EXISTS "tp-capital".tp_capital_signals (
    id SERIAL PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL,
    channel VARCHAR(255),
    signal_type VARCHAR(100),
    asset VARCHAR(50) NOT NULL,
    buy_min NUMERIC(18, 8),
    buy_max NUMERIC(18, 8),
    target_1 NUMERIC(18, 8),
    target_2 NUMERIC(18, 8),
    target_final NUMERIC(18, 8),
    stop NUMERIC(18, 8),
    raw_message TEXT,
    source VARCHAR(50) DEFAULT 'telegram',
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

\echo '  ✓ Table tp_capital_signals created'

-- Create telegram_bots table
CREATE TABLE IF NOT EXISTS "tp-capital".telegram_bots (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    token TEXT NOT NULL,
    bot_type VARCHAR(50) DEFAULT 'ingestion',
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

\echo '  ✓ Table telegram_bots created'

-- Create telegram_channels table
CREATE TABLE IF NOT EXISTS "tp-capital".telegram_channels (
    id SERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL UNIQUE,
    channel_name VARCHAR(255),
    channel_type VARCHAR(50) DEFAULT 'source',
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

\echo '  ✓ Table telegram_channels created'

-- Import data
\copy "tp-capital".tp_capital_signals FROM '/tmp/tp_capital_signals.csv' WITH CSV HEADER;
\copy "tp-capital".telegram_bots FROM '/tmp/telegram_bots.csv' WITH CSV HEADER;
\copy "tp-capital".telegram_channels FROM '/tmp/telegram_channels.csv' WITH CSV HEADER;

\echo '  ✓ Data imported to APPS-TPCAPITAL'

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_ts ON "tp-capital".tp_capital_signals(ts DESC);
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_asset ON "tp-capital".tp_capital_signals(asset);
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_source ON "tp-capital".tp_capital_signals(source);
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_ingested_at ON "tp-capital".tp_capital_signals(ingested_at DESC);

\echo '  ✓ Indexes created'

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION "tp-capital".update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_tp_capital_signals_updated_at
    BEFORE UPDATE ON "tp-capital".tp_capital_signals
    FOR EACH ROW
    EXECUTE FUNCTION "tp-capital".update_updated_at_column();

CREATE TRIGGER trigger_telegram_bots_updated_at
    BEFORE UPDATE ON "tp-capital".telegram_bots
    FOR EACH ROW
    EXECUTE FUNCTION "tp-capital".update_updated_at_column();

CREATE TRIGGER trigger_telegram_channels_updated_at
    BEFORE UPDATE ON "tp-capital".telegram_channels
    FOR EACH ROW
    EXECUTE FUNCTION "tp-capital".update_updated_at_column();

\echo '  ✓ Triggers created'

-- =====================================================
-- PART 4: Setup APPS-WORKSPACE
-- =====================================================

\echo ''
\echo '4. Setting up APPS-WORKSPACE...'

\c "APPS-WORKSPACE"

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
\echo '  ✓ TimescaleDB extension enabled'

-- Create workspace schema
CREATE SCHEMA IF NOT EXISTS workspace AUTHORIZATION timescale;
\echo '  ✓ Schema workspace created'

SET search_path TO workspace, public;

-- =====================================================
-- PART 5: Migrate WORKSPACE Data
-- =====================================================

\echo ''
\echo '5. Migrating WORKSPACE data...'

-- Connect to source database
\c frontend_apps

SET search_path TO workspace, public;

-- Export data
\copy workspace.workspace_items TO '/tmp/workspace_items.csv' WITH CSV HEADER;
\copy workspace.workspace_audit_log TO '/tmp/workspace_audit_log.csv' WITH CSV HEADER;
\copy workspace.schema_version TO '/tmp/schema_version.csv' WITH CSV HEADER;

\echo '  ✓ Data exported from frontend_apps'

-- Switch to new database
\c "APPS-WORKSPACE"

SET search_path TO workspace, public;

-- Create workspace_items table
CREATE TABLE IF NOT EXISTS workspace.workspace_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    description TEXT,
    favicon_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_url UNIQUE (url)
);

\echo '  ✓ Table workspace_items created'

-- Create workspace_audit_log table
CREATE TABLE IF NOT EXISTS workspace.workspace_audit_log (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES workspace.workspace_items(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

\echo '  ✓ Table workspace_audit_log created'

-- Create schema_version table
CREATE TABLE IF NOT EXISTS workspace.schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT
);

\echo '  ✓ Table schema_version created'

-- Import data
\copy workspace.workspace_items FROM '/tmp/workspace_items.csv' WITH CSV HEADER;
\copy workspace.workspace_audit_log FROM '/tmp/workspace_audit_log.csv' WITH CSV HEADER;
\copy workspace.schema_version FROM '/tmp/schema_version.csv' WITH CSV HEADER;

\echo '  ✓ Data imported to APPS-WORKSPACE'

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workspace_items_category ON workspace.workspace_items(category);
CREATE INDEX IF NOT EXISTS idx_workspace_items_created_at ON workspace.workspace_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_items_tags ON workspace.workspace_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_workspace_items_metadata ON workspace.workspace_items USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_item_id ON workspace.workspace_audit_log(item_id);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_changed_at ON workspace.workspace_audit_log(changed_at DESC);

\echo '  ✓ Indexes created'

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION workspace.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workspace_items_updated_at
    BEFORE UPDATE ON workspace.workspace_items
    FOR EACH ROW
    EXECUTE FUNCTION workspace.update_updated_at_column();

\echo '  ✓ Triggers created'

-- =====================================================
-- PART 6: Verify Migration
-- =====================================================

\echo ''
\echo '6. Verifying migration...'

\c "APPS-TPCAPITAL"
SET search_path TO "tp-capital", public;

\echo ''
\echo 'APPS-TPCAPITAL:'
SELECT 
    'tp_capital_signals' as table_name,
    COUNT(*) as record_count
FROM "tp-capital".tp_capital_signals
UNION ALL
SELECT 
    'telegram_bots' as table_name,
    COUNT(*) as record_count
FROM "tp-capital".telegram_bots
UNION ALL
SELECT 
    'telegram_channels' as table_name,
    COUNT(*) as record_count
FROM "tp-capital".telegram_channels;

\c "APPS-WORKSPACE"
SET search_path TO workspace, public;

\echo ''
\echo 'APPS-WORKSPACE:'
SELECT 
    'workspace_items' as table_name,
    COUNT(*) as record_count
FROM workspace.workspace_items
UNION ALL
SELECT 
    'workspace_audit_log' as table_name,
    COUNT(*) as record_count
FROM workspace.workspace_audit_log
UNION ALL
SELECT 
    'schema_version' as table_name,
    COUNT(*) as record_count
FROM workspace.schema_version;

-- Clean up temporary files
\! rm -f /tmp/tp_capital_signals.csv /tmp/telegram_bots.csv /tmp/telegram_channels.csv
\! rm -f /tmp/workspace_items.csv /tmp/workspace_audit_log.csv /tmp/schema_version.csv

\echo ''
\echo '=========================================='
\echo 'Migration completed successfully!'
\echo '=========================================='
\echo ''
\echo 'Next steps:'
\echo '1. Update application configurations to use new databases'
\echo '2. Test application connections'
\echo '3. Once verified, drop old databases:'
\echo '   DROP DATABASE tradingsystem;'
\echo '   DROP DATABASE frontend_apps;'
\echo ''

