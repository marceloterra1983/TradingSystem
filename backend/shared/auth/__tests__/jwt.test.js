/**
 * JWT Utility Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createJwt,
  verifyJwt,
  createBearer,
  createServiceToken,
  extractBearerToken,
} from '../jwt.js';

describe('JWT Utility', () => {
  const testSecret = 'test-secret-key';
  const testPayload = { sub: 'test-user', role: 'admin' };

  describe('createJwt', () => {
    it('should create a valid JWT token', () => {
      const token = createJwt(testPayload, testSecret);
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include iat and exp claims automatically', () => {
      const token = createJwt(testPayload, testSecret);
      const payload = verifyJwt(token, testSecret);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('should respect custom expiry time', () => {
      const customExpiry = 7200; // 2 hours
      const token = createJwt(testPayload, testSecret, { expiresIn: customExpiry });
      const payload = verifyJwt(token, testSecret);
      expect(payload.exp - payload.iat).toBe(customExpiry);
    });

    it('should preserve custom iat and exp if provided', () => {
      const now = Math.floor(Date.now() / 1000);
      const customPayload = { sub: 'test', iat: now - 100, exp: now + 100 };
      const token = createJwt(customPayload, testSecret);
      const payload = verifyJwt(token, testSecret);
      expect(payload.iat).toBe(customPayload.iat);
      expect(payload.exp).toBe(customPayload.exp);
    });

    it('should throw error for unsupported algorithm', () => {
      expect(() => {
        createJwt(testPayload, testSecret, { algorithm: 'RS256' });
      }).toThrow('Unsupported JWT algorithm');
    });

    it('should throw error for empty secret', () => {
      expect(() => createJwt(testPayload, '')).toThrow('JWT secret is required');
      expect(() => createJwt(testPayload, '   ')).toThrow('JWT secret is required');
      expect(() => createJwt(testPayload, null)).toThrow('JWT secret is required');
    });

    it('should include all custom payload fields', () => {
      const customPayload = {
        sub: 'user123',
        role: 'admin',
        permissions: ['read', 'write'],
        metadata: { org: 'test-org' },
      };
      const token = createJwt(customPayload, testSecret);
      const decoded = verifyJwt(token, testSecret);
      expect(decoded.sub).toBe('user123');
      expect(decoded.role).toBe('admin');
      expect(decoded.permissions).toEqual(['read', 'write']);
      expect(decoded.metadata).toEqual({ org: 'test-org' });
    });
  });

  describe('verifyJwt', () => {
    it('should verify and decode a valid token', () => {
      const token = createJwt(testPayload, testSecret);
      const payload = verifyJwt(token, testSecret);
      expect(payload.sub).toBe(testPayload.sub);
      expect(payload.role).toBe(testPayload.role);
    });

    it('should throw error for invalid token format', () => {
      expect(() => verifyJwt('invalid.token', testSecret)).toThrow('Invalid JWT format');
      expect(() => verifyJwt('invalid', testSecret)).toThrow('Invalid JWT format');
      expect(() => verifyJwt('', testSecret)).toThrow('Token must be a non-empty string');
    });

    it('should throw error for tampered signature', () => {
      const token = createJwt(testPayload, testSecret);
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignature`;
      expect(() => verifyJwt(tamperedToken, testSecret)).toThrow('Invalid JWT signature');
    });

    it('should throw error for wrong secret', () => {
      const token = createJwt(testPayload, testSecret);
      expect(() => verifyJwt(token, 'wrong-secret')).toThrow('Invalid JWT signature');
    });

    it('should throw error for expired token', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredPayload = { sub: 'test', exp: now - 100 }; // Expired 100 seconds ago
      const token = createJwt(expiredPayload, testSecret);
      expect(() => verifyJwt(token, testSecret)).toThrow('JWT token has expired');
    });

    it('should allow ignoring expiration', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredPayload = { sub: 'test', exp: now - 100 };
      const token = createJwt(expiredPayload, testSecret);
      const payload = verifyJwt(token, testSecret, { ignoreExpiration: true });
      expect(payload.sub).toBe('test');
    });

    it('should throw error for algorithm mismatch', () => {
      const token = createJwt(testPayload, testSecret);
      expect(() => {
        verifyJwt(token, testSecret, { algorithm: 'RS256' });
      }).toThrow('Algorithm mismatch');
    });

    it('should throw error for malformed header', () => {
      const malformedToken = 'not-base64.eyJzdWIiOiJ0ZXN0In0.signature';
      expect(() => verifyJwt(malformedToken, testSecret)).toThrow('Invalid JWT header encoding');
    });

    it('should throw error for malformed payload', () => {
      const parts = createJwt(testPayload, testSecret).split('.');
      const malformedToken = `${parts[0]}.not-base64.${parts[2]}`;
      expect(() => verifyJwt(malformedToken, testSecret)).toThrow('Invalid JWT payload encoding');
    });
  });

  describe('createBearer', () => {
    it('should create a Bearer token string', () => {
      const bearer = createBearer(testPayload, testSecret);
      expect(bearer).toMatch(/^Bearer\s+.+$/);
    });

    it('should create a valid JWT token', () => {
      const bearer = createBearer(testPayload, testSecret);
      const token = bearer.replace('Bearer ', '');
      const payload = verifyJwt(token, testSecret);
      expect(payload.sub).toBe(testPayload.sub);
    });

    it('should respect custom options', () => {
      const bearer = createBearer(testPayload, testSecret, { expiresIn: 7200 });
      const token = bearer.replace('Bearer ', '');
      const payload = verifyJwt(token, testSecret);
      expect(payload.exp - payload.iat).toBe(7200);
    });
  });

  describe('createServiceToken', () => {
    it('should create a token with service name as subject', () => {
      const token = createServiceToken('documentation-api', testSecret);
      const payload = verifyJwt(token, testSecret);
      expect(payload.sub).toBe('documentation-api');
      expect(payload.iat).toBeDefined();
    });

    it('should include additional claims', () => {
      const additionalClaims = { role: 'service', tier: 'premium' };
      const token = createServiceToken('query-service', testSecret, additionalClaims);
      const payload = verifyJwt(token, testSecret);
      expect(payload.sub).toBe('query-service');
      expect(payload.role).toBe('service');
      expect(payload.tier).toBe('premium');
    });

    it('should respect custom expiry', () => {
      const token = createServiceToken('test-service', testSecret, {}, { expiresIn: 600 });
      const payload = verifyJwt(token, testSecret);
      expect(payload.exp - payload.iat).toBe(600);
    });
  });

  describe('extractBearerToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.signature';
      const authHeader = `Bearer ${token}`;
      expect(extractBearerToken(authHeader)).toBe(token);
    });

    it('should handle case-insensitive Bearer keyword', () => {
      const token = 'test-token';
      expect(extractBearerToken(`bearer ${token}`)).toBe(token);
      expect(extractBearerToken(`BEARER ${token}`)).toBe(token);
      expect(extractBearerToken(`BeArEr ${token}`)).toBe(token);
    });

    it('should return null for invalid formats', () => {
      expect(extractBearerToken('InvalidHeader')).toBeNull();
      expect(extractBearerToken('Basic token')).toBeNull();
      expect(extractBearerToken('')).toBeNull();
      expect(extractBearerToken(null)).toBeNull();
      expect(extractBearerToken(undefined)).toBeNull();
    });

    it('should handle tokens with spaces', () => {
      const token = 'token with spaces';
      expect(extractBearerToken(`Bearer ${token}`)).toBe(token);
    });
  });

  describe('Integration tests', () => {
    it('should handle full authentication flow', () => {
      // 1. Create service token
      const token = createServiceToken('documentation-api', testSecret, {
        permissions: ['read', 'write'],
      });

      // 2. Create Bearer header
      const authHeader = `Bearer ${token}`;

      // 3. Extract token
      const extracted = extractBearerToken(authHeader);
      expect(extracted).toBe(token);

      // 4. Verify token
      const payload = verifyJwt(extracted, testSecret);
      expect(payload.sub).toBe('documentation-api');
      expect(payload.permissions).toEqual(['read', 'write']);
    });

    it('should create different tokens for different services', () => {
      const token1 = createServiceToken('service-a', testSecret);
      const token2 = createServiceToken('service-b', testSecret);

      expect(token1).not.toBe(token2);

      const payload1 = verifyJwt(token1, testSecret);
      const payload2 = verifyJwt(token2, testSecret);

      expect(payload1.sub).toBe('service-a');
      expect(payload2.sub).toBe('service-b');
    });

    it('should maintain data integrity through encode/decode cycle', () => {
      const complexPayload = {
        sub: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['admin', 'user'],
        metadata: {
          org: 'test-org',
          department: 'engineering',
          level: 5,
        },
        permissions: {
          read: true,
          write: true,
          delete: false,
        },
      };

      const token = createJwt(complexPayload, testSecret);
      const decoded = verifyJwt(token, testSecret);

      expect(decoded.sub).toBe(complexPayload.sub);
      expect(decoded.name).toBe(complexPayload.name);
      expect(decoded.email).toBe(complexPayload.email);
      expect(decoded.roles).toEqual(complexPayload.roles);
      expect(decoded.metadata).toEqual(complexPayload.metadata);
      expect(decoded.permissions).toEqual(complexPayload.permissions);
    });
  });
});
