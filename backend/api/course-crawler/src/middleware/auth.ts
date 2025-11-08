import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/environment.js";

export interface JWTPayload {
  userId: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export function authenticateJWT(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res
      .status(401)
      .json({
        error: "Invalid authorization header format. Expected: Bearer <token>",
      });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(
      token,
      env.COURSE_CRAWLER_JWT_SECRET,
    ) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.status(500).json({ error: "Token verification failed" });
  }
}

/**
 * Optional authentication middleware - doesn't fail if token is missing
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return next();
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(
      token,
      env.COURSE_CRAWLER_JWT_SECRET,
    ) as JWTPayload;
    req.user = decoded;
  } catch (_error) {
    // Silently fail for optional auth
  }

  next();
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload, expiresIn = "24h"): string {
  return jwt.sign(payload, env.COURSE_CRAWLER_JWT_SECRET, { expiresIn });
}
