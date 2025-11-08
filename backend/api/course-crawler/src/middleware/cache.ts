import type { Request, Response, NextFunction } from "express";

export interface CacheOptions {
  /**
   * Cache duration in seconds
   */
  maxAge?: number;
  /**
   * Whether the response can be cached by shared caches (proxies, CDNs)
   */
  public?: boolean;
  /**
   * Whether the cache must revalidate with origin server before using stale content
   */
  mustRevalidate?: boolean;
  /**
   * ETag for conditional requests
   */
  etag?: boolean;
}

/**
 * Middleware to add cache control headers to responses
 */
export function cacheControl(options: CacheOptions = {}) {
  const {
    maxAge = 0,
    public: isPublic = false,
    mustRevalidate = false,
    etag = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const directives: string[] = [];

    if (maxAge > 0) {
      directives.push(`max-age=${maxAge}`);
      if (isPublic) {
        directives.push("public");
      } else {
        directives.push("private");
      }
      if (mustRevalidate) {
        directives.push("must-revalidate");
      }
    } else {
      directives.push("no-cache", "no-store", "must-revalidate");
    }

    res.setHeader("Cache-Control", directives.join(", "));

    if (etag && maxAge > 0) {
      // Express automatically generates ETags if not disabled
      res.setHeader("X-Content-Type-Options", "nosniff");
    }

    next();
  };
}

/**
 * Predefined cache strategies
 */
export const CacheStrategies = {
  /**
   * No caching - fresh data on every request
   */
  noCache: () => cacheControl({ maxAge: 0 }),

  /**
   * Short cache (5 minutes) for frequently changing data
   */
  short: () =>
    cacheControl({ maxAge: 300, public: false, mustRevalidate: true }),

  /**
   * Medium cache (1 hour) for moderately stable data
   */
  medium: () =>
    cacheControl({ maxAge: 3600, public: false, mustRevalidate: true }),

  /**
   * Long cache (24 hours) for static/stable data
   */
  long: () =>
    cacheControl({ maxAge: 86400, public: true, mustRevalidate: false }),

  /**
   * Custom cache duration
   */
  custom: (seconds: number, isPublic = false) =>
    cacheControl({ maxAge: seconds, public: isPublic, mustRevalidate: true }),
};
