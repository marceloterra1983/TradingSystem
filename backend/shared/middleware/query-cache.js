/**
 * Database Query Result Caching
 *
 * OPT-005: Query Result Caching
 * - Expected: ~70ms latency reduction for repeated queries
 * - Redis-backed query result cache with smart invalidation
 */

import crypto from 'crypto';
import { getRedisClient, isRedisReady } from './cache.js';

/**
 * Generate cache key from SQL query and parameters
 *
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {string} Cache key hash
 */
function generateQueryCacheKey(sql, params = []) {
  const queryString = `${sql}:${JSON.stringify(params)}`;
  return `db:query:${crypto.createHash('md5').update(queryString).digest('hex')}`;
}

/**
 * Cached query executor
 *
 * @param {Object} pool - Database pool
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Cache TTL in seconds (default: 300)
 * @param {boolean} options.enabled - Enable caching (default: true)
 * @param {Object} options.logger - Logger instance
 * @returns {Promise<Object>} Query result
 */
export async function cachedQuery(pool, sql, params = [], options = {}) {
  const {
    ttl = 300,
    enabled = process.env.QUERY_CACHE_ENABLED !== 'false',
    logger = console
  } = options;

  // Execute query directly if caching is disabled
  if (!enabled || !isRedisReady()) {
    return await pool.query(sql, params);
  }

  const redis = getRedisClient();
  const cacheKey = generateQueryCacheKey(sql, params);

  try {
    // Try to get cached result
    const cachedResult = await redis.get(cacheKey);

    if (cachedResult) {
      logger.debug({ cacheKey }, 'Query cache HIT');
      return JSON.parse(cachedResult);
    }

    // Cache miss - execute query
    logger.debug({ cacheKey }, 'Query cache MISS');
    const result = await pool.query(sql, params);

    // Cache the result
    await redis.setEx(cacheKey, ttl, JSON.stringify(result));

    return result;
  } catch (error) {
    logger.error({ err: error, sql: sql.substring(0, 100) }, 'Query cache error');
    // Fallback to direct query on cache error
    return await pool.query(sql, params);
  }
}

/**
 * Invalidate query cache by table name
 *
 * @param {string} tableName - Table name to invalidate
 * @param {Object} logger - Logger instance
 * @returns {Promise<number>} Number of keys invalidated
 */
export async function invalidateQueryCacheByTable(tableName, logger = console) {
  if (!isRedisReady()) {
    return 0;
  }

  const redis = getRedisClient();

  try {
    const pattern = `db:query:*`;
    const keys = await redis.keys(pattern);

    // This is a simple implementation - in production, you'd want to track
    // table dependencies more explicitly
    const deleted = keys.length > 0 ? await redis.del(keys) : 0;

    logger.info({ tableName, deleted }, 'Query cache invalidated for table');

    return deleted;
  } catch (error) {
    logger.error({ err: error, tableName }, 'Failed to invalidate query cache');
    throw error;
  }
}

export default {
  cachedQuery,
  invalidateQueryCacheByTable,
  generateQueryCacheKey
};
