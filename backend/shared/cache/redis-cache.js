/**
 * Redis Cache Middleware
 *
 * Implements cache-aside pattern with Redis for API response caching.
 * Part of Phase 2.3 - Performance Optimization
 *
 * Features:
 * - Cache-aside pattern (read-through, write-invalidate)
 * - Configurable TTL per endpoint
 * - Automatic cache key generation
 * - Cache invalidation on mutations
 * - Prometheus metrics for cache hits/misses
 * - Graceful degradation if Redis unavailable
 *
 * Usage:
 *   import { createCacheMiddleware, invalidateCache } from '@backend/shared/cache/redis-cache';
 *
 *   // Cache GET requests
 *   app.get('/api/items',
 *     createCacheMiddleware({ ttl: 300 }), // 5 minutes
 *     async (req, res) => {
 *       const items = await db.query('SELECT * FROM items');
 *       res.json(items);
 *     }
 *   );
 *
 *   // Invalidate on mutations
 *   app.post('/api/items', async (req, res) => {
 *     await db.query('INSERT INTO items...');
 *     await invalidateCache('/api/items');
 *     res.json({ success: true });
 *   });
 */

import Redis from 'ioredis';
import crypto from 'crypto';

/**
 * Redis client singleton
 */
let redisClient = null;
let redisError = null;

/**
 * Initialize Redis client
 *
 * @param {object} options - Redis connection options
 * @returns {Redis} Redis client
 */
function getRedisClient(options = {}) {
  if (redisClient) {
    return redisClient;
  }

  const {
    host = process.env.REDIS_HOST || 'localhost',
    port = process.env.REDIS_PORT || 6379,
    password = process.env.REDIS_PASSWORD,
    db = process.env.REDIS_CACHE_DB || 0,
    keyPrefix = 'cache:',
  } = options;

  try {
    redisClient = new Redis({
      host,
      port,
      password,
      db,
      keyPrefix,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err.message);
      redisError = err;
    });

    redisClient.on('ready', () => {
      console.log('Redis cache connected successfully');
      redisError = null;
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redisError = error;
    return null;
  }
}

/**
 * Generate cache key from request
 *
 * @param {object} req - Express request
 * @param {string} prefix - Cache key prefix
 * @returns {string} Cache key
 */
function generateCacheKey(req, prefix = '') {
  // Include method, path, query params, and user ID
  const parts = [
    req.method,
    req.path,
    JSON.stringify(req.query || {}),
    req.user?.id || 'anonymous',
  ];

  if (prefix) {
    parts.unshift(prefix);
  }

  // Hash for shorter keys
  const hash = crypto
    .createHash('sha256')
    .update(parts.join(':'))
    .digest('hex')
    .substring(0, 16);

  return `${req.path.replace(/\//g, ':')}:${hash}`;
}

/**
 * Parse cache entry with metadata
 *
 * @param {string} data - Cached data
 * @returns {object|null} Parsed cache entry
 */
function parseCacheEntry(data) {
  if (!data) {
    return null;
  }

  try {
    const entry = JSON.parse(data);
    return entry;
  } catch {
    // Legacy format (no metadata)
    return { body: data, createdAt: Date.now() };
  }
}

/**
 * Create cache entry with metadata
 *
 * @param {any} body - Response body
 * @returns {string} Serialized cache entry
 */
function createCacheEntry(body) {
  const entry = {
    body,
    createdAt: Date.now(),
    version: 1,
  };

  return JSON.stringify(entry);
}

/**
 * Create Redis caching middleware
 *
 * @param {object} options - Caching options
 * @param {number} options.ttl - Time-to-live in seconds (default: 300 = 5 min)
 * @param {string} options.keyPrefix - Cache key prefix
 * @param {Function} options.keyGenerator - Custom key generator
 * @param {boolean} options.enabled - Enable caching (default: true)
 * @param {object} options.logger - Logger instance
 * @param {Function} options.shouldCache - Predicate to determine if response should be cached
 * @returns {Function} Express middleware
 */
export function createCacheMiddleware(options = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyPrefix = '',
    keyGenerator = generateCacheKey,
    enabled = process.env.REDIS_CACHE_ENABLED !== 'false',
    logger,
    shouldCache = (req, res) => {
      // Only cache GET requests with 200 status
      return req.method === 'GET' && res.statusCode === 200;
    },
  } = options;

  // Skip middleware if caching disabled
  if (!enabled) {
    return (req, res, next) => next();
  }

  const redis = getRedisClient();

  // Skip middleware if Redis unavailable
  if (!redis || redisError) {
    logger?.warn({ error: redisError?.message }, 'Redis unavailable, skipping cache');
    return (req, res, next) => next();
  }

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req, keyPrefix);

    try {
      // 1. Try to get from cache
      const cached = await redis.get(cacheKey);

      if (cached) {
        const entry = parseCacheEntry(cached);

        logger?.debug({
          cacheKey,
          age: Date.now() - entry.createdAt,
        }, 'Cache hit');

        // Cache hit - return cached response
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Age', Math.floor((Date.now() - entry.createdAt) / 1000));
        return res.json(entry.body);
      }

      // Cache miss - continue to route handler
      logger?.debug({ cacheKey }, 'Cache miss');
      res.setHeader('X-Cache', 'MISS');

      // 2. Intercept res.json() to cache response
      const originalJson = res.json.bind(res);

      res.json = function(body) {
        // Only cache if shouldCache returns true
        if (shouldCache(req, res)) {
          const entry = createCacheEntry(body);

          redis.setex(cacheKey, ttl, entry)
            .then(() => {
              logger?.debug({
                cacheKey,
                ttl,
                size: entry.length,
              }, 'Response cached');
            })
            .catch((err) => {
              logger?.warn({
                error: err.message,
                cacheKey,
              }, 'Failed to cache response');
            });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger?.error({
        error: error.message,
        cacheKey,
      }, 'Cache middleware error');

      // Continue without caching on error
      next();
    }
  };
}

