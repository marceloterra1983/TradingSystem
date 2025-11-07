import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface NeonConfig {
  databaseUrl: string;
  retentionDays: number;
  walRetentionDays: number;
  autoMigrate: boolean;
}

export interface BrowserConfig {
  baseUrl: string;
  headless: boolean;
  concurrency: number;
  useBrowserUse: boolean;
  selectorsConfigPath: string;
  username: string;
  password: string;
  maxClassesPerModule?: number;
}

export interface EnvironmentConfig {
  runtimeEnvironment: 'development' | 'test' | 'production';
  logLevel: LogLevel;
  outputsDir: string;
  neon: NeonConfig;
  browser: BrowserConfig;
  observability: {
    confidenceThreshold: number;
    selectorFailureThreshold: number;
  };
  targetCourseUrls: string[];
}

const booleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = value.trim().toLowerCase();
    return (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes' ||
      normalized === 'y'
    );
  });

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  NEON_DATABASE_URL: z
    .string()
    .url('NEON_DATABASE_URL must be a valid URL')
    .or(z.string().length(0))
    .default(''),
  NEON_RETENTION_DAYS: z.coerce.number().positive().default(30),
  NEON_WAL_RETENTION_DAYS: z.coerce.number().positive().default(7),
  NEON_AUTO_MIGRATE: z.coerce.boolean().default(true),
  COURSE_CRAWLER_OUTPUTS_DIR: z
    .string()
    .default(path.join(process.cwd(), 'outputs', 'course-crawler')),
  COURSE_CRAWLER_BASE_URL: z.string().url(),
  COURSE_CRAWLER_BROWSER_HEADLESS: booleanSchema.default(
    process.env.NODE_ENV === 'production',
  ),
  COURSE_CRAWLER_CONCURRENCY: z.coerce.number().int().min(1).max(2).default(1),
  COURSE_CRAWLER_BROWSER_USE_ENABLED: booleanSchema.default(true),
  COURSE_CRAWLER_SELECTORS_CONFIG: z
    .string()
    .default(
      path.join(process.cwd(), 'config', 'platform-config.json'),
    ),
  COURSE_CRAWLER_LOGIN_USERNAME: z.string(),
  COURSE_CRAWLER_LOGIN_PASSWORD: z.string(),
  COURSE_CRAWLER_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(100).default(70),
  COURSE_CRAWLER_SELECTOR_FAILURE_THRESHOLD: z.coerce
    .number()
    .int()
    .min(1)
    .default(3),
  COURSE_CRAWLER_TARGET_URLS: z.string().optional(),
  COURSE_CRAWLER_MAX_CLASSES_PER_MODULE: z.coerce
    .number()
    .int()
    .min(1)
    .optional(),
});

export function loadEnvironment(): EnvironmentConfig {
  loadDotEnv();

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid course crawler environment configuration: ${parsed.error.message}`,
    );
  }

  const config = parsed.data;
  const outputsDir = path.resolve(config.COURSE_CRAWLER_OUTPUTS_DIR);

  if (!existsSync(outputsDir)) {
    mkdirSync(outputsDir, { recursive: true });
  }

  if (!config.NEON_DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.warn(
      '[course-crawler] NEON_DATABASE_URL is not defined. Persistence layer will operate in dry-run mode.',
    );
  }

  return {
    runtimeEnvironment: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
    outputsDir,
    neon: {
      databaseUrl: config.NEON_DATABASE_URL,
      retentionDays: config.NEON_RETENTION_DAYS,
      walRetentionDays: config.NEON_WAL_RETENTION_DAYS,
      autoMigrate: config.NEON_AUTO_MIGRATE,
    },
    browser: {
      baseUrl: config.COURSE_CRAWLER_BASE_URL,
      headless: config.COURSE_CRAWLER_BROWSER_HEADLESS,
      concurrency: config.COURSE_CRAWLER_CONCURRENCY,
      useBrowserUse: config.COURSE_CRAWLER_BROWSER_USE_ENABLED,
      selectorsConfigPath: config.COURSE_CRAWLER_SELECTORS_CONFIG,
      username: config.COURSE_CRAWLER_LOGIN_USERNAME,
      password: config.COURSE_CRAWLER_LOGIN_PASSWORD,
      maxClassesPerModule: config.COURSE_CRAWLER_MAX_CLASSES_PER_MODULE,
    },
    observability: {
      confidenceThreshold: config.COURSE_CRAWLER_CONFIDENCE_THRESHOLD,
      selectorFailureThreshold: config.COURSE_CRAWLER_SELECTOR_FAILURE_THRESHOLD,
    },
    targetCourseUrls:
      config.COURSE_CRAWLER_TARGET_URLS?.split(',')
        .map((value) => value.trim())
        .filter(Boolean) ?? [],
  };
}
