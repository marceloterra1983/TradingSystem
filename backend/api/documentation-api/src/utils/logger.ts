/**
 * Structured Logging with Winston
 *
 * Centralized logging configuration for the RAG service
 * Supports console and file transports with JSON formatting
 *
 * @module utils/logger
 */

import winston from "winston";
import { Request, Response, NextFunction } from "express";
import path from "path";

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
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : process.env.LOG_LEVEL || "info";
};

/**
 * Define log colors
 */
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

/**
 * Custom format for console output in development
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  }),
);

/**
 * Format for file output (JSON)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Create transports based on environment
 */
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// File transports (production and development)
if (process.env.NODE_ENV !== "test") {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "combined.log"),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  );
}

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level: level(),
  levels: logLevels,
  defaultMeta: {
    service: "rag-service",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
  transports,
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

/**
 * Request logging middleware
 *
 * Logs all incoming HTTP requests with metadata
 *
 * @example
 * app.use(requestLogger);
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  // Generate or retrieve request ID
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.headers["x-request-id"] = requestId;

  // Log request
  logger.http("Incoming request", {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("User-Agent"),
  });

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? "warn" : "http";

    logger.log(logLevel, "Request completed", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
    });
  });

  next();
};

/**
 * Error logging helper
 *
 * @param error - Error object
 * @param context - Additional context
 */
export const logError = (error: Error, context?: Record<string, any>): void => {
  logger.error("Error occurred", {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
  });
};

/**
 * Performance logging helper
 *
 * @param operation - Operation name
 * @param duration - Duration in milliseconds
 * @param metadata - Additional metadata
 */
export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: Record<string, any>,
): void => {
  logger.info("Performance metric", {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  });
};

/**
 * Security logging helper
 *
 * @param event - Security event type
 * @param details - Event details
 */
export const logSecurity = (
  event: string,
  details: Record<string, any>,
): void => {
  logger.warn("Security event", {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Business logic logging helper
 *
 * @param action - Business action
 * @param details - Action details
 */
export const logBusiness = (
  action: string,
  details: Record<string, any>,
): void => {
  logger.info("Business action", {
    action,
    ...details,
  });
};

/**
 * RAG-specific logging helpers
 */

/**
 * Log RAG query
 */
export const logRagQuery = (
  query: string,
  metadata: Record<string, any>,
): void => {
  logger.info("RAG query", {
    query: query.substring(0, 100), // Truncate for logging
    queryLength: query.length,
    ...metadata,
  });
};

/**
 * Log ingestion job
 */
export const logIngestion = (
  jobId: string,
  status: string,
  metadata: Record<string, any>,
): void => {
  logger.info("Ingestion job", {
    jobId,
    status,
    ...metadata,
  });
};

/**
 * Log circuit breaker state
 */
export const logCircuitBreaker = (
  service: string,
  state: "open" | "half-open" | "closed",
  details?: Record<string, any>,
): void => {
  logger.warn("Circuit breaker state change", {
    service,
    state,
    ...details,
  });
};

/**
 * Stream logs (for debugging)
 */
if (process.env.NODE_ENV === "development") {
  logger.stream = {
    write: (message: string) => {
      logger.http(message.trim());
    },
  } as any;
}

/**
 * Example usage:
 *
 * import { logger, requestLogger, logError, logPerformance } from './utils/logger';
 *
 * // Add request logging middleware
 * app.use(requestLogger);
 *
 * // Log messages
 * logger.info('Server started', { port: 3400 });
 * logger.error('Failed to connect to database', { error: err.message });
 *
 * // Log errors
 * try {
 *   // ... some operation
 * } catch (error) {
 *   logError(error, { operation: 'database_query', userId });
 * }
 *
 * // Log performance
 * const start = Date.now();
 * await someOperation();
 * logPerformance('someOperation', Date.now() - start, { userId });
 */

export default logger;
