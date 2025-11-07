import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const loginSchema = z.object({
  url: z.string().url(),
  usernameSelector: z.string().min(1),
  passwordSelector: z.string().min(1),
  submitSelector: z.string().min(1),
  postLoginWaitSelector: z.string().min(1),
});

const courseSchema = z.object({
  url: z.string().url(),
  courseItemSelector: z.string().min(1),
  titleSelector: z.string().min(1),
  linkSelector: z.string().min(1),
});

const moduleSchema = z.object({
  moduleListSelector: z.string(),
  titleSelector: z.string(),
  linkSelector: z.string().optional(),
});

const classSchema = z.object({
  classListSelector: z.string(),
  titleSelector: z.string(),
  linkSelector: z.string(),
  contentSelector: z.string(),
  attachmentSelector: z.string().optional(),
  videoSelector: z.string().optional(),
  durationSelector: z.string().optional(),
});

const platformSchema = z.object({
  login: loginSchema,
  courses: courseSchema,
  modules: moduleSchema,
  classes: classSchema,
});

export type PlatformConfig = z.infer<typeof platformSchema>;

export async function loadPlatformConfig(configPath: string): Promise<PlatformConfig> {
  const resolved = path.isAbsolute(configPath)
    ? configPath
    : path.join(process.cwd(), configPath);
  const raw = await fs.readFile(resolved, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  return platformSchema.parse(parsed);
}
