import type { Express, Request, Response } from "express";
import { Router } from "express";
import promClient from "prom-client";
import { workerState } from "../jobs/worker.js";

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add default metrics (process metrics, memory, CPU, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics for Course Crawler
export const metrics = {
  // HTTP request duration histogram
  httpRequestDuration: new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register],
  }),

  // Active runs gauge
  activeRuns: new promClient.Gauge({
    name: "course_crawler_active_runs",
    help: "Number of currently active crawler runs",
    registers: [register],
  }),

  // Total runs counter
  totalRuns: new promClient.Counter({
    name: "course_crawler_total_runs",
    help: "Total number of crawler runs started",
    labelNames: ["status"],
    registers: [register],
  }),

  // Classes processed counter
  classesProcessed: new promClient.Counter({
    name: "course_crawler_classes_processed_total",
    help: "Total number of classes processed",
    registers: [register],
  }),

  // Extraction errors counter
  extractionErrors: new promClient.Counter({
    name: "course_crawler_extraction_errors_total",
    help: "Total number of extraction errors",
    labelNames: ["error_type"],
    registers: [register],
  }),

  // Circuit breaker state gauge
  circuitBreakerState: new promClient.Gauge({
    name: "circuit_breaker_state",
    help: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
    labelNames: ["breaker_name"],
    registers: [register],
  }),

  // Database connection pool metrics
  dbPoolSize: new promClient.Gauge({
    name: "database_pool_size",
    help: "Number of connections in the database pool",
    registers: [register],
  }),

  dbPoolIdle: new promClient.Gauge({
    name: "database_pool_idle",
    help: "Number of idle connections in the database pool",
    registers: [register],
  }),

  dbPoolWaiting: new promClient.Gauge({
    name: "database_pool_waiting",
    help: "Number of clients waiting for a connection",
    registers: [register],
  }),
};

export function registerMetricsRoutes(app: Express) {
  const router = Router();

  /**
   * GET /metrics
   * Expose Prometheus metrics in text format
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      // Update dynamic metrics before scraping
      metrics.activeRuns.set(workerState.activeRuns.size);

      // Return metrics in Prometheus text format
      res.setHeader("Content-Type", register.contentType);
      const metricsOutput = await register.metrics();
      res.send(metricsOutput);
    } catch (error) {
      console.error("[Metrics] ❌ Failed to collect metrics:", error);
      res.status(500).json({ error: "Failed to collect metrics" });
    }
  });

  app.use("/metrics", router);
}
