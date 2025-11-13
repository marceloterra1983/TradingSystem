/**
 * Shared Compression Middleware
 *
 * Implements gzip compression for API responses with optimal configuration
 * for performance and compression ratio balance.
 *
 * OPT-001: Response Compression
 * - Expected: 40% reduction in payload size
 * - Expected: 20% faster response time (~60ms savings)
 * - Target: All responses > 1KB
 */

import compression from 'compression';

/**
 * Configure compression middleware with performance-optimized settings
 *
 * @param {Object} options - Configuration options
 * @param {number} options.level - Compression level (0-9, default: 6)
 * @param {number} options.threshold - Minimum size in bytes to compress (default: 1024)
 * @param {Function} options.filter - Custom filter function
 * @param {Object} options.logger - Logger instance for debugging
 * @returns {Function} Express middleware
 */
export function configureCompression(options = {}) {
  const {
    level = 6,              // Balance between speed and compression ratio
    threshold = 1024,       // Only compress responses > 1KB
    filter = null,
    logger = console
  } = options;

  logger.info('Configuring response compression', {
    level,
    threshold,
    hasCustomFilter: !!filter
  });

  const compressionOptions = {
    level,
    threshold,
    // Custom filter or default
    filter: filter || ((req, res) => {
      // Don't compress if client explicitly requests no compression
      if (req.headers['x-no-compression']) {
        return false;
      }

      // Don't compress streaming responses
      if (res.getHeader('Content-Type')?.includes('text/event-stream')) {
        return false;
      }

      // Don't compress already compressed content
      const contentEncoding = res.getHeader('Content-Encoding');
      if (contentEncoding && contentEncoding !== 'identity') {
        return false;
      }

      // Use compression's default filter for everything else
      return compression.filter(req, res);
    }),
  };

  return compression(compressionOptions);
}

/**
 * Middleware to add compression-related headers for monitoring
 */
export function compressionMetrics(_req, res, next) {
  const originalEnd = res.end.bind(res);
  let uncompressedSize = 0;

  // Capture response chunks
  const originalWrite = res.write.bind(res);
  res.write = function(chunk, ...args) {
    if (chunk) {
      uncompressedSize += chunk.length;
    }
    return originalWrite(chunk, ...args);
  };

  res.end = function(chunk, ...args) {
    if (chunk) {
      uncompressedSize += chunk.length;
    }

    // Add custom headers for monitoring (only if headers not sent yet)
    if (
      !res.headersSent &&
      res.getHeader('Content-Encoding') === 'gzip' &&
      uncompressedSize > 0
    ) {
      const compressedSize = parseInt(res.getHeader('Content-Length') || '0');
      if (compressedSize > 0) {
        const ratio = ((1 - compressedSize / uncompressedSize) * 100).toFixed(1);
        res.setHeader('X-Compression-Ratio', `${ratio}%`);
      }

      res.setHeader('X-Original-Size', uncompressedSize);
    }

    return originalEnd(chunk, ...args);
  };

  next();
}

export default configureCompression;
