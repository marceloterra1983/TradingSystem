/**
 * Circuit Breaker for TP Capital
 * 
 * Prevents cascade failures when database or external services fail
 * Auto-recovers with exponential backoff
 */

import CircuitBreaker from 'opossum';
import { logger } from '../logger.js';

/**
 * Create circuit breaker for database operations
 * 
 * @param {Function} action - Async function to protect
 * @param {object} options - Circuit breaker options
 * @returns {CircuitBreaker}
 */
export function createDatabaseCircuitBreaker(action, options = {}) {
  const defaultOptions = {
    timeout: 5000,  // 5 seconds
    errorThresholdPercentage: 50,  // Open circuit if 50% of requests fail
    resetTimeout: 30000,  // Try again after 30 seconds
    rollingCountTimeout: 10000,  // 10 second window for error counting
    rollingCountBuckets: 10,  // 10 buckets
    name: options.name || 'database-operation',
  };

  const breaker = new CircuitBreaker(action, { ...defaultOptions, ...options });

  // Event: Circuit opened (too many failures)
  breaker.on('open', () => {
    logger.error({
      breakerName: breaker.name,
      stats: breaker.stats,
    }, 'Circuit breaker OPENED - stopping requests to failing service');
  });

  // Event: Circuit half-open (testing if service recovered)
  breaker.on('halfOpen', () => {
    logger.warn({
      breakerName: breaker.name,
    }, 'Circuit breaker HALF-OPEN - testing service recovery');
  });

  // Event: Circuit closed (service recovered)
  breaker.on('close', () => {
    logger.info({
      breakerName: breaker.name,
    }, 'Circuit breaker CLOSED - service recovered');
  });

  // Event: Request succeeded
  breaker.on('success', (result, latency) => {
    if (latency > 1000) {
      logger.warn({
        breakerName: breaker.name,
        latency,
      }, 'Slow query detected');
    }
  });

  // Event: Request failed
  breaker.on('failure', (error) => {
    logger.error({
      breakerName: breaker.name,
      error: error.message,
      stats: breaker.stats,
    }, 'Circuit breaker recorded failure');
  });

  // Event: Request rejected (circuit is open)
  breaker.on('reject', () => {
    logger.warn({
      breakerName: breaker.name,
    }, 'Request rejected - circuit is OPEN');
  });

  // Event: Timeout
  breaker.on('timeout', () => {
    logger.error({
      breakerName: breaker.name,
      timeout: breaker.options.timeout,
    }, 'Request timed out');
  });

  // Fallback function (returns default value when circuit is open)
  breaker.fallback((error) => {
    logger.warn({
      breakerName: breaker.name,
      error: error.message,
    }, 'Circuit breaker fallback triggered');
    
    // Return safe default
    return options.fallback || null;
  });

  return breaker;
}

/**
 * Create circuit breaker specifically for TimescaleDB queries
 */
export function createTimescaleCircuitBreaker(action, options = {}) {
  return createDatabaseCircuitBreaker(action, {
    ...options,
    name: 'timescaledb',
    timeout: 3000,  // 3 seconds for DB queries
    errorThresholdPercentage: 40,  // More sensitive for DB
    resetTimeout: 20000,  // 20 seconds recovery window
  });
}

/**
 * Create circuit breaker for Gateway DB queries
 */
export function createGatewayCircuitBreaker(action, options = {}) {
  return createDatabaseCircuitBreaker(action, {
    ...options,
    name: 'gateway-db',
    timeout: 3000,
    errorThresholdPercentage: 40,
    resetTimeout: 20000,
  });
}

/**
 * Create circuit breaker for HTTP calls (external APIs)
 */
export function createHttpCircuitBreaker(action, options = {}) {
  return createDatabaseCircuitBreaker(action, {
    ...options,
    name: options.name || 'http-call',
    timeout: 10000,  // 10 seconds for HTTP
    errorThresholdPercentage: 60,  // Less sensitive
    resetTimeout: 60000,  // 1 minute recovery
  });
}

/**
 * Wrap async function with retry logic
 * 
 * @param {Function} fn - Async function to retry
 * @param {object} options - Retry options
 * @returns {Promise}
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable =
        retryableErrors.includes(error.code) ||
        retryableErrors.some((code) => error.message?.includes(code));

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      logger.warn({
        attempt: attempt + 1,
        maxRetries,
        delay,
        error: error.message,
        code: error.code,
      }, 'Retrying failed operation');

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

