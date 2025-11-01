-- ============================================================================
-- Migration: 001_add_performance_indexes.sql
-- Database: APPS-WORKSPACE (workspace schema)
-- Purpose: OPT-002 - Add performance indexes to workspace_items table
-- Expected Impact: ~60ms query time reduction
-- ============================================================================

-- Set search path to workspace schema
SET search_path TO workspace, public;

-- ============================================================================
-- SINGLE COLUMN INDEXES (Basic Query Optimization)
-- ============================================================================

-- Index on category (frequent filtering)
-- Supports: WHERE category = 'documentacao'
CREATE INDEX IF NOT EXISTS idx_workspace_items_category
ON workspace_items(category);

-- Index on priority (frequent filtering and sorting)
-- Supports: WHERE priority = 'high', ORDER BY priority
CREATE INDEX IF NOT EXISTS idx_workspace_items_priority
ON workspace_items(priority);

-- Index on status (frequent filtering)
-- Supports: WHERE status = 'in-progress'
CREATE INDEX IF NOT EXISTS idx_workspace_items_status
ON workspace_items(status);

-- Index on created_at DESC (frequent sorting, chronological queries)
-- Supports: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_workspace_items_created_at_desc
ON workspace_items(created_at DESC);

-- Index on updated_at DESC (recently modified items)
-- Supports: ORDER BY updated_at DESC, WHERE updated_at > '2025-01-01'
CREATE INDEX IF NOT EXISTS idx_workspace_items_updated_at_desc
ON workspace_items(updated_at DESC);

-- ============================================================================
-- GIN INDEXES (Array and JSONB Search)
-- ============================================================================

-- GIN index on tags array (array containment queries)
-- Supports: WHERE 'trading' = ANY(tags), WHERE tags @> ARRAY['ml', 'python']
CREATE INDEX IF NOT EXISTS idx_workspace_items_tags_gin
ON workspace_items USING GIN(tags);

-- GIN index on metadata JSONB (metadata field queries)
-- Supports: WHERE metadata @> '{"complexity": "high"}'
CREATE INDEX IF NOT EXISTS idx_workspace_items_metadata_gin
ON workspace_items USING GIN(metadata jsonb_path_ops);

-- ============================================================================
-- COMPOSITE INDEXES (Multi-Column Query Optimization)
-- ============================================================================

-- Composite index: category + status + created_at DESC
-- Supports: WHERE category = 'X' AND status = 'Y' ORDER BY created_at DESC
-- Common pattern: "Show me in-progress items in category X, most recent first"
CREATE INDEX IF NOT EXISTS idx_workspace_items_category_status_created
ON workspace_items(category, status, created_at DESC);

-- Composite index: priority + status + created_at DESC
-- Supports: WHERE priority = 'high' AND status = 'new' ORDER BY created_at DESC
-- Common pattern: "Show me high priority active items, most recent first"
CREATE INDEX IF NOT EXISTS idx_workspace_items_priority_status_created
ON workspace_items(priority, status, created_at DESC);

-- Composite index: status + updated_at DESC
-- Supports: WHERE status = 'in-progress' ORDER BY updated_at DESC
-- Common pattern: "Show me active items, most recently updated first"
CREATE INDEX IF NOT EXISTS idx_workspace_items_status_updated
ON workspace_items(status, updated_at DESC);

-- ============================================================================
-- PARTIAL INDEXES (Filtered Index Optimization)
-- ============================================================================

-- Partial index: Active items only (status NOT IN completed/rejected)
-- Supports: WHERE status NOT IN ('completed', 'rejected') ORDER BY created_at DESC
-- Benefit: Smaller index size, faster queries for active items (most common use case)
CREATE INDEX IF NOT EXISTS idx_workspace_items_active_items
ON workspace_items(created_at DESC)
WHERE status NOT IN ('completed', 'rejected');

-- Partial index: High priority items only
-- Supports: WHERE priority IN ('high', 'critical') AND status = 'new'
-- Benefit: Fast retrieval of urgent items requiring attention
CREATE INDEX IF NOT EXISTS idx_workspace_items_high_priority
ON workspace_items(status, created_at DESC)
WHERE priority IN ('high', 'critical');

-- Partial index: Recently created items (last 90 days)
-- NOTE: Disabled because NOW() is not IMMUTABLE and cannot be used in index predicates
-- Alternative: Use application-level filtering or scheduled index maintenance
-- Supports: WHERE created_at > NOW() - INTERVAL '90 days'
-- Benefit: Optimizes queries for recent items (hot data)
-- CREATE INDEX IF NOT EXISTS idx_workspace_items_recent
-- ON workspace_items(category, status)
-- WHERE created_at > '2025-01-01';  -- Use fixed date instead

-- ============================================================================
-- TEXT SEARCH INDEXES (Full-Text Search - Optional Enhancement)
-- ============================================================================

-- GIN index for full-text search on title and description
-- Supports: WHERE to_tsvector('english', title || ' ' || description) @@ to_tsquery('trading')
CREATE INDEX IF NOT EXISTS idx_workspace_items_fts
ON workspace_items USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================================
-- ANALYZE TABLES (Update Query Planner Statistics)
-- ============================================================================

ANALYZE workspace_items;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all indexes on workspace_items
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'workspace'
  AND tablename = 'workspace_items'
ORDER BY indexname;

-- Check index sizes
SELECT
  indexrelname AS indexname,
  pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'workspace'
  AND relname = 'workspace_items'
ORDER BY pg_relation_size(indexrelid::regclass) DESC;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Record migration in schema_version table
INSERT INTO workspace.schema_version (version, description)
VALUES ('001', 'OPT-002: Add performance indexes to workspace_items')
ON CONFLICT (version) DO NOTHING;

-- Expected Query Performance Improvements:
-- - Simple filters (category, priority, status): ~50-70ms faster
-- - Sorted queries (ORDER BY created_at DESC): ~40-60ms faster
-- - Composite queries (category + status + sort): ~60-80ms faster
-- - Tag searches (ANY, @>): ~30-50ms faster
-- - Active items queries (partial index): ~70-90ms faster
-- - Full-text search: ~100-200ms faster
--
-- Total Expected Impact: ~60ms average query time reduction
