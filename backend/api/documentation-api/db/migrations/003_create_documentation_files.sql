-- Migration: Create documentation_files table
-- Description: File attachments metadata (actual files stored on filesystem)
-- Created: 2025-10-13

CREATE TABLE IF NOT EXISTS documentation_files (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  idea_id SYMBOL CAPACITY 256 CACHE INDEX,  -- Foreign key to ideas
  original_name STRING,
  stored_name STRING,                       -- Unique filename on disk
  size LONG,                                -- File size in bytes
  mime_type STRING,
  storage_path STRING,                      -- Relative path in filesystem
  checksum STRING,                          -- SHA-256 for integrity
  uploaded_by STRING,                       -- User identifier (future)
  uploaded_at TIMESTAMP,
  ts TIMESTAMP                              -- Designated timestamp column
) timestamp(ts) PARTITION BY MONTH;

-- Index on idea_id allows fast lookup of all files for a given idea
-- Index on id allows fast lookup of individual files
