import express from 'express';
import IdeasService from '../services/IdeasService.js';
import { validation, handleValidationErrors } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/v1/ideas
 * List all ideas with filtering and pagination
 */
router.get(
  '/',
  validation.listQuery,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const filters = {
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      search: req.query.search
    };

    const _pagination = {
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const ideas = await IdeasService.getAllIdeas(filters);
    res.json({
      success: true,
      data: ideas,
      count: ideas.length,
      filters
    });
  })
);

/**
 * GET /api/v1/ideas/kanban
 * Get ideas grouped by status for Kanban view
 */
router.get('/kanban', asyncHandler(async (req, res) => {
  const result = await IdeasService.getKanbanIdeas();
  res.json({
    success: true,
    data: result
  });
}));

/**
 * GET /api/v1/ideas/:id
 * Get single idea by ID
 */
router.get('/:id',
  validation.uuid,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const idea = await IdeasService.getIdeaById(req.params.id);
    res.json({
      success: true,
      data: idea
    });
  })
);

/**
 * POST /api/v1/ideas
 * Create new idea
 */
router.post(
  '/',
  validation.createIdea,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const idea = await IdeasService.createIdea(req.body, userId);

    res.status(201).json({
      success: true,
      data: idea,
      message: 'Idea created successfully'
    });
  })
);

/**
 * PUT /api/v1/ideas/:id
 * Update existing idea
 */
router.put(
  '/:id',
  validation.uuid,
  validation.updateIdea,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const idea = await IdeasService.updateIdea(req.params.id, req.body, userId);

    res.json({
      success: true,
      data: idea,
      message: 'Idea updated successfully'
    });
  })
);

/**
 * DELETE /api/v1/ideas/:id
 * Delete idea
 */
router.delete('/:id',
  validation.uuid,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    await IdeasService.deleteIdea(req.params.id, userId);

    res.json({
      success: true,
      message: 'Idea deleted successfully'
    });
  })
);

export default router;
