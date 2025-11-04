/**
 * Centralized Logger - TP-Capital
 * 
 * Standardized logging with context and severity levels
 * 
 * @module tp-capital/utils/logger
 */

// Internal type for future use (e.g., filtering, metrics)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class TPCapitalLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[TP-Capital:${this.context}]`, message, context || '');
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    console.info(`[TP-Capital:${this.context}]`, message, context || '');
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[TP-Capital:${this.context}]`, message, context || '');
  }

  /**
   * Log error message with optional error object
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    console.error(`[TP-Capital:${this.context}]`, message, {
      error: errorInfo,
      ...context,
    });
  }

  /**
   * Log API error with HTTP details
   */
  apiError(
    endpoint: string,
    status: number,
    statusText: string,
    context?: LogContext
  ): void {
    this.error(`API Error: ${endpoint}`, undefined, {
      status,
      statusText,
      ...context,
    });
  }
}

/**
 * Create a logger instance for a specific context
 * 
 * @param context - Context identifier (e.g., 'SignalsTable', 'API', 'FilterBar')
 * @returns Logger instance
 * 
 * @example
 * ```ts
 * const logger = createLogger('SignalsTable');
 * logger.info('Component mounted');
 * logger.error('Failed to fetch signals', error);
 * ```
 */
export function createLogger(context: string): TPCapitalLogger {
  return new TPCapitalLogger(context);
}

/**
 * Default logger for general use
 */
export const logger = createLogger('Module');

