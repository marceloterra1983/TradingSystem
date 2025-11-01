/**
 * Error Handler Middleware
 *
 * Centralized error handling for all routes
 * Converts errors to standardized API responses
 *
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from './responseWrapper';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response | void => {
  // Default error values
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details = undefined;

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else {
    message = err.message || message;
  }

  // Log error
  logger.error('Request error', {
    code,
    message,
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
    details,
  });

  return sendError(res, code, message, statusCode, details);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
): Response => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
  });

  return sendError(
    res,
    'NOT_FOUND',
    `Route ${req.method} ${req.path} not found`,
    404,
  );
};
