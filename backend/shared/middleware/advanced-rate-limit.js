/**
 * Advanced Rate Limiting Middleware
 *
 * Extends basic rate limiting with per-user, per-IP, and tiered strategies.
 * Part of Phase 2.2 - Security Infrastructure
 *
 * Features:
 * - Per-user rate limiting (authenticated users)
 * - Per-IP rate limiting (anonymous users)
 * - Tiered rate limits (anonymous, authenticated, premium)
 * - Endpoint-specific limits
 * - Redis-backed distributed rate limiting
 * - Rate limit headers (RateLimit-* standard)
 *
 * Usage:
 *   import { createAdvancedRateLimit } from '@backend/shared/middleware/advanced-rate-limit';
 *
 *   // Per-user rate limiting
 *   app.use(createAdvancedRateLimit({
 *     tier: 'authenticated',
 *     keyGenerator: (req) => req.user?.id || req.ip
 *   }));
 *
 *   // Endpoint-specific strict limit
 *   app.post('/api/expensive-operation',
 *     createAdvancedRateLimit({ tier: 'strict', max: 10 })
 *   );
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

/**
 * Rate limit tiers with default configurations
 */
export const RATE_LIMIT_TIERS = {
  // Anonymous users (per-IP)
  anonymous: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 requests per hour
  },

  // Authenticated users (per-user ID)
  authenticated: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 requests per hour
  },

  // Premium users
  premium: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10000, // 10,000 requests per hour
  },

  // Strict limits for expensive operations
  strict: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
  },

  // Very strict for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
  },
};

/**
 * Create Redis client for distributed rate limiting
 *
 * @param {object} options - Redis options
 * @returns {Redis} Redis client
 */
