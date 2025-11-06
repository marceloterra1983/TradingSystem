/**
 * Validation Schemas using Zod
 * 
 * Type-safe runtime validation for Workspace API.
 * Replaces express-validator with Zod for better DX and type safety.
 * 
 * Benefits:
 * - Type inference (automatic TypeScript types)
 * - Composable schemas (reuse common patterns)
 * - Better error messages
 * - Runtime + compile-time validation
 * 
 * @module validation/schemas
 */

import { z } from 'zod';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical'], {
  errorMap: () => ({ message: 'Priority must be one of: low, medium, high, critical' }),
});

export const StatusSchema = z.enum(['new', 'review', 'in-progress', 'completed', 'rejected'], {
  errorMap: () => ({ message: 'Status must be one of: new, review, in-progress, completed, rejected' }),
});

// ============================================================================
// DYNAMIC CATEGORY VALIDATION
// ============================================================================

/**
 * Category validation (dynamic against database)
 * 
 * NOTE: Cannot use z.enum() because categories are dynamic in the database.
 * Instead, we use z.string() with custom validation in the service layer.
 * 
 * The CategoryService validates against active categories in the database.
 */
export const CategorySchema = z.string()
  .trim()
  .min(1, 'Category is required')
  .max(100, 'Category name must be less than 100 characters')
  .regex(/^[a-z0-9-]+$/, 'Category must be lowercase letters, numbers, and hyphens only');

// ============================================================================
// ITEM SCHEMAS
// ============================================================================

/**
 * Schema for creating a new item
 * All fields required except tags
 */
export const CreateItemSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  
  description: z.string()
    .trim()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters'),
  
  category: CategorySchema,
  
  priority: PrioritySchema,
  
  tags: z.array(z.string())
    .optional()
    .default([])
    .refine(
      (tags) => tags.every((tag) => tag.length > 0 && tag.length <= 50),
      { message: 'Each tag must be between 1 and 50 characters' }
    ),
  
  metadata: z.record(z.any())
    .optional()
    .default({}),
});

/**
 * Schema for updating an existing item
 * All fields optional (partial update)
 */
export const UpdateItemSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  
  description: z.string()
    .trim()
    .min(1, 'Description cannot be empty')
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  
  category: CategorySchema.optional(),
  
  priority: PrioritySchema.optional(),
  
  status: StatusSchema.optional(),
  
  tags: z.array(z.string())
    .refine(
      (tags) => tags.every((tag) => tag.length > 0 && tag.length <= 50),
      { message: 'Each tag must be between 1 and 50 characters' }
    )
    .optional(),
  
  metadata: z.record(z.any()).optional(),
}).strict();  // Reject unknown fields

/**
 * Schema for item ID parameter
 */
export const ItemIdSchema = z.string()
  .trim()
  .min(1, 'Item ID is required')
  .or(z.number().int().positive());

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Schema for filtering items
 */
export const FilterItemsSchema = z.object({
  category: CategorySchema.optional(),
  status: StatusSchema.optional(),
  priority: PrioritySchema.optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional().default(100),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
}).strict();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate request body with Zod schema
 * Returns parsed data or throws validation error
 * 
 * @param {z.Schema} schema - Zod schema
 * @param {any} data - Data to validate
 * @returns {Object} Parsed and validated data
 * @throws {z.ZodError} Validation error with details
 */
export const validateRequest = (schema, data) => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Transform Zod errors to user-friendly format
      const issueList = error.issues || error.errors || [];
      const formattedErrors = issueList.map((err) => ({
        field: err.path?.join('.') || 'unknown',
        message: err.message || 'Validation error',
        code: err.code || 'invalid',
      }));
      
      // Create custom error for Express error handler
      const validationError = new Error('Validation failed');
      validationError.statusCode = 400;
      validationError.errors = formattedErrors.length > 0 ? formattedErrors : [{ message: error.message }];
      throw validationError;
    }
    throw error;
  }
};

/**
 * Async middleware wrapper for Zod validation
 * 
 * @param {z.Schema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/', validate(CreateItemSchema), async (req, res) => {
 *   // req.body is now validated and typed
 *   const item = await db.createItem(req.body);
 *   res.json({ success: true, data: item });
 * });
 */
export const validate = (schema) => (req, res, next) => {
  try {
    req.body = validateRequest(schema, req.body);
    next();
  } catch (error) {
    next(error);  // Pass to error handler middleware
  }
};

/**
 * Validate path parameter
 * 
 * @param {string} paramName - Parameter name (e.g., 'id')
 * @param {z.Schema} schema - Zod schema
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/:id', validateParam('id', ItemIdSchema), async (req, res) => {
 *   // req.params.id is validated
 * });
 */
export const validateParam = (paramName, schema) => (req, res, next) => {
  try {
    req.params[paramName] = validateRequest(schema, req.params[paramName]);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate query parameters
 * 
 * @param {z.Schema} schema - Zod schema
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/', validateQuery(FilterItemsSchema), async (req, res) => {
 *   // req.query is validated and coerced
 * });
 */
export const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = validateRequest(schema, req.query);
    next();
  } catch (error) {
    next(error);
  }
};
