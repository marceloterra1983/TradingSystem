-- Add 'cancelled' status to the CHECK constraint
ALTER TABLE course_crawler.crawl_runs
DROP CONSTRAINT IF EXISTS crawl_runs_status_check;

ALTER TABLE course_crawler.crawl_runs
ADD CONSTRAINT crawl_runs_status_check
CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled'));
