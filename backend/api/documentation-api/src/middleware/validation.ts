/**
 * Input Validation Middleware
 *
 * Provides request validation using Zod schemas
 * Validates body, query, and params
 *
 * @module middleware/validation
 */

import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema } from "zod";
import { sendError } from "./responseWrapper";

/**
 * Validation target
 */
export type ValidationTarget = "body" | "query" | "params" | "all";

/**
 * Validation schema structure
 */
export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validation middleware factory
 *
 * Creates middleware that validates request data against Zod schemas
 *
 * @param schemas - Zod schemas for body, query, and/or params
 *
 * @example
 * const createUserSchema = {
 *   body: z.object({
 *     email: z.string().email(),
 *     name: z.string().min(2).max(50),
 *     password: z.string().min(8)
 *   })
 * };
 *
 * app.post('/users', validate(createUserSchema), (req, res) => {
 *   // req.body is now type-safe and validated
 * });
 */
export const validate = (schemas: ValidationSchemas) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> => {
    try {
      // Validate body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      // Validate query
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      // Validate params
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(
          res,
          "VALIDATION_ERROR",
          "Request validation failed",
          400,
          {
            errors: error.errors.map((err) => ({
              path: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
          },
        );
      }

      // Unexpected error
      return sendError(
        res,
        "VALIDATION_ERROR",
        "An unexpected validation error occurred",
        500,
      );
    }
  };
};

/**
 * Common validation schemas
 */

// MongoDB ObjectId
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

// UUID
export const uuidSchema = z.string().uuid("Invalid UUID format");

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Date range
export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "startDate must be before or equal to endDate",
    },
  );

/**
 * RAG-specific validation schemas
 */

// Query request
export const ragQuerySchema = {
  body: z.object({
    query: z.string().min(1, "Query is required").max(1000, "Query too long"),
    collection: z.string().optional(),
    topK: z.number().int().min(1).max(20).default(5),
    filters: z.record(z.any()).optional(),
  }),
};

// Ingestion request
export const ragIngestionSchema = {
  body: z.object({
    directory: z.string().min(1, "Directory path is required"),
    collection: z.string().min(1, "Collection name is required"),
    chunkSize: z.number().int().min(256).max(2048).optional(),
    chunkOverlap: z.number().int().min(0).max(512).optional(),
    recursive: z.boolean().default(true),
    fileTypes: z.array(z.enum(["md", "mdx", "txt", "pdf"])).optional(),
  }),
};

// Collection create/update
export const collectionSchema = {
  body: z.object({
    name: z
      .string()
      .min(1)
      .max(100)
      .regex(
        /^[a-z0-9_-]+$/,
        "Name must be lowercase alphanumeric with dashes or underscores",
      ),
    description: z.string().max(500).optional(),
    embeddingModel: z
      .enum(["nomic-embed-text", "mxbai-embed-large"])
      .default("nomic-embed-text"),
    vectorDimension: z.number().int().min(128).max(1536).optional(),
  }),
};

// Job status query
export const jobStatusSchema = {
  params: z.object({
    jobId: z.string().regex(/^[a-z-]+\d{8}-\d{6}$/, "Invalid job ID format"),
  }),
};

// File upload
export const fileUploadSchema = {
  body: z.object({
    fileName: z.string().min(1).max(255),
    fileSize: z
      .number()
      .int()
      .min(1)
      .max(10 * 1024 * 1024), // Max 10MB
    mimeType: z.enum(["text/plain", "text/markdown", "application/pdf"]),
  }),
};

/**
 * Custom validation helpers
 */

/**
 * Validate email format
 */
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .toLowerCase();

/**
 * Validate password strength
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password too long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character",
  );

/**
 * Validate URL format
 */
export const urlSchema = z.string().url("Invalid URL format");

/**
 * Sanitize string input (prevent XSS)
 */
export const sanitizeString = (maxLength: number = 1000) => {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((str) => {
      // Remove potential XSS patterns
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
    });
};

/**
 * Validate array with min/max length
 */
export const arraySchema = <T extends ZodSchema>(
  itemSchema: T,
  min: number = 0,
  max: number = 100,
) => {
  return z.array(itemSchema).min(min).max(max);
};

/**
 * Example usage in routes:
 *
 * import { validate, ragQuerySchema } from './middleware/validation';
 *
 * app.post('/api/v1/rag/query', validate(ragQuerySchema), async (req, res) => {
 *   const { query, topK } = req.body; // Type-safe and validated
 *   // ... handle request
 * });
 */
