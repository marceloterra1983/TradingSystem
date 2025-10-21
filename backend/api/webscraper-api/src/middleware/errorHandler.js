import logger from '../config/logger.js';

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  logger.error({ err }, 'Request error');
  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    statusCode: 404
  });
}

export function rateLimitHandler(_req, res) {
  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later.',
    statusCode: 429
  });
}
