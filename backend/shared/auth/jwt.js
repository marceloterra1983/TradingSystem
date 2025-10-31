/**
 * JWT Utility Module
 * Provides JWT token creation and verification for authentication
 *
 * @module backend/shared/auth/jwt
 */

import { createHmac } from 'crypto';

/**
 * Default JWT configuration
 */
const DEFAULT_ALGORITHM = 'HS256';
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Convert buffer to base64url encoding
 * @param {Buffer|string} input - Input to encode
 * @returns {string} Base64url encoded string
 */
function base64url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Sign a message using HMAC SHA256
 * @param {string} message - Message to sign
 * @param {string} secret - Secret key
 * @returns {string} Base64url encoded signature
 */
function signHmacSha256(message, secret) {
  return base64url(createHmac('sha256', secret).update(message).digest());
}

/**
 * Create a JWT token
 * @param {Object} payload - Token payload
 * @param {string} secret - Secret key for signing
 * @param {Object} options - Optional configuration
 * @param {string} options.algorithm - Signing algorithm (default: 'HS256')
 * @param {number} options.expiresIn - Expiry time in seconds (default: 3600)
 * @returns {string} JWT token
 * @throws {Error} If algorithm is unsupported
 */
export function createJwt(payload, secret, options = {}) {
  const algorithm = options.algorithm || DEFAULT_ALGORITHM;
  const expiresIn = options.expiresIn || DEFAULT_EXPIRY_SECONDS;

  if (algorithm !== 'HS256') {
    throw new Error(`Unsupported JWT algorithm: ${algorithm}. Only HS256 is supported.`);
  }

  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('JWT secret is required and must be a non-empty string');
  }

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: payload.iat || now,
    exp: payload.exp || (now + expiresIn),
  };

  const header = { alg: algorithm, typ: 'JWT' };
  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(fullPayload));
  const signingInput = `${encHeader}.${encPayload}`;
  const signature = signHmacSha256(signingInput, secret);

  return `${signingInput}.${signature}`;
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret key for verification
 * @param {Object} options - Optional configuration
 * @param {string} options.algorithm - Expected algorithm (default: 'HS256')
 * @param {boolean} options.ignoreExpiration - Skip expiration check (default: false)
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyJwt(token, secret, options = {}) {
  const algorithm = options.algorithm || DEFAULT_ALGORITHM;
  const ignoreExpiration = options.ignoreExpiration || false;

  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }

  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('JWT secret is required and must be a non-empty string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format. Expected 3 parts separated by dots.');
  }

  const [encHeader, encPayload, signature] = parts;

  // Verify signature
  const signingInput = `${encHeader}.${encPayload}`;
  const expectedSignature = signHmacSha256(signingInput, secret);

  if (signature !== expectedSignature) {
    throw new Error('Invalid JWT signature');
  }

  // Decode header
  let header;
  try {
    header = JSON.parse(Buffer.from(encHeader, 'base64').toString());
  } catch (error) {
    throw new Error('Invalid JWT header encoding');
  }

  if (header.alg !== algorithm) {
    throw new Error(`Algorithm mismatch. Expected ${algorithm}, got ${header.alg}`);
  }

  // Decode payload
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encPayload, 'base64').toString());
  } catch (error) {
    throw new Error('Invalid JWT payload encoding');
  }

  // Check expiration
  if (!ignoreExpiration && payload.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) {
      throw new Error('JWT token has expired');
    }
  }

  return payload;
}

/**
 * Create a Bearer token string
 * @param {Object} claims - Token claims/payload
 * @param {string} secret - Secret key for signing
 * @param {Object} options - Optional configuration
 * @returns {string} Bearer token string (e.g., "Bearer eyJ...")
 */
export function createBearer(claims, secret, options = {}) {
  const token = createJwt(claims, secret, options);
  return `Bearer ${token}`;
}

/**
 * Create a JWT token with standard claims for a service
 * @param {string} serviceName - Name of the service (used as 'sub' claim)
 * @param {string} secret - Secret key for signing
 * @param {Object} additionalClaims - Additional claims to include
 * @param {Object} options - Optional configuration
 * @returns {string} JWT token
 */
export function createServiceToken(serviceName, secret, additionalClaims = {}, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: serviceName,
    iat: now,
    ...additionalClaims,
  };
  return createJwt(claims, secret, options);
}

/**
 * Extract Bearer token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} JWT token or null if not found
 */
export function extractBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
