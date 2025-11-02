/**
 * Authentication Middleware
 *
 * JWT-based authentication for protected endpoints
 *
 * @module middleware/auth
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from './responseWrapper';
import { logger } from '../utils/logger';

/**
 * Extended Request interface with user info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    iat?: number;
    exp?: number;
  };
}

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  userId: string;
  role: string;
}

/**
 * Generate JWT token for a user
 *
 * @param payload User data to encode in token
 * @returns Signed JWT token
 */
export const generateToken = (payload: JWTPayload): string => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'rag-services',
  });
};

/**
 * Verify JWT token and extract payload
 *
 * @param token JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export const verifyToken = (token: string): JWTPayload | null => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return {
      userId: decoded.userId,
      role: decoded.role,
    };
  } catch (error) {
    logger.warn('JWT verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

/**
 * JWT Authentication Middleware
 *
 * Validates JWT token from Authorization header
 * Attaches user info to request object
 *
 * @example
 * router.delete('/cache/:key', verifyJWT, handler);
 */
export const verifyJWT = (
  req: Request,
  res: Response,
  next: NextFunction,
): void | Response => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Missing Authorization header', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return sendError(
        res,
        'UNAUTHORIZED',
        'Authorization header required',
        401,
      );
    }

    // Expect format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Invalid Authorization header format', {
        path: req.path,
        method: req.method,
      });

      return sendError(
        res,
        'UNAUTHORIZED',
        'Invalid authorization format. Expected: Bearer <token>',
        401,
      );
    }

    const token = parts[1];

    // Verify token
    const user = verifyToken(token);

    if (!user) {
      logger.warn('JWT verification failed', {
        path: req.path,
        method: req.method,
      });

      return sendError(
        res,
        'UNAUTHORIZED',
        'Invalid or expired token',
        401,
      );
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    logger.debug('JWT verified successfully', {
      userId: user.userId,
      role: user.role,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
    });

    return sendError(
      res,
      'INTERNAL_ERROR',
      'An error occurred during authentication',
      500,
    );
  }
};

/**
 * Role-based Authorization Middleware
 *
 * Checks if authenticated user has required role
 *
 * @param allowedRoles - Array of roles that can access the route
 *
 * @example
 * router.delete('/cache', verifyJWT, requireRole(['admin']), handler);
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return sendError(
        res,
        'UNAUTHORIZED',
        'Authentication required',
        401,
      );
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn('Insufficient permissions', {
        userId: user.userId,
        userRole: user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return sendError(
        res,
        'FORBIDDEN',
        'Insufficient permissions',
        403,
      );
    }

    next();
  };
};

/**
 * Optional JWT Authentication
 *
 * Attempts to verify JWT but doesn't fail if missing
 * Useful for endpoints that work with or without auth
 */
export const optionalJWT = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');

    if (parts.length === 2 && parts[0] === 'Bearer') {
      const user = verifyToken(parts[1]);

      if (user) {
        (req as AuthenticatedRequest).user = user;
      }
    }
  }

  next();
};
