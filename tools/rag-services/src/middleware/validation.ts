/**
 * Validation Middleware
 *
 * Request validation using Zod schemas
 * Validates request body, params, and query parameters
 *
 * @module middleware/validation
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from './responseWrapper';
import { logger } from '../utils/logger';

/**
 * Validation schemas for different parts of the request
 */
export interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Validation middleware
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

      // Validate params
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      // Validate query
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors: error.errors,
        });

        return sendError(
          res,
          'VALIDATION_ERROR',
          'Request validation failed',
          400,
          error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        );
      }

      // Unexpected error during validation
      logger.error('Validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return sendError(
        res,
        'VALIDATION_ERROR',
        'An error occurred during request validation',
        500,
      );
    }
  };
};
