import type { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";

// Augment Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Middleware to add request ID to all requests
 * Uses X-Request-ID header if present, otherwise generates a new UUID
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers["x-request-id"] as string) || uuid();

  // Attach request ID to request object
  req.id = requestId;

  // Add request ID to response headers for client tracking
  res.setHeader("X-Request-ID", requestId);

  // Add request ID to logger context (pino-http integration)
  if (req.log) {
    req.log = req.log.child({ requestId });
  }

  next();
}

/**
 * Helper function to get request ID from request
 */
export function getRequestId(req: Request): string {
  return (req.id as string) || "unknown";
}
