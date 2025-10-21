/**
 * Simple in-memory cache middleware for statistics
 * Caches responses for a configurable TTL (default 5 minutes)
 */

const cache = new Map();

/**
 * Cache middleware factory
 * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Function} Express middleware
 */
export function cacheMiddleware(ttlSeconds = 300) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cached = cache.get(key);

    // Check if cached and not expired
    if (cached && Date.now() < cached.expiresAt) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Expires', new Date(cached.expiresAt).toISOString());
      return res.json(cached.data);
    }

    // Cache miss - intercept res.json to cache the response
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, {
          data,
          expiresAt: Date.now() + (ttlSeconds * 1000)
        });

        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-TTL', `${ttlSeconds}s`);
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Clear all cached entries
 */
export function clearCache() {
  cache.clear();
}

/**
 * Clear specific cache entry by key
 * @param {string} key - Cache key to clear
 */
export function clearCacheKey(key) {
  cache.delete(key);
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  const entries = Array.from(cache.entries());
  const now = Date.now();

  return {
    total_entries: entries.length,
    active_entries: entries.filter(([_, v]) => now < v.expiresAt).length,
    expired_entries: entries.filter(([_, v]) => now >= v.expiresAt).length,
    total_size_bytes: JSON.stringify(Array.from(cache.values())).length
  };
}

/**
 * Clean up expired cache entries
 */
export function cleanExpiredCache() {
  const now = Date.now();
  let removed = 0;

  for (const [key, value] of cache.entries()) {
    if (now >= value.expiresAt) {
      cache.delete(key);
      removed++;
    }
  }

  return removed;
}

// Auto-cleanup expired entries every 10 minutes
setInterval(() => {
  const removed = cleanExpiredCache();
  if (removed > 0) {
    console.log(`[Cache] Cleaned ${removed} expired entries`);
  }
}, 10 * 60 * 1000);
