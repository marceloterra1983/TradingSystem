/**
 * Unit Tests for Service Authentication Middleware
 * Tests X-Service-Token validation and security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createServiceAuthMiddleware,
  verifyServiceToken,
  getServiceToken,
  createServiceAuthHeader,
} from '../../../../shared/middleware/serviceAuth.js';

describe('Service Authentication Middleware', () => {
  const VALID_SECRET = 'test-inter-service-secret';
  
  beforeEach(() => {
    process.env.INTER_SERVICE_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    delete process.env.INTER_SERVICE_SECRET;
  });

  describe('createServiceAuthMiddleware', () => {
    it('should allow request with valid token', () => {
      const middleware = createServiceAuthMiddleware({ secret: VALID_SECRET });
      
      const req = {
        headers: { 'x-service-token': VALID_SECRET },
        ip: '127.0.0.1',
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.serviceAuth).toBeDefined();
      expect(req.serviceAuth.valid).toBe(true);
    });

    it('should reject request with missing token', () => {
      const middleware = createServiceAuthMiddleware({ secret: VALID_SECRET });
      
      const req = {
        headers: {},
        ip: '127.0.0.1',
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      const middleware = createServiceAuthMiddleware({ secret: VALID_SECRET });
      
      const req = {
        headers: { 'x-service-token': 'invalid-token' },
        ip: '127.0.0.1',
        path: '/internal/test',
        method: 'GET',
        get: vi.fn(() => 'test-agent'),
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow requests when not required', () => {
      const middleware = createServiceAuthMiddleware({ 
        secret: VALID_SECRET,
        required: false 
      });
      
      const req = {
        headers: {},  // No token
      };
      const res = {};
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('verifyServiceToken', () => {
    it('should return true for valid token', () => {
      const result = verifyServiceToken(VALID_SECRET, VALID_SECRET);
      expect(result).toBe(true);
    });

    it('should return false for invalid token', () => {
      const result = verifyServiceToken('wrong-token', VALID_SECRET);
      expect(result).toBe(false);
    });

    it('should return false for null token', () => {
      const result = verifyServiceToken(null, VALID_SECRET);
      expect(result).toBe(false);
    });
  });

  describe('getServiceToken', () => {
    it('should return token from environment', () => {
      const token = getServiceToken();
      expect(token).toBe(VALID_SECRET);
    });

    it('should throw if INTER_SERVICE_SECRET not set', () => {
      delete process.env.INTER_SERVICE_SECRET;
      
      expect(() => getServiceToken()).toThrow('INTER_SERVICE_SECRET environment variable not set');
    });
  });

  describe('createServiceAuthHeader', () => {
    it('should create header with token', () => {
      const header = createServiceAuthHeader(VALID_SECRET);
      
      expect(header).toEqual({
        'X-Service-Token': VALID_SECRET,
      });
    });

    it('should use environment variable when no secret provided', () => {
      const header = createServiceAuthHeader();
      
      expect(header['X-Service-Token']).toBe(VALID_SECRET);
    });

    it('should throw if no secret available', () => {
      delete process.env.INTER_SERVICE_SECRET;
      
      expect(() => createServiceAuthHeader()).toThrow('INTER_SERVICE_SECRET not set');
    });
  });
});

