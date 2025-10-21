import { logger } from '../config/logger.js';

const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';

const mapFirecrawlError = (error) => {
  if (error?.response) {
    const status = error.response.status;
    const message =
      error.response.data?.error ||
      error.response.data?.message ||
      `Firecrawl request failed with status ${status}`;
    return { statusCode: status, message, details: error.response.data };
  }

  if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
    return { statusCode: 503, message: 'Firecrawl service unavailable' };
  }

  if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
    return { statusCode: 504, message: 'Firecrawl request timed out' };
  }

  return null;
};

export const errorHandler = (err, req, res, next) => {
  const firecrawlMapping = mapFirecrawlError(err);

  let statusCode =
    firecrawlMapping?.statusCode ||
    err.statusCode ||
    err.status ||
    (err.name === 'ValidationError' ? 400 : undefined) ||
    500;

  let message =
    firecrawlMapping?.message ||
    err.message ||
    (statusCode === 500 ? 'Internal server error' : 'Unexpected error');

  if (err.message?.includes('Validation failed')) {
    statusCode = 400;
    message = 'Validation failed';
  }

  if (err.message?.includes('not found') || err.statusCode === 404) {
    statusCode = 404;
  }

  if (statusCode === 500) {
    message = 'Internal server error';
  }

  logger.error(
    {
      err,
      statusCode,
      message,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    'request failed'
  );

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDevelopment && {
      stack: err.stack,
      details: firecrawlMapping?.details || err.details || err.response?.data
    })
  });
};

export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export const rateLimitHandler = (req, res, next, options) => {
  const retryAfter = Math.ceil(options.windowMs / 1000);

  logger.warn(
    {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      retryAfter
    },
    'rate limit exceeded'
  );

  res.set('Retry-After', retryAfter.toString());
  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter
  });
};
