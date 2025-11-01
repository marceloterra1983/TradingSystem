/**
 * Authentication Middleware Unit Tests
 *
 * Tests for JWT authentication and role-based access control
 */

import { Request, Response } from 'express';
import { verifyJWT, requireRole, generateToken, verifyToken } from '../../middleware/auth';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: statusMock,
      locals: {
        requestId: 'test-request-id',
      },
    };

    mockNext = jest.fn();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken({
        userId: 'user-123',
        role: 'admin',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken({ userId: 'user-1', role: 'admin' });
      const token2 = generateToken({ userId: 'user-2', role: 'admin' });

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = { userId: 'user-123', role: 'admin' };
      const token = generateToken(payload);

      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.role).toBe(payload.role);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const decoded = verifyToken('not-a-jwt');
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = verifyToken('');
      expect(decoded).toBeNull();
    });
  });

  describe('verifyJWT middleware', () => {
    it('should reject requests without Authorization header', async () => {
      mockRequest.headers = {};

      await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Authorization header required',
          }),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid Authorization format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token-here',
      };

      await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid authorization format. Expected: Bearer <token>',
          }),
        }),
      );
    });

    it('should reject requests with malformed Bearer token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer',
      };

      await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should reject requests with invalid JWT token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.jwt.token',
      };

      await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid or expired token',
          }),
        }),
      );
    });

    it('should accept requests with valid JWT token', async () => {
      const token = generateToken({ userId: 'user-123', role: 'admin' });
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
      expect((mockRequest as any).user).toBeDefined();
      expect((mockRequest as any).user.userId).toBe('user-123');
    });

    it('should attach user to request object', async () => {
      const payload = { userId: 'user-456', role: 'viewer' };
      const token = generateToken(payload);
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toEqual(expect.objectContaining(payload));
    });
  });

  describe('requireRole middleware', () => {
    beforeEach(() => {
      // Simulate authenticated request
      (mockRequest as any).user = {
        userId: 'user-123',
        role: 'viewer',
      };
    });

    it('should allow access when user has required role', () => {
      const middleware = requireRole(['viewer', 'admin']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', () => {
      const middleware = requireRole(['admin']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          }),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      delete (mockRequest as any).user;

      const middleware = requireRole(['admin']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should support multiple allowed roles', () => {
      (mockRequest as any).user.role = 'editor';

      const middleware = requireRole(['admin', 'editor', 'moderator']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should be case-sensitive for roles', () => {
      (mockRequest as any).user.role = 'Admin'; // Capitalized

      const middleware = requireRole(['admin']); // Lowercase
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('integration: verifyJWT + requireRole', () => {
    it('should work together for role-based access control', async () => {
      // Generate token for viewer
      const token = generateToken({ userId: 'user-789', role: 'viewer' });
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      // First, verify JWT
      await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Reset mocks
      mockNext.mockClear();
      statusMock.mockClear();

      // Then, check role (viewer trying to access admin endpoint)
      const roleMiddleware = requireRole(['admin']);
      roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should grant access for admin role on admin endpoints', async () => {
      const token = generateToken({ userId: 'admin-user', role: 'admin' });
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      mockNext.mockClear();

      const roleMiddleware = requireRole(['admin']);
      roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});
