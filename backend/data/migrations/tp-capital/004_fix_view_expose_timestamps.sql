-- ============================================================================
-- Migration: 004_fix_view_expose_timestamps.sql
-- Database: APPS-TPCAPITAL (tp_capital schema)
-- Purpose: Fix tp_capital_signals VIEW to expose created_at and updated_at
-- Issue: VIEW was hiding created_at/updated_at columns causing query failures
-- ============================================================================

SET search_path TO tp_capital, public;

-- ============================================================================
-- Drop and recreate VIEW with all columns
-- ============================================================================

DROP VIEW IF EXISTS tp_capital.tp_capital_signals CASCADE;

CREATE OR REPLACE VIEW tp_capital.tp_capital_signals AS
SELECT 
  id,
  ts,
  channel,
  signal_type,
  asset,
  buy_min,
  buy_max,
  target_1,
  target_2,
  target_final,
  stop,
  raw_message,
  source,
  ingested_at,
  created_at,  -- ✅ NOW EXPOSED
  updated_at,  -- ✅ NOW EXPOSED
  status,
  priority,
  tags,
  metadata,
  created_by,
  updated_by
FROM tp_capital.signals_v2;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT ON tp_capital.tp_capital_signals TO timescale;

-- ============================================================================
-- Verify VIEW structure
-- ============================================================================

SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'tp_capital'
  AND table_name = 'tp_capital_signals'
  AND column_name IN ('ingested_at', 'created_at', 'updated_at')
ORDER BY column_name;

-- Expected output:
-- column_name  | data_type
-- created_at   | timestamp with time zone
-- ingested_at  | timestamp with time zone
-- updated_at   | timestamp with time zone

COMMENT ON VIEW tp_capital.tp_capital_signals IS 
  'View exposing all columns from signals_v2 for backward compatibility. Fixed 2025-11-02 to include created_at and updated_at.';

