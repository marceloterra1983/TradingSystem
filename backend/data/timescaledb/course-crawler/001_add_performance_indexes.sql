-- Performance Indexes for Course Crawler
-- Created: 2025-11-08
-- Purpose: Optimize worker queue queries and run lookups

-- Index for worker queue polling (most critical)
-- This speeds up: SELECT * FROM crawl_runs WHERE status = 'queued' ORDER BY created_at LIMIT 1
CREATE INDEX IF NOT EXISTS idx_runs_status_created
ON course_crawler.crawl_runs(status, created_at)
WHERE status = 'queued';

-- Index for run lookups by course
-- This speeds up: SELECT * FROM crawl_runs WHERE course_id = ?
CREATE INDEX IF NOT EXISTS idx_runs_course_id
ON course_crawler.crawl_runs(course_id);

-- Index for recent runs queries
-- This speeds up: SELECT * FROM crawl_runs ORDER BY created_at DESC LIMIT 50
CREATE INDEX IF NOT EXISTS idx_runs_created_desc
ON course_crawler.crawl_runs(created_at DESC);

-- Index for active runs monitoring
-- This speeds up: SELECT * FROM crawl_runs WHERE status IN ('running', 'queued')
CREATE INDEX IF NOT EXISTS idx_runs_active_status
ON course_crawler.crawl_runs(status, started_at)
WHERE status IN ('running', 'queued');

-- Composite index for run status filtering with pagination
CREATE INDEX IF NOT EXISTS idx_runs_status_created_id
ON course_crawler.crawl_runs(status, created_at, id);

-- Add comments for documentation
COMMENT ON INDEX course_crawler.idx_runs_status_created IS 'Optimizes worker queue polling for queued runs';
COMMENT ON INDEX course_crawler.idx_runs_course_id IS 'Optimizes run lookups by course_id';
COMMENT ON INDEX course_crawler.idx_runs_created_desc IS 'Optimizes recent runs queries with ORDER BY created_at DESC';
COMMENT ON INDEX course_crawler.idx_runs_active_status IS 'Optimizes active runs monitoring queries';
COMMENT ON INDEX course_crawler.idx_runs_status_created_id IS 'Optimizes paginated status filtering queries';
