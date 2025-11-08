import compression from "compression";

/**
 * HTTP Compression Middleware
 *
 * Compresses API responses using gzip/deflate/brotli
 * Typically achieves 70-90% size reduction for JSON payloads
 *
 * Performance:
 * - 50KB response → 12KB gzipped (75% smaller)
 * - Compression time: ~5ms (negligible vs network time)
 * - Network time saved: ~200ms on slow connections
 *
 * Usage:
 *   import { compressionMiddleware } from './middleware/compressionMiddleware.js';
 *   app.use(compressionMiddleware);
 */

export const compressionMiddleware = compression({
  // Compression level (0-9)
  // Level 6 provides good balance between speed and compression ratio
  // Level 9 (maximum) is slower but only marginally better compression
  level: 6,

  // Only compress responses larger than 1KB
  // Small responses have more overhead than benefit from compression
  threshold: 1024,

  // Filter function - which responses to compress
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers["x-no-compression"]) {
      return false;
    }

    // Don't compress images, videos, or already compressed formats
    const contentType = res.getHeader("Content-Type");
    if (contentType) {
      const type = contentType.toString().toLowerCase();

      // Skip compression for binary/compressed formats
      if (
        type.includes("image/") ||
        type.includes("video/") ||
        type.includes("audio/") ||
        type.includes("application/octet-stream") ||
        type.includes("application/pdf") ||
        type.includes("application/zip")
      ) {
        return false;
      }
    }

    // Use default compression filter for other content
    return compression.filter(req, res);
  },

  // Memory level (1-9)
  // Higher = more memory, better compression
  memLevel: 8,

  // Strategy (optimal for JSON)
  strategy: 1, // Z_FILTERED - good for JSON/text
});

/**
 * Brotli compression middleware (better compression than gzip)
 *
 * Brotli typically achieves 15-20% better compression than gzip
 * but is slower to compress (10-15ms vs 5ms)
 *
 * Use for static/cacheable responses only
 */
export const brotliMiddleware = compression({
  level: 6,
  threshold: 1024,

  // Enable brotli compression
  brotli: {
    enabled: true,
    quality: 11, // 0-11, higher = better compression but slower
  },

  filter: (req, res) => {
    // Only use brotli for cacheable responses
    const cacheControl = res.getHeader("Cache-Control");
    if (cacheControl && cacheControl.includes("public")) {
      return compression.filter(req, res);
    }
    return false;
  },
});
