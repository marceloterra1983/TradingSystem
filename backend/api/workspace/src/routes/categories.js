import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getDbClient } from '../db/index.js';

const router = Router();

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

const createValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('name must contain only lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('description must be less than 500 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('color must be a valid hex color (e.g., #3B82F6)'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('icon must be less than 50 characters'),
  body('display_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('display_order must be a positive integer'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
];

const updateValidators = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('name must contain only lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('description must be less than 500 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('color must be a valid hex color (e.g., #3B82F6)'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('icon must be less than 50 characters'),
  body('display_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('display_order must be a positive integer'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
];

// ============================================================================
// GET /api/categories - List all categories
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { active_only = 'true', order_by = 'display_order' } = req.query;

    const db = getDbClient();
    await db.init();

    let query = 'SELECT * FROM workspace_categories';
    const conditions = [];
    const params = [];

    if (active_only === 'true') {
      conditions.push('is_active = TRUE');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Validate order_by to prevent SQL injection
    const validOrderFields = ['display_order', 'name', 'created_at', 'updated_at'];
    const orderField = validOrderFields.includes(order_by) ? order_by : 'display_order';
    query += ` ORDER BY ${orderField}`;

    const result = await db.pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/categories/:id - Get single category
// ============================================================================

router.get('/:id', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { id } = req.params;
    const db = getDbClient();
    await db.init();

    const result = await db.pool.query(
      'SELECT * FROM workspace_categories WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category',
      message: error.message,
    });
  }
});

// ============================================================================
// POST /api/categories - Create new category
// ============================================================================

router.post('/', createValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const {
      name,
      description = null,
      color = '#6B7280',
      icon = null,
      display_order = 0,
      is_active = true,
      created_by = 'api-user',
    } = req.body;

    const db = getDbClient();
    await db.init();

    // Check if category name already exists
    const existingCategory = await db.pool.query(
      'SELECT id FROM workspace_categories WHERE name = $1',
      [name]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Category with this name already exists',
      });
    }

    const result = await db.pool.query(
      `INSERT INTO workspace_categories
       (name, description, color, icon, display_order, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, color, icon, display_order, is_active, created_by]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Category created successfully',
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      message: error.message,
    });
  }
});

// ============================================================================
// PUT /api/categories/:id - Update category
// ============================================================================

router.put('/:id', updateValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { id } = req.params;
    const updates = req.body;

    const db = getDbClient();
    await db.init();

    // Check if category exists
    const existing = await db.pool.query(
      'SELECT * FROM workspace_categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // If name is being updated, check for duplicates
    if (updates.name && updates.name !== existing.rows[0].name) {
      const duplicate = await db.pool.query(
        'SELECT id FROM workspace_categories WHERE name = $1 AND id != $2',
        [updates.name, id]
      );

      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Category with this name already exists',
        });
      }
    }

    // Build dynamic UPDATE query
    const fields = Object.keys(updates);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(', ');
    const values = fields.map((field) => updates[field]);

    const result = await db.pool.query(
      `UPDATE workspace_categories
       SET ${setClause}
       WHERE id = $1
       RETURNING *`,
      [id, ...values]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category',
      message: error.message,
    });
  }
});

// ============================================================================
// DELETE /api/categories/:id - Delete category
// ============================================================================

router.delete('/:id', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { id } = req.params;
    const db = getDbClient();
    await db.init();

    // Check if category exists
    const existing = await db.pool.query(
      'SELECT name FROM workspace_categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    const categoryName = existing.rows[0].name;

    // Check if category is in use
    const inUse = await db.pool.query(
      'SELECT COUNT(*) as count FROM workspace_items WHERE category = $1',
      [categoryName]
    );

    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete category that is in use',
        message: `Category "${categoryName}" is used by ${inUse.rows[0].count} items`,
      });
    }

    await db.pool.query(
      'DELETE FROM workspace_categories WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category',
      message: error.message,
    });
  }
});

// ============================================================================
// PATCH /api/categories/:id/toggle - Toggle category active status
// ============================================================================

router.patch('/:id/toggle', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { id } = req.params;
    const db = getDbClient();
    await db.init();

    const result = await db.pool.query(
      `UPDATE workspace_categories
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `Category ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle category',
      message: error.message,
    });
  }
});

export default router;
