import CircuitBreaker from "opossum";

/**
 * Circuit breaker configuration for database operations
 */
export const dbBreakerConfig = {
  timeout: 5000, // 5 seconds
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  rollingCountTimeout: 10000, // 10-second rolling window
  rollingCountBuckets: 10, // Number of buckets in rolling window
  name: "DatabaseCircuitBreaker",
};

/**
 * Circuit breaker configuration for external HTTP calls
 */
export const httpBreakerConfig = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 60000, // Try again after 1 minute
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
  name: "HttpCircuitBreaker",
};

/**
 * Create a circuit breaker with logging
 */
export function createCircuitBreaker<
  T extends (...args: unknown[]) => Promise<unknown>,
>(
  fn: T,
  config: Parameters<typeof CircuitBreaker>[1] = dbBreakerConfig,
): CircuitBreaker<Parameters<T>, ReturnType<T>> {
  const breaker = new CircuitBreaker(fn, config);

  // Log circuit state changes
  breaker.on("open", () => {
    console.warn(
      `[CircuitBreaker:${config.name}] ⚠️  Circuit opened - too many failures`,
    );
  });

  breaker.on("halfOpen", () => {
    console.info(
      `[CircuitBreaker:${config.name}] 🔄 Circuit half-open - testing if service recovered`,
    );
  });

  breaker.on("close", () => {
    console.info(
      `[CircuitBreaker:${config.name}] ✅ Circuit closed - service healthy`,
    );
  });

  breaker.on("fallback", (result) => {
    console.warn(
      `[CircuitBreaker:${config.name}] 🔀 Fallback triggered, result:`,
      result,
    );
  });

  // Log failures but don't spam
  let failureCount = 0;
  breaker.on("failure", (error) => {
    failureCount++;
    if (failureCount % 10 === 1) {
      // Log every 10th failure
      console.error(
        `[CircuitBreaker:${config.name}] ❌ Failure ${failureCount}:`,
        error.message,
      );
    }
  });

  return breaker as CircuitBreaker<Parameters<T>, ReturnType<T>>;
}

/**
 * Create a fallback function for database operations
 */
export function createDbFallback<T>(defaultValue?: T) {
  return (error: Error) => {
    console.error(
      "[CircuitBreaker:Database] Using fallback due to:",
      error.message,
    );
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(
      "Database temporarily unavailable. Please try again later.",
    );
  };
}
