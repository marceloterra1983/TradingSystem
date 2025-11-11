/**
 * Centralized Express Middleware
 *
 * Unified middleware configurations for all TradingSystem services.
 * Includes CORS, rate limiting, security headers (Helmet), and error handling.
 *
 * Usage:
 *   import { configureCors, configureRateLimit, configureHelmet } from '@backend/shared/middleware';
 *
 *   app.use(configureCors());
 *   app.use(configureRateLimit());
 *   app.use(configureHelmet());
 */

import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * Configure CORS middleware
 *
 * Reads from environment variables:
 * - CORS_ORIGIN: Comma-separated list of allowed origins or '*' for all
 * - DISABLE_CORS: Set to 'true' to disable CORS (unified domain mode)
 *
 * @param {object} options - Override options
 * @param {string|string[]} options.origin - Override allowed origins
 * @param {boolean} options.credentials - Enable credentials (default: true)
 * @param {object} options.logger - Logger instance for informational logging
 * @returns {Function} Express middleware function
 */
export function configureCors(options = {}) {
  const {
    origin,
    credentials = true,
    logger,
  } = options;

  // Check if CORS should be disabled
  const disableCors = process.env.DISABLE_CORS === 'true';

  if (disableCors) {
    logger?.info('CORS disabled - Using unified domain mode');
    return (_req, _res, next) => next(); // No-op middleware
  }

  // Determine allowed origins
  let allowedOrigins;

  if (origin) {
    // Use provided override
    allowedOrigins = Array.isArray(origin) ? origin : [origin];
  } else {
    // Read from environment
    const registryDefaults = [
      process.env.DASHBOARD_GATEWAY_URL,
      process.env.DASHBOARD_URL,
      process.env.DOCUMENTATION_HUB_URL,
      process.env.DOCUMENTATION_API_URL,
    ].filter(Boolean);

    const defaultOriginHost = process.env.PORT_GOVERNANCE_DEFAULT_HOST || 'localhost';
    const legacyFallbackOrigins = [9080, 3400, 3401]
      .map((port) => `http://${defaultOriginHost}:${port}`)
      .join(',');

    const rawCorsOrigin = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim() !== ''
      ? process.env.CORS_ORIGIN
      : registryDefaults.join(',') || legacyFallbackOrigins;

    if (rawCorsOrigin === '*') {
      allowedOrigins = undefined; // Allow all origins
    } else {
      allowedOrigins = rawCorsOrigin
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
    }
  }

  const corsOptions = allowedOrigins
    ? { origin: allowedOrigins, credentials }
    : { origin: true, credentials }; // Allow all if undefined

  logger?.info({ allowedOrigins: allowedOrigins || '*' }, 'CORS configured');

  return cors(corsOptions);
}

/**
 * Configure rate limiting middleware
 *
 * Reads from environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 60000 = 1 minute)
 * - RATE_LIMIT_MAX: Maximum requests per window (default: 120)
 *
 * @param {object} options - Override options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Custom rate limit message
 * @param {boolean} options.standardHeaders - Include rate limit headers (default: true)
 * @param {boolean} options.legacyHeaders - Include legacy X-RateLimit-* headers (default: false)
 * @param {object} options.logger - Logger instance for logging rate limit hits
 * @returns {Function} Express middleware function
 */
