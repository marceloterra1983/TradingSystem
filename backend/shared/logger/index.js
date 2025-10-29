/**
 * Centralized Logger Factory (Pino)
 *
 * Unified logger implementation combining best practices from all services.
 * Supports both CommonJS and ESM imports.
 *
 * Features:
 * - Environment-based configuration (LOG_LEVEL, NODE_ENV)
 * - Pretty printing for development, JSON for production
 * - Structured logging with base fields (service, pid, hostname)
 * - Semantic helper methods (startup, healthCheck, request, etc.)
 * - Correlation ID support for distributed tracing
 *
 * Usage:
 *   // ESM
 *   import { createLogger } from '@backend/shared/logger';
 *   const logger = createLogger('my-service');
 *
 *   // CommonJS
 *   const { createLogger } = require('@backend/shared/logger');
 *   const logger = createLogger('my-service');
 */

import pino from 'pino';
import { hostname } from 'node:os';

/**
 * Get log level from environment with validation
 * Priority: {SERVICE}_LOG_LEVEL > LOG_LEVEL > 'info'
 */
function getLogLevel(serviceName = '') {
  const serviceEnvKey = `${serviceName.toUpperCase().replace(/-/g, '_')}_LOG_LEVEL`;
  const level = process.env[serviceEnvKey] || process.env.LOG_LEVEL || 'info';

  const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  return validLevels.includes(level.toLowerCase()) ? level.toLowerCase() : 'info';
}

/**
 * Determine if pretty printing should be used
 * - Development: Use pino-pretty for human-readable logs
 * - Production: Use JSON for machine parsing (log aggregation tools)
 */
function shouldUsePretty() {
  const env = process.env.NODE_ENV || 'development';
  const forcePretty = process.env.PRETTY_LOGS === 'true';
  const forceJson = process.env.PRETTY_LOGS === 'false';

  if (forceJson) return false;
  if (forcePretty) return true;
  return env === 'development';
}

/**
 * Create a configured Pino logger instance
 *
 * @param {string} serviceName - Name of the service (e.g., 'workspace-api', 'tp-capital')
 * @param {object} options - Additional logger options
 * @param {object} options.base - Additional base fields (merged with defaults)
 * @param {string} options.level - Override log level
 * @param {boolean} options.enableHelpers - Enable semantic helper methods (default: true)
 * @returns {pino.Logger} Configured Pino logger instance
 */
export function createLogger(serviceName, options = {}) {
  const {
    base = {},
    level,
    enableHelpers = true,
  } = options;

  const config = {
    level: level || getLogLevel(serviceName),
    name: serviceName,
    base: {
      service: serviceName,
      pid: process.pid,
      hostname: hostname(),
      ...base,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  // Add pretty printing transport for development
  if (shouldUsePretty()) {
    config.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '[{service}] {msg}',
        singleLine: false,
      },
    };
  }

  const logger = pino(config);

  // Add semantic helper methods if enabled
  if (enableHelpers) {
    addHelperMethods(logger);
  }

  return logger;
}

/**
 * Add semantic helper methods to logger instance
 * These provide domain-specific logging patterns used across services
 */
function addHelperMethods(logger) {
  /**
   * Log service startup information
   */
  logger.startup = function(message, meta = {}) {
    this.info({ ...meta, event: 'startup' }, message);
  };

  /**
   * Log health check events
   */
  logger.healthCheck = function(serviceId, status, latencyMs, meta = {}) {
    const level = status === 'ok' ? 'debug' : status === 'degraded' ? 'warn' : 'error';
    this[level]({
      serviceId,
      status,
      latencyMs,
      ...meta,
      event: 'health_check',
    }, `Health check: ${serviceId} = ${status}`);
  };

  /**
   * Log service launch events
   */
  logger.launch = function(serviceName, workingDir, method, meta = {}) {
    this.info({
      serviceName,
      workingDir,
      method,
      ...meta,
      event: 'service_launch',
    }, `Launching service: ${serviceName}`);
  };

  /**
   * Log HTTP requests (for middleware integration)
   */
  logger.request = function(req, res, duration, meta = {}) {
    this.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      correlationId: req.id || req.headers['x-correlation-id'],
      ...meta,
      event: 'http_request',
    }, `${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  };

  /**
   * Log aggregated status checks
   */
  logger.statusCheck = function(overallStatus, totalServices, degradedCount, downCount, avgLatency, meta = {}) {
    const level = overallStatus === 'ok' ? 'info' : overallStatus === 'degraded' ? 'warn' : 'error';
    this[level]({
      overallStatus,
      totalServices,
      degradedCount,
      downCount,
      averageLatencyMs: avgLatency,
      ...meta,
      event: 'status_aggregation',
    }, `Status check: ${overallStatus} (${degradedCount}/${totalServices} degraded, ${downCount} down)`);
  };

  /**
   * Log comprehensive health check events
   */
  logger.healthCheckFull = function(status, cacheHit, durationMs, meta = {}) {
    let level = 'info';
    if (status === 'degraded') {
      level = 'warn';
    } else if (status === 'critical') {
      level = 'error';
    }

    const cacheState = cacheHit ? 'hit' : 'miss';
    const roundedDuration = Math.round(durationMs || 0);

    this[level]({
      status,
      cacheHit,
      durationMs: roundedDuration,
      ...meta,
      event: 'health_check_full',
    }, `Comprehensive health check: ${status} (cache: ${cacheState}, ${roundedDuration}ms)`);
  };

  /**
   * Log script execution events
   */
  logger.scriptExecution = function(scriptPath, exitCode, durationMs, meta = {}) {
    const successCodes = new Set([0, 1, 2]);
    const level = exitCode === null || !successCodes.has(exitCode) ? 'error' : 'debug';
    const roundedDuration = Math.round(durationMs || 0);

    this[level]({
      scriptPath,
      exitCode,
      durationMs: roundedDuration,
      ...meta,
      event: 'script_execution',
    }, `Script executed: ${scriptPath} (code: ${exitCode ?? 'n/a'}, ${roundedDuration}ms)`);
  };

  /**
   * Log database query events
   */
  logger.query = function(queryType, table, durationMs, meta = {}) {
    const level = durationMs > 1000 ? 'warn' : 'debug';
    const roundedDuration = Math.round(durationMs || 0);

    this[level]({
      queryType,
      table,
      durationMs: roundedDuration,
      ...meta,
      event: 'database_query',
    }, `Query: ${queryType} ${table} (${roundedDuration}ms)`);
  };

  /**
   * Log error with context
   */
  logger.errorWithContext = function(error, context = {}) {
    this.error({
      err: error,
      stack: error.stack,
      ...context,
      event: 'error',
    }, error.message || 'Unhandled error');
  };
}

/**
 * Express middleware for request logging
 * Automatically logs all HTTP requests with timing
 *
 * @param {pino.Logger} logger - Logger instance (created with createLogger)
 * @returns {Function} Express middleware function
 */
export function createRequestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();

    // Add correlation ID if not present
    if (!req.id && !req.headers['x-correlation-id']) {
      req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.request(req, res, duration);
    });

    next();
  };
}

/**
 * Child logger with additional context
 * Useful for adding request-specific fields (userId, correlationId, etc.)
 *
 * @param {pino.Logger} logger - Parent logger instance
 * @param {object} bindings - Additional fields to include in all logs
 * @returns {pino.Logger} Child logger with bindings
 */
export function createChildLogger(logger, bindings = {}) {
  return logger.child(bindings);
}

// CommonJS compatibility
export default {
  createLogger,
  createRequestLogger,
  createChildLogger,
};
