/**
 * JWT Authentication Middleware
 *
 * Provides authentication and authorization for API endpoints
 * Supports role-based access control (RBAC)
 *
 * @module middleware/auth
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "./responseWrapper";

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user";
  iat: number;
  exp: number;
}

/**
 * Extended Request with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Authentication middleware
 *
 * Validates JWT token from Authorization header
 * Attaches user information to request object
 *
 * @example
 * app.get('/protected', authMiddleware, (req, res) => {
 *   const user = (req as AuthenticatedRequest).user;
 *   res.json({ user });
 * });
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void | Response => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(
        res,
        "MISSING_AUTH_HEADER",
        "Authorization header is required",
        401,
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      return sendError(
        res,
        "INVALID_AUTH_HEADER",
        'Authorization header must start with "Bearer "',
        401,
      );
    }

    const token = authHeader.substring(7);

    if (!token) {
      return sendError(res, "MISSING_TOKEN", "JWT token is required", 401);
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET_KEY;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET_KEY environment variable not set");
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Attach user to request
    (req as AuthenticatedRequest).user = decoded;

    // Store request ID for logging
    res.locals.requestId = req.headers["x-request-id"] || crypto.randomUUID();
    res.locals.path = req.path;

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, "TOKEN_EXPIRED", "JWT token has expired", 401, {
        expiredAt: error.expiredAt,
      });
    }

    if (error.name === "JsonWebTokenError") {
      return sendError(res, "INVALID_TOKEN", "Invalid JWT token", 401);
    }

    if (error.name === "NotBeforeError") {
      return sendError(res, "TOKEN_NOT_ACTIVE", "Token not active yet", 401, {
        date: error.date,
      });
    }

    // Unexpected error
    return sendError(res, "AUTH_ERROR", "Authentication failed", 500);
  }
};

/**
 * Role-based access control middleware
 *
 * Requires specific roles to access endpoint
 *
 * @param roles - Array of allowed roles
 *
 * @example
 * app.get('/admin', authMiddleware, requireRole('admin'), (req, res) => {
 *   res.json({ message: 'Admin only' });
 * });
 */
export const requireRole = (...roles: Array<"admin" | "user">) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return sendError(res, "UNAUTHORIZED", "User not authenticated", 401);
    }

    if (!roles.includes(user.role)) {
      return sendError(
        res,
        "FORBIDDEN",
        "Insufficient permissions to access this resource",
        403,
        {
          required: roles,
          actual: user.role,
        },
      );
    }

    next();
  };
};

/**
 * Optional authentication middleware
 *
 * Attempts to authenticate but doesn't fail if token is missing
 * Useful for endpoints that have different behavior for authenticated users
 *
 * @example
 * app.get('/public', optionalAuth, (req, res) => {
 *   const user = (req as AuthenticatedRequest).user;
 *   if (user) {
 *     res.json({ message: 'Welcome back!', user });
 *   } else {
 *     res.json({ message: 'Welcome guest!' });
 *   }
 * });
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET_KEY;

    if (!jwtSecret || !token) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    (req as AuthenticatedRequest).user = decoded;
  } catch (error) {
    // Silent fail for optional auth
  }

  next();
};

/**
 * Generate JWT token
 *
 * @param payload - Token payload
 * @param expiresIn - Token expiration time (default: 1h)
 */
export const generateToken = (
  payload: Omit<JWTPayload, "iat" | "exp">,
  expiresIn: string = "1h",
): string => {
  const jwtSecret = process.env.JWT_SECRET_KEY;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET_KEY environment variable not set");
  }

  return jwt.sign(payload, jwtSecret, { expiresIn });
};

/**
 * Generate refresh token
 *
 * @param userId - User ID
 * @param expiresIn - Token expiration time (default: 7d)
 */
export const generateRefreshToken = (
  userId: string,
  expiresIn: string = "7d",
): string => {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET environment variable not set");
  }

  return jwt.sign({ userId }, jwtRefreshSecret, { expiresIn });
};

/**
 * Verify refresh token
 *
 * @param refreshToken - Refresh token to verify
 */
export const verifyRefreshToken = (
  refreshToken: string,
): { userId: string } => {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET environment variable not set");
  }

  return jwt.verify(refreshToken, jwtRefreshSecret) as { userId: string };
};
