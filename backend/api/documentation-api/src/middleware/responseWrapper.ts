/**
 * API Response Standards Middleware
 *
 * Provides standardized response format for all API endpoints
 * Ensures consistent structure for success and error responses
 *
 * @module middleware/responseWrapper
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Standard API Response Format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
    version: string;
    path: string;
  };
}

/**
 * Paginated Response Format
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Response wrapper middleware
 *
 * Wraps all successful responses in standardized format
 * Adds metadata (timestamp, request ID, version, path)
 */
export const responseWrapper = (req: Request, res: Response, next: NextFunction) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method
  res.json = function(data: any): Response {
    // Check if response is already formatted
    if (data && typeof data === 'object' && data.success !== undefined) {
      return originalJson(data);
    }

    // Wrap response in standard format
    const wrappedResponse: ApiResponse = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (req.headers['x-request-id'] as string) || 'unknown',
        version: 'v1',
        path: req.path
      }
    };

    return originalJson(wrappedResponse);
  };

  next();
};

/**
 * Helper function to send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || 'unknown',
      version: 'v1',
      path: res.locals.path || ''
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Helper function to send paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): Response => {
  const totalPages = Math.ceil(total / limit);

  const paginatedResponse: ApiResponse<PaginatedResponse<T>> = {
    success: true,
    data: {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || 'unknown',
      version: 'v1',
      path: res.locals.path || ''
    }
  };

  return res.status(200).json(paginatedResponse);
};

/**
 * Helper function to send error response
 */
export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): Response => {
  const errorResponse: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || 'unknown',
      version: 'v1',
      path: res.locals.path || ''
    }
  };

  return res.status(statusCode).json(errorResponse);
};
