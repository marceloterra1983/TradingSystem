/**
 * Inter-Service Authentication Middleware Tests
 *
 * Part of Phase 2.2 - Security Infrastructure
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  generateServiceToken,
  verifyServiceToken,
  createInterServiceAuthMiddleware,
  createHybridAuthMiddleware,
  createServiceAuthHeaders,
} from '../inter-service-auth.js';

describe('Inter-Service Authentication', () => {
  beforeEach(() => {
    // Set test secret
    process.env.INTER_SERVICE_SECRET = 'test-secret-key-for-jwt-signing';
  });

  describe('generateServiceToken', () => {
    it('should generate valid JWT token', () => {
      const token = generateServiceToken('workspace-api');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should throw error if serviceName is missing', () => {
      expect(() => generateServiceToken()).toThrow('serviceName is required');
    });

    it('should include serviceName in payload', () => {
      const token = generateServiceToken('test-service');
      const decoded = verifyServiceToken(token);
      expect(decoded.serviceName).toBe('test-service');
      expect(decoded.issuer).toBe('tradingsystem');
    });

    it('should support custom expiration', () => {
      const token = generateServiceToken('test-service', { expiresIn: '2h' });
      const decoded = verifyServiceToken(token);

      const now = Math.floor(Date.now() / 1000);
      const twoHours = 2 * 60 * 60;

      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(now + twoHours + 10); // 10s buffer
    });

    it('should include additional claims', () => {
      const token = generateServiceToken('test-service', {
        additionalClaims: { environment: 'test', version: '1.0.0' }
      });
      const decoded = verifyServiceToken(token);

      expect(decoded.environment).toBe('test');
      expect(decoded.version).toBe('1.0.0');
    });
  });

  describe('verifyServiceToken', () => {
    it('should verify valid token', () => {
      const token = generateServiceToken('workspace-api');
      const decoded = verifyServiceToken(token);

      expect(decoded.serviceName).toBe('workspace-api');
      expect(decoded.issuer).toBe('tradingsystem');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for missing token', () => {
      expect(() => verifyServiceToken()).toThrow('Token is required');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyServiceToken('invalid.token.here')).toThrow('Invalid service token');
    });

    it('should throw error for expired token', () => {
      // Generate token that expires immediately
      const token = generateServiceToken('test-service', { expiresIn: '0s' });

      // Wait for expiration
      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        expect(() => verifyServiceToken(token)).toThrow('Service token has expired');
      });
    });

    it('should throw error for token signed with different secret', () => {
      const token = generateServiceToken('test-service');

      // Change secret
      process.env.INTER_SERVICE_SECRET = 'different-secret';

      expect(() => verifyServiceToken(token)).toThrow('Invalid service token');
    });
  });

  describe('createInterServiceAuthMiddleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let mockLogger;

    beforeEach(() => {
      mockReq = {
        headers: {},
        method: 'GET',
        url: '/internal/data',
        ip: '127.0.0.1',
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      mockNext = jest.fn();

      mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      };
    });

    it('should allow request with valid token', () => {
      const middleware = createInterServiceAuthMiddleware({ logger: mockLogger });
      const token = generateServiceToken('workspace-api');

      mockReq.headers['x-service-token'] = token;

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.serviceAuth).toBeDefined();
      expect(mockReq.serviceAuth.serviceName).toBe('workspace-api');
    });

    it('should reject request without token', () => {
      const middleware = createInterServiceAuthMiddleware({ logger: mockLogger });

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Service authentication token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      const middleware = createInterServiceAuthMiddleware({ logger: mockLogger });

      mockReq.headers['x-service-token'] = 'invalid.token.here';

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow request without token if requireToken is false', () => {
      const middleware = createInterServiceAuthMiddleware({
        logger: mockLogger,
        requireToken: false,
      });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should enforce service whitelist', () => {
      const middleware = createInterServiceAuthMiddleware({
        logger: mockLogger,
        allowedServices: ['docs-api', 'telegram-api'],
      });

      const token = generateServiceToken('workspace-api');
      mockReq.headers['x-service-token'] = token;

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'Service not authorized to access this resource',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should allow whitelisted service', () => {
      const middleware = createInterServiceAuthMiddleware({
        logger: mockLogger,
        allowedServices: ['workspace-api', 'docs-api'],
      });

      const token = generateServiceToken('workspace-api');
      mockReq.headers['x-service-token'] = token;

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.serviceAuth.serviceName).toBe('workspace-api');
    });

    it('should accept token in x-api-key header', () => {
      const middleware = createInterServiceAuthMiddleware({ logger: mockLogger });
      const token = generateServiceToken('workspace-api');

      mockReq.headers['x-api-key'] = token;

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.serviceAuth).toBeDefined();
    });
  });

  describe('createHybridAuthMiddleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let mockLogger;
    let mockUserAuthMiddleware;

    beforeEach(() => {
      mockReq = {
        headers: {},
        method: 'GET',
        url: '/api/data',
        ip: '127.0.0.1',
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      mockNext = jest.fn();

      mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      };

      mockUserAuthMiddleware = jest.fn((req, res, next) => {
        req.user = { id: 'user123', name: 'Test User' };
        next();
      });
    });

    it('should authenticate service request', () => {
      const middleware = createHybridAuthMiddleware({
        userAuthMiddleware: mockUserAuthMiddleware,
        logger: mockLogger,
      });

      const token = generateServiceToken('workspace-api');
      mockReq.headers['x-service-token'] = token;

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.serviceAuth).toBeDefined();
      expect(mockUserAuthMiddleware).not.toHaveBeenCalled();
    });

    it('should authenticate user request', () => {
      const middleware = createHybridAuthMiddleware({
        userAuthMiddleware: mockUserAuthMiddleware,
        logger: mockLogger,
      });

      // No service token, so should fall back to user auth
      middleware(mockReq, mockRes, mockNext);

      expect(mockUserAuthMiddleware).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
    });

    it('should reject request without any authentication', () => {
      const middleware = createHybridAuthMiddleware({
        userAuthMiddleware: null,
        logger: mockLogger,
      });

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('createServiceAuthHeaders', () => {
    it('should create headers with service token', () => {
      const headers = createServiceAuthHeaders('workspace-api');

      expect(headers['x-service-token']).toBeTruthy();
      expect(headers['user-agent']).toBe('TradingSystem/workspace-api');

      // Verify token is valid
      const decoded = verifyServiceToken(headers['x-service-token']);
      expect(decoded.serviceName).toBe('workspace-api');
    });

    it('should generate different tokens for different services', () => {
      const headers1 = createServiceAuthHeaders('service-1');
      const headers2 = createServiceAuthHeaders('service-2');

      expect(headers1['x-service-token']).not.toBe(headers2['x-service-token']);

      const decoded1 = verifyServiceToken(headers1['x-service-token']);
      const decoded2 = verifyServiceToken(headers2['x-service-token']);

      expect(decoded1.serviceName).toBe('service-1');
      expect(decoded2.serviceName).toBe('service-2');
    });
  });
});
