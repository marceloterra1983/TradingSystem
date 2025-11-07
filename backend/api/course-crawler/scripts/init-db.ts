import { pool } from '../src/db/pool.js';

const statements = [
  `
  CREATE SCHEMA IF NOT EXISTS course_crawler;
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `,
  `
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
  `,
  `
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
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_course_crawler_runs_status
    ON course_crawler.crawl_runs(status);
  `,
];

async function main() {
  for (const statement of statements) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(statement);
  }
  // eslint-disable-next-line no-console
  console.log('Course Crawler tables ensured');
  await pool.end();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
