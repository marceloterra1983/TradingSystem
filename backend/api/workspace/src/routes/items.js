import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getDbClient } from '../db/index.js';
import { nanoid } from '../utils/id.js';

const router = Router();

// Dynamic category validation - fetches from workspace_categories table
const validateCategory = async (value) => {
  const db = getDbClient();
  await db.init();

  const result = await db.pool.query(
    'SELECT name FROM workspace_categories WHERE name = $1 AND is_active = true',
    [value]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid category. Please select an active category from the list.');
  }

  return true;
};

const priorities = ['low', 'medium', 'high', 'critical'];
const statuses = ['new', 'review', 'in-progress', 'completed', 'rejected'];

const baseValidators = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('description').trim().notEmpty().withMessage('description is required'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('category is required')
    .custom(validateCategory),
  body('priority')
    .isIn(priorities)
    .withMessage(`priority must be one of: ${priorities.join(', ')}`),
  body('tags')
    .optional()
    .isArray({ min: 0 })
    .withMessage('tags must be an array of strings')
    .bail()
    .custom((arr) => arr.every((tag) => typeof tag === 'string'))
    .withMessage('tags must be an array of strings'),
];

const updateValidators = [
  param('id').trim().notEmpty(),
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('category')
    .optional()
    .custom(validateCategory),
  body('priority')
    .optional()
    .isIn(priorities)
    .withMessage(`priority must be one of: ${priorities.join(', ')}`),
  body('status')
    .optional()
    .isIn(statuses)
    .withMessage(`status must be one of: ${statuses.join(', ')}`),
  body('tags')
    .optional()
    .isArray({ min: 0 })
    .withMessage('tags must be an array of strings')
    .bail()
    .custom((arr) => arr.every((tag) => typeof tag === 'string'))
    .withMessage('tags must be an array of strings'),
];

router.get('/', async (req, res, next) => {
  try {
    const db = getDbClient();
    const items = await db.getItems();
    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', baseValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }

    const { title, description, category, priority, tags = [] } = req.body;
    const item = {
      title,
      description,
      category,
      priority,
      status: 'new',
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    const db = getDbClient();
    const createdItem = await db.createItem(item);

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: createdItem,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', updateValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }

    const { id } = req.params;
    const updates = req.body;
    const db = getDbClient();
    const updated = await db.updateItem(id, updates);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Item with id ${id} not found`,
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
});

router.delete('/:id', param('id').trim().notEmpty(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }

    const { id } = req.params;
    const db = getDbClient();
    const deleted = await db.deleteItem(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Item with id ${id} not found`,
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

export const itemsRouter = router;