export function configureRateLimit(options = {}) {
  const {
    windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max = Number(process.env.RATE_LIMIT_MAX || 120),
    message = 'Too many requests from this IP, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    logger,
  } = options;

  const limiter = rateLimit({
    windowMs,
    max,
    message,
    standardHeaders,
    legacyHeaders,
    handler: (req, res) => {
      logger?.warn({
        ip: req.ip,
        path: req.path,
        method: req.method,
      }, 'Rate limit exceeded');

      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message,
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  });

  logger?.info({ windowMs, max }, 'Rate limiting configured');

  return limiter;
}

/**
 * Create strict rate limiter for specific endpoints
 * Useful for expensive operations (sync, delete, etc.)
 *
 * @param {object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000)
 * @param {number} options.max - Maximum requests per window (default: 10)
 * @param {object} options.logger - Logger instance
 * @returns {Function} Express middleware function
 */
export function createStrictRateLimit(options = {}) {
  const {
    windowMs = 60_000,
    max = 10,
    logger,
  } = options;

  return configureRateLimit({
    windowMs,
    max,
    message: 'Too many requests to this endpoint, please try again later.',
    logger,
  });
}

/**
 * Configure Helmet security headers
 *
 * Provides sensible defaults for TradingSystem services.
 * Disables problematic policies that interfere with local development.
 *
 * @param {object} options - Override Helmet options
 * @param {boolean} options.crossOriginResourcePolicy - Enable CORP (default: false for local dev)
 * @param {boolean} options.crossOriginEmbedderPolicy - Enable COEP (default: false for local dev)
 * @param {object} options.contentSecurityPolicy - Custom CSP directives
 * @param {object} options.logger - Logger instance
 * @returns {Function} Express middleware function
 */
export function configureHelmet(options = {}) {
  const {
    crossOriginResourcePolicy = false,
    crossOriginEmbedderPolicy = false,
    contentSecurityPolicy,
    logger,
  } = options;

  const helmetOptions = {
    crossOriginResourcePolicy,
    crossOriginEmbedderPolicy,
  };

  // Add CSP if provided
  if (contentSecurityPolicy) {
    helmetOptions.contentSecurityPolicy = contentSecurityPolicy;
  }

  logger?.info('Helmet security headers configured');

  return helmet(helmetOptions);
}

/**
 * Global error handler middleware
 * Should be added LAST after all routes
 *
 * @param {object} options - Error handler options
 * @param {object} options.logger - Logger instance (required)
 * @param {boolean} options.includeStack - Include stack trace in response (default: false in production)
 * @returns {Function} Express error handling middleware
 */
export function createErrorHandler(options = {}) {
  const {
    logger,
    includeStack = process.env.NODE_ENV !== 'production',
  } = options;

  if (!logger) {
    throw new Error('Logger is required for error handler');
  }

  return (err, req, res, _next) => {
    // Log error with context
    logger.errorWithContext(err, {
      method: req.method,
      url: req.url,
      correlationId: req.id || req.headers['x-correlation-id'],
      userId: req.user?.id,
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Build error response
    const errorResponse = {
      success: false,
      error: err.name || 'InternalServerError',
      message: err.message || 'Internal server error',
    };

    // Include stack trace in development
    if (includeStack && err.stack) {
      errorResponse.stack = err.stack.split('\n');
    }

    // Include validation errors if present
    if (err.errors) {
      errorResponse.errors = err.errors;
    }

    res.status(statusCode).json(errorResponse);
  };
}

/**
 * 404 Not Found handler
 * Should be added BEFORE error handler
 *
 * @param {object} options - Not found handler options
 * @param {object} options.logger - Logger instance
 * @returns {Function} Express middleware function
 */
export function createNotFoundHandler(options = {}) {
  const { logger } = options;

  return (req, res) => {
    logger?.warn({
      method: req.method,
      url: req.url,
      ip: req.ip,
    }, `404 Not Found: ${req.method} ${req.url}`);

    res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `Cannot ${req.method} ${req.url}`,
    });
  };
}

/**
 * Request timeout middleware
 * Terminates requests that exceed the specified timeout
 *
 * @param {object} options - Timeout options
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000 = 30s)
 * @param {object} options.logger - Logger instance
 * @returns {Function} Express middleware function
 */
export function createTimeoutHandler(options = {}) {
  const {
    timeout = Number(process.env.REQUEST_TIMEOUT_MS || 30_000),
    logger,
  } = options;

  return (req, res, next) => {
    const timer = setTimeout(() => {
      logger?.error({
        method: req.method,
        url: req.url,
        timeout,
      }, 'Request timeout');

      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'RequestTimeout',
          message: `Request exceeded ${timeout}ms timeout`,
        });
      }
    }, timeout);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timer));

    next();
  };
}

/**
 * Correlation ID middleware
 * Adds unique ID to each request for distributed tracing
 *
 * @param {object} options - Correlation ID options
 * @param {string} options.header - Header name (default: 'x-correlation-id')
 * @param {Function} options.generator - Custom ID generator function
 * @returns {Function} Express middleware function
 */
export function createCorrelationIdMiddleware(options = {}) {
  const {
    header = 'x-correlation-id',
    generator = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  } = options;

  return (req, res, next) => {
    // Use existing correlation ID or generate new one
    const correlationId = req.headers[header] || generator();

    // Attach to request
    req.id = correlationId;

    // Add to response headers
    res.setHeader(header, correlationId);

    next();
  };
}

/**
 * Complete middleware stack configuration
 * Applies all standard middleware in correct order
 *
 * @param {object} app - Express app instance
 * @param {object} options - Configuration options
 * @param {object} options.logger - Logger instance (required)
 * @param {object} options.cors - CORS configuration (optional)
 * @param {object} options.rateLimit - Rate limit configuration (optional)
 * @param {object} options.helmet - Helmet configuration (optional)
 * @param {number} options.timeout - Request timeout in ms (optional)
 * @returns {object} Express app with middleware configured
 */
export function applyStandardMiddleware(app, options = {}) {
  const {
    logger,
    cors: corsOptions,
    rateLimit: rateLimitOptions,
    helmet: helmetOptions,
    timeout,
  } = options;

  if (!logger) {
    throw new Error('Logger is required for standard middleware');
  }

  // 1. Correlation ID (must be first for logging)
  app.use(createCorrelationIdMiddleware());

  // 2. Request timeout
  if (timeout) {
    app.use(createTimeoutHandler({ timeout, logger }));
  }

  // 3. Security headers
  app.use(configureHelmet({ ...helmetOptions, logger }));

  // 4. CORS
  app.use(configureCors({ ...corsOptions, logger }));

  // 5. Rate limiting
  app.use(configureRateLimit({ ...rateLimitOptions, logger }));

  // 6. Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  logger.info('Standard middleware stack applied');

  return app;
}

// CommonJS compatibility
export default {
  configureCors,
  configureRateLimit,
  createStrictRateLimit,
  configureHelmet,
  createErrorHandler,
  createNotFoundHandler,
  createTimeoutHandler,
  createCorrelationIdMiddleware,
  applyStandardMiddleware,
};