function createRedisClient(options = {}) {
  const {
    host = process.env.REDIS_HOST || 'localhost',
    port = process.env.REDIS_PORT || 6379,
    password = process.env.REDIS_PASSWORD,
    db = process.env.REDIS_RATE_LIMIT_DB || 1,
  } = options;

  return new Redis({
    host,
    port,
    password,
    db,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}

/**
 * Generate rate limit key based on user or IP
 *
 * @param {object} req - Express request
 * @param {string} prefix - Key prefix
 * @returns {string} Rate limit key
 */
function defaultKeyGenerator(req, prefix = 'ratelimit') {
  // Use user ID if authenticated
  if (req.user?.id) {
    return `${prefix}:user:${req.user.id}`;
  }

  // Use service name if inter-service request
  if (req.serviceAuth?.serviceName) {
    return `${prefix}:service:${req.serviceAuth.serviceName}`;
  }

  // Fall back to IP for anonymous
  return `${prefix}:ip:${req.ip}`;
}

/**
 * Determine rate limit tier for user
 *
 * @param {object} req - Express request
 * @returns {string} Tier name (anonymous, authenticated, premium)
 */
function determineTier(req) {
  // Check if user is premium
  if (req.user?.tier === 'premium' || req.user?.isPremium) {
    return 'premium';
  }

  // Check if authenticated
  if (req.user?.id) {
    return 'authenticated';
  }

  // Anonymous
  return 'anonymous';
}

/**
 * Create advanced rate limiting middleware
 *
 * @param {object} options - Rate limit options
 * @param {string} options.tier - Rate limit tier (anonymous, authenticated, premium, strict, auth)
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {boolean} options.useRedis - Use Redis for distributed rate limiting (default: false)
 * @param {object} options.redisOptions - Redis connection options
 * @param {Function} options.tierResolver - Custom tier resolver function
 * @param {object} options.logger - Logger instance
 * @param {boolean} options.skipSuccessfulRequests - Skip counting successful requests (default: false)
 * @param {boolean} options.skipFailedRequests - Skip counting failed requests (default: false)
 * @returns {Function} Express middleware
 */
export function createAdvancedRateLimit(options = {}) {
  const {
    tier,
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    useRedis = process.env.REDIS_HOST ? true : false,
    redisOptions = {},
    tierResolver = determineTier,
    logger,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  // Base configuration
  const config = {
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    skipSuccessfulRequests,
    skipFailedRequests,

    // Custom key generator
    keyGenerator: (req) => {
      return keyGenerator(req, 'ratelimit');
    },

    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      const retryAfter = res.getHeader('RateLimit-Reset');

      logger?.warn({
        key: keyGenerator(req),
        ip: req.ip,
        path: req.path,
        method: req.method,
        tier: req.rateLimitTier,
      }, 'Rate limit exceeded');

      res.status(429).json({
        success: false,
        error: 'TooManyRequests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
        limit: res.getHeader('RateLimit-Limit'),
        remaining: 0,
      });
    },

    // Skip rate limiting for certain conditions
    skip: (req) => {
      // Skip for health checks
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }

      // Skip for internal service-to-service calls (optional)
      if (req.serviceAuth?.serviceName && process.env.SKIP_RATE_LIMIT_FOR_SERVICES === 'true') {
        return true;
      }

      return false;
    },
  };

  // Determine rate limit based on tier or user
  if (tier) {
    // Use explicit tier
    const tierConfig = RATE_LIMIT_TIERS[tier];
    if (!tierConfig) {
      throw new Error(`Invalid rate limit tier: ${tier}`);
    }

    config.windowMs = windowMs || tierConfig.windowMs;
    config.max = max || tierConfig.max;
  } else {
    // Dynamic tier based on user
    config.windowMs = windowMs || 60 * 60 * 1000; // Default 1 hour
    config.max = (req, res) => {
      const userTier = tierResolver(req);
      req.rateLimitTier = userTier; // Attach for logging

      const tierConfig = RATE_LIMIT_TIERS[userTier];
      return max || tierConfig.max;
    };
  }

  // Use Redis store if enabled
  if (useRedis) {
    try {
      const redisClient = createRedisClient(redisOptions);

      config.store = new RedisStore({
        client: redisClient,
        prefix: 'rl:', // Rate limit key prefix in Redis
      });

      logger?.info({ useRedis: true }, 'Rate limiting using Redis store');
    } catch (error) {
      logger?.warn({
        error: error.message,
        fallback: 'memory',
      }, 'Failed to connect to Redis, falling back to memory store');
    }
  }

  return rateLimit(config);
}

/**
 * Create per-endpoint rate limiters
 *
 * @param {object} config - Configuration map { path: options }
 * @param {object} globalOptions - Global options for all endpoints
 * @returns {object} Map of path -> middleware
 */
export function createEndpointRateLimits(config, globalOptions = {}) {
  const limiters = {};

  Object.entries(config).forEach(([path, options]) => {
    limiters[path] = createAdvancedRateLimit({
      ...globalOptions,
      ...options,
    });
  });

  return limiters;
}

/**
 * Create rate limiter for authentication endpoints
 * Extra strict to prevent brute force attacks
 *
 * @param {object} options - Additional options
 * @returns {Function} Express middleware
 */
export function createAuthRateLimit(options = {}) {
  return createAdvancedRateLimit({
    tier: 'auth',
    ...options,
    message: 'Too many authentication attempts. Please try again later.',
  });
}

/**
 * Create rate limiter for expensive operations
 * Strict limits regardless of user tier
 *
 * @param {object} options - Additional options
 * @returns {Function} Express middleware
 */
export function createStrictRateLimit(options = {}) {
  return createAdvancedRateLimit({
    tier: 'strict',
    ...options,
    message: 'This operation is rate limited. Please try again later.',
  });
}

/**
 * Middleware to add rate limit info to response headers
 * Useful for clients to know their current rate limit status
 *
 * @param {object} options - Options
 * @param {Function} options.keyGenerator - Custom key generator
 * @returns {Function} Express middleware
 */
export function addRateLimitInfo(options = {}) {
  const { keyGenerator = defaultKeyGenerator } = options;

  return (req, res, next) => {
    // Attach rate limit key to request for logging
    req.rateLimitKey = keyGenerator(req);

    // Attach tier if not already set
    if (!req.rateLimitTier) {
      req.rateLimitTier = determineTier(req);
    }

    next();
  };
}

/**
 * Reset rate limit for a specific key (admin operation)
 *
 * @param {string} key - Rate limit key
 * @param {object} options - Redis options
 * @returns {Promise<boolean>} Success status
 */
export async function resetRateLimit(key, options = {}) {
  const redisClient = createRedisClient(options);

  try {
    await redisClient.del(`rl:${key}`);
    return true;
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    return false;
  } finally {
    await redisClient.quit();
  }
}

// CommonJS compatibility
export default {
  RATE_LIMIT_TIERS,
  createAdvancedRateLimit,
  createEndpointRateLimits,
  createAuthRateLimit,
  createStrictRateLimit,
  addRateLimitInfo,
  resetRateLimit,
};
