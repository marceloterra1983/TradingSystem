-- ============================================================================
-- Migration: 003_enable_compression.sql
-- Database: APPS-WORKSPACE (workspace schema)
-- Purpose: OPT-006 - Enable TimescaleDB compression for workspace_items
-- Expected Impact: ~40ms query time reduction, 70-80% storage reduction
-- ============================================================================

SET search_path TO workspace, public;

-- ============================================================================
-- ENABLE COMPRESSION
-- ============================================================================

-- Enable compression on workspace_items hypertable
ALTER TABLE workspace_items SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'category, priority, status',
  timescaledb.compress_orderby = 'created_at DESC'
);

-- Enable compression on workspace_audit_log hypertable
ALTER TABLE workspace_audit_log SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'item_id, action',
  timescaledb.compress_orderby = 'changed_at DESC'
);

-- ============================================================================
-- ADD COMPRESSION POLICIES
-- ============================================================================

-- Compress workspace_items chunks older than 30 days
SELECT add_compression_policy('workspace_items', INTERVAL '30 days', if_not_exists => TRUE);

-- Compress workspace_audit_log chunks older than 7 days
SELECT add_compression_policy('workspace_audit_log', INTERVAL '7 days', if_not_exists => TRUE);

-- ============================================================================
-- ADD RETENTION POLICIES
-- ============================================================================

-- Retain workspace_items for 2 years
SELECT add_retention_policy('workspace_items', INTERVAL '2 years', if_not_exists => TRUE);

-- Retain workspace_audit_log for 1 year
SELECT add_retention_policy('workspace_audit_log', INTERVAL '1 year', if_not_exists => TRUE);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check compression settings
SELECT
  hypertable_schema || '.' || hypertable_name AS hypertable,
  compression_enabled
FROM timescaledb_information.hypertables
WHERE hypertable_schema = 'workspace';

-- Check compression configuration
SELECT * FROM timescaledb_information.hypertable_compression_settings;

-- Record migration
INSERT INTO workspace.schema_version (version, description)
VALUES ('003', 'OPT-006: Enable TimescaleDB compression and retention policies')
ON CONFLICT (version) DO NOTHING;
