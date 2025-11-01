/**
 * Centralized Error Handling Middleware
 *
 * Provides consistent error handling across all API endpoints
 * Supports custom error classes and automatic error logging
 *
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger, logError } from '../utils/logger';
import { ApiResponse } from './responseWrapper';

/**
 * Custom Application Error class
 *
 * @example
 * throw new AppError(404, 'User not found', 'USER_NOT_FOUND', { userId: '123' });
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code: string,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);

    // Maintains proper stack trace for where error was thrown
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error classes
 */

export class BadRequestError extends AppError {
  constructor(message: string, code: string = 'BAD_REQUEST', details?: any) {
    super(400, message, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED', details?: any) {
    super(401, message, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN', details?: any) {
    super(403, message, code, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code: string = 'NOT_FOUND', details?: any) {
    super(404, message, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string = 'CONFLICT', details?: any) {
    super(409, message, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(500, message, 'INTERNAL_SERVER_ERROR', details, false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string, details?: any) {
    super(503, message, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * RAG-specific errors
 */

export class RagQueryError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, 'RAG_QUERY_ERROR', details);
  }
}

export class IngestionError extends AppError {
  constructor(message: string, details?: any) {
    super(500, message, 'INGESTION_ERROR', details);
  }
}

export class CollectionNotFoundError extends NotFoundError {
  constructor(collectionName: string) {
    super(`Collection '${collectionName}' not found`, 'COLLECTION_NOT_FOUND', { collectionName });
  }
}

export class JobNotFoundError extends NotFoundError {
  constructor(jobId: string) {
    super(`Job '${jobId}' not found`, 'JOB_NOT_FOUND', { jobId });
  }
}

export class CircuitBreakerOpenError extends ServiceUnavailableError {
  constructor(service: string) {
    super(`Service '${service}' is temporarily unavailable`, { service, reason: 'circuit_breaker_open' });
  }
}

/**
 * Main error handling middleware
 *
 * Catches all errors thrown in route handlers and middleware
 * Formats errors consistently and logs them appropriately
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  // Default error values
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle custom AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;

    // Log operational errors as warnings, programming errors as errors
    if (err.isOperational) {
      logger.warn('Operational error', {
        requestId: req.headers['x-request-id'],
        method: req.method,
        path: req.path,
        statusCode,
        errorCode,
        message,
        details,
      });
    } else {
      logError(err, {
        requestId: req.headers['x-request-id'],
        method: req.method,
        path: req.path,
        statusCode,
        errorCode,
      });
    }
  }
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = {
      errors: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    };

    logger.warn('Validation error', {
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
      details,
    });
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';

    logger.warn('JWT error', {
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
      error: err.message,
    });
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';

    logger.warn('Token expired', {
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
    });
  }
  // Handle MongoDB/Mongoose errors
  else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid ID format';
  }
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
  }
  else if (err.name === 'MongoError' && (err as any).code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY';
    message = 'Resource already exists';
  }
  // Handle all other errors
  else {
    // Log unexpected errors
    logError(err, {
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Hide error details in production
    if (process.env.NODE_ENV === 'production') {
      message = 'An unexpected error occurred';
    } else {
      message = err.message;
      details = {
        stack: err.stack,
        name: err.name,
      };
    }
  }

  // Send error response
  const errorResponse: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
      version: 'v1',
      path: req.path,
    },
  };

  return res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 *
 * Catches all requests to undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): Response => {
  const errorResponse: ApiResponse = {
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
      version: 'v1',
      path: req.path,
    },
  };

  logger.warn('Route not found', {
    requestId: req.headers['x-request-id'],
    method: req.method,
    path: req.path,
  });

  return res.status(404).json(errorResponse);
};

/**
 * Async error wrapper
 *
 * Wraps async route handlers to catch Promise rejections
 *
 * @example
 * app.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Example usage:
 *
 * import {
 *   errorHandler,
 *   notFoundHandler,
 *   asyncHandler,
 *   AppError,
 *   NotFoundError,
 *   ValidationError
 * } from './middleware/errorHandler';
 *
 * // In route handler
 * app.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await User.findById(req.params.id);
 *
 *   if (!user) {
 *     throw new NotFoundError('User not found', 'USER_NOT_FOUND', { id: req.params.id });
 *   }
 *
 *   res.json(user);
 * }));
 *
 * // Add error handlers at the end of middleware chain
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 */
