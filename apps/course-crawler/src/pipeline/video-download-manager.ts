import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from 'pino';

const execAsync = promisify(exec);

export interface VideoDownloadOptions {
  maxRetries: number;
  timeoutMs: number;
  maxFileSizeMB: number;
  quality: 'best' | 'high' | 'medium' | 'low';
  format: 'mp4' | 'webm' | 'mkv' | 'best';
  subtitles: boolean;
  embedThumbnail: boolean;
}

export interface VideoDownloadResult {
  success: boolean;
  localPath?: string;
  fileSizeBytes?: number;
  duration?: number; // Duration in seconds
  resolution?: string; // e.g., "1920x1080"
  format?: string; // e.g., "mp4"
  error?: string;
}

const DEFAULT_OPTIONS: VideoDownloadOptions = {
  maxRetries: 3,
  timeoutMs: 600000, // 10 minutes
  maxFileSizeMB: 500, // 500MB default for videos
  quality: 'high',
  format: 'mp4',
  subtitles: true,
  embedThumbnail: true,
};

/**
 * Detects if a URL is a video URL from supported platforms
 */
export function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /dailymotion\.com\//i,
    /wistia\.com\//i,
    /brightcove\.com\//i,
    /cloudflare\.com\/.*\.m3u8/i,
    /\.mp4$/i,
    /\.webm$/i,
    /\.mov$/i,
    /\.avi$/i,
    /\.mkv$/i,
  ];

  return videoPatterns.some((pattern) => pattern.test(url));
}

/**
 * Gets video platform name from URL
 */
export function getVideoPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
  if (/vimeo\.com/i.test(url)) return 'Vimeo';
  if (/dailymotion\.com/i.test(url)) return 'Dailymotion';
  if (/wistia\.com/i.test(url)) return 'Wistia';
  if (/brightcove\.com/i.test(url)) return 'Brightcove';
  if (/\.m3u8/i.test(url)) return 'HLS Stream';
  if (/\.(mp4|webm|mov|avi|mkv)$/i.test(url)) return 'Direct Video';
  return 'Unknown';
}

/**
 * Sanitizes filename to be filesystem-safe
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .substring(0, 200);
}

/**
 * Formats bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Formats seconds to HH:MM:SS
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Checks if yt-dlp is available
 */
