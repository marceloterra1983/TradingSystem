#!/bin/bash
# ==============================================================================
# Workspace Database Performance Analysis
# ==============================================================================
# Analyzes database performance, queries, and index usage
#
# Usage:
#   bash scripts/database/analyze-workspace-performance.sh
#
# What this script checks:
#   1. Table sizes and row counts
#   2. Index usage statistics
#   3. Missing indexes
#   4. Vacuum and analyze status
#   5. Connection pool status
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="tools/compose/docker-compose.4-3-workspace-stack.yml"

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}Workspace Database Performance Analysis${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# ==============================================================================
# 1. Table Sizes and Row Counts
# ==============================================================================
echo -e "${YELLOW}1. Table Sizes and Row Counts:${NC}"

docker compose -f "$COMPOSE_FILE" exec -T workspace-db psql -U postgres -d workspace <<'EOF'
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
  (SELECT count(*) FROM workspace.workspace_items) as row_count
FROM pg_tables
WHERE schemaname = 'workspace'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF

echo ""

# ==============================================================================
# 2. Index Usage Statistics
# ==============================================================================
echo -e "${YELLOW}2. Index Usage Statistics:${NC}"

docker compose -f "$COMPOSE_FILE" exec -T workspace-db psql -U postgres -d workspace <<'EOF'
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'workspace'
ORDER BY idx_scan DESC;
EOF

echo ""

# ==============================================================================
# 3. Unused Indexes (Potential candidates for removal)
# ==============================================================================
echo -e "${YELLOW}3. Unused Indexes (idx_scan = 0):${NC}"

docker compose -f "$COMPOSE_FILE" exec -T workspace-db psql -U postgres -d workspace <<'EOF'
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'workspace'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
EOF

echo ""

# ==============================================================================
# 4. Table Statistics (Last Vacuum/Analyze)
# ==============================================================================
echo -e "${YELLOW}4. Table Maintenance Status:${NC}"

docker compose -f "$COMPOSE_FILE" exec -T workspace-db psql -U postgres -d workspace <<'EOF'
SELECT
  schemaname,
  relname as table_name,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'workspace'
ORDER BY relname;
EOF

echo ""

# ==============================================================================
# 5. Sequential Scans vs Index Scans
# ==============================================================================
echo -e "${YELLOW}5. Sequential Scans vs Index Scans:${NC}"

docker compose -f "$COMPOSE_FILE" exec -T workspace-db psql -U postgres -d workspace <<'EOF'
SELECT
  schemaname,
  relname as table_name,
  seq_scan as sequential_scans,
  seq_tup_read as seq_tuples_read,
  idx_scan as index_scans,
  idx_tup_fetch as idx_tuples_fetched,
  CASE
    WHEN seq_scan = 0 THEN 'N/A'
    WHEN idx_scan = 0 THEN '0%'
    ELSE round(100.0 * idx_scan / (seq_scan + idx_scan), 2)::text || '%'
  END as index_usage_pct
FROM pg_stat_user_tables
WHERE schemaname = 'workspace'
ORDER BY seq_scan DESC;
EOF

echo ""

# ==============================================================================
# 6. Database Connections
# ==============================================================================
echo -e "${YELLOW}6. Database Connections:${NC}"

docker compose -f "$COMPOSE_FILE" exec -T workspace-db psql -U postgres -d workspace <<'EOF'
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = 'workspace';
EOF

echo ""

# ==============================================================================
# 7. Cache Hit Ratio (should be >99%)
# ==============================================================================
echo -e "${YELLOW}7. Cache Hit Ratio:${NC}"

docker compose -f "$COMPOSE_FILE" exec -T workspace-db psql -U postgres -d workspace <<'EOF'
SELECT
  'Workspace DB' as database,
  round(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0), 2) as cache_hit_ratio_pct
FROM pg_stat_database
WHERE datname = 'workspace';
EOF

echo ""

# ==============================================================================
# 8. Table Bloat Analysis
# ==============================================================================
echo -e "${YELLOW}8. Table Bloat (Dead Tuples):${NC}"

docker compose -f "$COMPOSE_FILE" exec -T workspace-db psql -U postgres -d workspace <<'EOF'
SELECT
  schemaname,
  relname as table_name,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  CASE
    WHEN n_live_tup = 0 THEN 0
    ELSE round(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2)
  END as dead_tuple_pct
FROM pg_stat_user_tables
WHERE schemaname = 'workspace'
ORDER BY n_dead_tup DESC;
EOF

echo ""

# ==============================================================================
# Summary
# ==============================================================================
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}✅ Analysis complete${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""
echo -e "${YELLOW}Recommendations:${NC}"
echo -e "  1. If cache hit ratio < 99%, consider increasing shared_buffers"
echo -e "  2. If dead_tuple_pct > 20%, run VACUUM ANALYZE"
echo -e "  3. If seq_scan > idx_scan for large tables, add indexes"
echo -e "  4. If unused indexes exist (idx_scan = 0), consider removing them"
echo ""
