// Vitest setup that ensures mandatory env vars exist when running locally.
process.env.COURSE_CRAWLER_DATABASE_URL ??=
  'postgres://user:password@localhost:5432/course_crawler_test';

process.env.COURSE_CRAWLER_ENCRYPTION_KEY ??=
  'test-course-crawler-encryption-key-32-chars-min';

export {};
