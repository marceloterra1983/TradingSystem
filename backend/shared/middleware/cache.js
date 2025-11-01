/**
 * Shared Redis Caching Middleware
 *
 * OPT-004: API Response Caching
 * - Expected: ~110ms latency reduction for cached responses
 * - Expected: 70-90% cache hit rate for repeated queries
 * - Cache invalidation: TTL-based + manual invalidation
 */

import { createClient } from 'redis';

// Global Redis client instance
let redisClient = null;
let isRedisConnected = false;

/**
 * Initialize Redis client
 *
 * @param {Object} options - Configuration options
 * @param {string} options.host - Redis host (default: localhost)
 * @param {number} options.port - Redis port (default: 6379)
 * @param {string} options.password - Redis password (optional)
 * @param {number} options.db - Redis database number (default: 0)
 * @param {Object} options.logger - Logger instance
 * @returns {Promise<RedisClient>} Redis client
 */
export async function initializeRedis(options = {}) {
  const {
    host = process.env.REDIS_HOST || 'localhost',
    port = parseInt(process.env.REDIS_PORT || '6379'),
    password = process.env.REDIS_PASSWORD || undefined,
    db = parseInt(process.env.REDIS_DB || '0'),
    logger = console
  } = options;

  if (redisClient && isRedisConnected) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      socket: {
        host,
        port,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection limit exceeded');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          return Math.min(retries * 100, 3000);
        }
      },
      password,
      database: db
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info({ host, port, db }, 'Redis client connected');
      isRedisConnected = true;
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting');
    });

    await redisClient.connect();

    logger.info({ host, port, db }, 'Redis caching initialized');

    return redisClient;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Redis');
    throw error;
  }
}

/**
 * Get Redis client instance
 *
 * @returns {RedisClient|null} Redis client or null if not initialized
 */
export function getRedisClient() {
  return redisClient;
}

/**
 * Check if Redis is connected
 *
 * @returns {boolean} True if connected
 */
export function isRedisReady() {
  return isRedisConnected && redisClient !== null;
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisConnected = false;
  }
}

/**
 * Generate cache key
 *
 * @param {string} prefix - Cache key prefix (e.g., 'api', 'db', 'rag')
 * @param {string} identifier - Unique identifier (e.g., URL path, query hash)
 * @returns {string} Cache key
 */
export function generateCacheKey(prefix, identifier) {
  return `${prefix}:${identifier}`;
}

/**
 * Configure Redis caching middleware for Express routes
 *
 * @param {Object} options - Configuration options
 * @param {number} options.ttl - Cache TTL in seconds (default: 300)
 * @param {string} options.keyPrefix - Cache key prefix (default: 'api')
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.shouldCache - Function to determine if response should be cached
 * @param {Object} options.logger - Logger instance
 * @returns {Function} Express middleware
 */
export function configureCaching(options = {}) {
  const {
    ttl = 300,                      // 5 minutes default
    keyPrefix = 'api',
    keyGenerator = null,
    shouldCache = null,
    logger = console
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check if Redis is ready
    if (!isRedisReady()) {
      logger.warn('Redis not ready, skipping cache');
      res.set('X-Cache-Status', 'DISABLED');
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : generateCacheKey(keyPrefix, req.originalUrl);

    try {
      // Try to get cached response
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        // Cache hit
        const data = JSON.parse(cachedData);
        res.set('X-Cache-Status', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(data);
      }

      // Cache miss - intercept res.json to cache the response
      const originalJson = res.json.bind(res);

      res.json = function (data) {
        // Check if response should be cached
        const shouldCacheResponse = shouldCache
          ? shouldCache(req, res, data)
          : res.statusCode === 200;

        if (shouldCacheResponse) {
          // Cache the response asynchronously (don't wait)
          redisClient.setEx(cacheKey, ttl, JSON.stringify(data))
            .catch((err) => logger.error({ err, cacheKey }, 'Failed to cache response'));

          res.set('X-Cache-Status', 'MISS');
          res.set('X-Cache-TTL', ttl.toString());
        } else {
          res.set('X-Cache-Status', 'SKIP');
        }

        res.set('X-Cache-Key', cacheKey);

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error({ err: error, cacheKey }, 'Cache middleware error');
      res.set('X-Cache-Status', 'ERROR');
      next();
    }
  };
}

/**
 * Invalidate cache by key pattern
 *
 * @param {string} pattern - Cache key pattern (e.g., 'api:*', 'api:/items/*')
 * @param {Object} logger - Logger instance
 * @returns {Promise<number>} Number of keys deleted
 */
export async function invalidateCache(pattern, logger = console) {
  if (!isRedisReady()) {
    logger.warn('Redis not ready, cannot invalidate cache');
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);

    if (keys.length === 0) {
      logger.info({ pattern }, 'No cache keys found to invalidate');
      return 0;
    }

    const deleted = await redisClient.del(keys);

    logger.info({ pattern, deleted }, 'Cache invalidated');

    return deleted;
  } catch (error) {
    logger.error({ err: error, pattern }, 'Failed to invalidate cache');
    throw error;
  }
}

/**
 * Invalidate cache by key prefix
 *
 * @param {string} prefix - Cache key prefix (e.g., 'api', 'db')
 * @param {Object} logger - Logger instance
 * @returns {Promise<number>} Number of keys deleted
 */
export async function invalidateCacheByPrefix(prefix, logger = console) {
  return invalidateCache(`${prefix}:*`, logger);
}

/**
 * Flush all cache
 *
 * @param {Object} logger - Logger instance
 * @returns {Promise<void>}
 */
export async function flushAllCache(logger = console) {
  if (!isRedisReady()) {
    logger.warn('Redis not ready, cannot flush cache');
    return;
  }

  try {
    await redisClient.flushDb();
    logger.info('All cache flushed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to flush cache');
    throw error;
  }
}

/**
 * Get cache statistics
 *
 * @returns {Promise<Object>} Cache statistics
 */
export async function getCacheStats() {
  if (!isRedisReady()) {
    return {
      connected: false,
      keys: 0,
      memory: '0B',
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }

  try {
    const info = await redisClient.info('stats');
    const dbSize = await redisClient.dbSize();

    // Parse stats from INFO command
    const stats = {};
    info.split('\r\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    const hits = parseInt(stats.keyspace_hits || 0);
    const misses = parseInt(stats.keyspace_misses || 0);
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : 0;

    return {
      connected: true,
      keys: dbSize,
      memory: stats.used_memory_human || '0B',
      hits,
      misses,
      hitRate: parseFloat(hitRate)
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      connected: false,
      error: error.message
    };
  }
}

export default {
  initializeRedis,
  getRedisClient,
  isRedisReady,
  closeRedis,
  configureCaching,
  invalidateCache,
  invalidateCacheByPrefix,
  flushAllCache,
  getCacheStats,
  generateCacheKey
};
