/**
 * Circuit Breaker Middleware for RAG Services
 * Protects against cascading failures when calling upstream services
 *
 * @module backend/api/documentation-api/src/middleware/circuitBreaker
 */

import CircuitBreaker from 'opossum';
import { ServiceUnavailableError } from './errorHandler.js';

/**
 * Circuit breaker configuration options
 */
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 30000,                    // 30 seconds timeout
  errorThresholdPercentage: 50,      // Open if 50% of requests fail
  resetTimeout: 30000,               // Try recovery after 30 seconds
  rollingCountTimeout: 10000,        // Rolling window: 10 seconds
  rollingCountBuckets: 10,           // 10 buckets (1 second each)
  volumeThreshold: 5,                // Min 5 requests before opening
};

/**
 * Create circuit breaker for a function
 * 
 * @param {Function} fn - Async function to protect
 * @param {string} serviceName - Service name for error messages
 * @param {Object} options - Custom circuit breaker options
 * @returns {CircuitBreaker} Circuit breaker instance
 */
export function createCircuitBreaker(fn, serviceName, options = {}) {
  const breaker = new CircuitBreaker(fn, {
    ...CIRCUIT_BREAKER_OPTIONS,
    ...options,
  });

  // Event handlers for observability
  breaker.on('open', () => {
    console.error(`[Circuit Breaker] ${serviceName}: OPEN (service unavailable)`);
  });

  breaker.on('halfOpen', () => {
    console.warn(`[Circuit Breaker] ${serviceName}: HALF-OPEN (testing recovery)`);
  });

  breaker.on('close', () => {
    console.info(`[Circuit Breaker] ${serviceName}: CLOSED (service recovered)`);
  });

  breaker.on('reject', () => {
    console.warn(`[Circuit Breaker] ${serviceName}: Request rejected (circuit open)`);
  });

  breaker.on('timeout', () => {
    console.warn(`[Circuit Breaker] ${serviceName}: Request timeout (>30s)`);
  });

  breaker.on('failure', (error) => {
    console.error(`[Circuit Breaker] ${serviceName}: Request failed:`, error.message);
  });

  // Fallback function (return cached data if available)
  breaker.fallback((error, ...args) => {
    console.warn(`[Circuit Breaker] ${serviceName}: Executing fallback`);
    
    // Return error object with circuit breaker info
    throw new ServiceUnavailableError(serviceName, {
      reason: 'Circuit breaker open',
      state: breaker.state,
      stats: breaker.stats,
      retryAfter: Math.ceil(CIRCUIT_BREAKER_OPTIONS.resetTimeout / 1000),
    });
  });

  return breaker;
}

/**
 * Get circuit breaker statistics
 * 
 * @param {CircuitBreaker} breaker - Circuit breaker instance
 * @returns {Object} Statistics object
 */
export function getCircuitBreakerStats(breaker) {
  const stats = breaker.stats;
  
  return {
    state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
    stats: {
      fires: stats.fires,                    // Total calls
      successes: stats.successes,            // Successful calls
      failures: stats.failures,              // Failed calls
      rejects: stats.rejects,                // Rejected (circuit open)
      timeouts: stats.timeouts,              // Timeout calls
      fallbacks: stats.fallbacks,            // Fallback calls
      latencyMean: stats.latencyMean,        // Average latency (ms)
      percentiles: stats.percentiles,        // Latency percentiles
    },
    config: {
      timeout: breaker.options.timeout,
      errorThreshold: breaker.options.errorThresholdPercentage,
      resetTimeout: breaker.options.resetTimeout,
    },
  };
}

/**
 * Format circuit breaker error for HTTP response
 * 
 * @param {Error} error - Circuit breaker error
 * @param {string} serviceName - Service name
 * @returns {Object} Error response object
 */
export function formatCircuitBreakerError(error, serviceName) {
  return {
    code: 'SERVICE_UNAVAILABLE',
    message: `${serviceName} service is temporarily unavailable`,
    details: {
      service: serviceName.toLowerCase(),
      circuit_breaker_state: 'open',
      retry_after: Math.ceil(CIRCUIT_BREAKER_OPTIONS.resetTimeout / 1000),
      description: 'Circuit breaker is open due to repeated failures. Service will attempt recovery automatically.',
    },
  };
}

/**
 * Middleware to expose circuit breaker health status
 * 
 * @param {Object} breakers - Map of circuit breakers { name: breaker }
 * @returns {Function} Express middleware
 */
export function circuitBreakerHealthMiddleware(breakers) {
  return (req, res, next) => {
    // Add circuit breaker states to request object
    req.circuitBreakers = {};
    
    Object.entries(breakers).forEach(([name, breaker]) => {
      req.circuitBreakers[name] = {
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        healthy: breaker.closed,
      };
    });
    
    next();
  };
}

export default {
  createCircuitBreaker,
  getCircuitBreakerStats,
  formatCircuitBreakerError,
  circuitBreakerHealthMiddleware,
};

