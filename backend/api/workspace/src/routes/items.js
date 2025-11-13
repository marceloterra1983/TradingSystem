/**
 * Items Routes (Refactored with Redis Caching - Phase 2.3)
 *
 * CRUD endpoints for workspace items with Redis caching.
 *
 * PHASE 2.3 CHANGES:
 * - Added Redis caching middleware for GET requests
 * - Cache invalidation on mutations (POST/PUT/DELETE)
 * - X-Cache headers for debugging (HIT/MISS)
 * - Configurable TTL per endpoint
 *
 * REFACTORING CHANGES:
 * - Replaced express-validator with Zod
 * - Introduced WorkspaceService for business logic
 * - Removed direct database access
 * - Simplified controllers (HTTP-only)
 * - Eliminated validateCategory SQL coupling
 *
 * BEFORE: 193 lines with mixed concerns
 * AFTER: ~120 lines (with caching)
 *
 * @module routes/items
 */

import { Router } from "express";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getDbClient } from "../db/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { WorkspaceService } from "../services/WorkspaceService.js";
import {
  validate,
  validateParam,
  validateQuery,
  CreateItemSchema,
  UpdateItemSchema,
  ItemIdSchema,
  FilterItemsSchema,
} from "../validation/schemas.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sharedCacheCandidates = [
  path.resolve(__dirname, "../../../../shared/cache/redis-cache.js"),
  path.resolve(process.cwd(), "backend/shared/cache/redis-cache.js"),
  "/app/backend/shared/cache/redis-cache.js",
  "/shared/cache/redis-cache.js",
];

let redisCacheModule = null;

for (const candidate of sharedCacheCandidates) {
  try {
    redisCacheModule = await import(pathToFileURL(candidate).href);
    break;
  } catch (error) {
    if (
      error.code !== "ERR_MODULE_NOT_FOUND" &&
      error.code !== "MODULE_NOT_FOUND"
    ) {
      throw error;
    }
  }
}

if (!redisCacheModule) {
  throw new Error(
    "Workspace items routes: não foi possível carregar o módulo compartilhado de cache Redis. Verifique volumes ou rebuild da imagem.",
  );
}

const { createCacheMiddleware, invalidateCache } = redisCacheModule;

const router = Router();
const logger = createLogger("workspace-items");

// Initialize service (singleton pattern)
let workspaceService;
export const getWorkspaceService = () => {
  if (!workspaceService) {
    const db = getDbClient();
    workspaceService = new WorkspaceService(db, logger);
  }
  return workspaceService;
};

export const resetWorkspaceService = () => {
  workspaceService = null;
};

// ============================================================================
// CACHE CONFIGURATION (Phase 2.3 - Performance Optimization)
// ============================================================================

/**
 * Cache middleware for item lists (5 minutes TTL)
 * Expected speedup: 200ms → 10ms (95% faster)
 */
const cacheItemsList = createCacheMiddleware({
  ttl: 300, // 5 minutes
  keyPrefix: "workspace:items:list",
  logger,
  enabled: process.env.REDIS_CACHE_ENABLED !== "false",
});

/**
 * Cache middleware for single items (5 minutes TTL)
 * Expected speedup: 150ms → 10ms (93% faster)
 */
const cacheSingleItem = createCacheMiddleware({
  ttl: 300, // 5 minutes
  keyPrefix: "workspace:items:single",
  logger,
  enabled: process.env.REDIS_CACHE_ENABLED !== "false",
});

/**
 * Cache middleware for stats (10 minutes TTL - less frequently updated)
 * Expected speedup: 250ms → 10ms (96% faster)
 */
const cacheStats = createCacheMiddleware({
  ttl: 600, // 10 minutes
  keyPrefix: "workspace:items:stats",
  logger,
  enabled: process.env.REDIS_CACHE_ENABLED !== "false",
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/items
 * List all items with optional filtering
 *
 * Query params:
 * - category: Filter by category
 * - status: Filter by status
 * - priority: Filter by priority
 * - search: Search in title/description/tags
 * - limit: Max results (default: 100)
 * - offset: Pagination offset (default: 0)
 *
 * Cache: 5 minutes
 * Cache key includes query params for accurate cache hits
 */
router.get(
  "/",
  validateQuery(FilterItemsSchema),
  cacheItemsList, // ⚡ CACHE: Phase 2.3
  async (req, res, next) => {
  try {
    const service = getWorkspaceService();
    const items = await service.getItems(req.query);

    res.json({
      success: true,
      count: items.length,
      data: items,
      filters: req.query,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/items/:id
 * Get a single item by ID
 *
 * Cache: 5 minutes
 * Cache key includes item ID
 */
router.get(
  "/:id",
  validateParam("id", ItemIdSchema),
  cacheSingleItem, // ⚡ CACHE: Phase 2.3
  async (req, res, next) => {
    try {
      const service = getWorkspaceService();
      const item = await service.getItem(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: `Item with id ${req.params.id} not found`,
        });
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/items
 * Create a new item
 *
 * Body (validated by Zod):
 * - title: string (1-200 chars)
 * - description: string (1-2000 chars)
 * - category: enum (documentacao, coleta-dados, ...)
 * - priority: enum (low, medium, high, critical)
 * - tags: string[] (optional)
 *
 * Cache invalidation: Invalidates list and stats caches
 */
router.post("/", validate(CreateItemSchema), async (req, res, next) => {
  try {
    const service = getWorkspaceService();
    const item = await service.createItem(req.body, req.user);

    // 🔄 CACHE INVALIDATION: Phase 2.3
    await invalidateCache("workspace:items:list");
    await invalidateCache("workspace:items:stats");

    res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/items/:id
 * Update an existing item
 *
 * All fields optional (partial update)
 *
 * Cache invalidation: Invalidates specific item, list, and stats caches
 */
router.put(
  "/:id",
  validateParam("id", ItemIdSchema),
  validate(UpdateItemSchema),
  async (req, res, next) => {
    try {
      const service = getWorkspaceService();
      const updated = await service.updateItem(
        req.params.id,
        req.body,
        req.user,
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: `Item with id ${req.params.id} not found`,
        });
      }

      // 🔄 CACHE INVALIDATION: Phase 2.3
      await invalidateCache(`workspace:items:single:${req.params.id}`);
      await invalidateCache("workspace:items:list");
      await invalidateCache("workspace:items:stats");

      res.json({
        success: true,
        message: "Item updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/items/:id
 * Delete an item
 *
 * Cache invalidation: Invalidates specific item, list, and stats caches
 */
router.delete(
  "/:id",
  validateParam("id", ItemIdSchema),
  async (req, res, next) => {
    try {
      const service = getWorkspaceService();
      const deleted = await service.deleteItem(req.params.id, req.user);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: `Item with id ${req.params.id} not found`,
        });
      }

      // 🔄 CACHE INVALIDATION: Phase 2.3
      await invalidateCache(`workspace:items:single:${req.params.id}`);
      await invalidateCache("workspace:items:list");
      await invalidateCache("workspace:items:stats");

      res.json({
        success: true,
        message: "Item deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/items/stats
 * Get workspace statistics
 *
 * Cache: 10 minutes (stats change less frequently)
 */
router.get(
  "/stats",
  cacheStats, // ⚡ CACHE: Phase 2.3
  async (req, res, next) => {
    try {
      const service = getWorkspaceService();
      const stats = await service.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const itemsRouter = router;
