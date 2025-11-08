/**
 * Input Sanitization Middleware
 *
 * This middleware provides additional protection against the validator.js
 * URL validation bypass vulnerability (GHSA-9965-vmph-33xx).
 *
 * Since there's no fix available for the validator package yet,
 * we implement additional validation and sanitization here.
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize URL input to prevent XSS attacks
 * @param {string} url - URL to validate and sanitize
 * @returns {string|boolean} - Sanitized URL or false if invalid
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  // Remove potential XSS vectors
  const sanitized = DOMPurify.sanitize(url.trim());

  // Basic URL pattern validation (more restrictive than validator)
  const safeUrlPattern =
    /^https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:\w*))?)?$/;

  if (!safeUrlPattern.test(sanitized)) {
    return false;
  }

  // Additional security checks
  const dangerousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
    /ftp:/i,
    /<script/i,
    /on\w+\s*=/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return false;
    }
  }

  return sanitized;
}

/**
 * Express middleware to sanitize URL inputs
 */
export function sanitizeUrlInput(req, res, next) {
  // Check common URL fields in request body
  const urlFields = ["url", "website", "link", "href", "redirect", "callback"];

  if (req.body) {
    for (const field of urlFields) {
      if (req.body[field]) {
        const sanitized = sanitizeUrl(req.body[field]);
        if (!sanitized) {
          return res.status(400).json({
            error: "Invalid URL format",
            field,
            message:
              "The provided URL contains invalid or potentially malicious content",
          });
        }
        req.body[field] = sanitized;
      }
    }
  }

  // Check URL query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (urlFields.includes(key) && value) {
        const sanitized = sanitizeUrl(value);
        if (!sanitized) {
          return res.status(400).json({
            error: "Invalid URL parameter",
            parameter: key,
            message:
              "The provided URL parameter contains invalid or potentially malicious content",
          });
        }
        req.query[key] = sanitized;
      }
    }
  }

  next();
}

/**
 * Custom URL validator function that can be used instead of validator's isURL
 */
export function isValidUrl(url) {
  return sanitizeUrl(url) !== false;
}

export default {
  sanitizeUrlInput,
  isValidUrl,
  sanitizeUrl,
};
