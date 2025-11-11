import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";

/**
 * Per-user rate limiting middleware
 * Tracks requests per user (identified by JWT userId)
 * More granular than global rate limiting
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const userLimits = new Map<string, RateLimitStore>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userLimits.entries()) {
    if (now > value.resetTime) {
      userLimits.delete(key);
    }
  }
}, 60000);

export interface UserRateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
}

export function userRateLimit(options: UserRateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later",
  } = options;

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Skip if no user authenticated (global rate limit will handle)
    if (!req.user) {
      return next();
    }

    const userId = req.user.userId;
    const now = Date.now();
    const resetTime = now + windowMs;

    // Get or create user limit entry
    let userLimit = userLimits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Create new window
      userLimit = {
        count: 0,
        resetTime,
      };
      userLimits.set(userId, userLimit);
    }

    // Increment request count
    userLimit.count++;

    // Check if limit exceeded
    if (userLimit.count > maxRequests) {
      const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader(
        "X-RateLimit-Reset",
        new Date(userLimit.resetTime).toISOString(),
      );

      return res.status(429).json({
        error: message,
        retryAfter,
      });
    }

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader(
      "X-RateLimit-Remaining",
      (maxRequests - userLimit.count).toString(),
    );
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(userLimit.resetTime).toISOString(),
    );

    next();
  };
}

/**
 * Get current rate limit stats for a user
 */
export function getUserRateLimitStats(userId: string) {
  const userLimit = userLimits.get(userId);
  if (!userLimit) {
    return null;
  }

  return {
    count: userLimit.count,
    resetTime: userLimit.resetTime,
    resetTimeISO: new Date(userLimit.resetTime).toISOString(),
  };
}

/**
 * Clear rate limit for a specific user (admin function)
 */
export function clearUserRateLimit(userId: string): boolean {
  return userLimits.delete(userId);
}
