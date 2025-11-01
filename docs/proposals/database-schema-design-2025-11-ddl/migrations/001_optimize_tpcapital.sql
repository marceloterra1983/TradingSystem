-- =============================================================================
-- Migration: Optimize APPS-TPCAPITAL Schema
-- Database: APPS-TPCAPITAL
-- Purpose: Add indexes, compression, and constraints for performance
-- Created: 2025-11-01
-- =============================================================================

-- Connect to database
\c APPS-TPCAPITAL

SET search_path TO "tp-capital", public;

BEGIN;

-- =============================================================================
-- STEP 1: Add Composite Indexes for Dashboard Queries
-- =============================================================================

-- Dashboard filter: channel + asset + created_at
CREATE INDEX IF NOT EXISTS idx_signals_dashboard_composite 
  ON "tp-capital".tp_capital_signals (channel, asset, created_at DESC)
  INCLUDE (signal_type, entry_price, stop_loss, take_profit);

COMMENT ON INDEX idx_signals_dashboard_composite IS 'Optimized index for dashboard filters and display';

-- Symbol search index (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_signals_asset_lower 
  ON "tp-capital".tp_capital_signals (LOWER(asset), created_at DESC);

-- =============================================================================
-- STEP 2: Add Soft Delete Support
-- =============================================================================

-- Add soft delete columns
ALTER TABLE "tp-capital".tp_capital_signals 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100) NULL;

-- Index for active records only (partial index)
CREATE INDEX IF NOT EXISTS idx_signals_active 
  ON "tp-capital".tp_capital_signals (created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN "tp-capital".tp_capital_signals.deleted_at IS 'Soft delete timestamp for audit trail';

-- =============================================================================
-- STEP 3: Add Data Validation Constraints
-- =============================================================================

-- Ensure prices are positive
ALTER TABLE "tp-capital".tp_capital_signals
  ADD CONSTRAINT IF NOT EXISTS chk_entry_price_positive 
  CHECK (entry_price IS NULL OR entry_price > 0);

ALTER TABLE "tp-capital".tp_capital_signals
  ADD CONSTRAINT IF NOT EXISTS chk_stop_loss_positive 
  CHECK (stop_loss IS NULL OR stop_loss > 0);

ALTER TABLE "tp-capital".tp_capital_signals
  ADD CONSTRAINT IF NOT EXISTS chk_take_profit_positive 
  CHECK (take_profit IS NULL OR take_profit > 0);

-- Ensure logical price relationships
ALTER TABLE "tp-capital".tp_capital_signals
  ADD CONSTRAINT IF NOT EXISTS chk_buy_signals_logic 
  CHECK (
    signal_type IS NULL OR 
    signal_type NOT ILIKE '%buy%' OR 
    (stop_loss IS NULL OR entry_price IS NULL OR stop_loss < entry_price)
  );

ALTER TABLE "tp-capital".tp_capital_signals
  ADD CONSTRAINT IF NOT EXISTS chk_sell_signals_logic 
  CHECK (
    signal_type IS NULL OR 
    signal_type NOT ILIKE '%sell%' OR 
    (stop_loss IS NULL OR entry_price IS NULL OR stop_loss > entry_price)
  );

-- =============================================================================
-- STEP 4: Enable Compression for Historical Data
-- =============================================================================

-- Configure compression (if not already enabled)
ALTER TABLE "tp-capital".tp_capital_signals SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'channel,asset',
  timescaledb.compress_orderby = 'created_at DESC'
);

-- Add compression policy: compress data older than 7 days
SELECT add_compression_policy('tp-capital.tp_capital_signals', INTERVAL '7 days', 
  if_not_exists => true);

-- =============================================================================
-- STEP 5: Add Retention Policy
-- =============================================================================

-- Retention: keep 90 days online, archive to Parquet after
SELECT add_retention_policy('tp-capital.tp_capital_signals', INTERVAL '90 days',
  if_not_exists => true);

-- =============================================================================
-- STEP 6: Create Materialized View for Dashboard Aggregations
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS "tp-capital".mv_signal_summary_daily CASCADE;

CREATE MATERIALIZED VIEW "tp-capital".mv_signal_summary_daily
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 day', created_at) as signal_date,
  channel,
  signal_type,
  COUNT(*) as signal_count,
  COUNT(DISTINCT asset) as unique_assets,
  AVG(entry_price) as avg_entry_price,
  MAX(created_at) as last_signal_time
FROM "tp-capital".tp_capital_signals
WHERE deleted_at IS NULL
GROUP BY signal_date, channel, signal_type
WITH NO DATA;

COMMENT ON MATERIALIZED VIEW "tp-capital".mv_signal_summary_daily IS 'Daily signal aggregations for dashboard';

-- Unique index for materialized view
CREATE UNIQUE INDEX idx_mv_signal_summary_pk 
  ON "tp-capital".mv_signal_summary_daily (signal_date, channel, signal_type);

-- Auto-refresh policy: every 15 minutes
SELECT add_continuous_aggregate_policy('mv_signal_summary_daily',
  start_offset => INTERVAL '1 month',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '15 minutes',
  if_not_exists => true);

-- =============================================================================
-- STEP 7: Update Statistics for Query Planner
-- =============================================================================

ANALYZE "tp-capital".tp_capital_signals;
ANALYZE "tp-capital".telegram_bots;
ANALYZE "tp-capital".telegram_channels;

-- =============================================================================
-- STEP 8: Vacuum and Reindex
-- =============================================================================

VACUUM ANALYZE "tp-capital".tp_capital_signals;
REINDEX TABLE CONCURRENTLY "tp-capital".tp_capital_signals;

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

\echo '✅ Migration 001: APPS-TPCAPITAL Optimization Complete'
\echo ''
\echo 'Verify hypertable configuration:'
SELECT * FROM timescaledb_information.compression_settings 
WHERE hypertable_schema = 'tp-capital' AND hypertable_name = 'tp_capital_signals';

\echo ''
\echo 'Verify indexes:'
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'tp-capital' AND tablename = 'tp_capital_signals'
ORDER BY indexname;

\echo ''
\echo 'Verify continuous aggregates:'
SELECT view_name, view_owner, materialization_hypertable_name
FROM timescaledb_information.continuous_aggregates
WHERE view_schema = 'tp-capital';

-- =============================================================================
-- ROLLBACK PLAN (if needed)
-- =============================================================================

-- DROP INDEX IF EXISTS idx_signals_dashboard_composite;
-- DROP INDEX IF EXISTS idx_signals_asset_lower;
-- DROP INDEX IF EXISTS idx_signals_active;
-- ALTER TABLE "tp-capital".tp_capital_signals DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE "tp-capital".tp_capital_signals DROP COLUMN IF EXISTS deleted_by;
-- DROP MATERIALIZED VIEW IF EXISTS "tp-capital".mv_signal_summary_daily CASCADE;
-- SELECT remove_compression_policy('tp-capital.tp_capital_signals');
-- SELECT remove_retention_policy('tp-capital.tp_capital_signals');

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================


