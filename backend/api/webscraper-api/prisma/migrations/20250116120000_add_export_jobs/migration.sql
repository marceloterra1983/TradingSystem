-- Create export_jobs table
CREATE TABLE IF NOT EXISTS "export_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "export_type" VARCHAR(16) NOT NULL,
    "formats" TEXT[] NOT NULL,
    "filters" JSONB,
    "status" VARCHAR(16) NOT NULL,
    "file_paths" JSONB,
    "row_count" INTEGER,
    "file_size_bytes" BIGINT,
    "error" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE FUNCTION "webscraper".set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Indexes to support filtering and cleanup
CREATE INDEX IF NOT EXISTS "idx_export_jobs_status" ON "export_jobs" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_export_jobs_type" ON "export_jobs" ("export_type");
CREATE INDEX IF NOT EXISTS "idx_export_jobs_expires" ON "export_jobs" ("expires_at") WHERE "status" = 'completed';

-- Trigger to maintain updated_at timestamp
DROP TRIGGER IF EXISTS set_export_jobs_updated_at ON "webscraper"."export_jobs";
CREATE TRIGGER set_export_jobs_updated_at
BEFORE UPDATE ON "webscraper"."export_jobs"
FOR EACH ROW
EXECUTE FUNCTION "webscraper".set_updated_at();

-- Ensure scrape_jobs has schedule_id column for scheduler linkage
ALTER TABLE "scrape_jobs"
  ADD COLUMN IF NOT EXISTS "schedule_id" TEXT REFERENCES "job_schedules"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_scrape_jobs_schedule" ON "scrape_jobs" ("schedule_id");
