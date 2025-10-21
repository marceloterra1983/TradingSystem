/**
 * Circuit Breaker Pattern Implementation
 * Prevents repeated health checks to consistently failing services
 */

class CircuitBreaker {
  /**
   * @param {number} threshold - Number of failures before opening circuit
   * @param {number} timeout - Time in ms before attempting to close circuit
   */
  constructor(threshold = 5, timeout = 60000) {
    this.failures = new Map();
    this.threshold = threshold;
    this.timeout = timeout;
  }

  /**
   * Check if circuit is open for a service
   * @param {string} serviceId
   * @returns {boolean}
   */
  isOpen(serviceId) {
    const record = this.failures.get(serviceId);
    if (!record) return false;

    if (record.count >= this.threshold) {
      const elapsed = Date.now() - record.firstFailure;
      if (elapsed < this.timeout) {
        return true; // Circuit is open (blocking requests)
      }
      // Timeout elapsed, reset and try again (half-open state)
      this.reset(serviceId);
    }
    return false;
  }

  /**
   * Record a failure for a service
   * @param {string} serviceId
   */
  recordFailure(serviceId) {
    const record = this.failures.get(serviceId) || {
      count: 0,
      firstFailure: Date.now(),
    };
    record.count++;
    record.lastFailure = Date.now();
    this.failures.set(serviceId, record);
  }

  /**
   * Record a success for a service (resets failure count)
   * @param {string} serviceId
   */
  recordSuccess(serviceId) {
    this.reset(serviceId);
  }

  /**
   * Reset circuit for a service
   * @param {string} serviceId
   */
  reset(serviceId) {
    this.failures.delete(serviceId);
  }

  /**
   * Get current state of a service
   * @param {string} serviceId
   * @returns {{state: string, failures: number, firstFailure: number|null}}
   */
  getState(serviceId) {
    const record = this.failures.get(serviceId);
    if (!record) {
      return { state: 'closed', failures: 0, firstFailure: null };
    }

    const isOpen = this.isOpen(serviceId);
    return {
      state: isOpen ? 'open' : 'closed',
      failures: record.count,
      firstFailure: record.firstFailure,
      lastFailure: record.lastFailure,
    };
  }

  /**
   * Get statistics for all services
   * @returns {Map<string, object>}
   */
  getStats() {
    const stats = new Map();
    for (const [serviceId, record] of this.failures.entries()) {
      stats.set(serviceId, {
        ...this.getState(serviceId),
        threshold: this.threshold,
        timeout: this.timeout,
      });
    }
    return stats;
  }

  /**
   * Clear all circuit breaker state
   */
  clear() {
    this.failures.clear();
  }
}

module.exports = CircuitBreaker;













