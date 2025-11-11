/**
 * CORS Configuration
 *
 * Configures Cross-Origin Resource Sharing (CORS) for the API
 * Restricts access based on allowed origins and methods
 *
 * @module config/cors
 */

import cors, { CorsOptions } from "cors";
import { Request } from "express";
import { logger } from "../utils/logger";

/**
 * Allowed origins based on environment
 */
const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV || "development";

  if (env === "production") {
    // Production: Only allow configured frontend URL
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error(
        "FRONTEND_URL environment variable must be set in production",
      );
    }

    return [frontendUrl];
  }

  if (env === "test") {
    // Test: Allow all origins
    return ["*"];
  }

  // Development: Prefer registry-provided URLs, fallback to localhost hostnames without hardcoded literals
  const registryOrigins = [
    process.env.DASHBOARD_GATEWAY_URL,
    process.env.DASHBOARD_URL,
    process.env.DOCUMENTATION_HUB_URL,
    process.env.DOCUMENTATION_API_URL,
    process.env.API_VIEWER_URL,
  ].filter((value): value is string => Boolean(value));

  if (registryOrigins.length > 0) {
    return registryOrigins;
  }

  const defaultHost = process.env.PORT_GOVERNANCE_DEFAULT_HOST || "localhost";
  const legacyPorts = [9080, 3000, 3400];
  return legacyPorts.map((port) => `http://${defaultHost}:${port}`);
};

/**
 * Origin validation function
 *
 * @param origin - Request origin
 * @param callback - CORS callback
 */
const validateOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allowed?: boolean) => void,
): void => {
  const allowedOrigins = getAllowedOrigins();

  // Allow requests with no origin (e.g., mobile apps, Postman)
  if (!origin) {
    return callback(null, true);
  }

  // Check if origin is allowed
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    logger.warn("CORS: Blocked request from unauthorized origin", { origin });
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
};

/**
 * CORS options configuration
 */
export const corsOptions: CorsOptions = {
  // Origin validation
  origin: validateOrigin,

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  // Allowed request headers
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Request-ID",
    "X-Internal-Auth",
    "Accept",
    "Origin",
  ],

  // Expose custom headers to the client
  exposedHeaders: [
    "X-Total-Count",
    "X-Page-Count",
    "X-Per-Page",
    "X-Current-Page",
    "X-Cache-Status",
    "X-Request-ID",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],

  // Cache preflight requests for 24 hours
  maxAge: 86400,

  // Respond to preflight requests with 204 (no content)
  optionsSuccessStatus: 204,

  // Allow preflight to be cached
  preflightContinue: false,
};

/**
 * Dynamic CORS configuration for specific routes
 *
 * @example
 * app.get('/api/public', dynamicCors({ origin: '*' }), handler);
 */
export const dynamicCors = (options: Partial<CorsOptions> = {}) => {
  return cors({
    ...corsOptions,
    ...options,
  });
};

/**
 * Strict CORS for sensitive endpoints
 *
 * Only allows configured production origins
 */
export const strictCors = (): CorsOptions => ({
  ...corsOptions,
  origin: (origin, callback) => {
    const env = process.env.NODE_ENV || "development";

    // In production, only allow the configured frontend URL
    if (env === "production") {
      const frontendUrl = process.env.FRONTEND_URL;

      if (!frontendUrl) {
        return callback(new Error("FRONTEND_URL not configured"));
      }

      if (origin === frontendUrl) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by strict CORS`));
      }
    } else {
      // In development, use regular validation
      validateOrigin(origin, callback);
    }
  },
  credentials: true,
});

/**
 * Permissive CORS for public endpoints
 *
 * Allows all origins (use with caution)
 */
export const publicCors = (): CorsOptions => ({
  ...corsOptions,
  origin: "*",
  credentials: false,
});

/**
 * Log CORS configuration on startup
 */
export const logCorsConfig = (): void => {
  const allowedOrigins = getAllowedOrigins();

  logger.info("CORS configuration initialized", {
    environment: process.env.NODE_ENV || "development",
    allowedOrigins,
    credentials: corsOptions.credentials,
    methods: corsOptions.methods,
  });
};

/**
 * Security headers middleware
 *
 * Adds additional security headers beyond CORS
 */
import { Request as ExpressRequest, Response, NextFunction } from "express";

export const securityHeaders = (
  req: ExpressRequest,
  res: Response,
  next: NextFunction,
): void => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (adjust based on your needs)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  );

  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  next();
};

/**
 * Example usage:
 *
 * import cors from 'cors';
 * import { corsOptions, logCorsConfig, securityHeaders } from './config/cors';
 *
 * // Apply CORS middleware
 * app.use(cors(corsOptions));
 *
 * // Apply security headers
 * app.use(securityHeaders);
 *
 * // Log configuration
 * logCorsConfig();
 *
 * // Or use dynamic CORS for specific routes
 * app.get('/api/public', dynamicCors({ origin: '*' }), handler);
 */
