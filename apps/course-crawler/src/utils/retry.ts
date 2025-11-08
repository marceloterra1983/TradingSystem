import pRetry, { AbortError } from 'p-retry';
import type { Logger } from 'pino';

export interface RetryConfig {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
  randomize?: boolean;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 5000,
  factor: 2,
  randomize: true,
};

/**
 * Wrapper for p-retry with logging and sensible defaults
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig & { logger?: Logger; operation?: string } = {}
): Promise<T> {
  const { logger, operation = 'operation', ...retryConfig } = config;
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

  return pRetry(
    async (attemptNumber) => {
      try {
        logger?.debug(
          { attemptNumber, operation },
          `[retry] Attempting ${operation}`
        );
        return await fn();
      } catch (error) {
        const isLastAttempt = attemptNumber >= finalConfig.retries;

        // Check if error is retryable
        if (isNonRetryableError(error)) {
          logger?.warn(
            { error, operation },
            '[retry] Non-retryable error detected, aborting'
          );
          throw new AbortError(error as Error);
        }

        logger?.warn(
          { error, attemptNumber, maxAttempts: finalConfig.retries, operation },
          `[retry] ${operation} failed, ${isLastAttempt ? 'final attempt failed' : 'retrying...'}`
        );

        throw error;
      }
    },
    finalConfig
  );
}

/**
 * Determine if an error should not be retried
 */
function isNonRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Don't retry on:
  // - Authentication failures
  // - Invalid credentials
  // - Permission denied
  // - Not found (404)
  // - Bad request (400)
  const nonRetryablePatterns = [
    'authentication',
    'unauthorized',
    'forbidden',
    'permission denied',
    'invalid credentials',
    'not found',
    'bad request',
    'invalid selector', // Selector config errors
  ];

  return nonRetryablePatterns.some((pattern) => message.includes(pattern));
}

/**
 * Retry specifically for browser operations (navigation, selectors)
 */
export async function retryBrowserOperation<T>(
  fn: () => Promise<T>,
  logger?: Logger,
  operation?: string
): Promise<T> {
  return retryWithBackoff(fn, {
    retries: 3,
    minTimeout: 2000,
    maxTimeout: 10000,
    logger,
    operation: operation || 'browser operation',
  });
}

/**
 * Retry specifically for database operations
 */
export async function retryDatabaseOperation<T>(
  fn: () => Promise<T>,
  logger?: Logger,
  operation?: string
): Promise<T> {
  return retryWithBackoff(fn, {
    retries: 5,
    minTimeout: 500,
    maxTimeout: 3000,
    logger,
    operation: operation || 'database operation',
  });
}
