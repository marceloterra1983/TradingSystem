import { body, param, query, validationResult } from "express-validator";
import { logger } from "../config/logger.js";

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    logger.warn("Validation errors", {
      url: req.url,
      method: req.method,
      errors: errorMessages,
    });

    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errorMessages,
    });
  }

  next();
};

/**
 * Validation chains for different endpoints
 */
export const validation = {
  // System validations
  createSystem: [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ max: 255 })
      .withMessage("Name must be less than 255 characters"),

    body("type")
      .isIn(["api", "webapp", "docs", "tool"])
      .withMessage("Type must be one of: api, webapp, docs, tool"),

    body("description")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Description must be less than 1000 characters"),

    body("url")
      .optional()
      .isURL({ protocols: ["http", "https"] })
      .withMessage("URL must be a valid HTTP/HTTPS URL"),

    body("owner")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Owner must be less than 100 characters"),

    body("tags").optional().isArray().withMessage("Tags must be an array"),

    body("tags.*")
      .optional()
      .isLength({ max: 50 })
      .withMessage("Each tag must be less than 50 characters"),

    body("metadata")
      .optional()
      .isObject()
      .withMessage("Metadata must be an object"),
  ],

  updateSystem: [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Name cannot be empty")
      .isLength({ max: 255 })
      .withMessage("Name must be less than 255 characters"),

    body("type")
      .optional()
      .isIn(["api", "webapp", "docs", "tool"])
      .withMessage("Type must be one of: api, webapp, docs, tool"),

    body("description")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Description must be less than 1000 characters"),

    body("url")
      .optional()
      .isURL({ protocols: ["http", "https"] })
      .withMessage("URL must be a valid HTTP/HTTPS URL"),

    body("status")
      .optional()
      .isIn(["online", "offline", "error", "unknown"])
      .withMessage("Status must be one of: online, offline, error, unknown"),

    body("owner")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Owner must be less than 100 characters"),

    body("tags").optional().isArray().withMessage("Tags must be an array"),

    body("tags.*")
      .optional()
      .isLength({ max: 50 })
      .withMessage("Each tag must be less than 50 characters"),

    body("metadata")
      .optional()
      .isObject()
      .withMessage("Metadata must be an object"),
  ],

  // Idea validations
  createIdea: [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ max: 255 })
      .withMessage("Title must be less than 255 characters"),

    body("description")
      .optional()
      .isLength({ max: 2000 })
      .withMessage("Description must be less than 2000 characters"),

    body("category")
      .isIn(["new_feature", "improvement", "bug_fix", "content", "structure"])
      .withMessage(
        "Category must be one of: new_feature, improvement, bug_fix, content, structure",
      ),

    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be one of: low, medium, high, urgent"),

    body("status")
      .optional()
      .isIn(["backlog", "todo", "in_progress", "review", "done"])
      .withMessage(
        "Status must be one of: backlog, todo, in_progress, review, done",
      ),

    body("assigned_to")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Assigned to must be less than 100 characters"),

    body("system_id")
      .optional()
      .isUUID()
      .withMessage("System ID must be a valid UUID"),

    body("tags").optional().isArray().withMessage("Tags must be an array"),

    body("tags.*")
      .optional()
      .isLength({ max: 50 })
      .withMessage("Each tag must be less than 50 characters"),

    body("estimated_hours")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Estimated hours must be between 1 and 1000"),

    body("actual_hours")
      .optional()
      .isInt({ min: 0, max: 10000 })
      .withMessage("Actual hours must be between 0 and 10000"),

    body("due_date")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid ISO 8601 date"),
  ],

  updateIdea: [
    body("title")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Title cannot be empty")
      .isLength({ max: 255 })
      .withMessage("Title must be less than 255 characters"),

    body("description")
      .optional()
      .isLength({ max: 2000 })
      .withMessage("Description must be less than 2000 characters"),

    body("category")
      .optional()
      .isIn(["new_feature", "improvement", "bug_fix", "content", "structure"])
      .withMessage(
        "Category must be one of: new_feature, improvement, bug_fix, content, structure",
      ),

    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be one of: low, medium, high, urgent"),

    body("status")
      .optional()
      .isIn(["backlog", "todo", "in_progress", "review", "done"])
      .withMessage(
        "Status must be one of: backlog, todo, in_progress, review, done",
      ),

    body("assigned_to")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Assigned to must be less than 100 characters"),

    body("system_id")
      .optional()
      .isUUID()
      .withMessage("System ID must be a valid UUID"),

    body("tags").optional().isArray().withMessage("Tags must be an array"),

    body("tags.*")
      .optional()
      .isLength({ max: 50 })
      .withMessage("Each tag must be less than 50 characters"),

    body("estimated_hours")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Estimated hours must be between 1 and 1000"),

    body("actual_hours")
      .optional()
      .isInt({ min: 0, max: 10000 })
      .withMessage("Actual hours must be between 0 and 10000"),

    body("due_date")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid ISO 8601 date"),
  ],

  // File validations
  uploadFile: [
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),

    body("idea_id")
      .optional()
      .isUUID()
      .withMessage("Idea ID must be a valid UUID"),

    body("system_id")
      .optional()
      .isUUID()
      .withMessage("System ID must be a valid UUID"),

    body("is_public")
      .optional()
      .isBoolean()
      .withMessage("Is public must be a boolean"),
  ],

  updateFile: [
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),

    body("idea_id")
      .optional()
      .isUUID()
      .withMessage("Idea ID must be a valid UUID"),

    body("system_id")
      .optional()
      .isUUID()
      .withMessage("System ID must be a valid UUID"),

    body("is_public")
      .optional()
      .isBoolean()
      .withMessage("Is public must be a boolean"),
  ],

  // Common ID validation
  uuid: [param("id").isUUID().withMessage("ID must be a valid UUID")],

  // Query parameter validations
  listQuery: [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),

    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Offset must be non-negative"),

    query("status")
      .optional()
      .isAlpha()
      .withMessage("Status must contain only letters"),

    query("type")
      .optional()
      .isAlpha()
      .withMessage("Type must contain only letters"),

    query("category")
      .optional()
      .isAlpha()
      .withMessage("Category must contain only letters"),

    query("priority")
      .optional()
      .isAlpha()
      .withMessage("Priority must contain only letters"),

    query("search")
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage("Search query must be between 2 and 100 characters"),

    query("order_by")
      .optional()
      .isIn(["created_at", "updated_at", "name", "title", "priority", "status"])
      .withMessage("Invalid order field"),

    query("order_direction")
      .optional()
      .isIn(["ASC", "DESC"])
      .withMessage("Order direction must be ASC or DESC"),
  ],
};

/**
 * Custom validation middleware for file uploads
 */
export const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded",
    });
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: "File size exceeds 10MB limit",
    });
  }

  // Check allowed MIME types
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/json",
    "application/xml",
    "text/xml",
  ];

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: "File type not allowed",
    });
  }

  next();
};

/**
 * Validate that either idea_id or system_id is provided (but not both)
 */
export const validateFileAssociation = (req, res, next) => {
  const { idea_id, system_id } = req.body;

  if (!idea_id && !system_id) {
    return res.status(400).json({
      success: false,
      error: "Either idea_id or system_id must be provided",
    });
  }

  if (idea_id && system_id) {
    return res.status(400).json({
      success: false,
      error: "Cannot associate file with both idea and system",
    });
  }

  next();
};
