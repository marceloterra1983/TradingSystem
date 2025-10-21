-- Migration: Create documentation_systems table
-- Description: Stores all documentation services (Docusaurus, APIs, tools) with status tracking
-- Created: 2025-10-13

CREATE TABLE IF NOT EXISTS documentation_systems (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  name STRING,
  description STRING,
  status SYMBOL CAPACITY 16 CACHE,  -- 'online', 'offline', 'degraded'
  port INT,
  host STRING,
  url STRING,
  icon STRING,                       -- Icon identifier (lucide-react)
  color STRING,                      -- Hex color code
  tags SYMBOL CAPACITY 256 CACHE INDEX,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  ts TIMESTAMP                       -- Designated timestamp column
) timestamp(ts) PARTITION BY DAY;

-- Indexes are automatically created for SYMBOL columns with CACHE INDEX
-- Additional indexes can be added if needed for specific queries
