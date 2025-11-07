import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

config();

const schema = z.object({
  COURSE_CRAWLER_API_PORT: z.coerce.number().int().positive().default(3601),
  COURSE_CRAWLER_DATABASE_URL: z.string().url(),
  COURSE_CRAWLER_ENCRYPTION_KEY: z
    .string()
    .min(32, 'COURSE_CRAWLER_ENCRYPTION_KEY must be at least 32 characters'),
  COURSE_CRAWLER_OUTPUT_BASE: z
    .string()
    .default(path.resolve(process.cwd(), 'outputs')),
  COURSE_CRAWLER_CLI_PATH: z
    .string()
    .default(
      path.resolve(
        process.cwd(),
        '../../apps/course-crawler/dist/index.js',
      ),
    ),
  COURSE_CRAWLER_MAX_CONCURRENCY: z.coerce.number().int().min(1).default(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid Course Crawler API environment: ${parsed.error.message}`,
  );
}

export const env = parsed.data;

if (!existsSync(env.COURSE_CRAWLER_OUTPUT_BASE)) {
  mkdirSync(env.COURSE_CRAWLER_OUTPUT_BASE, { recursive: true });
}
