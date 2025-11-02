-- ============================================================================
-- Migration: 002_enable_compression.sql
-- Database: APPS-TPCAPITAL (tp-capital schema)
-- Purpose: OPT-006 - Enable TimescaleDB compression for tp_capital_signals
-- Expected Impact: ~40ms query time reduction, 70-80% storage reduction
-- ============================================================================

SET search_path TO tp_capital, public;

-- ============================================================================
-- ENABLE COMPRESSION
-- ============================================================================

-- Enable compression on tp_capital_signals hypertable
ALTER TABLE tp_capital_signals SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'asset, channel, signal_type',
  timescaledb.compress_orderby = 'created_at DESC'
);

-- ============================================================================
-- ADD COMPRESSION POLICIES
-- ============================================================================

-- Compress chunks older than 7 days
SELECT add_compression_policy('tp_capital_signals', INTERVAL '7 days', if_not_exists => TRUE);

-- ============================================================================
-- ADD RETENTION POLICIES
-- ============================================================================

-- Retain trading signals for 1 year
SELECT add_retention_policy('tp_capital_signals', INTERVAL '1 year', if_not_exists => TRUE);

-- ============================================================================
-- CONTINUOUS AGGREGATES (Optional Performance Enhancement)
-- ============================================================================

-- Create materialized view for daily signal summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS tp_capital_signals_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', created_at) AS bucket,
  asset,
  signal_type,
  COUNT(*) AS signal_count,
  AVG(entry_price) AS avg_entry_price,
  MIN(entry_price) AS min_entry_price,
  MAX(entry_price) AS max_entry_price
FROM tp_capital_signals
GROUP BY bucket, asset, signal_type;

-- Add refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('tp_capital_signals_daily',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check compression settings
SELECT
  hypertable_schema || '.' || hypertable_name AS hypertable,
  compression_enabled
FROM timescaledb_information.hypertables
WHERE hypertable_schema = 'tp_capital';

-- Check compression configuration
SELECT * FROM timescaledb_information.hypertable_compression_settings;

-- Record migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'tp_capital'
             AND table_name = 'schema_version') THEN
    INSERT INTO tp_capital.schema_version (version, description)
    VALUES ('002', 'OPT-006: Enable TimescaleDB compression and retention policies')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
