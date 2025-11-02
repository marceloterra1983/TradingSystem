/**
 * Simple logger utility that respects development/production environments
 * Only logs debug messages in development mode
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug logs - only shown in development
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info logs - shown in all environments
   */
  info: (...args: unknown[]): void => {
    console.info(...args);
  },

  /**
   * Warning logs - shown in all environments
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },

  /**
   * Error logs - always shown
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
