-- Migration: Create documentation_ideas table
-- Description: Stores documentation improvement ideas with Kanban workflow
-- Created: 2025-10-13

CREATE TABLE IF NOT EXISTS documentation_ideas (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  title STRING,
  description STRING,
  status SYMBOL CAPACITY 16 CACHE INDEX,     -- 'backlog', 'in_progress', 'done', 'cancelled'
  category SYMBOL CAPACITY 32 CACHE INDEX,   -- 'api', 'guide', 'reference', 'tutorial'
  priority SYMBOL CAPACITY 16 CACHE INDEX,   -- 'low', 'medium', 'high', 'critical'
  tags SYMBOL CAPACITY 256 CACHE INDEX,
  created_by STRING,                         -- User identifier (future auth)
  assigned_to STRING,                        -- Assignee (future)
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP,                    -- When status changed to 'done'
  ts TIMESTAMP                               -- Designated timestamp column
) timestamp(ts) PARTITION BY MONTH;

-- Indexes automatically created for SYMBOL columns with CACHE INDEX
-- This provides fast filtering by status, category, priority, and tags
