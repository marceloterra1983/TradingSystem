/**
 * Standardized Health Check Middleware
 *
 * Provides consistent health check endpoints across all services.
 * Supports readiness vs liveness probes and dependency checks.
 *
 * Usage:
 *   import { createHealthCheckHandler } from '@backend/shared/middleware/health';
 *
 *   app.get('/health', createHealthCheckHandler({
 *     serviceName: 'workspace-api',
 *     version: '1.0.0',
 *     checks: {
 *       database: async () => await db.ping(),
 *       redis: async () => await redis.ping(),
 *     }
 *   }));
 */

/**
 * Health check status enum
 */
export const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
};

/**
 * Create a standardized health check handler
 *
 * @param {object} options - Health check configuration
 * @param {string} options.serviceName - Name of the service
 * @param {string} options.version - Service version (default: process.env.npm_package_version)
 * @param {object} options.checks - Dependency health check functions
 * @param {object} options.logger - Logger instance
 * @param {number} options.timeout - Health check timeout in ms (default: 5000)
 * @returns {Function} Express route handler
 */
export function createHealthCheckHandler(options = {}) {
  const {
    serviceName = 'unknown',
    version = process.env.npm_package_version || '1.0.0',
    checks = {},
    logger,
    timeout = 5000,
  } = options;

  return async (req, res) => {
    const startTime = Date.now();

    try {
      // Run all dependency checks in parallel with timeout
      const checkResults = await Promise.race([
        runHealthChecks(checks, logger),
        timeoutPromise(timeout),
      ]);

      // Determine overall status
      const overallStatus = determineOverallStatus(checkResults);
      const duration = Date.now() - startTime;

      // Build response
      const response = {
        status: overallStatus,
        service: serviceName,
        version,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: checkResults,
        responseTime: duration,
      };

      // Log health check
      if (logger) {
        const level = overallStatus === HealthStatus.HEALTHY ? 'debug' : 'warn';
        logger[level]({
          service: serviceName,
          status: overallStatus,
          duration,
          checks: checkResults,
        }, `Health check: ${overallStatus}`);
      }

      // Set HTTP status based on health
      const httpStatus = overallStatus === HealthStatus.HEALTHY ? 200
        : overallStatus === HealthStatus.DEGRADED ? 200
        : 503;

      res.status(httpStatus).json(response);
    } catch (error) {
      const duration = Date.now() - startTime;

      logger?.error({ err: error, duration }, 'Health check failed');

      res.status(503).json({
        status: HealthStatus.UNHEALTHY,
        service: serviceName,
        version,
        timestamp: new Date().toISOString(),
        error: error.message,
        responseTime: duration,
      });
    }
  };
}

/**
 * Create a readiness probe handler
 * Returns 200 only if ALL dependencies are healthy
 *
 * @param {object} options - Same as createHealthCheckHandler
 * @returns {Function} Express route handler
 */
export function createReadinessHandler(options = {}) {
  const handler = createHealthCheckHandler(options);

  return async (req, res) => {
    // Use the standard handler but force 503 if not fully healthy
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      if (data.status !== HealthStatus.HEALTHY) {
        return originalJson.call(this.status(503), data);
      }
      return originalJson(data);
    };

    return handler(req, res);
  };
}

/**
 * Create a liveness probe handler
 * Returns 200 as long as the service process is alive
 * Does NOT check dependencies
 *
 * @param {object} options - Basic service info
 * @param {string} options.serviceName - Name of the service
 * @param {string} options.version - Service version
 * @returns {Function} Express route handler
 */
export function createLivenessHandler(options = {}) {
  const {
    serviceName = 'unknown',
    version = process.env.npm_package_version || '1.0.0',
  } = options;

  return (_req, res) => {
    res.status(200).json({
      status: HealthStatus.HEALTHY,
      service: serviceName,
      version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  };
}

/**
 * Run all health checks in parallel
 *
 * @param {object} checks - Object with check functions
 * @param {object} logger - Logger instance
 * @returns {Promise<object>} Check results
 */
async function runHealthChecks(checks, logger) {
  const results = {};

  await Promise.all(
    Object.entries(checks).map(async ([name, checkFn]) => {
      const startTime = Date.now();

      try {
        const result = await checkFn();
        const duration = Date.now() - startTime;

        results[name] = {
          status: result === false ? HealthStatus.UNHEALTHY : HealthStatus.HEALTHY,
          message: typeof result === 'string' ? result : 'OK',
          responseTime: duration,
        };
      } catch (error) {
        const duration = Date.now() - startTime;

        logger?.warn({
          check: name,
          err: error,
          duration,
        }, `Health check failed: ${name}`);

        results[name] = {
          status: HealthStatus.UNHEALTHY,
          message: error.message,
          responseTime: duration,
        };
      }
    })
  );

  return results;
}

/**
 * Determine overall health status from individual checks
 *
 * @param {object} checkResults - Results from runHealthChecks
 * @returns {string} Overall health status
 */
function determineOverallStatus(checkResults) {
  const statuses = Object.values(checkResults).map(r => r.status);

  // If any check is unhealthy, overall is unhealthy
  if (statuses.includes(HealthStatus.UNHEALTHY)) {
    return HealthStatus.UNHEALTHY;
  }

  // If any check is degraded, overall is degraded
  if (statuses.includes(HealthStatus.DEGRADED)) {
    return HealthStatus.DEGRADED;
  }

  // All checks passed
  return HealthStatus.HEALTHY;
}

/**
 * Create a timeout promise
 *
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after timeout
 */
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Health check timeout after ${ms}ms`)), ms);
  });
}

/**
 * Common health check functions for databases
 */
export const commonChecks = {
  /**
   * PostgreSQL/TimescaleDB health check
   *
   * @param {object} client - pg.Pool or similar client
   * @returns {Function} Health check function
   */
  postgres: (client) => async () => {
    const result = await client.query('SELECT 1');
    return result.rowCount === 1;
  },

  /**
   * Redis health check
   *
   * @param {object} client - Redis client
   * @returns {Function} Health check function
   */
  redis: (client) => async () => {
    const result = await client.ping();
    return result === 'PONG';
  },

  /**
   * HTTP endpoint health check
   *
   * @param {string} url - Endpoint URL
   * @param {number} timeout - Request timeout (default: 3000ms)
   * @returns {Function} Health check function
   */
  http: (url, timeout = 3000) => async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  /**
   * Custom check builder
   *
   * @param {Function} fn - Async function that throws on failure
   * @returns {Function} Health check function
   */
  custom: (fn) => async () => {
    await fn();
    return true;
  },
};

// CommonJS compatibility
export default {
  HealthStatus,
  createHealthCheckHandler,
  createReadinessHandler,
  createLivenessHandler,
  commonChecks,
};
