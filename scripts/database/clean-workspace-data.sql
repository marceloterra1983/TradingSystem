-- ============================================================================
-- Clean Workspace Database - Remove Test Data
-- Database: APPS-WORKSPACE (workspace schema)
-- Purpose: Clear all test data while preserving structure and migrations
-- ============================================================================

SET search_path TO workspace, public;

-- ============================================================================
-- BEFORE CLEANUP - Show current data counts
-- ============================================================================

SELECT 'BEFORE CLEANUP - Data Counts' AS status;

SELECT
  'workspace_items' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('workspace_items')) AS total_size
FROM workspace_items
UNION ALL
SELECT
  'workspace_audit_log' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('workspace_audit_log')) AS total_size
FROM workspace_audit_log;

-- ============================================================================
-- DELETE ALL DATA
-- ============================================================================

-- Delete all audit log entries
DELETE FROM workspace_audit_log;

-- Delete all workspace items
DELETE FROM workspace_items;

-- ============================================================================
-- VACUUM AND ANALYZE (Reclaim space and update statistics)
-- ============================================================================

VACUUM FULL workspace_items;
VACUUM FULL workspace_audit_log;

ANALYZE workspace_items;
ANALYZE workspace_audit_log;

-- ============================================================================
-- AFTER CLEANUP - Verify empty tables
-- ============================================================================

SELECT 'AFTER CLEANUP - Data Counts' AS status;

SELECT
  'workspace_items' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('workspace_items')) AS total_size
FROM workspace_items
UNION ALL
SELECT
  'workspace_audit_log' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('workspace_audit_log')) AS total_size
FROM workspace_audit_log;

-- ============================================================================
-- RESET TIMESCALEDB COMPRESSION (If needed)
-- ============================================================================

-- Decompress any compressed chunks
SELECT decompress_chunk(chunk, if_compressed => TRUE)
FROM timescaledb_information.chunks
WHERE hypertable_name IN ('workspace_items', 'workspace_audit_log')
AND is_compressed = TRUE;

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================

SELECT
  'Workspace database cleaned successfully!' AS status,
  NOW() AS completed_at;
