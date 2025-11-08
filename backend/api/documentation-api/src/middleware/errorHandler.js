import { logger } from "../config/logger.js";

/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = null,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource, identifier = null) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND", { resource, identifier });
    this.name = "NotFoundError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service, details = null) {
    const message = `Service '${service}' is currently unavailable`;
    super(message, 503, "SERVICE_UNAVAILABLE", { service, ...details });
    this.name = "ServiceUnavailableError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, originalError, details = null) {
    const message = `External service '${service}' failed: ${originalError.message}`;
    super(message, 502, "EXTERNAL_SERVICE_ERROR", {
      service,
      originalError: originalError.message,
      ...details,
    });
    this.name = "ExternalServiceError";
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  const isOperational = err instanceof AppError && err.isOperational;
  const logLevel = isOperational ? "warn" : "error";

  logger[logLevel]("API Error", {
    error: error.message,
    code: err.code || "UNKNOWN",
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    isOperational,
  });

  // If it's already an AppError, use its statusCode
  if (err instanceof AppError) {
    error.statusCode = err.statusCode;
    error.code = err.code;
  } else {
    // Legacy error detection
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("QuestDB")
    ) {
      error.message = "Database connection error";
      error.statusCode = 503;
      error.code = "DATABASE_ERROR";
    } else if (error.message.includes("Validation failed")) {
      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";
    } else if (error.message.includes("not found")) {
      error.statusCode = 404;
      error.code = "NOT_FOUND";
    } else if (error.message.includes("already exists")) {
      error.statusCode = 409;
      error.code = "CONFLICT";
    } else if (
      error.message.includes("Unauthorized") ||
      error.message.includes("Access denied")
    ) {
      error.statusCode = 401;
      error.code = "UNAUTHORIZED";
    } else if (error.message.includes("Forbidden")) {
      error.statusCode = 403;
      error.code = "FORBIDDEN";
    } else if (
      error.message.includes("Bad Request") ||
      error.message.includes("Invalid")
    ) {
      error.statusCode = 400;
      error.code = "BAD_REQUEST";
    }
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error" : error.message;

  const response = {
    success: false,
    error: {
      message,
      code: error.code || "INTERNAL_ERROR",
    },
  };

  // Add details if present
  if (err.details) {
    response.error.details = err.details;
  }

  // Add development info
  if (process.env.NODE_ENV === "development") {
    response.error.stack = err.stack;
    response.error.original = error;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.url}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async error wrapper for routes
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Rate limit error handler
 */
export const rateLimitHandler = (req, res) => {
  logger.warn("Rate limit exceeded", {
    ip: req.ip,
    url: req.url,
    method: req.method,
    userAgent: req.get("User-Agent"),
  });

  res.status(429).json({
    success: false,
    error: "Too many requests, please try again later",
    retryAfter: 60, // seconds
  });
};

/**
 * Malformed request handler
 */
export const malformedRequestHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    logger.warn("Malformed JSON request", {
      error: err.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });

    return res.status(400).json({
      success: false,
      error: "Malformed JSON request",
      details: "Invalid JSON format in request body",
    });
  }

  next(err);
};

/**
 * CORS error handler
 */
export const corsErrorHandler = (err, req, res, next) => {
  if (err.message.includes("CORS")) {
    logger.warn("CORS error", {
      error: err.message,
      origin: req.get("Origin"),
      url: req.url,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      error: "CORS policy violation",
      details: "Cross-origin request not allowed",
    });
  }

  next(err);
};

/**
 * File upload error handler
 */
export const fileUploadErrorHandler = (err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: "File size too large",
      details: `Maximum file size is ${err.limit} bytes`,
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      error: "Too many files",
      details: `Maximum ${err.limit} files allowed`,
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      error: "Unexpected file field",
      details: "File field name not expected",
    });
  }

  if (err.code === "LIMIT_PART_COUNT") {
    return res.status(400).json({
      success: false,
      error: "Too many parts",
      details: "Request contains too many form parts",
    });
  }

  if (err.code === "LIMIT_FIELD_KEY") {
    return res.status(400).json({
      success: false,
      error: "Field name too long",
      details: "Form field name exceeds maximum length",
    });
  }

  if (err.code === "LIMIT_FIELD_VALUE") {
    return res.status(400).json({
      success: false,
      error: "Field value too long",
      details: "Form field value exceeds maximum length",
    });
  }

  if (err.code === "LIMIT_FIELD_COUNT") {
    return res.status(400).json({
      success: false,
      error: "Too many fields",
      details: "Form contains too many fields",
    });
  }

  next(err);
};
