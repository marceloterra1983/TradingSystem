-- Add schedule_id column to relate jobs with schedules
ALTER TABLE "scrape_jobs"
ADD COLUMN IF NOT EXISTS "schedule_id" TEXT;

-- Create foreign key to job_schedules with cascading updates and null on delete
ALTER TABLE "scrape_jobs"
ADD CONSTRAINT "scrape_jobs_schedule_id_fkey"
FOREIGN KEY ("schedule_id") REFERENCES "job_schedules"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for efficient lookups by schedule
CREATE INDEX IF NOT EXISTS "idx_scrape_jobs_schedule" ON "scrape_jobs"("schedule_id");
