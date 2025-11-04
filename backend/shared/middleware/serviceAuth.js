/**
 * Inter-Service Authentication Middleware
 * Validates service-to-service requests using shared secret token
 * 
 * @module backend/shared/middleware/serviceAuth
 */

/**
 * Create service authentication middleware
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.secret - Shared secret token (from INTER_SERVICE_SECRET env var)
 * @param {string} options.header - Header name (default: 'x-service-token')
 * @param {boolean} options.required - Whether token is required (default: true)
 * @returns {Function} Express middleware
 */
export function createServiceAuthMiddleware(options = {}) {
  const {
    secret = process.env.INTER_SERVICE_SECRET,
    header = 'x-service-token',
    required = true,
  } = options;

  if (!secret && required) {
    throw new Error('INTER_SERVICE_SECRET environment variable is required for service authentication');
  }

  return function serviceAuthMiddleware(req, res, next) {
    // Skip if not required
    if (!required) {
      return next();
    }

    // Get token from header
    const token = req.headers[header];

    // Validate token
    if (!token) {
      console.warn(`[Service Auth] Missing ${header} header from ${req.ip}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Missing or invalid service authentication token',
          details: {
            required_header: header,
            description: 'Internal endpoints require service-to-service authentication',
          },
        },
      });
    }

    if (token !== secret) {
      console.error(`[Service Auth] Invalid ${header} from ${req.ip}`);
      
      // Audit log: record unauthorized attempt
      console.error(`[Audit] Unauthorized service-to-service attempt`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid service authentication token',
          details: {
            description: 'The provided service token is invalid',
          },
        },
      });
    }

    // Token valid - add service info to request
    req.serviceAuth = {
      valid: true,
      header,
      timestamp: new Date().toISOString(),
    };

    next();
  };
}

/**
 * Verify service authentication (standalone function)
 * 
 * @param {string} token - Token to verify
 * @param {string} secret - Expected secret (from env)
 * @returns {boolean} True if valid
 */
export function verifyServiceToken(token, secret = process.env.INTER_SERVICE_SECRET) {
  if (!token || !secret) {
    return false;
  }
  
  return token === secret;
}

/**
 * Get service token from environment
 * 
 * @returns {string} Service token
 * @throws {Error} If INTER_SERVICE_SECRET not set
 */
export function getServiceToken() {
  const token = process.env.INTER_SERVICE_SECRET;
  
  if (!token) {
    throw new Error('INTER_SERVICE_SECRET environment variable not set');
  }
  
  return token;
}

/**
 * Create service authentication header
 * 
 * @param {string} secret - Service secret (optional, uses env if not provided)
 * @returns {Object} Headers object with X-Service-Token
 */
export function createServiceAuthHeader(secret = process.env.INTER_SERVICE_SECRET) {
  if (!secret) {
    throw new Error('INTER_SERVICE_SECRET not set');
  }
  
  return {
    'X-Service-Token': secret,
  };
}

export default {
  createServiceAuthMiddleware,
  verifyServiceToken,
  getServiceToken,
  createServiceAuthHeader,
};

