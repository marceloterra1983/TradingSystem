/**
 * Items Routes (Refactored)
 * 
 * CRUD endpoints for workspace items.
 * 
 * REFACTORING CHANGES:
 * - Replaced express-validator with Zod
 * - Introduced WorkspaceService for business logic
 * - Removed direct database access
 * - Simplified controllers (HTTP-only)
 * - Eliminated validateCategory SQL coupling
 * 
 * BEFORE: 193 lines with mixed concerns
 * AFTER: ~80 lines (58% reduction)
 * 
 * @module routes/items
 */

import { Router } from 'express';
import { getDbClient } from '../db/index.js';
import { createLogger } from '../../../../shared/logger/index.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import {
  validate,
  validateParam,
  validateQuery,
  CreateItemSchema,
  UpdateItemSchema,
  ItemIdSchema,
  FilterItemsSchema,
} from '../validation/schemas.js';

const router = Router();
const logger = createLogger('workspace-items');

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
 */
router.get('/', validateQuery(FilterItemsSchema), async (req, res, next) => {
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
 */
router.get('/:id', validateParam('id', ItemIdSchema), async (req, res, next) => {
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
});

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
 */
router.post('/', validate(CreateItemSchema), async (req, res, next) => {
  try {
    const service = getWorkspaceService();
    const item = await service.createItem(req.body, req.user);
    
    res.status(201).json({
      success: true,
      message: 'Item created successfully',
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
 */
router.put(
  '/:id',
  validateParam('id', ItemIdSchema),
  validate(UpdateItemSchema),
  async (req, res, next) => {
    try {
      const service = getWorkspaceService();
      const updated = await service.updateItem(req.params.id, req.body, req.user);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: `Item with id ${req.params.id} not found`,
        });
      }
      
      res.json({
        success: true,
        message: 'Item updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/items/:id
 * Delete an item
 */
router.delete('/:id', validateParam('id', ItemIdSchema), async (req, res, next) => {
  try {
    const service = getWorkspaceService();
    const deleted = await service.deleteItem(req.params.id, req.user);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Item with id ${req.params.id} not found`,
      });
    }
    
    res.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/items/stats
 * Get workspace statistics
 */
router.get('/stats', async (req, res, next) => {
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
});

export const itemsRouter = router;

