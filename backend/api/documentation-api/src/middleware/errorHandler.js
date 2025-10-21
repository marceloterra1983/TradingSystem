import { logger } from '../config/logger.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('API Error', {
    error: error.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // QuestDB connection error
  if (error.message.includes('ECONNREFUSED') || error.message.includes('QuestDB')) {
    error.message = 'Database connection error';
    error.statusCode = 503;
  }

  // Validation error
  if (error.message.includes('Validation failed')) {
    error.statusCode = 400;
  }

  // Not found error
  if (error.message.includes('not found')) {
    error.statusCode = 404;
  }

  // Conflict error
  if (error.message.includes('already exists')) {
    error.statusCode = 409;
  }

  // Unauthorized error
  if (error.message.includes('Unauthorized') || error.message.includes('Access denied')) {
    error.statusCode = 401;
  }

  // Forbidden error
  if (error.message.includes('Forbidden')) {
    error.statusCode = 403;
  }

  // Bad request error
  if (error.message.includes('Bad Request') || error.message.includes('Invalid')) {
    error.statusCode = 400;
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: error
    })
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.url}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async error wrapper for routes
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Rate limit error handler
 */
export const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent')
  });

  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter: 60 // seconds
  });
};

/**
 * Malformed request handler
 */
export const malformedRequestHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('Malformed JSON request', {
      error: err.message,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Malformed JSON request',
      details: 'Invalid JSON format in request body'
    });
  }

  next(err);
};

/**
 * CORS error handler
 */
export const corsErrorHandler = (err, req, res, next) => {
  if (err.message.includes('CORS')) {
    logger.warn('CORS error', {
      error: err.message,
      origin: req.get('Origin'),
      url: req.url,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      details: 'Cross-origin request not allowed'
    });
  }

  next(err);
};

/**
 * File upload error handler
 */
export const fileUploadErrorHandler = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size too large',
      details: `Maximum file size is ${err.limit} bytes`
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many files',
      details: `Maximum ${err.limit} files allowed`
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field',
      details: 'File field name not expected'
    });
  }

  if (err.code === 'LIMIT_PART_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many parts',
      details: 'Request contains too many form parts'
    });
  }

  if (err.code === 'LIMIT_FIELD_KEY') {
    return res.status(400).json({
      success: false,
      error: 'Field name too long',
      details: 'Form field name exceeds maximum length'
    });
  }

  if (err.code === 'LIMIT_FIELD_VALUE') {
    return res.status(400).json({
      success: false,
      error: 'Field value too long',
      details: 'Form field value exceeds maximum length'
    });
  }

  if (err.code === 'LIMIT_FIELD_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many fields',
      details: 'Form contains too many fields'
    });
  }

  next(err);
};
