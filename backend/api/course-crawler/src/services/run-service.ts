import { v4 as uuid } from 'uuid';
import { pool, withTransaction } from '../db/pool.js';
import type { CrawlRunRecord } from '../types.js';

interface RunRow {
  id: string;
  course_id: string;
  status: string;
  outputs_dir: string | null;
  metrics: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  course_name?: string; // Added for JOIN queries
  course_base_url?: string; // Added for JOIN queries
}

function mapRow(row: RunRow): CrawlRunRecord {
  return {
    id: row.id,
    courseId: row.course_id,
    status: row.status as CrawlRunRecord['status'],
    outputsDir: row.outputs_dir,
    metrics: row.metrics,
    error: row.error,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    courseName: row.course_name,
    courseBaseUrl: row.course_base_url,
  };
}

export async function enqueueRun(courseId: string) {
  const result = await pool.query<RunRow>(
    `
      INSERT INTO course_crawler.crawl_runs (course_id, status)
      VALUES ($1, 'queued')
      RETURNING *
    `,
    [courseId],
  );
  return mapRow(result.rows[0]);
}

export async function listRuns() {
  const result = await pool.query<RunRow>(
    `
      SELECT
        r.*,
        c.name as course_name,
        c.base_url as course_base_url
      FROM course_crawler.crawl_runs r
      LEFT JOIN course_crawler.courses c ON r.course_id = c.id
      ORDER BY r.created_at DESC
      LIMIT 200
    `,
  );
  return result.rows.map(mapRow);
}

export async function getRun(id: string) {
  const result = await pool.query<RunRow>(
    `
      SELECT
        r.*,
        c.name as course_name,
        c.base_url as course_base_url
      FROM course_crawler.crawl_runs r
      LEFT JOIN course_crawler.courses c ON r.course_id = c.id
      WHERE r.id = $1
    `,
    [id],
  );
  if (result.rowCount === 0) {
    return null;
  }
  return mapRow(result.rows[0]);
}

export async function fetchNextQueuedRun() {
  console.log('[RunService] 🔍 Fetching next queued run...');
  return withTransaction(async (client) => {
    console.log('[RunService] 📊 Querying for queued runs...');
    const run = await client.query<RunRow>(
      `
        SELECT *
          FROM course_crawler.crawl_runs
         WHERE status = 'queued'
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
      `,
    );
    console.log(`[RunService] 📋 Query returned ${run.rowCount} row(s)`);

    if (run.rowCount === 0) {
      console.log('[RunService] ⏸️  No queued runs found');
      return null;
    }

    const record = run.rows[0];
    console.log(`[RunService] ✅ Found queued run: ${record.id}`);
    console.log('[RunService] 🔄 Updating run status to "running"...');

    await client.query(
      `
        UPDATE course_crawler.crawl_runs
           SET status = 'running',
               started_at = NOW()
         WHERE id = $1
      `,
      [record.id],
    );

    console.log(`[RunService] ✅ Run ${record.id} marked as running`);
    return mapRow({ ...record, status: 'running', started_at: new Date().toISOString() } as RunRow);
  });
}

export async function markRunSuccess(
  id: string,
  outputsDir: string,
  metrics: Record<string, unknown>,
) {
  await pool.query(
    `
      UPDATE course_crawler.crawl_runs
         SET status = 'success',
             outputs_dir = $2,
             metrics = $3,
             finished_at = NOW()
       WHERE id = $1
    `,
    [id, outputsDir, metrics],
  );
}

export async function markRunFailure(id: string, error: Error) {
  await pool.query(
    `
      UPDATE course_crawler.crawl_runs
         SET status = 'failed',
             error = $2,
             finished_at = NOW()
       WHERE id = $1
    `,
    [id, error.message.slice(0, 5000)],
  );
}

export async function cancelRun(id: string) {
  const result = await pool.query<RunRow>(
    `
      UPDATE course_crawler.crawl_runs
         SET status = 'cancelled',
             finished_at = NOW()
       WHERE id = $1
         AND status IN ('queued', 'running')
      RETURNING *
    `,
    [id],
  );
  if (result.rowCount === 0) {
    return null;
  }
  return mapRow(result.rows[0]);
}
