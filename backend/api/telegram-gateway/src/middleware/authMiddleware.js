import crypto from "crypto";

/**
 * API Key Authentication Middleware
 *
 * Validates X-API-Key header against TELEGRAM_GATEWAY_API_KEY environment variable
 * using constant-time comparison to prevent timing attacks.
 *
 * Usage:
 *   import { requireApiKey, optionalApiKey } from './middleware/authMiddleware.js';
 *
 *   // Require API key
 *   router.post('/sync-messages', requireApiKey, async (req, res) => { ... });
 *
 *   // Optional API key (skip if not provided)
 *   router.get('/public-endpoint', optionalApiKey, async (req, res) => { ... });
 */

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * Uses crypto.timingSafeEqual to ensure comparison time doesn't leak information
 * about the expected key.
 */
const secureCompare = (a, b) => {
  if (!a || !b) return false;

  // Ensure both strings are same length (pad shorter one)
  const maxLength = Math.max(a.length, b.length);
  const bufferA = Buffer.alloc(maxLength);
  const bufferB = Buffer.alloc(maxLength);

  bufferA.write(a, "utf8");
  bufferB.write(b, "utf8");

  try {
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
};

/**
 * Middleware: Require valid API key
 *
 * Returns 401 if X-API-Key header is missing
 * Returns 403 if X-API-Key header is invalid
 * Returns 500 if TELEGRAM_GATEWAY_API_KEY is not configured
 */
export const requireApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.TELEGRAM_GATEWAY_API_KEY;

  // Check if API key is configured
  if (!expectedKey) {
    req.log?.error?.("[Auth] TELEGRAM_GATEWAY_API_KEY not configured");
    return res.status(500).json({
      success: false,
      error: "API authentication not configured",
      message: "Server misconfiguration: API key not set",
    });
  }

  // Check if API key is provided
  if (!apiKey) {
    req.log?.warn?.(
      {
        ip: req.ip,
        userAgent: req.get("user-agent"),
        path: req.path,
      },
      "[Auth] Missing API key",
    );

    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Missing X-API-Key header",
    });
  }

  // Validate API key (constant-time comparison)
  if (!secureCompare(apiKey, expectedKey)) {
    req.log?.warn?.(
      {
        ip: req.ip,
        userAgent: req.get("user-agent"),
        path: req.path,
        providedKeyPrefix: apiKey.substring(0, 8) + "...", // Log prefix only
      },
      "[Auth] Invalid API key attempt",
    );

    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "Invalid API key",
    });
  }

  // API key valid, add to request for logging
  req.authenticated = true;
  req.log?.debug?.("[Auth] API key validated");

  next();
};

/**
 * Middleware: Optional API key
 *
 * If X-API-Key header is provided, validates it
 * If X-API-Key header is missing, allows request to proceed
 *
 * Useful for endpoints that have both public and authenticated modes
 */
export const optionalApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  // No API key provided, continue without authentication
  if (!apiKey) {
    req.authenticated = false;
    return next();
  }

  // API key provided, validate it
  requireApiKey(req, res, next);
};

/**
 * Generate a secure API key
 *
 * Utility function for generating cryptographically secure API keys
 *
 * Usage:
 *   import { generateApiKey } from './middleware/authMiddleware.js';
 *   const apiKey = generateApiKey();
 *   console.log('TELEGRAM_GATEWAY_API_KEY=' + apiKey);
 */
export const generateApiKey = () => {
  return crypto.randomBytes(32).toString("hex");
};
