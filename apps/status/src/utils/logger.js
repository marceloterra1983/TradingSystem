/**
 * Structured logging utility using Pino
 * Following TradingSystem project standards
 */

const pino = require('pino');

/**
 * Get log level from environment or default to 'info'
 */
function getLogLevel() {
  const level = process.env.SERVICE_LAUNCHER_LOG_LEVEL || process.env.LOG_LEVEL || 'info';
  const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  return validLevels.includes(level.toLowerCase()) ? level.toLowerCase() : 'info';
}

/**
 * Determine if we should use pretty printing
 * - Development: Use pino-pretty for human-readable logs
 * - Production: Use JSON for machine parsing
 */
function shouldUsePretty() {
  const env = process.env.NODE_ENV || 'development';
  const forcePretty = process.env.SERVICE_LAUNCHER_PRETTY_LOGS === 'true';
  const forceJson = process.env.SERVICE_LAUNCHER_PRETTY_LOGS === 'false';
  
  if (forceJson) return false;
  if (forcePretty) return true;
  return env === 'development';
}

/**
 * Create logger instance with appropriate configuration
 */
function createLogger() {
  const config = {
    level: getLogLevel(),
    name: 'service-launcher',
    // Add base fields that appear in every log
    base: {
      service: 'service-launcher-api',
      pid: process.pid,
    },
    // Timestamp in ISO format
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  };

  // Add pretty printing transport for development
  if (shouldUsePretty()) {
    config.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '[{service}] {msg}',
        singleLine: false,
      },
    };
  }

  return pino(config);
}

// Create singleton logger instance
const logger = createLogger();

/**
 * Log helper functions with semantic meaning
 */

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
 * Log HTTP requests (optional middleware)
 */
logger.request = function(req, res, duration) {
  this.info({
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration,
    event: 'http_request',
  }, `${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
};

/**
 * Log aggregated status checks
 */
logger.statusCheck = function(overallStatus, totalServices, degradedCount, downCount, avgLatency) {
  const level = overallStatus === 'ok' ? 'info' : overallStatus === 'degraded' ? 'warn' : 'error';
  this[level]({
    overallStatus,
    totalServices,
    degradedCount,
    downCount,
    averageLatencyMs: avgLatency,
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

module.exports = logger;












