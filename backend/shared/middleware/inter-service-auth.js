/**
 * Inter-Service Authentication Middleware
 *
 * Provides JWT-based authentication for service-to-service communication.
 * Ensures that only authorized services can communicate with each other.
 *
 * Part of Phase 2.2 - Security Infrastructure
 *
 * Usage:
 *   import { createInterServiceAuthMiddleware, generateServiceToken } from '@backend/shared/middleware/inter-service-auth';
 *
 *   // Protect internal endpoints
 *   app.use('/internal/*', createInterServiceAuthMiddleware({ logger }));
 *
 *   // Generate token for outgoing requests
 *   const token = generateServiceToken('workspace-api');
 *   fetch('http://docs-api/internal/data', {
 *     headers: { 'x-service-token': token }
 *   });
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Service token payload structure
 * @typedef {object} ServiceTokenPayload
 * @property {string} serviceName - Name of the calling service
 * @property {string} issuer - Token issuer (always 'tradingsystem')
 * @property {number} iat - Issued at timestamp
 * @property {number} exp - Expiration timestamp
 */

/**
 * Get inter-service secret from environment
 * Falls back to INTER_SERVICE_SECRET or generates temporary secret
 *
 * @returns {string} JWT secret
 */
function getInterServiceSecret() {
  const secret = process.env.INTER_SERVICE_SECRET || process.env.API_SECRET_TOKEN;

  if (!secret) {
    console.warn('⚠️  INTER_SERVICE_SECRET not set! Using temporary secret (NOT SECURE FOR PRODUCTION)');
    // Generate deterministic secret based on process start time
    return crypto.createHash('sha256').update(`tradingsystem-${process.pid}`).digest('hex');
  }

  return secret;
}

/**
 * Generate JWT token for service-to-service communication
 *
 * @param {string} serviceName - Name of the service requesting the token
 * @param {object} options - Token generation options
 * @param {string} options.expiresIn - Token expiration (default: '1h')
 * @param {object} options.additionalClaims - Additional JWT claims
 * @returns {string} Signed JWT token
 */
export function generateServiceToken(serviceName, options = {}) {
  const {
    expiresIn = '1h',
    additionalClaims = {},
  } = options;

  if (!serviceName) {
    throw new Error('serviceName is required to generate service token');
  }

  const secret = getInterServiceSecret();

  const payload = {
    serviceName,
    issuer: 'tradingsystem',
    ...additionalClaims,
  };

  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'tradingsystem',
  });
}

/**
 * Verify service JWT token
 *
 * @param {string} token - JWT token to verify
 * @returns {ServiceTokenPayload} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyServiceToken(token) {
  if (!token) {
    throw new Error('Token is required');
  }

  const secret = getInterServiceSecret();

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'tradingsystem',
    });

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Service token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid service token');
    } else {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
}

/**
 * Create inter-service authentication middleware
 *
 * Validates JWT tokens in x-service-token header for internal endpoints.
 * Rejects requests without valid tokens.
 *
 * @param {object} options - Middleware options
 * @param {object} options.logger - Logger instance for security events
 * @param {string[]} options.allowedServices - Whitelist of allowed service names (optional)
 * @param {boolean} options.requireToken - Require token (default: true)
 * @returns {Function} Express middleware function
 */
export function createInterServiceAuthMiddleware(options = {}) {
  const {
    logger,
    allowedServices = [],
    requireToken = true,
  } = options;

  return (req, res, next) => {
    const token = req.headers['x-service-token'] || req.headers['x-api-key'];

    // If token not required and not provided, allow through
    if (!requireToken && !token) {
      return next();
    }

    // Token required but not provided
    if (!token) {
      logger?.warn({
        method: req.method,
        url: req.url,
        ip: req.ip,
      }, 'Inter-service request missing authentication token');

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Service authentication token required',
      });
    }

    try {
      // Verify token
      const decoded = verifyServiceToken(token);

      // Check service whitelist if configured
      if (allowedServices.length > 0 && !allowedServices.includes(decoded.serviceName)) {
        logger?.warn({
          serviceName: decoded.serviceName,
          allowedServices,
          url: req.url,
        }, 'Service not in whitelist');

        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Service not authorized to access this resource',
        });
      }

      // Attach service info to request
      req.serviceAuth = {
        serviceName: decoded.serviceName,
        issuer: decoded.issuer,
        issuedAt: decoded.iat,
        expiresAt: decoded.exp,
      };

      logger?.debug({
        serviceName: decoded.serviceName,
        url: req.url,
      }, 'Inter-service request authenticated');

      next();
    } catch (error) {
      logger?.error({
        error: error.message,
        url: req.url,
        ip: req.ip,
      }, 'Inter-service authentication failed');

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: error.message,
      });
    }
  };
}

