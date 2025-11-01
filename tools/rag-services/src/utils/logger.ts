/**
 * Logger Utility
 *
 * Structured logging with Winston
 * Provides consistent logging format across all services
 *
 * @module utils/logger
 */

import winston from 'winston';

/**
 * Log levels
 */
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Determine log level based on environment
 */
const level = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${
      Object.keys(info).length > 3 ? ' ' + JSON.stringify(
        Object.fromEntries(
          Object.entries(info).filter(([key]) =>
            !['level', 'message', 'timestamp', 'service'].includes(key),
          ),
        ),
        null,
        2,
      ) : ''
    }`,
  ),
);

/**
 * JSON format for production
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: level(),
  levels: logLevels,
  defaultMeta: {
    service: 'rag-service',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
    }),
  ],
});

/**
 * RAG-specific log helpers
 */
export const logIngestion = (
  jobId: string,
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
  metadata?: Record<string, any>,
) => {
  logger.info('Ingestion job event', {
    jobId,
    status,
    ...metadata,
  });
};

export const logCollection = (
  collection: string,
  action: 'created' | 'updated' | 'deleted' | 'queried',
  metadata?: Record<string, any>,
) => {
  logger.info('Collection event', {
    collection,
    action,
    ...metadata,
  });
};

export const logFileWatch = (
  filePath: string,
  event: 'add' | 'change' | 'unlink',
  metadata?: Record<string, any>,
) => {
  logger.debug('File watch event', {
    filePath,
    event,
    ...metadata,
  });
};
