/**
 * Centralized Logger - TP-Capital
 * 
 * Standardized logging with context and severity levels
 * 
 * @module tp-capital/utils/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class TPCapitalLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private emit(level: LogLevel, message: string, context?: LogContext): void {
    if (level === 'debug' && process.env.NODE_ENV !== 'development') {
      return;
    }

    const prefix = `[TP-Capital:${this.context}]`;
    const payload = context && Object.keys(context).length > 0 ? context : '';

    switch (level) {
      case 'debug':
        console.debug(prefix, message, payload);
        break;
      case 'info':
        console.info(prefix, message, payload);
        break;
      case 'warn':
        console.warn(prefix, message, payload);
        break;
      case 'error':
        console.error(prefix, message, payload);
        break;
      default:
        console.log(prefix, message, payload);
    }
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.emit('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.emit('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.emit('warn', message, context);
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

    this.emit('error', message, {
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
