/**
 * Async Handler Utility
 *
 * Wraps async Express route handlers to properly handle errors
 * Addresses ESLint @typescript-eslint/no-misused-promises
 *
 * @module utils/asyncHandler
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async route handler function type
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>;

/**
 * Wraps an async Express route handler to properly catch and forward errors
 *
 * @param fn - Async route handler function
 * @returns Express RequestHandler that handles async errors
 *
 * @example
 * ```typescript
 * router.get('/data', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 * ```
 *
 * Benefits:
 * - Eliminates @typescript-eslint/no-misused-promises errors
 * - Automatically forwards errors to Express error handler
 * - Maintains type safety
 * - No try/catch needed in route handlers
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Alternative syntax for wrapping multiple handlers
 *
 * @param handlers - Array of async handlers
 * @returns Array of wrapped RequestHandlers
 *
 * @example
 * ```typescript
 * router.post(
 *   '/users',
 *   ...wrapAsync([validateUser, createUser])
 * );
 * ```
 */
export function wrapAsync(handlers: AsyncRequestHandler[]): RequestHandler[] {
  return handlers.map(asyncHandler);
}
