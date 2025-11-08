import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

export type PlatformType = 'memberkit' | 'jumba' | 'hotmart' | 'varos' | 'generic';

/**
 * Detect platform type based on base URL
 */
export function detectPlatformType(baseUrl: string): PlatformType {
  const url = baseUrl.toLowerCase();

  if (url.includes('memberkit.com')) {
    return 'memberkit';
  }

  if (url.includes('jumba.com')) {
    return 'jumba';
  }

  if (url.includes('hotmart.com')) {
    return 'hotmart';
  }

  if (url.includes('varos.com.br')) {
    return 'varos';
  }

  return 'generic';
}

/**
 * Load platform config from explicit path (legacy behavior)
 */
export async function loadPlatformConfig(configPath: string): Promise<PlatformConfig> {
  const resolved = path.isAbsolute(configPath)
    ? configPath
    : path.join(process.cwd(), configPath);
  const raw = await fs.readFile(resolved, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  return platformSchema.parse(parsed);
}

/**
 * Get config directory path (handles both local and container paths)
 */
function getConfigDir(): string {
  // In Docker container, code is mounted at /workspace/apps/course-crawler
  // In local dev, it's relative to this file
  const possiblePaths = [
    '/workspace/apps/course-crawler/config', // Docker: volume mount (check first!)
    path.join(process.cwd(), 'config'), // Local dev: /path/to/apps/course-crawler/config
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../config'), // Relative from dist/
  ];

  // Return first path that exists (synchronous check for simplicity)
  for (const configPath of possiblePaths) {
    try {
      if (existsSync(configPath)) {
        return configPath;
      }
    } catch {
      // Path doesn't exist, try next
    }
  }

  // Fallback to Docker path (most common in production)
  return possiblePaths[0];
}

/**
 * Auto-detect and load platform config based on base URL
 */
export async function loadPlatformConfigForUrl(baseUrl: string): Promise<PlatformConfig> {
  const platformType = detectPlatformType(baseUrl);
  const configFileName = `platform-${platformType}.json`;
  const configDir = getConfigDir();
  const configPath = path.join(configDir, configFileName);

  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return platformSchema.parse(parsed);
  } catch (error) {
    // Fallback to Memberkit if platform-specific config not found
    console.warn(`Platform config not found for ${platformType} at ${configPath}, falling back to Memberkit`);
    const fallbackPath = path.join(configDir, 'platform-memberkit.json');
    const raw = await fs.readFile(fallbackPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return platformSchema.parse(parsed);
  }
}
