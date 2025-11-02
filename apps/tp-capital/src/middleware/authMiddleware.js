/**
 * Authentication Middleware for TP Capital API
 * 
 * Validates API keys for protected endpoints
 */

/**
 * Require API Key authentication
 * 
 * Checks for X-API-Key header and validates against environment variable
 * 
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Next middleware
 */
export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.TP_CAPITAL_API_KEY;

  // If no API key is configured, allow all requests (dev mode)
  if (!validKey) {
    req.log?.warn?.('TP_CAPITAL_API_KEY not configured - API is unprotected!');
    return next();
  }

  // Validate API key
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'X-API-Key header is required',
    });
  }

  if (apiKey !== validKey) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key',
    });
  }

  // API key is valid
  next();
}

/**
 * Optional API Key authentication
 * 
 * If API key is provided, validates it
 * If not provided, allows request to proceed
 * 
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Next middleware
 */
export function optionalApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.TP_CAPITAL_API_KEY;

  // If no API key provided, allow request
  if (!apiKey) {
    return next();
  }

  // If API key is configured, validate it
  if (validKey && apiKey !== validKey) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key',
    });
  }

  // API key is valid (or not configured)
  next();
}

/**
 * Create rate limiter that varies by API key
 * 
 * Authenticated requests get higher limits
 * Unauthenticated requests get lower limits
 * 
 * @param {object} options - Rate limit options
 * @returns {import('express').RequestHandler}
 */
export function createApiKeyRateLimiter(options = {}) {
  const {
    authenticatedWindowMs = 60000,  // 1 minute
    authenticatedMaxRequests = 1000,
    unauthenticatedWindowMs = 60000,
    unauthenticatedMaxRequests = 100,
  } = options;

  const limits = new Map();

  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validKey = process.env.TP_CAPITAL_API_KEY;
    const isAuthenticated = apiKey && apiKey === validKey;

    const key = isAuthenticated ? `auth:${apiKey}` : `ip:${req.ip}`;
    const windowMs = isAuthenticated ? authenticatedWindowMs : unauthenticatedWindowMs;
    const maxRequests = isAuthenticated ? authenticatedMaxRequests : unauthenticatedMaxRequests;

    // Get or create rate limit entry
    let entry = limits.get(key);
    const now = Date.now();

    if (!entry || now - entry.windowStart > windowMs) {
      // Start new window
      entry = {
        windowStart: now,
        count: 0,
      };
      limits.set(key, entry);
    }

    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000}s`,
        retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000),
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
    res.setHeader('X-RateLimit-Reset', new Date(entry.windowStart + windowMs).toISOString());

    next();
  };
}

