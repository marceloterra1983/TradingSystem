import type { Logger } from 'pino';
import { Pool, type PoolClient } from 'pg';
import type { EnvironmentConfig } from '../config/environment.js';
import type { ExtractionRun, CourseResource, ClassResource } from '../types.js';

export interface PersistenceLayer {
  store(run: ExtractionRun): Promise<void>;
  registerExport(course: CourseResource, exportDir: string): Promise<void>;
  close(): Promise<void>;
}

export async function createPersistenceLayer(
  env: EnvironmentConfig,
  logger: Logger,
): Promise<PersistenceLayer> {
  if (!env.neon.databaseUrl) {
    logger.warn(
      '[course-crawler] NEON_DATABASE_URL not defined. Persistence layer operating in dry-run mode.',
    );
    return createDryRunPersistence(logger);
  }

  const pool = new Pool({
    connectionString: env.neon.databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
  });

  if (env.neon.autoMigrate) {
    await runMigrations(pool, logger);
  }

  return {
    async store(run: ExtractionRun) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const course of run.courses) {
          await upsertCourse(client, course);
          for (const moduleResource of course.modules) {
            await upsertModule(client, course.id, moduleResource);
            for (const classResource of moduleResource.classes) {
              await upsertClass(client, moduleResource.id, classResource);
              await syncClassRelatedEntities(client, classResource);
            }
          }
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(
          { err: error },
          '[course-crawler] Failed to persist extraction run',
        );
        throw error;
      } finally {
        client.release();
      }
    },
    async registerExport(course: CourseResource, exportDir: string) {
      await pool.query(
        `
        INSERT INTO course_content.exports (course_id, export_path)
        VALUES ($1, $2)
      `,
        [course.id, exportDir],
      );
    },
    async close() {
      await pool.end();
    },
  };
}

async function runMigrations(pool: Pool, logger: Logger) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS course_content;

      CREATE TABLE IF NOT EXISTS course_content.courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        last_updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS course_content.modules (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL REFERENCES course_content.courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        position INTEGER NOT NULL,
        last_updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS course_content.classes (
        id TEXT PRIMARY KEY,
        module_id TEXT NOT NULL REFERENCES course_content.modules(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        position INTEGER NOT NULL,
        confidence NUMERIC NOT NULL,
        markdown TEXT,
        raw_html TEXT,
        transcript TEXT,
        duration_seconds INTEGER,
        last_updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS course_content.videos (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES course_content.classes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        position INTEGER NOT NULL,
        duration_seconds INTEGER,
        playable BOOLEAN,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS course_content.attachments (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES course_content.classes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        mime_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS course_content.exports (
        id SERIAL PRIMARY KEY,
        course_id TEXT NOT NULL REFERENCES course_content.courses(id) ON DELETE CASCADE,
        export_path TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query('COMMIT');
    logger.info('[course-crawler] Neon migrations applied');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, '[course-crawler] Failed to run migrations');
    throw error;
  } finally {
    client.release();
  }
}

async function upsertCourse(client: PoolClient, course: CourseResource) {
  await client.query(
    `
    INSERT INTO course_content.courses (id, title, url, last_updated_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (id) DO UPDATE
    SET title = EXCLUDED.title,
        url = EXCLUDED.url,
        last_updated_at = EXCLUDED.last_updated_at,
        updated_at = NOW()
  `,
    [course.id, course.title, course.url, course.lastUpdatedAt],
  );
}

async function upsertModule(
  client: PoolClient,
  courseId: string,
  moduleResource: CourseResource['modules'][number],
) {
  await client.query(
    `
    INSERT INTO course_content.modules (id, course_id, title, url, position, last_updated_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (id) DO UPDATE
    SET title = EXCLUDED.title,
        url = EXCLUDED.url,
        position = EXCLUDED.position,
        last_updated_at = EXCLUDED.last_updated_at,
        updated_at = NOW()
  `,
    [
      moduleResource.id,
      courseId,
      moduleResource.title,
      moduleResource.url,
      moduleResource.order,
      moduleResource.lastUpdatedAt,
    ],
  );
}

async function upsertClass(
  client: PoolClient,
  moduleId: string,
  classResource: ClassResource,
) {
  await client.query(
    `
    INSERT INTO course_content.classes (
      id, module_id, title, url, position, confidence, markdown, raw_html, transcript, duration_seconds, last_updated_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (id) DO UPDATE
    SET title = EXCLUDED.title,
        url = EXCLUDED.url,
        position = EXCLUDED.position,
        confidence = EXCLUDED.confidence,
        markdown = EXCLUDED.markdown,
        raw_html = EXCLUDED.raw_html,
        transcript = EXCLUDED.transcript,
        duration_seconds = EXCLUDED.duration_seconds,
        last_updated_at = EXCLUDED.last_updated_at,
        updated_at = NOW()
  `,
    [
      classResource.id,
      moduleId,
      classResource.title,
      classResource.url,
      classResource.order,
      classResource.confidenceScore,
      classResource.markdown ?? null,
      classResource.rawHtml ?? null,
      classResource.transcript ?? null,
      classResource.durationSeconds ?? null,
      classResource.lastUpdatedAt ?? new Date().toISOString(),
    ],
  );
}

async function syncClassRelatedEntities(
  client: PoolClient,
  classResource: ClassResource,
) {
  await client.query(
    'DELETE FROM course_content.videos WHERE class_id = $1',
    [classResource.id],
  );
  await client.query(
    'DELETE FROM course_content.attachments WHERE class_id = $1',
    [classResource.id],
  );

  for (const video of classResource.videos) {
    await client.query(
      `
      INSERT INTO course_content.videos (
        id, class_id, title, url, position, duration_seconds, playable, notes, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE
      SET title = EXCLUDED.title,
          url = EXCLUDED.url,
          position = EXCLUDED.position,
          duration_seconds = EXCLUDED.duration_seconds,
          playable = EXCLUDED.playable,
          notes = EXCLUDED.notes,
          updated_at = NOW()
    `,
      [
        video.id,
        classResource.id,
        video.title,
        video.url,
        video.order,
        video.durationSeconds ?? null,
        video.playable,
        video.notes ?? null,
      ],
    );
  }

  for (const attachment of classResource.attachments) {
    await client.query(
      `
      INSERT INTO course_content.attachments (
        id, class_id, name, url, mime_type, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          url = EXCLUDED.url,
          mime_type = EXCLUDED.mime_type,
          updated_at = NOW()
    `,
      [
        attachment.id,
        classResource.id,
        attachment.name,
        attachment.url,
        attachment.mimeType ?? null,
      ],
    );
  }
}

function createDryRunPersistence(logger: Logger): PersistenceLayer {
  return {
    async store(run: ExtractionRun) {
      logger.info(
        { courses: run.courses.length },
        '[course-crawler] (dry-run) persistence.store invoked',
      );
    },
    async registerExport(course: CourseResource, exportDir: string) {
      logger.info(
        { courseId: course.id, exportDir },
        '[course-crawler] (dry-run) registerExport invoked',
      );
    },
    async close() {
      logger.debug('[course-crawler] (dry-run) persistence close');
    },
  };
}
