-- CreateTable
CREATE TABLE "scrape_jobs" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "url" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "firecrawl_job_id" VARCHAR(128),
    "template_id" TEXT,
    "options" JSONB NOT NULL,
    "results" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id","started_at")
);

-- CreateTable
CREATE TABLE "scrape_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url_pattern" TEXT,
    "options" JSONB NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scrape_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template_id" TEXT,
    "url" TEXT NOT NULL,
    "schedule_type" VARCHAR(16) NOT NULL,
    "cron_expression" TEXT,
    "interval_seconds" INTEGER,
    "scheduled_at" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_scrape_jobs_id_lookup" ON "scrape_jobs"("id");

-- CreateIndex
CREATE INDEX "idx_scrape_jobs_status" ON "scrape_jobs"("status", "started_at");

-- CreateIndex
CREATE INDEX "idx_scrape_jobs_status_type_started" ON "scrape_jobs"("status", "type", "started_at");

-- CreateIndex
CREATE INDEX "idx_scrape_jobs_type" ON "scrape_jobs"("type");

-- CreateIndex
CREATE INDEX "idx_scrape_jobs_template" ON "scrape_jobs"("template_id");

-- CreateIndex
CREATE INDEX "idx_scrape_jobs_created_at" ON "scrape_jobs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "scrape_templates_name_key" ON "scrape_templates"("name");

-- CreateIndex
CREATE INDEX "scrape_templates_name_idx" ON "scrape_templates"("name");

-- CreateIndex
CREATE INDEX "job_schedules_enabled_next_run_at_idx" ON "job_schedules"("enabled", "next_run_at");

-- CreateIndex
CREATE INDEX "job_schedules_template_id_idx" ON "job_schedules"("template_id");

-- CreateIndex
CREATE INDEX "job_schedules_last_run_at_idx" ON "job_schedules"("last_run_at");

-- AddForeignKey
ALTER TABLE "scrape_jobs" ADD CONSTRAINT "scrape_jobs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "scrape_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_schedules" ADD CONSTRAINT "job_schedules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "scrape_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
