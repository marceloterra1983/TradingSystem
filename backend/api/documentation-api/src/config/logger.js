import pino from 'pino';
import { hostname } from 'node:os';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Create logger instance with conditional pretty printing
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  base: {
    pid: process.pid,
    hostname: hostname(),
    service: 'documentation-api',
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },

  // Pretty print only in development (production uses JSON for log aggregation)
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '{service} [{level}] {msg}',
        },
      }
    : undefined,

  // Silence logs in test environment
  enabled: !isTest,

  // Redact sensitive fields for security
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'password',
      'token',
      'secret',
      'apiKey',
    ],
    censor: '[REDACTED]',
  },
});

/**
 * Create child logger with additional context
 * @param {Object} bindings - Context to include in all logs
 * @returns {pino.Logger} Child logger
 */
logger.createRequestLogger = (bindings) => {
  return logger.child(bindings);
};

/**
 * Log HTTP request with timing
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {number} responseTime - Response time in ms
 */
logger.logRequest = (req, res, responseTime) => {
  const log = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection?.remoteAddress,
  };

  if (res.statusCode >= 500) {
    logger.error(log, 'HTTP request - server error');
  } else if (res.statusCode >= 400) {
    logger.warn(log, 'HTTP request - client error');
  } else {
    logger.info(log, 'HTTP request');
  }
};

/**
 * Log external service call
 * @param {string} service - Service name
 * @param {string} operation - Operation/endpoint
 * @param {number} duration - Duration in ms
 * @param {boolean} success - Call succeeded
 * @param {Object} metadata - Additional data
 */
logger.logServiceCall = (service, operation, duration, success, metadata = {}) => {
  const log = {
    service,
    operation,
    duration: `${duration}ms`,
    success,
    ...metadata,
  };

  if (success) {
    logger.info(log, `External service call - ${service}`);
  } else {
    logger.error(log, `External service call failed - ${service}`);
  }
};

/**
 * Log performance metric
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in ms
 * @param {Object} metadata - Additional data
 */
logger.logPerformance = (operation, duration, metadata = {}) => {
  logger.debug(
    {
      operation,
      duration: `${duration}ms`,
      ...metadata,
    },
    `Performance - ${operation}`,
  );
};

export default logger;