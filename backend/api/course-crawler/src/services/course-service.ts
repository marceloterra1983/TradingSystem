import { pool } from '../db/pool.js';
import { encryptSecret, decryptSecret } from '../lib/crypto.js';
import type { CourseRecord, CourseInput } from '../types.js';

interface CourseRow {
  id: string;
  name: string;
  base_url: string;
  username: string;
  password_encrypted: string;
  target_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: CourseRow): CourseRecord {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    username: row.username,
    password: row.password_encrypted,
    targetUrls: row.target_urls ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeCourse(record: CourseRecord) {
  return {
    id: record.id,
    name: record.name,
    baseUrl: record.baseUrl,
    username: record.username,
    targetUrls: record.targetUrls,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    hasPassword: Boolean(record.password),
  };
}

export async function listCourses() {
  const result = await pool.query<CourseRow>(
    'SELECT * FROM course_crawler.courses ORDER BY created_at DESC',
  );
  return result.rows.map((row: CourseRow) => sanitizeCourse(mapRow(row)));
}

export async function getCourse(id: string) {
  const result = await pool.query<CourseRow>(
    'SELECT * FROM course_crawler.courses WHERE id = $1',
    [id],
  );
  if (result.rowCount === 0) {
    return null;
  }
  return sanitizeCourse(mapRow(result.rows[0]));
}

export async function getCourseWithSecret(id: string) {
  const result = await pool.query<CourseRow>(
    'SELECT * FROM course_crawler.courses WHERE id = $1',
    [id],
  );
  if (result.rowCount === 0) {
    return null;
  }
  const record = mapRow(result.rows[0]);
  return {
    ...record,
    password: decryptSecret(record.password),
  };
}

export async function createCourse(input: CourseInput) {
  const encrypted = encryptSecret(input.password);
  const targetUrls = input.targetUrls ?? [];
  const result = await pool.query<CourseRow>(
    `
      INSERT INTO course_crawler.courses
        (name, base_url, username, password_encrypted, target_urls)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [input.name, input.baseUrl, input.username, encrypted, targetUrls],
  );
  return sanitizeCourse(mapRow(result.rows[0]));
}

export async function updateCourse(
  id: string,
  input: Partial<CourseInput>,
) {
  const existing = await pool.query<CourseRow>(
    'SELECT * FROM course_crawler.courses WHERE id = $1',
    [id],
  );
  if (existing.rowCount === 0) {
    return null;
  }
  const current = existing.rows[0];
  const encrypted =
    input.password !== undefined
      ? encryptSecret(input.password)
      : current.password_encrypted;
  const targetUrls =
    input.targetUrls !== undefined ? input.targetUrls : current.target_urls ?? [];

  const result = await pool.query<CourseRow>(
    `
      UPDATE course_crawler.courses
         SET name = $2,
             base_url = $3,
             username = $4,
             password_encrypted = $5,
             target_urls = $6,
             updated_at = NOW()
       WHERE id = $1
       RETURNING *
    `,
    [
      id,
      input.name ?? current.name,
      input.baseUrl ?? current.base_url,
      input.username ?? current.username,
      encrypted,
      targetUrls,
    ],
  );
  return sanitizeCourse(mapRow(result.rows[0]));
}

export async function deleteCourse(id: string) {
  await pool.query('DELETE FROM course_crawler.courses WHERE id = $1', [id]);
}
