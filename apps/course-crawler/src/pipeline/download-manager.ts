import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Logger } from 'pino';

export interface DownloadOptions {
  maxRetries: number;
  timeoutMs: number;
  maxFileSizeMB: number;
  userAgent?: string;
}

export interface DownloadResult {
  success: boolean;
  localPath?: string;
  fileSizeBytes?: number;
  error?: string;
}

const DEFAULT_OPTIONS: DownloadOptions = {
  maxRetries: 3,
  timeoutMs: 30000,
  maxFileSizeMB: 100,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

/**
 * Download attachment file from URL with retry logic
 */
export async function downloadAttachment(
  url: string,
  outputDir: string,
  filename: string,
  logger: Logger,
  options: Partial<DownloadOptions> = {}
): Promise<DownloadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const sanitizedFilename = sanitizeFilename(filename);
  const filePath = path.join(outputDir, sanitizedFilename);

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      logger.debug(
        { url, attempt, maxRetries: opts.maxRetries },
        '[Download] Attempting download'
      );

      const result = await downloadWithTimeout(url, filePath, opts, logger);

      logger.info(
        { url, filePath, fileSizeBytes: result.fileSizeBytes },
        '[Download] Successfully downloaded attachment'
      );

      return {
        success: true,
        localPath: filePath,
        fileSizeBytes: result.fileSizeBytes,
      };
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        { err: error, url, attempt, maxRetries: opts.maxRetries },
        '[Download] Download attempt failed'
      );

      if (attempt < opts.maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await sleep(delayMs);
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown download error',
  };
}

/**
 * Download file with timeout using fetch API
 */
async function downloadWithTimeout(
  url: string,
  filePath: string,
  options: DownloadOptions,
  logger: Logger
): Promise<{ fileSizeBytes: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': options.userAgent || DEFAULT_OPTIONS.userAgent!,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check Content-Length header
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const sizeMB = parseInt(contentLength, 10) / (1024 * 1024);
      if (sizeMB > options.maxFileSizeMB) {
        throw new Error(
          `File too large: ${sizeMB.toFixed(2)}MB (max: ${options.maxFileSizeMB}MB)`
        );
      }
    }

    // Stream response to file
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Final size check
    const fileSizeMB = buffer.length / (1024 * 1024);
    if (fileSizeMB > options.maxFileSizeMB) {
      throw new Error(
        `File too large: ${fileSizeMB.toFixed(2)}MB (max: ${options.maxFileSizeMB}MB)`
      );
    }

    await fs.writeFile(filePath, buffer);

    return { fileSizeBytes: buffer.length };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sanitize filename for filesystem compatibility
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Collapse multiple underscores
    .replace(/^\.+/, '') // Remove leading dots
    .slice(0, 200); // Limit length
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get file extension from URL or Content-Type
 */
export function getFileExtension(
  url: string,
  contentType?: string
): string {
  // Try from URL first
  const urlPath = new URL(url).pathname;
  const urlExt = path.extname(urlPath);
  if (urlExt) {
    return urlExt;
  }

  // Fallback to Content-Type
  const mimeToExt: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip',
    'text/plain': '.txt',
    'text/html': '.html',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  };

  return contentType ? mimeToExt[contentType] || '' : '';
}

/**
 * Download multiple attachments in parallel with concurrency limit
 */
export async function downloadAttachmentsBatch(
  attachments: Array<{ url: string; filename: string }>,
  outputDir: string,
  logger: Logger,
  options: {
    concurrency: number;
    downloadOptions?: Partial<DownloadOptions>;
  }
): Promise<Map<string, DownloadResult>> {
  const results = new Map<string, DownloadResult>();
  const queue = [...attachments];
  const inProgress: Promise<void>[] = [];

  while (queue.length > 0 || inProgress.length > 0) {
    // Fill up to concurrency limit
    while (inProgress.length < options.concurrency && queue.length > 0) {
      const attachment = queue.shift()!;

      const promise = downloadAttachment(
        attachment.url,
        outputDir,
        attachment.filename,
        logger,
        options.downloadOptions
      ).then((result) => {
        results.set(attachment.url, result);
      });

      inProgress.push(promise);
    }

    // Wait for at least one to complete
    if (inProgress.length > 0) {
      await Promise.race(inProgress);
      // Remove completed promises
      for (let i = inProgress.length - 1; i >= 0; i--) {
        if (await isPromiseSettled(inProgress[i])) {
          inProgress.splice(i, 1);
        }
      }
    }
  }

  return results;
}

/**
 * Check if promise is settled (for concurrency control)
 */
async function isPromiseSettled(promise: Promise<unknown>): Promise<boolean> {
  return Promise.race([
    promise.then(() => true, () => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 0))
  ]);
}