async function checkYtDlpAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('yt-dlp --version', { timeout: 5000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Gets video info without downloading
 */
async function getVideoInfo(url: string, logger: Logger): Promise<{
  title: string;
  duration: number;
  filesize: number;
  resolution: string;
  format: string;
} | null> {
  try {
    const { stdout } = await execAsync(
      `yt-dlp --dump-json --no-playlist "${url}"`,
      { timeout: 30000 }
    );

    const info = JSON.parse(stdout);
    return {
      title: info.title || 'Untitled',
      duration: info.duration || 0,
      filesize: info.filesize || info.filesize_approx || 0,
      resolution: info.resolution || `${info.width}x${info.height}` || 'unknown',
      format: info.ext || 'mp4',
    };
  } catch (error) {
    logger.warn({ error, url }, '[Video] Failed to get video info');
    return null;
  }
}

/**
 * Downloads video using yt-dlp with retry logic
 */
export async function downloadVideo(
  url: string,
  outputDir: string,
  filename: string,
  logger: Logger,
  options: Partial<VideoDownloadOptions> = {}
): Promise<VideoDownloadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check if yt-dlp is available
  const ytDlpAvailable = await checkYtDlpAvailable();
  if (!ytDlpAvailable) {
    return {
      success: false,
      error: 'yt-dlp not installed. Install with: pip install yt-dlp',
    };
  }

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  // Get video info first
  const info = await getVideoInfo(url, logger);
  if (info) {
    // Check file size before downloading
    if (info.filesize > 0) {
      const sizeMB = info.filesize / (1024 * 1024);
      if (sizeMB > opts.maxFileSizeMB) {
        logger.warn(
          { url, sizeMB, maxSizeMB: opts.maxFileSizeMB },
          '[Video] File too large, skipping'
        );
        return {
          success: false,
          error: `File too large: ${formatBytes(info.filesize)} (max: ${opts.maxFileSizeMB}MB)`,
        };
      }
    }

    logger.info(
      {
        url,
        title: info.title,
        duration: formatDuration(info.duration),
        size: formatBytes(info.filesize),
        resolution: info.resolution,
      },
      '[Video] Starting download'
    );
  }

  const sanitizedFilename = sanitizeFilename(filename);
  const outputTemplate = path.join(outputDir, sanitizedFilename);

  // Build yt-dlp command
  let command = 'yt-dlp';

  // Quality selection
  if (opts.quality === 'best') {
    command += ' -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"';
  } else if (opts.quality === 'high') {
    command += ' -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"';
  } else if (opts.quality === 'medium') {
    command += ' -f "bestvideo[height<=720]+bestaudio/best[height<=720]/best"';
  } else {
    command += ' -f "bestvideo[height<=480]+bestaudio/best[height<=480]/best"';
  }

  // Output format
  if (opts.format !== 'best') {
    command += ` --merge-output-format ${opts.format}`;
  }

  // Subtitles
  if (opts.subtitles) {
    command += ' --write-auto-sub --sub-lang en,pt,pt-BR --embed-subs';
  }

  // Thumbnail
  if (opts.embedThumbnail) {
    command += ' --embed-thumbnail';
  }

  // Other options
  command += ' --no-playlist'; // Don't download playlists
  command += ' --no-part'; // Don't use .part files
  command += ` --max-filesize ${opts.maxFileSizeMB}M`; // Size limit
  command += ` -o "${outputTemplate}.%(ext)s"`; // Output template
  command += ` "${url}"`; // URL

  logger.info({ command: command.substring(0, 100) + '...' }, '[Video] Executing yt-dlp');

  let lastError: Error | undefined;

  // Retry loop
  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      logger.info({ url, attempt, maxRetries: opts.maxRetries }, '[Video] Download attempt');

      const { stdout, stderr } = await execAsync(command, {
        timeout: opts.timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // Find downloaded file
      const files = await fs.readdir(outputDir);
      const downloadedFile = files.find((f) => f.startsWith(sanitizedFilename));

      if (!downloadedFile) {
        throw new Error('Downloaded file not found');
      }

      const filePath = path.join(outputDir, downloadedFile);
      const stats = await fs.stat(filePath);

      logger.info(
        {
          url,
          filePath,
          size: formatBytes(stats.size),
        },
        '[Video] Download successful'
      );

      return {
        success: true,
        localPath: filePath,
        fileSizeBytes: stats.size,
        duration: info?.duration,
        resolution: info?.resolution,
        format: path.extname(downloadedFile).substring(1),
      };
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        { error: (error as Error).message, url, attempt },
        '[Video] Download attempt failed'
      );

      if (attempt < opts.maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        logger.info({ delayMs }, '[Video] Retrying after delay');
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError?.message || 'Unknown download error',
  };
}

/**
 * Downloads multiple videos in parallel with concurrency control
 */
export async function downloadVideosParallel(
  videos: Array<{ url: string; outputDir: string; filename: string }>,
  logger: Logger,
  concurrency: number = 2,
  options: Partial<VideoDownloadOptions> = {}
): Promise<VideoDownloadResult[]> {
  const results: VideoDownloadResult[] = [];
  const queue = [...videos];

  logger.info(
    { totalVideos: videos.length, concurrency },
    '[Video] Starting parallel downloads'
  );

  // Process videos in batches
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchResults = await Promise.all(
      batch.map((video) =>
        downloadVideo(video.url, video.outputDir, video.filename, logger, options)
      )
    );
    results.push(...batchResults);
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;

  logger.info(
    { totalVideos: videos.length, successful, failed },
    '[Video] Parallel downloads completed'
  );

  return results;
}
