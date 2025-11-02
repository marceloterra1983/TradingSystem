-- ============================================================================
-- Migration: 003_add_timestamp_columns.sql
-- Database: APPS-TPCAPITAL (tp_capital schema)
-- Purpose: Add created_at and updated_at columns to tp_capital_signals
-- Issue: Query failing with "column created_at does not exist"
-- ============================================================================

SET search_path TO tp_capital, public;

-- ============================================================================
-- Add timestamp columns if they don't exist
-- ============================================================================

-- Add created_at (defaults to ingested_at for existing rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'tp_capital' 
    AND table_name = 'tp_capital_signals' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tp_capital.tp_capital_signals 
    ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Backfill created_at from ingested_at for existing rows
    UPDATE tp_capital.tp_capital_signals 
    SET created_at = ingested_at 
    WHERE created_at IS NULL;
    
    RAISE NOTICE 'Column created_at added successfully';
  ELSE
    RAISE NOTICE 'Column created_at already exists';
  END IF;
END $$;

-- Add updated_at (defaults to created_at or ingested_at for existing rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'tp_capital' 
    AND table_name = 'tp_capital_signals' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE tp_capital.tp_capital_signals 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Backfill updated_at from created_at or ingested_at for existing rows
    UPDATE tp_capital.tp_capital_signals 
    SET updated_at = COALESCE(created_at, ingested_at)
    WHERE updated_at IS NULL;
    
    RAISE NOTICE 'Column updated_at added successfully';
  ELSE
    RAISE NOTICE 'Column updated_at already exists';
  END IF;
END $$;

-- ============================================================================
-- Add indexes for new columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_created_at 
ON tp_capital.tp_capital_signals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_updated_at 
ON tp_capital.tp_capital_signals(updated_at DESC);

-- ============================================================================
-- Create trigger to auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION tp_capital.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tp_capital_signals_updated_at 
ON tp_capital.tp_capital_signals;

CREATE TRIGGER update_tp_capital_signals_updated_at
BEFORE UPDATE ON tp_capital.tp_capital_signals
FOR EACH ROW
EXECUTE FUNCTION tp_capital.update_updated_at_column();

-- ============================================================================
-- Verify columns exist
-- ============================================================================

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'tp_capital'
  AND table_name = 'tp_capital_signals'
  AND column_name IN ('created_at', 'updated_at')
ORDER BY column_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Expected output:
-- column_name | data_type                | is_nullable | column_default
-- created_at  | timestamp with time zone | YES         | now()
-- updated_at  | timestamp with time zone | YES         | now()

