import express from 'express';
import SystemsService from '../services/SystemsService.js';
import { validation, handleValidationErrors } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/v1/systems
 * Get all systems with optional filtering
 */
router.get('/',
  validation.listQuery,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const filters = {
      status: req.query.status,
      type: req.query.type,
      owner: req.query.owner,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      order_by: req.query.order_by,
      order_direction: req.query.order_direction
    };

    const systems = await SystemsService.getAllSystems(filters);

    res.json({
      success: true,
      data: systems,
      count: systems.length,
      filters
    });
  })
);

/**
 * GET /api/v1/systems/:id
 * Get system by ID
 */
router.get('/:id',
  validation.uuid,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const system = await SystemsService.getSystemById(id);

    res.json({
      success: true,
      data: system
    });
  })
);

/**
 * POST /api/v1/systems
 * Create a new system
 */
router.post('/',
  validation.createSystem,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const system = await SystemsService.createSystem(req.body, userId);

    logger.info('System created via API', {
      systemId: system.id,
      name: system.name,
      userId,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: system,
      message: 'System created successfully'
    });
  })
);

/**
 * PUT /api/v1/systems/:id
 * Update system
 */
router.put('/:id',
  validation.uuid,
  validation.updateSystem,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';
    const system = await SystemsService.updateSystem(id, req.body, userId);

    logger.info('System updated via API', {
      systemId: id,
      fields: Object.keys(req.body),
      userId,
      ip: req.ip
    });

    res.json({
      success: true,
      data: system,
      message: 'System updated successfully'
    });
  })
);

/**
 * DELETE /api/v1/systems/:id
 * Delete system
 */
router.delete('/:id',
  validation.uuid,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';
    await SystemsService.deleteSystem(id, userId);

    logger.info('System deleted via API', {
      systemId: id,
      userId,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'System deleted successfully'
    });
  })
);

/**
 * POST /api/v1/systems/:id/health
 * Check system health
 */
router.post('/:id/health',
  validation.uuid,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const health = await SystemsService.checkSystemHealth(id);

    res.json({
      success: true,
      data: health,
      message: 'Health check completed'
    });
  })
);

/**
 * POST /api/v1/systems/health-check-all
 * Check health of all systems
 */
router.post('/health-check-all',
  asyncHandler(async (req, res) => {
    const results = await SystemsService.checkAllSystemsHealth();

    res.json({
      success: true,
      data: results,
      message: 'All systems health check completed'
    });
  })
);

/**
 * GET /api/v1/systems/status/:status
 * Get systems by status
 */
router.get('/status/:status',
  asyncHandler(async (req, res) => {
    const { status } = req.params;
    const systems = await SystemsService.getSystemsByStatus(status);

    res.json({
      success: true,
      data: systems,
      count: systems.length,
      status
    });
  })
);

/**
 * GET /api/v1/systems/type/:type
 * Get systems by type
 */
router.get('/type/:type',
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    const systems = await SystemsService.getSystemsByType(type);

    res.json({
      success: true,
      data: systems,
      count: systems.length,
      type
    });
  })
);

/**
 * GET /api/v1/systems/search
 * Search systems
 */
router.get('/search',
  asyncHandler(async (req, res) => {
    const { q: query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const systems = await SystemsService.searchSystems(query.trim());

    res.json({
      success: true,
      data: systems,
      count: systems.length,
      query: query.trim()
    });
  })
);

/**
 * GET /api/v1/systems/statistics
 * Get system statistics
 */
router.get('/statistics',
  asyncHandler(async (req, res) => {
    const stats = await SystemsService.getSystemStatistics();

    res.json({
      success: true,
      data: stats
    });
  })
);

export default router;
