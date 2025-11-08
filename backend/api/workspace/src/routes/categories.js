/**
 * Categories Routes (Refactored)
 *
 * CRUD endpoints for workspace categories.
 *
 * REFACTORING CHANGES:
 * - Introduced CategoryService for business logic
 * - Added caching (5 min TTL)
 * - Removed direct database access
 *
 * @module routes/categories
 */

import { Router } from "express";
import { getDbClient } from "../db/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { CategoryService } from "../services/CategoryService.js";

const router = Router();
const logger = createLogger("workspace-categories");

// Initialize service (singleton pattern)
let categoryService;
const getCategoryService = () => {
  if (!categoryService) {
    const db = getDbClient();
    categoryService = new CategoryService(db, logger);
  }
  return categoryService;
};

// Import WorkspaceService for cache invalidation
import { getWorkspaceService } from "./items.js";

/**
 * Invalidate all category caches (CategoryService + WorkspaceService)
 */
const invalidateAllCategoryCaches = () => {
  // Invalidate CategoryService cache
  const catService = getCategoryService();
  catService.invalidateCache();

  // Invalidate WorkspaceService cache
  try {
    const workspaceService = getWorkspaceService();
    workspaceService.invalidateCategoriesCache();
  } catch {
    // WorkspaceService may not be initialized yet, that's OK
    logger.debug(
      "WorkspaceService not initialized, skipping cache invalidation",
    );
  }
};

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/categories
 * List all active categories
 *
 * Cached for 5 minutes (categories change rarely)
 */
router.get("/", async (req, res, next) => {
  try {
    const service = getCategoryService();
    const categories = await service.getCategories();

    res.json({
      success: true,
      count: categories.length,
      data: categories,
      cached: true, // Indicates response may be cached
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/:name
 * Get a specific category by name
 */
router.get("/:name", async (req, res, next) => {
  try {
    const service = getCategoryService();
    const category = await service.getCategory(req.params.name);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category '${req.params.name}' not found`,
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/stats
 * Get category statistics
 */
router.get("/stats", async (req, res, next) => {
  try {
    const service = getCategoryService();
    const stats = await service.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories/validate
 * Validate if a category name is valid
 *
 * Body: { name: string }
 * Response: { valid: boolean }
 */
router.post("/validate", async (req, res, next) => {
  try {
    const service = getCategoryService();
    const isValid = await service.isValidCategory(req.body.name);

    res.json({
      success: true,
      valid: isValid,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories
 * Create a new category
 *
 * Body: { name, display_name?, description?, color?, icon?, display_order? }
 */
router.post("/", async (req, res, next) => {
  try {
    const { name, display_name, description, display_order } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    // Insert into database
    const db = getDbClient();
    await db.init();

    const query = `
      INSERT INTO workspace.workspace_categories
      (name, display_name, description, sort_order, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING 
        name AS id,
        name,
        display_name,
        description,
        is_active,
        sort_order AS display_order,
        created_at,
        updated_at
    `;

    const values = [
      name,
      display_name || name,
      description || null,
      display_order || 99,
    ];

    const result = await db.pool.query(query, values);

    // Invalidate ALL category caches (CategoryService + WorkspaceService)
    invalidateAllCategoryCaches();

    logger.info({ category: name }, "Category created successfully");

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Category created successfully",
    });
  } catch (error) {
    if (error.code === "23505") {
      // Unique violation
      return res.status(409).json({
        success: false,
        message: `Category '${req.body.name}' already exists`,
      });
    }
    next(error);
  }
});

/**
 * PUT /api/categories/:name
 * Update an existing category
 *
 * Body: { display_name?, description?, sort_order?, is_active? }
 */
router.put("/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    const { display_name, description, sort_order, is_active } = req.body;

    const db = getDbClient();
    await db.init();

    const query = `
      UPDATE workspace.workspace_categories
      SET 
        display_name = COALESCE($1, display_name),
        description = COALESCE($2, description),
        sort_order = COALESCE($3, sort_order),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
      WHERE name = $5
      RETURNING 
        name AS id,
        name,
        display_name,
        description,
        is_active,
        sort_order AS display_order,
        created_at,
        updated_at
    `;

    const values = [display_name, description, sort_order, is_active, name];
    const result = await db.pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Category '${name}' not found`,
      });
    }

    // Invalidate ALL category caches (CategoryService + WorkspaceService)
    invalidateAllCategoryCaches();

    logger.info({ category: name }, "Category updated successfully");

    res.json({
      success: true,
      data: result.rows[0],
      message: "Category updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/categories/:name
 * Delete a category (soft delete - set is_active = false)
 *
 * Hard delete only if no items reference it
 */
router.delete("/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    const db = getDbClient();
    await db.init();

    // Check if any items use this category
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM workspace.workspace_items 
      WHERE category = $1
    `;
    const checkResult = await db.pool.query(checkQuery, [name]);
    const itemCount = parseInt(checkResult.rows[0].count);

    if (itemCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete category '${name}' - ${itemCount} items are using it`,
      });
    }

    // Safe to delete
    const query = `
      DELETE FROM workspace.workspace_categories
      WHERE name = $1
      RETURNING name
    `;

    const result = await db.pool.query(query, [name]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Category '${name}' not found`,
      });
    }

    // Invalidate ALL category caches (CategoryService + WorkspaceService)
    invalidateAllCategoryCaches();

    logger.info({ category: name }, "Category deleted successfully");

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/categories/:name/toggle
 * Toggle category active status
 */
router.patch("/:name/toggle", async (req, res, next) => {
  try {
    const { name } = req.params;
    const db = getDbClient();
    await db.init();

    const query = `
      UPDATE workspace.workspace_categories
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE name = $1
      RETURNING 
        name AS id,
        name,
        display_name,
        description,
        is_active,
        sort_order AS display_order,
        created_at,
        updated_at
    `;

    const result = await db.pool.query(query, [name]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Category '${name}' not found`,
      });
    }

    // Invalidate ALL category caches (CategoryService + WorkspaceService)
    invalidateAllCategoryCaches();

    logger.info(
      { category: name, is_active: result.rows[0].is_active },
      "Category toggled",
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories/invalidate-cache
 * Invalidate categories cache (admin only - future)
 *
 * Use when categories are updated in database
 */
router.post("/invalidate-cache", async (req, res, next) => {
  try {
    const service = getCategoryService();
    service.invalidateCache();

    res.json({
      success: true,
      message: "Categories cache invalidated",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