/**
 * Create middleware that allows both user and service authentication
 * Useful for endpoints that can be accessed by users OR services
 *
 * @param {object} options - Middleware options
 * @param {Function} options.userAuthMiddleware - User authentication middleware
 * @param {object} options.logger - Logger instance
 * @returns {Function} Express middleware function
 */
export function createHybridAuthMiddleware(options = {}) {
  const {
    userAuthMiddleware,
    logger,
  } = options;

  const serviceAuth = createInterServiceAuthMiddleware({
    logger,
    requireToken: false,
  });

  return (req, res, next) => {
    // Check for service token first
    const serviceToken = req.headers['x-service-token'];

    if (serviceToken) {
      // Authenticate as service
      return serviceAuth(req, res, next);
    }

    // Authenticate as user
    if (userAuthMiddleware) {
      return userAuthMiddleware(req, res, next);
    }

    // No authentication provided
    logger?.warn({
      method: req.method,
      url: req.url,
      ip: req.ip,
    }, 'Request missing authentication');

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required (user or service)',
    });
  };
}

/**
 * Token rotation utility
 * Generates new tokens and invalidates old ones after specified period
 *
 * @param {string} serviceName - Service name
 * @param {object} options - Rotation options
 * @param {string} options.rotationInterval - Rotation interval (default: '24h')
 * @returns {object} Token info with rotation schedule
 */
export function createTokenRotationSchedule(serviceName, options = {}) {
  const {
    rotationInterval = '24h',
  } = options;

  // Parse rotation interval to milliseconds
  const intervalMs = parseInterval(rotationInterval);

  // Generate initial token
  const token = generateServiceToken(serviceName, {
    expiresIn: rotationInterval,
  });

  // Calculate next rotation time
  const nextRotation = new Date(Date.now() + intervalMs);

  return {
    token,
    serviceName,
    nextRotation: nextRotation.toISOString(),
    rotationInterval,
  };
}

/**
 * Parse time interval string to milliseconds
 * Supports: '1h', '24h', '7d', '1w'
 *
 * @param {string} interval - Interval string
 * @returns {number} Milliseconds
 */
function parseInterval(interval) {
  const match = interval.match(/^(\d+)(h|d|w)$/);

  if (!match) {
    throw new Error(`Invalid interval format: ${interval}`);
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  const units = {
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
  };

  return value * units[unit];
}

/**
 * Audit logger for service authentication events
 * Tracks all inter-service authentication attempts
 *
 * @param {object} logger - Logger instance
 * @returns {Function} Audit middleware
 */
export function createServiceAuthAuditMiddleware(logger) {
  return (req, res, next) => {
    const token = req.headers['x-service-token'];

    if (token) {
      const startTime = Date.now();

      // Log on response finish
      res.on('finish', () => {
        const duration = Date.now() - startTime;

        logger.info({
          event: 'inter_service_auth',
          serviceName: req.serviceAuth?.serviceName,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          correlationId: req.id,
        }, 'Inter-service authentication audit');
      });
    }

    next();
  };
}

/**
 * Helper to add service token to outgoing HTTP requests
 *
 * @param {string} serviceName - Name of calling service
 * @returns {object} Headers object with service token
 */
export function createServiceAuthHeaders(serviceName) {
  const token = generateServiceToken(serviceName);

  return {
    'x-service-token': token,
    'user-agent': `TradingSystem/${serviceName}`,
  };
}

// CommonJS compatibility
export default {
  generateServiceToken,
  verifyServiceToken,
  createInterServiceAuthMiddleware,
  createHybridAuthMiddleware,
  createTokenRotationSchedule,
  createServiceAuthAuditMiddleware,
  createServiceAuthHeaders,
};
