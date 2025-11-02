/**
 * CORS Configuration
 *
 * Environment-aware CORS settings
 * Security headers and origin validation
 *
 * @module config/cors
 */

import { CorsOptions } from 'cors';
import { logger } from '../utils/logger';

/**
 * Get allowed origins based on environment
 */
const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    // Production: Only allow configured frontend URL
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      logger.warn('FRONTEND_URL not configured for production');
      return [];
    }
    return [frontendUrl];
  }

  // Development: Allow common local development URLs
  return [
    'http://localhost:3103', // Dashboard
    'http://localhost:3000', // Default React dev
    'http://localhost:3400', // Documentation Hub
    'http://localhost:3401', // Documentation API
    'http://127.0.0.1:3103',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3400',
    'http://127.0.0.1:3401',
  ];
};

/**
 * Validate origin
 */
const validateOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void => {
  const allowedOrigins = getAllowedOrigins();

  // Allow requests with no origin (like mobile apps or curl)
  if (!origin) {
    return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  logger.warn('Blocked CORS request', { origin, allowedOrigins });
  return callback(new Error('Not allowed by CORS'));
};

/**
 * CORS options
 */
export const corsOptions: CorsOptions = {
  origin: validateOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Internal-Auth',
    'X-Request-ID',
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
};

/**
 * Security headers middleware
 */
export const securityHeaders = (_req: any, res: any, next: any): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  );

  // HSTS (Strict-Transport-Security) - only in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

/**
 * Log CORS configuration on startup
 */
export const logCorsConfig = (): void => {
  const allowedOrigins = getAllowedOrigins();
  logger.info('CORS configuration loaded', {
    environment: process.env.NODE_ENV,
    allowedOrigins,
  });
};
