-- Migration: Create documentation_audit_log table
-- Description: Audit trail for all changes (create, update, delete)
-- Created: 2025-10-13

CREATE TABLE IF NOT EXISTS documentation_audit_log (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  entity_type SYMBOL CAPACITY 32 CACHE,     -- 'system', 'idea', 'file'
  entity_id STRING,
  action SYMBOL CAPACITY 16 CACHE,          -- 'create', 'update', 'delete'
  user_id STRING,                           -- Who made the change
  changes STRING,                           -- JSON string of what changed
  ip_address STRING,
  user_agent STRING,
  ts TIMESTAMP                              -- Designated timestamp column
) timestamp(ts) PARTITION BY MONTH;

-- Indexes on entity_type and action enable fast audit queries
-- Example: "Show all deletions" or "Show all changes to systems"
