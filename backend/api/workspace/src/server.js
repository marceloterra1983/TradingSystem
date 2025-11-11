/**
 * Workspace API - Migrated to use shared modules
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - Using shared logger (backend/shared/logger)
 * - Using shared middleware (backend/shared/middleware)
 * - Standardized health check endpoint
 * - Correlation ID support
 */

import express from "express";
import promClient from "prom-client";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Shared modules
import { createLogger } from "../../../shared/logger/index.js";
import {
  configureCors,
  configureRateLimit,
  configureHelmet,
  createErrorHandler,
  createNotFoundHandler,
  createCorrelationIdMiddleware,
} from "../../../shared/middleware/index.js";
import { createHealthCheckHandler } from "../../../shared/middleware/health.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compressionModuleCandidates = [
  path.resolve(process.cwd(), "backend/shared/middleware/compression.js"),
  path.resolve(__dirname, "../../../shared/middleware/compression.js"),
  "/app/backend/shared/middleware/compression.js",
  "/shared/middleware/compression.js",
];

let compressionModule = null;

for (const candidate of compressionModuleCandidates) {
  try {
    compressionModule = await import(pathToFileURL(candidate).href);
    break;
  } catch (error) {
    if (
      error.code !== "ERR_MODULE_NOT_FOUND" &&
      error.code !== "MODULE_NOT_FOUND"
    ) {
      throw error;
    }
  }
}

if (!compressionModule) {
  throw new Error(
    "Workspace API: não foi possível carregar o middleware compartilhado de compressão.",
  );
}

const { configureCompression, compressionMetrics } = compressionModule;

// Service-specific modules
import { config, timescaledbConfig } from "./config.js";
import { getDbClient } from "./db/index.js";
import { itemsRouter } from "./routes/items.js";
import categoriesRouter from "./routes/categories.js";

// Create logger
const logger = createLogger("workspace-api", {
  version: "1.0.0",
  base: {
    dbStrategy: config.dbStrategy,
  },
});

const app = express();

// Prometheus metrics
const requestCounter = new promClient.Counter({
  name: "workspace_api_requests_total",
  help: "Total HTTP requests to Workspace API",
  labelNames: ["method", "route", "status"],
});

const requestDuration = new promClient.Histogram({
  name: "workspace_api_request_duration_seconds",
  help: "HTTP request duration in seconds for Workspace API",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

promClient.collectDefaultMetrics({ prefix: "workspace_api_" });

// ============================================================================
// MIDDLEWARE STACK (using shared modules)
// ============================================================================

// 1. Correlation ID (must be first for tracing)
app.use(createCorrelationIdMiddleware());

// 2. Response compression (OPT-001: 40% payload reduction, ~60ms savings)
app.use(compressionMetrics);
app.use(configureCompression({ logger }));

// 3. Security headers (Helmet)
app.use(configureHelmet({ logger }));

// 4. CORS configuration
app.use(configureCors({ logger }));

// 5. Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 6. Rate limiting (environment-based)
app.use(configureRateLimit({ logger }));

// 7. Request metrics (Prometheus)
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;

    requestCounter.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
    });

    requestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status: res.statusCode,
      },
      duration,
    );

    // Log request with shared logger pattern
    logger.request(req, res, Date.now() - start);
  });

  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint (standardized)
app.get(
  "/health",
  createHealthCheckHandler({
    serviceName: "workspace-api",
    version: "1.0.0",
    logger,
    checks: {
      database: async () => {
        const db = getDbClient();
        await db.getItems();
        return `${config.dbStrategy} connected`;
      },
    },
  }),
);

// Readiness probe (Kubernetes-compatible)
app.get(
  "/ready",
  createHealthCheckHandler({
    serviceName: "workspace-api",
    version: "1.0.0",
    logger,
    checks: {
      database: async () => {
        const db = getDbClient();
        const items = await db.getItems();
        return `${config.dbStrategy} ready (${items.length} items)`;
      },
    },
  }),
);

// Liveness probe (always returns 200 if process is alive)
app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "workspace-api",
    uptime: process.uptime(),
  });
});

// Prometheus metrics endpoint
app.get("/metrics", async (_req, res) => {
  res.setHeader("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// API routes
app.use("/api/items", itemsRouter);
app.use("/api/categories", categoriesRouter);

// ============================================================================
// ERROR HANDLING (using shared modules)
// ============================================================================

// 404 handler (must be before error handler)
app.use(createNotFoundHandler({ logger }));

// Global error handler (must be last)
app.use(
  createErrorHandler({ logger, includeStack: config.env !== "production" }),
);

// ============================================================================
// SERVER STARTUP & GRACEFUL SHUTDOWN
// ============================================================================

const server = app.listen(config.port, () => {
  logger.startup("Workspace API started successfully", {
    port: config.port,
    dbStrategy: config.dbStrategy,
    environment: config.env,
    timescaleConfig:
      config.dbStrategy === "timescaledb"
        ? {
            host: timescaledbConfig.host,
            port: timescaledbConfig.port,
            database: timescaledbConfig.database,
            schema: timescaledbConfig.schema,
          }
        : null,
  });
});

const gracefulShutdown = (signal) => {
  logger.info({ signal }, "Received shutdown signal, closing server...");

  server.close(async () => {
    logger.info("HTTP server closed");

    // Close database connections
    try {
      const db = getDbClient();
      if (db.close) {
        await db.close();
        logger.info("Database connections closed");
      }
    } catch (error) {
      logger.error({ err: error }, "Error closing database connections");
    }

    logger.info("Workspace API stopped gracefully");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error("Graceful shutdown timeout, forcing exit");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.fatal({ reason, promise }, "Unhandled promise rejection");
  process.exit(1);
});
