/**
 * Circuit Breaker Implementation
 *
 * Implements the Circuit Breaker pattern to prevent cascading failures
 * and provide fail-fast behavior when services are consistently unavailable.
 *
 * States:
 * - CLOSED: Normal operation, all requests allowed
 * - OPEN: Service unavailable, fail-fast without calling backend
 * - HALF_OPEN: Testing if service has recovered
 *
 * Related: STD-020 (REQ-HTTP-003), ADR-008
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 *   monitoringPeriod: 10000,
 * });
 *
 * if (breaker.canRequest()) {
 *   try {
 *     const result = await makeRequest();
 *     breaker.recordSuccess();
 *   } catch (error) {
 *     breaker.recordFailure();
 *   }
 * }
 * ```
 */

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening the circuit
   * @default 5
   */
  failureThreshold: number;

  /**
   * Time in milliseconds before attempting half-open state
   * @default 30000 (30 seconds)
   */
  resetTimeout: number;

  /**
   * Time window in milliseconds for counting failures
   * @default 10000 (10 seconds)
   */
  monitoringPeriod: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Check if requests are allowed in current state
   *
   * @returns true if request can be made, false otherwise
   */
  canRequest(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.config.resetTimeout) {
        console.log("[CircuitBreaker] Transitioning to HALF_OPEN");
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN: Allow test request
    return true;
  }

  /**
   * Record a successful request
   *
   * If in HALF_OPEN state, transitions back to CLOSED.
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      console.log("[CircuitBreaker] Success in HALF_OPEN, closing circuit");
      this.state = CircuitState.CLOSED;
      this.failures = [];
    }
  }

  /**
   * Record a failed request
   *
   * If failure threshold is reached, opens the circuit.
   */
  recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;

    // Remove failures outside monitoring period
    this.failures = this.failures.filter(
      (timestamp) => now - timestamp < this.config.monitoringPeriod,
    );

    // Add new failure
    this.failures.push(now);

    // Check if threshold reached
    if (this.failures.length >= this.config.failureThreshold) {
      if (this.state !== CircuitState.OPEN) {
        console.warn(
          `[CircuitBreaker] Opening circuit (${this.failures.length} failures)`,
        );
        this.state = CircuitState.OPEN;
      }
    }
  }

  /**
   * Get current circuit state
   *
   * @returns Current circuit state (CLOSED | OPEN | HALF_OPEN)
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset circuit breaker to CLOSED state
   *
   * Clears all failure history.
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.lastFailureTime = 0;
  }

  /**
   * Get current failure count within monitoring period
   *
   * @returns Number of failures in current monitoring window
   */
  getFailureCount(): number {
    const now = Date.now();
    return this.failures.filter(
      (timestamp) => now - timestamp < this.config.monitoringPeriod,
    ).length;
  }
}
