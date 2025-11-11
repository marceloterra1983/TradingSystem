-- Course Crawler Database Schema
-- Automatically executed on container startup

CREATE SCHEMA IF NOT EXISTS course_crawler;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS course_crawler.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  target_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_crawler.crawl_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_crawler.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  outputs_dir TEXT,
  metrics JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_course_crawler_runs_status
  ON course_crawler.crawl_runs(status);

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA course_crawler TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA course_crawler TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA course_crawler TO postgres;
