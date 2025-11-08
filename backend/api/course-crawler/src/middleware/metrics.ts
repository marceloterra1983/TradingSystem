import type { Request, Response, NextFunction } from "express";
import { metrics } from "../routes/metrics.js";

/**
 * Middleware to collect HTTP metrics for Prometheus
 */
export function httpMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = Date.now();

  // Capture response finish event
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    metrics.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      duration,
    );
  });

  next();
}