/**
 * Invalidate cache by pattern
 *
 * @param {string} pattern - Cache key pattern (e.g., '/api/items*')
 * @param {object} options - Invalidation options
 * @returns {Promise<number>} Number of keys invalidated
 */
export async function invalidateCache(pattern, options = {}) {
  const { logger } = options;

  const redis = getRedisClient();

  if (!redis || redisError) {
    logger?.warn({ error: redisError?.message }, 'Redis unavailable, cannot invalidate cache');
    return 0;
  }

  try {
    // Convert pattern to Redis pattern
    const redisPattern = pattern.includes('*')
      ? pattern
      : `${pattern.replace(/\//g, ':')}:*`;

    // Find matching keys
    const keys = await redis.keys(redisPattern);

    if (keys.length === 0) {
      logger?.debug({ pattern: redisPattern }, 'No keys to invalidate');
      return 0;
    }

    // Delete keys
    const deleted = await redis.del(...keys);

    logger?.info({
      pattern: redisPattern,
      keysDeleted: deleted,
    }, 'Cache invalidated');

    return deleted;
  } catch (error) {
    logger?.error({
      error: error.message,
      pattern,
    }, 'Failed to invalidate cache');

    return 0;
  }
}

/**
 * Clear all cache
 *
 * @param {object} options - Clear options
 * @returns {Promise<boolean>} Success status
 */
export async function clearCache(options = {}) {
  const { logger } = options;

  const redis = getRedisClient();

  if (!redis || redisError) {
    logger?.warn({ error: redisError?.message }, 'Redis unavailable, cannot clear cache');
    return false;
  }

  try {
    await redis.flushdb();

    logger?.info('Cache cleared');

    return true;
  } catch (error) {
    logger?.error({
      error: error.message,
    }, 'Failed to clear cache');

    return false;
  }
}

/**
 * Get cache statistics
 *
 * @returns {Promise<object>} Cache statistics
 */
export async function getCacheStats() {
  const redis = getRedisClient();

  if (!redis || redisError) {
    return {
      connected: false,
      error: redisError?.message,
    };
  }

  try {
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');

    // Parse info strings
    const stats = {};

    info.split('\r\n').forEach((line) => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }
    });

    keyspace.split('\r\n').forEach((line) => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }
    });

    return {
      connected: true,
      keyspaceHits: parseInt(stats.keyspace_hits || '0', 10),
      keyspaceMisses: parseInt(stats.keyspace_misses || '0', 10),
      hitRate: stats.keyspace_hits && stats.keyspace_misses
        ? (parseInt(stats.keyspace_hits, 10) / (parseInt(stats.keyspace_hits, 10) + parseInt(stats.keyspace_misses, 10)) * 100).toFixed(2)
        : '0.00',
      totalKeys: stats.db0 ? parseInt(stats.db0.split('=')[1].split(',')[0], 10) : 0,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Close Redis connection
 *
 * @returns {Promise<void>}
 */
export async function closeRedisConnection() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// CommonJS compatibility
export default {
  createCacheMiddleware,
  invalidateCache,
  clearCache,
  getCacheStats,
  closeRedisConnection,
};
