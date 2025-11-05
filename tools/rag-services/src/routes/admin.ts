/**
 * Admin Routes
 *
 * Administrative endpoints for cache management and system operations
 * All endpoints require JWT authentication
 *
 * @module routes/admin
 */

import { Router, Request, Response } from 'express';
import { getCacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { sendSuccess } from '../middleware/responseWrapper';
import { verifyJWT } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { cacheKeySchema, cachePatternSchema } from '../schemas/collection';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Apply JWT authentication to all admin routes
router.use(verifyJWT);

/**
 * GET /api/v1/admin/cache/stats
 * Get cache statistics
 */
router.get(
  '/cache/stats',
  asyncHandler((_req: Request, res: Response) => {
    const cacheService = getCacheService();
    const stats = cacheService.getStats();

    return sendSuccess(res, {
      cache: stats,
      timestamp: new Date().toISOString(),
    });
  }),
);

/**
 * DELETE /api/v1/admin/cache/:key
 * Invalidate a specific cache key
 *
 * Path Parameters:
 * - key: The cache key to invalidate (without prefix)
 *
 * @authenticated
 */
router.delete(
  '/cache/:key',
  asyncHandler(validate({ params: cacheKeySchema })),
  asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;

    logger.info('Invalidating cache key', { key });

    const cacheService = getCacheService();
    await cacheService.delete(key);

    return sendSuccess(res, {
      message: `Cache key invalidated: ${key}`,
      key,
      timestamp: new Date().toISOString(),
    });
  }),
);

/**
 * DELETE /api/v1/admin/cache
 * Clear all cache
 *
 * Query Parameters:
 * - pattern: Optional glob pattern to match keys (default: '*')
 *
 * @authenticated
 */
router.delete(
  '/cache',
  asyncHandler(validate({ query: cachePatternSchema })),
  asyncHandler(async (req: Request, res: Response) => {
    const pattern = (req.query.pattern as string) || '*';

    logger.warn('Clearing cache', { pattern });

    const cacheService = getCacheService();
    await cacheService.deletePattern(pattern);

    return sendSuccess(res, {
      message: pattern === '*' ? 'All cache cleared' : `Cache cleared for pattern: ${pattern}`,
      pattern,
      timestamp: new Date().toISOString(),
    });
  }),
);

/**
 * POST /api/v1/admin/cache/cleanup
 * Manually trigger memory cache cleanup
 */
router.post(
  '/cache/cleanup',
  asyncHandler((_req: Request, res: Response) => {
    logger.info('Manual cache cleanup triggered');

    const cacheService = getCacheService();
    cacheService.cleanMemoryCache();

    const stats = cacheService.getStats();

    return sendSuccess(res, {
      message: 'Memory cache cleanup completed',
      stats,
      timestamp: new Date().toISOString(),
    });
  }),
);

export default router;
